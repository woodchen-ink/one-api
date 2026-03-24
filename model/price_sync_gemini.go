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

type geminiPriceSyncProvider struct{}

func newGeminiPriceSyncProvider() PriceSyncProvider {
	return &geminiPriceSyncProvider{}
}

func (p *geminiPriceSyncProvider) Key() string {
	return "gemini"
}

func (p *geminiPriceSyncProvider) Name() string {
	return "Google Gemini"
}

func (p *geminiPriceSyncProvider) ChannelType() int {
	return config.ChannelTypeGemini
}

func (p *geminiPriceSyncProvider) SourceURL() string {
	return "https://ai.google.dev/gemini-api/docs/pricing"
}

func (p *geminiPriceSyncProvider) Fetch(ctx context.Context) ([]byte, error) {
	urls := []string{
		"https://ai.google.dev/gemini-api/docs/pricing.md.txt",
		"https://ai.google.dev/gemini-api/docs/pricing.md.txt?hl=zh-cn",
		"https://ai.google.dev/gemini-api/docs/pricing.md.txt?hl=en",
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

func (p *geminiPriceSyncProvider) Parse(raw []byte) ([]PriceSyncDraftRow, error) {
	content := strings.ReplaceAll(string(raw), "\r\n", "\n")
	lines := strings.Split(content, "\n")

	rows := make([]PriceSyncDraftRow, 0)
	for index := 0; index < len(lines); index++ {
		line := strings.TrimSpace(lines[index])
		if !strings.HasPrefix(line, "## ") {
			continue
		}

		sectionEnd := len(lines)
		for probe := index + 1; probe < len(lines); probe++ {
			if strings.HasPrefix(strings.TrimSpace(lines[probe]), "## ") {
				sectionEnd = probe
				break
			}
		}

		sectionRows, err := p.parseSection(lines[index:sectionEnd])
		if err != nil {
			return nil, err
		}
		rows = append(rows, sectionRows...)
		index = sectionEnd - 1
	}

	if len(rows) == 0 {
		return nil, errors.New("pricing table not found in provider document")
	}

	return rows, nil
}

func (p *geminiPriceSyncProvider) parseSection(section []string) ([]PriceSyncDraftRow, error) {
	modelIDs := extractGeminiSectionModelIDs(section)
	if len(modelIDs) == 0 {
		return nil, nil
	}

	tableLines := extractGeminiStandardTable(section)
	if len(tableLines) == 0 {
		return nil, nil
	}

	rows, err := parseGeminiMarkdownTable(tableLines)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}

	draft, ok, err := p.buildDraftRow(modelIDs[0], rows)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, nil
	}

	result := make([]PriceSyncDraftRow, 0, len(modelIDs))
	for _, modelID := range modelIDs {
		row := draft
		row.SourceModel = modelID
		result = append(result, row)
	}

	return result, nil
}

func (p *geminiPriceSyncProvider) buildDraftRow(sourceModel string, rows map[string]string) (PriceSyncDraftRow, bool, error) {
	builder := &geminiDraftBuilder{
		row: PriceSyncDraftRow{
			Type:        TokensPriceType,
			ChannelType: p.ChannelType(),
		},
		rulesByThreshold: make(map[int]*BillingRule),
	}

	for label, value := range rows {
		switch {
		case strings.Contains(label, "input price"):
			if err := builder.applyInput(label, value); err != nil {
				return PriceSyncDraftRow{}, false, fmt.Errorf("parse %s input pricing: %w", sourceModel, err)
			}
		case strings.Contains(label, "output price"):
			if err := builder.applyOutput(label, value); err != nil {
				return PriceSyncDraftRow{}, false, fmt.Errorf("parse %s output pricing: %w", sourceModel, err)
			}
		case strings.Contains(label, "context caching price"):
			if err := builder.applyCache(label, value); err != nil {
				return PriceSyncDraftRow{}, false, fmt.Errorf("parse %s cache pricing: %w", sourceModel, err)
			}
		}
	}

	builder.finalizeRules()
	if !builder.hasSyncablePricing() {
		return PriceSyncDraftRow{}, false, nil
	}
	if builder.unsupported {
		return PriceSyncDraftRow{}, false, nil
	}

	builder.row.ExtraRatios = normalizePriceSyncExtraRatios(builder.row.ExtraRatios)
	return builder.row, true, nil
}

