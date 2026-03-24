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

func TestGeminiPriceSyncProviderParse(t *testing.T) {
	provider := newGeminiPriceSyncProvider()
	raw := []byte(`## Gemini 3.1 Pro Preview

*` + "`gemini-3.1-pro-preview` and `gemini-3.1-pro-preview-customtools`" + `*

### Standard

|   | Free Tier | Paid Tier, per 1M tokens in USD |
|---|---|---|
| Input price | Not available | $2.00, prompts <= 200k tokens $4.00, prompts > 200k tokens |
| Output price (including thinking tokens) | Not available | $12.00, prompts <= 200k tokens $18.00, prompts > 200k |
| Context caching price | Not available | $0.20, prompts <= 200k tokens $0.40, prompts > 200k $4.50 / 1,000,000 tokens per hour (storage price) |

## Gemini 3.1 Flash Image Preview

*` + "`gemini-3.1-flash-image-preview`" + `*

### Standard

|   | Free Tier | Paid Tier, per 1M tokens in USD |
|---|---|---|
| Input price | Not available | $0.50 (text/image) |
| Output price | Not available | $3 (text and thinking) $60.00 (images) Equivalent to $0.045 per 0.5K image |

## Gemini 2.5 Flash Preview TTS

*` + "`gemini-2.5-flash-preview-tts`" + `*

### Standard

|   | Free Tier | Paid Tier, per 1M tokens in USD |
|---|---|---|
| Input price | Free of charge | $0.50 (text) |
| Output price | Free of charge | $10.00 (audio) |

## Gemini Embedding

*` + "`gemini-embedding-001`" + `*

### Standard

|   | Free Tier | Paid Tier, per 1M tokens in USD |
|---|---|---|
| Input price | Free of charge | $0.15 |

## Gemini Embedding 2 Preview

*` + "`gemini-embedding-2-preview`" + `*

### Standard

|   | Free Tier | Paid Tier, per 1M tokens in USD |
|---|---|---|
| Text input price | Free of charge | $0.20 |
| Image input price | Free of charge | $0.45 ($0.00012 per image) |
| Audio input price | Free of charge | $6.50 ($0.00016 per second) |
| Video input price | Free of charge | $12.00 ($0.00079 per frame) |
`)

	rows, err := provider.Parse(raw)
	if !assert.NoError(t, err) {
		return
	}

	rowMap := make(map[string]PriceSyncDraftRow, len(rows))
	for _, row := range rows {
		rowMap[row.SourceModel] = row
	}

	if assert.Contains(t, rowMap, "gemini-3.1-pro-preview") {
		row := rowMap["gemini-3.1-pro-preview"]
		assert.Equal(t, 2.0, row.Input)
		assert.Equal(t, 12.0, row.Output)
		assert.Equal(t, 0.2, row.ExtraRatios[config.UsageExtraCache])
		if assert.Len(t, row.BillingRules, 1) {
			assert.Equal(t, "prompt_tokens_gt_200000", row.BillingRules[0].Name)
			if assert.NotNil(t, row.BillingRules[0].Match.PromptTokensGT) {
				assert.Equal(t, 200000, *row.BillingRules[0].Match.PromptTokensGT)
			}
			if assert.NotNil(t, row.BillingRules[0].Input) {
				assert.Equal(t, 4.0, *row.BillingRules[0].Input)
			}
			if assert.NotNil(t, row.BillingRules[0].Output) {
				assert.Equal(t, 18.0, *row.BillingRules[0].Output)
			}
			assert.Equal(t, 0.4, row.BillingRules[0].ExtraRatios[config.UsageExtraCache])
		}
	}

	if assert.Contains(t, rowMap, "gemini-3.1-pro-preview-customtools") {
		row := rowMap["gemini-3.1-pro-preview-customtools"]
		assert.Equal(t, 2.0, row.Input)
		assert.Equal(t, 12.0, row.Output)
	}

	if assert.Contains(t, rowMap, "gemini-3.1-flash-image-preview") {
		row := rowMap["gemini-3.1-flash-image-preview"]
		assert.Equal(t, 0.5, row.Input)
		assert.Equal(t, 3.0, row.Output)
		assert.Equal(t, 60.0, row.ExtraRatios[config.UsageExtraOutputImageTokens])
	}

	if assert.Contains(t, rowMap, "gemini-2.5-flash-preview-tts") {
		row := rowMap["gemini-2.5-flash-preview-tts"]
		assert.Equal(t, 0.5, row.Input)
		assert.Equal(t, 0.0, row.Output)
		assert.Equal(t, 10.0, row.ExtraRatios[config.UsageExtraOutputAudio])
	}

	if assert.Contains(t, rowMap, "gemini-embedding-001") {
		row := rowMap["gemini-embedding-001"]
		assert.Equal(t, 0.15, row.Input)
		assert.Equal(t, 0.0, row.Output)
	}

	assert.NotContains(t, rowMap, "gemini-embedding-2-preview")
}

func TestGeminiPriceSyncProviderSuggestModel(t *testing.T) {
	provider := newGeminiPriceSyncProvider()

	assert.Equal(t, "gemini-2.5-flash", provider.SuggestModel("gemini-2.5-flash", []string{"gemini-2.5-flash", "gemini-2.5-pro"}))
	assert.Equal(t, "gemini-3.1-pro-preview", provider.SuggestModel("gemini-3.1-pro-preview", []string{"gemini-3.1-pro-preview", "gemini-3.1-pro-preview-customtools"}))
	assert.Equal(t, "gemini-2.5-flash-lite-preview", provider.SuggestModel("gemini-2.5-flash-lite-preview-09-2025", []string{"gemini-2.5-flash-lite-preview", "gemini-2.5-flash"}))
}
