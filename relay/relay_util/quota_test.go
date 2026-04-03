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

func withTestGroupPricingState(
	t *testing.T,
	groups map[string]*model.UserGroup,
	prices map[string]*model.Price,
	ownedBy map[int]*model.ModelOwnedBy,
) {
	oldPricing := model.PricingInstance
	oldGroupRatio := model.GlobalUserGroupRatio
	oldOwnedBy := model.ModelOwnedBysInstance

	model.PricingInstance = &model.Pricing{Prices: prices}
	model.GlobalUserGroupRatio = model.UserGroupRatio{UserGroup: groups}
	model.ModelOwnedBysInstance = &model.ModelOwnedBys{ModelOwnedBy: ownedBy}

	t.Cleanup(func() {
		model.PricingInstance = oldPricing
		model.GlobalUserGroupRatio = oldGroupRatio
		model.ModelOwnedBysInstance = oldOwnedBy
	})
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

func TestQuotaGetTotalQuotaAppliesProviderSpecificGroupRatio(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set("key_group", "Pro")

	providerRatios := datatypes.NewJSONType([]model.ProviderRatioRule{
		{ChannelType: config.ChannelTypeAnthropic, Ratio: 1.05},
	})
	withTestGroupPricingState(
		t,
		map[string]*model.UserGroup{
			"Pro": {
				Symbol:         "Pro",
				Ratio:          2.0,
				ProviderRatios: &providerRatios,
			},
		},
		map[string]*model.Price{
			"claude-test": {
				Model:       "claude-test",
				Type:        model.TokensPriceType,
				ChannelType: config.ChannelTypeAnthropic,
				Input:       5,
				Output:      15,
			},
		},
		map[int]*model.ModelOwnedBy{
			config.ChannelTypeAnthropic: {
				Id:   config.ChannelTypeAnthropic,
				Name: "Anthropic",
			},
		},
	)

	quota := NewQuota(c, "claude-test", 0)
	usage := &types.Usage{
		PromptTokens:     100000,
		CompletionTokens: 50000,
		TotalTokens:      150000,
	}

	assert.Equal(t, 2625000, quota.GetTotalQuotaByUsage(usage))

	meta := quota.GetLogMeta(usage)
	assert.InDelta(t, 2.0, meta["base_group_ratio"], 0.000001)
	assert.InDelta(t, 1.05, meta["provider_ratio"], 0.000001)
	assert.InDelta(t, 2.1, meta["effective_group_ratio"], 0.000001)
	assert.InDelta(t, 2.1, meta["group_ratio"], 0.000001)
	assert.Equal(t, "Anthropic", meta["billing_provider"])
}

func TestQuotaUsesProviderRatioFromBackupGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set("key_group", "Backup")
	c.Set("key_backup_group", "Backup")
	c.Set("is_backupGroup", true)

	providerRatios := datatypes.NewJSONType([]model.ProviderRatioRule{
		{ChannelType: config.ChannelTypeAnthropic, Ratio: 1.1},
	})
	withTestGroupPricingState(
		t,
		map[string]*model.UserGroup{
			"Backup": {
				Symbol:         "Backup",
				Ratio:          1.5,
				ProviderRatios: &providerRatios,
			},
		},
		map[string]*model.Price{
			"claude-test": {
				Model:       "claude-test",
				Type:        model.TokensPriceType,
				ChannelType: config.ChannelTypeAnthropic,
				Input:       2,
				Output:      8,
			},
		},
		map[int]*model.ModelOwnedBy{
			config.ChannelTypeAnthropic: {
				Id:   config.ChannelTypeAnthropic,
				Name: "Anthropic",
			},
		},
	)

	quota := NewQuota(c, "claude-test", 0)
	usage := &types.Usage{
		PromptTokens:     1000,
		CompletionTokens: 500,
		TotalTokens:      1500,
	}

	assert.Equal(t, 9900, quota.GetTotalQuotaByUsage(usage))

	meta := quota.GetLogMeta(usage)
	assert.Equal(t, "Backup", meta["group_name"])
	assert.Equal(t, "Backup", meta["backup_group_name"])
	assert.Equal(t, true, meta["is_backup_group"])
	assert.InDelta(t, 1.5, meta["base_group_ratio"], 0.000001)
	assert.InDelta(t, 1.1, meta["provider_ratio"], 0.000001)
	assert.InDelta(t, 1.65, meta["effective_group_ratio"], 0.000001)
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

	assert.Equal(t, 2400000, quota.GetTotalQuotaByUsage(usage))
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

func TestQuotaGetTotalQuotaDoesNotDoubleChargeCachedPromptTokens(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set("group_ratio", 1.0)

	extraRatios := datatypes.NewJSONType(map[string]float64{
		config.UsageExtraCache: 0.5,
	})
	model.PricingInstance = &model.Pricing{Prices: map[string]*model.Price{
		"test-model": {
			Model:       "test-model",
			Type:        model.TokensPriceType,
			ChannelType: 1,
			Input:       2,
			Output:      8,
			ExtraRatios: &extraRatios,
		},
	}}

	quota := NewQuota(c, "test-model", 0)
	usage := &types.Usage{
		PromptTokens:     1000,
		CompletionTokens: 500,
		TotalTokens:      1500,
		PromptTokensDetails: types.PromptTokensDetails{
			CachedTokens: 400,
		},
	}

	// 非缓存输入 600 * 2 + 缓存输入 400 * 0.5 + 输出 500 * 8 = 5400
	assert.Equal(t, 5400, quota.GetTotalQuotaByUsage(usage))

	meta := quota.GetLogMeta(usage)
	breakdown, ok := meta["billing_breakdown"].([]BillingBreakdownItem)
	if assert.True(t, ok) && assert.Len(t, breakdown, 3) {
		assert.Equal(t, "input", breakdown[0].Metric)
		assert.Equal(t, 600, breakdown[0].Quantity)
		assert.Equal(t, config.UsageExtraCache, breakdown[2].Metric)
		assert.Equal(t, 400, breakdown[2].Quantity)
	}
}

func TestQuotaDoesNotDoubleChargeAudioTokens(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set("group_ratio", 1.0)

	extraRatios := datatypes.NewJSONType(map[string]float64{
		config.UsageExtraInputAudio:  40,
		config.UsageExtraOutputAudio: 20,
	})
	model.PricingInstance = &model.Pricing{Prices: map[string]*model.Price{
		"gpt-4o-audio-preview": {
			Model:       "gpt-4o-audio-preview",
			Type:        model.TokensPriceType,
			ChannelType: 1,
			Input:       2.5,
			Output:      10,
			ExtraRatios: &extraRatios,
		},
	}}

	quota := NewQuota(c, "gpt-4o-audio-preview", 0)
	usage := &types.Usage{
		PromptTokens:     1000,
		CompletionTokens: 800,
		TotalTokens:      1800,
		PromptTokensDetails: types.PromptTokensDetails{
			AudioTokens: 300,
		},
		CompletionTokensDetails: types.CompletionTokensDetails{
			AudioTokens: 200,
		},
	}

	// 输入: (1000-300)*2.5 = 1750, 输入音频: 300*40 = 12000
	// 输出: (800-200)*10 = 6000, 输出音频: 200*20 = 4000
	// 总计: 1750 + 12000 + 6000 + 4000 = 23750
	assert.Equal(t, 23750, quota.GetTotalQuotaByUsage(usage))

	meta := quota.GetLogMeta(usage)
	breakdown, ok := meta["billing_breakdown"].([]BillingBreakdownItem)
	if assert.True(t, ok) && assert.Len(t, breakdown, 4) {
		breakdownMap := make(map[string]BillingBreakdownItem)
		for _, item := range breakdown {
			breakdownMap[item.Metric] = item
		}
		assert.Equal(t, 700, breakdownMap["input"].Quantity)
		assert.Equal(t, 600, breakdownMap["output"].Quantity)
		assert.Equal(t, 300, breakdownMap[config.UsageExtraInputAudio].Quantity)
		assert.Equal(t, 200, breakdownMap[config.UsageExtraOutputAudio].Quantity)
	}
}

func TestQuotaDoesNotDoubleChargeReasoningTokens(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set("group_ratio", 1.0)

	extraRatios := datatypes.NewJSONType(map[string]float64{
		config.UsageExtraReasoning: 5.833,
	})
	model.PricingInstance = &model.Pricing{Prices: map[string]*model.Price{
		"test-reasoning": {
			Model:       "test-reasoning",
			Type:        model.TokensPriceType,
			ChannelType: 1,
			Input:       2,
			Output:      8,
			ExtraRatios: &extraRatios,
		},
	}}

	quota := NewQuota(c, "test-reasoning", 0)
	usage := &types.Usage{
		PromptTokens:     500,
		CompletionTokens: 1000,
		TotalTokens:      1500,
		CompletionTokensDetails: types.CompletionTokensDetails{
			ReasoningTokens: 600,
		},
	}

	// 输入: 500*2 = 1000
	// 输出: (1000-600)*8 = 3200, 推理: 600*5.833 = 3500 (向上取整)
	// 总计: 1000 + 3200 + 3500 = 7700
	assert.Equal(t, 7700, quota.GetTotalQuotaByUsage(usage))

	meta := quota.GetLogMeta(usage)
	breakdown, ok := meta["billing_breakdown"].([]BillingBreakdownItem)
	if assert.True(t, ok) && assert.Len(t, breakdown, 3) {
		breakdownMap := make(map[string]BillingBreakdownItem)
		for _, item := range breakdown {
			breakdownMap[item.Metric] = item
		}
		assert.Equal(t, 500, breakdownMap["input"].Quantity)
		assert.Equal(t, 400, breakdownMap["output"].Quantity)
		assert.Equal(t, 600, breakdownMap[config.UsageExtraReasoning].Quantity)
	}
}
