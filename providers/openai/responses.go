package openai

import (
	"bytes"
	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/requester"
	"czloapi/common/utils"
	"czloapi/types"
	"encoding/json"
	"errors"
	"strings"
)

type OpenAIResponsesStreamHandler struct {
	Usage     *types.Usage
	Prefix    string
	Model     string
	MessageID string
	CreatedAt any

	searchType string
	toolIndex  int

	toolCallIndexByID         map[string]int
	toolCallNameByID          map[string]string
	toolCallArgsByID          map[string]string
	toolCallNameSent          map[string]bool
	toolCallCanonicalIDByItem map[string]string
	outputTextBuilder         strings.Builder
	sawToolCall               bool
}

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

	chatHandler := OpenAIResponsesStreamHandler{
		Usage:                     p.Usage,
		Prefix:                    `data: `,
		Model:                     request.Model,
		toolCallIndexByID:         make(map[string]int),
		toolCallNameByID:          make(map[string]string),
		toolCallArgsByID:          make(map[string]string),
		toolCallNameSent:          make(map[string]bool),
		toolCallCanonicalIDByItem: make(map[string]string),
	}

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
		if len(openaiResponse.Response.Tools) > 0 {
			for _, tool := range openaiResponse.Response.Tools {
				if tool.Type == types.APITollTypeWebSearchPreview {
					h.searchType = "medium"
					if tool.SearchContextSize != "" {
						h.searchType = tool.SearchContextSize
					}
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
					h.searchType = "medium"
				}
				h.Usage.IncExtraBilling(types.APITollTypeWebSearchPreview, h.searchType)
			case types.InputTypeCodeInterpreterCall:
				h.Usage.IncExtraBilling(types.APITollTypeCodeInterpreter, "")
			case types.InputTypeFileSearchCall:
				h.Usage.IncExtraBilling(types.APITollTypeFileSearch, "")
			}
		}
	default:
		if openaiResponse.Response != nil && openaiResponse.Response.Usage != nil {
			usage := openaiResponse.Response.Usage
			*h.Usage = *usage.ToOpenAIUsage()
			getResponsesExtraBilling(openaiResponse.Response, h.Usage)

		}
	}

	dataChan <- rawStr
}

