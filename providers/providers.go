package providers

import (
	"czloapi/common/config"
	"czloapi/model"
	"czloapi/providers/ali"
	"czloapi/providers/azure"
	azurespeech "czloapi/providers/azureSpeech"
	"czloapi/providers/azure_v1"
	"czloapi/providers/azuredatabricks"
	"czloapi/providers/baichuan"
	"czloapi/providers/baidu"
	"czloapi/providers/base"
	"czloapi/providers/bedrock"
	"czloapi/providers/claude"
	"czloapi/providers/cloudflareAI"
	"czloapi/providers/cohere"
	"czloapi/providers/coze"
	"czloapi/providers/deepseek"
	"czloapi/providers/gemini"
	"czloapi/providers/github"
	"czloapi/providers/groq"
	"czloapi/providers/hunyuan"
	"czloapi/providers/jina"
	"czloapi/providers/minimax"
	"czloapi/providers/mistral"
	"czloapi/providers/moonshot"
	"czloapi/providers/ollama"
	"czloapi/providers/openai"
	"czloapi/providers/openrouter"
	"czloapi/providers/palm"
	"czloapi/providers/replicate"
	"czloapi/providers/siliconflow"
	"czloapi/providers/stabilityAI"
	"czloapi/providers/tencent"
	"czloapi/providers/vertexai"
	"czloapi/providers/xAI"
	"czloapi/providers/xunfei"
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
		config.ChannelTypeTencent:         tencent.TencentProviderFactory{},
		config.ChannelTypeBaidu:           baidu.BaiduProviderFactory{},
		config.ChannelTypeAnthropic:       claude.ClaudeProviderFactory{},
		config.ChannelTypePaLM:            palm.PalmProviderFactory{},
		config.ChannelTypeZhipu:           zhipu.ZhipuProviderFactory{},
		config.ChannelTypeXunfei:          xunfei.XunfeiProviderFactory{},
		config.ChannelTypeAzureSpeech:     azurespeech.AzureSpeechProviderFactory{},
		config.ChannelTypeGemini:          gemini.GeminiProviderFactory{},
		config.ChannelTypeBaichuan:        baichuan.BaichuanProviderFactory{},
		config.ChannelTypeMiniMax:         minimax.MiniMaxProviderFactory{},
		config.ChannelTypeDeepseek:        deepseek.DeepseekProviderFactory{},
		config.ChannelTypeMistral:         mistral.MistralProviderFactory{},
		config.ChannelTypeGroq:            groq.GroqProviderFactory{},
		config.ChannelTypeBedrock:         bedrock.BedrockProviderFactory{},
		config.ChannelTypeCloudflareAI:    cloudflareAI.CloudflareAIProviderFactory{},
		config.ChannelTypeCohere:          cohere.CohereProviderFactory{},
		config.ChannelTypeStabilityAI:     stabilityAI.StabilityAIProviderFactory{},
		config.ChannelTypeCoze:            coze.CozeProviderFactory{},
		config.ChannelTypeOllama:          ollama.OllamaProviderFactory{},
		config.ChannelTypeMoonshot:        moonshot.MoonshotProviderFactory{},
		config.ChannelTypeHunyuan:         hunyuan.HunyuanProviderFactory{},
		config.ChannelTypeVertexAI:        vertexai.VertexAIProviderFactory{},
		config.ChannelTypeSiliconflow:     siliconflow.SiliconflowProviderFactory{},
		config.ChannelTypeJina:            jina.JinaProviderFactory{},
		config.ChannelTypeGithub:          github.GithubProviderFactory{},
		config.ChannelTypeReplicate:       replicate.ReplicateProviderFactory{},
		config.ChannelTypeOpenRouter:      openrouter.OpenRouterProviderFactory{},
		config.ChannelTypeAzureDatabricks: azuredatabricks.AzureDatabricksProviderFactory{},
		config.ChannelTypeAzureV1:         azure_v1.AzureV1ProviderFactory{},
		config.ChannelTypeXAI:             xAI.XAIProviderFactory{},
	}
}

// 获取供应商
func GetProvider(channel *model.Channel, c *gin.Context) base.ProviderInterface {
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
