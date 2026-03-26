package relay

import (
	"encoding/json"
	"io"
	"strings"
	"testing"

	"czloapi/providers/claude"
	"czloapi/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeStringStream struct {
	data []string
}

func (f *fakeStringStream) Recv() (<-chan string, <-chan error) {
	dataChan := make(chan string)
	errChan := make(chan error, 1)

	go func() {
		for _, item := range f.data {
			dataChan <- item
		}
		close(dataChan)
		errChan <- io.EOF
		close(errChan)
	}()

	return dataChan, errChan
}

func (f *fakeStringStream) Close() {}

func TestOpenAIToClaudeStreamWrapper(t *testing.T) {
	chunks := []types.ChatCompletionStreamResponse{
		{
			ID:      "chatcmpl_1",
			Object:  "chat.completion.chunk",
			Created: int64(123),
			Model:   "gpt-4o",
			Choices: []types.ChatCompletionStreamChoice{
				{
					Index: 0,
					Delta: types.ChatCompletionStreamChoiceDelta{
						Role: "assistant",
					},
				},
			},
		},
		{
			ID:      "chatcmpl_1",
			Object:  "chat.completion.chunk",
			Created: int64(123),
			Model:   "gpt-4o",
			Choices: []types.ChatCompletionStreamChoice{
				{
					Index: 0,
					Delta: types.ChatCompletionStreamChoiceDelta{
						Content: "Hello",
					},
				},
			},
		},
		{
			ID:      "chatcmpl_1",
			Object:  "chat.completion.chunk",
			Created: int64(123),
			Model:   "gpt-4o",
			Choices: []types.ChatCompletionStreamChoice{
				{
					Index: 0,
					Delta: types.ChatCompletionStreamChoiceDelta{
						ToolCalls: []*types.ChatCompletionToolCalls{
							{
								Id:    "call_1",
								Index: 0,
								Function: &types.ChatCompletionToolCallsFunction{
									Name:      "lookup_weather",
									Arguments: "{\"city\":\"Sha",
								},
							},
						},
					},
				},
			},
		},
		{
			ID:      "chatcmpl_1",
			Object:  "chat.completion.chunk",
			Created: int64(123),
			Model:   "gpt-4o",
			Choices: []types.ChatCompletionStreamChoice{
				{
					Index: 0,
					Delta: types.ChatCompletionStreamChoiceDelta{
						ToolCalls: []*types.ChatCompletionToolCalls{
							{
								Id:    "call_1",
								Index: 0,
								Function: &types.ChatCompletionToolCallsFunction{
									Arguments: "nghai\"}",
								},
							},
						},
					},
					FinishReason: types.FinishReasonToolCalls,
				},
			},
			Usage: &types.Usage{
				PromptTokens:     10,
				CompletionTokens: 5,
			},
		},
	}

	rawChunks := make([]string, 0, len(chunks))
	for _, chunk := range chunks {
		body, err := json.Marshal(chunk)
		require.NoError(t, err)
		rawChunks = append(rawChunks, string(body))
	}

	stream := newOpenAIToClaudeStreamWrapper(&fakeStringStream{data: rawChunks}, &types.Usage{
		PromptTokens: 10,
	}, "gpt-4o")

	dataChan, errChan := stream.Recv()

	events := make([]string, 0, 10)
	for {
		select {
		case item, ok := <-dataChan:
			if ok {
				events = append(events, item)
				continue
			}
			dataChan = nil
		case err := <-errChan:
			require.True(t, err == io.EOF)
			errChan = nil
		}

		if dataChan == nil && errChan == nil {
			break
		}
	}

	require.Len(t, events, 10)
	assert.Contains(t, events[0], "event: message_start")
	assert.Contains(t, events[1], "event: content_block_start")
	assert.Contains(t, events[2], "event: content_block_delta")
	assert.Contains(t, events[3], "event: content_block_stop")
	assert.Contains(t, events[4], "event: content_block_start")
	assert.Contains(t, events[5], "event: content_block_delta")
	assert.Contains(t, events[6], "event: content_block_delta")
	assert.Contains(t, events[7], "event: content_block_stop")
	assert.Contains(t, events[8], "event: message_delta")
	assert.Contains(t, events[9], "event: message_stop")

	var messageStart claude.ClaudeStreamResponse
	require.NoError(t, unmarshalSSEPayload(events[0], &messageStart))
	assert.Equal(t, 10, messageStart.Message.Usage.InputTokens)

	var toolStart claude.ClaudeStreamResponse
	require.NoError(t, unmarshalSSEPayload(events[4], &toolStart))
	assert.Equal(t, claude.ContentTypeToolUes, toolStart.ContentBlock.Type)
	assert.Equal(t, "lookup_weather", toolStart.ContentBlock.Name)

	var toolDelta claude.ClaudeStreamResponse
	require.NoError(t, unmarshalSSEPayload(events[6], &toolDelta))
	assert.Equal(t, claude.ContentStreamTypeInputJsonDelta, toolDelta.Delta.Type)
	assert.Equal(t, "nghai\"}", toolDelta.Delta.PartialJson)

	var messageDelta claude.ClaudeStreamResponse
	require.NoError(t, unmarshalSSEPayload(events[8], &messageDelta))
	assert.Equal(t, claude.FinishReasonToolUse, messageDelta.Delta.StopReason)
	assert.Nil(t, messageDelta.Delta.StopSequence)
	assert.Equal(t, 5, messageDelta.Usage.OutputTokens)
	assert.Contains(t, events[8], `"stop_sequence":null`)
}

func TestOpenAIToClaudeStreamWrapperIncludesThinkingPlaceholder(t *testing.T) {
	chunk := types.ChatCompletionStreamResponse{
		ID:      "chatcmpl_thinking",
		Object:  "chat.completion.chunk",
		Created: int64(123),
		Model:   "gpt-4o",
		Choices: []types.ChatCompletionStreamChoice{
			{
				Index: 0,
				Delta: types.ChatCompletionStreamChoiceDelta{
					Role:             "assistant",
					ReasoningContent: "thinking...",
				},
			},
		},
	}

	body, err := json.Marshal(chunk)
	require.NoError(t, err)

	stream := newOpenAIToClaudeStreamWrapper(&fakeStringStream{
		data: []string{string(body)},
	}, &types.Usage{}, "gpt-4o")

	dataChan, errChan := stream.Recv()

	var events []string
	for {
		select {
		case item, ok := <-dataChan:
			if ok {
				events = append(events, item)
				continue
			}
			dataChan = nil
		case err := <-errChan:
			require.True(t, err == io.EOF)
			errChan = nil
		}

		if dataChan == nil && errChan == nil {
			break
		}
	}

	require.GreaterOrEqual(t, len(events), 5)

	var start claude.ClaudeStreamResponse
	require.NoError(t, unmarshalSSEPayload(events[1], &start))
	assert.Equal(t, claude.ContentTypeThinking, start.ContentBlock.Type)
	assert.Equal(t, "", start.ContentBlock.Thinking)

	var signatureDelta claude.ClaudeStreamResponse
	require.NoError(t, unmarshalSSEPayload(events[3], &signatureDelta))
	assert.Equal(t, claude.ContentStreamTypeSignatureDelta, signatureDelta.Delta.Type)
	assert.Equal(t, "", signatureDelta.Delta.Signature)
}

func unmarshalSSEPayload(raw string, target any) error {
	lines := strings.Split(raw, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "data: ") {
			return json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), target)
		}
	}
	return io.ErrUnexpectedEOF
}
