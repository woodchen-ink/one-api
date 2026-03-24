package model

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"czloapi/common/config"
)

type openAIPriceSyncProvider struct{}

type openAILongContextRule struct {
	Threshold    int
	InputFactor  float64
	OutputFactor float64
}

func newOpenAIPriceSyncProvider() PriceSyncProvider {
	return &openAIPriceSyncProvider{}
}

func (p *openAIPriceSyncProvider) Key() string {
	return "openai"
}

func (p *openAIPriceSyncProvider) Name() string {
	return "OpenAI"
}

func (p *openAIPriceSyncProvider) ChannelType() int {
	return config.ChannelTypeOpenAI
}

func (p *openAIPriceSyncProvider) SourceURL() string {
	return "https://developers.openai.com/api/docs/pricing.md"
}

func (p *openAIPriceSyncProvider) Fetch(ctx context.Context) ([]byte, error) {
	urls := []string{
		p.SourceURL(),
		"https://developers.openai.com/api/docs/pricing",
	}

	client := &http.Client{Timeout: 20 * time.Second}
	var lastErr error
	for _, url := range urls {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", "czloapi-price-sync/1.0")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			lastErr = readErr
			continue
		}
		if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusBadRequest {
			lastErr = fmt.Errorf("unexpected status %d from %s", resp.StatusCode, url)
			continue
		}

		return body, nil
	}

	if lastErr == nil {
		lastErr = errors.New("failed to fetch provider pricing document")
	}
	return nil, lastErr
}

func (p *openAIPriceSyncProvider) Parse(raw []byte) ([]PriceSyncDraftRow, error) {
	content := strings.ReplaceAll(string(raw), "\r\n", "\n")
	panes := extractOpenAIStandardPricePanes(content)
	rows := make([]PriceSyncDraftRow, 0)
	seenModels := make(map[string]bool)

	for _, pane := range panes {
		paneRows, err := parseOpenAIStandardPaneRows(pane, p.ChannelType())
		if err != nil {
			return nil, err
		}

		for _, row := range paneRows {
			if seenModels[row.SourceModel] {
				continue
			}
			seenModels[row.SourceModel] = true
			rows = append(rows, row)
		}
	}

	if len(rows) == 0 {
		return nil, errors.New("pricing table not found in provider document")
	}

	return rows, nil
}

func (p *openAIPriceSyncProvider) FilterModelOptions(options []string) []string {
	filtered := make([]string, 0)
	for _, option := range options {
		if isOpenAIPriceSyncModelOption(option) {
			filtered = append(filtered, option)
		}
	}

	sort.Strings(filtered)
	return filtered
}

func (p *openAIPriceSyncProvider) SuggestModel(sourceModel string, options []string) string {
	if len(options) == 0 {
		return ""
	}

	normalizedSource := normalizeOpenAIPriceSyncModelName(sourceModel)
	if normalizedSource == "" {
		return ""
	}

	for _, option := range options {
		if normalizeOpenAIPriceSyncModelName(option) == normalizedSource {
			return option
		}
	}

	candidates := make([]string, 0)
	for _, option := range options {
		normalizedOption := normalizeOpenAIPriceSyncModelName(option)
		if strings.HasPrefix(normalizedOption, normalizedSource) || strings.HasPrefix(normalizedSource, normalizedOption) {
			candidates = append(candidates, option)
		}
	}

	if len(candidates) == 1 {
		return candidates[0]
	}

	return ""
}

var openAIPriceSyncRowPattern = regexp.MustCompile(`\[\s*"([^"]+)"\s*,\s*([^,\]\n]+|"(?:[^"\\]|\\.)*")\s*,\s*([^,\]\n]+|"(?:[^"\\]|\\.)*")\s*,\s*([^,\]\n]+|"(?:[^"\\]|\\.)*")\s*\]`)
var openAIPriceSyncAnnotationPattern = regexp.MustCompile(`\s*\([^)]*\)\s*$`)
var openAIPriceSyncContextLengthPattern = regexp.MustCompile(`(?i)<\s*([0-9]+(?:\.[0-9]+)?)\s*([kmb])\s+context\s+length`)

var openAILongContextRules = map[string]openAILongContextRule{
	"gpt-5.4": {
		Threshold:    272000,
		InputFactor:  2,
		OutputFactor: 1.5,
	},
	"gpt-5.4-pro": {
		Threshold:    272000,
		InputFactor:  2,
		OutputFactor: 1.5,
	},
}

func extractOpenAIStandardPricePanes(content string) []string {
	segments := strings.Split(content, `<div data-content-switcher-pane data-value="standard">`)
	if len(segments) <= 1 {
		return nil
	}

	panes := make([]string, 0, len(segments)-1)
	for _, segment := range segments[1:] {
		end := len(segment)
		for _, marker := range []string{
			`<div data-content-switcher-pane data-value="batch"`,
			`<div data-content-switcher-pane data-value="flex"`,
			`<div data-content-switcher-pane data-value="priority"`,
		} {
			index := strings.Index(segment, marker)
			if index >= 0 && index < end {
				end = index
			}
		}

		pane := strings.TrimSpace(segment[:end])
		if pane != "" {
			panes = append(panes, pane)
		}
	}

	return panes
}

