package model

import (
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/redis"
	"errors"
	"fmt"
	"math"
	"time"

	"gorm.io/gorm"
)

type SubscriptionStatus string

const (
	SubscriptionStatusActive  SubscriptionStatus = "active"
	SubscriptionStatusExpired SubscriptionStatus = "expired"
	SubscriptionStatusRevoked SubscriptionStatus = "revoked"
)

const (
	UserSubscriptionCacheKey = "user_sub_groups:%d"
)

type UserSubscription struct {
	ID          int                `json:"id" gorm:"primaryKey"`
	UserId      int                `json:"user_id" gorm:"index;not null"`
	PlanId      int                `json:"plan_id" gorm:"not null"`
	PlanName    string             `json:"plan_name" gorm:"type:varchar(100)"`
	GroupSymbol string             `json:"group_symbol" gorm:"type:varchar(50);index;not null"`
	QuotaAmount float64            `json:"quota_amount" gorm:"type:decimal(10,2)"`
	UsedAmount  float64            `json:"used_amount" gorm:"type:decimal(10,4);default:0"`
	TradeNo     string             `json:"trade_no" gorm:"type:varchar(50);index"`
	StartTime   int64              `json:"start_time" gorm:"not null"`
	ExpireTime  int64              `json:"expire_time" gorm:"index;not null"`
	Status      SubscriptionStatus `json:"status" gorm:"type:varchar(20);index;default:'active'"`
	CreatedAt   int                `json:"created_at"`
	UpdatedAt   int                `json:"-"`
	DeletedAt   gorm.DeletedAt     `json:"-" gorm:"index"`

	// 非数据库字段
	Username    string `json:"username" gorm:"-"`
	DisplayName string `json:"display_name" gorm:"-"`
}

type SearchUserSubscriptionParams struct {
	UserId      int    `form:"user_id"`
	GroupSymbol string `form:"group_symbol"`
	Status      string `form:"status"`
	PaginationParams
}

var allowedUserSubscriptionOrderFields = map[string]bool{
	"id":          true,
	"user_id":     true,
	"expire_time": true,
	"status":      true,
	"created_at":  true,
}

func (s *UserSubscription) Insert() error {
	err := DB.Create(s).Error
	if err == nil {
		ClearUserSubscriptionCache(s.UserId)
	}
	return err
}

func (s *UserSubscription) Update() error {
	err := DB.Save(s).Error
	if err == nil {
		ClearUserSubscriptionCache(s.UserId)
	}
	return err
}

func GetUserSubscriptionById(id int) (*UserSubscription, error) {
	var sub UserSubscription
	err := DB.Where("id = ?", id).First(&sub).Error
	return &sub, err
}

func GetUserSubscriptionList(params *SearchUserSubscriptionParams) (*DataResult[UserSubscription], error) {
	var subs []*UserSubscription
	db := DB.Session(&gorm.Session{PrepareStmt: false})

	if params.UserId != 0 {
		db = db.Where("user_id = ?", params.UserId)
	}
	if params.GroupSymbol != "" {
		db = db.Where("group_symbol = ?", params.GroupSymbol)
	}
	if params.Status != "" {
		db = db.Where("status = ?", params.Status)
	}

	result, err := PaginateAndOrder(db, &params.PaginationParams, &subs, allowedUserSubscriptionOrderFields)
	if err != nil {
		return nil, err
	}

	fillSubscriptionUserInfo(*result.Data)

	return result, nil
}

func fillSubscriptionUserInfo(subs []*UserSubscription) {
	if len(subs) == 0 {
		return
	}

	userIDs := make([]int, 0, len(subs))
	seen := make(map[int]struct{})
	for _, sub := range subs {
		if _, ok := seen[sub.UserId]; ok {
			continue
		}
		seen[sub.UserId] = struct{}{}
		userIDs = append(userIDs, sub.UserId)
	}

	type userInfo struct {
		Id          int    `gorm:"column:id"`
		Username    string `gorm:"column:username"`
		DisplayName string `gorm:"column:display_name"`
	}

	var users []userInfo
	DB.Model(&User{}).Select("id, username, display_name").Where("id IN ?", userIDs).Find(&users)

	userMap := make(map[int]*userInfo, len(users))
	for i := range users {
		userMap[users[i].Id] = &users[i]
	}

	for _, sub := range subs {
		if u, ok := userMap[sub.UserId]; ok {
			sub.Username = u.Username
			sub.DisplayName = u.DisplayName
		}
	}
}

