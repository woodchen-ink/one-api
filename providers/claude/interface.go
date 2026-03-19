package claude

import (
	"czloapi/common/requester"
	"czloapi/providers/base"
	"czloapi/types"
)

type ClaudeChatInterface interface {
	base.ProviderInterface
	CreateClaudeChat(request *ClaudeRequest) (*ClaudeResponse, *types.OpenAIErrorWithStatusCode)
	CreateClaudeChatStream(request *ClaudeRequest) (requester.StreamReaderInterface[string], *types.OpenAIErrorWithStatusCode)
}
