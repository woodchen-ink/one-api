package types

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToResponsesRequestAssistantTextUsesOutputText(t *testing.T) {
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

	assert.Equal(t, ContentTypeOutputText, contents[0].Type)
	assert.Equal(t, "previous assistant response", contents[0].Text)
	_, isString := inputs[0].Content.(string)
	assert.False(t, isString)
}

func TestToResponsesRequestSingleUserTextUsesStringInput(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role:    ChatMessageRoleUser,
				Content: "hello world",
			},
		},
	}

	resReq := req.ToResponsesRequest()
	inputs, err := resReq.ParseInput()
	require.NoError(t, err)
	require.Len(t, inputs, 1)
	assert.Equal(t, ChatMessageRoleUser, inputs[0].Role)
	content, ok := inputs[0].Content.(string)
	require.True(t, ok)
	assert.Equal(t, "hello world", content)
}

func TestToResponsesRequestKeepsSystemInInput(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role: ChatMessageRoleSystem,
				Content: []map[string]any{
					{
						"type": "text",
						"text": "system prompt",
					},
				},
			},
			{
				Role:    ChatMessageRoleUser,
				Content: "hello world",
			},
		},
	}

	resReq := req.ToResponsesRequest()
	assert.Equal(t, "", resReq.Instructions)

	inputs, err := resReq.ParseInput()
	require.NoError(t, err)
	require.Len(t, inputs, 2)
	assert.Equal(t, ChatMessageRoleSystem, inputs[0].Role)
	contents, err := inputs[0].ParseContent()
	require.NoError(t, err)
	require.Len(t, contents, 1)
	assert.Equal(t, ContentTypeInputText, contents[0].Type)
	assert.Equal(t, "system prompt", contents[0].Text)
}

func TestToResponsesRequestMapsDeveloperToSystemInput(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role:    ChatMessageRoleDeveloper,
				Content: "developer prompt",
			},
			{
				Role:    ChatMessageRoleUser,
				Content: "hello world",
			},
		},
	}

	resReq := req.ToResponsesRequest()
	inputs, err := resReq.ParseInput()
	require.NoError(t, err)
	require.Len(t, inputs, 2)
	assert.Equal(t, ChatMessageRoleSystem, inputs[0].Role)
	content, ok := inputs[0].Content.(string)
	require.True(t, ok)
	assert.Equal(t, "developer prompt", content)
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
	assert.Equal(t, ContentTypeOutputText, contents[0].Type)
	assert.Equal(t, "assistant history", contents[0].Text)
	_, isString := inputs[0].Content.(string)
	assert.False(t, isString)
}

func TestToResponsesRequestAssistantArrayContentUsesOutputText(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role: ChatMessageRoleAssistant,
				Content: []map[string]any{
					{
						"type": "text",
						"text": "assistant says hi",
					},
				},
			},
		},
	}

	resReq := req.ToResponsesRequest()
	inputs, err := resReq.ParseInput()
	require.NoError(t, err)
	require.Len(t, inputs, 1)
	assert.Equal(t, ChatMessageRoleAssistant, inputs[0].Role)

	contents, err := inputs[0].ParseContent()
	require.NoError(t, err)
	require.Len(t, contents, 1)
	assert.Equal(t, ContentTypeOutputText, contents[0].Type)
	assert.Equal(t, "assistant says hi", contents[0].Text)
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

func TestToResponsesRequestToolArrayContentFlattensTextOnly(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role:       ChatMessageRoleTool,
				ToolCallID: "call_123",
				Content: []map[string]any{
					{
						"type": "text",
						"text": "image width: 100",
					},
					{
						"type": "image_url",
						"image_url": map[string]any{
							"url": "data:image/png;base64,ignored",
						},
					},
					{
						"type": "text",
						"text": "; image height: 200",
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
	output, ok := inputs[0].Output.(string)
	require.True(t, ok)
	assert.Equal(t, "image width: 100; image height: 200", output)
}
