package controller

import (
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/notify"
	"czloapi/common/utils"
	"czloapi/model"
	"czloapi/providers"
	providers_base "czloapi/providers/base"
	"czloapi/types"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	embeddingsRegex = regexp.MustCompile(`(?:^text-|embed|Embed|rerank|davinci|babbage|bge-|e5-|LLM2Vec|retrieval|uae-|gte-)`)
	imageRegex      = regexp.MustCompile(`flux|diffusion|stabilityai|sd-|dall|cogview|janus|image`)
	responseRegex   = regexp.MustCompile(`(?:^o[1-9])`)
	noSupportRegex  = regexp.MustCompile(`(?:^tts|rerank|whisper|speech|^chirp)`)
)

var responsesPreferredModelMap = map[string]bool{
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

func testChannel(channel *model.Channel, testModel string) (openaiErr *types.OpenAIErrorWithStatusCode, err error) {
	if testModel == "" {
		testModel = channel.TestModel
		if testModel == "" {
			return nil, errors.New("请填写测速模型后再试")
		}
	}

	if err = channel.SetProxy(); err != nil {
		return nil, err
	}

	// 创建测试上下文
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, err := http.NewRequest("POST", "/v1/chat/completions", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	// 获取并验证provider
	provider := providers.GetProvider(channel, c)
	if provider == nil {
		return nil, errors.New("channel not implemented")
	}

	newModelName, err := provider.ModelMappingHandler(testModel)
	if err != nil {
		return nil, err
	}

	newModelName = strings.TrimPrefix(newModelName, "+")
	channelType := getModelType(newModelName)

	usage := &types.Usage{}
	provider.SetUsage(usage)

	if shouldPreferResponsesChannelTest(newModelName) {
		if err = setChannelTestRequestPath(c.Request, "response"); err != nil {
			return nil, err
		}
		response, responseOpenAIError, responseErr := runChannelTest(provider, "response", newModelName)
		if responseOpenAIError == nil && responseErr == nil {
			logChannelTestResponse(channel.Name, newModelName, response)
			return nil, nil
		}

		fallbackReason := "channel not implemented"
		if responseErr != nil {
			fallbackReason = responseErr.Error()
		}
		logger.SysLog(fmt.Sprintf("测试渠道 %s : %s responses 接口测速失败，回退 chat/completions，原因：%s", channel.Name, newModelName, fallbackReason))

		if err = setChannelTestRequestPath(c.Request, "chat"); err != nil {
			return nil, err
		}
		response, openAIErrorWithStatusCode, err := runChannelTest(provider, "chat", newModelName)
		if openAIErrorWithStatusCode != nil || err != nil {
			return openAIErrorWithStatusCode, err
		}
		logChannelTestResponse(channel.Name, newModelName, response)
		return nil, nil
	}

	if err = setChannelTestRequestPath(c.Request, channelType); err != nil {
		return nil, err
	}
	response, openAIErrorWithStatusCode, err := runChannelTest(provider, channelType, newModelName)
	if openAIErrorWithStatusCode != nil || err != nil {
		return openAIErrorWithStatusCode, err
	}
	logChannelTestResponse(channel.Name, newModelName, response)

	return nil, nil
}

// shouldPreferResponsesChannelTest 判断测速时是否优先尝试 Responses API。
func shouldPreferResponsesChannelTest(modelName string) bool {
	normalizedModelName := strings.ToLower(strings.TrimSpace(modelName))
	if normalizedModelName == "" {
		return false
	}

	if responsesPreferredModelMap[normalizedModelName] {
		return true
	}

	if responseRegex.MatchString(normalizedModelName) {
		return true
	}

	return strings.HasPrefix(normalizedModelName, "gpt-5")
}

// setChannelTestRequestPath 同步测试上下文中的请求路径，避免后续逻辑依赖旧路径。
func setChannelTestRequestPath(req *http.Request, channelType string) error {
	path, err := getChannelTestPath(channelType)
	if err != nil {
		return err
	}
	req.URL.Path = path
	req.RequestURI = path
	return nil
}

// getChannelTestPath 返回测速场景下对应的 API 路径。
func getChannelTestPath(channelType string) (string, error) {
	switch channelType {
	case "embeddings":
		return "/v1/embeddings", nil
	case "image":
		return "/v1/images/generations", nil
	case "chat":
		return "/v1/chat/completions", nil
	case "response":
		return "/v1/responses", nil
	default:
		return "", errors.New("不支持的模型类型")
	}
}

// runChannelTest 按指定接口类型执行一次测速请求。
func runChannelTest(provider providers_base.ProviderInterface, channelType string, modelName string) (response any, openAIErrorWithStatusCode *types.OpenAIErrorWithStatusCode, err error) {
	switch channelType {
	case "embeddings":
		embeddingsProvider, ok := provider.(providers_base.EmbeddingsInterface)
		if !ok {
			return nil, nil, errors.New("channel not implemented")
		}
		testRequest := &types.EmbeddingRequest{
			Model: modelName,
			Input: "hi",
		}
		response, openAIErrorWithStatusCode = embeddingsProvider.CreateEmbeddings(testRequest)
	case "image":
		imageProvider, ok := provider.(providers_base.ImageGenerationsInterface)
		if !ok {
			return nil, nil, errors.New("channel not implemented")
		}

		testRequest := &types.ImageRequest{
			Model:  modelName,
			Prompt: "A cute cat",
			N:      1,
		}
		response, openAIErrorWithStatusCode = imageProvider.CreateImageGenerations(testRequest)
	case "response":
		responseProvider, ok := provider.(providers_base.ResponsesInterface)
		if !ok {
			return nil, nil, errors.New("channel not implemented")
		}

		testRequest := &types.OpenAIResponsesRequest{
			Input:  "You just need to output 'hi' next.",
			Model:  modelName,
			Stream: false,
		}

		response, openAIErrorWithStatusCode = responseProvider.CreateResponses(testRequest)
	case "chat":
		chatProvider, ok := provider.(providers_base.ChatInterface)
		if !ok {
			return nil, nil, errors.New("channel not implemented")
		}
		testRequest := &types.ChatCompletionRequest{
			Messages: []types.ChatCompletionMessage{
				{
					Role:    "user",
					Content: "You just need to output 'hi' next.",
				},
			},
			Model:     modelName,
			MaxTokens: 16,
			Stream:    false,
		}

		response, openAIErrorWithStatusCode = chatProvider.CreateChatCompletion(testRequest)
	default:
		return nil, nil, errors.New("不支持的模型类型")
	}

	if openAIErrorWithStatusCode != nil {
		return nil, openAIErrorWithStatusCode, errors.New(openAIErrorWithStatusCode.Message)
	}

	return response, nil, nil
}

// logChannelTestResponse 记录测速成功时的响应摘要，便于排查渠道兼容性问题。
func logChannelTestResponse(channelName string, modelName string, response any) {
	jsonBytes, _ := json.Marshal(response)
	logger.SysLog(fmt.Sprintf("测试渠道 %s : %s 返回内容为：%s", channelName, modelName, string(jsonBytes)))
}

func getModelType(modelName string) string {
	if noSupportRegex.MatchString(modelName) {
		return "noSupport"
	}

	if embeddingsRegex.MatchString(modelName) {
		return "embeddings"
	}

	if imageRegex.MatchString(modelName) {
		return "image"
	}

	if responseRegex.MatchString(modelName) {
		return "response"
	}

	return "chat"
}

func TestChannel(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	channel, err := model.GetChannelById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	testModel := c.Query("model")
	tik := time.Now()
	openaiErr, err := testChannel(channel, testModel)
	tok := time.Now()
	milliseconds := tok.Sub(tik).Milliseconds()
	consumedTime := float64(milliseconds) / 1000.0

	success := false
	msg := ""
	if openaiErr != nil {
		if ShouldDisableChannel(channel.Type, openaiErr) {
			msg = fmt.Sprintf("测速失败，已被禁用，原因：%s", err.Error())
			DisableChannel(channel.Id, channel.Name, err.Error(), false)
		} else {
			msg = fmt.Sprintf("测速失败，原因：%s", err.Error())
		}
	} else if err != nil {
		msg = fmt.Sprintf("测速失败，原因：%s", err.Error())
	} else {
		success = true
		msg = "测速成功"
		go channel.UpdateResponseTime(milliseconds)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": success,
		"message": msg,
		"time":    consumedTime,
	})
}

var testAllChannelsLock sync.Mutex
var testAllChannelsRunning bool = false

func testAllChannels(isNotify bool) error {
	testAllChannelsLock.Lock()
	if testAllChannelsRunning {
		testAllChannelsLock.Unlock()
		return errors.New("测试已在运行中")
	}
	testAllChannelsRunning = true
	testAllChannelsLock.Unlock()
	channels, err := model.GetAllChannels()
	if err != nil {
		return err
	}
	var disableThreshold = int64(config.ChannelDisableThreshold * 1000)
	if disableThreshold == 0 {
		disableThreshold = 10000000 // a impossible value
	}
	go func() {
		var sendMessage string
		for _, channel := range channels {
			time.Sleep(config.RequestInterval)

			isChannelEnabled := channel.Status == config.ChannelStatusEnabled
			sendMessage += fmt.Sprintf("**渠道 %s - #%d - %s** : \n\n", utils.EscapeMarkdownText(channel.Name), channel.Id, channel.StatusToStr())
			tik := time.Now()
			openaiErr, err := testChannel(channel, "")
			tok := time.Now()
			milliseconds := tok.Sub(tik).Milliseconds()
			// 渠道为禁用状态，并且还是请求错误 或者 响应时间超过阈值 直接跳过，也不需要更新响应时间。
			if !isChannelEnabled {
				if err != nil {
					sendMessage += fmt.Sprintf("- 测试报错: %s \n\n- 无需改变状态，跳过\n\n", utils.EscapeMarkdownText(err.Error()))
					continue
				}
				if milliseconds > disableThreshold {
					sendMessage += fmt.Sprintf("- 响应时间 %.2fs 超过阈值 %.2fs \n\n- 无需改变状态，跳过\n\n", float64(milliseconds)/1000.0, float64(disableThreshold)/1000.0)
					continue
				}
				// 如果已被禁用，但是请求成功，需要判断是否需要恢复
				// 手动禁用的渠道，不会自动恢复
				if shouldEnableChannel(err, openaiErr) {
					if channel.Status == config.ChannelStatusAutoDisabled {
						EnableChannel(channel.Id, channel.Name, false)
						sendMessage += "- 已被启用 \n\n"
					} else {
						sendMessage += "- 手动禁用的渠道，不会自动恢复 \n\n"
					}
				}
			} else {
				// 如果渠道启用状态，但是返回了错误 或者 响应时间超过阈值，需要判断是否需要禁用
				if milliseconds > disableThreshold {
					errMsg := fmt.Sprintf("响应时间 %.2fs 超过阈值 %.2fs ", float64(milliseconds)/1000.0, float64(disableThreshold)/1000.0)
					sendMessage += fmt.Sprintf("- %s \n\n- 禁用\n\n", errMsg)
					DisableChannel(channel.Id, channel.Name, errMsg, false)
					continue
				}

				if ShouldDisableChannel(channel.Type, openaiErr) {
					sendMessage += fmt.Sprintf("- 已被禁用，原因：%s\n\n", utils.EscapeMarkdownText(err.Error()))
					DisableChannel(channel.Id, channel.Name, err.Error(), false)
					continue
				}

				if err != nil {
					sendMessage += fmt.Sprintf("- 测试报错: %s \n\n", utils.EscapeMarkdownText(err.Error()))
					continue
				}
			}
			channel.UpdateResponseTime(milliseconds)
			sendMessage += fmt.Sprintf("- 测试完成，耗时 %.2fs\n\n", float64(milliseconds)/1000.0)
		}
		testAllChannelsLock.Lock()
		testAllChannelsRunning = false
		testAllChannelsLock.Unlock()
		if isNotify {
			notify.Send("渠道测试完成", sendMessage)
		}
	}()
	return nil
}

func TestAllChannels(c *gin.Context) {
	err := testAllChannels(true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func AutomaticallyTestChannels(frequency int) {
	if frequency <= 0 {
		return
	}

	for {
		time.Sleep(time.Duration(frequency) * time.Minute)
		logger.SysLog("testing all channels")
		_ = testAllChannels(false)
		logger.SysLog("channel test finished")
	}
}
