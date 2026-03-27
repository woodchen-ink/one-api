package openai

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSanitizeResponsesCompatRequestMapDropsClaudeNativeKeys(t *testing.T) {
	requestMap := map[string]interface{}{
		"model":            "gpt-5.4",
		"input":            []any{},
		"system":           "system prompt",
		"messages":         []any{"legacy"},
		"thinking":         map[string]any{"type": "enabled"},
		"output_config":    map[string]any{"effort": "max"},
		"stop_sequences":   []string{"STOP"},
		"cache_control":    map[string]any{"type": "ephemeral"},
		"mcp_servers":      []any{"server"},
		"prompt_cache_key": "fixed-cache-key",
	}

	sanitized := sanitizeResponsesCompatRequestMap(requestMap)
	assert.NotContains(t, sanitized, "system")
	assert.NotContains(t, sanitized, "messages")
	assert.NotContains(t, sanitized, "thinking")
	assert.NotContains(t, sanitized, "output_config")
	assert.NotContains(t, sanitized, "stop_sequences")
	assert.NotContains(t, sanitized, "cache_control")
	assert.NotContains(t, sanitized, "mcp_servers")
	assert.Equal(t, "fixed-cache-key", sanitized["prompt_cache_key"])
}
