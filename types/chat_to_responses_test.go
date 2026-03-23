package types

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToResponsesRequestAssistantTextUsesInputText(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role:    ChatMessageRoleAssistant,
				Content: "previous assistant response",
			},
		},
	}

	resReq := req.ToResponsesRequest()
	inputs, err := resReq.ParseInput()
	require.NoError(t, err)
	require.Len(t, inputs, 1)

	contents, err := inputs[0].ParseContent()
	require.NoError(t, err)
	require.Len(t, contents, 1)

	assert.Equal(t, ContentTypeInputText, contents[0].Type)
	assert.Equal(t, "previous assistant response", contents[0].Text)
	_, ok := inputs[0].Content.(string)
	assert.True(t, ok)
}

func TestToResponsesRequestSupportsOutputTextInputType(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role: ChatMessageRoleAssistant,
				Content: []map[string]any{
					{
						"type": "output_text",
						"text": "assistant history",
					},
				},
			},
		},
	}

	resReq := req.ToResponsesRequest()
	inputs, err := resReq.ParseInput()
	require.NoError(t, err)
	require.Len(t, inputs, 1)

	contents, err := inputs[0].ParseContent()
	require.NoError(t, err)
	require.Len(t, contents, 1)
	assert.Equal(t, ContentTypeInputText, contents[0].Type)
	assert.Equal(t, "assistant history", contents[0].Text)
	_, ok := inputs[0].Content.(string)
	assert.True(t, ok)
}

func TestToResponsesRequestNormalizesToolOutputToString(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role:       ChatMessageRoleTool,
				ToolCallID: "call_123",
				Content: []map[string]any{
					{
						"type": "text",
						"text": "tool output text",
					},
				},
			},
		},
	}

	resReq := req.ToResponsesRequest()
	inputs, err := resReq.ParseInput()
	require.NoError(t, err)
	require.Len(t, inputs, 1)

	assert.Equal(t, InputTypeFunctionCallOutput, inputs[0].Type)
	assert.Equal(t, "call_123", inputs[0].CallID)
	output, ok := inputs[0].Output.(string)
	require.True(t, ok)
	assert.Equal(t, "tool output text", output)
}
