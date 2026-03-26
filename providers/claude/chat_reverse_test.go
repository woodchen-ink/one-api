package claude

import (
	"testing"

	"czloapi/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConvertClaudeToOpenAIChat(t *testing.T) {
	req := &ClaudeRequest{
		Model:     "gpt-4o",
		MaxTokens: 1024,
		System: []MessageContent{
			{
				Type: "text",
				Text: "system rule",
			},
		},
		Messages: []Message{
			{
				Role: "user",
				Content: []MessageContent{
					{
						Type: "text",
						Text: "Hello",
					},
				},
			},
			{
				Role: "assistant",
				Content: []MessageContent{
					{
						Type: "thinking",
						Text: "analyzing",
					},
					{
						Type: "text",
						Text: "Let me check",
					},
					{
						Type: "tool_use",
						Id:   "call_1",
						Name: "lookup_weather",
						Input: map[string]any{
							"city": "Shanghai",
						},
					},
				},
			},
			{
				Role: "user",
				Content: []MessageContent{
					{
						Type:      "tool_result",
						ToolUseId: "call_1",
						Content:   "Sunny",
					},
				},
			},
		},
		Tools: []Tools{
			{
				Name:        "lookup_weather",
				Description: "Lookup weather",
				InputSchema: map[string]any{
					"type": "object",
				},
			},
		},
		ToolChoice: &ToolChoice{
			Type: "any",
		},
		Thinking: &Thinking{
			BudgetTokens: 2048,
		},
		StopSequences: []string{"STOP"},
		Stream:        true,
	}

	chatReq, err := ConvertClaudeToOpenAIChat(req)
	require.Nil(t, err)
	require.NotNil(t, chatReq)

	require.Len(t, chatReq.Messages, 4)
	assert.Equal(t, types.ChatMessageRoleSystem, chatReq.Messages[0].Role)
	assert.Equal(t, "system rule", chatReq.Messages[0].Content)
	assert.Equal(t, types.ChatMessageRoleUser, chatReq.Messages[1].Role)
	assert.Equal(t, "Hello", chatReq.Messages[1].Content)

	assert.Equal(t, types.ChatMessageRoleAssistant, chatReq.Messages[2].Role)
	assert.Equal(t, "Let me check", chatReq.Messages[2].Content)
	assert.Equal(t, "analyzing", chatReq.Messages[2].ReasoningContent)
	require.Len(t, chatReq.Messages[2].ToolCalls, 1)
	assert.Equal(t, "call_1", chatReq.Messages[2].ToolCalls[0].Id)
	assert.Equal(t, "lookup_weather", chatReq.Messages[2].ToolCalls[0].Function.Name)
	assert.JSONEq(t, `{"city":"Shanghai"}`, chatReq.Messages[2].ToolCalls[0].Function.Arguments)

	assert.Equal(t, types.ChatMessageRoleTool, chatReq.Messages[3].Role)
	assert.Equal(t, "Sunny", chatReq.Messages[3].Content)
	assert.Equal(t, "call_1", chatReq.Messages[3].ToolCallID)

	require.Len(t, chatReq.Tools, 1)
	assert.Equal(t, "lookup_weather", chatReq.Tools[0].Function.Name)
	assert.Equal(t, types.ToolChoiceTypeRequired, chatReq.ToolChoice)
	assert.True(t, chatReq.ParallelToolCalls)
	require.NotNil(t, chatReq.Reasoning)
	assert.Equal(t, 2048, chatReq.Reasoning.MaxTokens)
	assert.Equal(t, []string{"STOP"}, chatReq.Stop)
	assert.True(t, chatReq.Stream)
}

func TestConvertOpenAIChatToClaude(t *testing.T) {
	resp := &types.ChatCompletionResponse{
		ID:     "chatcmpl_1",
		Model:  "gpt-4o",
		Object: "chat.completion",
		Choices: []types.ChatCompletionChoice{
			{
				Index: 0,
				Message: types.ChatCompletionMessage{
					Role:             types.ChatMessageRoleAssistant,
					Content:          "Hello",
					ReasoningContent: "thinking",
					ToolCalls: []*types.ChatCompletionToolCalls{
						{
							Id:   "call_1",
							Type: "function",
							Function: &types.ChatCompletionToolCallsFunction{
								Name:      "lookup_weather",
								Arguments: `{"city":"Shanghai"}`,
							},
						},
					},
				},
				FinishReason: types.FinishReasonToolCalls,
			},
		},
		Usage: &types.Usage{
			PromptTokens:     120,
			CompletionTokens: 40,
			PromptTokensDetails: types.PromptTokensDetails{
				CachedReadTokens:  10,
				CachedWriteTokens: 20,
			},
		},
	}

	claudeResp, err := ConvertOpenAIChatToClaude(resp)
	require.Nil(t, err)
	require.NotNil(t, claudeResp)

	assert.Equal(t, "chatcmpl_1", claudeResp.Id)
	assert.Equal(t, "message", claudeResp.Type)
	assert.Equal(t, types.ChatMessageRoleAssistant, claudeResp.Role)
	assert.Equal(t, FinishReasonToolUse, claudeResp.StopReason)
	require.Len(t, claudeResp.Content, 3)
	assert.Equal(t, ContentTypeThinking, claudeResp.Content[0].Type)
	assert.Equal(t, "thinking", claudeResp.Content[0].Thinking)
	assert.Equal(t, ContentTypeText, claudeResp.Content[1].Type)
	assert.Equal(t, "Hello", claudeResp.Content[1].Text)
	assert.Equal(t, ContentTypeToolUes, claudeResp.Content[2].Type)
	assert.Equal(t, "lookup_weather", claudeResp.Content[2].Name)
	assert.Equal(t, "call_1", claudeResp.Content[2].Id)
	assert.Equal(t, 90, claudeResp.Usage.InputTokens)
	assert.Equal(t, 10, claudeResp.Usage.CacheReadInputTokens)
	assert.Equal(t, 20, claudeResp.Usage.CacheCreationInputTokens)
	assert.Equal(t, 40, claudeResp.Usage.OutputTokens)
}
