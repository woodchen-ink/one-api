package types

import (
	"encoding/json"
	"fmt"
	"strings"
)

const (
	chatContentTypeInputAudio = "input_audio"
	chatContentTypeFile       = "file"
	chatContentTypeVideoURL   = "video_url"
)

func (c *ChatCompletionRequest) ToResponsesRequest() *OpenAIResponsesRequest {
	res := &OpenAIResponsesRequest{
		Model:             c.Model,
		MaxOutputTokens:   c.MaxTokens,
		ParallelToolCalls: c.ParallelToolCalls,
		Stream:            c.Stream,
		Temperature:       c.Temperature,
		TopP:              c.TopP,
		User:              c.User,
	}

	if c.MaxCompletionTokens > 0 && c.MaxTokens == 0 {
		res.MaxOutputTokens = c.MaxCompletionTokens
	}

	applyChatResponseFormatToResponsesText(res, c.ResponseFormat, c.Verbosity)
	applyChatReasoningToResponses(res, c)
	applyChatToolsToResponses(res, c)
	applyChatToolChoiceToResponses(res, c)
	applyChatMessagesToResponses(res, c.Messages)

	return res
}

func applyChatResponseFormatToResponsesText(res *OpenAIResponsesRequest, format *ChatCompletionResponseFormat, verbosity string) {
	if format != nil {
		res.Text = &ResponsesText{}
		if format.Type != "" {
			res.Text.Format = &ResponsesTextFormat{
				Type: format.Type,
			}
		}
		if format.JsonSchema != nil && res.Text.Format != nil {
			res.Text.Format.Name = format.JsonSchema.Name
			res.Text.Format.Schema = format.JsonSchema.Schema
			res.Text.Format.Description = format.JsonSchema.Description
			res.Text.Format.Strict = format.JsonSchema.Strict
		}
	}

	if verbosity == "" {
		return
	}
	if res.Text == nil {
		res.Text = &ResponsesText{}
	}
	res.Text.Verbosity = verbosity
}

func applyChatReasoningToResponses(res *OpenAIResponsesRequest, request *ChatCompletionRequest) {
	if request.Reasoning != nil {
		res.Reasoning = &ReasoningEffort{
			Summary: request.Reasoning.Summary,
		}
		if request.Reasoning.Effort != "" {
			res.Reasoning.Effort = &request.Reasoning.Effort
		} else if effort := ReasoningBudgetTokensToEffort(request.Reasoning.MaxTokens); effort != "" {
			res.Reasoning.Effort = &effort
		}

		ensureResponsesReasoningSummary(res.Reasoning)
	}

	if request.ReasoningEffort != nil {
		if res.Reasoning == nil {
			res.Reasoning = &ReasoningEffort{}
		}
		res.Reasoning.Effort = request.ReasoningEffort
		ensureResponsesReasoningSummary(res.Reasoning)
	}
}

func ensureResponsesReasoningSummary(reasoning *ReasoningEffort) {
	if reasoning == nil || reasoning.Effort == nil || reasoning.Summary != nil {
		return
	}

	detailed := "detailed"
	reasoning.Summary = &detailed
}

func applyChatToolsToResponses(res *OpenAIResponsesRequest, request *ChatCompletionRequest) {
	resTools := make([]ResponsesTools, 0, len(request.Tools)+len(request.Functions))

	for _, tool := range request.Tools {
		if tool == nil {
			continue
		}
		if tool.Type == "function" && tool.Function.Name != "" {
			resTools = append(resTools, ResponsesTools{
				Type:        "function",
				Name:        tool.Function.Name,
				Description: tool.Function.Description,
				Parameters:  tool.Function.Parameters,
				Strict:      tool.Function.Strict,
			})
			continue
		}

		tool.ResponsesTools.Type = tool.Type
		resTools = append(resTools, tool.ResponsesTools)
	}

	for _, function := range request.Functions {
		if function == nil || function.Name == "" {
			continue
		}
		resTools = append(resTools, ResponsesTools{
			Type:        "function",
			Name:        function.Name,
			Description: function.Description,
			Parameters:  function.Parameters,
			Strict:      function.Strict,
		})
	}

	if len(resTools) > 0 {
		res.Tools = resTools
	}
}

