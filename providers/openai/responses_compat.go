package openai

import "strings"

// responsesCompatHeaders returns the headers that should be overridden when
// forwarding a chat->responses compat request. The client's original headers
// target chat/completions and may carry a wrong Content-Type (e.g.
// multipart/form-data) that the upstream Responses API rejects.
func responsesCompatHeaders(stream bool) map[string]string {
	accept := "application/json"
	if stream {
		accept = "text/event-stream"
	}
	return map[string]string{
		"Content-Type": "application/json",
		"Accept":       accept,
	}
}

// sanitizeResponsesCompatRequestMap strips legacy chat-only fields that may be
// reintroduced by extra_body during chat->responses conversion.
func sanitizeResponsesCompatRequestMap(requestMap map[string]interface{}) map[string]interface{} {
	dropKeys := []string{
		"messages",
		"system",
		"max_tokens",
		"max_completion_tokens",
		"stream_options",
		"presence_penalty",
		"frequency_penalty",
		"seed",
		"logit_bias",
		"logprobs",
		"top_logprobs",
		"n",
		"user",
		"functions",
		"function_call",
		"response_format",
		"stop",
		"stop_sequences",
		"reasoning_effort",
		"verbosity",
		"thinking",
		"output_config",
		"enable_thinking",
		"thinking_budget",
		"enable_search",
		"cache_control",
		"mcp_servers",
		"prediction",
		"web_search_options",
		"modalities",
		"audio",
	}

	for _, key := range dropKeys {
		delete(requestMap, key)
	}

	modelName, _ := requestMap["model"].(string)
	if strings.HasPrefix(modelName, "gpt-5") && modelName != "gpt-5-chat-latest" {
		delete(requestMap, "temperature")
	}

	return requestMap
}
