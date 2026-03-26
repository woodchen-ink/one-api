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
	p.responsesWSTools = nil
	p.responsesWSBilledKeys = make(map[string]bool)

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
	// 透传客户端的 OpenAI-Beta 头，由客户端决定协议版本
	if p.Context != nil && p.Context.Request != nil {
		if beta := p.Context.GetHeader("OpenAI-Beta"); beta != "" {
			httpHeaders.Set("OpenAI-Beta", beta)
		}
	}

	wsRequester := requester.NewWSRequester(*p.Channel.Proxy, true)

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

	// 二进制消息直接透传
	if messageType != websocket.TextMessage {
		return true, nil, nil, nil
	}

	// 使用轻量解析提取 type 字段，避免完整反序列化
	var envelope struct {
		Type     string                          `json:"type"`
		Response *types.OpenAIResponsesResponses `json:"response,omitempty"`
		Item     *types.ResponsesOutput          `json:"item,omitempty"`
		Error    *types.EventError               `json:"error,omitempty"`
	}
	if err := json.Unmarshal(message, &envelope); err != nil {
		return true, nil, nil, types.NewErrorEvent("", "json_unmarshal_failed", "invalid_event", err.Error())
	}

	// 处理错误事件
	if envelope.Type == types.EventTypeError {
		logger.SysError("responses ws event error: " + string(message))
		return false, nil, nil, types.NewErrorEvent("", "upstream_error", "upstream_error", string(message))
	}

	p.cacheResponsesWSTools(envelope.Response)

	if usage := p.buildResponsesWSItemUsage(envelope.Item); usage != nil {
		return true, usage, nil, nil
	}

	// 处理终端事件，提取 usage
	// 兼容 response.done / response.completed 等终态事件，避免不同实现下漏记 usage。
	switch envelope.Type {
	case types.EventTypeResponseDone, types.EventTypeResponseCompleted, types.EventTypeResponseIncomplete, types.EventTypeResponseFailed, types.EventTypeResponseCanceled, types.EventTypeResponseCancelled:
		if envelope.Response != nil && envelope.Response.Usage != nil {
			usage := envelope.Response.Usage.ToUsageEvent()
			for i := range envelope.Response.Output {
				usage.Merge(p.buildResponsesWSItemUsage(&envelope.Response.Output[i]))
			}
			return true, usage, nil, nil
		}
	}

	return true, nil, nil, nil
}

func (p *OpenAIProvider) cacheResponsesWSTools(response *types.OpenAIResponsesResponses) {
	if response != nil && len(response.Tools) > 0 {
		p.responsesWSTools = response.Tools
		return
	}

	if len(p.responsesWSTools) > 0 || p.Context == nil {
		return
	}

	value, exists := p.Context.Get(types.ResponsesWSRequestToolsContextKey)
	if !exists {
		return
	}

	tools, ok := value.([]types.ResponsesTools)
	if !ok || len(tools) == 0 {
		return
	}

	p.responsesWSTools = tools
}

func (p *OpenAIProvider) buildResponsesWSItemUsage(item *types.ResponsesOutput) *types.UsageEvent {
	if item == nil {
		return nil
	}

	serviceType := p.responsesWSItemServiceType(item)
	if serviceType == "" {
		return nil
	}

	dedupeID := p.responsesWSItemDedupeID(item)
	if dedupeID != "" {
		if p.responsesWSBilledKeys == nil {
			p.responsesWSBilledKeys = make(map[string]bool)
		}
		billingKey := serviceType + "|" + dedupeID
		if p.responsesWSBilledKeys[billingKey] {
			return nil
		}
		p.responsesWSBilledKeys[billingKey] = true
	}

	usage := &types.UsageEvent{}
	applyResponsesOutputExtraBilling(usage, p.responsesWSTools, item)
	if len(usage.ExtraBilling) == 0 {
		return nil
	}

	return usage
}

func (p *OpenAIProvider) responsesWSItemServiceType(item *types.ResponsesOutput) string {
	if item == nil {
		return ""
	}

	switch item.Type {
	case types.InputTypeWebSearchCall:
		return types.APITollTypeWebSearchPreview
	case types.InputTypeCodeInterpreterCall:
		return types.APITollTypeCodeInterpreter
	case types.InputTypeFileSearchCall:
		return types.APITollTypeFileSearch
	case types.InputTypeImageGenerationCall:
		return types.APITollTypeImageGeneration
	default:
		return ""
	}
}

func (p *OpenAIProvider) responsesWSItemDedupeID(item *types.ResponsesOutput) string {
	if item == nil {
		return ""
	}

	if item.Type == types.InputTypeCodeInterpreterCall && item.ContainerID != "" {
		return item.ContainerID
	}
	if item.ID != "" {
		return item.ID
	}
	if item.CallID != "" {
		return item.CallID
	}

	return ""
}