func (p *geminiPriceSyncProvider) FilterModelOptions(options []string) []string {
	filtered := make([]string, 0)
	for _, option := range options {
		lowerOption := strings.ToLower(option)
		switch {
		case strings.HasPrefix(lowerOption, "gemini-"),
			strings.HasPrefix(lowerOption, "imagen-"),
			strings.HasPrefix(lowerOption, "veo-"),
			strings.HasPrefix(lowerOption, "gemma-"):
			filtered = append(filtered, option)
		}
	}

	sort.Strings(filtered)
	return filtered
}

func (p *geminiPriceSyncProvider) SuggestModel(sourceModel string, options []string) string {
	if len(options) == 0 {
		return ""
	}

	normalizedSource := normalizeGeminiModelName(sourceModel)
	for _, option := range options {
		if normalizeGeminiModelName(option) == normalizedSource {
			return option
		}
	}

	for _, option := range options {
		normalizedOption := normalizeGeminiModelName(option)
		if strings.HasPrefix(normalizedOption, normalizedSource) || strings.HasPrefix(normalizedSource, normalizedOption) {
			return option
		}
	}

	return ""
}

type geminiDraftBuilder struct {
	row              PriceSyncDraftRow
	unsupported      bool
	rulesByThreshold map[int]*BillingRule
}

func (b *geminiDraftBuilder) hasSyncablePricing() bool {
	return b.row.Input > 0 || b.row.Output > 0 || len(b.row.ExtraRatios) > 0 || len(b.row.BillingRules) > 0
}

func (b *geminiDraftBuilder) applyInput(label string, value string) error {
	entries, err := parseGeminiPriceEntries(label, value)
	if err != nil {
		return err
	}

	defaultCategories := geminiLabelCategories(label)
	for _, entry := range entries {
		if entry.Storage || entry.Derived {
			continue
		}

		categories := entry.Categories
		if len(categories) == 0 {
			categories = defaultCategories
		}
		if hasGeminiUnsupportedVideoCategories(categories) {
			b.unsupported = true
			continue
		}

		switch {
		case isGeminiGeneralCategories(categories):
			b.setInputTier(entry)
		case containsGeminiCategory(categories, "audio"):
			b.setExtraTier(config.UsageExtraInputAudio, entry)
		case containsGeminiCategory(categories, "image"):
			b.setExtraTier(config.UsageExtraInputImageTokens, entry)
		case containsGeminiCategory(categories, "text"):
			b.setInputTier(entry)
		default:
			b.unsupported = true
		}
	}

	return nil
}

func (b *geminiDraftBuilder) applyOutput(label string, value string) error {
	entries, err := parseGeminiPriceEntries(label, value)
	if err != nil {
		return err
	}

	defaultCategories := geminiLabelCategories(label)
	applied := false
	for _, entry := range entries {
		if entry.Storage || entry.Derived {
			continue
		}

		categories := entry.Categories
		if len(categories) == 0 {
			categories = defaultCategories
		}
		if hasGeminiUnsupportedVideoCategories(categories) {
			b.unsupported = true
			continue
		}

		switch {
		case isGeminiGeneralCategories(categories):
			b.setOutputTier(entry)
			applied = true
		case containsGeminiCategory(categories, "audio"):
			b.setExtraTier(config.UsageExtraOutputAudio, entry)
			applied = true
		case containsGeminiCategory(categories, "image"):
			b.setExtraTier(config.UsageExtraOutputImageTokens, entry)
			applied = true
		case containsGeminiCategory(categories, "text"):
			b.setOutputTier(entry)
			applied = true
		default:
			b.unsupported = true
		}
	}
	if !applied && strings.Contains(strings.ToLower(value), "per image") {
		b.unsupported = true
	}

	return nil
}

