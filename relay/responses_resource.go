package relay

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"czloapi/common"
	"czloapi/common/config"
	"czloapi/model"
	"czloapi/providers/azure"
	providersBase "czloapi/providers/base"
	"czloapi/providers/openai"
	"czloapi/types"

	"github.com/gin-gonic/gin"
)

type relayResponsesCompact struct {
	relayBase
	rawBody          []byte
	responsesRequest types.OpenAIResponsesRequest
}

func NewRelayResponsesCompact(c *gin.Context) *relayResponsesCompact {
	relay := &relayResponsesCompact{}
	relay.c = c
	return relay
}

func (r *relayResponsesCompact) setRequest() error {
	if err := common.UnmarshalBodyReusable(r.c, &r.responsesRequest); err != nil {
		return err
	}

	rawBody, _ := r.c.Get(config.GinRequestBodyKey)
	bodyBytes, _ := rawBody.([]byte)
	r.rawBody = bodyBytes
	r.setOriginalModel(r.responsesRequest.Model)
	setLogReasoningMetadata(r.c, extractResponsesReasoningMetadata(&r.responsesRequest))
	return nil
}

func (r *relayResponsesCompact) getRequest() any {
	return &r.responsesRequest
}

func (r *relayResponsesCompact) getPromptTokens() (int, error) {
	channel := r.provider.GetChannel()
	return common.CountTokenInputMessages(r.responsesRequest.Input, r.modelName, channel.PreCost), nil
}

func (r *relayResponsesCompact) getBillingContext(promptTokens int) model.BillingContext {
	return model.NewBillingContext(promptTokens, promptTokens+r.responsesRequest.MaxOutputTokens)
}

func (r *relayResponsesCompact) send() (err *types.OpenAIErrorWithStatusCode, done bool) {
	url, errWithCode := getResponsesResourceURL(r.provider, "/v1/responses/compact", r.modelName)
	if errWithCode != nil {
		err = errWithCode
		done = true
		return
	}

	headers := r.provider.GetRequestHeaders()
	bodyBytes, bodyErr := overrideRequestModel(r.rawBody, r.modelName)
	if bodyErr != nil {
		err = common.ErrorWrapper(bodyErr, "marshal_request_failed", http.StatusInternalServerError)
		done = true
		return
	}
	requester := r.provider.GetRequester()
	req, requestErr := requester.NewRequest(
		http.MethodPost,
		url,
		requester.WithBody(bytes.NewReader(bodyBytes)),
		requester.WithHeader(headers),
	)
	if requestErr != nil {
		err = common.ErrorWrapper(requestErr, "new_request_failed", http.StatusInternalServerError)
		done = true
		return
	}
	defer req.Body.Close()

	r.c.Set("upstream_request_path", getUpstreamPathOnly(url))

	response := &types.OpenAIResponsesResponses{}
	resp, errWithCode := requester.SendRequest(req, response, true)
	if errWithCode != nil {
		err = errWithCode
		return
	}

	if response.Usage != nil {
		*r.provider.GetUsage() = *response.Usage.ToOpenAIUsage()
	}
	model.StoreResponseResourceBinding(response.ID, r.provider.GetChannel().Id)
	model.StoreConversationResourceBinding(response.ConversationID, r.provider.GetChannel().Id)

	if responseErr := responseMultipart(r.c, resp); responseErr != nil {
		err = responseErr
		return
	}

	r.SetFirstResponseTime(time.Now())
	return
}

func ResponsesResource(c *gin.Context) {
	responseID := strings.TrimSpace(c.Param("response_id"))
	if responseID == "" {
		common.AbortWithMessage(c, http.StatusBadRequest, "response_id is required")
		return
	}

	channelID, ok := model.GetResponseResourceBinding(responseID)
	if ok {
		c.Set("specific_channel_id", channelID)
		c.Set("specific_channel_id_ignore", false)
	} else if c.GetInt("specific_channel_id") <= 0 {
		common.AbortWithMessage(c, http.StatusBadRequest, "该 response_id 暂无渠道映射，请先通过当前网关创建该 response，或使用管理员渠道指定能力访问资源接口")
		return
	}

	provider, _, fail := GetProvider(c, "")
	if fail != nil {
		common.AbortWithMessage(c, http.StatusServiceUnavailable, fail.Error())
		return
	}

	url, errWithCode := getResponsesResourceURL(provider, c.Request.URL.Path, "")
	if errWithCode != nil {
		relayResponseWithOpenAIErr(c, errWithCode)
		return
	}

	if errWithCode = proxyResponsesResourceRequest(c, provider, url, c.Request.Body); errWithCode != nil {
		newErrWithCode := FilterOpenAIErr(c, errWithCode)
		relayResponseWithOpenAIErr(c, &newErrWithCode)
		return
	}

	recordResourceRelayLog(c, "中继:"+c.Request.URL.Path, map[string]any{
		"response_id":   responseID,
		"resource_type": "responses",
	})
}

