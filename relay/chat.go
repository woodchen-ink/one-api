package relay

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/requester"
	"czloapi/common/utils"
	"czloapi/model"
	providersBase "czloapi/providers/base"
	"czloapi/safty"
	"czloapi/types"

	"github.com/gin-gonic/gin"
)

type relayChat struct {
	relayBase
	chatRequest types.ChatCompletionRequest
}

func NewRelayChat(c *gin.Context) *relayChat {
	relay := &relayChat{
		relayBase: relayBase{
			allowHeartbeat: true,
			c:              c,
		},
	}
	return relay
}

func (r *relayChat) setRequest() error {
	if err := common.UnmarshalBodyReusable(r.c, &r.chatRequest); err != nil {
		return err
	}

	if r.chatRequest.MaxTokens < 0 || r.chatRequest.MaxTokens > math.MaxInt32/2 {
		return errors.New("max_tokens is invalid")
	}

	if r.chatRequest.Tools != nil {
		r.c.Set("skip_only_chat", true)
	}

	if !r.chatRequest.Stream {
		r.chatRequest.StreamOptions = nil
	}

	r.setOriginalModel(r.chatRequest.Model)
	setLogReasoningMetadata(r.c, extractChatReasoningMetadata(&r.chatRequest, r.getOtherArg()))

	otherArg := r.getOtherArg()

	if otherArg == "search" {
		handleSearch(r.c, &r.chatRequest)
		return nil
	}

	return nil
}

func (r *relayChat) getRequest() interface{} {
	return &r.chatRequest
}

func (r *relayChat) IsStream() bool {
	return r.chatRequest.Stream
}

func (r *relayChat) getBillingContext(promptTokens int) model.BillingContext {
	maxOutputTokens := r.chatRequest.MaxTokens
	if r.chatRequest.MaxCompletionTokens > 0 && maxOutputTokens == 0 {
		maxOutputTokens = r.chatRequest.MaxCompletionTokens
	}

	return model.NewBillingContext(promptTokens, promptTokens+maxOutputTokens)
}

func (r *relayChat) getPromptTokens() (int, error) {
	channel := r.provider.GetChannel()
	return common.CountTokenMessages(r.chatRequest.Messages, r.modelName, channel.PreCost), nil
}

var need2Response = map[string]bool{
	"o3-pro-2025-06-10":                true,
	"o3-pro":                           true,
	"o1-pro-2025-03-19":                true,
	"o1-pro":                           true,
	"o3-deep-research-2025-06-26":      true,
	"o3-deep-research":                 true,
	"o4-mini-deep-research-2025-06-26": true,
	"o4-mini-deep-research":            true,
	"codex-mini-latest":                true,
}

func shouldUseResponsesCompat(channel *model.Channel, modelName string) bool {
	if need2Response[modelName] {
		return true
	}

	if channel == nil || !channel.CompatibleResponse {
		return false
	}

	normalizedModelName := strings.ToLower(strings.TrimSpace(modelName))
	return strings.HasPrefix(normalizedModelName, "gpt-5")
}

func (r *relayChat) send() (err *types.OpenAIErrorWithStatusCode, done bool) {
	if shouldUseResponsesCompat(r.provider.GetChannel(), r.modelName) {
		resProvider, ok := r.provider.(providersBase.ResponsesInterface)
		if ok {
			return r.compatibleSend(resProvider)
		}
	}

	chatProvider, ok := r.provider.(providersBase.ChatInterface)
	if !ok {
		err = common.StringErrorWrapperLocal("channel not implemented", "channel_error", http.StatusServiceUnavailable)
		done = true
		return
	}

	r.chatRequest.Model = r.modelName
	// 内容审查
	if config.EnableSafe {
		for _, message := range r.chatRequest.Messages {
			if message.Content != nil {
				CheckResult, _ := safty.CheckContent(message.Content)
				if !CheckResult.IsSafe {
					err = common.StringErrorWrapperLocal(CheckResult.Reason, CheckResult.Code, http.StatusBadRequest)
					done = true
					return
				}
			}
		}
	}

	if r.chatRequest.Stream {
		var response requester.StreamReaderInterface[string]
		response, err = chatProvider.CreateChatCompletionStream(&r.chatRequest)
		if err != nil {
			return
		}

		if r.heartbeat != nil {
			r.heartbeat.Stop()
		}

		doneStr := func() string {
			return r.getUsageResponse()
		}

		var firstResponseTime time.Time
		firstResponseTime, err = responseStreamClient(r.c, response, doneStr)
		r.SetFirstResponseTime(firstResponseTime)
	} else {
		var response *types.ChatCompletionResponse
		response, err = chatProvider.CreateChatCompletion(&r.chatRequest)
		if err != nil {
			return
		}

		if r.heartbeat != nil {
			r.heartbeat.Stop()
		}

		err = responseJsonClient(r.c, response)

	}

	if err != nil {
		done = true
	}

	return
}