func (b *geminiDraftBuilder) applyCache(label string, value string) error {
	entries, err := parseGeminiPriceEntries(label, value)
	if err != nil {
		return err
	}

	defaultCategories := geminiLabelCategories(label)
	for _, entry := range entries {
		if entry.Storage || entry.Derived {
			continue
		}

		categories := entry.Categories
		if len(categories) == 0 {
			categories = defaultCategories
		}
		if len(categories) == 0 || isGeminiGeneralCategories(categories) || containsGeminiCategory(categories, "text") {
			b.setExtraTier(config.UsageExtraCache, entry)
		}
	}

	return nil
}

func (b *geminiDraftBuilder) setInputTier(entry geminiPriceEntry) {
	if entry.PromptTokensGT == nil {
		b.row.Input = entry.Price
		return
	}

	b.ruleForThreshold(*entry.PromptTokensGT).Input = floatPointer(entry.Price)
}

func (b *geminiDraftBuilder) setOutputTier(entry geminiPriceEntry) {
	if entry.PromptTokensGT == nil {
		b.row.Output = entry.Price
		return
	}

	b.ruleForThreshold(*entry.PromptTokensGT).Output = floatPointer(entry.Price)
}

func (b *geminiDraftBuilder) setExtraTier(key string, entry geminiPriceEntry) {
	if b.row.ExtraRatios == nil {
		b.row.ExtraRatios = make(map[string]float64)
	}

	if entry.PromptTokensGT == nil {
		b.row.ExtraRatios[key] = entry.Price
		return
	}

	rule := b.ruleForThreshold(*entry.PromptTokensGT)
	if rule.ExtraRatios == nil {
		rule.ExtraRatios = make(map[string]float64)
	}
	rule.ExtraRatios[key] = entry.Price
}

func (b *geminiDraftBuilder) ruleForThreshold(threshold int) *BillingRule {
	rule, ok := b.rulesByThreshold[threshold]
	if ok {
		return rule
	}

	rule = &BillingRule{
		Name:     fmt.Sprintf("prompt_tokens_gt_%d", threshold),
		Priority: threshold,
		Strategy: BillingRuleStrategyOverride,
		Match: BillingRuleMatch{
			PromptTokensGT: intPointer(threshold),
		},
	}
	b.rulesByThreshold[threshold] = rule
	return rule
}

func (b *geminiDraftBuilder) finalizeRules() {
	if len(b.rulesByThreshold) == 0 {
		return
	}

	thresholds := make([]int, 0, len(b.rulesByThreshold))
	for threshold := range b.rulesByThreshold {
		thresholds = append(thresholds, threshold)
	}
	sort.Ints(thresholds)

	b.row.BillingRules = make([]BillingRule, 0, len(thresholds))
	for _, threshold := range thresholds {
		rule := b.rulesByThreshold[threshold]
		if rule == nil {
			continue
		}
		if rule.Input == nil && rule.Output == nil && len(rule.ExtraRatios) == 0 {
			continue
		}
		normalized := *rule
		normalized.ExtraRatios = normalizePriceSyncExtraRatios(normalized.ExtraRatios)
		b.row.BillingRules = append(b.row.BillingRules, normalized)
	}
}

type geminiPriceEntry struct {
	Price          float64
	Categories     []string
	PromptTokensGT *int
	Storage        bool
	Derived        bool
}

var geminiUSDPattern = regexp.MustCompile(`\$([0-9]+(?:\.[0-9]+)?)`)
var geminiPromptTierPattern = regexp.MustCompile(`prompts?\s*([<>]=?)\s*([0-9]+)(k)?`)
var geminiParentheticalPattern = regexp.MustCompile(`\(([^()]*)\)`)
var geminiCodePattern = regexp.MustCompile("`([^`]+)`")

