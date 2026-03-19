package relay_util

import (
	"net/http/httptest"
	"testing"

	"one-api/common/config"
	"one-api/model"
	"one-api/types"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/datatypes"
)

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

	assert.Equal(t, 1300000, quota.GetTotalQuotaByUsage(usage))
}
