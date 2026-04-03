package model

import (
	"czloapi/common/config"
	"fmt"
	"sort"

	"github.com/shopspring/decimal"
	"gorm.io/datatypes"
)

// ProviderRatioRule declares an extra multiplier for one model provider.
type ProviderRatioRule struct {
	ChannelType int     `json:"channel_type"`
	Ratio       float64 `json:"ratio"`
}

// GroupBillingRatio captures the pricing multipliers resolved for one request.
type GroupBillingRatio struct {
	BaseGroupRatio      float64 `json:"base_group_ratio"`
	ProviderRatio       float64 `json:"provider_ratio"`
	EffectiveGroupRatio float64 `json:"effective_group_ratio"`
	ChannelType         int     `json:"channel_type,omitempty"`
	BillingProvider     string  `json:"billing_provider,omitempty"`
}

func cloneProviderRatioRules(source []ProviderRatioRule) []ProviderRatioRule {
	if len(source) == 0 {
		return nil
	}

	target := make([]ProviderRatioRule, len(source))
	copy(target, source)
	return target
}

func normalizeProviderRatioRules(rules []ProviderRatioRule) []ProviderRatioRule {
	if len(rules) == 0 {
		return nil
	}

	normalized := cloneProviderRatioRules(rules)
	sort.SliceStable(normalized, func(i, j int) bool {
		return normalized[i].ChannelType < normalized[j].ChannelType
	})

	return normalized
}

// GetProviderRatioRules returns a cloned slice so callers cannot mutate cache state.
func (c *UserGroup) GetProviderRatioRules() []ProviderRatioRule {
	if c == nil || c.ProviderRatios == nil {
		return nil
	}

	return normalizeProviderRatioRules(c.ProviderRatios.Data())
}

// SetProviderRatioRules normalizes the stored provider multipliers for stable persistence.
func (c *UserGroup) SetProviderRatioRules(rules []ProviderRatioRule) {
	if c == nil {
		return
	}

	normalized := normalizeProviderRatioRules(rules)
	if len(normalized) == 0 {
		c.ProviderRatios = nil
		return
	}

	jsonData := datatypes.NewJSONType(normalized)
	c.ProviderRatios = &jsonData
}

// GetProviderRatio resolves the extra provider multiplier for one channel type.
func (c *UserGroup) GetProviderRatio(channelType int) float64 {
	if c == nil || channelType <= config.ChannelTypeUnknown {
		return 1
	}

	for _, rule := range c.GetProviderRatioRules() {
		if rule.ChannelType == channelType {
			return rule.Ratio
		}
	}

	return 1
}

// ValidateProviderRatios rejects duplicate or non-positive provider multipliers.
func (c *UserGroup) ValidateProviderRatios() error {
	seen := make(map[int]struct{})
	for index, rule := range c.GetProviderRatioRules() {
		if rule.ChannelType <= config.ChannelTypeUnknown {
			return fmt.Errorf("provider_ratios[%d].channel_type 必须大于 0", index)
		}
		if rule.Ratio <= 0 {
			return fmt.Errorf("provider_ratios[%d].ratio 必须大于 0", index)
		}
		if _, exists := seen[rule.ChannelType]; exists {
			return fmt.Errorf("provider_ratios[%d].channel_type 重复", index)
		}
		seen[rule.ChannelType] = struct{}{}
	}

	return nil
}

// ResolveBillingChannelType maps a billable model name back to the configured provider family.
func ResolveBillingChannelType(modelName string) int {
	if modelName == "" || PricingInstance == nil {
		return config.ChannelTypeUnknown
	}

	return PricingInstance.GetPrice(modelName).ChannelType
}

// GetBillingProviderName exposes the user-facing provider label for pricing and logs.
func GetBillingProviderName(channelType int) string {
	if channelType <= config.ChannelTypeUnknown || ModelOwnedBysInstance == nil {
		return ""
	}

	providerName := ModelOwnedBysInstance.GetName(channelType)
	if providerName == "" || providerName == UnknownOwnedBy {
		return ""
	}

	return providerName
}

// ResolveGroupBillingRatio resolves the final multiplier from user group plus provider surcharge.
func ResolveGroupBillingRatio(groupSymbol, modelName string) GroupBillingRatio {
	return ResolveGroupBillingRatioByChannelType(groupSymbol, ResolveBillingChannelType(modelName))
}

// ResolveGroupBillingRatioByChannelType applies provider surcharge directly from channel type.
func ResolveGroupBillingRatioByChannelType(groupSymbol string, channelType int) GroupBillingRatio {
	resolved := GroupBillingRatio{
		ProviderRatio:       1,
		EffectiveGroupRatio: 0,
		ChannelType:         channelType,
		BillingProvider:     GetBillingProviderName(channelType),
	}

	userGroup := GlobalUserGroupRatio.GetBySymbol(groupSymbol)
	if userGroup == nil {
		return resolved
	}

	resolved.BaseGroupRatio = userGroup.Ratio
	resolved.ProviderRatio = userGroup.GetProviderRatio(channelType)
	resolved.EffectiveGroupRatio = decimal.NewFromFloat(userGroup.Ratio).
		Mul(decimal.NewFromFloat(resolved.ProviderRatio)).
		InexactFloat64()

	return resolved
}