func parseGeminiPriceEntries(label string, value string) ([]geminiPriceEntry, error) {
	cleaned := cleanGeminiMarkdownInline(value)
	matches := geminiUSDPattern.FindAllStringSubmatchIndex(cleaned, -1)
	if len(matches) == 0 {
		return nil, nil
	}

	entries := make([]geminiPriceEntry, 0, len(matches))
	for index, match := range matches {
		if len(match) < 4 {
			continue
		}

		price, err := strconv.ParseFloat(cleaned[match[2]:match[3]], 64)
		if err != nil {
			return nil, err
		}

		trailingEnd := len(cleaned)
		if index+1 < len(matches) {
			trailingEnd = matches[index+1][0]
		}
		trailing := strings.TrimSpace(cleaned[match[1]:trailingEnd])
		trailingLower := strings.ToLower(trailing)
		entry := geminiPriceEntry{
			Price:      price,
			Categories: extractGeminiCategories(trailingLower),
			Storage:    strings.Contains(trailingLower, "storage price"),
			Derived: (strings.Contains(trailingLower, "per ") && strings.Contains(trailingLower, " image")) ||
				strings.Contains(trailingLower, "per second") ||
				strings.Contains(trailingLower, "per frame"),
		}

		if strings.Contains(trailingLower, "equivalent to") && len(entry.Categories) == 0 {
			entry.Derived = true
		}

		if threshold, ok := extractGeminiPromptThreshold(trailingLower); ok {
			entry.PromptTokensGT = intPointer(threshold)
		}

		if len(entry.Categories) == 0 {
			entry.Categories = geminiLabelCategories(label)
		}

		entries = append(entries, entry)
	}

	return entries, nil
}

func extractGeminiPromptThreshold(value string) (int, bool) {
	match := geminiPromptTierPattern.FindStringSubmatch(value)
	if len(match) != 4 {
		return 0, false
	}
	if match[1] != ">" {
		return 0, false
	}

	threshold, err := strconv.Atoi(match[2])
	if err != nil {
		return 0, false
	}
	if match[3] == "k" {
		threshold *= 1000
	}

	return threshold, true
}

func extractGeminiCategories(value string) []string {
	match := geminiParentheticalPattern.FindStringSubmatch(value)
	if len(match) != 2 {
		return nil
	}

	raw := match[1]
	raw = strings.ReplaceAll(raw, "text and thinking", "text")
	raw = strings.ReplaceAll(raw, "text/image", "text / image")
	raw = strings.ReplaceAll(raw, "text,image", "text / image")
	raw = strings.ReplaceAll(raw, "images", "image")
	raw = strings.ReplaceAll(raw, "image-based grounding", "")
	raw = strings.ReplaceAll(raw, "grounding", "")
	raw = strings.ReplaceAll(raw, ",", " / ")

	parts := strings.Split(raw, "/")
	categories := make([]string, 0, len(parts))
	seen := make(map[string]bool)
	for _, part := range parts {
		candidate := strings.ToLower(strings.TrimSpace(part))
		switch candidate {
		case "text", "image", "video", "audio":
			if !seen[candidate] {
				categories = append(categories, candidate)
				seen[candidate] = true
			}
		}
	}

	if len(categories) == 0 {
		return nil
	}
	return categories
}

func extractGeminiSectionModelIDs(section []string) []string {
	modelSet := make(map[string]bool)
	modelIDs := make([]string, 0)

	limit := len(section)
	for index := 1; index < len(section); index++ {
		line := strings.TrimSpace(section[index])
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "### ") {
			limit = index
			break
		}
	}

	for index := 1; index < limit; index++ {
		matches := geminiCodePattern.FindAllStringSubmatch(section[index], -1)
		for _, match := range matches {
			if len(match) != 2 {
				continue
			}
			modelID := strings.TrimSpace(match[1])
			if modelID == "" || modelSet[modelID] {
				continue
			}
			modelIDs = append(modelIDs, modelID)
			modelSet[modelID] = true
		}
	}

	return modelIDs
}

func extractGeminiStandardTable(section []string) []string {
	for index := 0; index < len(section); index++ {
		if strings.TrimSpace(section[index]) != "### Standard" {
			continue
		}

		headerIndex := -1
		for probe := index + 1; probe < len(section); probe++ {
			line := strings.TrimSpace(section[probe])
			if strings.HasPrefix(line, "### ") || strings.HasPrefix(line, "## ") {
				break
			}
			if strings.HasPrefix(line, "|") {
				headerIndex = probe
				break
			}
		}
		if headerIndex == -1 {
			return nil
		}

		tableLines := make([]string, 0)
		for probe := headerIndex; probe < len(section); probe++ {
			line := strings.TrimSpace(section[probe])
			if !strings.HasPrefix(line, "|") {
				if len(tableLines) > 0 {
					break
				}
				continue
			}
			tableLines = append(tableLines, line)
		}
		return tableLines
	}

	return nil
}