func (r *relayChat) getUsageResponse() string {
	if r.chatRequest.StreamOptions != nil && r.chatRequest.StreamOptions.IncludeUsage {
		usageResponse := types.ChatCompletionStreamResponse{
			ID:      fmt.Sprintf("chatcmpl-%s", utils.GetUUID()),
			Object:  "chat.completion.chunk",
			Created: utils.GetTimestamp(),
			Model:   r.chatRequest.Model,
			Choices: []types.ChatCompletionStreamChoice{},
			Usage:   r.provider.GetUsage(),
		}

		responseBody, err := json.Marshal(usageResponse)
		if err != nil {
			return ""
		}

		return string(responseBody)
	}

	return ""
}

func (r *relayChat) compatibleSend(resProvider providersBase.ResponsesInterface) (err *types.OpenAIErrorWithStatusCode, done bool) {
	resRequest := r.chatRequest.ToResponsesRequest()
	resRequest.ConvertChat = true
	debugSummary := buildResponsesCompatDebugSummary(resRequest)

	if r.chatRequest.Stream {
		var response requester.StreamReaderInterface[string]
		response, err = resProvider.CreateResponsesStream(resRequest)
		if err != nil {
			logger.LogError(r.c.Request.Context(), fmt.Sprintf("chat->responses stream forward failed, model=%s, status=%d, upstream=%s, debug=%s", r.modelName, err.StatusCode, err.Message, debugSummary))
			return
		}

		if r.heartbeat != nil {
			r.heartbeat.Stop()
		}

		doneStr := func() string {
			return r.getUsageResponse()
		}

		var firstResponseTime time.Time
		firstResponseTime, err = responseStreamClient(r.c, response, doneStr)
		r.SetFirstResponseTime(firstResponseTime)
	} else {
		var response *types.OpenAIResponsesResponses
		response, err = resProvider.CreateResponses(resRequest)
		if err != nil {
			logger.LogError(r.c.Request.Context(), fmt.Sprintf("chat->responses forward failed, model=%s, status=%d, upstream=%s, debug=%s", r.modelName, err.StatusCode, err.Message, debugSummary))
			return
		}

		if r.heartbeat != nil {
			r.heartbeat.Stop()
		}
		err = responseJsonClient(r.c, response.ToChat())
	}

	if err != nil {
		done = true
	}

	return
}

type responsesCompatDebugItem struct {
	Index      int      `json:"index"`
	Type       string   `json:"type,omitempty"`
	Role       string   `json:"role,omitempty"`
	Content    string   `json:"content_kind,omitempty"`
	Types      []string `json:"content_types,omitempty"`
	ParseError string   `json:"parse_error,omitempty"`
	Output     string   `json:"output_kind,omitempty"`
}

type responsesCompatDebugSummary struct {
	Model      string                     `json:"model"`
	Stream     bool                       `json:"stream"`
	InputCount int                        `json:"input_count"`
	Items      []responsesCompatDebugItem `json:"items,omitempty"`
	ParseError string                     `json:"parse_error,omitempty"`
}

func buildResponsesCompatDebugSummary(req *types.OpenAIResponsesRequest) string {
	summary := responsesCompatDebugSummary{
		Model:  req.Model,
		Stream: req.Stream,
	}

	inputs, err := req.ParseInput()
	if err != nil {
		summary.ParseError = err.Error()
	}
	summary.InputCount = len(inputs)

	for index, input := range inputs {
		item := responsesCompatDebugItem{
			Index: index,
			Type:  input.Type,
			Role:  input.Role,
		}

		switch content := input.Content.(type) {
		case nil:
			item.Content = "nil"
		case string:
			item.Content = "string"
		default:
			item.Content = fmt.Sprintf("%T", content)
		}

		if input.Type == types.InputTypeMessage {
			contents, contentErr := input.ParseContent()
			if contentErr != nil {
				item.ParseError = contentErr.Error()
			} else {
				types := make([]string, 0, len(contents))
				for _, content := range contents {
					types = append(types, content.Type)
				}
				item.Types = types
			}
		}

		if input.Type == types.InputTypeFunctionCallOutput {
			item.Output = fmt.Sprintf("%T", input.Output)
		}

		summary.Items = append(summary.Items, item)
	}

	data, marshalErr := json.Marshal(summary)
	if marshalErr != nil {
		return fmt.Sprintf("{\"marshal_error\":%q}", marshalErr.Error())
	}

	const maxLogLength = 3000
	if len(data) > maxLogLength {
		return string(data[:maxLogLength]) + "...(truncated)"
	}

	return string(data)
}
