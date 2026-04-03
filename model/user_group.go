package model

import (
	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/limit"
	"czloapi/common/logger"
	"czloapi/common/redis"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	DefaultUserGroupSymbol = "Lite"
	AdminUserGroupSymbol   = "Admin"
)

func IsPricingVisibleUserGroup(symbol string) bool {
	return !strings.EqualFold(strings.TrimSpace(symbol), AdminUserGroupSymbol)
}

func GetPricingVisibleUserGroupMap(userSymbol string) map[string]*UserGroup {
	groupRatio := GlobalUserGroupRatio.GetAll()
	userGroup := make(map[string]*UserGroup, len(groupRatio))

	for k, v := range groupRatio {
		if !IsPricingVisibleUserGroup(k) && k != userSymbol {
			continue
		}
		userGroup[k] = v
	}

	return userGroup
}

func GetPricingVisibleGroupSymbols(userSymbol string) []string {
	allGroups := GlobalUserGroupRatio.GetAllSorted()
	groupSymbols := make([]string, 0, len(allGroups))

	for _, group := range allGroups {
		if !IsPricingVisibleUserGroup(group.Symbol) && group.Symbol != userSymbol {
			continue
		}
		groupSymbols = append(groupSymbols, group.Symbol)
	}

	return groupSymbols
}

type UserGroup struct {
	Id             int                                      `json:"id"`
	Symbol         string                                   `json:"symbol" gorm:"type:varchar(50);uniqueIndex"`
	Name           string                                   `json:"name" gorm:"type:varchar(50)"`
	Ratio          float64                                  `json:"ratio" gorm:"type:decimal(10,2); default:1"`
	APIRate        int                                      `json:"api_rate" gorm:"default:600"`
	Public         bool                                     `json:"public" form:"public" gorm:"default:false"`
	Promotion      bool                                     `json:"promotion" form:"promotion" gorm:"default:false"`
	Min            int                                      `json:"min" form:"min" gorm:"default:0"`
	Max            int                                      `json:"max" form:"max" gorm:"default:0"`
	Enable         *bool                                    `json:"enable" form:"enable" gorm:"default:true"`
	IsDefault      bool                                     `json:"is_default" form:"is_default" gorm:"default:false"`
	ProviderRatios *datatypes.JSONType[[]ProviderRatioRule] `json:"provider_ratios,omitempty" gorm:"type:json"`
}

type SearchUserGroupParams struct {
	UserGroup
	PaginationParams
}

var allowedUserGroupOrderFields = map[string]bool{
	"id":     true,
	"name":   true,
	"enable": true,
}

func GetUserGroupsList(params *SearchUserGroupParams) (*DataResult[UserGroup], error) {
	var userGroups []*UserGroup
	db := DB.Session(&gorm.Session{PrepareStmt: false})

	if params.Name != "" {
		db = db.Where("name LIKE ?", params.Name+"%")
	}

	if params.Enable != nil {
		db = db.Where("enable = ?", *params.Enable)
	}

	return PaginateAndOrder(db, &params.PaginationParams, &userGroups, allowedUserGroupOrderFields)
}

func GetUserGroupsById(id int) (*UserGroup, error) {
	var userGroup UserGroup
	err := DB.Session(&gorm.Session{PrepareStmt: false}).Where("id = ?", id).First(&userGroup).Error
	return &userGroup, err
}

func GetUserGroupsAll(isPublic bool) ([]*UserGroup, error) {
	var userGroups []*UserGroup

	db := DB.Session(&gorm.Session{PrepareStmt: false}).Where("enable = ?", true)
	if isPublic {
		db = db.Where("public = ?", true)
	}

	err := db.Find(&userGroups).Error
	return userGroups, err
}

func (c *UserGroup) normalize() {
	c.Symbol = strings.TrimSpace(c.Symbol)
	c.Name = strings.TrimSpace(c.Name)
	c.SetProviderRatioRules(c.GetProviderRatioRules())
}

func getUserGroupColumnName() string {
	if common.UsingPostgreSQL {
		return `"group"`
	}
	return "`group`"
}

