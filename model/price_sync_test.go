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

func TestOpenAIPriceSyncProviderParse(t *testing.T) {
	provider := newOpenAIPriceSyncProvider()
	raw := []byte(`<div data-content-switcher-pane data-value="standard">
      <div class="hidden">Standard</div>

      <TextTokenPricingTables
        client:load
        tier="standard"
        rows={[
          ["gpt-5.4 (<272K context length)", 2.5, 0.25, 15],
          ["gpt-5.4-pro (<272K context length)", 30, "", 180],
          ["gpt-4o", 2.5, 1.25, 10],
        ]}
      />
    </div>
    <div data-content-switcher-pane data-value="batch" hidden>
      <div class="hidden">Batch</div>

      <TextTokenPricingTables
        client:load
        tier="batch"
        rows={[
          ["gpt-4o", 1.25, "-", 5],
        ]}
      />
    </div>

<div data-content-switcher-pane data-value="standard">
      <div class="hidden">Standard</div>

      <GroupedPricingTable
        client:load
        groups={[
          {
            model: "Deep research",
            rows: [
              ["o3-deep-research", 10, 2.5, 40],
            ],
          },
          {
            model: "Computer use",
            rows: [["computer-use-preview", 3, "-", 12]],
          },
          {
            model: "Embedding",
            rows: [
              ["text-embedding-3-small", 0.02, "-", "-"],
            ],
          },
          {
            model: "Moderation",
            rows: [
              ["omni-moderation-latest", "Free", "-", "-"],
            ],
          },
        ]}
      />
    </div>
    <div data-content-switcher-pane data-value="priority" hidden>
      <div class="hidden">Priority</div>
    </div>
`)

	rows, err := provider.Parse(raw)
	if !assert.NoError(t, err) {
		return
	}

	rowMap := make(map[string]PriceSyncDraftRow, len(rows))
	for _, row := range rows {
		rowMap[row.SourceModel] = row
	}

	if assert.Contains(t, rowMap, "gpt-5.4 (<272K context length)") {
		row := rowMap["gpt-5.4 (<272K context length)"]
		assert.Equal(t, 2.5, row.Input)
		assert.Equal(t, 15.0, row.Output)
		assert.Equal(t, 0.25, row.ExtraRatios[config.UsageExtraCache])
		if assert.Len(t, row.BillingRules, 1) {
			assert.Equal(t, "prompt_tokens_gt_272000_long_context", row.BillingRules[0].Name)
			if assert.NotNil(t, row.BillingRules[0].Match.PromptTokensGT) {
				assert.Equal(t, 272000, *row.BillingRules[0].Match.PromptTokensGT)
			}
			if assert.NotNil(t, row.BillingRules[0].Input) {
				assert.Equal(t, 5.0, *row.BillingRules[0].Input)
			}
			if assert.NotNil(t, row.BillingRules[0].Output) {
				assert.Equal(t, 22.5, *row.BillingRules[0].Output)
			}
		}
	}

	if assert.Contains(t, rowMap, "gpt-5.4-pro (<272K context length)") {
		row := rowMap["gpt-5.4-pro (<272K context length)"]
		if assert.Len(t, row.BillingRules, 1) {
			if assert.NotNil(t, row.BillingRules[0].Input) {
				assert.Equal(t, 60.0, *row.BillingRules[0].Input)
			}
			if assert.NotNil(t, row.BillingRules[0].Output) {
				assert.Equal(t, 270.0, *row.BillingRules[0].Output)
			}
		}
	}

	if assert.Contains(t, rowMap, "gpt-4o") {
		row := rowMap["gpt-4o"]
		assert.Equal(t, 2.5, row.Input)
		assert.Equal(t, 10.0, row.Output)
		assert.Equal(t, 1.25, row.ExtraRatios[config.UsageExtraCache])
	}

	if assert.Contains(t, rowMap, "o3-deep-research") {
		row := rowMap["o3-deep-research"]
		assert.Equal(t, 10.0, row.Input)
		assert.Equal(t, 40.0, row.Output)
		assert.Equal(t, 2.5, row.ExtraRatios[config.UsageExtraCache])
	}

	if assert.Contains(t, rowMap, "computer-use-preview") {
		row := rowMap["computer-use-preview"]
		assert.Equal(t, 3.0, row.Input)
		assert.Equal(t, 12.0, row.Output)
		assert.Nil(t, row.ExtraRatios)
	}

	if assert.Contains(t, rowMap, "text-embedding-3-small") {
		row := rowMap["text-embedding-3-small"]
		assert.Equal(t, 0.02, row.Input)
		assert.Equal(t, 0.0, row.Output)
	}

	assert.NotContains(t, rowMap, "omni-moderation-latest")
}

func TestOpenAIPriceSyncProviderSuggestModel(t *testing.T) {
	provider := newOpenAIPriceSyncProvider()

	assert.Equal(t, "gpt-5.4", provider.SuggestModel("gpt-5.4 (<272K context length)", []string{"gpt-5.4", "gpt-5.4-mini"}))
	assert.Equal(t, "o3-deep-research", provider.SuggestModel("o3-deep-research", []string{"o3-deep-research", "o4-mini-deep-research"}))
	assert.Equal(t, "", provider.SuggestModel("gpt-4o", []string{"gpt-4o-2024-08-06", "gpt-4o-mini"}))
}
