package openai

import (
	"net/http/httptest"
	"testing"

	"czloapi/common/config"
	"czloapi/common/requester"
	"czloapi/providers/base"
	"czloapi/types"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func TestHandleResponsesWSMessageParsesResponseDoneUsage(t *testing.T) {
	provider := &OpenAIProvider{}
	message := []byte(`{"type":"response.done","response":{"usage":{"input_tokens":11,"output_tokens":7,"total_tokens":18,"input_tokens_details":{"cached_tokens":3},"output_tokens_details":{"reasoning_tokens":2}}}}`)

	shouldContinue, usage, newMessage, err := provider.HandleResponsesWSMessage(requester.SupplierMessage, websocket.TextMessage, message)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !shouldContinue {
		t.Fatal("expected shouldContinue to be true")
	}
	if newMessage != nil {
		t.Fatal("expected newMessage to be nil")
	}
	if usage == nil {
		t.Fatal("expected usage to be parsed")
	}
	if usage.InputTokens != 11 || usage.OutputTokens != 7 || usage.TotalTokens != 18 {
		t.Fatalf("unexpected usage: %+v", usage)
	}

	extraTokens := usage.GetExtraTokens()
	if extraTokens[config.UsageExtraCache] != 3 {
		t.Fatalf("expected cached tokens to be 3, got %d", extraTokens[config.UsageExtraCache])
	}
	if extraTokens[config.UsageExtraReasoning] != 2 {
		t.Fatalf("expected reasoning tokens to be 2, got %d", extraTokens[config.UsageExtraReasoning])
	}
}

func TestHandleResponsesWSMessageBillsWebSearchFromRequestTools(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Set(types.ResponsesWSRequestToolsContextKey, []types.ResponsesTools{
		{
			Type:              types.APITollTypeWebSearch,
			SearchContextSize: "high",
		},
	})

	provider := &OpenAIProvider{
		BaseProvider: base.BaseProvider{
			Context: c,
		},
	}
	provider.responsesWSBilledKeys = make(map[string]bool)

	shouldContinue, usage, newMessage, err := provider.HandleResponsesWSMessage(
		requester.SupplierMessage,
		websocket.TextMessage,
		[]byte(`{"type":"response.output_item.done","item":{"type":"web_search_call","id":"ws_1","status":"completed"}}`),
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !shouldContinue {
		t.Fatal("expected shouldContinue to be true")
	}
	if newMessage != nil {
		t.Fatal("expected newMessage to be nil")
	}
	if usage == nil || usage.ExtraBilling == nil {
		t.Fatalf("expected extra billing usage, got %+v", usage)
	}

	billing, ok := usage.ExtraBilling[types.APITollTypeWebSearchPreview]
	if !ok {
		t.Fatalf("expected %s billing entry, got %+v", types.APITollTypeWebSearchPreview, usage.ExtraBilling)
	}
	if billing.CallCount != 1 || billing.Type != "high" {
		t.Fatalf("unexpected billing: %+v", billing)
	}
}

func TestHandleResponsesWSMessageDoesNotDoubleBillTerminalOutput(t *testing.T) {
	provider := &OpenAIProvider{}
	provider.responsesWSBilledKeys = make(map[string]bool)

	firstMessage := []byte(`{"type":"response.output_item.done","item":{"type":"web_search_call","id":"ws_1","status":"completed"}}`)
	_, firstUsage, _, err := provider.HandleResponsesWSMessage(requester.SupplierMessage, websocket.TextMessage, firstMessage)
	if err != nil {
		t.Fatalf("expected no error on first message, got %v", err)
	}
	if firstUsage == nil || firstUsage.ExtraBilling[types.APITollTypeWebSearchPreview].CallCount != 1 {
		t.Fatalf("expected first billing call count 1, got %+v", firstUsage)
	}

	secondMessage := []byte(`{"type":"response.completed","response":{"usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2},"output":[{"type":"web_search_call","id":"ws_1","status":"completed"}]}}`)
	_, secondUsage, _, err := provider.HandleResponsesWSMessage(requester.SupplierMessage, websocket.TextMessage, secondMessage)
	if err != nil {
		t.Fatalf("expected no error on terminal message, got %v", err)
	}
	if secondUsage == nil {
		t.Fatal("expected terminal usage to be present")
	}
	if secondUsage.ExtraBilling != nil {
		if billing, ok := secondUsage.ExtraBilling[types.APITollTypeWebSearchPreview]; ok && billing.CallCount > 0 {
			t.Fatalf("expected no duplicate web search billing, got %+v", billing)
		}
	}
}
