package model

import (
	"context"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"czloapi/common/config"
)

type claudePriceSyncProvider struct{}

func newClaudePriceSyncProvider() PriceSyncProvider {
	return &claudePriceSyncProvider{}
}

func (p *claudePriceSyncProvider) Key() string {
	return "claude"
}

func (p *claudePriceSyncProvider) Name() string {
	return "Anthropic Claude"
}

func (p *claudePriceSyncProvider) ChannelType() int {
	return config.ChannelTypeAnthropic
}

func (p *claudePriceSyncProvider) SourceURL() string {
	return "https://platform.claude.com/docs/en/about-claude/pricing.md"
}

func (p *claudePriceSyncProvider) Fetch(ctx context.Context) ([]byte, error) {
	urls := []string{
		p.SourceURL(),
		"https://platform.claude.com/docs/en/about-claude/pricing",
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

func (p *claudePriceSyncProvider) Parse(raw []byte) ([]PriceSyncDraftRow, error) {
	content := string(raw)
	lines := strings.Split(content, "\n")

	tableStarted := false
	rows := make([]PriceSyncDraftRow, 0)
	for _, rawLine := range lines {
		line := strings.TrimSpace(rawLine)
		if line == "" {
			if tableStarted && len(rows) > 0 {
				break
			}
			continue
		}

		if strings.HasPrefix(line, "| Model ") && strings.Contains(line, "5m Cache Writes") && strings.Contains(line, "1h Cache Writes") {
			tableStarted = true
			continue
		}
		if !tableStarted {
			continue
		}
		if strings.HasPrefix(line, "|---") {
			continue
		}
		if !strings.HasPrefix(line, "|") {
			if len(rows) > 0 {
				break
			}
			continue
		}

		columns := parseClaudeMarkdownTableColumns(line)
		if len(columns) < 6 {
			continue
		}

		row, err := p.buildDraftRow(cleanClaudeMarkdownInline(columns[0]), columns)
		if err != nil {
			return nil, err
		}
		rows = append(rows, row)
	}

	if len(rows) == 0 {
		return p.parseHTML(content)
	}

	return rows, nil
}

func (p *claudePriceSyncProvider) parseHTML(content string) ([]PriceSyncDraftRow, error) {
	rowPattern := regexp.MustCompile(`(?is)<tr[^>]*>(.*?)</tr>`)
	cellPattern := regexp.MustCompile(`(?is)<t[dh][^>]*>(.*?)</t[dh]>`)

	matches := rowPattern.FindAllStringSubmatch(content, -1)
	rows := make([]PriceSyncDraftRow, 0)
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}

		cellMatches := cellPattern.FindAllStringSubmatch(match[1], -1)
		if len(cellMatches) < 6 {
			continue
		}

		columns := make([]string, 0, len(cellMatches))
		for _, cellMatch := range cellMatches {
			columns = append(columns, cleanClaudeHTMLInline(cellMatch[1]))
		}

		if len(columns) < 6 || !strings.HasPrefix(strings.ToLower(columns[0]), "claude ") {
			continue
		}

		row, err := p.buildDraftRow(columns[0], columns)
		if err != nil {
			return nil, err
		}
		rows = append(rows, row)
	}

	if len(rows) == 0 {
		return nil, errors.New("pricing table not found in provider document")
	}

	return rows, nil
}

func (p *claudePriceSyncProvider) buildDraftRow(sourceModel string, columns []string) (PriceSyncDraftRow, error) {
	input, err := parseClaudePriceSyncUSD(columns[1])
	if err != nil {
		return PriceSyncDraftRow{}, fmt.Errorf("parse %s input price: %w", sourceModel, err)
	}
	write5m, err := parseClaudePriceSyncUSD(columns[2])
	if err != nil {
		return PriceSyncDraftRow{}, fmt.Errorf("parse %s 5m cache write price: %w", sourceModel, err)
	}
	write1h, err := parseClaudePriceSyncUSD(columns[3])
	if err != nil {
		return PriceSyncDraftRow{}, fmt.Errorf("parse %s 1h cache write price: %w", sourceModel, err)
	}
	cacheRead, err := parseClaudePriceSyncUSD(columns[4])
	if err != nil {
		return PriceSyncDraftRow{}, fmt.Errorf("parse %s cache read price: %w", sourceModel, err)
	}
	output, err := parseClaudePriceSyncUSD(columns[5])
	if err != nil {
		return PriceSyncDraftRow{}, fmt.Errorf("parse %s output price: %w", sourceModel, err)
	}

	return PriceSyncDraftRow{
		SourceModel: sourceModel,
		Type:        TokensPriceType,
		ChannelType: p.ChannelType(),
		Input:       input,
		Output:      output,
		ExtraRatios: map[string]float64{
			config.UsageExtraCachedWrite5m: write5m,
			config.UsageExtraCachedWrite1h: write1h,
			config.UsageExtraCachedRead:    cacheRead,
		},
	}, nil
}

