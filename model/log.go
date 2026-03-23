package model

import (
	"context"
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/utils"
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Log struct {
	Id               int                                `json:"id"`
	UserId           int                                `json:"user_id" gorm:"index"`
	CreatedAt        int64                              `json:"created_at" gorm:"bigint;index:idx_created_at_type"`
	Type             int                                `json:"type" gorm:"index:idx_created_at_type"`
	Content          string                             `json:"content"`
	Username         string                             `json:"username" gorm:"index:index_username_model_name,priority:2;default:''"`
	TokenName        string                             `json:"token_name" gorm:"index;default:''"`
	TokenId          int                                `json:"token_id" gorm:"index;default:0"`
	ModelName        string                             `json:"model_name" gorm:"index;index:index_username_model_name,priority:1;default:''"`
	Quota            int                                `json:"quota" gorm:"default:0"`
	PromptTokens     int                                `json:"prompt_tokens" gorm:"default:0"`
	CompletionTokens int                                `json:"completion_tokens" gorm:"default:0"`
	ChannelId        int                                `json:"channel_id" gorm:"index"`
	RequestTime      int                                `json:"request_time" gorm:"default:0"`
	IsStream         bool                               `json:"is_stream" gorm:"default:false"`
	SourceIp         string                             `json:"source_ip" gorm:"default:''"`
	Metadata         datatypes.JSONType[map[string]any] `json:"metadata" gorm:"type:json"`

	Channel *Channel `json:"channel" gorm:"foreignKey:ChannelId;references:Id;-:migration"`
}

const (
	LogTypeUnknown = iota
	LogTypeTopup
	LogTypeConsume
	LogTypeManage
	LogTypeSystem
)

func RecordQuotaLog(userId int, logType int, quota int, ip string, content string) {
	if logType == LogTypeConsume && !config.LogConsumeEnabled {
		return
	}
	username, _ := CacheGetUsername(userId)
	log := &Log{
		UserId:    userId,
		Username:  username,
		Quota:     quota,
		CreatedAt: utils.GetTimestamp(),
		Type:      logType,
		SourceIp:  ip,
		Content:   content,
	}
	err := DB.Create(log).Error
	if err != nil {
		logger.SysError("failed to record log: " + err.Error())
	}
}

func RecordLog(userId int, logType int, content string) {
	if logType == LogTypeConsume && !config.LogConsumeEnabled {
		return
	}
	username, _ := CacheGetUsername(userId)

	log := &Log{
		UserId:    userId,
		Username:  username,
		CreatedAt: utils.GetTimestamp(),
		Type:      logType,
		Content:   content,
	}
	err := DB.Create(log).Error
	if err != nil {
		logger.SysError("failed to record log: " + err.Error())
	}
}

func RecordConsumeLog(
	ctx context.Context,
	userId int,
	channelId int,
	tokenId int,
	promptTokens int,
	completionTokens int,
	modelName string,
	tokenName string,
	quota int,
	content string,
	requestTime int,
	isStream bool,
	metadata map[string]any,
	sourceIp string) {
	logger.LogInfo(ctx, fmt.Sprintf("record consume log: userId=%d, channelId=%d, promptTokens=%d, completionTokens=%d, modelName=%s, tokenName=%s, quota=%d, content=%s ,sourceIp=%s", userId, channelId, promptTokens, completionTokens, modelName, tokenName, quota, content, sourceIp))
	if !config.LogConsumeEnabled {
		return
	}

	username, _ := CacheGetUsername(userId)

	log := &Log{
		UserId:           userId,
		Username:         username,
		CreatedAt:        utils.GetTimestamp(),
		Type:             LogTypeConsume,
		Content:          content,
		TokenId:          tokenId,
		PromptTokens:     promptTokens,
		CompletionTokens: completionTokens,
		TokenName:        tokenName,
		ModelName:        modelName,
		Quota:            quota,
		ChannelId:        channelId,
		RequestTime:      requestTime,
		IsStream:         isStream,
		SourceIp:         sourceIp,
	}

	if metadata != nil {
		log.Metadata = datatypes.NewJSONType(metadata)
	}

	if config.BatchUpdateEnabled {
		AddLogToBatch(log)
	} else {
		err := DB.Create(log).Error
		if err != nil {
			logger.LogError(ctx, "failed to record log: "+err.Error())
		}
	}
}

type LogsListParams struct {
	PaginationParams
	LogType        int    `form:"log_type"`
	StartTimestamp int64  `form:"start_timestamp"`
	EndTimestamp   int64  `form:"end_timestamp"`
	ModelName      string `form:"model_name"`
	Username       string `form:"username"`
	TokenName      string `form:"token_name"`
	ChannelId      int    `form:"channel_id"`
	SourceIp       string `form:"source_ip"`
}

var allowedLogsOrderFields = map[string]bool{
	"created_at": true,
	"channel_id": true,
	"user_id":    true,
	"token_name": true,
	"model_name": true,
	"type":       true,
	"source_ip":  true,
}

func GetLogsList(params *LogsListParams) (*DataResult[Log], error) {
	var tx *gorm.DB
	var logs []*Log

	tx = DB.Preload("Channel", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, name")
	})

	if params.LogType != LogTypeUnknown {
		tx = tx.Where("type = ?", params.LogType)
	}
	if params.ModelName != "" {
		tx = tx.Where("model_name = ?", params.ModelName)
	}
	if params.Username != "" {
		tx = tx.Where("username = ?", params.Username)
	}
	if params.TokenName != "" {
		tx = tx.Where("token_name = ?", params.TokenName)
	}
	if params.StartTimestamp != 0 {
		tx = tx.Where("created_at >= ?", params.StartTimestamp)
	}
	if params.EndTimestamp != 0 {
		tx = tx.Where("created_at <= ?", params.EndTimestamp)
	}
	if params.ChannelId != 0 {
		tx = tx.Where("channel_id = ?", params.ChannelId)
	}
	if params.SourceIp != "" {
		tx = tx.Where("source_ip = ?", params.SourceIp)
	}

	return PaginateAndOrder[Log](tx, &params.PaginationParams, &logs, allowedLogsOrderFields)
}

