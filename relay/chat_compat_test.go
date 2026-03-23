package relay

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"czloapi/model"
	"czloapi/types"
)

func TestShouldUseResponsesCompatLegacyModel(t *testing.T) {
	assert.True(t, shouldUseResponsesCompat(&model.Channel{}, "o3-pro"))
}

func TestShouldUseResponsesCompatGpt5WithSwitch(t *testing.T) {
	assert.True(t, shouldUseResponsesCompat(&model.Channel{CompatibleResponse: true}, "gpt-5.4-mini"))
	assert.True(t, shouldUseResponsesCompat(&model.Channel{CompatibleResponse: true}, "gpt-5-chat-latest"))
}

func TestShouldUseResponsesCompatGpt5WithoutSwitch(t *testing.T) {
	assert.False(t, shouldUseResponsesCompat(&model.Channel{CompatibleResponse: false}, "gpt-5.4-mini"))
}

func TestShouldUseResponsesCompatNonGpt5(t *testing.T) {
	assert.False(t, shouldUseResponsesCompat(&model.Channel{CompatibleResponse: true}, "gpt-4o"))
}

func TestBuildCompatibleResponsesRequestOmitsMaxOutputTokens(t *testing.T) {
	req := types.ChatCompletionRequest{
		Model:     "gpt-5.4-mini",
		MaxTokens: 128000,
		Messages: []types.ChatCompletionMessage{
			{
				Role:    types.ChatMessageRoleUser,
				Content: "hello",
			},
		},
	}

	resReq := buildCompatibleResponsesRequest(req, req.Model, "")
	assert.True(t, resReq.ConvertChat)
	assert.Equal(t, 0, resReq.MaxOutputTokens)
}
