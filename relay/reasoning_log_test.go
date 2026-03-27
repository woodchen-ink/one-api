package relay

import (
	"testing"

	"czloapi/providers/claude"
	"czloapi/providers/gemini"
	"czloapi/types"

	"github.com/stretchr/testify/assert"
)

func TestExtractChatReasoningMetadataFromReasoning(t *testing.T) {
	summary := "concise"
	meta := extractChatReasoningMetadata(&types.ChatCompletionRequest{
		Reasoning: &types.ChatReasoning{
			Effort:  "medium",
			Summary: &summary,
		},
	}, "")

	if assert.NotNil(t, meta) {
		assert.True(t, meta.Enabled)
		assert.Equal(t, "medium", meta.Level)
		assert.Equal(t, types.LogReasoningModeEffort, meta.Mode)
		assert.Equal(t, types.LogReasoningProviderOpenAI, meta.ProviderFamily)
		assert.Equal(t, types.LogReasoningViaChatCompletions, meta.RequestedVia)
		assert.Equal(t, "medium", meta.RawEffort)
		assert.Equal(t, summary, meta.Summary)
	}
}

func TestExtractChatReasoningMetadataFromReasoningEffort(t *testing.T) {
	effort := "high"
	meta := extractChatReasoningMetadata(&types.ChatCompletionRequest{
		ReasoningEffort: &effort,
	}, "")

	if assert.NotNil(t, meta) {
		assert.Equal(t, "high", meta.Level)
		assert.Equal(t, types.LogReasoningModeEffort, meta.Mode)
		assert.Equal(t, types.LogReasoningViaChatCompletions, meta.RequestedVia)
		assert.Equal(t, "high", meta.RawEffort)
	}
}

func TestExtractChatReasoningMetadataFromModelSuffix(t *testing.T) {
	meta := extractChatReasoningMetadata(&types.ChatCompletionRequest{}, "low")

	if assert.NotNil(t, meta) {
		assert.Equal(t, "low", meta.Level)
		assert.Equal(t, types.LogReasoningViaModelSuffix, meta.RequestedVia)
		assert.Equal(t, "low", meta.RawEffort)
	}
}

func TestExtractChatReasoningMetadataSupportsXHigh(t *testing.T) {
	meta := extractChatReasoningMetadata(&types.ChatCompletionRequest{}, "xhigh")

	if assert.NotNil(t, meta) {
		assert.Equal(t, "xhigh", meta.Level)
		assert.Equal(t, types.LogReasoningViaModelSuffix, meta.RequestedVia)
		assert.Equal(t, "xhigh", meta.RawEffort)
	}
}

func TestExtractChatReasoningMetadataKeepsRawLevel(t *testing.T) {
	meta := extractChatReasoningMetadata(&types.ChatCompletionRequest{}, "ultra")

	if assert.NotNil(t, meta) {
		assert.Equal(t, "ultra", meta.Level)
		assert.Equal(t, "ultra", meta.RawEffort)
	}
}

func TestExtractResponsesReasoningMetadata(t *testing.T) {
	effort := "minimal"
	meta := extractResponsesReasoningMetadata(&types.OpenAIResponsesRequest{
		Reasoning: &types.ReasoningEffort{
			Effort: &effort,
		},
	})

	if assert.NotNil(t, meta) {
		assert.Equal(t, "minimal", meta.Level)
		assert.Equal(t, types.LogReasoningModeEffort, meta.Mode)
		assert.Equal(t, types.LogReasoningViaResponses, meta.RequestedVia)
		assert.Equal(t, "minimal", meta.RawEffort)
	}
}

func TestExtractClaudeReasoningMetadata(t *testing.T) {
	meta := extractClaudeReasoningMetadata(&claude.ClaudeRequest{
		Thinking: &claude.Thinking{
			Type:         "enabled",
			BudgetTokens: 4096,
		},
	})

	if assert.NotNil(t, meta) {
		assert.Equal(t, "medium", meta.Level)
		assert.Equal(t, types.LogReasoningModeBudgetTokens, meta.Mode)
		assert.Equal(t, types.LogReasoningViaClaudeNative, meta.RequestedVia)
		if assert.NotNil(t, meta.BudgetTokens) {
			assert.Equal(t, 4096, *meta.BudgetTokens)
		}
	}
}

