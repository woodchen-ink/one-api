package relay

import (
	"time"

	"czloapi/common"
	"czloapi/model"

	"github.com/gin-gonic/gin"
)

func recordResourceRelayLog(c *gin.Context, content string, extraMetadata map[string]any) {
	requestTime := 0
	requestStartTimeValue := c.Request.Context().Value("requestStartTime")
	if requestStartTimeValue != nil {
		if requestStartTime, ok := requestStartTimeValue.(time.Time); ok {
			requestTime = int(time.Since(requestStartTime).Milliseconds())
		}
	}

	metadata := map[string]any{
		"request_path":  c.Request.URL.Path,
		"upstream_path": c.GetString("upstream_request_path"),
		"user_agent":    c.Request.UserAgent(),
	}
	for key, value := range extraMetadata {
		metadata[key] = value
	}

	model.RecordConsumeLog(
		c.Request.Context(),
		c.GetInt("id"),
		c.GetInt("channel_id"),
		c.GetInt("key_id"),
		0,
		0,
		c.GetString("new_model"),
		c.GetString("key_name"),
		0,
		content,
		requestTime,
		false,
		metadata,
		common.GetClientIP(c),
	)
}
