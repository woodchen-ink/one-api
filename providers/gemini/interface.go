package gemini

import (
	"czloapi/common/requester"
	"czloapi/providers/base"
	"czloapi/types"
)

type GeminiChatInterface interface {
	base.ProviderInterface
	CreateGeminiChat(request *GeminiChatRequest) (*GeminiChatResponse, *types.OpenAIErrorWithStatusCode)
	CreateGeminiChatStream(request *GeminiChatRequest) (requester.StreamReaderInterface[string], *types.OpenAIErrorWithStatusCode)
}
