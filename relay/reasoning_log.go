package relay

import (
	"strings"

	"czloapi/common/config"
	"czloapi/providers/claude"
	"czloapi/providers/gemini"
	"czloapi/types"

	"github.com/gin-gonic/gin"
)

func setLogReasoningMetadata(c *gin.Context, meta *types.LogReasoningMetadata) {
	if meta == nil {
		return
	}
	c.Set(types.LogReasoningMetadataContextKey, meta)
}

func getLogReasoningMetadata(c *gin.Context) *types.LogReasoningMetadata {
	value, exists := c.Get(types.LogReasoningMetadataContextKey)
	if !exists {
		return nil
	}

	meta, ok := value.(*types.LogReasoningMetadata)
	if !ok || meta == nil {
		return nil
	}

	return meta
}

func newLogReasoningMetadata(level, mode, providerFamily, requestedVia string) *types.LogReasoningMetadata {
	return &types.LogReasoningMetadata{
		Enabled:        true,
		Level:          level,
		Mode:           mode,
		ProviderFamily: providerFamily,
		RequestedVia:   requestedVia,
	}
}

func trimReasoningValue(value string) string {
	return strings.TrimSpace(value)
}

func trimReasoningModelSuffix(value string) string {
	value = trimReasoningValue(value)
	if value == "" || value == "search" {
		return ""
	}
	return value
}

func extractChatReasoningMetadata(request *types.ChatCompletionRequest, otherArg string) *types.LogReasoningMetadata {
	if request == nil {
		return nil
	}

	if request.Reasoning != nil {
		meta := newLogReasoningMetadata("", types.LogReasoningModeToggle, types.LogReasoningProviderOpenAI, types.LogReasoningViaChatCompletions)

		if level := trimReasoningValue(request.Reasoning.Effort); level != "" {
			meta.Level = level
			meta.Mode = types.LogReasoningModeEffort
			meta.RawEffort = level
		}

		if request.Reasoning.MaxTokens > 0 {
			budget := request.Reasoning.MaxTokens
			meta.BudgetTokens = &budget
			if meta.Level == "" {
				meta.Level = types.ReasoningBudgetTokensToEffort(request.Reasoning.MaxTokens)
				if meta.Level != "" {
					meta.Mode = types.LogReasoningModeBudgetTokens
				}
			}
		}

		if request.Reasoning.Summary != nil {
			meta.Summary = *request.Reasoning.Summary
		}

		return meta
	}

	if request.ReasoningEffort != nil {
		if level := trimReasoningValue(*request.ReasoningEffort); level != "" {
			meta := newLogReasoningMetadata(level, types.LogReasoningModeEffort, types.LogReasoningProviderOpenAI, types.LogReasoningViaChatCompletions)
			meta.RawEffort = level
			return meta
		}
	}

	if level := trimReasoningModelSuffix(otherArg); level != "" {
		meta := newLogReasoningMetadata(level, types.LogReasoningModeEffort, types.LogReasoningProviderOpenAI, types.LogReasoningViaModelSuffix)
		meta.RawEffort = level
		return meta
	}

	return nil
}

func extractResponsesReasoningMetadata(request *types.OpenAIResponsesRequest) *types.LogReasoningMetadata {
	if request == nil || request.Reasoning == nil {
		return nil
	}

	meta := newLogReasoningMetadata("", types.LogReasoningModeToggle, types.LogReasoningProviderOpenAI, types.LogReasoningViaResponses)

	if request.Reasoning.Effort != nil {
		if level := trimReasoningValue(*request.Reasoning.Effort); level != "" {
			meta.Level = level
			meta.Mode = types.LogReasoningModeEffort
			meta.RawEffort = level
		}
	}

	if request.Reasoning.Summary != nil {
		meta.Summary = *request.Reasoning.Summary
	} else if request.Reasoning.GenerateSummary != nil {
		meta.Summary = *request.Reasoning.GenerateSummary
	}

	return meta
}