func GetDefaultUserGroup() (*UserGroup, error) {
	var userGroup UserGroup
	err := DB.Where("is_default = ?", true).First(&userGroup).Error
	if err == nil {
		return &userGroup, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	err = DB.Where("symbol = ?", DefaultUserGroupSymbol).First(&userGroup).Error
	if err != nil {
		return nil, err
	}

	return &userGroup, nil
}

func GetDefaultUserGroupSymbol() (string, error) {
	userGroup, err := GetDefaultUserGroup()
	if err != nil {
		return "", err
	}
	return userGroup.Symbol, nil
}

func (c *UserGroup) Create() error {
	c.normalize()
	c.IsDefault = false
	if err := c.ValidateProviderRatios(); err != nil {
		return err
	}

	db := DB.Session(&gorm.Session{PrepareStmt: false})
	err := db.Create(c).Error
	if err == nil {
		GlobalUserGroupRatio.loadWithDB(db)
	}
	return err
}

func (c *UserGroup) Update() error {
	renameDB := DB.Session(&gorm.Session{PrepareStmt: false})
	c.normalize()
	if err := c.ValidateProviderRatios(); err != nil {
		return err
	}
	if c.Id == 0 {
		return errors.New("id 涓虹┖")
	}
	if c.Symbol == "" {
		return errors.New("symbol 涓嶈兘涓虹┖")
	}
	if c.Name == "" {
		return errors.New("name 涓嶈兘涓虹┖")
	}

	current := &UserGroup{}
	err := renameDB.Where("id = ?", c.Id).First(current).Error
	if err != nil {
		return err
	}

	oldSymbol := current.Symbol
	newSymbol := c.Symbol
	groupCol := getUserGroupColumnName()
	userCacheIDs := make([]int, 0)
	tokenCacheKeys := make(map[string]struct{})

	err = renameDB.Transaction(func(tx *gorm.DB) error {
		if oldSymbol != newSymbol {
			var count int64
			if err := tx.Model(&UserGroup{}).Where("symbol = ? AND id <> ?", newSymbol, c.Id).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return errors.New("鐢ㄦ埛缁勬爣璇嗗凡瀛樺湪")
			}

			if err := tx.Model(&User{}).Where(groupCol+" = ?", oldSymbol).Pluck("id", &userCacheIDs).Error; err != nil {
				return err
			}

			var linkedTokens []Token
			if err := tx.Select("id", "key").Where(groupCol+" = ? OR backup_group = ?", oldSymbol, oldSymbol).Find(&linkedTokens).Error; err != nil {
				return err
			}
			for _, token := range linkedTokens {
				tokenCacheKeys[token.Key] = struct{}{}
			}

			if err := tx.Model(&User{}).Where(groupCol+" = ?", oldSymbol).Update("group", newSymbol).Error; err != nil {
				return err
			}
			if err := tx.Model(&Token{}).Where(groupCol+" = ?", oldSymbol).Update("group", newSymbol).Error; err != nil {
				return err
			}
			if err := tx.Model(&Token{}).Where("backup_group = ?", oldSymbol).Update("backup_group", newSymbol).Error; err != nil {
				return err
			}

			var tokens []Token
			if err := tx.Select("id", "key", "setting").Find(&tokens).Error; err != nil {
				return err
			}
			for _, token := range tokens {
				setting := token.Setting.Data()
				if len(setting.FallbackGroups) == 0 {
					continue
				}

				updated := false
				for i, group := range setting.FallbackGroups {
					if group != oldSymbol {
						continue
					}
					setting.FallbackGroups[i] = newSymbol
					updated = true
				}
				if !updated {
					continue
				}

				token.Setting.Set(setting)
				if err := tx.Model(&Token{}).Where("id = ?", token.Id).Update("setting", token.Setting).Error; err != nil {
					return err
				}
				tokenCacheKeys[token.Key] = struct{}{}
			}
		}

		return tx.Model(&UserGroup{}).
			Where("id = ?", c.Id).
			Select("symbol", "name", "ratio", "public", "api_rate", "promotion", "min", "max", "provider_ratios").
			Updates(c).Error
	})
	if err == nil {
		GlobalUserGroupRatio.loadWithDB(renameDB)
		if config.RedisEnabled {
			for _, userID := range userCacheIDs {
				redis.RedisDel(fmt.Sprintf(UserGroupCacheKey, userID))
			}
			for tokenKey := range tokenCacheKeys {
				redis.RedisDel(fmt.Sprintf(UserTokensKey, tokenKey))
			}
		}
	}

	return err
}

func (c *UserGroup) Delete() error {
	db := DB.Session(&gorm.Session{PrepareStmt: false})
	err := db.Delete(c).Error

	if err == nil {
		GlobalUserGroupRatio.loadWithDB(db)
	}
	return err
}

func ChangeUserGroupEnable(id int, enable bool) error {
	db := DB.Session(&gorm.Session{PrepareStmt: false})
	err := db.Model(&UserGroup{}).Where("id = ?", id).Update("enable", enable).Error
	if err == nil {
		GlobalUserGroupRatio.loadWithDB(db)
	}
	return err
}

type UserGroupRatio struct {
	sync.RWMutex
	UserGroup   map[string]*UserGroup
	APILimiter  map[string]limit.RateLimiter
	PublicGroup []string
}

var GlobalUserGroupRatio = UserGroupRatio{}

func (cgrm *UserGroupRatio) Load() {
	cgrm.loadWithDB(DB.Session(&gorm.Session{PrepareStmt: false}))
}

