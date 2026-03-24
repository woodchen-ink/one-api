package relay

import (
	"czloapi/model"
	"czloapi/relay/relay_util"
	"czloapi/types"
	"encoding/json"
	"strings"
	"time"

	providersBase "czloapi/providers/base"

	"github.com/gin-gonic/gin"
)

type relayBase struct {
	c              *gin.Context
	provider       providersBase.ProviderInterface
	originalModel  string
	modelName      string
	otherArg       string
	allowHeartbeat bool
	heartbeat      *relay_util.Heartbeat

	firstResponseTime time.Time
}

type RelayBaseInterface interface {
	send() (err *types.OpenAIErrorWithStatusCode, done bool)
	getPromptTokens() (int, error)
	getBillingContext(promptTokens int) model.BillingContext
	setRequest() error
	getRequest() any
	setProvider(modelName string) error
	getProvider() providersBase.ProviderInterface
	getOriginalModel() string
	getModelName() string
	getContext() *gin.Context
	IsStream() bool
	// HandleError(err *types.OpenAIErrorWithStatusCode)
	GetFirstResponseTime() time.Time

	HandleJsonError(err *types.OpenAIErrorWithStatusCode)
	HandleStreamError(err *types.OpenAIErrorWithStatusCode)
	SetHeartbeat(isStream bool) *relay_util.Heartbeat
}

func (r *relayBase) getRequest() interface{} {
	return nil
}

func (r *relayBase) IsStream() bool {
	return false
}

func (r *relayBase) getBillingContext(promptTokens int) model.BillingContext {
	return model.NewBillingContext(promptTokens, promptTokens)
}

func (r *relayBase) setProvider(modelName string) error {
	provider, modelName, fail := GetProvider(r.c, modelName)
	if fail != nil {
		return fail
	}
	r.provider = provider
	r.modelName = modelName

	r.provider.SetOtherArg(r.otherArg)
	enrichLogReasoningMetadata(r.c, r.originalModel, provider.GetChannel().Type)

	return nil
}

func (r *relayBase) getOtherArg() string {
	return r.otherArg
}

func (r *relayBase) setOriginalModel(modelName string) {
	// 使用#进行分隔模型名称， 将#后面的内容作为otherArg
	parts := strings.Split(modelName, "#")
	if len(parts) > 1 {
		r.otherArg = parts[1]
	}

	r.originalModel = parts[0]
}

func (r *relayBase) getContext() *gin.Context {
	return r.c
}

func (r *relayBase) getProvider() providersBase.ProviderInterface {
	return r.provider
}

func (r *relayBase) getOriginalModel() string {
	return r.originalModel
}

func (r *relayBase) getModelName() string {
	billingOriginalModel := r.c.GetBool("billing_original_model")

	if billingOriginalModel {
		return r.originalModel
	}
	return r.modelName
}

func (r *relayBase) GetFirstResponseTime() time.Time {
	return r.firstResponseTime
}

func (r *relayBase) SetFirstResponseTime(firstResponseTime time.Time) {
	r.firstResponseTime = firstResponseTime
}

func (r *relayBase) GetError(err *types.OpenAIErrorWithStatusCode) (int, any) {
	newErr := FilterOpenAIErr(r.c, err)
	return newErr.StatusCode, types.OpenAIErrorResponse{
		Error: newErr.OpenAIError,
	}
}

func (r *relayBase) HandleJsonError(err *types.OpenAIErrorWithStatusCode) {
	statusCode, response := r.GetError(err)
	r.c.JSON(statusCode, response)
}

func (r *relayBase) HandleStreamError(err *types.OpenAIErrorWithStatusCode) {
	_, response := r.GetError(err)

	str, jsonErr := json.Marshal(response)
	if jsonErr != nil {
		return
	}

	r.c.Writer.Write([]byte("data: " + string(str) + "\n\n"))
	r.c.Writer.Flush()
}

func (r *relayBase) SetHeartbeat(isStream bool) *relay_util.Heartbeat {
	if !r.allowHeartbeat {
		return nil
	}

	setting, exists := r.c.Get("key_setting")
	if !exists {
		return nil
	}

	keySetting, ok := setting.(*model.KeySetting)
	if !ok || !keySetting.Heartbeat.Enabled {
		return nil
	}

	r.heartbeat = relay_util.NewHeartbeat(
		isStream,
		relay_util.HeartbeatConfig{
			TimeoutSeconds:  keySetting.Heartbeat.TimeoutSeconds,
			IntervalSeconds: 5, // 5s 发送一次心跳
		},
		r.c,
	)
	r.heartbeat.Start()

	return r.heartbeat
}
