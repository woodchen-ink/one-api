package openai

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/requester"
	"czloapi/types"

	"github.com/gorilla/websocket"
)

func (p *OpenAIProvider) CreateResponsesWS() (*websocket.Conn, requester.MessageHandler, *types.OpenAIErrorWithStatusCode) {
	url, errWithCode := p.GetSupportedAPIUri(config.RelayModeResponsesWS)
	if errWithCode != nil {
		return nil, nil, errWithCode
	}

	// 构建 WebSocket URL
	baseURL := strings.TrimSuffix(p.GetBaseURL(), "/")
	if strings.HasPrefix(baseURL, "https://") {
		baseURL = strings.Replace(baseURL, "https://", "wss://", 1)
	} else {
		baseURL = strings.Replace(baseURL, "http://", "ws://", 1)
	}
	fullRequestURL := fmt.Sprintf("%s%s", baseURL, url)

	// 设置请求头
	httpHeaders := make(http.Header)
	if p.IsAzure {
		httpHeaders.Set("api-key", p.Channel.Key)
	} else {
		httpHeaders.Set("Authorization", fmt.Sprintf("Bearer %s", p.Channel.Key))
	}

	wsRequester := requester.NewWSRequester(*p.Channel.Proxy)

	wsConn, err := wsRequester.NewRequest(fullRequestURL, httpHeaders)
	if err != nil {
		return nil, nil, common.ErrorWrapper(err, "ws_request_failed", http.StatusInternalServerError)
	}

	return wsConn, p.HandleResponsesWSMessage, nil
}

func (p *OpenAIProvider) HandleResponsesWSMessage(source requester.MessageSource, messageType int, message []byte) (bool, *types.UsageEvent, []byte, error) {
	// 用户消息直接透传
	if source == requester.UserMessage {
		return true, nil, nil, nil
	}

	// 确保消息类型为文本
	if messageType != websocket.TextMessage {
		return true, nil, nil, nil
	}

	// 解析事件
	var event types.Event
	if err := json.Unmarshal(message, &event); err != nil {
		return true, nil, nil, types.NewErrorEvent("", "json_unmarshal_failed", "invalid_event", err.Error())
	}

	// 处理错误事件
	if event.IsError() {
		logger.SysError("responses ws event error: " + event.Error())
		return false, nil, nil, &event
	}

	// 处理响应完成事件，提取 usage
	if event.Type == types.EventTypeResponseDone {
		if event.Response != nil && event.Response.Usage != nil {
			return true, event.Response.Usage, nil, nil
		}
	}

	return true, nil, nil, nil
}
