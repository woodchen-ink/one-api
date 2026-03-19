package router

import (
	"czloapi/middleware"
	"czloapi/relay"

	"github.com/gin-gonic/gin"
)

func SetRelayRouter(router *gin.Engine) {
	router.Use(middleware.CORS())
	// https://platform.openai.com/docs/api-reference/introduction
	setOpenAIRouter(router)
	setClaudeRouter(router)
	setGeminiRouter(router)
}

func setOpenAIRouter(router *gin.Engine) {
	modelsRouter := router.Group("/v1/models")
	modelsRouter.Use(middleware.OpenaiAuth(), middleware.Distribute())
	{
		modelsRouter.GET("", relay.ListModelsByToken)
		modelsRouter.GET("/:model", relay.RetrieveModel)
	}
	relayV1Router := router.Group("/v1")
	relayV1Router.Use(middleware.RelayPanicRecover(), middleware.OpenaiAuth(), middleware.Distribute(), middleware.DynamicRedisRateLimiter())
	{
		relayV1Router.POST("/completions", relay.Relay)
		relayV1Router.POST("/chat/completions", relay.Relay)
		relayV1Router.POST("/responses", relay.Relay)
		// relayV1Router.POST("/edits", controller.Relay)
		relayV1Router.POST("/images/generations", relay.Relay)
		relayV1Router.POST("/images/edits", relay.Relay)
		relayV1Router.POST("/images/variations", relay.Relay)
		relayV1Router.POST("/embeddings", relay.Relay)
		// relayV1Router.POST("/engines/:model/embeddings", controller.RelayEmbeddings)
		relayV1Router.POST("/audio/transcriptions", relay.Relay)
		relayV1Router.POST("/audio/translations", relay.Relay)
		relayV1Router.POST("/audio/speech", relay.Relay)
		relayV1Router.POST("/moderations", relay.Relay)
		relayV1Router.POST("/rerank", relay.RelayRerank)
		relayV1Router.GET("/realtime", relay.ChatRealtime)

		relayV1Router.Use(middleware.SpecifiedChannel())
		{
			relayV1Router.Any("/files", relay.RelayOnly)
			relayV1Router.Any("/files/*any", relay.RelayOnly)
			relayV1Router.Any("/fine_tuning/*any", relay.RelayOnly)
			relayV1Router.Any("/assistants", relay.RelayOnly)
			relayV1Router.Any("/assistants/*any", relay.RelayOnly)
			relayV1Router.Any("/threads", relay.RelayOnly)
			relayV1Router.Any("/threads/*any", relay.RelayOnly)
			relayV1Router.Any("/batches/*any", relay.RelayOnly)
			relayV1Router.Any("/vector_stores/*any", relay.RelayOnly)
			relayV1Router.DELETE("/models/:model", relay.RelayOnly)
		}
	}
}

func setClaudeRouter(router *gin.Engine) {
	rootClaudeRouter := router.Group("/v1")
	rootClaudeRouter.Use(middleware.RelayCluadePanicRecover(), middleware.ClaudeAuth(), middleware.Distribute(), middleware.DynamicRedisRateLimiter())
	{
		rootClaudeRouter.POST("/messages", relay.Relay)
	}

	relayClaudeRouter := router.Group("/claude")
	relayV1Router := relayClaudeRouter.Group("/v1")
	relayV1Router.Use(middleware.RelayCluadePanicRecover(), middleware.ClaudeAuth(), middleware.Distribute(), middleware.DynamicRedisRateLimiter())
	{
		relayV1Router.POST("/messages", relay.Relay)
		relayV1Router.GET("/models", relay.ListClaudeModelsByToken)
	}
}

func setGeminiRouter(router *gin.Engine) {
	rootGeminiRouter := router.Group("/")
	rootGeminiRouter.Use(middleware.RelayGeminiPanicRecover(), middleware.GeminiAuth(), middleware.Distribute(), middleware.DynamicRedisRateLimiter())
	{
		rootGeminiRouter.POST("/v1/models/:model", relay.Relay)
		rootGeminiRouter.POST("/v1beta/models/:model", relay.Relay)
		rootGeminiRouter.GET("/v1beta/models", relay.ListGeminiModelsByToken)
	}

	relayGeminiRouter := router.Group("/gemini")
	relayGeminiRouter.Use(middleware.RelayGeminiPanicRecover(), middleware.GeminiAuth(), middleware.Distribute(), middleware.DynamicRedisRateLimiter())
	{
		relayGeminiRouter.POST("/:version/models/:model", relay.Relay)
		relayGeminiRouter.GET("/:version/models", relay.ListGeminiModelsByToken)
	}
}
