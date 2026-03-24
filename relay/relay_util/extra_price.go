package relay_util

import (
	"czloapi/types"
	"strings"
)

// 暂时先放这里，简单处理
type ExtraServicePriceConfig struct {
	// Web Search 价格配置
	WebSearch map[string]float64 `json:"web_search"` // tier -> price per call
	// File Search 价格
	FileSearch float64 `json:"file_search"`
	// Code Interpreter / Container 价格 (按 memory_limit 阶梯)
	CodeInterpreter map[string]float64 `json:"code_interpreter"` // memory_limit -> price per container session

	ImageGeneration map[string]map[string]float64 `json:"image_generation"`
}

var defaultExtraServicePrices = ExtraServicePriceConfig{
	WebSearch: map[string]float64{
		"standard":               0.01,  // gpt-4o, gpt-4.1 系列: $10/1k calls
		"reasoning":              0.025, // gpt-5+, o-series reasoning 模型: $25/1k calls
		"gemini_grounded_prompt": 0.035, // Gemini 2.5 / 非 Gemini 3 grounding: $35/1k grounded prompts
		"gemini_search_query":    0.014, // Gemini 3 grounding: $14/1k search queries
	},
	FileSearch: 0.0025, // $2.50/1k calls
	CodeInterpreter: map[string]float64{
		"1g":  0.03,
		"4g":  0.12,
		"16g": 0.48,
		"64g": 1.92,
	},
	ImageGeneration: map[string]map[string]float64{
		"low": {
			"1024x1024": 0.011,
			"1024x1536": 0.016,
			"1536x1024": 0.016,
		},
		"medium": {
			"1024x1024": 0.042,
			"1024x1536": 0.063,
			"1536x1024": 0.063,
		},
		"high": {
			"1024x1024": 0.167,
			"1024x1536": 0.25,
			"1536x1024": 0.25,
		},
	},
}

func getWebSearchModelTier(modelName string) string {
	if strings.HasPrefix(modelName, "gemini-3") {
		return "gemini_search_query"
	}
	if strings.HasPrefix(modelName, "gemini-") {
		return "gemini_grounded_prompt"
	}

	// 仅 gpt-4o 和 gpt-4.1 系列享受 standard 价格 ($0.01/call)
	if strings.HasPrefix(modelName, "gpt-4o") || strings.HasPrefix(modelName, "gpt-4.1") {
		return "standard"
	}
	// 其他所有模型（含 gpt-5+、reasoning 模型及未来新模型）使用 reasoning 价格 ($0.025/call)
	return "reasoning"
}

// 获取默认的额外服务价格
func getDefaultExtraServicePrice(serviceType, modelName, extraType string) float64 {
	switch serviceType {
	case types.APITollTypeWebSearchPreview:
		tier := getWebSearchModelTier(modelName)
		return defaultExtraServicePrices.WebSearch[tier]
	case types.APITollTypeFileSearch:
		return defaultExtraServicePrices.FileSearch
	case types.APITollTypeCodeInterpreter:
		memoryLimit := strings.ToLower(extraType)
		if price, ok := defaultExtraServicePrices.CodeInterpreter[memoryLimit]; ok {
			return price
		}
		// 默认 1g
		return defaultExtraServicePrices.CodeInterpreter["1g"]

	case types.APITollTypeImageGeneration:
		if extraType == "" {
			return 0
		}
		// imageType 需要是 quality + "-" + size 的格式
		parts := strings.Split(extraType, "-")
		if len(parts) != 2 {
			return 0
		}
		quality := strings.ToLower(parts[0])
		size := strings.ToLower(parts[1])

		if quality == "" || size == "" {
			return 0
		}

		if _, ok := defaultExtraServicePrices.ImageGeneration[quality]; !ok {
			return 0
		}
		if price, ok := defaultExtraServicePrices.ImageGeneration[quality][size]; ok {
			return price
		}
		return 0
	default:
		return 0
	}
}