func (h *OpenAIResponsesStreamHandler) HandlerChatStream(rawLine *[]byte, dataChan chan string, errChan chan error) {
	rawStr := string(*rawLine)
	if !strings.HasPrefix(rawStr, h.Prefix) {
		*rawLine = nil
		return
	}

	noSpaceLine := bytes.TrimSpace(*rawLine)
	if strings.HasPrefix(string(noSpaceLine), h.Prefix) {
		noSpaceLine = noSpaceLine[len(h.Prefix):]
	}

	var openaiResponse types.OpenAIResponsesStreamResponses
	err := json.Unmarshal(noSpaceLine, &openaiResponse)
	if err != nil {
		errChan <- common.ErrorToOpenAIError(err)
		return
	}

	chatRes := types.ChatCompletionStreamResponse{
		ID:      h.MessageID,
		Object:  "chat.completion.chunk",
		Created: utils.GetTimestamp(),
		Model:   h.Model,
		Choices: make([]types.ChatCompletionStreamChoice, 0),
	}
	needOutput := false

	h.applyStreamResponseMetadata(openaiResponse.Response, &chatRes)

	switch openaiResponse.Type {
	case "response.created":
		h.updateSearchType(openaiResponse.Response)
		chatRes.Choices = append(chatRes.Choices, types.ChatCompletionStreamChoice{
			Index: 0,
			Delta: types.ChatCompletionStreamChoiceDelta{},
		})
		needOutput = true
	case "response.output_text.delta":
		delta, ok := openaiResponse.Delta.(string)
		if ok && delta != "" {
			h.Usage.TextBuilder.WriteString(delta)
			h.outputTextBuilder.WriteString(delta)
			chatRes.Choices = append(chatRes.Choices, types.ChatCompletionStreamChoice{
				Index: 0,
				Delta: types.ChatCompletionStreamChoiceDelta{
					Content: delta,
				},
			})
			needOutput = true
		}
	case "response.reasoning_summary_text.delta":
		delta, ok := openaiResponse.Delta.(string)
		if ok && delta != "" {
			h.Usage.TextBuilder.WriteString(delta)
			chatRes.Choices = append(chatRes.Choices, types.ChatCompletionStreamChoice{
				Index: 0,
				Delta: types.ChatCompletionStreamChoiceDelta{
					ReasoningContent: delta,
				},
			})
			needOutput = true
		}
	case "response.function_call_arguments.delta":
		delta, ok := openaiResponse.Delta.(string)
		if ok && delta != "" {
			h.Usage.TextBuilder.WriteString(delta)
			callID := strings.TrimSpace(openaiResponse.ItemID)
			if mappedID, exists := h.toolCallCanonicalIDByItem[callID]; exists && mappedID != "" {
				callID = mappedID
			}
			if callID != "" {
				h.toolCallArgsByID[callID] += delta
				if choice, ok := h.buildToolCallChoice(callID, "", delta); ok {
					chatRes.Choices = append(chatRes.Choices, choice)
					needOutput = true
				}
			}
		}
	case "response.function_call_arguments.done":
		// no-op: indices are tracked by call_id so we do not need a separate step counter here.
	case "response.output_item.added":
		if openaiResponse.Item != nil {
			switch openaiResponse.Item.Type {
			case types.InputTypeWebSearchCall:
				if h.searchType == "" {
					h.searchType = "medium"
				}
				h.Usage.IncExtraBilling(types.APITollTypeWebSearchPreview, h.searchType)
			case types.InputTypeCodeInterpreterCall:
				h.Usage.IncExtraBilling(types.APITollTypeCodeInterpreter, "")
			case types.InputTypeFileSearchCall:
				h.Usage.IncExtraBilling(types.APITollTypeFileSearch, "")
			case types.InputTypeFunctionCall:
				callID := strings.TrimSpace(openaiResponse.Item.CallID)
				if callID == "" {
					callID = strings.TrimSpace(openaiResponse.Item.ID)
				}
				if itemID := strings.TrimSpace(openaiResponse.Item.ID); itemID != "" && callID != "" {
					h.toolCallCanonicalIDByItem[itemID] = callID
				}

				name := strings.TrimSpace(openaiResponse.Item.Name)
				if name != "" {
					h.toolCallNameByID[callID] = name
				}

				arguments := ""
				if openaiResponse.Item.Arguments != nil {
					arguments = *openaiResponse.Item.Arguments
				}
				argsDelta := arguments
				if previous := h.toolCallArgsByID[callID]; previous != "" && strings.HasPrefix(arguments, previous) {
					argsDelta = arguments[len(previous):]
				}
				if arguments != "" {
					h.toolCallArgsByID[callID] = arguments
				}

				if choice, ok := h.buildToolCallChoice(callID, name, argsDelta); ok {
					chatRes.Choices = append(chatRes.Choices, choice)
					needOutput = true
				}
			}
		}
	case "response.completed":
		h.updateUsage(openaiResponse.Response)
		finishReason := types.FinishReasonStop
		if h.sawToolCall && h.outputTextBuilder.Len() == 0 {
			finishReason = types.FinishReasonToolCalls
		}
		chatRes.Choices = append(chatRes.Choices, types.ChatCompletionStreamChoice{
			Index:        0,
			Delta:        types.ChatCompletionStreamChoiceDelta{},
			FinishReason: finishReason,
		})
		needOutput = true
	case "response.incomplete":
		h.updateUsage(openaiResponse.Response)
		chatRes.Choices = append(chatRes.Choices, types.ChatCompletionStreamChoice{
			Index:        0,
			Delta:        types.ChatCompletionStreamChoiceDelta{},
			FinishReason: types.FinishReasonLength,
		})
		needOutput = true
	case "response.failed", "response.error":
		if openaiResponse.Response != nil && openaiResponse.Response.Error != nil && openaiResponse.Response.Error.Message != "" {
			errChan <- common.ErrorToOpenAIError(errors.New(openaiResponse.Response.Error.Message))
			return
		}
		if openaiResponse.Message != nil && *openaiResponse.Message != "" {
			errChan <- common.ErrorToOpenAIError(errors.New(*openaiResponse.Message))
			return
		}
		errChan <- common.ErrorToOpenAIError(errors.New("responses stream error"))
		return
	default:
		h.updateUsage(openaiResponse.Response)
	}

	if needOutput {
		jsonData, err := json.Marshal(chatRes)
		if err != nil {
			errChan <- common.ErrorToOpenAIError(err)
			return
		}
		dataChan <- string(jsonData)

		return
	}

	*rawLine = nil
}