func GetUserLogsList(userId int, params *LogsListParams) (*DataResult[Log], error) {
	var logs []*Log

	tx := DB.Where("user_id = ?", userId).Omit("id", "source_ip")

	if params.LogType != LogTypeUnknown {
		tx = tx.Where("type = ?", params.LogType)
	}
	if params.ModelName != "" {
		tx = tx.Where("model_name = ?", params.ModelName)
	}
	if params.TokenName != "" {
		tx = tx.Where("token_name = ?", params.TokenName)
	}
	if params.StartTimestamp != 0 {
		tx = tx.Where("created_at >= ?", params.StartTimestamp)
	}
	if params.EndTimestamp != 0 {
		tx = tx.Where("created_at <= ?", params.EndTimestamp)
	}

	return PaginateAndOrder[Log](tx, &params.PaginationParams, &logs, allowedLogsOrderFields)
}

func SearchAllLogs(keyword string) (logs []*Log, err error) {
	err = DB.Where("type = ? or content LIKE ?", keyword, keyword+"%").Order("id desc").Limit(config.MaxRecentItems).Find(&logs).Error
	return logs, err
}

func SearchUserLogs(userId int, keyword string) (logs []*Log, err error) {
	err = DB.Where("user_id = ? and type = ?", userId, keyword).Order("id desc").Limit(config.MaxRecentItems).Omit("id").Find(&logs).Error
	return logs, err
}

func SumUsedQuota(startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, channel int) (quota int) {
	tx := DB.Table("logs").Select(assembleSumSelectStr("quota"))
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	tx.Where("type = ?", LogTypeConsume).Scan(&quota)
	return quota
}

func DeleteOldLog(targetTimestamp int64) (int64, error) {
	result := DB.Where("type = ? AND created_at < ?", LogTypeConsume, targetTimestamp).Delete(&Log{})
	return result.RowsAffected, result.Error
}

type LogStatistic struct {
	Date             string `gorm:"column:date"`
	RequestCount     int64  `gorm:"column:request_count"`
	Quota            int64  `gorm:"column:quota"`
	PromptTokens     int64  `gorm:"column:prompt_tokens"`
	CompletionTokens int64  `gorm:"column:completion_tokens"`
	RequestTime      int64  `gorm:"column:request_time"`
}

type LogStatisticGroupModel struct {
	LogStatistic
	ModelName string `gorm:"column:model_name"`
}

type LogStatisticGroupChannel struct {
	LogStatistic
	Channel string `gorm:"column:channel"`
}

type TokenUsageTodayStatistic struct {
	TokenId          int    `json:"token_id" gorm:"column:token_id"`
	TokenName        string `json:"token_name" gorm:"column:token_name"`
	RequestCount     int64  `json:"request_count" gorm:"column:request_count"`
	Quota            int64  `json:"quota" gorm:"column:quota"`
	PromptTokens     int64  `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int64  `json:"completion_tokens" gorm:"column:completion_tokens"`
	LastUsedAt       int64  `json:"last_used_at" gorm:"column:last_used_at"`
}

func GetUserTokenUsageToday(userId int, startTimestamp int64, endTimestamp int64) (statistics []*TokenUsageTodayStatistic, err error) {
	err = DB.Table("logs AS l").
		Select(`
			l.token_id,
			MAX(CASE WHEN t.name IS NOT NULL AND t.name <> '' THEN t.name ELSE l.token_name END) AS token_name,
			COUNT(1) AS request_count,
			SUM(l.quota) AS quota,
			SUM(l.prompt_tokens) AS prompt_tokens,
			SUM(l.completion_tokens) AS completion_tokens,
			MAX(l.created_at) AS last_used_at`).
		Joins("LEFT JOIN tokens AS t ON t.id = l.token_id").
		Where("l.user_id = ? AND l.type = ? AND l.created_at >= ? AND l.created_at <= ? AND l.token_id > 0",
			userId,
			LogTypeConsume,
			startTimestamp,
			endTimestamp,
		).
		Group("l.token_id").
		Order("quota DESC").
		Order("request_count DESC").
		Order("l.token_id ASC").
		Scan(&statistics).Error
	return statistics, err
}
