package claude

import (
	"testing"

	"czloapi/types"

	"github.com/stretchr/testify/assert"
)

func TestConvertFromChatOpenaiRequiresMaxTokensForClaude(t *testing.T) {
	request := &types.ChatCompletionRequest{
		Model: "claude-3-7-sonnet-latest",
		Messages: []types.ChatCompletionMessage{
			{
				Role:    types.ChatMessageRoleUser,
				Content: "hello",
			},
		},
	}

	result, err := ConvertFromChatOpenai(request)

	assert.Nil(t, result)
	if assert.NotNil(t, err) {
		assert.Equal(t, "max_tokens_required", err.Code)
	}
}

func TestConvertFromChatOpenaiRejectsLegacyThinkingToggle(t *testing.T) {
	request := &types.ChatCompletionRequest{
		Model:       "claude-3-7-sonnet-latest",
		MaxTokens:   4096,
		OneOtherArg: "thinking",
		Messages: []types.ChatCompletionMessage{
			{
				Role:    types.ChatMessageRoleUser,
				Content: "hello",
			},
		},
	}

	result, err := ConvertFromChatOpenai(request)

	assert.Nil(t, result)
	if assert.NotNil(t, err) {
		assert.Equal(t, "thinking_not_supported", err.Code)
	}
}

func TestConvertFromChatOpenaiRequiresReasoningConfiguration(t *testing.T) {
	request := &types.ChatCompletionRequest{
		Model:     "claude-3-7-sonnet-latest",
		MaxTokens: 4096,
		Reasoning: &types.ChatReasoning{},
		Messages: []types.ChatCompletionMessage{
			{
				Role:    types.ChatMessageRoleUser,
				Content: "hello",
			},
		},
	}

	result, err := ConvertFromChatOpenai(request)

	assert.Nil(t, result)
	if assert.NotNil(t, err) {
		assert.Equal(t, "reasoning_required", err.Code)
	}
}

func TestConvertFromChatOpenaiRejectsThinkingBudgetAtOrAboveMaxTokens(t *testing.T) {
	request := &types.ChatCompletionRequest{
		Model:     "claude-3-7-sonnet-latest",
		MaxTokens: 1024,
		Reasoning: &types.ChatReasoning{
			MaxTokens: 1024,
		},
		Messages: []types.ChatCompletionMessage{
			{
				Role:    types.ChatMessageRoleUser,
				Content: "hello",
			},
		},
	}

	result, err := ConvertFromChatOpenai(request)

	assert.Nil(t, result)
	if assert.NotNil(t, err) {
		assert.Equal(t, "max_tokens_too_small", err.Code)
	}
}
