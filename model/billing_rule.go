package model

import (
	"fmt"
	"czloapi/common/config"
	"sort"
	"strings"
)

const (
	BillingRuleStrategyOverride = "override"
	BillingRuleStrategyMultiply = "multiply"
)

type BillingContext struct {
	PromptTokens  int `json:"prompt_tokens"`
	RequestTokens int `json:"request_tokens"`
}

type BillingRuleMatch struct {
	PromptTokensGT  *int `json:"prompt_tokens_gt,omitempty"`
	PromptTokensGTE *int `json:"prompt_tokens_gte,omitempty"`
	PromptTokensLT  *int `json:"prompt_tokens_lt,omitempty"`
	PromptTokensLTE *int `json:"prompt_tokens_lte,omitempty"`

	RequestTokensGT  *int `json:"request_tokens_gt,omitempty"`
	RequestTokensGTE *int `json:"request_tokens_gte,omitempty"`
	RequestTokensLT  *int `json:"request_tokens_lt,omitempty"`
	RequestTokensLTE *int `json:"request_tokens_lte,omitempty"`
}

type BillingRule struct {
	Name        string             `json:"name,omitempty"`
	Priority    int                `json:"priority,omitempty"`
	Strategy    string             `json:"strategy,omitempty"`
	Match       BillingRuleMatch   `json:"match,omitempty"`
	Input       *float64           `json:"input,omitempty"`
	Output      *float64           `json:"output,omitempty"`
	ExtraRatios map[string]float64 `json:"extra_ratios,omitempty"`
}

type BillingRuleLog struct {
	Name        string             `json:"name,omitempty"`
	Priority    int                `json:"priority,omitempty"`
	Strategy    string             `json:"strategy,omitempty"`
	Match       BillingRuleMatch   `json:"match,omitempty"`
	Input       *float64           `json:"input,omitempty"`
	Output      *float64           `json:"output,omitempty"`
	ExtraRatios map[string]float64 `json:"extra_ratios,omitempty"`
}

type BillingResolution struct {
	Context BillingContext `json:"context"`

	BaseInput       float64            `json:"base_input"`
	BaseOutput      float64            `json:"base_output"`
	BaseExtraRatios map[string]float64 `json:"base_extra_ratios,omitempty"`

	Input       float64            `json:"input"`
	Output      float64            `json:"output"`
	ExtraRatios map[string]float64 `json:"extra_ratios,omitempty"`

	MatchedRules []BillingRuleLog `json:"matched_rules,omitempty"`
}

func NewBillingContext(promptTokens, requestTokens int) BillingContext {
	if promptTokens < 0 {
		promptTokens = 0
	}
	if requestTokens < 0 {
		requestTokens = 0
	}
	if requestTokens < promptTokens {
		requestTokens = promptTokens
	}

	return BillingContext{
		PromptTokens:  promptTokens,
		RequestTokens: requestTokens,
	}
}

func (m BillingRuleMatch) IsEmpty() bool {
	return m.PromptTokensGT == nil &&
		m.PromptTokensGTE == nil &&
		m.PromptTokensLT == nil &&
		m.PromptTokensLTE == nil &&
		m.RequestTokensGT == nil &&
		m.RequestTokensGTE == nil &&
		m.RequestTokensLT == nil &&
		m.RequestTokensLTE == nil
}

func (m BillingRuleMatch) Matches(ctx BillingContext) bool {
	if m.PromptTokensGT != nil && ctx.PromptTokens <= *m.PromptTokensGT {
		return false
	}
	if m.PromptTokensGTE != nil && ctx.PromptTokens < *m.PromptTokensGTE {
		return false
	}
	if m.PromptTokensLT != nil && ctx.PromptTokens >= *m.PromptTokensLT {
		return false
	}
	if m.PromptTokensLTE != nil && ctx.PromptTokens > *m.PromptTokensLTE {
		return false
	}
	if m.RequestTokensGT != nil && ctx.RequestTokens <= *m.RequestTokensGT {
		return false
	}
	if m.RequestTokensGTE != nil && ctx.RequestTokens < *m.RequestTokensGTE {
		return false
	}
	if m.RequestTokensLT != nil && ctx.RequestTokens >= *m.RequestTokensLT {
		return false
	}
	if m.RequestTokensLTE != nil && ctx.RequestTokens > *m.RequestTokensLTE {
		return false
	}

	return true
}

