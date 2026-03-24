package router

import (
	"czloapi/controller"
	"czloapi/middleware"
	"czloapi/relay"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func SetApiRouter(router *gin.Engine) {
	apiRouter := router.Group("/api")
	apiRouter.GET("/metrics", middleware.MetricsWithBasicAuth(), gin.WrapH(promhttp.Handler()))
	apiRouter.Use(gzip.Gzip(gzip.DefaultCompression))

	systemInfo := apiRouter.Group("/system_info")
	systemInfo.Use(middleware.RootAuth())
	{
		systemInfo.POST("/log", controller.SystemLog)
	}

	apiRouter.POST("/telegram/:token", middleware.Telegram(), controller.TelegramBotWebHook)
	apiRouter.Use(middleware.GlobalAPIRateLimit())
	{
		apiRouter.GET("/image/:id", controller.CheckImg)
		apiRouter.GET("/status", controller.GetStatus)
		apiRouter.GET("/notice", controller.GetNotice)
		apiRouter.GET("/about", controller.GetAbout)
		apiRouter.GET("/prices", middleware.PricesAuth(), middleware.CORS(), controller.GetPricesList)
		apiRouter.GET("/ownedby", relay.GetModelOwnedBy)
		apiRouter.GET("/available_model", middleware.CORS(), middleware.TrySetUserBySession(), relay.AvailableModel)
		apiRouter.GET("/pricing_model", middleware.CORS(), middleware.TrySetUserBySession(), relay.AvailablePricingModel)
		apiRouter.GET("/user_group_map", middleware.TrySetUserBySession(), controller.GetUserGroupRatio)
		apiRouter.GET("/pricing_group_map", middleware.TrySetUserBySession(), controller.GetPricingUserGroupRatio)
		apiRouter.GET("/home_page_content", controller.GetHomePageContent)
		apiRouter.GET("/verification", middleware.CriticalRateLimit(), middleware.TurnstileCheck(), controller.SendEmailVerification)
		apiRouter.GET("/reset_password", middleware.CriticalRateLimit(), middleware.TurnstileCheck(), controller.SendPasswordResetEmail)
		apiRouter.POST("/user/reset", middleware.CriticalRateLimit(), controller.ResetPassword)
		apiRouter.GET("/oauth/github", middleware.CriticalRateLimit(), controller.GitHubOAuth)
		apiRouter.GET("/oauth/czlconnect", middleware.CriticalRateLimit(), controller.CZLConnectOAuth)
		apiRouter.GET("/oauth/state", middleware.CriticalRateLimit(), controller.GenerateOAuthCode)
		apiRouter.GET("/oauth/czlconnect/bind", middleware.CriticalRateLimit(), middleware.UserAuth(), controller.CZLConnectBind)
		apiRouter.GET("/oauth/email/bind", middleware.CriticalRateLimit(), middleware.UserAuth(), controller.EmailBind)

		apiRouter.GET("/oauth/endpoint", middleware.CriticalRateLimit(), controller.OIDCEndpoint)
		apiRouter.GET("/oauth/oidc", middleware.CriticalRateLimit(), controller.OIDCAuth)

		webauthnGroup := apiRouter.Group("/webauthn")
		{
			// 注册相关
			webauthnGroup.POST("/registration/begin", middleware.UserAuth(), controller.WebauthnBeginRegistration)
			webauthnGroup.POST("/registration/finish", middleware.UserAuth(), controller.WebauthnFinishRegistration)

			// 登录相关
			webauthnGroup.POST("/login/begin", middleware.CriticalRateLimit(), controller.WebauthnBeginLogin)
			webauthnGroup.POST("/login/finish", middleware.CriticalRateLimit(), controller.WebauthnFinishLogin)

			// 凭据管理
			webauthnGroup.GET("/credentials", middleware.UserAuth(), controller.GetUserWebAuthnCredentials)
			webauthnGroup.DELETE("/credentials/:id", middleware.UserAuth(), controller.DeleteWebAuthnCredential)
		}

		apiRouter.Any("/payment/notify/:uuid", controller.PaymentCallback)

		userRoute := apiRouter.Group("/user")
		{
			userRoute.POST("/register", middleware.CriticalRateLimit(), middleware.TurnstileCheck(), controller.Register)
			userRoute.POST("/login", middleware.CriticalRateLimit(), controller.Login)
			userRoute.GET("/logout", controller.Logout)

			selfRoute := userRoute.Group("/")
			selfRoute.Use(middleware.UserAuth())
			{
				selfRoute.GET("/dashboard", controller.GetUserDashboard)
				selfRoute.GET("/dashboard/token-usage", controller.GetUserTokenUsage)
				selfRoute.GET("/dashboard/rate", controller.GetRateRealtime)
				selfRoute.GET("/dashboard/uptimekuma/status-page", controller.UptimeKumaStatusPage)
				selfRoute.GET("/dashboard/uptimekuma/status-page/heartbeat", controller.UptimeKumaStatusPageHeartbeat)
				selfRoute.GET("/invoice", controller.GetUserInvoice)
				selfRoute.GET("/invoice/detail", controller.GetUserInvoiceDetail)
				selfRoute.GET("/self", controller.GetSelf)
				selfRoute.PUT("/self", controller.UpdateSelf)
				selfRoute.POST("/unbind", controller.Unbind)
				// selfRoute.DELETE("/self", controller.DeleteSelf)
				selfRoute.GET("/token", controller.GenerateAccessToken)
				// selfRoute.GET("/aff", controller.GetAffCode)
				selfRoute.POST("/topup", controller.TopUp)
				selfRoute.GET("/payment", controller.GetUserPaymentList)
				selfRoute.GET("/order", controller.GetUserOrderList)
				selfRoute.POST("/order", controller.CreateOrder)
				selfRoute.GET("/order/status", controller.CheckOrderStatus)
				selfRoute.GET("/subscription_plan", controller.GetAvailableSubscriptionPlans)
				selfRoute.POST("/subscription/purchase", controller.PurchaseSubscription)
				selfRoute.POST("/subscription/renew", controller.RenewSubscription)
				selfRoute.GET("/subscription", controller.GetMySubscriptions)
				selfRoute.GET("/subscription/groups", controller.GetMySubscriptionGroups)
			}

			adminRoute := userRoute.Group("/")
			adminRoute.Use(middleware.AdminAuth())
			{
				adminRoute.GET("/", controller.GetUsersList)
				adminRoute.GET("/:id", controller.GetUser)
				adminRoute.POST("/", controller.CreateUser)
				adminRoute.POST("/manage", controller.ManageUser)
				adminRoute.POST("/quota/:id", controller.ChangeUserQuota)
				adminRoute.PUT("/", controller.UpdateUser)
				adminRoute.DELETE("/:id", controller.DeleteUser)
			}
		}
		optionRoute := apiRouter.Group("/option")
		optionRoute.Use(middleware.RootAuth())
		{
			optionRoute.GET("/", controller.GetOptions)
			optionRoute.PUT("/", controller.UpdateOption)
			optionRoute.GET("/telegram", controller.GetTelegramMenuList)
			optionRoute.POST("/telegram", controller.AddOrUpdateTelegramMenu)
			optionRoute.GET("/telegram/status", controller.GetTelegramBotStatus)
			optionRoute.PUT("/telegram/reload", controller.ReloadTelegramBot)
			optionRoute.GET("/telegram/:id", controller.GetTelegramMenu)
			optionRoute.DELETE("/telegram/:id", controller.DeleteTelegramMenu)
			optionRoute.GET("/safe_tools", controller.GetSafeTools)
			optionRoute.POST("/invoice/gen/:time", controller.GenInvoice)
			optionRoute.POST("/invoice/update/:time", controller.UpdateInvoice)
			optionRoute.POST("/system_info/log", controller.SystemLog)
		}

		modelOwnedByRoute := apiRouter.Group("/model_ownedby")
		modelOwnedByRoute.GET("/", controller.GetAllModelOwnedBy)
		modelOwnedByRoute.Use(middleware.AdminAuth())
		{
			modelOwnedByRoute.GET("/:id", controller.GetModelOwnedBy)
			modelOwnedByRoute.POST("/", controller.CreateModelOwnedBy)
			modelOwnedByRoute.PUT("/", controller.UpdateModelOwnedBy)
			modelOwnedByRoute.DELETE("/:id", controller.DeleteModelOwnedBy)
		}

		modelInfoRoute := apiRouter.Group("/model_info")
		modelInfoRoute.GET("/", controller.GetAllModelInfo)
		modelInfoRoute.Use(middleware.AdminAuth())
		{
			modelInfoRoute.GET("/:id", controller.GetModelInfo)
			modelInfoRoute.POST("/", controller.CreateModelInfo)
			modelInfoRoute.PUT("/", controller.UpdateModelInfo)
			modelInfoRoute.DELETE("/:id", controller.DeleteModelInfo)
		}

		modelMappingRoute := apiRouter.Group("/model_mapping")
		modelMappingRoute.GET("/", controller.GetAllModelMappings)
		modelMappingRoute.Use(middleware.AdminAuth())
		{
			modelMappingRoute.GET("/:id", controller.GetModelMapping)
			modelMappingRoute.POST("/", controller.CreateModelMapping)
			modelMappingRoute.PUT("/", controller.UpdateModelMapping)
			modelMappingRoute.DELETE("/:id", controller.DeleteModelMapping)
		}

		userGroup := apiRouter.Group("/user_group")
		userGroup.Use(middleware.AdminAuth())
		{
			userGroup.GET("/", controller.GetUserGroups)
			userGroup.GET("/:id", controller.GetUserGroupById)
			userGroup.POST("/", controller.AddUserGroup)
			userGroup.PUT("/enable/:id", controller.ChangeUserGroupEnable)
			userGroup.PUT("/", controller.UpdateUserGroup)
			userGroup.DELETE("/:id", controller.DeleteUserGroup)

		}

		subscriptionPlanRoute := apiRouter.Group("/subscription_plan")
		subscriptionPlanRoute.Use(middleware.AdminAuth())
		{
			subscriptionPlanRoute.GET("/", controller.GetSubscriptionPlanList)
			subscriptionPlanRoute.GET("/:id", controller.GetSubscriptionPlan)
			subscriptionPlanRoute.POST("/", controller.CreateSubscriptionPlan)
			subscriptionPlanRoute.PUT("/", controller.UpdateSubscriptionPlan)
			subscriptionPlanRoute.DELETE("/:id", controller.DeleteSubscriptionPlan)
			subscriptionPlanRoute.PUT("/enable/:id", controller.EnableSubscriptionPlan)
		}

		userSubscriptionRoute := apiRouter.Group("/user_subscription")
		userSubscriptionRoute.Use(middleware.AdminAuth())
		{
			userSubscriptionRoute.GET("/admin/", controller.AdminGetSubscriptionList)
			userSubscriptionRoute.POST("/admin/assign", controller.AdminAssignSubscription)
			userSubscriptionRoute.PUT("/admin/adjust/:id", controller.AdminAdjustSubscription)
			userSubscriptionRoute.PUT("/admin/reset/:id", controller.AdminResetSubscription)
			userSubscriptionRoute.PUT("/admin/revoke/:id", controller.AdminRevokeSubscription)
		}

		channelRoute := apiRouter.Group("/channel")
		channelRoute.Use(middleware.AdminAuth())
		{
			channelRoute.GET("/", controller.GetChannelsList)
			channelRoute.GET("/models", relay.ListModelsForAdmin)
			channelRoute.POST("/provider_models_list", controller.GetModelList)
			channelRoute.GET("/:id", controller.GetChannel)
			channelRoute.GET("/test", controller.TestAllChannels)
			channelRoute.GET("/test/:id", controller.TestChannel)
			channelRoute.GET("/update_balance", controller.UpdateAllChannelsBalance)
			channelRoute.GET("/update_balance/:id", controller.UpdateChannelBalance)
			channelRoute.POST("/", controller.AddChannel)
			channelRoute.PUT("/", controller.UpdateChannel)
			channelRoute.PUT("/batch/azure_api", controller.BatchUpdateChannelsAzureApi)
			channelRoute.PUT("/batch/del_model", controller.BatchDelModelChannels)
			channelRoute.DELETE("/disabled", controller.DeleteDisabledChannel)
			channelRoute.DELETE("/:id/tag", controller.DeleteChannelTag)
			channelRoute.DELETE("/:id", controller.DeleteChannel)
			channelRoute.DELETE("/batch", controller.BatchDeleteChannel)
		}
		channelTagRoute := apiRouter.Group("/channel_tag")
		channelTagRoute.Use(middleware.AdminAuth())
		{
			channelTagRoute.GET("/_all", controller.GetChannelsTagAllList)
			channelTagRoute.GET("/:tag/list", controller.GetChannelsTagList)
			channelTagRoute.GET("/:tag", controller.GetChannelsTag)
			channelTagRoute.PUT("/:tag", controller.UpdateChannelsTag)
			channelTagRoute.DELETE("/:tag", controller.DeleteChannelsTag)
			channelTagRoute.DELETE("/:tag/disabled", controller.DeleteDisabledChannelsTag)
			channelTagRoute.PUT("/:tag/priority", controller.UpdateChannelsTagPriority)
			channelTagRoute.PUT("/:tag/status/:status", controller.ChangeChannelsTagStatus)

		}

		tokenRoute := apiRouter.Group("/token")
		tokenRoute.Use(middleware.UserAuth())
		{
			tokenRoute.GET("/playground", controller.GetPlaygroundToken)
			tokenRoute.GET("/", controller.GetUserTokensList)
			tokenRoute.GET("/:id", controller.GetToken)
			tokenRoute.POST("/", controller.AddToken)
			tokenRoute.PUT("/", controller.UpdateToken)
			tokenRoute.DELETE("/:id", controller.DeleteToken)
		}
		tokenAdminRoute := apiRouter.Group("/token")
		tokenAdminRoute.Use(middleware.AdminAuth())
		{
			tokenAdminRoute.GET("/admin/search", controller.GetTokensListByAdmin)
			tokenAdminRoute.PUT("/admin", controller.UpdateTokenByAdmin)
		}
		redemptionRoute := apiRouter.Group("/redemption")
		redemptionRoute.Use(middleware.AdminAuth())
		{
			redemptionRoute.GET("/", controller.GetRedemptionsList)
			redemptionRoute.GET("/:id", controller.GetRedemption)
			redemptionRoute.POST("/", controller.AddRedemption)
			redemptionRoute.PUT("/", controller.UpdateRedemption)
			redemptionRoute.DELETE("/:id", controller.DeleteRedemption)
		}
		apiRouter.GET("/tutorial/list", controller.GetPublicTutorialList)
		tutorialRoute := apiRouter.Group("/tutorial")
		tutorialRoute.Use(middleware.AdminAuth())
		{
			tutorialRoute.GET("/", controller.GetTutorialsList)
			tutorialRoute.GET("/:id", controller.GetTutorial)
			tutorialRoute.POST("/", controller.AddTutorial)
			tutorialRoute.PUT("/", controller.UpdateTutorial)
			tutorialRoute.DELETE("/:id", controller.DeleteTutorial)
		}
		apiRouter.GET("/notice/list", controller.GetPublicNoticeList)
		apiRouter.GET("/notice/latest", controller.GetLatestNotices)
		noticeRoute := apiRouter.Group("/notice")
		noticeRoute.Use(middleware.AdminAuth())
		{
			noticeRoute.GET("/", controller.GetNoticesList)
			noticeRoute.GET("/:id", controller.GetNotice2)
			noticeRoute.POST("/", controller.AddNotice)
			noticeRoute.PUT("/", controller.UpdateNotice)
			noticeRoute.DELETE("/:id", controller.DeleteNotice)
		}
		adminLogRoute := apiRouter.Group("/admin/log")
		adminLogRoute.Use(middleware.AdminAuth())
		{
			adminLogRoute.GET("/", controller.GetAdminLogsList)
			adminLogRoute.DELETE("/", controller.DeleteHistoryLogs)
			adminLogRoute.GET("/stat", controller.GetAdminLogsStat)
			// adminLogRoute.GET("/search", controller.SearchAllLogs)
		}

		userLogRoute := apiRouter.Group("/user/log")
		userLogRoute.Use(middleware.UserAuth())
		{
			userLogRoute.GET("/", controller.GetUserLogsList)
			userLogRoute.GET("/stat", controller.GetUserLogsStat)
			// userLogRoute.GET("/search", controller.SearchUserLogs)
		}
		groupRoute := apiRouter.Group("/group")
		groupRoute.Use(middleware.AdminAuth())
		{
			groupRoute.GET("/", controller.GetGroups)
		}

		analyticsRoute := apiRouter.Group("/analytics")
		analyticsRoute.Use(middleware.AdminAuth())
		{
			analyticsRoute.GET("/statistics", controller.GetStatisticsDetail)
			analyticsRoute.GET("/period", controller.GetStatisticsByPeriod)
		}
		pricesRoute := apiRouter.Group("/prices")
		pricesRoute.Use(middleware.AdminAuth())
		{
			pricesRoute.GET("/model_list", controller.GetAllModelList)
			pricesRoute.POST("/single", controller.AddPrice)
			pricesRoute.PUT("/single/*model", controller.UpdatePrice)
			pricesRoute.DELETE("/single/*model", controller.DeletePrice)
			pricesRoute.POST("/multiple", controller.BatchSetPrices)
			pricesRoute.PUT("/multiple/delete", controller.BatchDeletePrices)
			pricesRoute.POST("/sync", controller.SyncPricing)
			pricesRoute.GET("/updateService", controller.GetUpdatePriceService)

		}

		paymentRoute := apiRouter.Group("/payment")
		paymentRoute.Use(middleware.AdminAuth())
		{
			paymentRoute.GET("/order", controller.GetOrderList)
			paymentRoute.GET("/", controller.GetPaymentList)
			paymentRoute.GET("/:id", controller.GetPayment)
			paymentRoute.POST("/", controller.AddPayment)
			paymentRoute.PUT("/", controller.UpdatePayment)
			paymentRoute.DELETE("/:id", controller.DeletePayment)
		}

	}

	sseRouter := router.Group("/api/sse")
	sseRouter.Use(middleware.GlobalAPIRateLimit())
	{
		sseRouter.POST("/channel/check", middleware.AdminAuth(), controller.CheckChannel)
	}

}
