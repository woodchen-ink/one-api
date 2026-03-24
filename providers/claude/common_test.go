package claude

import (
	"testing"

	"czloapi/common/config"
	"czloapi/types"

	"github.com/stretchr/testify/assert"
)

func TestClaudeUsageToOpenaiUsageHandlesSplitCacheCreation(t *testing.T) {
	usage := &types.Usage{}
	ok := ClaudeUsageToOpenaiUsage(&Usage{
		InputTokens:          100,
		OutputTokens:         50,
		CacheReadInputTokens: 20,
		CacheCreation: &CacheCreationUsage{
			Ephemeral5mInputTokens: 30,
			Ephemeral1hInputTokens: 40,
		},
	}, usage)

	if assert.True(t, ok) {
		assert.Equal(t, 190, usage.PromptTokens)
		assert.Equal(t, 50, usage.CompletionTokens)
		assert.Equal(t, 240, usage.TotalTokens)

		extraTokens := usage.GetExtraTokens()
		assert.Equal(t, 30, extraTokens[config.UsageExtraCachedWrite5m])
		assert.Equal(t, 40, extraTokens[config.UsageExtraCachedWrite1h])
		assert.Equal(t, 20, extraTokens[config.UsageExtraCachedRead])
		assert.Zero(t, extraTokens[config.UsageExtraCachedWrite])
	}
}

func TestClaudeUsageToOpenaiUsageFallsBackToLegacyCacheWriteField(t *testing.T) {
	usage := &types.Usage{}
	ok := ClaudeUsageToOpenaiUsage(&Usage{
		InputTokens:              100,
		OutputTokens:             50,
		CacheCreationInputTokens: 30,
		CacheReadInputTokens:     20,
	}, usage)

	if assert.True(t, ok) {
		extraTokens := usage.GetExtraTokens()
		assert.Equal(t, 30, extraTokens[config.UsageExtraCachedWrite])
		assert.Zero(t, extraTokens[config.UsageExtraCachedWrite5m])
		assert.Zero(t, extraTokens[config.UsageExtraCachedWrite1h])
	}
}
