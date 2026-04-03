package model

import (
	"testing"

	"czloapi/common/config"

	"github.com/stretchr/testify/assert"
	"gorm.io/datatypes"
)

func TestResolveGroupBillingRatioAppliesProviderRatio(t *testing.T) {
	oldPricing := PricingInstance
	oldGroupRatio := GlobalUserGroupRatio
	oldOwnedBy := ModelOwnedBysInstance
	t.Cleanup(func() {
		PricingInstance = oldPricing
		GlobalUserGroupRatio = oldGroupRatio
		ModelOwnedBysInstance = oldOwnedBy
	})

	providerRatios := datatypes.NewJSONType([]ProviderRatioRule{
		{ChannelType: config.ChannelTypeAnthropic, Ratio: 1.05},
	})
	GlobalUserGroupRatio = UserGroupRatio{
		UserGroup: map[string]*UserGroup{
			"Pro": {
				Symbol:         "Pro",
				Ratio:          1.2,
				ProviderRatios: &providerRatios,
			},
		},
	}
	PricingInstance = &Pricing{
		Prices: map[string]*Price{
			"claude-3-7-sonnet": {
				Model:       "claude-3-7-sonnet",
				ChannelType: config.ChannelTypeAnthropic,
			},
		},
	}
	ModelOwnedBysInstance = &ModelOwnedBys{
		ModelOwnedBy: map[int]*ModelOwnedBy{
			config.ChannelTypeAnthropic: {
				Id:   config.ChannelTypeAnthropic,
				Name: "Anthropic",
			},
		},
	}

	resolved := ResolveGroupBillingRatio("Pro", "claude-3-7-sonnet")

	assert.Equal(t, 1.2, resolved.BaseGroupRatio)
	assert.Equal(t, 1.05, resolved.ProviderRatio)
	assert.Equal(t, 1.26, resolved.EffectiveGroupRatio)
	assert.Equal(t, config.ChannelTypeAnthropic, resolved.ChannelType)
	assert.Equal(t, "Anthropic", resolved.BillingProvider)
}

func TestResolveGroupBillingRatioFallsBackToBaseRatioWhenProviderRuleMissing(t *testing.T) {
	oldPricing := PricingInstance
	oldGroupRatio := GlobalUserGroupRatio
	t.Cleanup(func() {
		PricingInstance = oldPricing
		GlobalUserGroupRatio = oldGroupRatio
	})

	GlobalUserGroupRatio = UserGroupRatio{
		UserGroup: map[string]*UserGroup{
			"Lite": {
				Symbol: "Lite",
				Ratio:  1.5,
			},
		},
	}
	PricingInstance = &Pricing{
		Prices: map[string]*Price{
			"gpt-4o-mini": {
				Model:       "gpt-4o-mini",
				ChannelType: config.ChannelTypeOpenAI,
			},
		},
	}

	resolved := ResolveGroupBillingRatio("Lite", "gpt-4o-mini")

	assert.Equal(t, 1.5, resolved.BaseGroupRatio)
	assert.Equal(t, 1.0, resolved.ProviderRatio)
	assert.Equal(t, 1.5, resolved.EffectiveGroupRatio)
}

func TestUserGroupValidateProviderRatiosRejectsDuplicateChannelTypes(t *testing.T) {
	providerRatios := datatypes.NewJSONType([]ProviderRatioRule{
		{ChannelType: config.ChannelTypeAnthropic, Ratio: 1.05},
		{ChannelType: config.ChannelTypeAnthropic, Ratio: 1.1},
	})

	userGroup := &UserGroup{
		Symbol:         "Pro",
		Name:           "Pro",
		Ratio:          1.2,
		ProviderRatios: &providerRatios,
	}

	err := userGroup.ValidateProviderRatios()

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "channel_type 重复")
}
