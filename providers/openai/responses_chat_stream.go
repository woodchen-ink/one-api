package openai

import (
	"bytes"
	"encoding/json"
	"errors"
	"strings"

	"czloapi/common"
	"czloapi/common/utils"
	"czloapi/types"
)

type OpenAIResponsesStreamHandler struct {
	Usage     *types.Usage
	Prefix    string
	Model     string
	ChannelID int
	MessageID string
	CreatedAt any

	searchType           string
	containerMemoryLimit string
	toolIndex            int

	toolCallIndexByID         map[string]int
	toolCallNameByID          map[string]string
	toolCallArgsByID          map[string]string
	toolCallNameSent          map[string]bool
	toolCallCanonicalIDByItem map[string]string
	outputTextBuilder         strings.Builder
	sawToolCall               bool
}

func newOpenAIResponsesStreamHandler(usage *types.Usage, model string, channelID int) OpenAIResponsesStreamHandler {
	return OpenAIResponsesStreamHandler{
		Usage:                     usage,
		Prefix:                    `data: `,
		Model:                     model,
		ChannelID:                 channelID,
		toolCallIndexByID:         make(map[string]int),
		toolCallNameByID:          make(map[string]string),
		toolCallArgsByID:          make(map[string]string),
		toolCallNameSent:          make(map[string]bool),
		toolCallCanonicalIDByItem: make(map[string]string),
	}
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
		delta := responsesStringDelta(openaiResponse.Delta)
		if delta != "" {
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
	case "response.reasoning_summary_text.delta", "response.reasoning.delta":
		delta := responsesReasoningDeltaText(&openaiResponse)
		if delta != "" {
			h.Usage.TextBuilder.WriteString(delta)
			chatRes.Choices = append(chatRes.Choices, types.ChatCompletionStreamChoice{
				Index: 0,
				Delta: types.ChatCompletionStreamChoiceDelta{
					ReasoningContent: delta,
				},
			})
			needOutput = true
		}
	case "response.refusal.delta":
		delta := responsesStringDelta(openaiResponse.Delta)
		if delta != "" {
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
	case "response.function_call_arguments.delta":
		delta := responsesStringDelta(openaiResponse.Delta)
		if delta != "" {
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
				if h.containerMemoryLimit == "" {
					h.containerMemoryLimit = "1g"
				}
				h.Usage.IncExtraBillingOnce(types.APITollTypeCodeInterpreter, h.containerMemoryLimit, openaiResponse.Item.ContainerID)
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
		if h.sawToolCall {
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

func responsesStringDelta(delta any) string {
	if deltaStr, ok := delta.(string); ok {
		return deltaStr
	}
	return ""
}

func responsesReasoningDeltaText(response *types.OpenAIResponsesStreamResponses) string {
	if response == nil {
		return ""
	}

	if delta := responsesStringDelta(response.Delta); delta != "" {
		return delta
	}

	deltaMap, ok := response.Delta.(map[string]any)
	if !ok {
		return ""
	}

	text, _ := deltaMap["text"].(string)
	return text
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
		if isResponsesWebSearchToolType(tool.Type) {
			h.searchType = getResponsesWebSearchContextSize(response.Tools)
		}
		if tool.Type == "code_interpreter" {
			h.containerMemoryLimit = getContainerMemoryLimit(response.Tools)
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
	if callID == "" {
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
