package model

import (
	"testing"

	"czloapi/common/config"

	"github.com/stretchr/testify/assert"
	"gorm.io/datatypes"
)

func intPtr(value int) *int {
	return &value
}

func floatPtr(value float64) *float64 {
	return &value
}

func TestPriceResolveBillingAppliesOverrideAndMultiplyRules(t *testing.T) {
	extraRatios := datatypes.NewJSONType(map[string]float64{
		config.UsageExtraCachedRead: 0.25,
	})
	billingRules := datatypes.NewJSONType([]BillingRule{
		{
			Name:     "long-context",
			Priority: 100,
			Strategy: BillingRuleStrategyOverride,
			Match: BillingRuleMatch{
				PromptTokensGT: intPtr(200000),
			},
			Input:  floatPtr(5),
			Output: floatPtr(15),
		},
		{
			Name:     "cached-read-premium",
			Priority: 10,
			Strategy: BillingRuleStrategyMultiply,
			Match: BillingRuleMatch{
				RequestTokensGT: intPtr(300000),
			},
			ExtraRatios: map[string]float64{
				config.UsageExtraCachedRead: 2,
			},
		},
	})

	price := &Price{
		Model:        "test-model",
		Type:         TokensPriceType,
		Input:        2.5,
		Output:       10,
		ExtraRatios:  &extraRatios,
		BillingRules: &billingRules,
	}

	resolution := price.ResolveBilling(NewBillingContext(250000, 350000))

	assert.Equal(t, 2.5, resolution.BaseInput)
	assert.Equal(t, 10.0, resolution.BaseOutput)
	assert.Equal(t, 5.0, resolution.Input)
	assert.Equal(t, 15.0, resolution.Output)
	assert.Equal(t, 0.5, resolution.GetExtraPrice(config.UsageExtraCachedRead))
	if assert.Len(t, resolution.MatchedRules, 2) {
		assert.Equal(t, "long-context", resolution.MatchedRules[0].Name)
		assert.Equal(t, "cached-read-premium", resolution.MatchedRules[1].Name)
	}
}