func (h *OpenAIResponsesStreamHandler) applyStreamResponseMetadata(response *types.OpenAIResponsesResponses, chatRes *types.ChatCompletionStreamResponse) {
	if response == nil {
		return
	}

	if response.ID != "" {
		h.MessageID = response.ID
	}
	if response.Model != "" {
		h.Model = response.Model
	}
	if response.CreatedAt != nil {
		h.CreatedAt = response.CreatedAt
	}

	if h.MessageID != "" {
		chatRes.ID = h.MessageID
	}
	if h.Model != "" {
		chatRes.Model = h.Model
	}
	if h.CreatedAt != nil {
		chatRes.Created = h.CreatedAt
	}
}

func (h *OpenAIResponsesStreamHandler) updateSearchType(response *types.OpenAIResponsesResponses) {
	if response == nil || len(response.Tools) == 0 {
		return
	}

	for _, tool := range response.Tools {
		if tool.Type != types.APITollTypeWebSearchPreview {
			continue
		}
		h.searchType = "medium"
		if tool.SearchContextSize != "" {
			h.searchType = tool.SearchContextSize
		}
	}
}

func (h *OpenAIResponsesStreamHandler) updateUsage(response *types.OpenAIResponsesResponses) {
	if response == nil || response.Usage == nil {
		return
	}

	*h.Usage = *response.Usage.ToOpenAIUsage()
	getResponsesExtraBilling(response, h.Usage)
}

func (h *OpenAIResponsesStreamHandler) buildToolCallChoice(callID string, name string, argsDelta string) (types.ChatCompletionStreamChoice, bool) {
	if callID == "" || h.outputTextBuilder.Len() > 0 {
		return types.ChatCompletionStreamChoice{}, false
	}

	index, ok := h.toolCallIndexByID[callID]
	if !ok {
		index = len(h.toolCallIndexByID)
		h.toolCallIndexByID[callID] = index
	}

	if name != "" {
		h.toolCallNameByID[callID] = name
	}
	if storedName := h.toolCallNameByID[callID]; storedName != "" {
		name = storedName
	}

	toolCall := &types.ChatCompletionToolCalls{
		Index: index,
		Id:    callID,
		Type:  "function",
		Function: &types.ChatCompletionToolCallsFunction{
			Arguments: argsDelta,
		},
	}

	if name != "" && !h.toolCallNameSent[callID] {
		toolCall.Function.Name = name
		h.toolCallNameSent[callID] = true
	}

	h.sawToolCall = true
	return types.ChatCompletionStreamChoice{
		Index: 0,
		Delta: types.ChatCompletionStreamChoiceDelta{
			Role:      types.ChatMessageRoleAssistant,
			ToolCalls: []*types.ChatCompletionToolCalls{toolCall},
		},
	}, true
}

func getResponsesExtraBilling(response *types.OpenAIResponsesResponses, usage *types.Usage) {
	if usage == nil {
		return
	}

	if len(response.Output) > 0 {
		for _, output := range response.Output {
			switch output.Type {
			case types.InputTypeWebSearchCall:
				searchType := "medium"
				if len(response.Tools) > 0 {
					for _, tool := range response.Tools {
						if tool.Type == types.APITollTypeWebSearchPreview {
							if tool.SearchContextSize != "" {
								searchType = tool.SearchContextSize
							}
						}
					}
				}
				usage.IncExtraBilling(types.APITollTypeWebSearchPreview, searchType)
			case types.InputTypeCodeInterpreterCall:
				usage.IncExtraBilling(types.APITollTypeCodeInterpreter, "")
			case types.InputTypeFileSearchCall:
				usage.IncExtraBilling(types.APITollTypeFileSearch, "")
			case types.InputTypeImageGenerationCall:
				imageType := output.Quality + "-" + output.Size
				usage.IncExtraBilling(types.APITollTypeImageGeneration, imageType)
			}
		}
	}
}