func (m BillingRuleMatch) Summary() string {
	parts := make([]string, 0, 8)
	appendPart := func(name string, value *int, op string) {
		if value == nil {
			return
		}
		parts = append(parts, fmt.Sprintf("%s %s %d", name, op, *value))
	}

	appendPart("prompt_tokens", m.PromptTokensGT, ">")
	appendPart("prompt_tokens", m.PromptTokensGTE, ">=")
	appendPart("prompt_tokens", m.PromptTokensLT, "<")
	appendPart("prompt_tokens", m.PromptTokensLTE, "<=")
	appendPart("request_tokens", m.RequestTokensGT, ">")
	appendPart("request_tokens", m.RequestTokensGTE, ">=")
	appendPart("request_tokens", m.RequestTokensLT, "<")
	appendPart("request_tokens", m.RequestTokensLTE, "<=")

	return strings.Join(parts, ", ")
}

func (r *BillingRule) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Strategy = strings.TrimSpace(strings.ToLower(r.Strategy))
	if r.Strategy == "" {
		r.Strategy = BillingRuleStrategyOverride
	}
	if len(r.ExtraRatios) == 0 {
		r.ExtraRatios = nil
	}
}

func (r BillingRule) Validate(index int) error {
	if r.Strategy != BillingRuleStrategyOverride && r.Strategy != BillingRuleStrategyMultiply {
		return fmt.Errorf("billing_rules[%d].strategy must be override or multiply", index)
	}
	if r.Match.IsEmpty() {
		return fmt.Errorf("billing_rules[%d].match is required", index)
	}
	if r.Input == nil && r.Output == nil && len(r.ExtraRatios) == 0 {
		return fmt.Errorf("billing_rules[%d] must configure at least one price field", index)
	}
	if r.Input != nil && *r.Input < 0 {
		return fmt.Errorf("billing_rules[%d].input cannot be negative", index)
	}
	if r.Output != nil && *r.Output < 0 {
		return fmt.Errorf("billing_rules[%d].output cannot be negative", index)
	}
	for key, value := range r.ExtraRatios {
		if strings.TrimSpace(key) == "" {
			return fmt.Errorf("billing_rules[%d].extra_ratios key cannot be empty", index)
		}
		if value < 0 {
			return fmt.Errorf("billing_rules[%d].extra_ratios[%s] cannot be negative", index, key)
		}
	}

	return nil
}

func (p *Price) GetBillingRules() []BillingRule {
	rules := []BillingRule(nil)
	if p.BillingRules != nil {
		rules = p.BillingRules.Data()
	}
	if len(rules) == 0 {
		rules = getImplicitBillingRulesForModel(p.Model)
	}
	if len(rules) == 0 {
		return nil
	}

	copied := make([]BillingRule, len(rules))
	copy(copied, rules)
	for i := range copied {
		copied[i].Normalize()
		if len(copied[i].ExtraRatios) > 0 {
			copied[i].ExtraRatios = cloneFloatMap(copied[i].ExtraRatios)
		}
	}
	return copied
}

func getImplicitBillingRulesForModel(modelName string) []BillingRule {
	switch {
	case strings.HasPrefix(modelName, "gpt-5.4-pro"), strings.HasPrefix(modelName, "gpt-5.4"):
		return []BillingRule{
			{
				Name:     "builtin-openai-long-context",
				Priority: 100,
				Strategy: BillingRuleStrategyMultiply,
				Match: BillingRuleMatch{
					PromptTokensGT: intPtr(272000),
				},
				Input:  floatPtr(2),
				Output: floatPtr(1.5),
				ExtraRatios: map[string]float64{
					config.UsageExtraCache:      2,
					config.UsageExtraCachedRead: 2,
				},
			},
		}
	case strings.HasPrefix(modelName, "gemini-2.5-pro"):
		return []BillingRule{
			{
				Name:     "builtin-gemini-long-prompt",
				Priority: 100,
				Strategy: BillingRuleStrategyMultiply,
				Match: BillingRuleMatch{
					PromptTokensGT: intPtr(200000),
				},
				Input:  floatPtr(2),
				Output: floatPtr(1.5),
				ExtraRatios: map[string]float64{
					config.UsageExtraCache:       2,
					config.UsageExtraCachedWrite: 2,
				},
			},
		}
	default:
		return nil
	}
}