// GetMySubscriptions 获取用户的所有订阅（含已过期）
func GetMySubscriptions(userId int) ([]*UserSubscription, error) {
	var subs []*UserSubscription
	err := DB.Where("user_id = ?", userId).Order("status ASC, expire_time DESC").Find(&subs).Error
	return subs, err
}

// GetActiveSubscriptions 获取用户某分组的活跃订阅，按到期时间升序
func GetActiveSubscriptions(userId int, groupSymbol string) ([]UserSubscription, error) {
	var subs []UserSubscription
	err := DB.Where("user_id = ? AND group_symbol = ? AND status = ? AND expire_time > ?",
		userId, groupSymbol, SubscriptionStatusActive, time.Now().Unix()).
		Order("expire_time ASC").Find(&subs).Error
	return subs, err
}

// GetActiveSubscriptionGroups 获取用户所有已订阅的分组列表
func GetActiveSubscriptionGroups(userId int) ([]string, error) {
	var groups []string
	err := DB.Model(&UserSubscription{}).
		Where("user_id = ? AND status = ? AND expire_time > ?",
			userId, SubscriptionStatusActive, time.Now().Unix()).
		Distinct("group_symbol").Pluck("group_symbol", &groups).Error
	return groups, err
}

// HasActiveSubscription 检查用户是否有某分组的活跃订阅
func HasActiveSubscription(userId int, groupSymbol string) bool {
	var count int64
	DB.Model(&UserSubscription{}).
		Where("user_id = ? AND group_symbol = ? AND status = ? AND expire_time > ?",
			userId, groupSymbol, SubscriptionStatusActive, time.Now().Unix()).
		Count(&count)
	return count > 0
}

// TryConsumeSubscriptionQuota 尝试从订阅配额扣减
// quotaAmount 为内部 quota 单位，会转换为 USD
// 优先消耗到期最近的订阅
func TryConsumeSubscriptionQuota(userId int, groupSymbol string, quotaAmount int) (bool, error) {
	usdAmount := float64(quotaAmount) / config.QuotaPerUnit

	subs, err := GetActiveSubscriptions(userId, groupSymbol)
	if err != nil || len(subs) == 0 {
		return false, err
	}

	// 检查总剩余是否足够
	totalRemaining := 0.0
	for _, sub := range subs {
		totalRemaining += sub.QuotaAmount - sub.UsedAmount
	}
	if totalRemaining < usdAmount {
		return false, nil
	}

	// 按到期顺序消耗
	remaining := usdAmount
	for _, sub := range subs {
		available := sub.QuotaAmount - sub.UsedAmount
		if available <= 0 {
			continue
		}
		consume := math.Min(available, remaining)
		err := DB.Model(&UserSubscription{}).Where("id = ?", sub.ID).
			Update("used_amount", gorm.Expr("used_amount + ?", consume)).Error
		if err != nil {
			logger.SysError(fmt.Sprintf("consume subscription quota error: %s", err.Error()))
			return false, err
		}
		remaining -= consume
		if remaining <= 0 {
			break
		}
	}

	return true, nil
}

// AdjustSubscriptionQuota 调整订阅配额（用于 post-consumption 修正）
// quotaDelta 为内部 quota 单位的差值，可正可负
func AdjustSubscriptionQuota(userId int, groupSymbol string, quotaDelta int) {
	if quotaDelta == 0 {
		return
	}

	usdDelta := float64(quotaDelta) / config.QuotaPerUnit

	if usdDelta > 0 {
		// 需要额外扣除
		TryConsumeSubscriptionQuota(userId, groupSymbol, quotaDelta)
	} else {
		// 需要退还，退给到期最近的活跃订阅
		subs, err := GetActiveSubscriptions(userId, groupSymbol)
		if err != nil || len(subs) == 0 {
			return
		}
		refund := -usdDelta
		for _, sub := range subs {
			canRefund := math.Min(sub.UsedAmount, refund)
			if canRefund <= 0 {
				continue
			}
			DB.Model(&UserSubscription{}).Where("id = ?", sub.ID).
				Update("used_amount", gorm.Expr("used_amount - ?", canRefund))
			refund -= canRefund
			if refund <= 0 {
				break
			}
		}
	}
}

