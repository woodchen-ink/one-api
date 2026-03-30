package relay

import (
	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/requester"
	"czloapi/model"
	providersBase "czloapi/providers/base"
	"czloapi/providers/claude"
	"czloapi/safty"
	"czloapi/types"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type relayClaudeMessages struct {
	relayBase
	claudeRequest *claude.ClaudeRequest
}

func NewRelayClaudeMessages(c *gin.Context) *relayClaudeMessages {
	return &relayClaudeMessages{
		relayBase: relayBase{
			allowHeartbeat: true,
			c:              c,
		},
	}
}

func (r *relayClaudeMessages) setRequest() error {
	r.claudeRequest = &claude.ClaudeRequest{}
	if err := common.UnmarshalBodyReusable(r.c, r.claudeRequest); err != nil {
		return err
	}
	r.setOriginalModel(r.claudeRequest.Model)
	setLogReasoningMetadata(r.c, extractClaudeReasoningMetadata(r.claudeRequest))
	return nil
}

func (r *relayClaudeMessages) getRequest() interface{} {
	return r.claudeRequest
}

func (r *relayClaudeMessages) IsStream() bool {
	return r.claudeRequest.Stream
}

func (r *relayClaudeMessages) getBillingContext(promptTokens int) model.BillingContext {
	requestTokens := promptTokens + r.claudeRequest.MaxTokens
	if r.claudeRequest.Thinking != nil && r.claudeRequest.Thinking.BudgetTokens > 0 {
		requestTokens += r.claudeRequest.Thinking.BudgetTokens
	}

	return model.NewBillingContext(promptTokens, requestTokens)
}

func (r *relayClaudeMessages) getPromptTokens() (int, error) {
	channel := r.provider.GetChannel()
	return CountTokenMessages(r.claudeRequest, channel.PreCost)
}

func (r *relayClaudeMessages) send() (err *types.OpenAIErrorWithStatusCode, done bool) {
	r.claudeRequest.Model = r.modelName
	// 内容审查
	if config.EnableSafe {
		for _, message := range r.claudeRequest.Messages {
			if message.Content != nil {
				checkResult, _ := safty.CheckContent(message.Content)
				if !checkResult.IsSafe {
					err = common.StringErrorWrapperLocal(checkResult.Reason, checkResult.Code, http.StatusBadRequest)
					done = true
					return
				}
			}
		}
	}

	if chatProvider, ok := r.provider.(claude.ClaudeChatInterface); ok {
		return r.sendClaudeDirect(chatProvider)
	}

	if responsesProvider, ok := r.provider.(providersBase.ResponsesInterface); ok && r.provider.GetSupportedResponse() {
		return r.sendResponsesCompatible(responsesProvider)
	}

	chatProvider, ok := r.provider.(providersBase.ChatInterface)
	if !ok {
		err = common.StringErrorWrapperLocal("channel not implemented", "channel_error", http.StatusServiceUnavailable)
		done = true
		return
	}

	return r.sendOpenAICompatible(chatProvider)
}

func (r *relayClaudeMessages) sendClaudeDirect(chatProvider claude.ClaudeChatInterface) (err *types.OpenAIErrorWithStatusCode, done bool) {
	if r.claudeRequest.Stream {
		var response requester.StreamReaderInterface[string]
		response, err = chatProvider.CreateClaudeChatStream(r.claudeRequest)
		if err != nil {
			return
		}

		if r.heartbeat != nil {
			r.heartbeat.Stop()
		}

		doneStr := func() string {
			return ""
		}
		firstResponseTime, streamErr := responseGeneralStreamClient(r.c, response, doneStr)
		r.SetFirstResponseTime(firstResponseTime)
		if streamErr != nil {
			err = streamErr
			return
		}
	} else {
		if rawProvider, ok := r.provider.(claude.ClaudeRawChatInterface); ok {
			var response *http.Response
			response, err = rawProvider.CreateClaudeChatRaw(r.claudeRequest)
			if err != nil {
				return
			}

			if r.heartbeat != nil {
				r.heartbeat.Stop()
			}

			openErr := responseMultipart(r.c, response)
			if openErr != nil {
				err = openErr
			}
		} else {
			var response *claude.ClaudeResponse
			response, err = chatProvider.CreateClaudeChat(r.claudeRequest)
			if err != nil {
				return
			}

			if r.heartbeat != nil {
				r.heartbeat.Stop()
			}

			openErr := responseJsonClient(r.c, response)
			if openErr != nil {
				err = openErr
			}
		}
	}

	if err != nil {
		done = true
	}
	return
}

func (r *relayClaudeMessages) sendOpenAICompatible(chatProvider providersBase.ChatInterface) (err *types.OpenAIErrorWithStatusCode, done bool) {
	chatRequest, err := claude.ConvertClaudeToOpenAIChat(r.claudeRequest)
	if err != nil {
		done = true
		return err, done
	}

	chatRequest.Model = r.modelName

	if chatRequest.Stream {
		response, streamErr := chatProvider.CreateChatCompletionStream(chatRequest)
		if streamErr != nil {
			return streamErr, false
		}

		if r.heartbeat != nil {
			r.heartbeat.Stop()
		}

		claudeStream := newOpenAIToClaudeStreamWrapper(response, r.provider.GetUsage(), chatRequest.Model, true)
		firstResponseTime, streamErr := responseGeneralStreamClient(r.c, claudeStream, nil)
		r.SetFirstResponseTime(firstResponseTime)
		if streamErr != nil {
			return streamErr, false
		}
		return nil, false
	}

	response, chatErr := chatProvider.CreateChatCompletion(chatRequest)
	if chatErr != nil {
		return chatErr, false
	}

	claudeResponse, convertErr := claude.ConvertOpenAIChatToClaude(response)
	if convertErr != nil {
		done = true
		return convertErr, done
	}

	if r.heartbeat != nil {
		r.heartbeat.Stop()
	}

	if openErr := responseJsonClient(r.c, claudeResponse); openErr != nil {
		err = openErr
		done = true
	}

	return
}

func (r *relayClaudeMessages) sendResponsesCompatible(responsesProvider providersBase.ResponsesInterface) (err *types.OpenAIErrorWithStatusCode, done bool) {
	chatRequest, err := claude.ConvertClaudeToOpenAIChat(r.claudeRequest)
	if err != nil {
		done = true
		return err, done
	}

	chatRequest.Model = r.modelName
	responsesRequest := chatRequest.ToResponsesRequest()
	responsesRequest.ConvertChat = true
	if responsesRequest.PromptCacheKey == "" {
		responsesRequest.PromptCacheKey = claude.BuildClaudePromptCacheKey(r.claudeRequest)
	}
	storeFalse := false
	responsesRequest.Store = &storeFalse

	if r.claudeRequest.Stream {
		response, streamErr := responsesProvider.CreateResponsesStream(responsesRequest)
		if streamErr != nil {
			return streamErr, false
		}

		if r.heartbeat != nil {
			r.heartbeat.Stop()
		}

		claudeStream := newOpenAIToClaudeStreamWrapper(response, r.provider.GetUsage(), responsesRequest.Model, false)
		firstResponseTime, streamErr := responseGeneralStreamClient(r.c, claudeStream, nil)
		r.SetFirstResponseTime(firstResponseTime)
		if streamErr != nil {
			return streamErr, false
		}
		return nil, false
	}

	response, apiErr := responsesProvider.CreateResponses(responsesRequest)
	if apiErr != nil {
		return apiErr, false
	}

	claudeResponse, convertErr := claude.ConvertOpenAIChatToClaude(response.ToChat())
	if convertErr != nil {
		done = true
		return convertErr, done
	}

	if r.heartbeat != nil {
		r.heartbeat.Stop()
	}

	if openErr := responseJsonClient(r.c, claudeResponse); openErr != nil {
		err = openErr
		done = true
	}

	return
}

func (r *relayClaudeMessages) GetError(err *types.OpenAIErrorWithStatusCode) (int, any) {
	newErr := FilterOpenAIErr(r.c, err)
	claudeErr := claude.OpenaiErrToClaudeErr(&newErr)
	return newErr.StatusCode, claudeErr.ClaudeError
}

func (r *relayClaudeMessages) HandleJsonError(err *types.OpenAIErrorWithStatusCode) {
	statusCode, response := r.GetError(err)
	r.c.JSON(statusCode, response)
}

func (r *relayClaudeMessages) HandleStreamError(err *types.OpenAIErrorWithStatusCode) {
	_, response := r.GetError(err)

	str, jsonErr := json.Marshal(response)
	if jsonErr != nil {
		return
	}
	r.c.Writer.Write([]byte("event: error\ndata: " + string(str) + "\n\n"))
	r.c.Writer.Flush()
}

func CountTokenMessages(request *claude.ClaudeRequest, preCostType int) (int, error) {
	if preCostType == config.PreContNotAll {
		return 0, nil
	}

	tokenEncoder := common.GetTokenEncoder(request.Model)
	tokenNum := 0
	tokensPerMessage := 4
	var textMsg strings.Builder

	for _, message := range request.Messages {
		tokenNum += tokensPerMessage
		switch v := message.Content.(type) {
		case string:
			textMsg.WriteString(v)
		case []any:
			for _, m := range v {
				content := m.(map[string]any)
				switch content["type"] {
				case "text":
					textMsg.WriteString(content["text"].(string))
				default:
					tokenNum += 50
				}
			}
		}
	}

	if textMsg.Len() > 0 {
		tokenNum += common.GetTokenNum(tokenEncoder, textMsg.String())
	}

	return tokenNum, nil
}