func (p *Price) ValidateBillingRules() error {
	for index, rule := range p.GetBillingRules() {
		if err := rule.Validate(index); err != nil {
			return err
		}
	}
	return nil
}

func (p *Price) ResolveBilling(ctx BillingContext) *BillingResolution {
	resolution := &BillingResolution{
		Context:         ctx,
		BaseInput:       p.GetInput(),
		BaseOutput:      p.GetOutput(),
		BaseExtraRatios: cloneFloatMap(p.GetExplicitExtraRatios()),
		Input:           p.GetInput(),
		Output:          p.GetOutput(),
		ExtraRatios:     cloneFloatMap(p.GetExplicitExtraRatios()),
	}

	rules := p.GetBillingRules()
	if len(rules) == 0 {
		return resolution
	}

	matchedRules := make([]BillingRule, 0, len(rules))
	for _, rule := range rules {
		if rule.Match.Matches(ctx) {
			matchedRules = append(matchedRules, rule)
			resolution.MatchedRules = append(resolution.MatchedRules, BillingRuleLog{
				Name:        rule.Name,
				Priority:    rule.Priority,
				Strategy:    rule.Strategy,
				Match:       rule.Match,
				Input:       rule.Input,
				Output:      rule.Output,
				ExtraRatios: cloneFloatMap(rule.ExtraRatios),
			})
		}
	}
	if len(matchedRules) == 0 {
		return resolution
	}

	sort.SliceStable(matchedRules, func(i, j int) bool {
		return matchedRules[i].Priority < matchedRules[j].Priority
	})

	for _, rule := range matchedRules {
		if rule.Strategy == BillingRuleStrategyOverride {
			resolution.applyOverride(rule)
		}
	}
	for _, rule := range matchedRules {
		if rule.Strategy == BillingRuleStrategyMultiply {
			resolution.applyMultiply(rule)
		}
	}

	return resolution
}

func (r *BillingResolution) GetExtraPrice(key string) float64 {
	if r.ExtraRatios != nil {
		if value, ok := r.ExtraRatios[key]; ok {
			return value
		}
	}

	basePrice := r.Output
	if GetExtraPriceUsesInputPrice(key) {
		basePrice = r.Input
	}

	ratio, ok := defaultExtraPriceFactor[key]
	if !ok {
		return basePrice
	}

	return basePrice * ratio
}

func (r *BillingResolution) applyOverride(rule BillingRule) {
	if rule.Input != nil {
		r.Input = *rule.Input
	}
	if rule.Output != nil {
		r.Output = *rule.Output
	}
	if len(rule.ExtraRatios) > 0 {
		if r.ExtraRatios == nil {
			r.ExtraRatios = make(map[string]float64)
		}
		for key, value := range rule.ExtraRatios {
			r.ExtraRatios[key] = value
		}
	}
}

func (r *BillingResolution) applyMultiply(rule BillingRule) {
	if rule.Input != nil {
		r.Input *= *rule.Input
	}
	if rule.Output != nil {
		r.Output *= *rule.Output
	}
	if len(rule.ExtraRatios) > 0 {
		if r.ExtraRatios == nil {
			r.ExtraRatios = make(map[string]float64)
		}
		for key, value := range rule.ExtraRatios {
			r.ExtraRatios[key] = r.GetExtraPrice(key) * value
		}
	}
}

func cloneFloatMap(source map[string]float64) map[string]float64 {
	if len(source) == 0 {
		return nil
	}

	target := make(map[string]float64, len(source))
	for key, value := range source {
		target[key] = value
	}

	return target
}

func intPtr(value int) *int {
	return &value
}

func floatPtr(value float64) *float64 {
	return &value
}
