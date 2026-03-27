package claude

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"

	"czloapi/types"
)

func ResolveClaudeResponseReasoning(request *ClaudeRequest) *types.ChatReasoning {
	if request == nil {
		return nil
	}

	reasoning := &types.ChatReasoning{}
	if request.Thinking != nil {
		reasoning.MaxTokens = request.Thinking.BudgetTokens
	}

	if request.OutputConfig != nil {
		reasoning.Effort = NormalizeClaudeOutputConfigEffort(request.OutputConfig.Effort)
	}
	if reasoning.Effort == "" && request.Thinking != nil {
		reasoning.Effort = normalizeClaudeThinkingEffort(request.Thinking)
	}

	if reasoning.MaxTokens == 0 && reasoning.Effort == "" {
		return nil
	}

	return reasoning
}

func NormalizeClaudeOutputConfigEffort(effort string) string {
	switch strings.ToLower(strings.TrimSpace(effort)) {
	case "low":
		return "low"
	case "medium":
		return "medium"
	case "high":
		return "high"
	case "max":
		return "xhigh"
	default:
		return ""
	}
}

func normalizeClaudeThinkingEffort(thinking *Thinking) string {
	if thinking == nil {
		return ""
	}

	switch strings.ToLower(strings.TrimSpace(thinking.Type)) {
	case "adaptive":
		return "high"
	case "enabled":
		return types.ReasoningBudgetTokensToEffort(thinking.BudgetTokens)
	default:
		return ""
	}
}

func BuildClaudePromptCacheKey(request *ClaudeRequest) string {
	if request == nil {
		return ""
	}

	signature := map[string]any{
		"model": request.Model,
	}

	systemBlocks, ok := collectClaudeCacheControlledSystem(request.System)
	if ok {
		signature["system"] = systemBlocks
	}

	messageBlocks := collectClaudeCacheControlledMessages(request.Messages)
	if len(messageBlocks) > 0 {
		signature["messages"] = messageBlocks
	}

	toolBlocks := collectClaudeCacheControlledTools(request.Tools)
	if len(toolBlocks) > 0 {
		signature["tools"] = toolBlocks
	}

	if len(signature) == 1 {
		return ""
	}

	signatureBytes, err := json.Marshal(signature)
	if err != nil {
		return ""
	}

	hash := sha256.Sum256(signatureBytes)
	return "czloapi-claude-cache-" + hex.EncodeToString(hash[:16])
}

func collectClaudeCacheControlledSystem(system any) ([]MessageContent, bool) {
	blocks, err := normalizeClaudeContent(system)
	if err != nil || len(blocks) == 0 {
		return nil, false
	}

	filtered := make([]MessageContent, 0, len(blocks))
	for _, block := range blocks {
		if block.CacheControl == nil {
			continue
		}
		filtered = append(filtered, block)
	}

	return filtered, len(filtered) > 0
}

func collectClaudeCacheControlledMessages(messages []Message) []map[string]any {
	filtered := make([]map[string]any, 0)
	for _, message := range messages {
		blocks, err := normalizeClaudeContent(message.Content)
		if err != nil || len(blocks) == 0 {
			continue
		}

		cacheBlocks := make([]MessageContent, 0, len(blocks))
		for _, block := range blocks {
			if block.CacheControl == nil {
				continue
			}
			cacheBlocks = append(cacheBlocks, block)
		}
		if len(cacheBlocks) == 0 {
			continue
		}

		filtered = append(filtered, map[string]any{
			"role":    message.Role,
			"content": cacheBlocks,
		})
	}

	return filtered
}

func collectClaudeCacheControlledTools(tools []Tools) []Tools {
	filtered := make([]Tools, 0, len(tools))
	for _, tool := range tools {
		if tool.CacheControl == nil {
			continue
		}
		filtered = append(filtered, tool)
	}
	return filtered
}
