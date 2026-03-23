package relay

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"czloapi/model"
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
