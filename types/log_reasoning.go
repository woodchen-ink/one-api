package types

const LogReasoningMetadataContextKey = "log_reasoning_metadata"
const ResponsesWSRequestToolsContextKey = "responses_ws_request_tools"

const (
	LogReasoningProviderOpenAI = "openai"
	LogReasoningProviderClaude = "claude"
	LogReasoningProviderGemini = "gemini"
)

const (
	LogReasoningModeEffort        = "effort"
	LogReasoningModeThinkingLevel = "thinking_level"
	LogReasoningModeBudgetTokens  = "budget_tokens"
	LogReasoningModeToggle        = "toggle"
)

const (
	LogReasoningViaChatCompletions = "chat_completions"
	LogReasoningViaResponses       = "responses"
	LogReasoningViaClaudeNative    = "claude_native"
	LogReasoningViaGeminiNative    = "gemini_native"
	LogReasoningViaModelSuffix     = "model_suffix"
)

type LogReasoningMetadata struct {
	Enabled          bool   `json:"enabled"`
	Level            string `json:"level,omitempty"`
	ProviderFamily   string `json:"provider_family,omitempty"`
	Mode             string `json:"mode,omitempty"`
	RawEffort        string `json:"raw_effort,omitempty"`
	RawThinkingLevel string `json:"raw_thinking_level,omitempty"`
	BudgetTokens     *int   `json:"budget_tokens,omitempty"`
	Summary          string `json:"summary,omitempty"`
	RequestedVia     string `json:"requested_via,omitempty"`
}