func applyChatToolChoiceToResponses(res *OpenAIResponsesRequest, request *ChatCompletionRequest) {
	if request.ToolChoice != nil {
		res.ToolChoice = normalizeResponsesToolChoice(request.ToolChoice)
		return
	}

	if request.FunctionCall == nil {
		return
	}

	res.ToolChoice = normalizeLegacyFunctionCallChoice(request.FunctionCall)
}

func normalizeResponsesToolChoice(choice any) any {
	if choice == nil {
		return nil
	}

	choiceMap := convertAnyToMap(choice)
	if len(choiceMap) == 0 {
		return choice
	}

	choiceType, _ := choiceMap["type"].(string)
	if choiceType != ToolChoiceTypeFunction {
		return choice
	}

	if name, _ := choiceMap["name"].(string); strings.TrimSpace(name) != "" {
		return map[string]any{
			"type": ToolChoiceTypeFunction,
			"name": name,
		}
	}

	functionMap := convertAnyToMap(choiceMap["function"])
	if name, _ := functionMap["name"].(string); strings.TrimSpace(name) != "" {
		return map[string]any{
			"type": ToolChoiceTypeFunction,
			"name": name,
		}
	}

	return choice
}

func normalizeLegacyFunctionCallChoice(choice any) any {
	switch typedChoice := choice.(type) {
	case string:
		choiceType := strings.TrimSpace(typedChoice)
		if choiceType == "" {
			return nil
		}
		if choiceType == "auto" || choiceType == "none" {
			return choiceType
		}
		return map[string]any{
			"type": ToolChoiceTypeFunction,
			"name": choiceType,
		}
	case map[string]any:
		if name, _ := typedChoice["name"].(string); strings.TrimSpace(name) != "" {
			return map[string]any{
				"type": ToolChoiceTypeFunction,
				"name": name,
			}
		}
		return typedChoice
	default:
		return normalizeResponsesToolChoice(choice)
	}
}

func applyChatMessagesToResponses(res *OpenAIResponsesRequest, messages []ChatCompletionMessage) {
	instructionsParts := make([]string, 0)
	inputItems := make([]any, 0, len(messages))

	for _, originalMessage := range messages {
		msg := originalMessage
		msg.FuncToToolCalls()
		role := strings.TrimSpace(msg.Role)
		if role == "" {
			continue
		}

		if role == ChatMessageRoleTool || role == ChatMessageRoleFunction {
			callID := strings.TrimSpace(msg.ToolCallID)
			if role == ChatMessageRoleFunction && msg.Name != nil {
				callID = strings.TrimSpace(*msg.Name)
			}

			output := stringifyResponsesToolOutput(msg.Content)
			if callID == "" {
				inputItems = append(inputItems, map[string]any{
					"role":    ChatMessageRoleUser,
					"content": fmt.Sprintf("[tool_output_missing_call_id] %v", output),
				})
				continue
			}

			inputItems = append(inputItems, InputResponses{
				Type:   InputTypeFunctionCallOutput,
				CallID: callID,
				Output: output,
			})
			continue
		}

		if role == ChatMessageRoleSystem || role == ChatMessageRoleDeveloper {
			if instruction := buildResponsesInstructionText(msg); instruction != "" {
				instructionsParts = append(instructionsParts, instruction)
			}
			continue
		}

		item := map[string]any{
			"role": role,
		}

		switch content := msg.Content.(type) {
		case nil:
			item["content"] = ""
		case string:
			item["content"] = content
		default:
			item["content"] = buildResponsesMessageParts(role, msg.ParseContent())
		}

		inputItems = append(inputItems, item)

		if role == ChatMessageRoleAssistant {
			for _, toolCallItem := range buildResponsesFunctionCallsFromAssistant(msg.ToolCalls) {
				inputItems = append(inputItems, toolCallItem)
			}
		}
	}

	if len(instructionsParts) > 0 {
		res.Instructions = strings.Join(instructionsParts, "\n\n")
	}
	if len(inputItems) > 0 {
		res.Input = inputItems
	}
}

