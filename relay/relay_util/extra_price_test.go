package relay_util

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetWebSearchModelTier(t *testing.T) {
	tests := []struct {
		model    string
		expected string
	}{
		// standard tier: 仅 gpt-4o 和 gpt-4.1 系列 ($0.01/call)
		{"gpt-4o", "standard"},
		{"gpt-4o-mini", "standard"},
		{"gpt-4o-2024-11-20", "standard"},
		{"gpt-4.1", "standard"},
		{"gpt-4.1-mini", "standard"},
		{"gpt-4.1-nano", "standard"},

		// reasoning tier: 其他所有模型 ($0.025/call)
		{"gpt-3.5-turbo", "reasoning"},
		{"gpt-5", "reasoning"},
		{"gpt-5-mini", "reasoning"},
		{"gpt-5.1", "reasoning"},
		{"gpt-5.4", "reasoning"},
		{"o1", "reasoning"},
		{"o1-mini", "reasoning"},
		{"o1-pro", "reasoning"},
		{"o3", "reasoning"},
		{"o3-mini", "reasoning"},
		{"o4-mini", "reasoning"},
		{"gemini-2.5-flash", "gemini_grounded_prompt"},
		{"gemini-3.1-pro-preview", "gemini_search_query"},
		{"some-future-model", "reasoning"},
	}

	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			assert.Equal(t, tt.expected, getWebSearchModelTier(tt.model))
		})
	}
}

func TestGetDefaultExtraServicePriceWebSearch(t *testing.T) {
	// gpt-4o → standard → $0.01
	assert.Equal(t, 0.01, getDefaultExtraServicePrice("web_search_preview", "gpt-4o", ""))
	// gpt-5 → reasoning → $0.025
	assert.Equal(t, 0.025, getDefaultExtraServicePrice("web_search_preview", "gpt-5", ""))
	// o3 → reasoning → $0.025
	assert.Equal(t, 0.025, getDefaultExtraServicePrice("web_search_preview", "o3", ""))
	// gemini-2.5 → grounded prompt → $0.035
	assert.Equal(t, 0.035, getDefaultExtraServicePrice("web_search_preview", "gemini-2.5-flash", ""))
	// gemini-3 → search query → $0.014
	assert.Equal(t, 0.014, getDefaultExtraServicePrice("web_search_preview", "gemini-3.1-pro-preview", ""))
}

func TestGetDefaultExtraServicePriceCodeInterpreter(t *testing.T) {
	// 按 memory_limit 阶梯定价
	assert.Equal(t, 0.03, getDefaultExtraServicePrice("code_interpreter", "gpt-4o", "1g"))
	assert.Equal(t, 0.12, getDefaultExtraServicePrice("code_interpreter", "gpt-4o", "4g"))
	assert.Equal(t, 0.48, getDefaultExtraServicePrice("code_interpreter", "gpt-4o", "16g"))
	assert.Equal(t, 1.92, getDefaultExtraServicePrice("code_interpreter", "gpt-4o", "64g"))
	// 空 extraType 默认 1g
	assert.Equal(t, 0.03, getDefaultExtraServicePrice("code_interpreter", "gpt-4o", ""))
	// 未知 memory_limit 默认 1g
	assert.Equal(t, 0.03, getDefaultExtraServicePrice("code_interpreter", "gpt-4o", "unknown"))
}
