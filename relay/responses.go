package relay

import (
	"net/http"

	"czloapi/common"
	"czloapi/common/requester"
	"czloapi/model"
	providersBase "czloapi/providers/base"
	"czloapi/types"

	"github.com/gin-gonic/gin"
)

type relayResponses struct {
	relayBase
	responsesRequest types.OpenAIResponsesRequest
}

func NewRelayResponses(c *gin.Context) *relayResponses {
	relay := &relayResponses{}
	relay.c = c
	return relay
}

func (r *relayResponses) setRequest() error {
	if err := common.UnmarshalBodyReusable(r.c, &r.responsesRequest); err != nil {
		return err
	}

	r.setOriginalModel(r.responsesRequest.Model)
	setLogReasoningMetadata(r.c, extractResponsesReasoningMetadata(&r.responsesRequest))

	return nil
}

func (r *relayResponses) getRequest() interface{} {
	return &r.responsesRequest
}

func (r *relayResponses) IsStream() bool {
	return r.responsesRequest.Stream
}

func (r *relayResponses) getBillingContext(promptTokens int) model.BillingContext {
	return model.NewBillingContext(promptTokens, promptTokens+r.responsesRequest.MaxOutputTokens)
}

func (r *relayResponses) getPromptTokens() (int, error) {
	channel := r.provider.GetChannel()
	return common.CountTokenInputMessages(r.responsesRequest.Input, r.modelName, channel.PreCost), nil
}

func (r *relayResponses) send() (err *types.OpenAIErrorWithStatusCode, done bool) {
	r.responsesRequest.Model = r.modelName
	responsesProvider, ok := r.provider.(providersBase.ResponsesInterface)
	if !ok || !r.provider.GetSupportedResponse() {
		err = common.StringErrorWrapperLocal("channel not implemented", "channel_error", http.StatusServiceUnavailable)
		done = true
		return
	}

	if r.responsesRequest.Stream {
		var response requester.StreamReaderInterface[string]
		response, err = responsesProvider.CreateResponsesStream(&r.responsesRequest)
		if err != nil {
			return
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
		var response *types.OpenAIResponsesResponses
		response, err = responsesProvider.CreateResponses(&r.responsesRequest)
		if err != nil {
			return
		}
		openErr := responseJsonClient(r.c, response)

		if openErr != nil {
			err = openErr
		}
	}

	if err != nil {
		done = true
	}

	return
}