func TestExtractChatReasoningMetadataFromReasoningBudget(t *testing.T) {
	meta := extractChatReasoningMetadata(&types.ChatCompletionRequest{
		Reasoning: &types.ChatReasoning{
			MaxTokens: 2048,
		},
	}, "")

	if assert.NotNil(t, meta) {
		assert.Equal(t, "low", meta.Level)
		assert.Equal(t, types.LogReasoningModeBudgetTokens, meta.Mode)
		if assert.NotNil(t, meta.BudgetTokens) {
			assert.Equal(t, 2048, *meta.BudgetTokens)
		}
	}
}

func TestExtractClaudeReasoningMetadataDefaultLevel(t *testing.T) {
	meta := extractClaudeReasoningMetadata(&claude.ClaudeRequest{
		Thinking: &claude.Thinking{
			Type: "enabled",
		},
	})

	if assert.NotNil(t, meta) {
		assert.Equal(t, "", meta.Level)
		assert.Equal(t, types.LogReasoningModeToggle, meta.Mode)
	}
}

func TestExtractClaudeReasoningMetadataUsesOutputConfigEffort(t *testing.T) {
	meta := extractClaudeReasoningMetadata(&claude.ClaudeRequest{
		OutputConfig: &claude.OutputConfig{
			Effort: "max",
		},
		Thinking: &claude.Thinking{
			Type:         "enabled",
			BudgetTokens: 2048,
		},
	})

	if assert.NotNil(t, meta) {
		assert.Equal(t, "xhigh", meta.Level)
		assert.Equal(t, "max", meta.RawEffort)
		assert.Equal(t, types.LogReasoningModeEffort, meta.Mode)
		if assert.NotNil(t, meta.BudgetTokens) {
			assert.Equal(t, 2048, *meta.BudgetTokens)
		}
	}
}

func TestExtractGeminiReasoningMetadataWithThinkingLevel(t *testing.T) {
	budget := 2048
	meta := extractGeminiReasoningMetadata(&gemini.GeminiChatRequest{
		GenerationConfig: gemini.GeminiChatGenerationConfig{
			ThinkingConfig: &gemini.ThinkingConfig{
				ThinkingLevel:  "HIGH",
				ThinkingBudget: &budget,
			},
		},
	})

	if assert.NotNil(t, meta) {
		assert.Equal(t, "HIGH", meta.Level)
		assert.Equal(t, types.LogReasoningModeThinkingLevel, meta.Mode)
		assert.Equal(t, "HIGH", meta.RawThinkingLevel)
		if assert.NotNil(t, meta.BudgetTokens) {
			assert.Equal(t, 2048, *meta.BudgetTokens)
		}
	}
}

func TestExtractGeminiReasoningMetadataWithBudgetOnly(t *testing.T) {
	budget := 1024
	meta := extractGeminiReasoningMetadata(&gemini.GeminiChatRequest{
		GenerationConfig: gemini.GeminiChatGenerationConfig{
			ThinkingConfig: &gemini.ThinkingConfig{
				ThinkingBudget: &budget,
			},
		},
	})

	if assert.NotNil(t, meta) {
		assert.Equal(t, "", meta.Level)
		assert.Equal(t, types.LogReasoningModeBudgetTokens, meta.Mode)
		if assert.NotNil(t, meta.BudgetTokens) {
			assert.Equal(t, 1024, *meta.BudgetTokens)
		}
	}
}

func TestExtractChatReasoningMetadataWithoutReasoningReturnsNil(t *testing.T) {
	assert.Nil(t, extractChatReasoningMetadata(&types.ChatCompletionRequest{}, "search"))
	assert.Nil(t, extractResponsesReasoningMetadata(&types.OpenAIResponsesRequest{}))
	assert.Nil(t, extractClaudeReasoningMetadata(&claude.ClaudeRequest{}))
	assert.Nil(t, extractGeminiReasoningMetadata(&gemini.GeminiChatRequest{}))
}
