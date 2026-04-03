package relay

import (
	"context"
	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/requester"
	"czloapi/common/utils"
	"czloapi/controller"
	"czloapi/metrics"
	"czloapi/model"
	"czloapi/providers"
	providersBase "czloapi/providers/base"
	"czloapi/types"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func Path2Relay(c *gin.Context, path string) RelayBaseInterface {
	var relay RelayBaseInterface
	if strings.HasPrefix(path, "/v1/chat/completions") {
		relay = NewRelayChat(c)
	} else if strings.HasPrefix(path, "/v1/completions") {
		relay = NewRelayCompletions(c)
	} else if strings.HasPrefix(path, "/v1/embeddings") {
		relay = NewRelayEmbeddings(c)
	} else if strings.HasPrefix(path, "/v1/moderations") {
		relay = NewRelayModerations(c)
	} else if strings.HasPrefix(path, "/v1/images/generations") {
		relay = NewRelayImageGenerations(c)
	} else if strings.HasPrefix(path, "/v1/images/edits") {
		relay = NewRelayImageEdits(c)
	} else if strings.HasPrefix(path, "/v1/images/variations") {
		relay = NewRelayImageVariations(c)
	} else if strings.HasPrefix(path, "/v1/audio/speech") {
		relay = NewRelaySpeech(c)
	} else if strings.HasPrefix(path, "/v1/audio/transcriptions") {
		relay = NewRelayTranscriptions(c)
	} else if strings.HasPrefix(path, "/v1/audio/translations") {
		relay = NewRelayTranslations(c)
	} else if strings.HasPrefix(path, "/v1/messages") || strings.HasPrefix(path, "/claude") {
		relay = NewRelayClaudeMessages(c)
	} else if isGeminiRelayPath(path) || strings.HasPrefix(path, "/gemini") {
		relay = NewRelayGeminiOnly(c)
	} else if strings.HasPrefix(path, "/v1/responses") {
		relay = NewRelayResponses(c)
	}

	return relay
}

var geminiRelayPathRegex = regexp.MustCompile(`^/v[^/]+/models/[^/]+:(generateContent|streamGenerateContent)$`)

func isGeminiRelayPath(path string) bool {
	return geminiRelayPathRegex.MatchString(path)
}

func checkLimitModel(c *gin.Context, modelName string) (error error) {
	// 判断modelName是否在token的setting.limits.LimitModelSetting.models[]范围内

	// 从context中获取 key 设置
	keySetting, exists := c.Get("key_setting")
	if !exists {
		// 如果没有token设置，则不进行限制
		return nil
	}

	// 类型断言为 KeySetting 指针
	setting, ok := keySetting.(*model.KeySetting)
	if !ok || setting == nil {
		// 类型断言失败或为空，不进行限制
		return nil
	}

	// 检查是否启用了模型限制
	if !setting.Limits.LimitModelSetting.Enabled {
		// 未启用模型限制，允许所有模型
		return nil
	}

	// 检查模型列表是否为空
	if len(setting.Limits.LimitModelSetting.Models) == 0 {
		// Empty model list means no models are allowed
		return errors.New("No available models configured for current token")
	}

	// Check if modelName is in the allowed models list
	for _, allowedModel := range setting.Limits.LimitModelSetting.Models {
		if allowedModel == modelName {
			// Found matching model, allow usage
			return nil
		}
	}

	// modelName is not in the allowed models list
	return fmt.Errorf("Model %s is not supported for current token", modelName)
}

func GetProvider(c *gin.Context, modelName string) (provider providersBase.ProviderInterface, newModelName string, fail error) {
	// 检查模型限制
	if modelName != "" {
		if err := checkLimitModel(c, modelName); err != nil {
			c.AbortWithStatus(http.StatusNotFound)
			return nil, "", err
		}
	}
	channel, fail := fetchChannel(c, modelName)
	if fail != nil {
		return
	}
	c.Set("channel_id", channel.Id)
	c.Set("channel_type", channel.Type)

	provider = providers.GetProvider(channel, c)
	if provider == nil {
		fail = errors.New("channel not found")
		return
	}
	provider.SetOriginalModel(modelName)
	c.Set("original_model", modelName)

	// 解析全局模型映射：将别名解析为该渠道实际支持的模型
	resolvedModel := resolveGlobalAlias(modelName, channel)

	newModelName, fail = provider.ModelMappingHandler(resolvedModel)
	if fail != nil {
		return
	}

	BillingOriginalModel := false

	if strings.HasPrefix(newModelName, "+") {
		newModelName = newModelName[1:]
		BillingOriginalModel = true
	}

	c.Set("new_model", newModelName)
	c.Set("billing_original_model", BillingOriginalModel)

	return
}

// resolveGlobalAlias 将全局模型别名解析为该渠道实际支持的真实模型名
func resolveGlobalAlias(modelName string, channel *model.Channel) string {
	targets := model.GlobalModelMappingCache.GetTargets(modelName)
	if len(targets) == 0 {
		return modelName
	}

	channelModels := strings.Split(channel.Models, ",")
	for _, target := range targets {
		target = strings.TrimSpace(target)
		for _, cm := range channelModels {
			if strings.TrimSpace(cm) == target {
				return target
			}
		}
	}

	return targets[0]
}

func fetchChannel(c *gin.Context, modelName string) (channel *model.Channel, fail error) {
	channelId := c.GetInt("specific_channel_id")
	ignore := c.GetBool("specific_channel_id_ignore")
	if channelId > 0 && !ignore {
		return fetchChannelById(channelId)
	}

	return fetchChannelByModel(c, modelName)
}

func fetchChannelById(channelId int) (*model.Channel, error) {
	channel, err := model.GetChannelById(channelId)
	if err != nil {
		return nil, errors.New("无效的渠道 Id")
	}
	if channel.Status != config.ChannelStatusEnabled {
		return nil, errors.New("该渠道已被禁用")
	}

	return channel, nil
}

// GroupManager 统一管理分组逻辑
type GroupManager struct {
	primaryGroup string
	backupGroups []string
	context      *gin.Context
}

// NewGroupManager 创建分组管理器
func NewGroupManager(c *gin.Context) *GroupManager {
	backupGroups, _ := utils.GetGinValue[[]string](c, "key_backup_groups")
	return &GroupManager{
		primaryGroup: c.GetString("key_group"),
		backupGroups: backupGroups,
		context:      c,
	}
}

// TryWithGroups 尝试使用主分组和备用分组
func (gm *GroupManager) TryWithGroups(modelName string, filters []model.ChannelsFilterFunc, operation func(group string) (*model.Channel, error)) (*model.Channel, error) {
	// 首先尝试主分组
	if gm.primaryGroup != "" {
		channel, err := gm.tryGroup(gm.primaryGroup, modelName, filters, operation)
		if err == nil {
			return channel, nil
		}
		logger.LogError(gm.context.Request.Context(), fmt.Sprintf("主分组 %s 失败: %v", gm.primaryGroup, err))
	}

	// 如果主分组失败，按顺序尝试备用分组
	lastTriedGroup := gm.primaryGroup
	for _, backupGroup := range gm.backupGroups {
		if backupGroup == "" || backupGroup == gm.primaryGroup {
			continue
		}

		lastTriedGroup = backupGroup
		logger.LogInfo(gm.context.Request.Context(), fmt.Sprintf("尝试使用备用分组: %s", backupGroup))
		channel, err := gm.tryGroup(backupGroup, modelName, filters, operation)
		if err == nil {
			// 更新上下文中的分组信息
			gm.context.Set("is_backupGroup", true)
			gm.context.Set("key_backup_group", backupGroup)
			gm.context.Set("key_group", backupGroup)
			if err := gm.setGroupRatio(backupGroup); err != nil {
				return nil, fmt.Errorf("设置备用分组倍率失败: %v", err)
			}
			return channel, nil
		}
		logger.LogError(gm.context.Request.Context(), fmt.Sprintf("备用分组 %s 失败: %v", backupGroup, err))
	}

	return nil, gm.createGroupError(lastTriedGroup, modelName, nil)
}

// tryGroup 尝试使用指定分组
func (gm *GroupManager) tryGroup(group string, modelName string, filters []model.ChannelsFilterFunc, operation func(group string) (*model.Channel, error)) (*model.Channel, error) {
	if group == "" {
		return nil, errors.New("分组为空")
	}
	return operation(group)
}

// setGroupRatio 设置分组比例
func (gm *GroupManager) setGroupRatio(group string) error {
	groupRatio := model.GlobalUserGroupRatio.GetBySymbol(group)
	if groupRatio == nil {
		return fmt.Errorf("分组 %s 不存在", group)
	}
	syncGroupBillingContext(gm.context, group, "")
	return nil
}

// createGroupError 创建统一的分组错误信息
func (gm *GroupManager) createGroupError(group string, modelName string, channel *model.Channel) error {
	if channel != nil {
		logger.SysError(fmt.Sprintf("渠道不存在：%d", channel.Id))
		return errors.New("数据库一致性已被破坏，请联系管理员")
	}
	return fmt.Errorf("当前分组 %s 下对于模型 %s 无可用渠道", group, modelName)
}

func fetchChannelByModel(c *gin.Context, modelName string) (*model.Channel, error) {
	skipOnlyChat := c.GetBool("skip_only_chat")
	isStream := c.GetBool("is_stream")

	var filters []model.ChannelsFilterFunc
	if skipOnlyChat {
		filters = append(filters, model.FilterOnlyChat())
	}

	skipChannelIds, ok := utils.GetGinValue[[]int](c, "skip_channel_ids")
	if ok {
		filters = append(filters, model.FilterChannelId(skipChannelIds))
	}

	if types, exists := c.Get("allow_channel_type"); exists {
		if allowTypes, ok := types.([]int); ok {
			filters = append(filters, model.FilterChannelTypes(allowTypes))
		}
	}

	if isStream {
		filters = append(filters, model.FilterDisabledStream(modelName))
	}

	// 使用统一的分组管理器
	groupManager := NewGroupManager(c)
	return groupManager.TryWithGroups(modelName, filters, func(group string) (*model.Channel, error) {
		return model.ChannelGroup.Next(group, modelName, filters...)
	})

}

func responseJsonClient(c *gin.Context, data interface{}) *types.OpenAIErrorWithStatusCode {
	// 将data转换为 JSON
	responseBody, err := json.Marshal(data)
	if err != nil {
		logger.LogError(c.Request.Context(), "marshal_response_body_failed:"+err.Error())
		return nil
	}

	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(http.StatusOK)
	_, err = c.Writer.Write(responseBody)
	if err != nil {
		logger.LogError(c.Request.Context(), "write_response_body_failed:"+err.Error())
	}

	return nil
}

func responseJsonToChatStreamClient(c *gin.Context, response *types.ChatCompletionResponse, endHandler StreamEndHandler) (firstResponseTime time.Time, errWithOP *types.OpenAIErrorWithStatusCode) {
	requester.SetEventStreamHeaders(c)

	writeStreamPayload := func(payload string) *types.OpenAIErrorWithStatusCode {
		select {
		case <-c.Request.Context().Done():
			return nil
		default:
			if firstResponseTime.IsZero() {
				firstResponseTime = time.Now()
			}
			if _, err := c.Writer.Write([]byte("data: " + payload + "\n\n")); err != nil {
				logger.LogError(c.Request.Context(), "write_response_stream_failed:"+err.Error())
				return common.ErrorWrapper(err, "write_response_stream_failed", http.StatusInternalServerError)
			}
			c.Writer.Flush()
			return nil
		}
	}

	initialChunk := types.ChatCompletionStreamResponse{
		ID:      response.ID,
		Object:  "chat.completion.chunk",
		Created: response.Created,
		Model:   response.Model,
		Choices: make([]types.ChatCompletionStreamChoice, 0, len(response.Choices)),
	}

	finishChunk := types.ChatCompletionStreamResponse{
		ID:      response.ID,
		Object:  "chat.completion.chunk",
		Created: response.Created,
		Model:   response.Model,
		Choices: make([]types.ChatCompletionStreamChoice, 0, len(response.Choices)),
	}

	for index, choice := range response.Choices {
		initialChunk.Choices = append(initialChunk.Choices, types.ChatCompletionStreamChoice{
			Index: index,
			Delta: types.ChatCompletionStreamChoiceDelta{
				Role:             choice.Message.Role,
				Content:          choice.Message.StringContent(),
				ReasoningContent: choice.Message.ReasoningContent,
				ToolCalls:        choice.Message.ToolCalls,
			},
			FinishReason: nil,
		})

		finishChunk.Choices = append(finishChunk.Choices, types.ChatCompletionStreamChoice{
			Index:        index,
			Delta:        types.ChatCompletionStreamChoiceDelta{},
			FinishReason: choice.FinishReason,
		})
	}

	initialBody, err := json.Marshal(initialChunk)
	if err != nil {
		logger.LogError(c.Request.Context(), "marshal_chat_stream_initial_failed:"+err.Error())
		return firstResponseTime, common.ErrorWrapper(err, "marshal_chat_stream_initial_failed", http.StatusInternalServerError)
	}
	if errWithOP = writeStreamPayload(string(initialBody)); errWithOP != nil {
		return firstResponseTime, errWithOP
	}

	finishBody, err := json.Marshal(finishChunk)
	if err != nil {
		logger.LogError(c.Request.Context(), "marshal_chat_stream_finish_failed:"+err.Error())
		return firstResponseTime, common.ErrorWrapper(err, "marshal_chat_stream_finish_failed", http.StatusInternalServerError)
	}
	if errWithOP = writeStreamPayload(string(finishBody)); errWithOP != nil {
		return firstResponseTime, errWithOP
	}

	if endHandler != nil {
		streamData := endHandler()
		if streamData != "" {
			if errWithOP = writeStreamPayload(streamData); errWithOP != nil {
				return firstResponseTime, errWithOP
			}
		}
	}

	_ = writeStreamPayload("[DONE]")

	return firstResponseTime, nil
}

type StreamEndHandler func() string

func responseStreamClient(c *gin.Context, stream requester.StreamReaderInterface[string], endHandler StreamEndHandler) (firstResponseTime time.Time, errWithOP *types.OpenAIErrorWithStatusCode) {
	requester.SetEventStreamHeaders(c)
	dataChan, errChan := stream.Recv()

	// 创建一个done channel用于通知处理完成
	done := make(chan struct{})
	var finalErr *types.OpenAIErrorWithStatusCode

	defer stream.Close()

	var isFirstResponse bool

	// 在新的goroutine中处理stream数据
	go func() {
		defer close(done)

		for {
			select {
			case data, ok := <-dataChan:
				if !ok {
					return
				}
				streamData := "data: " + data + "\n\n"

				if !isFirstResponse {
					firstResponseTime = time.Now()
					isFirstResponse = true
				}

				// 尝试写入数据，如果客户端断开也继续处理
				select {
				case <-c.Request.Context().Done():
					// 客户端已断开，不执行任何操作，直接跳过
				default:
					// 客户端正常，发送数据
					c.Writer.Write([]byte(streamData))
					c.Writer.Flush()
				}

			case err := <-errChan:
				if !errors.Is(err, io.EOF) {
					// 处理错误情况
					errMsg := "data: " + err.Error() + "\n\n"
					select {
					case <-c.Request.Context().Done():
						// 客户端已断开，不执行任何操作，直接跳过
					default:
						// 客户端正常，发送错误信息
						c.Writer.Write([]byte(errMsg))
						c.Writer.Flush()
					}

					finalErr = common.StringErrorWrapper(err.Error(), "stream_error", 900)
					logger.LogError(c.Request.Context(), "Stream err:"+err.Error())
				} else {
					// 正常结束，处理endHandler
					if finalErr == nil && endHandler != nil {
						streamData := endHandler()
						if streamData != "" {
							select {
							case <-c.Request.Context().Done():
								// 客户端已断开，不执行任何操作，直接跳过
							default:
								// 客户端正常，发送数据
								c.Writer.Write([]byte("data: " + streamData + "\n\n"))
								c.Writer.Flush()
							}
						}
					}

					// 发送结束标记
					streamData := "data: [DONE]\n\n"
					select {
					case <-c.Request.Context().Done():
						// 客户端已断开，不执行任何操作，直接跳过
					default:
						c.Writer.Write([]byte(streamData))
						c.Writer.Flush()
					}
				}
				return
			}
		}
	}()

	// 等待处理完成
	<-done
	return firstResponseTime, finalErr
}

func responseGeneralStreamClient(c *gin.Context, stream requester.StreamReaderInterface[string], endHandler StreamEndHandler) (firstResponseTime time.Time, errWithOP *types.OpenAIErrorWithStatusCode) {
	requester.SetEventStreamHeaders(c)
	dataChan, errChan := stream.Recv()

	// 创建一个done channel用于通知处理完成
	done := make(chan struct{})
	var finalErr *types.OpenAIErrorWithStatusCode

	defer stream.Close()
	var isFirstResponse bool

	// 在新的goroutine中处理stream数据
	go func() {
		defer close(done)

		for {
			select {
			case data, ok := <-dataChan:
				if !ok {
					return
				}
				if !isFirstResponse {
					firstResponseTime = time.Now()
					isFirstResponse = true
				}
				// 尝试写入数据，如果客户端断开也继续处理
				select {
				case <-c.Request.Context().Done():
					// 客户端已断开，不执行任何操作，直接跳过
				default:
					// 客户端正常，发送数据
					fmt.Fprint(c.Writer, data)
					c.Writer.Flush()
				}

			case err := <-errChan:
				if !errors.Is(err, io.EOF) {
					logger.LogError(c.Request.Context(), "Stream err:"+err.Error())
					if !isFirstResponse {
						finalErr = common.StringErrorWrapper(err.Error(), "stream_error", 900)
					} else {
						// 对已开始输出的流，不再向上返回错误，避免触发整体重试。
						// 此类错误是否已写入客户端由具体 stream wrapper 决定。
					}
				} else {
					// 正常结束，处理endHandler
					if endHandler != nil {
						streamData := endHandler()
						if streamData != "" {
							select {
							case <-c.Request.Context().Done():
								// 客户端已断开，只记录数据
							default:
								// 客户端正常，发送数据
								fmt.Fprint(c.Writer, streamData)
								c.Writer.Flush()
							}
						}
					}
				}
				return
			}
		}
	}()

	// 等待处理完成
	<-done

	return firstResponseTime, finalErr
}

func responseMultipart(c *gin.Context, resp *http.Response) *types.OpenAIErrorWithStatusCode {
	defer resp.Body.Close()

	for k, v := range resp.Header {
		c.Writer.Header().Set(k, v[0])
	}

	c.Writer.WriteHeader(resp.StatusCode)

	_, err := io.Copy(c.Writer, resp.Body)
	if err != nil {
		return common.ErrorWrapper(err, "write_response_body_failed", http.StatusInternalServerError)
	}

	return nil
}

func responseCustom(c *gin.Context, response *types.AudioResponseWrapper) *types.OpenAIErrorWithStatusCode {
	for k, v := range response.Headers {
		c.Writer.Header().Set(k, v)
	}
	c.Writer.WriteHeader(http.StatusOK)

	_, err := c.Writer.Write(response.Body)
	if err != nil {
		return common.ErrorWrapper(err, "write_response_body_failed", http.StatusInternalServerError)
	}

	return nil
}

func responseCache(c *gin.Context, response string, isStream bool) {
	if isStream {
		requester.SetEventStreamHeaders(c)
		c.Stream(func(w io.Writer) bool {
			fmt.Fprint(w, response)
			return false
		})
	} else {
		c.Data(http.StatusOK, "application/json", []byte(response))
	}

}

func shouldRetry(c *gin.Context, apiErr *types.OpenAIErrorWithStatusCode, channelType int) bool {
	channelId := c.GetInt("specific_channel_id")
	ignore := c.GetBool("specific_channel_id_ignore")

	if apiErr == nil {
		return false
	}

	metrics.RecordProvider(c, apiErr.StatusCode)

	if apiErr.LocalError ||
		(channelId > 0 && !ignore) {
		return false
	}

	switch apiErr.StatusCode {
	case http.StatusTooManyRequests, http.StatusTemporaryRedirect:
		return true
	case http.StatusRequestTimeout, http.StatusGatewayTimeout, 524:
		return false
	case http.StatusBadRequest:
		return shouldRetryBadRequest(channelType, apiErr)
	}

	if apiErr.StatusCode/100 == 5 {
		return true
	}

	if apiErr.StatusCode/100 == 2 {
		return false
	}
	return true
}

func shouldRetryBadRequest(channelType int, apiErr *types.OpenAIErrorWithStatusCode) bool {
	switch channelType {
	case config.ChannelTypeAnthropic:
		return strings.Contains(apiErr.OpenAIError.Message, "Your credit balance is too low")
	case config.ChannelTypeBedrock:
		return strings.Contains(apiErr.OpenAIError.Message, "Operation not allowed")
	default:
		// gemini
		if apiErr.OpenAIError.Param == "INVALID_ARGUMENT" && strings.Contains(apiErr.OpenAIError.Message, "API key not valid") {
			return true
		}
		return false
	}
}

func processChannelRelayError(ctx context.Context, channelId int, channelName string, err *types.OpenAIErrorWithStatusCode, channelType int) {
	logger.LogError(ctx, fmt.Sprintf("relay error (channel #%d(%s)): %s", channelId, channelName, err.Message))
	if controller.ShouldDisableChannel(channelType, err) {
		controller.DisableChannel(channelId, channelName, err.Message, true)
	}
}

var (
	requestIdRegex = regexp.MustCompile(`\(request id: [^\)]+\)`)
	quotaKeywords  = []string{"余额", "额度", "quota", "无可用渠道", "令牌"}
)

func FilterOpenAIErr(c *gin.Context, err *types.OpenAIErrorWithStatusCode) (errWithStatusCode types.OpenAIErrorWithStatusCode) {
	newErr := types.OpenAIErrorWithStatusCode{}
	if err != nil {
		newErr = *err
	}

	if newErr.StatusCode == http.StatusTooManyRequests {
		newErr.OpenAIError.Message = "当前分组上游负载已饱和，请稍后再试"
	}

	// 如果message中已经包含 request id: 则不再添加
	if strings.Contains(newErr.Message, "(request id:") {
		newErr.Message = requestIdRegex.ReplaceAllString(newErr.Message, "")
	}

	requestId := c.GetString(logger.RequestIdKey)
	newErr.OpenAIError.Message = utils.MessageWithRequestId(newErr.OpenAIError.Message, requestId)

	if !newErr.LocalError && newErr.OpenAIError.Type == "one_hub_error" || strings.HasSuffix(newErr.OpenAIError.Type, "_api_error") {
		newErr.OpenAIError.Type = "system_error"
		if utils.ContainsString(newErr.Message, quotaKeywords) {
			newErr.Message = "上游负载已饱和，请稍后再试"
			newErr.StatusCode = http.StatusTooManyRequests
		}
	}

	if code, ok := newErr.OpenAIError.Code.(string); ok && code == "bad_response_status_code" && !strings.Contains(newErr.OpenAIError.Message, "bad response status code") {
		newErr.OpenAIError.Message = fmt.Sprintf("Provider API error: bad response status code %s", newErr.OpenAIError.Param)
	}

	return newErr
}

func relayResponseWithOpenAIErr(c *gin.Context, err *types.OpenAIErrorWithStatusCode) {
	c.JSON(err.StatusCode, gin.H{
		"error": err.OpenAIError,
	})
}

func relayRerankResponseWithErr(c *gin.Context, err *types.OpenAIErrorWithStatusCode) {
	// 如果message中已经包含 request id: 则不再添加
	if !strings.Contains(err.Message, "request id:") {
		requestId := c.GetString(logger.RequestIdKey)
		err.OpenAIError.Message = utils.MessageWithRequestId(err.OpenAIError.Message, requestId)
	}

	if err.OpenAIError.Type == "new_api_error" || err.OpenAIError.Type == "one_api_error" {
		err.OpenAIError.Type = "system_error"
	}

	c.JSON(err.StatusCode, gin.H{
		"detail": err.OpenAIError.Message,
	})
}
