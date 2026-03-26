package openai

import (
	"testing"

	"czloapi/common/config"
	"czloapi/common/requester"

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