func ResponsesInputTokensCount(c *gin.Context) {
	var request struct {
		Model string `json:"model"`
	}

	if err := common.UnmarshalBodyReusable(c, &request); err != nil {
		openaiErr := common.StringErrorWrapperLocal(err.Error(), "one_hub_error", http.StatusBadRequest)
		relayResponseWithOpenAIErr(c, openaiErr)
		return
	}

	request.Model = strings.TrimSpace(request.Model)
	if request.Model == "" {
		openaiErr := common.StringErrorWrapperLocal("field model is required", "one_hub_error", http.StatusBadRequest)
		relayResponseWithOpenAIErr(c, openaiErr)
		return
	}

	provider, modelName, fail := GetProvider(c, request.Model)
	if fail != nil {
		openaiErr := common.StringErrorWrapperLocal(fail.Error(), "one_hub_error", http.StatusServiceUnavailable)
		relayResponseWithOpenAIErr(c, openaiErr)
		return
	}
	c.Set("channel_type", provider.GetChannel().Type)
	c.Set("new_model", modelName)

	url, errWithCode := getResponsesResourceURL(provider, c.Request.URL.Path, modelName)
	if errWithCode != nil {
		relayResponseWithOpenAIErr(c, errWithCode)
		return
	}

	rawBodyValue, _ := c.Get(config.GinRequestBodyKey)
	rawBody, _ := rawBodyValue.([]byte)
	bodyBytes, bodyErr := overrideRequestModel(rawBody, modelName)
	if bodyErr != nil {
		openaiErr := common.ErrorWrapper(bodyErr, "marshal_request_failed", http.StatusInternalServerError)
		relayResponseWithOpenAIErr(c, openaiErr)
		return
	}

	if errWithCode = proxyResponsesResourceRequest(c, provider, url, bytes.NewReader(bodyBytes)); errWithCode != nil {
		newErrWithCode := FilterOpenAIErr(c, errWithCode)
		relayResponseWithOpenAIErr(c, &newErrWithCode)
		return
	}

	recordResourceRelayLog(c, "中继:"+c.Request.URL.Path, map[string]any{
		"resource_type": "responses_input_tokens",
	})
}

func overrideRequestModel(rawBody []byte, modelName string) ([]byte, error) {
	if strings.TrimSpace(modelName) == "" {
		return rawBody, nil
	}

	requestMap := make(map[string]any)
	if err := json.Unmarshal(rawBody, &requestMap); err != nil {
		return nil, err
	}

	requestMap["model"] = modelName
	return json.Marshal(requestMap)
}

func getResponsesResourceURL(provider providersBase.ProviderInterface, path string, modelName string) (string, *types.OpenAIErrorWithStatusCode) {
	switch typedProvider := provider.(type) {
	case *openai.OpenAIProvider:
		return typedProvider.GetFullRequestURL(path, modelName), nil
	case *azure.AzureProvider:
		azurePath := strings.TrimPrefix(path, "/v1")
		return typedProvider.GetFullRequestURL(azurePath, modelName), nil
	default:
		return "", common.StringErrorWrapperLocal("provider must be of type azureopenai or openai", "channel_error", http.StatusServiceUnavailable)
	}
}

func proxyResponsesResourceRequest(c *gin.Context, provider providersBase.ProviderInterface, url string, body any) *types.OpenAIErrorWithStatusCode {
	headers := provider.GetRequestHeaders()
	for k, v := range c.Request.Header {
		if _, ok := headers[k]; ok {
			continue
		}
		headers[k] = strings.Join(v, ", ")
	}

	requester := provider.GetRequester()
	req, err := requester.NewRequest(
		c.Request.Method,
		url,
		requester.WithBody(body),
		requester.WithHeader(headers),
	)
	if err != nil {
		return common.ErrorWrapper(err, "new_request_failed", http.StatusInternalServerError)
	}
	defer req.Body.Close()

	c.Set("upstream_request_path", getUpstreamPathOnly(url))

	response, errWithCode := requester.SendRequestRaw(req)
	if errWithCode != nil {
		return errWithCode
	}

	return responseMultipart(c, response)
}

func proxyResourceRequestAndDecode(c *gin.Context, provider providersBase.ProviderInterface, url string, body any, output any) *types.OpenAIErrorWithStatusCode {
	headers := provider.GetRequestHeaders()
	for k, v := range c.Request.Header {
		if _, ok := headers[k]; ok {
			continue
		}
		headers[k] = strings.Join(v, ", ")
	}

	requester := provider.GetRequester()
	req, err := requester.NewRequest(
		c.Request.Method,
		url,
		requester.WithBody(body),
		requester.WithHeader(headers),
	)
	if err != nil {
		return common.ErrorWrapper(err, "new_request_failed", http.StatusInternalServerError)
	}
	defer req.Body.Close()

	c.Set("upstream_request_path", getUpstreamPathOnly(url))

	response, errWithCode := requester.SendRequest(req, output, true)
	if errWithCode != nil {
		return errWithCode
	}

	return responseMultipart(c, response)
}
