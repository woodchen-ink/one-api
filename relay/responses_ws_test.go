package relay

import "testing"

func TestParseResponsesWSCreateRequestTopLevelReasoning(t *testing.T) {
	request, err := parseResponsesWSCreateRequest([]byte(`{
		"type":"response.create",
		"model":"gpt-5",
		"reasoning":{"effort":"high","summary":"detailed"},
		"tools":[{"type":"web_search","search_context_size":"high"}]
	}`))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if request.Model != "gpt-5" {
		t.Fatalf("expected model gpt-5, got %q", request.Model)
	}
	if request.Reasoning == nil || request.Reasoning.Effort == nil || *request.Reasoning.Effort != "high" {
		t.Fatalf("expected reasoning effort high, got %+v", request.Reasoning)
	}
	if request.Reasoning.Summary == nil || *request.Reasoning.Summary != "detailed" {
		t.Fatalf("expected reasoning summary detailed, got %+v", request.Reasoning)
	}
	if len(request.Tools) != 1 || request.Tools[0].Type != "web_search" {
		t.Fatalf("expected web_search tool, got %+v", request.Tools)
	}
}

func TestParseResponsesWSCreateRequestNestedResponseFallback(t *testing.T) {
	request, err := parseResponsesWSCreateRequest([]byte(`{
		"type":"response.create",
		"response":{
			"model":"gpt-5-mini",
			"reasoning":{"effort":"medium"}
		}
	}`))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if request.Model != "gpt-5-mini" {
		t.Fatalf("expected model gpt-5-mini, got %q", request.Model)
	}
	if request.Reasoning == nil || request.Reasoning.Effort == nil || *request.Reasoning.Effort != "medium" {
		t.Fatalf("expected reasoning effort medium, got %+v", request.Reasoning)
	}
}
