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
}