func (p *claudePriceSyncProvider) FilterModelOptions(options []string) []string {
	filtered := make([]string, 0)
	for _, option := range options {
		if strings.Contains(strings.ToLower(option), "claude") {
			filtered = append(filtered, option)
		}
	}

	sort.Strings(filtered)
	return filtered
}

func (p *claudePriceSyncProvider) SuggestModel(sourceModel string, options []string) string {
	if len(options) == 0 {
		return ""
	}

	family, major, minor, ok := parseClaudeSourceModel(sourceModel)
	if !ok {
		return ""
	}

	candidates := make([]string, 0)
	for _, option := range options {
		lowerOption := strings.ToLower(option)
		if !strings.Contains(lowerOption, family) {
			continue
		}

		majorToken := strconv.Itoa(major)
		if !strings.Contains(lowerOption, majorToken) {
			continue
		}

		if minor > 0 {
			dashMinor := fmt.Sprintf("%d-%d", major, minor)
			dotMinor := fmt.Sprintf("%d.%d", major, minor)
			if !strings.Contains(lowerOption, dashMinor) && !strings.Contains(lowerOption, dotMinor) {
				continue
			}
		}

		candidates = append(candidates, option)
	}

	if len(candidates) == 1 {
		return candidates[0]
	}

	return ""
}

func parseClaudeMarkdownTableColumns(line string) []string {
	trimmed := strings.TrimSpace(line)
	trimmed = strings.TrimPrefix(trimmed, "|")
	trimmed = strings.TrimSuffix(trimmed, "|")

	parts := strings.Split(trimmed, "|")
	for index := range parts {
		parts[index] = strings.TrimSpace(parts[index])
	}
	return parts
}

var claudeMarkdownLinkPattern = regexp.MustCompile(`\[(.*?)\]\((.*?)\)`)

func cleanClaudeMarkdownInline(value string) string {
	cleaned := claudeMarkdownLinkPattern.ReplaceAllString(value, "$1")
	cleaned = strings.ReplaceAll(cleaned, "`", "")
	cleaned = strings.TrimSpace(cleaned)
	return cleaned
}

var claudeHTMLTagPattern = regexp.MustCompile(`(?is)<[^>]+>`)

func cleanClaudeHTMLInline(value string) string {
	cleaned := claudeHTMLTagPattern.ReplaceAllString(value, "")
	cleaned = html.UnescapeString(cleaned)
	cleaned = strings.Join(strings.Fields(cleaned), " ")
	return strings.TrimSpace(cleaned)
}

var claudePricingValuePattern = regexp.MustCompile(`\$([0-9]+(?:\.[0-9]+)?)\s*/\s*MTok`)

func parseClaudePriceSyncUSD(value string) (float64, error) {
	cleaned := cleanClaudeMarkdownInline(value)
	matches := claudePricingValuePattern.FindStringSubmatch(cleaned)
	if len(matches) != 2 {
		return 0, fmt.Errorf("unsupported price format: %s", value)
	}

	price, err := strconv.ParseFloat(matches[1], 64)
	if err != nil {
		return 0, err
	}

	return price, nil
}

func parseClaudeSourceModel(sourceModel string) (family string, major int, minor int, ok bool) {
	cleaned := strings.ToLower(cleanClaudeMarkdownInline(sourceModel))
	cleaned = strings.TrimSpace(strings.TrimPrefix(cleaned, "claude "))
	switch {
	case strings.HasPrefix(cleaned, "opus "):
		family = "opus"
	case strings.HasPrefix(cleaned, "sonnet "):
		family = "sonnet"
	case strings.HasPrefix(cleaned, "haiku "):
		family = "haiku"
	default:
		return "", 0, 0, false
	}

	versionText := strings.TrimSpace(strings.TrimPrefix(cleaned, family))
	versionText = strings.TrimSpace(strings.TrimPrefix(versionText, " "))
	versionText = strings.Fields(versionText)[0]
	if versionText == "" {
		return "", 0, 0, false
	}

	versionParts := strings.Split(versionText, ".")
	major, _ = strconv.Atoi(versionParts[0])
	if len(versionParts) > 1 {
		minor, _ = strconv.Atoi(versionParts[1])
	}

	return family, major, minor, true
}
