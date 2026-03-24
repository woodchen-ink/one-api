package model

import (
	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/database"
	"czloapi/common/logger"
	"czloapi/common/redis"
	"czloapi/common/stmp"
	"czloapi/common/utils"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

var (
	ErrKeyNotFound          = errors.New("Key不存在")
	ErrKeyExpired           = errors.New("Key已过期")
	ErrKeyQuotaExhausted    = errors.New("Key额度已用尽")
	ErrKeyStatusUnavailable = errors.New("Key状态不可用")
	ErrKeyInvalid           = errors.New("无效的Key")
	ErrKeyQuotaGet          = errors.New("获取Key额度失败")

	ErrTokenNotFound          = ErrKeyNotFound
	ErrTokenExpired           = ErrKeyExpired
	ErrTokenQuotaExhausted    = ErrKeyQuotaExhausted
	ErrTokenStatusUnavailable = ErrKeyStatusUnavailable
	ErrTokenInvalid           = ErrKeyInvalid
	ErrTokenQuotaGet          = ErrKeyQuotaGet
)

type Key struct {
	Id             int            `json:"id"`
	UserId         int            `json:"user_id"`
	Key            string         `json:"key" gorm:"type:varchar(59);uniqueIndex"`
	Status         int            `json:"status" gorm:"default:1"`
	Name           string         `json:"name" gorm:"index" `
	CreatedTime    int64          `json:"created_time" gorm:"bigint"`
	AccessedTime   int64          `json:"accessed_time" gorm:"bigint"`
	ExpiredTime    int64          `json:"expired_time" gorm:"bigint;default:-1"` // -1 means never expired
	RemainQuota    int            `json:"remain_quota" gorm:"default:0"`
	UnlimitedQuota bool           `json:"unlimited_quota" gorm:"default:false"`
	UsedQuota      int            `json:"used_quota" gorm:"default:0"` // used quota
	Group          string         `json:"group" gorm:"default:''"`
	BackupGroup    string         `json:"backup_group" gorm:"default:''"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`

	Setting database.JSONType[KeySetting] `json:"setting" form:"setting" gorm:"type:json"`
}

type Token = Key

func (Key) TableName() string {
	return "keys"
}

var allowedKeyOrderFields = map[string]bool{
	"id":           true,
	"name":         true,
	"status":       true,
	"expired_time": true,
	"created_time": true,
	"remain_quota": true,
	"used_quota":   true,
}

// 添加 AfterCreate 钩子方法
func (key *Key) AfterCreate(tx *gorm.DB) (err error) {
	tokenKey, err := common.GenerateToken(key.Id, key.UserId)
	if err != nil {
		return err
	}

	// 更新 key 字段
	return tx.Model(key).Update("key", tokenKey).Error
}

type KeySetting struct {
	Heartbeat      HeartbeatSetting `json:"heartbeat,omitempty"`
	Limits         LimitsConfig     `json:"limits,omitempty"`
	FallbackGroups []string         `json:"fallback_groups,omitempty"`
}

type TokenSetting = KeySetting

type HeartbeatSetting struct {
	Enabled        bool `json:"enabled"`
	TimeoutSeconds int  `json:"timeout_seconds"`
}

type LimitsConfig struct {
	LimitModelSetting LimitModelSetting `json:"limit_model_setting,omitempty"`
	LimitsIPSetting   LimitsIPSetting   `json:"limits_ip_setting,omitempty"`
}

type LimitModelSetting struct {
	Enabled bool     `json:"enabled"`
	Models  []string `json:"models"`
}

type LimitsIPSetting struct {
	Enabled   bool     `json:"enabled"`
	Whitelist []string `json:"whitelist"`
}

func MergeTokenFallbackGroups(primaryGroup, backupGroup string, fallbackGroups []string) []string {
	groups := make([]string, 0, 1+len(fallbackGroups))
	seen := make(map[string]struct{}, len(fallbackGroups)+1)

	if primaryGroup != "" {
		seen[primaryGroup] = struct{}{}
	}

	appendGroup := func(group string) {
		group = strings.TrimSpace(group)
		if group == "" {
			return
		}
		if _, ok := seen[group]; ok {
			return
		}
		seen[group] = struct{}{}
		groups = append(groups, group)
	}

	appendGroup(backupGroup)
	for _, group := range fallbackGroups {
		appendGroup(group)
	}

	return groups
}

func GetUserKeysList(userId int, params *GenericParams) (*DataResult[Key], error) {
	var keys []*Key
	db := DB.Where("user_id = ?", userId)

	if params.Keyword != "" {
		db = db.Where("name LIKE ?", params.Keyword+"%")
	}

	return PaginateAndOrder(db, &params.PaginationParams, &keys, allowedKeyOrderFields)
}

func GetUserTokensList(userId int, params *GenericParams) (*DataResult[Key], error) {
	return GetUserKeysList(userId, params)
}

// AdminSearchKeysParams 管理员搜索 Key 的参数
type AdminSearchKeysParams struct {
	GenericParams
	UserId int `form:"user_id"`
	KeyId  int `form:"key_id"`
}

// KeyWithOwner 包含 Key 信息和所属用户信息
type KeyWithOwner struct {
	Key
	OwnerName string `json:"owner_name"` // 用户名称（优先显示 display_name，其次 username）
}

type TokenWithOwner = KeyWithOwner

// GetKeysListByAdmin 管理员查询 Key 列表（可按用户ID或Key ID查询）
func GetKeysListByAdmin(params *AdminSearchKeysParams) (*DataResult[KeyWithOwner], error) {
	var keys []*Key
	db := DB.Model(&Key{})

	// 按用户ID筛选
	if params.UserId > 0 {
		db = db.Where("user_id = ?", params.UserId)
	}

	// 按Key ID筛选
	if params.KeyId > 0 {
		db = db.Where("id = ?", params.KeyId)
	}

	// 按关键词搜索名称
	if params.Keyword != "" {
		db = db.Where("name LIKE ?", params.Keyword+"%")
	}

	result, err := PaginateAndOrder(db, &params.PaginationParams, &keys, allowedKeyOrderFields)
	if err != nil {
		return nil, err
	}

	// 收集所有用户ID
	userIds := make([]int, 0)
	userIdMap := make(map[int]bool)
	for _, token := range *result.Data {
		if !userIdMap[token.UserId] {
			userIds = append(userIds, token.UserId)
			userIdMap[token.UserId] = true
		}
	}

	// 批量查询用户信息
	userNameMap := make(map[int]string)
	if len(userIds) > 0 {
		var users []User
		DB.Select("id, username, display_name").Where("id IN ?", userIds).Find(&users)
		for _, user := range users {
			name := user.DisplayName
			if name == "" {
				name = user.Username
			}
			userNameMap[user.Id] = name
		}
	}

	// 构建带用户信息的结果
	keysWithOwner := make([]*KeyWithOwner, len(*result.Data))
	for i, key := range *result.Data {
		keysWithOwner[i] = &KeyWithOwner{
			Key:       *key,
			OwnerName: userNameMap[key.UserId],
		}
	}

	return &DataResult[KeyWithOwner]{
		Data:       &keysWithOwner,
		TotalCount: result.TotalCount,
	}, nil
}

func GetKeyModel(key string) (credential *Key, err error) {
	if key == "" {
		return nil, ErrKeyInvalid
	}

	var userId int
	var tokenId int
	validUser := false

	switch len(key) {
	case 48:
		validUser = true
		if config.RedisEnabled {
			exists, _ := redis.RedisSIsMember(OldUserTokensCacheKey, key)
			if !exists {
				return nil, ErrKeyInvalid
			}
		}
	case 59:
		tokenId, userId, err = common.ValidateToken(key)
		if err != nil || userId == 0 || tokenId == 0 {
			return nil, ErrKeyInvalid
		}
		if userEnabled, err := CacheIsUserEnabled(userId); err != nil || !userEnabled {
			return nil, ErrKeyInvalid
		}
	default:
		return nil, ErrKeyInvalid
	}

	credential, err = CacheGetKeyByValue(key)
	if err != nil {
		maskedKey := key[:3] + "*********" + key[len(key)-3:]
		logger.SysError(fmt.Sprintf("DB Not Found: userId=%d, tokenId=%d, key=%s, err=%s", userId, tokenId, maskedKey, err.Error()))
		return nil, ErrKeyInvalid
	}

	if validUser {
		if userEnabled, err := CacheIsUserEnabled(credential.UserId); err != nil || !userEnabled {
			return nil, ErrKeyInvalid
		}
	}

	return credential, nil
}

func GetTokenModel(key string) (*Key, error) {
	return GetKeyModel(key)
}

func ValidateUserKey(key string) (credential *Key, err error) {
	credential, err = GetKeyModel(key)
	if err != nil {
		return nil, err
	}

	if credential.Status != config.TokenStatusEnabled {
		switch credential.Status {
		case config.TokenStatusExhausted:
			return nil, ErrKeyQuotaExhausted
		case config.TokenStatusExpired:
			return nil, ErrKeyExpired
		default:
			return nil, ErrKeyStatusUnavailable
		}
	}

	if credential.ExpiredTime != -1 && credential.ExpiredTime < utils.GetTimestamp() {
		return nil, ErrKeyExpired
	}

	if !credential.UnlimitedQuota {
		if !credential.UnlimitedQuota && credential.RemainQuota <= 0 {
			if !config.RedisEnabled {
				// in this case, we can make sure the token is exhausted
				credential.Status = config.TokenStatusExhausted
				err := credential.SelectUpdate()
				if err != nil {
					logger.SysError("failed to update token status" + err.Error())
				}
			}
			return nil, ErrKeyQuotaExhausted
		}
	}

	return credential, nil
}

func ValidateUserToken(key string) (*Key, error) {
	return ValidateUserKey(key)
}

func GetKeyByIds(id int, userId int) (*Key, error) {
	if id == 0 || userId == 0 {
		return nil, errors.New("id 或 userId 为空！")
	}
	key := Key{Id: id, UserId: userId}
	var err error = nil
	err = DB.First(&key, "id = ? and user_id = ?", id, userId).Error
	return &key, err
}

func GetTokenByIds(id int, userId int) (*Key, error) {
	return GetKeyByIds(id, userId)
}

func GetKeyById(id int) (*Key, error) {
	if id == 0 {
		return nil, errors.New("id 为空！")
	}
	var key Key
	err := DB.First(&key, "id = ?", id).Error
	return &key, err
}

func GetTokenById(id int) (*Key, error) {
	return GetKeyById(id)
}

func GetKeyByName(name string, userId int) (*Key, error) {
	if name == "" {
		return nil, errors.New("name 为空！")
	}
	key := Key{Name: name}
	var err error = nil
	err = DB.First(&key, "user_id = ? and name = ?", userId, name).Error
	return &key, err
}

func GetTokenByName(name string, userId int) (*Key, error) {
	return GetKeyByName(name, userId)
}

func GetKeyByValue(keyValue string) (*Key, error) {
	keyCol := "`key`"
	if common.UsingPostgreSQL {
		keyCol = `"key"`
	}

	var key Key

	err := DB.Where(keyCol+" = ?", keyValue).First(&key).Error
	return &key, err
}

func GetTokenByKey(key string) (*Key, error) {
	return GetKeyByValue(key)
}

func (key *Key) Insert() error {
	err := DB.Create(key).Error
	return err
}

// Update Make sure your token's fields is completed, because this will update non-zero values
func (key *Key) Update() error {
	err := DB.Model(key).Select("name", "status", "expired_time", "remain_quota", "unlimited_quota", "group", "backup_group", "setting").Updates(key).Error
	// 防止Redis缓存不生效，直接删除
	if err == nil && config.RedisEnabled {
		redis.RedisDel(fmt.Sprintf(UserKeysKey, key.Key))
	}

	return err
}

// UpdateByAdmin 管理员更新token，支持更新user_id字段
func (key *Key) UpdateByAdmin() error {
	err := DB.Model(key).Select("user_id", "name", "status", "expired_time", "remain_quota", "unlimited_quota", "group", "backup_group", "setting").Updates(key).Error
	// 防止Redis缓存不生效，直接删除
	if err == nil && config.RedisEnabled {
		redis.RedisDel(fmt.Sprintf(UserKeysKey, key.Key))
	}

	return err
}

func (key *Key) SelectUpdate() error {
	// This can update zero values
	return DB.Model(key).Select("accessed_time", "status").Updates(key).Error
}

func (key *Key) Delete() error {
	err := DB.Delete(key).Error
	return err
}

func DeleteKeyById(id int, userId int) (err error) {
	// Why we need userId here? In case user want to delete other's token.
	if id == 0 || userId == 0 {
		return errors.New("id 或 userId 为空！")
	}
	key := Key{Id: id, UserId: userId}
	err = DB.Where(key).First(&key).Error
	if err != nil {
		return err
	}
	err = key.Delete()

	if err == nil && config.RedisEnabled {
		redis.RedisDel(fmt.Sprintf(UserKeysKey, key.Key))
	}

	return err

}

func DeleteTokenById(id int, userId int) error {
	return DeleteKeyById(id, userId)
}

func IncreaseKeyQuota(id int, quota int) (err error) {
	if quota < 0 {
		return errors.New("quota 不能为负数！")
	}
	if config.BatchUpdateEnabled {
		addNewRecord(BatchUpdateTypeTokenQuota, id, quota)
		return nil
	}
	return increaseKeyQuota(id, quota)
}

func IncreaseTokenQuota(id int, quota int) error {
	return IncreaseKeyQuota(id, quota)
}

func increaseKeyQuota(id int, quota int) (err error) {
	err = DB.Model(&Key{}).Where("id = ?", id).Updates(
		map[string]interface{}{
			"remain_quota":  gorm.Expr("remain_quota + ?", quota),
			"used_quota":    gorm.Expr("used_quota - ?", quota),
			"accessed_time": utils.GetTimestamp(),
		},
	).Error
	return err
}

func increaseTokenQuota(id int, quota int) error {
	return increaseKeyQuota(id, quota)
}

// UpdateKeyUsedQuota 仅更新 key 的 used_quota，不修改 remain_quota（用于无限额度 key）
func UpdateKeyUsedQuota(id int, quota int) (err error) {
	if config.BatchUpdateEnabled {
		addNewRecord(BatchUpdateTypeTokenUsedQuota, id, quota)
		return nil
	}
	return updateKeyUsedQuota(id, quota)
}

func UpdateTokenUsedQuota(id int, quota int) error {
	return UpdateKeyUsedQuota(id, quota)
}

func updateKeyUsedQuota(id int, quota int) (err error) {
	err = DB.Model(&Key{}).Where("id = ?", id).Updates(
		map[string]interface{}{
			"used_quota":    gorm.Expr("used_quota + ?", quota),
			"accessed_time": utils.GetTimestamp(),
		},
	).Error
	return err
}

func updateTokenUsedQuota(id int, quota int) error {
	return updateKeyUsedQuota(id, quota)
}

func DecreaseKeyQuota(id int, quota int) (err error) {
	if quota < 0 {
		return errors.New("quota 不能为负数！")
	}
	if config.BatchUpdateEnabled {
		addNewRecord(BatchUpdateTypeTokenQuota, id, -quota)
		return nil
	}
	return decreaseKeyQuota(id, quota)
}

func DecreaseTokenQuota(id int, quota int) error {
	return DecreaseKeyQuota(id, quota)
}

func decreaseKeyQuota(id int, quota int) (err error) {
	err = DB.Model(&Key{}).Where("id = ?", id).Updates(
		map[string]interface{}{
			"remain_quota":  gorm.Expr("remain_quota - ?", quota),
			"used_quota":    gorm.Expr("used_quota + ?", quota),
			"accessed_time": utils.GetTimestamp(),
		},
	).Error
	return err
}

func decreaseTokenQuota(id int, quota int) error {
	return decreaseKeyQuota(id, quota)
}

func PreConsumeKeyQuota(keyID int, quota int) (err error) {
	if quota < 0 {
		return errors.New("quota 不能为负数！")
	}
	key, err := GetKeyById(keyID)
	if err != nil {
		return err
	}
	if !key.UnlimitedQuota && key.RemainQuota < quota {
		return errors.New("Key额度不足")
	}
	userQuota, err := GetUserQuota(key.UserId)
	if err != nil {
		return err
	}
	if userQuota < quota {
		return errors.New("用户额度不足")
	}
	quotaTooLow := userQuota >= config.QuotaRemindThreshold && userQuota-quota < config.QuotaRemindThreshold
	noMoreQuota := userQuota-quota <= 0
	if quotaTooLow || noMoreQuota {
		go sendQuotaWarningEmail(key.UserId, userQuota, noMoreQuota)
	}
	if !key.UnlimitedQuota {
		err = DecreaseKeyQuota(keyID, quota)
		if err != nil {
			return err
		}
	} else {
		err = UpdateKeyUsedQuota(keyID, quota)
		if err != nil {
			return err
		}
	}
	err = DecreaseUserQuota(key.UserId, quota)
	return err
}

func PreConsumeTokenQuota(tokenId int, quota int) error {
	return PreConsumeKeyQuota(tokenId, quota)
}

func sendQuotaWarningEmail(userId int, userQuota int, noMoreQuota bool) {
	user := User{Id: userId}

	if err := user.FillUserById(); err != nil {
		logger.SysError("failed to fetch user email: " + err.Error())
		return
	}

	if user.Email == "" {
		logger.SysError("user email is empty")
		return
	}

	userName := user.DisplayName
	if userName == "" {
		userName = user.Username
	}

	err := stmp.SendQuotaWarningCodeEmail(userName, user.Email, userQuota, noMoreQuota)

	if err != nil {
		logger.SysError("failed to send email" + err.Error())
	}
}

// PostConsumeKeyQuotaWithInfo 消费 key 配额，直接使用传入的 userId 和 unlimitedQuota，避免数据库查询
func PostConsumeKeyQuotaWithInfo(keyID int, userId int, unlimitedQuota bool, quota int) (err error) {
	if quota == 0 {
		return nil
	}
	if quota > 0 {
		err = DecreaseUserQuota(userId, quota)
	} else {
		err = IncreaseUserQuota(userId, -quota)
	}
	if err != nil {
		return err
	}
	if !unlimitedQuota {
		if quota > 0 {
			err = DecreaseKeyQuota(keyID, quota)
		} else {
			err = IncreaseKeyQuota(keyID, -quota)
		}
		if err != nil {
			return err
		}
	} else {
		err = UpdateKeyUsedQuota(keyID, quota)
		if err != nil {
			return err
		}
	}
	return nil
}

func PostConsumeTokenQuotaWithInfo(tokenId int, userId int, unlimitedQuota bool, quota int) error {
	return PostConsumeKeyQuotaWithInfo(tokenId, userId, unlimitedQuota, quota)
}