func parseGeminiMarkdownTable(lines []string) (map[string]string, error) {
	if len(lines) < 3 {
		return nil, nil
	}

	headerColumns := parseClaudeMarkdownTableColumns(lines[0])
	if len(headerColumns) < 3 {
		return nil, errors.New("invalid standard pricing table")
	}
	if !strings.Contains(strings.ToLower(headerColumns[2]), "per 1m tokens") {
		return nil, nil
	}

	rows := make(map[string]string)
	for _, line := range lines[2:] {
		columns := parseClaudeMarkdownTableColumns(line)
		if len(columns) < 3 {
			continue
		}

		label := strings.ToLower(cleanGeminiMarkdownInline(columns[0]))
		value := cleanGeminiMarkdownInline(columns[2])
		rows[label] = value
	}

	return rows, nil
}

func cleanGeminiMarkdownInline(value string) string {
	cleaned := cleanClaudeMarkdownInline(value)
	cleaned = strings.ReplaceAll(cleaned, "\\<=", "<=")
	cleaned = strings.ReplaceAll(cleaned, "\\>=", ">=")
	cleaned = strings.ReplaceAll(cleaned, "\\<", "<")
	cleaned = strings.ReplaceAll(cleaned, "\\>", ">")
	cleaned = strings.ReplaceAll(cleaned, "^*^", "")
	cleaned = strings.ReplaceAll(cleaned, `\*`, "")
	cleaned = strings.ReplaceAll(cleaned, `\_`, "_")
	cleaned = strings.Join(strings.Fields(cleaned), " ")
	return strings.TrimSpace(cleaned)
}

func geminiLabelCategories(label string) []string {
	lowerLabel := strings.ToLower(cleanGeminiMarkdownInline(label))
	switch {
	case strings.Contains(lowerLabel, "text input price"):
		return []string{"text"}
	case strings.Contains(lowerLabel, "audio input price"):
		return []string{"audio"}
	case strings.Contains(lowerLabel, "image input price"):
		return []string{"image"}
	case strings.Contains(lowerLabel, "video input price"):
		return []string{"video"}
	case strings.Contains(lowerLabel, "text output price"):
		return []string{"text"}
	case strings.Contains(lowerLabel, "audio output price"):
		return []string{"audio"}
	case strings.Contains(lowerLabel, "image output price"):
		return []string{"image"}
	case strings.Contains(lowerLabel, "video output price"):
		return []string{"video"}
	default:
		return nil
	}
}

func normalizeGeminiModelName(value string) string {
	cleaned := strings.ToLower(strings.TrimSpace(value))
	cleaned = strings.ReplaceAll(cleaned, "_", "-")
	cleaned = strings.Join(strings.Fields(cleaned), "-")
	return cleaned
}

func containsGeminiCategory(categories []string, target string) bool {
	for _, category := range categories {
		if category == target {
			return true
		}
	}

	return false
}

func isGeminiGeneralCategories(categories []string) bool {
	if len(categories) == 0 {
		return true
	}
	if len(categories) == 1 && categories[0] == "text" {
		return true
	}
	if len(categories) == 3 &&
		containsGeminiCategory(categories, "text") &&
		containsGeminiCategory(categories, "image") &&
		containsGeminiCategory(categories, "video") {
		return true
	}
	if len(categories) == 2 &&
		containsGeminiCategory(categories, "text") &&
		containsGeminiCategory(categories, "image") {
		return true
	}

	return false
}

func hasGeminiUnsupportedVideoCategories(categories []string) bool {
	if !containsGeminiCategory(categories, "video") {
		return false
	}

	return !isGeminiGeneralCategories(categories)
}

func normalizePriceSyncExtraRatios(source map[string]float64) map[string]float64 {
	if len(source) == 0 {
		return nil
	}

	target := make(map[string]float64, len(source))
	for key, value := range source {
		if value <= 0 {
			continue
		}
		target[key] = value
	}
	if len(target) == 0 {
		return nil
	}

	return target
}

func floatPointer(value float64) *float64 {
	return &value
}

func intPointer(value int) *int {
	return &value
}