func buildResponsesInstructionText(msg ChatCompletionMessage) string {
	if msg.Content == nil {
		return ""
	}
	if text, ok := msg.Content.(string); ok {
		return strings.TrimSpace(text)
	}

	var builder strings.Builder
	for _, part := range msg.ParseContent() {
		if part.Type != ContentTypeText || strings.TrimSpace(part.Text) == "" {
			continue
		}
		if builder.Len() > 0 {
			builder.WriteString("\n")
		}
		builder.WriteString(part.Text)
	}

	return strings.TrimSpace(builder.String())
}

func stringifyResponsesToolOutput(content any) any {
	switch typedContent := content.(type) {
	case nil:
		return ""
	case string:
		return typedContent
	default:
		contentBytes, err := json.Marshal(content)
		if err != nil {
			return fmt.Sprintf("%v", content)
		}
		return string(contentBytes)
	}
}

func buildResponsesMessageParts(role string, parts []ChatMessagePart) []map[string]any {
	contentParts := make([]map[string]any, 0, len(parts))
	for _, part := range parts {
		switch part.Type {
		case ContentTypeText:
			textType := ContentTypeInputText
			if role == ChatMessageRoleAssistant {
				textType = ContentTypeOutputText
			}
			contentParts = append(contentParts, map[string]any{
				"type": textType,
				"text": part.Text,
			})
		case ContentTypeInputText:
			contentParts = append(contentParts, map[string]any{
				"type": ContentTypeInputText,
				"text": part.Text,
			})
		case ContentTypeOutputText:
			contentParts = append(contentParts, map[string]any{
				"type": ContentTypeOutputText,
				"text": part.Text,
			})
		case ContentTypeImageURL, ContentTypeInputImage:
			if part.ImageURL == nil || part.ImageURL.URL == "" {
				continue
			}
			contentParts = append(contentParts, map[string]any{
				"type":      ContentTypeInputImage,
				"image_url": part.ImageURL.URL,
			})
		case chatContentTypeInputAudio:
			if part.InputAudio == nil {
				continue
			}
			contentParts = append(contentParts, map[string]any{
				"type":        chatContentTypeInputAudio,
				"input_audio": part.InputAudio,
			})
		case chatContentTypeFile, ContentTypeInputFile:
			if part.File == nil {
				continue
			}
			contentParts = append(contentParts, map[string]any{
				"type": ContentTypeInputFile,
				"file": part.File,
			})
		case chatContentTypeVideoURL:
			if part.ImageURL == nil || part.ImageURL.URL == "" {
				continue
			}
			contentParts = append(contentParts, map[string]any{
				"type":      "input_video",
				"video_url": part.ImageURL.URL,
			})
		default:
			contentParts = append(contentParts, map[string]any{
				"type": part.Type,
			})
		}
	}

	return contentParts
}

func buildResponsesFunctionCallsFromAssistant(toolCalls []*ChatCompletionToolCalls) []InputResponses {
	items := make([]InputResponses, 0, len(toolCalls))
	for _, toolCall := range toolCalls {
		if toolCall == nil || toolCall.Function == nil {
			continue
		}
		if strings.TrimSpace(toolCall.Id) == "" {
			continue
		}
		if toolCall.Type != "" && toolCall.Type != "function" {
			continue
		}
		name := strings.TrimSpace(toolCall.Function.Name)
		if name == "" {
			continue
		}

		items = append(items, InputResponses{
			Type:      InputTypeFunctionCall,
			CallID:    toolCall.Id,
			Name:      name,
			Arguments: toolCall.Function.Arguments,
		})
	}
	return items
}

func convertAnyToMap(value any) map[string]any {
	if value == nil {
		return nil
	}
	if valueMap, ok := value.(map[string]any); ok {
		return valueMap
	}

	valueBytes, err := json.Marshal(value)
	if err != nil {
		return nil
	}

	result := make(map[string]any)
	if err = json.Unmarshal(valueBytes, &result); err != nil {
		return nil
	}
	return result
}
