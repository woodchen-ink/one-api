package openai

import (
	"strings"

	"czloapi/types"
)

type responsesExtraBillingRecorder interface {
	IncExtraBilling(key string, bType string)
	IncExtraBillingOnce(key string, bType string, dedupeID string)
}

func isResponsesWebSearchToolType(toolType string) bool {
	switch strings.TrimSpace(strings.ToLower(toolType)) {
	case types.APITollTypeWebSearchPreview, types.APITollTypeWebSearch:
		return true
	default:
		return false
	}
}

func getResponsesWebSearchContextSize(tools []types.ResponsesTools) string {
	for _, tool := range tools {
		if !isResponsesWebSearchToolType(tool.Type) {
			continue
		}
		if tool.SearchContextSize != "" {
			return tool.SearchContextSize
		}
	}

	return "medium"
}

func applyResponsesOutputExtraBilling(recorder responsesExtraBillingRecorder, tools []types.ResponsesTools, output *types.ResponsesOutput) {
	if recorder == nil || output == nil {
		return
	}

	switch output.Type {
	case types.InputTypeWebSearchCall:
		recorder.IncExtraBilling(types.APITollTypeWebSearchPreview, getResponsesWebSearchContextSize(tools))
	case types.InputTypeCodeInterpreterCall:
		recorder.IncExtraBillingOnce(types.APITollTypeCodeInterpreter, getContainerMemoryLimit(tools), output.ContainerID)
	case types.InputTypeFileSearchCall:
		recorder.IncExtraBilling(types.APITollTypeFileSearch, "")
	case types.InputTypeImageGenerationCall:
		recorder.IncExtraBilling(types.APITollTypeImageGeneration, buildImageGenerationBillingType(tools, output))
	}
}
