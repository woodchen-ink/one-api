package model

import (
	"crypto/md5"
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/utils"
	"encoding/hex"
	"slices"
	"strings"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Channel struct {
	Id                 int     `json:"id"`
	Type               int     `json:"type" form:"type" gorm:"default:0"`
	Key                string  `json:"key" form:"key" gorm:"type:text"`
	Status             int     `json:"status" form:"status" gorm:"default:1"`
	Name               string  `json:"name" form:"name" gorm:"index"`
	Weight             *uint   `json:"weight" gorm:"default:1"`
	CreatedTime        int64   `json:"created_time" gorm:"bigint"`
	TestTime           int64   `json:"test_time" gorm:"bigint"`
	ResponseTime       int     `json:"response_time"` // in milliseconds
	BaseURL            *string `json:"base_url" gorm:"column:base_url;default:''"`
	Other              string  `json:"other" form:"other"`
	Balance            float64 `json:"balance"` // in USD
	BalanceUpdatedTime int64   `json:"balance_updated_time" gorm:"bigint"`
	Models             string  `json:"models" form:"models"`
	Group              string  `json:"group" form:"group" gorm:"type:varchar(1024);default:'default'"`
	Tag                string  `json:"tag" form:"tag" gorm:"type:varchar(32);default:''"`
	UsedQuota          int64   `json:"used_quota" gorm:"bigint;default:0"`
	ModelMapping       *string `json:"model_mapping" gorm:"type:text"`
	UserAgentMode      string  `json:"user_agent_mode" form:"user_agent_mode" gorm:"type:varchar(32);default:'default'"`
	UserAgentPreset    string  `json:"user_agent_preset" form:"user_agent_preset" gorm:"type:varchar(64);default:''"`
	Priority           *int64  `json:"priority" gorm:"bigint;default:0"`
	Proxy              *string `json:"proxy" gorm:"type:varchar(255);default:''"`
	ProxyPoolID        *int    `json:"proxy_pool_id" form:"proxy_pool_id" gorm:"column:proxy_pool_id"`
	TestModel          string  `json:"test_model" form:"test_model" gorm:"type:varchar(50);default:''"`
	OnlyChat           bool    `json:"only_chat" form:"only_chat" gorm:"default:false"`
	PreCost            int     `json:"pre_cost" form:"pre_cost" gorm:"default:1"`
	CompatibleResponse bool    `json:"compatible_response" gorm:"default:false"`
	AllowExtraBody     bool    `json:"allow_extra_body" form:"allow_extra_body" gorm:"default:false"`
	ResponsesWS        bool    `json:"responses_ws" form:"responses_ws" gorm:"default:false"`
	RetryTimes         *int    `json:"retry_times" gorm:"default:0"`

	DisabledStream *datatypes.JSONSlice[string] `json:"disabled_stream,omitempty" gorm:"type:json"`

	Plugin    *datatypes.JSONType[PluginType] `json:"plugin" form:"plugin" gorm:"type:json"`
	ProxyPool *IPProxy                        `json:"proxy_pool,omitempty" gorm:"foreignKey:ProxyPoolID;references:Id;-:migration"`
	DeletedAt gorm.DeletedAt                  `json:"-" gorm:"index"`
}

func (c *Channel) AllowStream(modelName string) bool {
	if c.DisabledStream == nil {
		return true
	}

	return !slices.Contains(*c.DisabledStream, modelName)
}

func (c *Channel) GetRetryTimes() int {
	if c.RetryTimes == nil {
		return 0
	}
	return *c.RetryTimes
}

type PluginType map[string]map[string]interface{}

var allowedChannelOrderFields = map[string]bool{
	"id":            true,
	"name":          true,
	"group":         true,
	"type":          true,
	"status":        true,
	"response_time": true,
	"balance":       true,
	"priority":      true,
	"weight":        true,
}

type SearchChannelsParams struct {
	Channel
	PaginationParams
	FilterTag int `json:"filter_tag" form:"filter_tag"`
}

func GetChannelsList(params *SearchChannelsParams) (*DataResult[Channel], error) {
	var channels []*Channel

	db := DB.Omit("key").Preload("ProxyPool")
	tagDB := DB.Model(&Channel{}).Select("Max(id) as id").Where("tag != ''").Group("tag")

	if params.Type != 0 {
		db = db.Where("type = ?", params.Type)
		tagDB = tagDB.Where("type = ?", params.Type)
	}

	if params.Status != 0 {
		db = db.Where("status = ?", params.Status)
		tagDB = tagDB.Where("status = ?", params.Status)
	}

	if params.Name != "" {
		db = db.Where("name LIKE ?", "%"+params.Name+"%")
		tagDB = tagDB.Where("tag LIKE ?", "%"+params.Name+"%")
	}

	if params.Group != "" {
		groupKey := quotePostgresField("group")
		db = db.Where("( "+groupKey+" LIKE ? OR "+groupKey+" LIKE ? OR "+groupKey+" LIKE ? OR "+groupKey+" = ?)",
			"%,"+params.Group+",%", params.Group+",%", "%,"+params.Group, params.Group)
		tagDB = tagDB.Where("( "+groupKey+" LIKE ? OR "+groupKey+" LIKE ? OR "+groupKey+" LIKE ? OR "+groupKey+" = ?)",
			"%,"+params.Group+",%", params.Group+",%", "%,"+params.Group, params.Group)
	}

	if params.Models != "" {
		modelValues := splitBatchChannelModels(params.Models)
		if len(modelValues) > 0 {
			query, args := buildChannelModelsLikeQuery(modelValues)
			db = db.Where(query, args...)
			tagDB = tagDB.Where(query, args...)
		}
	}

	if params.Other != "" {
		db = db.Where("other LIKE ?", params.Other+"%")
		tagDB = tagDB.Where("other LIKE ?", params.Other+"%")
	}

	if params.Key != "" {
		db = db.Where(quotePostgresField("key")+" = ?", params.Key)
		tagDB = tagDB.Where(quotePostgresField("key")+" = ?", params.Key)
	}

	if params.TestModel != "" {
		db = db.Where("test_model LIKE ?", params.TestModel+"%")
		tagDB = tagDB.Where("test_model LIKE ?", params.TestModel+"%")
	}

	if params.Tag != "" {
		db = db.Where("tag = ?", params.Tag)
		tagDB = tagDB.Where("tag = ?", params.Tag)
	}

	switch params.FilterTag {
	case 1:
		db = db.Where("tag = ''")
	case 2:
		db = db.Where("id IN (?)", tagDB)
	default:
		db = db.Where("tag = '' OR id IN (?)", tagDB)
	}

	// 渠道默认排序：先按类型，同类型按优先级降序，再按 ID 倒序保证顺序稳定
	if params.Order == "" {
		params.Order = "type,-priority,-id"
	}

	return PaginateAndOrder(db, &params.PaginationParams, &channels, allowedChannelOrderFields)
}

func GetAllChannels() ([]*Channel, error) {
	var channels []*Channel
	err := DB.Preload("ProxyPool").Order("id desc").Find(&channels).Error
	return channels, err
}

func GetChannelById(id int) (*Channel, error) {
	channel := Channel{Id: id}
	err := DB.Preload("ProxyPool").First(&channel, "id = ?", id).Error

	return &channel, err
}

func GetChannelsByTag(tag string) ([]*Channel, error) {
	var channels []*Channel
	err := DB.Preload("ProxyPool").Where("tag = ?", tag).Find(&channels).Error
	return channels, err
}

func DeleteChannelTag(channelId int) error {
	err := DB.Model(&Channel{}).Where("id = ?", channelId).Update("tag", "").Error
	return err
}

func BatchDeleteChannel(ids []int) (int64, error) {
	result := DB.Where("id IN ?", ids).Delete(&Channel{})
	return result.RowsAffected, result.Error
}

func BatchInsertChannels(channels []Channel) error {
	err := DB.Omit("UsedQuota").Create(&channels).Error
	if err != nil {
		return err
	}

	ChannelGroup.Load()
	return nil
}

type BatchChannelsParams struct {
	Value string `json:"value" form:"value" binding:"required"`
	Ids   []int  `json:"ids" form:"ids" binding:"required"`
}

func splitBatchChannelModels(value string) []string {
	models := make([]string, 0)
	seen := make(map[string]struct{})

	for _, item := range strings.FieldsFunc(value, func(r rune) bool {
		switch r {
		case ',', '，', ';', '；', '\n', '\r':
			return true
		default:
			return false
		}
	}) {
		model := strings.TrimSpace(item)
		if model == "" {
			continue
		}
		if _, ok := seen[model]; ok {
			continue
		}
		seen[model] = struct{}{}
		models = append(models, model)
	}

	return models
}

func buildChannelModelsLikeQuery(models []string) (string, []interface{}) {
	if len(models) == 0 {
		return "", nil
	}

	conditions := make([]string, 0, len(models))
	args := make([]interface{}, 0, len(models))
	for _, model := range models {
		conditions = append(conditions, "models LIKE ?")
		args = append(args, "%"+model+"%")
	}

	return strings.Join(conditions, " OR "), args
}

func removeChannelModels(source string, targets []string) (string, bool) {
	models := splitBatchChannelModels(source)
	if len(models) == 0 || len(targets) == 0 {
		return source, false
	}

	targetSet := make(map[string]struct{}, len(targets))
	for _, target := range targets {
		targetSet[target] = struct{}{}
	}

	filtered := make([]string, 0, len(models))
	changed := false
	for _, model := range models {
		if _, ok := targetSet[model]; ok {
			changed = true
			continue
		}
		filtered = append(filtered, model)
	}

	if !changed {
		return source, false
	}

	return strings.Join(filtered, ","), true
}

func BatchUpdateChannelsAzureApi(params *BatchChannelsParams) (int64, error) {
	db := DB.Model(&Channel{}).Where("id IN ?", params.Ids).Update("other", params.Value)
	if db.Error != nil {
		return 0, db.Error
	}

	if db.RowsAffected > 0 {
		ChannelGroup.Load()
	}
	return db.RowsAffected, nil
}

func BatchDelModelChannels(params *BatchChannelsParams) (int64, error) {
	var count int64
	modelValues := splitBatchChannelModels(params.Value)
	if len(modelValues) == 0 {
		return 0, nil
	}

	var channels []*Channel
	err := DB.Select("id, models, "+quotePostgresField("group")).Find(&channels, "id IN ?", params.Ids).Error
	if err != nil {
		return 0, err
	}

	for _, channel := range channels {
		updatedModels, changed := removeChannelModels(channel.Models, modelValues)
		if !changed {
			continue
		}

		channel.Models = updatedModels
		err = channel.UpdateRaw(false)
		if err != nil {
			return count, err
		}
		count++
	}

	if count > 0 {
		ChannelGroup.Load()
	}

	return count, nil
}

// NormalizeProxyConfig 统一清洗渠道上的代理配置字段。
func (c *Channel) NormalizeProxyConfig() error {
	// 渠道编辑表单只需要提交 proxy_pool_id，不应携带旧的关联对象回写数据库。
	c.ProxyPool = nil
	c.ProxyPoolID = NormalizeChannelProxyPoolID(c.ProxyPoolID)
	if c.Proxy != nil {
		proxyAddr := strings.TrimSpace(*c.Proxy)
		c.Proxy = &proxyAddr
	}

	return EnsureIPProxyExists(c.ProxyPoolID)
}

// SetProxy 将渠道上的代理池配置解析成实际代理地址，供后续请求直接使用。
func (c *Channel) SetProxy() error {
	proxyValue := ""
	if c.Proxy != nil {
		proxyValue = *c.Proxy
	}

	resolvedProxy, err := ResolveChannelProxy(proxyValue, c.ProxyPoolID, c.ProxyPool)
	if err != nil {
		return err
	}

	if resolvedProxy == "" {
		if c.Proxy == nil {
			c.Proxy = &resolvedProxy
		} else {
			*c.Proxy = ""
		}
		return nil
	}

	if strings.Contains(resolvedProxy, "%s") {
		md5Str := md5.Sum([]byte(c.Key))
		idStr := hex.EncodeToString(md5Str[:])
		resolvedProxy = strings.Replace(resolvedProxy, "%s", idStr, 1)
	}

	if c.Proxy == nil {
		c.Proxy = &resolvedProxy
	} else {
		*c.Proxy = resolvedProxy
	}

	return nil
}

func (channel *Channel) GetPriority() int64 {
	if channel.Priority == nil {
		return 0
	}
	return *channel.Priority
}

func (channel *Channel) GetBaseURL() string {
	if channel.BaseURL == nil {
		return ""
	}
	return *channel.BaseURL
}

func (channel *Channel) GetModelMapping() string {
	if channel.ModelMapping == nil {
		return ""
	}
	return *channel.ModelMapping
}

func (channel *Channel) Insert() error {
	err := DB.Omit("UsedQuota").Create(channel).Error
	if err == nil {
		ChannelGroup.Load()
	}

	return err
}

func (channel *Channel) Update(overwrite bool) error {

	err := channel.UpdateRaw(overwrite)

	if err == nil {
		ChannelGroup.Load()
	}

	return err
}

func (channel *Channel) UpdateRaw(overwrite bool) error {
	var err error

	if overwrite {
		err = DB.Model(channel).Select("*").Omit("UsedQuota").Updates(channel).Error
	} else {
		err = DB.Model(channel).Omit("UsedQuota").Updates(channel).Error
	}
	if err != nil {
		return err
	}
	DB.Model(channel).First(channel, "id = ?", channel.Id)
	return err
}

func (channel *Channel) UpdateResponseTime(responseTime int64) {
	err := DB.Model(channel).Select("response_time", "test_time").Updates(Channel{
		TestTime:     utils.GetTimestamp(),
		ResponseTime: int(responseTime),
	}).Error
	if err != nil {
		logger.SysError("failed to update response time: " + err.Error())
	}
}

func (channel *Channel) UpdateBalance(balance float64) {
	err := DB.Model(channel).Select("balance_updated_time", "balance").Updates(Channel{
		BalanceUpdatedTime: utils.GetTimestamp(),
		Balance:            balance,
	}).Error
	if err != nil {
		logger.SysError("failed to update balance: " + err.Error())
	}
}

func (channel *Channel) Delete() error {
	err := DB.Delete(channel).Error
	if err == nil {
		ChannelGroup.Load()
	}
	return err
}

func (channel *Channel) StatusToStr() string {
	switch channel.Status {
	case config.ChannelStatusEnabled:
		return "启用"
	case config.ChannelStatusAutoDisabled:
		return "自动禁用"
	case config.ChannelStatusManuallyDisabled:
		return "手动禁用"
	}

	return "禁用"
}

func UpdateChannelStatusById(id int, status int) {
	tx := DB.Begin()
	err := tx.Model(&Channel{}).Where("id = ?", id).Update("status", status).Error
	if err != nil {
		logger.SysError("failed to update channel status: " + err.Error())
		tx.Rollback()
		return
	}

	tx.Commit()

	go ChannelGroup.ChangeStatus(id, status == config.ChannelStatusEnabled)
}

func UpdateChannelUsedQuota(id int, quota int) {
	if config.BatchUpdateEnabled {
		addNewRecord(BatchUpdateTypeChannelUsedQuota, id, quota)
		return
	}
	updateChannelUsedQuota(id, quota)
}

func updateChannelUsedQuota(id int, quota int) {
	err := DB.Model(&Channel{}).Where("id = ?", id).Update("used_quota", gorm.Expr("used_quota + ?", quota)).Error
	if err != nil {
		logger.SysError("failed to update channel used quota: " + err.Error())
	}
}

func DeleteDisabledChannel() (int64, error) {
	result := DB.Where("status = ? or status = ?", config.ChannelStatusAutoDisabled, config.ChannelStatusManuallyDisabled).Delete(&Channel{})
	return result.RowsAffected, result.Error
}

type ChannelStatistics struct {
	TotalChannels int `json:"total_channels"`
	Status        int `json:"status"`
}

func GetStatisticsChannel() (statistics []*ChannelStatistics, err error) {
	err = DB.Model(&Channel{}).Select("count(*) as total_channels, status").Group("status").Scan(&statistics).Error
	return statistics, err
}