func extractClaudeReasoningMetadata(request *claude.ClaudeRequest) *types.LogReasoningMetadata {
	if request == nil {
		return nil
	}

	outputEffort := ""
	rawOutputEffort := ""
	if request.OutputConfig != nil {
		rawOutputEffort = trimReasoningValue(request.OutputConfig.Effort)
		outputEffort = claude.NormalizeClaudeOutputConfigEffort(rawOutputEffort)
	}

	if request.Thinking != nil && request.Thinking.Type == "enabled" {
		budget := request.Thinking.BudgetTokens
		level := types.ReasoningBudgetTokensToEffort(budget)
		mode := types.LogReasoningModeToggle
		if budget > 0 {
			mode = types.LogReasoningModeBudgetTokens
		}
		if outputEffort != "" {
			level = outputEffort
			mode = types.LogReasoningModeEffort
		}

		meta := newLogReasoningMetadata(level, mode, types.LogReasoningProviderClaude, types.LogReasoningViaClaudeNative)
		if budget > 0 {
			meta.BudgetTokens = &budget
		}
		if rawOutputEffort != "" {
			meta.RawEffort = rawOutputEffort
		}
		return meta
	}

	if request.Thinking != nil && strings.EqualFold(request.Thinking.Type, "adaptive") {
		meta := newLogReasoningMetadata("high", types.LogReasoningModeEffort, types.LogReasoningProviderClaude, types.LogReasoningViaClaudeNative)
		if rawOutputEffort != "" {
			meta.Level = outputEffort
			meta.RawEffort = rawOutputEffort
		}
		return meta
	}

	if outputEffort != "" || rawOutputEffort != "" {
		meta := newLogReasoningMetadata(outputEffort, types.LogReasoningModeEffort, types.LogReasoningProviderClaude, types.LogReasoningViaClaudeNative)
		meta.RawEffort = rawOutputEffort
		return meta
	}

	return nil
}

func extractGeminiReasoningMetadata(request *gemini.GeminiChatRequest) *types.LogReasoningMetadata {
	if request == nil || request.GenerationConfig.ThinkingConfig == nil {
		return nil
	}

	thinkingConfig := request.GenerationConfig.ThinkingConfig
	level := trimReasoningValue(thinkingConfig.ThinkingLevel)
	hasBudget := thinkingConfig.ThinkingBudget != nil

	if level == "" && !hasBudget {
		return nil
	}

	mode := types.LogReasoningModeThinkingLevel
	if level == "" {
		mode = types.LogReasoningModeBudgetTokens
	}

	meta := newLogReasoningMetadata(level, mode, types.LogReasoningProviderGemini, types.LogReasoningViaGeminiNative)
	if thinkingConfig.ThinkingLevel != "" {
		meta.RawThinkingLevel = trimReasoningValue(thinkingConfig.ThinkingLevel)
	}
	if hasBudget {
		meta.BudgetTokens = thinkingConfig.ThinkingBudget
	}

	return meta
}

func enrichLogReasoningMetadata(c *gin.Context, modelName string, channelType int) {
	meta := getLogReasoningMetadata(c)
	if meta == nil {
		return
	}

	if providerFamily := inferLogReasoningProviderFamily(modelName, channelType, meta.RequestedVia); providerFamily != "" {
		meta.ProviderFamily = providerFamily
	}
}

func inferLogReasoningProviderFamily(modelName string, channelType int, requestedVia string) string {
	switch requestedVia {
	case types.LogReasoningViaClaudeNative:
		return types.LogReasoningProviderClaude
	case types.LogReasoningViaGeminiNative:
		return types.LogReasoningProviderGemini
	}

	switch {
	case strings.HasPrefix(modelName, "claude"):
		return types.LogReasoningProviderClaude
	case strings.HasPrefix(modelName, "gemini"):
		return types.LogReasoningProviderGemini
	}

	switch channelType {
	case config.ChannelTypeAnthropic, config.ChannelTypeBedrock:
		return types.LogReasoningProviderClaude
	case config.ChannelTypeGemini:
		return types.LogReasoningProviderGemini
	default:
		return types.LogReasoningProviderOpenAI
	}
}
