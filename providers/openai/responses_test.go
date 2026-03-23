package openai

import (
	"encoding/json"
	"testing"

	"czloapi/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHandlerChatStreamConvertsTextDeltas(t *testing.T) {
	handler := newTestResponsesStreamHandler()
	dataChan := make(chan string, 8)
	errChan := make(chan error, 1)

	sendResponsesStreamEvent(t, handler, dataChan, errChan, types.OpenAIResponsesStreamResponses{
		Type: "response.created",
		Response: &types.OpenAIResponsesResponses{
			ID:        "resp_1",
			Model:     "gpt-5.4-mini",
			CreatedAt: int64(123),
		},
	})
	sendResponsesStreamEvent(t, handler, dataChan, errChan, types.OpenAIResponsesStreamResponses{
		Type:  "response.output_text.delta",
		Delta: "hello",
	})
	sendResponsesStreamEvent(t, handler, dataChan, errChan, types.OpenAIResponsesStreamResponses{
		Type: "response.completed",
		Response: &types.OpenAIResponsesResponses{
			ID:        "resp_1",
			Model:     "gpt-5.4-mini",
			CreatedAt: int64(123),
			Status:    types.ResponseStatusCompleted,
			Usage: &types.ResponsesUsage{
				InputTokens:  5,
				OutputTokens: 1,
				TotalTokens:  6,
			},
		},
	})

	chunks := collectChatStreamChunks(t, dataChan, 3)
	require.Empty(t, errChan)

	assert.Equal(t, "resp_1", chunks[0].ID)
	assert.Equal(t, "gpt-5.4-mini", chunks[0].Model)
	assert.Len(t, chunks[0].Choices, 1)

	assert.Equal(t, "hello", chunks[1].Choices[0].Delta.Content)
	assert.Equal(t, types.FinishReasonStop, chunks[2].Choices[0].FinishReason)
	assert.Equal(t, 6, handler.Usage.TotalTokens)
}

func TestHandlerChatStreamConvertsFunctionCallDeltas(t *testing.T) {
	handler := newTestResponsesStreamHandler()
	dataChan := make(chan string, 8)
	errChan := make(chan error, 1)

	initialArgs := "{\"city\":\"Sha"
	sendResponsesStreamEvent(t, handler, dataChan, errChan, types.OpenAIResponsesStreamResponses{
		Type: "response.created",
		Response: &types.OpenAIResponsesResponses{
			ID:        "resp_2",
			Model:     "gpt-5.4-mini",
			CreatedAt: int64(456),
		},
	})
	sendResponsesStreamEvent(t, handler, dataChan, errChan, types.OpenAIResponsesStreamResponses{
		Type: "response.output_item.added",
		Item: &types.ResponsesOutput{
			Type:      types.InputTypeFunctionCall,
			ID:        "item_1",
			CallID:    "call_1",
			Name:      "lookup_weather",
			Arguments: &initialArgs,
		},
	})
	sendResponsesStreamEvent(t, handler, dataChan, errChan, types.OpenAIResponsesStreamResponses{
		Type:   "response.function_call_arguments.delta",
		ItemID: "item_1",
		Delta:  "nghai\"}",
	})
	sendResponsesStreamEvent(t, handler, dataChan, errChan, types.OpenAIResponsesStreamResponses{
		Type: "response.completed",
		Response: &types.OpenAIResponsesResponses{
			ID:        "resp_2",
			Model:     "gpt-5.4-mini",
			CreatedAt: int64(456),
			Status:    types.ResponseStatusCompleted,
		},
	})

	chunks := collectChatStreamChunks(t, dataChan, 4)
	require.Empty(t, errChan)

	require.Len(t, chunks[1].Choices[0].Delta.ToolCalls, 1)
	firstToolCall := chunks[1].Choices[0].Delta.ToolCalls[0]
	assert.Equal(t, "call_1", firstToolCall.Id)
	assert.Equal(t, "lookup_weather", firstToolCall.Function.Name)
	assert.Equal(t, initialArgs, firstToolCall.Function.Arguments)

	require.Len(t, chunks[2].Choices[0].Delta.ToolCalls, 1)
	secondToolCall := chunks[2].Choices[0].Delta.ToolCalls[0]
	assert.Equal(t, "call_1", secondToolCall.Id)
	assert.Equal(t, "", secondToolCall.Function.Name)
	assert.Equal(t, "nghai\"}", secondToolCall.Function.Arguments)

	assert.Equal(t, types.FinishReasonToolCalls, chunks[3].Choices[0].FinishReason)
}

func newTestResponsesStreamHandler() *OpenAIResponsesStreamHandler {
	return &OpenAIResponsesStreamHandler{
		Usage:                     &types.Usage{},
		Prefix:                    "data: ",
		Model:                     "gpt-5.4-mini",
		toolCallIndexByID:         make(map[string]int),
		toolCallNameByID:          make(map[string]string),
		toolCallArgsByID:          make(map[string]string),
		toolCallNameSent:          make(map[string]bool),
		toolCallCanonicalIDByItem: make(map[string]string),
	}
}

func sendResponsesStreamEvent(t *testing.T, handler *OpenAIResponsesStreamHandler, dataChan chan string, errChan chan error, event types.OpenAIResponsesStreamResponses) {
	t.Helper()

	payload, err := json.Marshal(event)
	require.NoError(t, err)

	line := []byte("data: " + string(payload))
	handler.HandlerChatStream(&line, dataChan, errChan)
}

func collectChatStreamChunks(t *testing.T, dataChan chan string, expected int) []types.ChatCompletionStreamResponse {
	t.Helper()

	chunks := make([]types.ChatCompletionStreamResponse, 0, expected)
	for i := 0; i < expected; i++ {
		select {
		case raw := <-dataChan:
			var chunk types.ChatCompletionStreamResponse
			require.NoError(t, json.Unmarshal([]byte(raw), &chunk))
			chunks = append(chunks, chunk)
		default:
			t.Fatalf("expected %d stream chunks, got %d", expected, len(chunks))
		}
	}

	return chunks
}
