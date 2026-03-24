package model

import (
	"testing"

	"czloapi/common/config"

	"github.com/stretchr/testify/assert"
)

func TestClaudePriceSyncProviderParse(t *testing.T) {
	provider := newClaudePriceSyncProvider()
	raw := []byte(`# Pricing

## Model pricing

| Model             | Base Input Tokens | 5m Cache Writes | 1h Cache Writes | Cache Hits & Refreshes | Output Tokens |
|-------------------|-------------------|-----------------|-----------------|------------------------|---------------|
| Claude Opus 4.6   | $5 / MTok         | $6.25 / MTok    | $10 / MTok      | $0.50 / MTok           | $25 / MTok    |
| Claude Sonnet 3.7 ([deprecated](/docs/en/about-claude/model-deprecations)) | $3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok |
`)

	rows, err := provider.Parse(raw)
	if assert.NoError(t, err) && assert.Len(t, rows, 2) {
		assert.Equal(t, "Claude Opus 4.6", rows[0].SourceModel)
		assert.Equal(t, 5.0, rows[0].Input)
		assert.Equal(t, 25.0, rows[0].Output)
		assert.Equal(t, 6.25, rows[0].ExtraRatios[config.UsageExtraCachedWrite5m])
		assert.Equal(t, 10.0, rows[0].ExtraRatios[config.UsageExtraCachedWrite1h])
		assert.Equal(t, 0.5, rows[0].ExtraRatios[config.UsageExtraCachedRead])

		assert.Equal(t, "Claude Sonnet 3.7 (deprecated)", rows[1].SourceModel)
	}
}

func TestClaudePriceSyncProviderSuggestModel(t *testing.T) {
	provider := newClaudePriceSyncProvider()

	assert.Equal(t, "claude-opus-4-6", provider.SuggestModel("Claude Opus 4.6", []string{"claude-opus-4-6", "claude-sonnet-4-6"}))
	assert.Equal(t, "claude-3-7-sonnet", provider.SuggestModel("Claude Sonnet 3.7", []string{"claude-3-7-sonnet", "claude-sonnet-4-6"}))
	assert.Equal(t, "", provider.SuggestModel("Claude Haiku 4.5", []string{"claude-haiku-4-5", "claude-haiku-4-5-20251001"}))
}
