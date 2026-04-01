package controller

import (
	"bytes"
	"czloapi/model"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// bindChannelJSON 统一解析渠道请求，并兼容前端把可选整数字段传成字符串的旧格式。
func bindChannelJSON(c *gin.Context) (*model.Channel, error) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return nil, err
	}

	return decodeChannelJSONPayload(body)
}

// decodeChannelJSONPayload 解析渠道 JSON 请求体，重点兼容 proxy_pool_id 的空字符串场景。
func decodeChannelJSONPayload(body []byte) (*model.Channel, error) {
	if len(bytes.TrimSpace(body)) == 0 {
		return nil, io.EOF
	}

	payload := make(map[string]interface{})
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}

	if err := normalizeChannelJSONPayload(payload); err != nil {
		return nil, err
	}

	normalizedBody, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	channel := &model.Channel{}
	if err := json.Unmarshal(normalizedBody, channel); err != nil {
		return nil, err
	}

	return channel, nil
}

// normalizeChannelJSONPayload 将前端兼容格式归一后再交给结构体反序列化。
func normalizeChannelJSONPayload(payload map[string]interface{}) error {
	rawValue, ok := payload["proxy_pool_id"]
	if !ok {
		return nil
	}

	normalizedValue, err := normalizeOptionalIntValue(rawValue, "proxy_pool_id")
	if err != nil {
		return err
	}

	payload["proxy_pool_id"] = normalizedValue
	return nil
}

func normalizeOptionalIntValue(value interface{}, fieldName string) (interface{}, error) {
	switch typedValue := value.(type) {
	case nil:
		return nil, nil
	case string:
		trimmedValue := strings.TrimSpace(typedValue)
		if trimmedValue == "" {
			return nil, nil
		}

		parsedValue, err := strconv.Atoi(trimmedValue)
		if err != nil {
			return nil, fmt.Errorf("%s 必须是整数", fieldName)
		}
		return parsedValue, nil
	case float64:
		if math.Trunc(typedValue) != typedValue {
			return nil, fmt.Errorf("%s 必须是整数", fieldName)
		}
		return int(typedValue), nil
	default:
		return nil, fmt.Errorf("%s 类型无效", fieldName)
	}
}
