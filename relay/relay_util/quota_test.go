package relay_util

import (
	"net/http/httptest"
	"testing"

	"czloapi/common/config"
	"czloapi/model"
	"czloapi/types"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/datatypes"
)

func intPtr(value int) *int {
	return &value
}

func floatPtr(value float64) *float64 {
	return &value
}

func TestQuotaGetLogMetaMergesReasoningMetadata(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	model.PricingInstance = &model.Pricing{Prices: map[string]*model.Price{}}

	budgetTokens := 4096
	c.Set(types.LogReasoningMetadataContextKey, &types.LogReasoningMetadata{
		Enabled:        true,
		Level:          "",
		ProviderFamily: types.LogReasoningProviderClaude,
		Mode:           types.LogReasoningModeBudgetTokens,
		BudgetTokens:   &budgetTokens,
		RequestedVia:   types.LogReasoningViaClaudeNative,
	})

	quota := NewQuota(c, "claude-3-7-sonnet", 100)
	meta := quota.GetLogMeta(nil)

	reasoning, ok := meta["reasoning"].(*types.LogReasoningMetadata)
	if assert.True(t, ok) && assert.NotNil(t, reasoning) {
		assert.Equal(t, "", reasoning.Level)
		assert.Equal(t, types.LogReasoningProviderClaude, reasoning.ProviderFamily)
		if assert.NotNil(t, reasoning.BudgetTokens) {
			assert.Equal(t, 4096, *reasoning.BudgetTokens)
		}
	}
}

func TestQuotaGetTotalQuotaUsesDirectUSDPerMillion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set("group_ratio", 2.0)

	extraRatios := datatypes.NewJSONType(map[string]float64{
		config.UsageExtraCache: 2.5,
	})
	model.PricingInstance = &model.Pricing{Prices: map[string]*model.Price{
		"test-model": {
			Model:       "test-model",
			Type:        model.TokensPriceType,
			ChannelType: 1,
			Input:       5,
			Output:      15,
			ExtraRatios: &extraRatios,
		},
	}}

	quota := NewQuota(c, "test-model", 0)
	usage := &types.Usage{
		PromptTokens:     100000,
		CompletionTokens: 50000,
		TotalTokens:      150000,
		ExtraTokens: map[string]int{
			config.UsageExtraCache: 20000,
		},
	}

	assert.Equal(t, 2600000, quota.GetTotalQuotaByUsage(usage))
}

func TestQuotaGetLogMetaIncludesBillingRulesAndBreakdown(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set("group_ratio", 1.0)

	billingRules := datatypes.NewJSONType([]model.BillingRule{
		{
			Name:     "long-context",
			Priority: 100,
			Strategy: model.BillingRuleStrategyOverride,
			Match: model.BillingRuleMatch{
				PromptTokensGT: intPtr(200000),
			},
			Input:  floatPtr(5),
			Output: floatPtr(15),
		},
	})

	model.PricingInstance = &model.Pricing{Prices: map[string]*model.Price{
		"test-model": {
			Model:        "test-model",
			Type:         model.TokensPriceType,
			ChannelType:  1,
			Input:        2.5,
			Output:       10,
			BillingRules: &billingRules,
		},
	}}

	quota := NewQuota(c, "test-model", 250000, model.NewBillingContext(250000, 350000))
	usage := &types.Usage{
		PromptTokens:     250000,
		CompletionTokens: 100000,
		TotalTokens:      350000,
	}

	meta := quota.GetLogMeta(usage)

	assert.Equal(t, 2.5, meta["original_input_price"])
	assert.Equal(t, 10.0, meta["original_output_price"])
	assert.Equal(t, 5.0, meta["input_price"])
	assert.Equal(t, 15.0, meta["output_price"])

	billingContext, ok := meta["billing_context"].(model.BillingContext)
	if assert.True(t, ok) {
		assert.Equal(t, 250000, billingContext.PromptTokens)
		assert.Equal(t, 350000, billingContext.RequestTokens)
	}

	rules, ok := meta["billing_rules"].([]model.BillingRuleLog)
	if assert.True(t, ok) && assert.Len(t, rules, 1) {
		assert.Equal(t, "long-context", rules[0].Name)
	}

	breakdown, ok := meta["billing_breakdown"].([]BillingBreakdownItem)
	if assert.True(t, ok) && assert.Len(t, breakdown, 2) {
		assert.Equal(t, "input", breakdown[0].Metric)
		assert.Equal(t, 250000, breakdown[0].Quantity)
		assert.Equal(t, "output", breakdown[1].Metric)
		assert.Equal(t, 100000, breakdown[1].Quantity)
	}
}
