package main

import (
	"embed"
	"fmt"
	"net/http"
	"czloapi/cli"
	"czloapi/common"
	"czloapi/common/cache"
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/notify"
	"czloapi/common/oidc"
	"czloapi/common/redis"
	"czloapi/common/requester"
	"czloapi/common/search"
	"czloapi/common/storage"
	"czloapi/common/telegram"
	"czloapi/common/webauthn"
	"czloapi/controller"
	"czloapi/cron"
	"czloapi/middleware"
	"czloapi/model"
	"czloapi/relay/task"
	"czloapi/router"
	"czloapi/safty"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

//go:embed web/build
var buildFS embed.FS

//go:embed web/build/index.html
var indexPage []byte

func main() {
	cli.InitCli()
	config.InitConf()
	if viper.GetString("log_level") == "debug" {
		config.Debug = true
	}

	logger.SetupLogger()
	logger.SysLog("CZLOapi " + config.Version + " started")

	// Initialize user token
	err := common.InitUserToken()
	if err != nil {
		logger.FatalLog("failed to initialize user token: " + err.Error())
	}

	// Initialize SQL Database
	model.SetupDB()
	defer model.CloseDB()
	// Initialize Redis
	redis.InitRedisClient()
	cache.InitCacheManager()
	// Initialize options
	model.InitOptionMap()
	// Initialize oidc
	oidc.InitOIDCConfig()
	// Initialize wenauthn
	webauthn.InitWebAuthn()
	model.NewPricing()
	model.HandleOldTokenMaxId()

	initMemoryCache()
	initSync()

	common.InitTokenEncoders()
	requester.InitHttpClient()
	// Initialize Telegram bot
	telegram.InitTelegramBot()

	task.InitTask()
	notify.InitNotifier()
	cron.InitCron()
	storage.InitStorage()
	search.InitSearcher()
	// 初始化安全检查器
	safty.InitSaftyTools()
	// 初始化账单数据
	if config.UserInvoiceMonth {
		logger.SysLog("Enable User Invoice Monthly Data")
		go model.InsertStatisticsMonth()
	}
	initHttpServer()
}

func initMemoryCache() {
	if viper.GetBool("memory_cache_enabled") {
		config.MemoryCacheEnabled = true
	}

	if !config.MemoryCacheEnabled {
		return
	}

	syncFrequency := viper.GetInt("sync_frequency")
	model.TokenCacheSeconds = syncFrequency

	logger.SysLog("memory cache enabled")
	logger.SysLog(fmt.Sprintf("sync frequency: %d seconds", syncFrequency))
	go model.SyncOptions(syncFrequency)
	go SyncChannelCache(syncFrequency)
}

func initSync() {
	// go controller.AutomaticallyUpdateChannels(viper.GetInt("channel.update_frequency"))
	go controller.AutomaticallyTestChannels(viper.GetInt("channel.test_frequency"))
}

func initHttpServer() {
	if viper.GetString("gin_mode") != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	server := gin.New()
	server.Use(gin.Recovery())
	server.Use(middleware.RequestId())
	middleware.SetUpLogger(server)

	trustedHeader := viper.GetString("trusted_header")
	if trustedHeader != "" {
		server.TrustedPlatform = trustedHeader
	}

	store := cookie.NewStore([]byte(config.SessionSecret))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   2592000, // 30 days
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteStrictMode,
	})
	server.Use(sessions.Sessions("session", store))

	router.SetRouter(server, buildFS, indexPage)
	port := viper.GetString("port")

	err := server.Run(":" + port)
	if err != nil {
		logger.FatalLog("failed to start HTTP server: " + err.Error())
	}
}

func SyncChannelCache(frequency int) {
	// 只有 从 服务器端获取数据的时候才会用到
	if config.IsMasterNode {
		logger.SysLog("master node does't synchronize the channel")
		return
	}
	for {
		time.Sleep(time.Duration(frequency) * time.Second)
		logger.SysLog("syncing channels from database")
		model.ChannelGroup.Load()
		model.GlobalUserGroupRatio.Load()
		model.PricingInstance.Init()
		model.ModelOwnedBysInstance.Load()
	}
}
