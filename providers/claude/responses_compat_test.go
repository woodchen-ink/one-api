package claude

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveClaudeResponseReasoningPrefersOutputConfigEffort(t *testing.T) {
	request := &ClaudeRequest{
		OutputConfig: &OutputConfig{
			Effort: "max",
		},
		Thinking: &Thinking{
			Type:         "enabled",
			BudgetTokens: 2048,
		},
	}

	reasoning := ResolveClaudeResponseReasoning(request)
	require.NotNil(t, reasoning)
	assert.Equal(t, "xhigh", reasoning.Effort)
	assert.Equal(t, 2048, reasoning.MaxTokens)
}

func TestBuildClaudePromptCacheKeyUsesOnlyCacheControlledPrefix(t *testing.T) {
	baseRequest := &ClaudeRequest{
		Model: "gpt-5.4",
		System: []MessageContent{
			{
				Type:         "text",
				Text:         "stable system",
				CacheControl: map[string]any{"type": "ephemeral"},
			},
		},
		Messages: []Message{
			{
				Role: "user",
				Content: []MessageContent{
					{
						Type: "text",
						Text: "question one",
					},
				},
			},
		},
	}

	secondRequest := &ClaudeRequest{
		Model:  baseRequest.Model,
		System: baseRequest.System,
		Messages: []Message{
			{
				Role: "user",
				Content: []MessageContent{
					{
						Type: "text",
						Text: "question two",
					},
				},
			},
		},
	}

	firstKey := BuildClaudePromptCacheKey(baseRequest)
	secondKey := BuildClaudePromptCacheKey(secondRequest)

	require.NotEmpty(t, firstKey)
	assert.Equal(t, firstKey, secondKey)
}

func TestBuildClaudePromptCacheKeyWithoutCacheControlReturnsEmpty(t *testing.T) {
	request := &ClaudeRequest{
		Model: "gpt-5.4",
		Messages: []Message{
			{
				Role:    "user",
				Content: "hello",
			},
		},
	}

	assert.Empty(t, BuildClaudePromptCacheKey(request))
}
