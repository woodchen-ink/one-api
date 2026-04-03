package providers

import (
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/model"
	"czloapi/providers/ali"
	"czloapi/providers/azure"
	"czloapi/providers/azure_v1"
	"czloapi/providers/azuredatabricks"
	"czloapi/providers/base"
	"czloapi/providers/bedrock"
	"czloapi/providers/claude"
	"czloapi/providers/cloudflareAI"
	"czloapi/providers/cohere"
	"czloapi/providers/deepseek"
	"czloapi/providers/gemini"
	"czloapi/providers/groq"
	"czloapi/providers/minimax"
	"czloapi/providers/moonshot"
	"czloapi/providers/ollama"
	"czloapi/providers/openai"
	"czloapi/providers/vertexai"
	"czloapi/providers/xAI"
	"czloapi/providers/zhipu"

	"github.com/gin-gonic/gin"
)

// 定义供应商工厂接口
type ProviderFactory interface {
	Create(Channel *model.Channel) base.ProviderInterface
}

// 创建全局的供应商工厂映射
var providerFactories = make(map[int]ProviderFactory)

// 在程序启动时，添加所有的供应商工厂
func init() {
	providerFactories = map[int]ProviderFactory{
		config.ChannelTypeOpenAI:          openai.OpenAIProviderFactory{},
		config.ChannelTypeAzure:           azure.AzureProviderFactory{},
		config.ChannelTypeAli:             ali.AliProviderFactory{},
		config.ChannelTypeAnthropic:       claude.ClaudeProviderFactory{},
		config.ChannelTypeZhipu:           zhipu.ZhipuProviderFactory{},
		config.ChannelTypeGemini:          gemini.GeminiProviderFactory{},
		config.ChannelTypeMiniMax:         minimax.MiniMaxProviderFactory{},
		config.ChannelTypeDeepseek:        deepseek.DeepseekProviderFactory{},
		config.ChannelTypeGroq:            groq.GroqProviderFactory{},
		config.ChannelTypeBedrock:         bedrock.BedrockProviderFactory{},
		config.ChannelTypeCloudflareAI:    cloudflareAI.CloudflareAIProviderFactory{},
		config.ChannelTypeCohere:          cohere.CohereProviderFactory{},
		config.ChannelTypeOllama:          ollama.OllamaProviderFactory{},
		config.ChannelTypeMoonshot:        moonshot.MoonshotProviderFactory{},
		config.ChannelTypeVertexAI:        vertexai.VertexAIProviderFactory{},
		config.ChannelTypeAzureDatabricks: azuredatabricks.AzureDatabricksProviderFactory{},
		config.ChannelTypeAzureV1:         azure_v1.AzureV1ProviderFactory{},
		config.ChannelTypeXAI:             xAI.XAIProviderFactory{},
	}
}

// 获取供应商
func GetProvider(channel *model.Channel, c *gin.Context) base.ProviderInterface {
	if err := channel.SetProxy(); err != nil {
		if c != nil && c.Request != nil {
			logger.LogError(c.Request.Context(), "resolve channel proxy failed: "+err.Error())
		} else {
			logger.SysError("resolve channel proxy failed: " + err.Error())
		}
		return nil
	}

	factory, ok := providerFactories[channel.Type]
	var provider base.ProviderInterface
	if !ok {
		// 处理未找到的供应商工厂
		baseURL := channel.GetBaseURL()
		if baseURL == "" {
			return nil
		}

		provider = openai.CreateOpenAIProvider(channel, baseURL)
	} else {
		provider = factory.Create(channel)
	}
	provider.SetContext(c)

	return provider
}