func parseOpenAIStandardPaneRows(pane string, channelType int) ([]PriceSyncDraftRow, error) {
	matches := openAIPriceSyncRowPattern.FindAllStringSubmatch(pane, -1)
	if len(matches) == 0 {
		return nil, nil
	}

	rows := make([]PriceSyncDraftRow, 0, len(matches))
	for _, match := range matches {
		if len(match) != 5 {
			continue
		}

		row, ok, err := buildOpenAIPriceSyncDraftRow(match[1], match[2], match[3], match[4], channelType)
		if err != nil {
			return nil, err
		}
		if !ok {
			continue
		}

		rows = append(rows, row)
	}

	return rows, nil
}

func buildOpenAIPriceSyncDraftRow(sourceModel string, inputValue string, cacheValue string, outputValue string, channelType int) (PriceSyncDraftRow, bool, error) {
	input, err := parseOpenAIPriceSyncAmount(inputValue)
	if err != nil {
		return PriceSyncDraftRow{}, false, fmt.Errorf("parse %s input price: %w", sourceModel, err)
	}

	cachedInput, err := parseOpenAIPriceSyncAmount(cacheValue)
	if err != nil {
		return PriceSyncDraftRow{}, false, fmt.Errorf("parse %s cached input price: %w", sourceModel, err)
	}

	output, err := parseOpenAIPriceSyncAmount(outputValue)
	if err != nil {
		return PriceSyncDraftRow{}, false, fmt.Errorf("parse %s output price: %w", sourceModel, err)
	}

	row := PriceSyncDraftRow{
		SourceModel: strings.TrimSpace(sourceModel),
		Type:        TokensPriceType,
		ChannelType: channelType,
		Input:       input,
		Output:      output,
	}
	if cachedInput > 0 {
		row.ExtraRatios = map[string]float64{
			config.UsageExtraCache: cachedInput,
		}
	}
	row.ExtraRatios = normalizePriceSyncExtraRatios(row.ExtraRatios)
	row.BillingRules = buildOpenAILongContextBillingRules(row)

	if row.Input <= 0 && row.Output <= 0 && len(row.ExtraRatios) == 0 && len(row.BillingRules) == 0 {
		return PriceSyncDraftRow{}, false, nil
	}

	return row, true, nil
}

func parseOpenAIPriceSyncAmount(value string) (float64, error) {
	cleaned := strings.TrimSpace(value)
	if cleaned == "" {
		return 0, nil
	}

	if strings.HasPrefix(cleaned, "\"") && strings.HasSuffix(cleaned, "\"") {
		unquoted, err := strconv.Unquote(cleaned)
		if err != nil {
			return 0, err
		}
		cleaned = strings.TrimSpace(unquoted)
	}

	switch strings.ToLower(cleaned) {
	case "", "-", "null", "free":
		return 0, nil
	}

	amount, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0, err
	}

	return amount, nil
}

func isOpenAIPriceSyncModelOption(model string) bool {
	normalized := normalizeOpenAIPriceSyncModelName(model)
	if normalized == "" {
		return false
	}

	switch {
	case strings.HasPrefix(normalized, "gpt-"),
		strings.HasPrefix(normalized, "o1"),
		strings.HasPrefix(normalized, "o3"),
		strings.HasPrefix(normalized, "o4"),
		strings.HasPrefix(normalized, "text-embedding-"),
		strings.HasPrefix(normalized, "omni-moderation"),
		strings.HasPrefix(normalized, "text-moderation"),
		strings.HasPrefix(normalized, "computer-use-preview"),
		normalized == "davinci-002",
		normalized == "babbage-002":
		return true
	default:
		return false
	}
}

func normalizeOpenAIPriceSyncModelName(model string) string {
	normalized := strings.TrimSpace(strings.ToLower(model))
	if normalized == "" {
		return ""
	}

	normalized = openAIPriceSyncAnnotationPattern.ReplaceAllString(normalized, "")
	return strings.TrimSpace(normalized)
}

func buildOpenAILongContextBillingRules(row PriceSyncDraftRow) []BillingRule {
	normalizedModel := normalizeOpenAIPriceSyncModelName(row.SourceModel)
	ruleConfig, ok := openAILongContextRules[normalizedModel]
	if !ok {
		return nil
	}

	threshold := parseOpenAIContextLengthThreshold(row.SourceModel)
	if threshold <= 0 || threshold != ruleConfig.Threshold {
		return nil
	}

	billingRule := BillingRule{
		Name:     fmt.Sprintf("prompt_tokens_gt_%d_long_context", threshold),
		Priority: threshold,
		Strategy: BillingRuleStrategyOverride,
		Match: BillingRuleMatch{
			PromptTokensGT: intPointer(threshold),
		},
	}

	if row.Input > 0 && ruleConfig.InputFactor > 0 {
		billingRule.Input = floatPointer(row.Input * ruleConfig.InputFactor)
	}
	if row.Output > 0 && ruleConfig.OutputFactor > 0 {
		billingRule.Output = floatPointer(row.Output * ruleConfig.OutputFactor)
	}

	if billingRule.Input == nil && billingRule.Output == nil {
		return nil
	}

	return []BillingRule{billingRule}
}

func parseOpenAIContextLengthThreshold(sourceModel string) int {
	matches := openAIPriceSyncContextLengthPattern.FindStringSubmatch(sourceModel)
	if len(matches) != 3 {
		return 0
	}

	value, err := strconv.ParseFloat(matches[1], 64)
	if err != nil {
		return 0
	}

	multiplier := 1
	switch strings.ToLower(matches[2]) {
	case "k":
		multiplier = 1000
	case "m":
		multiplier = 1000 * 1000
	case "b":
		multiplier = 1000 * 1000 * 1000
	default:
		return 0
	}

	return int(value * float64(multiplier))
}