func (cgrm *UserGroupRatio) loadWithDB(db *gorm.DB) {
	var userGroups []*UserGroup
	err := db.Where("enable = ?", true).Find(&userGroups).Error
	if err != nil {
		return
	}

	newUserGroups := make(map[string]*UserGroup, len(userGroups))
	newAPILimiter := make(map[string]limit.RateLimiter, len(userGroups))
	publicGroup := make([]string, 0)

	for _, userGroup := range userGroups {
		newUserGroups[userGroup.Symbol] = userGroup
		newAPILimiter[userGroup.Symbol] = limit.NewAPILimiter(userGroup.APIRate)
		if userGroup.Public {
			publicGroup = append(publicGroup, userGroup.Symbol)
		}
	}

	cgrm.Lock()
	defer cgrm.Unlock()

	cgrm.UserGroup = newUserGroups
	cgrm.APILimiter = newAPILimiter
	cgrm.PublicGroup = publicGroup
}

func (cgrm *UserGroupRatio) GetBySymbol(symbol string) *UserGroup {
	cgrm.RLock()
	defer cgrm.RUnlock()

	if symbol == "" {
		return nil
	}

	userGroupRatio, ok := cgrm.UserGroup[symbol]
	if !ok {
		return nil
	}

	return userGroupRatio
}

func (cgrm *UserGroupRatio) GetByTokenUserGroup(tokenGroup, userGroup string) *UserGroup {
	if tokenGroup != "" {
		return cgrm.GetBySymbol(tokenGroup)
	}

	return cgrm.GetBySymbol(userGroup)
}

func (cgrm *UserGroupRatio) GetAll() map[string]*UserGroup {
	cgrm.RLock()
	defer cgrm.RUnlock()

	return cgrm.UserGroup
}

func (cgrm *UserGroupRatio) GetAllSorted() []*UserGroup {
	cgrm.RLock()
	defer cgrm.RUnlock()

	groups := make([]*UserGroup, 0, len(cgrm.UserGroup))
	for _, ug := range cgrm.UserGroup {
		groups = append(groups, ug)
	}
	sort.Slice(groups, func(i, j int) bool {
		return groups[i].Id < groups[j].Id
	})
	return groups
}

func (cgrm *UserGroupRatio) GetAPIRate(symbol string) int {
	userGroup := cgrm.GetBySymbol(symbol)
	if userGroup == nil {
		return 0
	}

	return userGroup.APIRate
}

func (cgrm *UserGroupRatio) GetPublicGroupList() []string {
	cgrm.RLock()
	defer cgrm.RUnlock()

	return cgrm.PublicGroup
}

func (cgrm *UserGroupRatio) GetAPILimiter(symbol string) limit.RateLimiter {
	cgrm.RLock()
	defer cgrm.RUnlock()

	limiter, ok := cgrm.APILimiter[symbol]
	if !ok {
		return nil
	}

	return limiter
}

// CheckAndUpgradeUserGroup checks if a user's cumulative recharge amount falls within any promotion group's range
// and upgrades the user to that group if a match is found.
// The cumulative recharge amount is calculated as Quota + UsedQuota + rechargeAmount.
func CheckAndUpgradeUserGroup(userId int, rechargeAmount int) error {
	user := &User{}
	err := DB.Where("id = ?", userId).First(user).Error
	if err != nil {
		return err
	}

	cumulativeAmount := user.Quota + user.UsedQuota + rechargeAmount
	logger.SysError(fmt.Sprintf(
		"use:%f q:%f cumulative:%f rechargeAmount:%f",
		float64(user.UsedQuota)/config.QuotaPerUnit,
		float64(user.Quota)/config.QuotaPerUnit,
		float64(cumulativeAmount)/config.QuotaPerUnit,
		float64(rechargeAmount)/config.QuotaPerUnit,
	))

	var promotionGroups []*UserGroup
	err = DB.Where("promotion = ? AND enable = ?", true, true).Find(&promotionGroups).Error
	if err != nil {
		return err
	}

	var targetGroup *UserGroup
	for _, group := range promotionGroups {
		minQuota := float64(group.Min) * config.QuotaPerUnit
		maxQuota := float64(group.Max) * config.QuotaPerUnit
		if float64(cumulativeAmount) >= minQuota && (group.Max == 0 || float64(cumulativeAmount) < maxQuota) {
			if targetGroup == nil || group.Min > targetGroup.Min {
				targetGroup = group
			}
		}
	}

	if targetGroup != nil && targetGroup.Symbol != user.Group {
		err = DB.Model(&User{}).Where("id = ?", userId).Update("group", targetGroup.Symbol).Error
		if err != nil {
			return err
		}

		if config.RedisEnabled {
			redis.RedisDel(fmt.Sprintf(UserGroupCacheKey, userId))
		}
	}

	return nil
}
