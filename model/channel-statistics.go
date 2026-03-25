package model

import (
	"czloapi/common"
	"time"
)

type ChannelUsageChannelInfo struct {
	Id           int    `json:"id"`
	Name         string `json:"name"`
	Type         int    `json:"type"`
	Status       int    `json:"status"`
	Group        string `json:"group"`
	Tag          string `json:"tag"`
	Models       string `json:"models"`
	UsedQuota    int64  `json:"used_quota"`
	ResponseTime int    `json:"response_time"`
}

type ChannelUsageSummary struct {
	RequestCount     int64 `json:"request_count" gorm:"column:request_count"`
	Quota            int64 `json:"quota" gorm:"column:quota"`
	PromptTokens     int64 `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int64 `json:"completion_tokens" gorm:"column:completion_tokens"`
	RequestTime      int64 `json:"request_time" gorm:"column:request_time"`
	ActiveDays       int64 `json:"active_days" gorm:"column:active_days"`
	LastUsedAt       int64 `json:"last_used_at"`
}

type ChannelUsageModelStatistic struct {
	ModelName        string `json:"model_name" gorm:"column:model_name"`
	RequestCount     int64  `json:"request_count" gorm:"column:request_count"`
	Quota            int64  `json:"quota" gorm:"column:quota"`
	PromptTokens     int64  `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int64  `json:"completion_tokens" gorm:"column:completion_tokens"`
	RequestTime      int64  `json:"request_time" gorm:"column:request_time"`
}

type ChannelUsageStatistics struct {
	Channel           ChannelUsageChannelInfo       `json:"channel"`
	Days              int                           `json:"days"`
	StartDate         string                        `json:"start_date"`
	EndDate           string                        `json:"end_date"`
	Summary           ChannelUsageSummary           `json:"summary"`
	Daily             []*LogStatistic               `json:"daily"`
	Models            []*ChannelUsageModelStatistic `json:"models"`
	RequestEndpoints  []*EndpointUsageStatistic     `json:"request_endpoints"`
	UpstreamEndpoints []*EndpointUsageStatistic     `json:"upstream_endpoints"`
}

func GetChannelUsageStatistics(channelId int, days int) (*ChannelUsageStatistics, error) {
	if days <= 0 {
		days = 30
	}
	if days > 365 {
		days = 365
	}

	channel, err := GetChannelById(channelId)
	if err != nil {
		return nil, err
	}

	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -days+1)
	startDateStr := startDate.Format("2006-01-02")
	endDateStr := endDate.Format("2006-01-02")

	result := &ChannelUsageStatistics{
		Channel: ChannelUsageChannelInfo{
			Id:           channel.Id,
			Name:         channel.Name,
			Type:         channel.Type,
			Status:       channel.Status,
			Group:        channel.Group,
			Tag:          channel.Tag,
			Models:       channel.Models,
			UsedQuota:    channel.UsedQuota,
			ResponseTime: channel.ResponseTime,
		},
		Days:              days,
		StartDate:         startDateStr,
		EndDate:           endDateStr,
		Daily:             make([]*LogStatistic, 0),
		Models:            make([]*ChannelUsageModelStatistic, 0),
		RequestEndpoints:  make([]*EndpointUsageStatistic, 0),
		UpstreamEndpoints: make([]*EndpointUsageStatistic, 0),
	}

	if err = DB.Table("statistics").
		Select(`
			COALESCE(SUM(request_count), 0) AS request_count,
			COALESCE(SUM(quota), 0) AS quota,
			COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
			COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
			COALESCE(SUM(request_time), 0) AS request_time,
			COUNT(DISTINCT date) AS active_days
		`).
		Where("channel_id = ? AND date BETWEEN ? AND ?", channelId, startDateStr, endDateStr).
		Scan(&result.Summary).Error; err != nil {
		return nil, err
	}

	if err = DB.Table("logs").
		Select("COALESCE(MAX(created_at), 0)").
		Where("channel_id = ? AND type = ?", channelId, LogTypeConsume).
		Scan(&result.Summary.LastUsedAt).Error; err != nil {
		return nil, err
	}

	dateExpr := "date"
	if common.UsingPostgreSQL {
		dateExpr = "TO_CHAR(date, 'YYYY-MM-DD')"
	} else if common.UsingSQLite {
		dateExpr = "strftime('%Y-%m-%d', date)"
	}

	if err = DB.Table("statistics").
		Select(dateExpr+" AS date, SUM(request_count) AS request_count, SUM(quota) AS quota, SUM(prompt_tokens) AS prompt_tokens, SUM(completion_tokens) AS completion_tokens, SUM(request_time) AS request_time").
		Where("channel_id = ? AND date BETWEEN ? AND ?", channelId, startDateStr, endDateStr).
		Group("date").
		Order("date ASC").
		Scan(&result.Daily).Error; err != nil {
		return nil, err
	}

	if err = DB.Table("statistics").
		Select("model_name, SUM(request_count) AS request_count, SUM(quota) AS quota, SUM(prompt_tokens) AS prompt_tokens, SUM(completion_tokens) AS completion_tokens, SUM(request_time) AS request_time").
		Where("channel_id = ? AND date BETWEEN ? AND ?", channelId, startDateStr, endDateStr).
		Group("model_name").
		Order("quota DESC").
		Order("request_count DESC").
		Order("model_name ASC").
		Scan(&result.Models).Error; err != nil {
		return nil, err
	}

	startTimestamp := startDate.Unix()
	endTimestamp := endDate.Add(24*time.Hour - time.Second).Unix()

	result.RequestEndpoints, err = GetTopEndpointStatistics(startTimestamp, endTimestamp, channelId, "request_path", 6)
	if err != nil {
		return nil, err
	}

	result.UpstreamEndpoints, err = GetTopEndpointStatistics(startTimestamp, endTimestamp, channelId, "upstream_path", 6)
	if err != nil {
		return nil, err
	}

	return result, nil
}
