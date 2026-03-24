package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSplitBatchChannelModels(t *testing.T) {
	models := splitBatchChannelModels("deep-research-pro-preview-12-2025, nano-banana-pro-preview，\ngemini-2.0-flash-001\r\ngemini-2.0-flash-001, ")

	assert.Equal(t, []string{
		"deep-research-pro-preview-12-2025",
		"nano-banana-pro-preview",
		"gemini-2.0-flash-001",
	}, models)
}

func TestRemoveChannelModels(t *testing.T) {
	updated, changed := removeChannelModels(
		"deep-research-pro-preview-12-2025,nano-banana-pro-preview,gemini-2.0-flash-001,gemma-3-4b-it",
		[]string{"nano-banana-pro-preview", "gemma-3-4b-it"},
	)

	assert.True(t, changed)
	assert.Equal(t, "deep-research-pro-preview-12-2025,gemini-2.0-flash-001", updated)
}

func TestRemoveChannelModelsNoChange(t *testing.T) {
	updated, changed := removeChannelModels("gemini-flash-latest,gemini-pro-latest", []string{"gemma-3-1b-it"})

	assert.False(t, changed)
	assert.Equal(t, "gemini-flash-latest,gemini-pro-latest", updated)
}
