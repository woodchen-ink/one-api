package openai

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSanitizeResponsesRequestMapDropsLegacyChatFields(t *testing.T) {
	requestMap := map[string]interface{}{
		"model":               "gpt-5.4-mini",
		"input":               "hi",
		"stream":              true,
		"max_output_tokens":   128000,
		"reasoning_effort":    "high",
		"stream_options":      map[string]interface{}{"include_usage": true},
		"max_tokens":          1024,
		"temperature":         0.7,
		"web_search_options":  map[string]interface{}{"search_context_size": "high"},
		"response_format":     map[string]interface{}{"type": "json_object"},
		"presence_penalty":    1,
		"frequency_penalty":   1,
		"top_p":               1,
		"parallel_tool_calls": true,
	}

	sanitized := sanitizeResponsesRequestMap(requestMap, true)

	assert.Equal(t, "gpt-5.4-mini", sanitized["model"])
	assert.Equal(t, "hi", sanitized["input"])
	assert.Equal(t, true, sanitized["stream"])
	assert.Equal(t, 128000, sanitized["max_output_tokens"])
	assert.Equal(t, 1, sanitized["top_p"])
	assert.Equal(t, true, sanitized["parallel_tool_calls"])

	_, exists := sanitized["reasoning_effort"]
	assert.False(t, exists)
	_, exists = sanitized["stream_options"]
	assert.False(t, exists)
	_, exists = sanitized["max_tokens"]
	assert.False(t, exists)
	_, exists = sanitized["temperature"]
	assert.False(t, exists)
	_, exists = sanitized["web_search_options"]
	assert.False(t, exists)
	_, exists = sanitized["response_format"]
	assert.False(t, exists)
}
