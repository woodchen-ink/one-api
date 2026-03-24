package claude

import (
	"encoding/json"
	"strconv"
	"strings"

	"czloapi/common"
	"czloapi/types"
)

func StringErrorWrapper(err string, code string, statusCode int, localError bool) *ClaudeErrorWithStatusCode {
	claudeError := ClaudeError{
		Type: "czloapi_error",
		ErrorInfo: ClaudeErrorInfo{
			Type:    code,
			Message: err,
		},
	}

	return &ClaudeErrorWithStatusCode{
		LocalError:  localError,
		StatusCode:  statusCode,
		ClaudeError: claudeError,
	}
}

func OpenaiErrToClaudeErr(err *types.OpenAIErrorWithStatusCode) *ClaudeErrorWithStatusCode {
	if err == nil {
		return nil
	}

	var typeStr string

	switch v := err.Code.(type) {
	case string:
		typeStr = v
	case int:
		typeStr = strconv.Itoa(v)
	default:
		typeStr = "unknown"
	}

	return &ClaudeErrorWithStatusCode{
		LocalError: err.LocalError,
		StatusCode: err.StatusCode,
		ClaudeError: ClaudeError{
			Type: typeStr,
			ErrorInfo: ClaudeErrorInfo{
				Type:    err.Type,
				Message: err.Message,
			},
		},
	}
}

func ErrorToClaudeErr(err error) *ClaudeError {
	if err == nil {
		return nil
	}
	return &ClaudeError{
		Type: "czloapi_error",
		ErrorInfo: ClaudeErrorInfo{
			Type:    "internal_error",
			Message: err.Error(),
		},
	}
}

func ClaudeUsageMerge(usage *Usage, mergeUsage *Usage) {
	if usage == nil || mergeUsage == nil {
		return
	}

	if usage.InputTokens != mergeUsage.InputTokens {
		usage.InputTokens += mergeUsage.InputTokens
	}
	usage.OutputTokens += mergeUsage.OutputTokens
	usage.CacheCreationInputTokens += mergeUsage.CacheCreationInputTokens
	usage.CacheReadInputTokens += mergeUsage.CacheReadInputTokens

	if mergeUsage.CacheCreation != nil {
		if usage.CacheCreation == nil {
			usage.CacheCreation = &CacheCreationUsage{}
		}
		usage.CacheCreation.Ephemeral5mInputTokens += mergeUsage.CacheCreation.Ephemeral5mInputTokens
		usage.CacheCreation.Ephemeral1hInputTokens += mergeUsage.CacheCreation.Ephemeral1hInputTokens
	}
}

func (u *Usage) GetCacheCreation5mInputTokens() int {
	if u == nil || u.CacheCreation == nil {
		return 0
	}

	return u.CacheCreation.Ephemeral5mInputTokens
}

func (u *Usage) GetCacheCreation1hInputTokens() int {
	if u == nil || u.CacheCreation == nil {
		return 0
	}

	return u.CacheCreation.Ephemeral1hInputTokens
}

func (u *Usage) GetCacheCreationInputTokens() int {
	if u == nil {
		return 0
	}

	detailedTotal := u.GetCacheCreation5mInputTokens() + u.GetCacheCreation1hInputTokens()
	if detailedTotal > 0 {
		return detailedTotal
	}

	return u.CacheCreationInputTokens
}

func ClaudeUsageToOpenaiUsage(cUsage *Usage, usage *types.Usage) bool {
	if usage == nil || cUsage == nil {
		return false
	}

	cacheCreationTokens := cUsage.GetCacheCreationInputTokens()
	if cUsage.InputTokens == 0 && cUsage.OutputTokens == 0 && cacheCreationTokens == 0 && cUsage.CacheReadInputTokens == 0 {
		return false
	}

	usage.PromptTokensDetails.CachedWrite5mTokens = cUsage.GetCacheCreation5mInputTokens()
	usage.PromptTokensDetails.CachedWrite1hTokens = cUsage.GetCacheCreation1hInputTokens()
	if usage.PromptTokensDetails.CachedWrite5mTokens == 0 && usage.PromptTokensDetails.CachedWrite1hTokens == 0 {
		usage.PromptTokensDetails.CachedWriteTokens = cacheCreationTokens
	} else {
		usage.PromptTokensDetails.CachedWriteTokens = 0
	}
	usage.PromptTokensDetails.CachedReadTokens = cUsage.CacheReadInputTokens

	usage.PromptTokens = cUsage.InputTokens + cacheCreationTokens + cUsage.CacheReadInputTokens
	usage.CompletionTokens = cUsage.OutputTokens
	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens

	return true
}

func HasClaude1hCacheControl(payload any) bool {
	if payload == nil {
		return false
	}

	switch value := payload.(type) {
	case map[string]any:
		if ttl, ok := value["ttl"].(string); ok && strings.EqualFold(strings.TrimSpace(ttl), "1h") {
			return true
		}
		for _, nested := range value {
			if HasClaude1hCacheControl(nested) {
				return true
			}
		}
	case []any:
		for _, nested := range value {
			if HasClaude1hCacheControl(nested) {
				return true
			}
		}
	default:
		raw, err := json.Marshal(value)
		if err != nil {
			return false
		}

		var parsed any
		if err = json.Unmarshal(raw, &parsed); err != nil {
			return false
		}

		return HasClaude1hCacheControl(parsed)
	}

	return false
}

func ClaudeOutputUsage(response *ClaudeResponse) int {
	var textMsg strings.Builder

	for _, c := range response.Content {
		if c.Type == "text" {
			textMsg.WriteString(c.Text + "\n")
		}
	}

	return common.CountTokenText(textMsg.String(), response.Model)
}
