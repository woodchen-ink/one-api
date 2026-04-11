package openai

import (
	"bytes"
	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/requester"
	"czloapi/model"
	"czloapi/types"
	"encoding/json"
	"strings"
)

func (p *OpenAIProvider) CreateResponses(request *types.OpenAIResponsesRequest) (openaiResponse *types.OpenAIResponsesResponses, errWithCode *types.OpenAIErrorWithStatusCode) {
	req, errWithCode := p.GetRequestTextBody(config.RelayModeResponses, request.Model, request)
	if errWithCode != nil {
		return nil, errWithCode
	}
	defer req.Body.Close()

	response := &types.OpenAIResponsesResponses{}
	// 发送请求
	_, errWithCode = p.Requester.SendRequest(req, response, false)
	if errWithCode != nil {
		return nil, errWithCode
	}

	if response.Usage == nil || response.Usage.OutputTokens == 0 {
		response.Usage = &types.ResponsesUsage{
			InputTokens:  p.Usage.PromptTokens,
			OutputTokens: 0,
			TotalTokens:  0,
		}
		// // 那么需要计算
		response.Usage.OutputTokens = common.CountTokenText(response.GetContent(), request.Model)
		response.Usage.TotalTokens = response.Usage.InputTokens + response.Usage.OutputTokens
	}

	*p.Usage = *response.Usage.ToOpenAIUsage()
	model.StoreResponseResourceBinding(response.ID, p.Channel.Id)
	model.StoreConversationResourceBinding(response.ConversationID, p.Channel.Id)

	getResponsesExtraBilling(response, p.Usage)

	return response, nil
}

func (p *OpenAIProvider) CreateResponsesStream(request *types.OpenAIResponsesRequest) (requester.StreamReaderInterface[string], *types.OpenAIErrorWithStatusCode) {
	req, errWithCode := p.GetRequestTextBody(config.RelayModeResponses, request.Model, request)
	if errWithCode != nil {
		return nil, errWithCode
	}
	defer req.Body.Close()

	// 发送请求
	resp, errWithCode := p.Requester.SendRequestRaw(req)
	if errWithCode != nil {
		return nil, errWithCode
	}

	chatHandler := newOpenAIResponsesStreamHandler(p.Usage, request.Model, p.Channel.Id)

	if request.ConvertChat {
		return requester.RequestStream(p.Requester, resp, chatHandler.HandlerChatStream)
	}

	return requester.RequestNoTrimStream(p.Requester, resp, chatHandler.HandlerResponsesStream)
}

func (h *OpenAIResponsesStreamHandler) HandlerResponsesStream(rawLine *[]byte, dataChan chan string, errChan chan error) {
	rawStr := string(*rawLine)

	// 如果rawLine 前缀不为data:，则直接返回
	if !strings.HasPrefix(rawStr, h.Prefix) {
		dataChan <- rawStr
		return
	}

	noSpaceLine := bytes.TrimSpace(*rawLine)
	if strings.HasPrefix(string(noSpaceLine), "data: ") {
		// 去除前缀
		noSpaceLine = noSpaceLine[6:]
	}

	var openaiResponse types.OpenAIResponsesStreamResponses
	err := json.Unmarshal(noSpaceLine, &openaiResponse)
	if err != nil {
		errChan <- common.ErrorToOpenAIError(err)
		return
	}

	switch openaiResponse.Type {
	case "response.created":
		if openaiResponse.Response != nil {
			model.StoreResponseResourceBinding(openaiResponse.Response.ID, h.ChannelID)
			model.StoreConversationResourceBinding(openaiResponse.Response.ConversationID, h.ChannelID)
		}
		if len(openaiResponse.Response.Tools) > 0 {
			for _, tool := range openaiResponse.Response.Tools {
				if isResponsesWebSearchToolType(tool.Type) {
					h.searchType = getResponsesWebSearchContextSize(openaiResponse.Response.Tools)
				}
				if tool.Type == "code_interpreter" {
					h.containerMemoryLimit = getContainerMemoryLimit(openaiResponse.Response.Tools)
				}
			}
		}
	case "response.output_text.delta":
		delta, ok := openaiResponse.Delta.(string)
		if ok {
			h.Usage.TextBuilder.WriteString(delta)
		}
	case "response.output_item.added":
		if openaiResponse.Item != nil {
			switch openaiResponse.Item.Type {
			case types.InputTypeWebSearchCall:
				if h.searchType == "" {
					h.searchType = getResponsesWebSearchContextSize(openaiResponse.Response.Tools)
				}
				h.Usage.IncExtraBilling(types.APITollTypeWebSearchPreview, h.searchType)
			case types.InputTypeCodeInterpreterCall:
				if h.containerMemoryLimit == "" {
					h.containerMemoryLimit = "1g"
				}
				h.Usage.IncExtraBillingOnce(types.APITollTypeCodeInterpreter, h.containerMemoryLimit, openaiResponse.Item.ContainerID)
			case types.InputTypeFileSearchCall:
				h.Usage.IncExtraBilling(types.APITollTypeFileSearch, "")
			}
		}
	default:
		if openaiResponse.Response != nil && openaiResponse.Response.Usage != nil {
			model.StoreResponseResourceBinding(openaiResponse.Response.ID, h.ChannelID)
			model.StoreConversationResourceBinding(openaiResponse.Response.ConversationID, h.ChannelID)
			usage := openaiResponse.Response.Usage
			*h.Usage = *usage.ToOpenAIUsage()
			getResponsesExtraBilling(openaiResponse.Response, h.Usage)

		}
	}

	dataChan <- rawStr
}
func getResponsesExtraBilling(response *types.OpenAIResponsesResponses, usage *types.Usage) {
	if usage == nil {
		return
	}

	if len(response.Output) > 0 {
		for _, output := range response.Output {
			applyResponsesOutputExtraBilling(usage, response.Tools, &output)
		}
	}
}

// getContainerMemoryLimit 从 tools 配置中提取 code_interpreter 的 memory_limit
func getContainerMemoryLimit(tools []types.ResponsesTools) string {
	for _, tool := range tools {
		if tool.Type != "code_interpreter" {
			continue
		}
		if tool.Container == nil {
			return "1g"
		}
		// Container 可能是 {"type":"auto","memory_limit":"4g",...} 的 map
		if containerMap, ok := tool.Container.(map[string]any); ok {
			if ml, ok := containerMap["memory_limit"].(string); ok && ml != "" {
				return ml
			}
		}
		return "1g"
	}
	return "1g"
}

func buildImageGenerationBillingType(tools []types.ResponsesTools, output *types.ResponsesOutput) string {
	if output == nil {
		return ""
	}

	model := ""
	quality := strings.TrimSpace(strings.ToLower(output.Quality))
	size := strings.TrimSpace(strings.ToLower(output.Size))

	for _, tool := range tools {
		if tool.Type != types.APITollTypeImageGeneration {
			continue
		}
		if model == "" {
			model = strings.TrimSpace(strings.ToLower(tool.Model))
		}
		if quality == "" && tool.Quality != "" {
			quality = strings.TrimSpace(strings.ToLower(tool.Quality))
		}
		if size == "" && tool.Size != "" {
			size = strings.TrimSpace(strings.ToLower(tool.Size))
		}
	}

	if model == "" {
		if quality == "" || size == "" {
			return ""
		}
		return quality + "-" + size
	}

	return model + "|" + quality + "|" + size
}
