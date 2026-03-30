package claude

import (
	"net/http"

	"czloapi/common/requester"
	"czloapi/providers/base"
	"czloapi/types"
)

type ClaudeChatInterface interface {
	base.ProviderInterface
	CreateClaudeChat(request *ClaudeRequest) (*ClaudeResponse, *types.OpenAIErrorWithStatusCode)
	CreateClaudeChatStream(request *ClaudeRequest) (requester.StreamReaderInterface[string], *types.OpenAIErrorWithStatusCode)
}

// ClaudeRawChatInterface allows relay code to preserve the upstream Claude JSON
// body verbatim while still extracting usage locally for billing.
type ClaudeRawChatInterface interface {
	ClaudeChatInterface
	CreateClaudeChatRaw(request *ClaudeRequest) (*http.Response, *types.OpenAIErrorWithStatusCode)
}
