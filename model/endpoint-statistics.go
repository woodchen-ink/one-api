package model

import (
	"czloapi/common"
	"fmt"
	"strings"
)

type EndpointUsageStatistic struct {
	Endpoint         string `json:"endpoint" gorm:"column:endpoint"`
	RequestCount     int64  `json:"request_count" gorm:"column:request_count"`
	Quota            int64  `json:"quota" gorm:"column:quota"`
	PromptTokens     int64  `json:"prompt_tokens" gorm:"column:prompt_tokens"`
	CompletionTokens int64  `json:"completion_tokens" gorm:"column:completion_tokens"`
	RequestTime      int64  `json:"request_time" gorm:"column:request_time"`
	LastUsedAt       int64  `json:"last_used_at" gorm:"column:last_used_at"`
}

type EndpointStatisticsDetail struct {
	Entry    []*EndpointUsageStatistic `json:"entry"`
	Upstream []*EndpointUsageStatistic `json:"upstream"`
}

func getLogMetadataTextExpr(key string) string {
	switch {
	case common.UsingPostgreSQL:
		return fmt.Sprintf("metadata ->> '%s'", key)
	case common.UsingSQLite:
		return fmt.Sprintf("json_extract(metadata, '$.%s')", key)
	default:
		return fmt.Sprintf("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.%s'))", key)
	}
}

func getLogDateExpr() string {
	switch {
	case common.UsingPostgreSQL:
		return "TO_CHAR(TO_TIMESTAMP(created_at), 'YYYY-MM-DD')"
	case common.UsingSQLite:
		return "strftime('%Y-%m-%d', datetime(created_at, 'unixepoch', '+8 hours'))"
	default:
		return "DATE_FORMAT(FROM_UNIXTIME(created_at), '%Y-%m-%d')"
	}
}

func GetEndpointStatisticsByPeriod(startTimestamp, endTimestamp int64, groupType string, userID int) ([]*LogStatisticGroupChannel, error) {
	metadataKey := ""
	switch groupType {
	case "request_path":
		metadataKey = "request_path"
	case "upstream_path":
		metadataKey = "upstream_path"
	default:
		return []*LogStatisticGroupChannel{}, nil
	}

	endpointExpr := getLogMetadataTextExpr(metadataKey)
	dateExpr := getLogDateExpr()
	args := []interface{}{LogTypeConsume, startTimestamp, endTimestamp}
	var whereClause strings.Builder
	whereClause.WriteString("WHERE type = ? AND created_at >= ? AND created_at <= ?")
	if userID > 0 {
		whereClause.WriteString(" AND user_id = ?")
		args = append(args, userID)
	}
	whereClause.WriteString(" AND ")
	whereClause.WriteString(endpointExpr)
	whereClause.WriteString(" IS NOT NULL AND ")
	whereClause.WriteString(endpointExpr)
	whereClause.WriteString(" <> ''")

	sql := fmt.Sprintf(`
		SELECT
			%s AS date,
			COUNT(1) AS request_count,
			SUM(quota) AS quota,
			SUM(prompt_tokens) AS prompt_tokens,
			SUM(completion_tokens) AS completion_tokens,
			SUM(request_time) AS request_time,
			%s AS channel
		FROM logs
		%s
		GROUP BY date, %s
		ORDER BY date, %s
	`, dateExpr, endpointExpr, whereClause.String(), endpointExpr, endpointExpr)

	var statistics []*LogStatisticGroupChannel
	err := DB.Raw(sql, args...).Scan(&statistics).Error
	if err != nil {
		return nil, err
	}
	return statistics, nil
}

func GetTopEndpointStatistics(startTimestamp, endTimestamp int64, channelID int, metadataKey string, limit int) ([]*EndpointUsageStatistic, error) {
	if limit <= 0 {
		limit = 5
	}

	endpointExpr := getLogMetadataTextExpr(metadataKey)
	tx := DB.Table("logs").
		Select(endpointExpr+" AS endpoint, COUNT(1) AS request_count, COALESCE(SUM(quota), 0) AS quota, COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens, COALESCE(SUM(completion_tokens), 0) AS completion_tokens, COALESCE(SUM(request_time), 0) AS request_time, COALESCE(MAX(created_at), 0) AS last_used_at").
		Where("type = ? AND created_at >= ? AND created_at <= ?", LogTypeConsume, startTimestamp, endTimestamp).
		Where(endpointExpr + " IS NOT NULL AND " + endpointExpr + " <> ''")

	if channelID > 0 {
		tx = tx.Where("channel_id = ?", channelID)
	}

	var statistics []*EndpointUsageStatistic
	err := tx.
		Group(endpointExpr).
		Order("request_count DESC").
		Order("quota DESC").
		Order("endpoint ASC").
		Limit(limit).
		Scan(&statistics).Error
	if err != nil {
		return nil, err
	}
	return statistics, nil
}

func GetEndpointStatisticsDetail(limit int) (*EndpointStatisticsDetail, error) {
	if limit <= 0 {
		limit = 5
	}

	entry, err := GetTopEndpointStatistics(0, 1<<62, 0, "request_path", limit)
	if err != nil {
		return nil, err
	}

	upstream, err := GetTopEndpointStatistics(0, 1<<62, 0, "upstream_path", limit)
	if err != nil {
		return nil, err
	}

	return &EndpointStatisticsDetail{
		Entry:    entry,
		Upstream: upstream,
	}, nil
}