// ExpireSubscriptions 将所有到期的活跃订阅标记为过期
func ExpireSubscriptions() (int64, error) {
	// 先找到受影响的用户ID，用于清缓存
	var userIds []int
	DB.Model(&UserSubscription{}).
		Where("status = ? AND expire_time <= ?", SubscriptionStatusActive, time.Now().Unix()).
		Distinct("user_id").Pluck("user_id", &userIds)

	result := DB.Model(&UserSubscription{}).
		Where("status = ? AND expire_time <= ?", SubscriptionStatusActive, time.Now().Unix()).
		Update("status", SubscriptionStatusExpired)

	if result.Error == nil && len(userIds) > 0 {
		for _, userId := range userIds {
			ClearUserSubscriptionCache(userId)
		}
	}

	return result.RowsAffected, result.Error
}

// AdminAdjustExpireTime 管理员调整订阅到期时间
func AdminAdjustExpireTime(id int, expireTime int64) error {
	sub, err := GetUserSubscriptionById(id)
	if err != nil {
		return err
	}

	updates := map[string]interface{}{
		"expire_time": expireTime,
	}

	// 如果新到期时间在未来且状态是过期，重新激活
	if expireTime > time.Now().Unix() && sub.Status == SubscriptionStatusExpired {
		updates["status"] = SubscriptionStatusActive
	}
	// 如果新到期时间已过去且状态是活跃，标记过期
	if expireTime <= time.Now().Unix() && sub.Status == SubscriptionStatusActive {
		updates["status"] = SubscriptionStatusExpired
	}

	err = DB.Model(&UserSubscription{}).Where("id = ?", id).Updates(updates).Error
	if err == nil {
		ClearUserSubscriptionCache(sub.UserId)
	}
	return err
}

// AdminResetQuota 管理员重置订阅配额（已用量清零）
func AdminResetQuota(id int) error {
	sub, err := GetUserSubscriptionById(id)
	if err != nil {
		return err
	}

	err = DB.Model(&UserSubscription{}).Where("id = ?", id).Update("used_amount", 0).Error
	if err == nil {
		ClearUserSubscriptionCache(sub.UserId)
	}
	return err
}

// AdminRevokeSubscription 管理员撤销订阅
func AdminRevokeSubscription(id int) error {
	sub, err := GetUserSubscriptionById(id)
	if err != nil {
		return err
	}
	if sub.Status == SubscriptionStatusRevoked {
		return errors.New("订阅已被撤销")
	}

	err = DB.Model(&UserSubscription{}).Where("id = ?", id).Update("status", SubscriptionStatusRevoked).Error
	if err == nil {
		ClearUserSubscriptionCache(sub.UserId)
	}
	return err
}

// CalculateExpireTime 根据套餐类型计算到期时间
func CalculateExpireTime(durationType string, durationCount int) int64 {
	now := time.Now()
	switch durationType {
	case "day":
		return now.AddDate(0, 0, durationCount).Unix()
	case "week":
		return now.AddDate(0, 0, 7*durationCount).Unix()
	case "month":
		return now.AddDate(0, durationCount, 0).Unix()
	default:
		return now.AddDate(0, 0, durationCount).Unix()
	}
}

// ClearUserSubscriptionCache 清除用户订阅相关缓存
func ClearUserSubscriptionCache(userId int) {
	if config.RedisEnabled {
		redis.RedisDel(fmt.Sprintf(UserSubscriptionCacheKey, userId))
	}
}

// CacheGetActiveSubscriptionGroups 带缓存地获取用户已订阅分组
func CacheGetActiveSubscriptionGroups(userId int) ([]string, error) {
	// 订阅数据变化不频繁，但需要实时性，直接查 DB
	// 缓存在 TryConsumeSubscriptionQuota 等高频场景中不使用（直接查 DB 保证一致性）
	return GetActiveSubscriptionGroups(userId)
}
