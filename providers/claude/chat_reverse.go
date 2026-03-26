package claude

import (
	"czloapi/common"
	"czloapi/common/utils"
	"czloapi/types"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

func ConvertClaudeToOpenAIChat(request *ClaudeRequest) (*types.ChatCompletionRequest, *types.OpenAIErrorWithStatusCode) {
	if request == nil {
		return nil, common.StringErrorWrapper("request is required", "invalid_request", http.StatusBadRequest)
	}

	chatRequest := &types.ChatCompletionRequest{
		Model:       request.Model,
		Messages:    make([]types.ChatCompletionMessage, 0),
		MaxTokens:   request.MaxTokens,
		Temperature: request.Temperature,
		TopP:        request.TopP,
		Stream:      request.Stream,
	}

	if len(request.StopSequences) > 0 {
		chatRequest.Stop = request.StopSequences
	}

	if request.Thinking != nil && request.Thinking.BudgetTokens > 0 {
		chatRequest.Reasoning = &types.ChatReasoning{
			MaxTokens: request.Thinking.BudgetTokens,
		}
	}

	systemMessages, err := convertClaudeSystemToOpenAIMessages(request.System)
	if err != nil {
		return nil, err
	}
	chatRequest.Messages = append(chatRequest.Messages, systemMessages...)

	for _, message := range request.Messages {
		openaiMessages, msgErr := convertClaudeMessageToOpenAI(message)
		if msgErr != nil {
			return nil, msgErr
		}
		chatRequest.Messages = append(chatRequest.Messages, openaiMessages...)
	}

	if len(request.Tools) > 0 {
		chatRequest.Tools = make([]*types.ChatCompletionTool, 0, len(request.Tools))
		for _, tool := range request.Tools {
			chatRequest.Tools = append(chatRequest.Tools, &types.ChatCompletionTool{
				Type: "function",
				Function: types.ChatCompletionFunction{
					Name:        tool.Name,
					Description: tool.Description,
					Parameters:  tool.InputSchema,
				},
			})
		}
	}

	if request.ToolChoice != nil {
		chatRequest.ToolChoice = convertClaudeToolChoiceToOpenAI(request.ToolChoice)
		if !request.ToolChoice.DisableParallelToolUse {
			chatRequest.ParallelToolCalls = true
		}
	}

	return chatRequest, nil
}

func ConvertOpenAIChatToClaude(response *types.ChatCompletionResponse) (*ClaudeResponse, *types.OpenAIErrorWithStatusCode) {
	if response == nil {
		return nil, common.StringErrorWrapper("response is required", "invalid_response", http.StatusInternalServerError)
	}

	claudeResponse := &ClaudeResponse{
		Id:      response.ID,
		Type:    "message",
		Role:    types.ChatMessageRoleAssistant,
		Model:   response.Model,
		Content: make([]ResContent, 0),
		Usage:   OpenAIUsageToClaudeUsage(response.Usage),
	}

	if claudeResponse.Id == "" {
		claudeResponse.Id = fmt.Sprintf("msg_%s", utils.GetUUID())
	}

	if len(response.Choices) == 0 {
		claudeResponse.StopReason = FinishReasonEndTurn
		return claudeResponse, nil
	}

	choice := response.Choices[0]
	if choice.Message.Role != "" {
		claudeResponse.Role = choice.Message.Role
	}

	reasoning := choice.Message.ReasoningContent
	if reasoning == "" {
		reasoning = choice.Message.Reasoning
	}
	if reasoning != "" {
		claudeResponse.Content = append(claudeResponse.Content, ResContent{
			Type:     ContentTypeThinking,
			Thinking: reasoning,
		})
	}

	textBlocks, err := convertOpenAIContentToClaudeText(choice.Message.Content)
	if err != nil {
		return nil, err
	}
	claudeResponse.Content = append(claudeResponse.Content, textBlocks...)

	for _, toolCall := range choice.Message.ToolCalls {
		if toolCall == nil || toolCall.Function == nil {
			continue
		}

		var input any = map[string]any{}
		if strings.TrimSpace(toolCall.Function.Arguments) != "" {
			if unmarshalErr := json.Unmarshal([]byte(toolCall.Function.Arguments), &input); unmarshalErr != nil {
				return nil, common.ErrorWrapper(unmarshalErr, "tool_arguments_invalid", http.StatusBadRequest)
			}
		}

		claudeResponse.Content = append(claudeResponse.Content, ResContent{
			Type:  ContentTypeToolUes,
			Id:    toolCall.Id,
			Name:  toolCall.Function.Name,
			Input: input,
		})
	}

	stopReason := OpenAIStopReasonToClaude(choice.FinishReason)
	if stopReason == "" {
		if len(choice.Message.ToolCalls) > 0 {
			stopReason = FinishReasonToolUse
		} else {
			stopReason = FinishReasonEndTurn
		}
	}
	claudeResponse.StopReason = stopReason

	return claudeResponse, nil
}

func OpenAIStopReasonToClaude(reason string) string {
	switch reason {
	case types.FinishReasonStop, types.FinishReasonNull:
		return FinishReasonEndTurn
	case types.FinishReasonLength:
		return "max_tokens"
	case types.FinishReasonToolCalls, types.FinishReasonFunctionCall:
		return FinishReasonToolUse
	case types.FinishReasonContentFilter:
		return "refusal"
	default:
		return reason
	}
}

func OpenAIUsageToClaudeUsage(usage *types.Usage) Usage {
	if usage == nil {
		return Usage{}
	}

	cacheReadTokens := usage.PromptTokensDetails.CachedReadTokens
	if cacheReadTokens == 0 {
		cacheReadTokens = usage.PromptTokensDetails.CachedTokens
	}

	cacheWrite5mTokens := usage.PromptTokensDetails.CachedWrite5mTokens
	cacheWrite1hTokens := usage.PromptTokensDetails.CachedWrite1hTokens
	cacheCreationTokens := cacheWrite5mTokens + cacheWrite1hTokens
	if cacheCreationTokens == 0 {
		cacheCreationTokens = usage.PromptTokensDetails.CachedWriteTokens
	}

	inputTokens := usage.PromptTokens - cacheReadTokens - cacheCreationTokens
	if inputTokens < 0 {
		inputTokens = 0
	}

	claudeUsage := Usage{
		InputTokens:          inputTokens,
		OutputTokens:         usage.CompletionTokens,
		CacheReadInputTokens: cacheReadTokens,
	}

	if cacheWrite5mTokens > 0 || cacheWrite1hTokens > 0 {
		claudeUsage.CacheCreation = &CacheCreationUsage{
			Ephemeral5mInputTokens: cacheWrite5mTokens,
			Ephemeral1hInputTokens: cacheWrite1hTokens,
		}
	} else if cacheCreationTokens > 0 {
		claudeUsage.CacheCreationInputTokens = cacheCreationTokens
	}

	return claudeUsage
}

func convertClaudeSystemToOpenAIMessages(system any) ([]types.ChatCompletionMessage, *types.OpenAIErrorWithStatusCode) {
	blocks, err := normalizeClaudeContent(system)
	if err != nil {
		return nil, err
	}
	if len(blocks) == 0 {
		return nil, nil
	}

	messages := make([]types.ChatCompletionMessage, 0, len(blocks))
	for _, block := range blocks {
		message, msgErr := buildOpenAIMessageFromClaudeBlocks(types.ChatMessageRoleSystem, []MessageContent{block})
		if msgErr != nil {
			return nil, msgErr
		}
		if message != nil {
			messages = append(messages, *message)
		}
	}

	return messages, nil
}

func convertClaudeMessageToOpenAI(message Message) ([]types.ChatCompletionMessage, *types.OpenAIErrorWithStatusCode) {
	blocks, err := normalizeClaudeContent(message.Content)
	if err != nil {
		return nil, err
	}
	if len(blocks) == 0 {
		if raw, ok := message.Content.(string); ok && raw != "" {
			return []types.ChatCompletionMessage{{
				Role:    message.Role,
				Content: raw,
			}}, nil
		}
		return nil, nil
	}

	messages := make([]types.ChatCompletionMessage, 0, len(blocks))
	pendingBlocks := make([]MessageContent, 0, len(blocks))

	flushPending := func() *types.OpenAIErrorWithStatusCode {
		if len(pendingBlocks) == 0 {
			return nil
		}

		openaiMessage, msgErr := buildOpenAIMessageFromClaudeBlocks(message.Role, pendingBlocks)
		if msgErr != nil {
			return msgErr
		}
		if openaiMessage != nil {
			messages = append(messages, *openaiMessage)
		}
		pendingBlocks = pendingBlocks[:0]
		return nil
	}

	for _, block := range blocks {
		if block.Type == ContentTypeToolResult {
			if flushErr := flushPending(); flushErr != nil {
				return nil, flushErr
			}
			toolMessage, msgErr := convertClaudeToolResultToOpenAI(block)
			if msgErr != nil {
				return nil, msgErr
			}
			messages = append(messages, *toolMessage)
			continue
		}

		pendingBlocks = append(pendingBlocks, block)
	}

	if flushErr := flushPending(); flushErr != nil {
		return nil, flushErr
	}

	return messages, nil
}

func buildOpenAIMessageFromClaudeBlocks(role string, blocks []MessageContent) (*types.ChatCompletionMessage, *types.OpenAIErrorWithStatusCode) {
	message := &types.ChatCompletionMessage{
		Role:      role,
		ToolCalls: make([]*types.ChatCompletionToolCalls, 0),
	}

	parts := make([]types.ChatMessagePart, 0)
	textContent := ""
	useParts := false

	appendText := func(text string) {
		if text == "" {
			return
		}
		if useParts {
			parts = append(parts, types.ChatMessagePart{
				Type: types.ContentTypeText,
				Text: text,
			})
			return
		}
		textContent += text
	}

	appendPart := func(part types.ChatMessagePart) {
		if !useParts {
			useParts = true
			if textContent != "" {
				parts = append(parts, types.ChatMessagePart{
					Type: types.ContentTypeText,
					Text: textContent,
				})
				textContent = ""
			}
		}
		parts = append(parts, part)
	}

	for _, block := range blocks {
		if block.CacheControl != nil && message.CacheControl == nil {
			message.CacheControl = block.CacheControl
		}

		switch block.Type {
		case "", ContentTypeText:
			appendText(block.Text)
		case ContentTypeImage:
			imageURL, err := getClaudeContentDataURI(block.Source)
			if err != nil {
				return nil, err
			}
			appendPart(types.ChatMessagePart{
				Type: types.ContentTypeImageURL,
				ImageURL: &types.ChatMessageImageURL{
					URL: imageURL,
				},
			})
		case "document":
			documentURL, err := getClaudeContentDataURI(block.Source)
			if err != nil {
				return nil, err
			}
			appendPart(types.ChatMessagePart{
				Type: types.ContentTypeImageURL,
				ImageURL: &types.ChatMessageImageURL{
					URL: documentURL,
				},
			})
		case ContentTypeThinking, ContentTypeRedactedThinking:
			message.ReasoningContent += block.Text
		case ContentTypeToolUes:
			args, err := json.Marshal(defaultToolInput(block.Input))
			if err != nil {
				return nil, common.ErrorWrapper(err, "tool_arguments_invalid", http.StatusBadRequest)
			}
			message.ToolCalls = append(message.ToolCalls, &types.ChatCompletionToolCalls{
				Id:    block.Id,
				Type:  types.ChatMessageRoleFunction,
				Index: len(message.ToolCalls),
				Function: &types.ChatCompletionToolCallsFunction{
					Name:      block.Name,
					Arguments: string(args),
				},
			})
		}
	}

	if useParts {
		message.Content = parts
	} else if textContent != "" {
		message.Content = textContent
	}

	if len(message.ToolCalls) == 0 {
		message.ToolCalls = nil
	}

	if message.Content == nil && message.ReasoningContent == "" && message.ToolCalls == nil {
		return nil, nil
	}

	return message, nil
}

func convertClaudeToolResultToOpenAI(block MessageContent) (*types.ChatCompletionMessage, *types.OpenAIErrorWithStatusCode) {
	content, err := normalizeClaudeToolResultContent(block.Content)
	if err != nil {
		return nil, err
	}

	return &types.ChatCompletionMessage{
		Role:       types.ChatMessageRoleTool,
		Content:    content,
		ToolCallID: block.ToolUseId,
	}, nil
}

func normalizeClaudeToolResultContent(content any) (any, *types.OpenAIErrorWithStatusCode) {
	switch value := content.(type) {
	case nil:
		return "", nil
	case string:
		return value, nil
	}

	blocks, err := normalizeClaudeContent(content)
	if err == nil && len(blocks) > 0 {
		message, msgErr := buildOpenAIMessageFromClaudeBlocks(types.ChatMessageRoleTool, blocks)
		if msgErr != nil {
			return nil, msgErr
		}
		if message == nil || message.Content == nil {
			return "", nil
		}
		return message.Content, nil
	}

	raw, marshalErr := json.Marshal(content)
	if marshalErr != nil {
		return nil, common.ErrorWrapper(marshalErr, "tool_result_invalid", http.StatusBadRequest)
	}
	return string(raw), nil
}

func convertOpenAIContentToClaudeText(content any) ([]ResContent, *types.OpenAIErrorWithStatusCode) {
	if content == nil {
		return nil, nil
	}

	if text, ok := content.(string); ok {
		if text == "" {
			return nil, nil
		}
		return []ResContent{{
			Type: ContentTypeText,
			Text: text,
		}}, nil
	}

	raw, err := json.Marshal(content)
	if err != nil {
		return nil, common.ErrorWrapper(err, "content_invalid", http.StatusBadRequest)
	}

	var parts []types.ChatMessagePart
	if err = json.Unmarshal(raw, &parts); err != nil {
		return nil, common.ErrorWrapper(err, "content_invalid", http.StatusBadRequest)
	}

	textBlocks := make([]ResContent, 0, len(parts))
	for _, part := range parts {
		if part.Type == types.ContentTypeText && part.Text != "" {
			textBlocks = append(textBlocks, ResContent{
				Type: ContentTypeText,
				Text: part.Text,
			})
		}
	}

	return textBlocks, nil
}

func convertClaudeToolChoiceToOpenAI(choice *ToolChoice) any {
	if choice == nil {
		return nil
	}

	switch choice.Type {
	case "tool":
		return map[string]any{
			"type": "function",
			"function": map[string]any{
				"name": choice.Name,
			},
		}
	case "any":
		return types.ToolChoiceTypeRequired
	case types.ToolChoiceTypeNone:
		return types.ToolChoiceTypeNone
	default:
		return types.ToolChoiceTypeAuto
	}
}

func normalizeClaudeContent(content any) ([]MessageContent, *types.OpenAIErrorWithStatusCode) {
	switch value := content.(type) {
	case nil:
		return nil, nil
	case string:
		if value == "" {
			return nil, nil
		}
		return []MessageContent{{
			Type: ContentTypeText,
			Text: value,
		}}, nil
	case []MessageContent:
		return value, nil
	case MessageContent:
		return []MessageContent{value}, nil
	}

	raw, err := json.Marshal(content)
	if err != nil {
		return nil, common.ErrorWrapper(err, "content_invalid", http.StatusBadRequest)
	}

	var blocks []MessageContent
	if err = json.Unmarshal(raw, &blocks); err == nil {
		return blocks, nil
	}

	var block MessageContent
	if err = json.Unmarshal(raw, &block); err == nil {
		return []MessageContent{block}, nil
	}

	return nil, common.ErrorWrapper(err, "content_invalid", http.StatusBadRequest)
}

func getClaudeContentDataURI(source *ContentSource) (string, *types.OpenAIErrorWithStatusCode) {
	if source == nil {
		return "", common.StringErrorWrapper("content source is required", "content_source_required", http.StatusBadRequest)
	}

	if source.Url != "" {
		return source.Url, nil
	}
	if source.Type != "base64" || source.MediaType == "" || source.Data == "" {
		return "", common.StringErrorWrapper("invalid content source", "content_source_invalid", http.StatusBadRequest)
	}

	return fmt.Sprintf("data:%s;base64,%s", source.MediaType, source.Data), nil
}

func defaultToolInput(input any) any {
	if input == nil {
		return map[string]any{}
	}
	return input
}

func (m MessageContent) ContentString() string {
	switch value := m.Content.(type) {
	case string:
		return value
	default:
		raw, _ := json.Marshal(value)
		return string(raw)
	}
}
