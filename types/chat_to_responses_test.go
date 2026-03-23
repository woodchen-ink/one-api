package types

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToResponsesRequestMovesSystemAndDeveloperToInstructions(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role:    ChatMessageRoleSystem,
				Content: "system prompt",
			},
			{
				Role: ChatMessageRoleDeveloper,
				Content: []map[string]any{
					{
						"type": "text",
						"text": "developer prompt",
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
	assert.Equal(t, "system prompt\n\ndeveloper prompt", resReq.Instructions)

	inputs, err := resReq.ParseInput()
	require.NoError(t, err)
	require.Len(t, inputs, 1)
	assert.Equal(t, ChatMessageRoleUser, inputs[0].Role)
	assert.Equal(t, "hello world", inputs[0].Content)
}

func TestToResponsesRequestSingleUserTextUsesMessageInput(t *testing.T) {
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

	assert.Equal(t, "", inputs[0].Type)
	assert.Equal(t, ChatMessageRoleUser, inputs[0].Role)
	assert.Equal(t, "hello world", inputs[0].Content)
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

func TestToResponsesRequestAssistantStringAndToolCallsBecomeMessageAndFunctionCalls(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role:    ChatMessageRoleAssistant,
				Content: "calling tool",
				ToolCalls: []*ChatCompletionToolCalls{
					{
						Id:   "call_123",
						Type: "function",
						Function: &ChatCompletionToolCallsFunction{
							Name:      "lookup_weather",
							Arguments: `{"city":"Shanghai"}`,
						},
					},
				},
			},
		},
	}

	resReq := req.ToResponsesRequest()
	inputs, err := resReq.ParseInput()
	require.NoError(t, err)
	require.Len(t, inputs, 2)

	assert.Equal(t, "", inputs[0].Type)
	assert.Equal(t, ChatMessageRoleAssistant, inputs[0].Role)
	assert.Equal(t, "calling tool", inputs[0].Content)

	assert.Equal(t, InputTypeFunctionCall, inputs[1].Type)
	assert.Equal(t, "call_123", inputs[1].CallID)
	assert.Equal(t, "lookup_weather", inputs[1].Name)
	assert.Equal(t, `{"city":"Shanghai"}`, inputs[1].Arguments)
}

func TestToResponsesRequestToolOutputWithoutCallIDFallsBackToUserMessage(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role:    ChatMessageRoleTool,
				Content: "tool output",
			},
		},
	}

	resReq := req.ToResponsesRequest()
	inputs, err := resReq.ParseInput()
	require.NoError(t, err)
	require.Len(t, inputs, 1)

	assert.Equal(t, "", inputs[0].Type)
	assert.Equal(t, ChatMessageRoleUser, inputs[0].Role)
	assert.Equal(t, "[tool_output_missing_call_id] tool output", inputs[0].Content)
}

func TestToResponsesRequestToolArrayContentStringifiesJSON(t *testing.T) {
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
	assert.Contains(t, output, "image width: 100")
	assert.Contains(t, output, "\"image_url\"")
}

func TestToResponsesRequestNormalizesFunctionToolChoice(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		ToolChoice: map[string]any{
			"type": "function",
			"function": map[string]any{
				"name": "lookup_weather",
			},
		},
		Messages: []ChatCompletionMessage{
			{
				Role:    ChatMessageRoleUser,
				Content: "hello world",
			},
		},
	}

	resReq := req.ToResponsesRequest()
	toolChoice, ok := resReq.ToolChoice.(map[string]any)
	require.True(t, ok)
	assert.Equal(t, ToolChoiceTypeFunction, toolChoice["type"])
	assert.Equal(t, "lookup_weather", toolChoice["name"])
	_, hasNestedFunction := toolChoice["function"]
	assert.False(t, hasNestedFunction)
}

func TestToResponsesRequestReasoningEffortSetsDetailedSummary(t *testing.T) {
	effort := "medium"
	req := &ChatCompletionRequest{
		Model:           "gpt-5.2-codex",
		ReasoningEffort: &effort,
		Messages: []ChatCompletionMessage{
			{
				Role:    ChatMessageRoleUser,
				Content: "hello world",
			},
		},
	}

	resReq := req.ToResponsesRequest()
	require.NotNil(t, resReq.Reasoning)
	require.NotNil(t, resReq.Reasoning.Effort)
	require.NotNil(t, resReq.Reasoning.Summary)
	assert.Equal(t, "medium", *resReq.Reasoning.Effort)
	assert.Equal(t, "detailed", *resReq.Reasoning.Summary)
}

func TestToResponsesRequestLegacyFunctionCallMapsToFunctionToolChoice(t *testing.T) {
	req := &ChatCompletionRequest{
		Model:        "gpt-5.2-codex",
		FunctionCall: map[string]any{"name": "legacy_lookup"},
		Messages: []ChatCompletionMessage{
			{
				Role:    ChatMessageRoleUser,
				Content: "hello world",
			},
		},
	}

	resReq := req.ToResponsesRequest()
	toolChoice, ok := resReq.ToolChoice.(map[string]any)
	require.True(t, ok)
	assert.Equal(t, ToolChoiceTypeFunction, toolChoice["type"])
	assert.Equal(t, "legacy_lookup", toolChoice["name"])
}

func TestToResponsesRequestLegacyFunctionsBecomeResponsesTools(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Functions: []*ChatCompletionFunction{
			{
				Name:        "lookup_weather",
				Description: "Get the weather",
				Parameters: map[string]any{
					"type": "object",
				},
			},
		},
		Messages: []ChatCompletionMessage{
			{
				Role:    ChatMessageRoleUser,
				Content: "hello world",
			},
		},
	}

	resReq := req.ToResponsesRequest()
	require.Len(t, resReq.Tools, 1)
	assert.Equal(t, "function", resReq.Tools[0].Type)
	assert.Equal(t, "lookup_weather", resReq.Tools[0].Name)
	assert.Equal(t, "Get the weather", resReq.Tools[0].Description)
}

func TestToResponsesRequestDeveloperArrayJoinsOnlyTextParts(t *testing.T) {
	req := &ChatCompletionRequest{
		Model: "gpt-5.2-codex",
		Messages: []ChatCompletionMessage{
			{
				Role: ChatMessageRoleDeveloper,
				Content: []map[string]any{
					{
						"type": "text",
						"text": "line one",
					},
					{
						"type": "image_url",
						"image_url": map[string]any{
							"url": "ignored",
						},
					},
					{
						"type": "text",
						"text": "line two",
					},
				},
			},
		},
	}

	resReq := req.ToResponsesRequest()
	assert.True(t, strings.Contains(resReq.Instructions, "line one"))
	assert.True(t, strings.Contains(resReq.Instructions, "line two"))
	assert.False(t, strings.Contains(resReq.Instructions, "ignored"))
}
