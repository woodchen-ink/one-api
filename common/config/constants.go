package config

import (
	"time"

	"github.com/google/uuid"
)

var StartTime = time.Now().Unix() // unit: second
var Version = "v0.0.0"            // this hard coding will be replaced automatically when building, no need to manually change
var Commit = "unknown"
var BuildTime = "unknown"
var SystemName = "CZLOapi"
var ServerAddress = "http://localhost:3000"
var Debug = false

var OldTokenMaxId = 0

var Language = ""
var Footer = ""
var Logo = ""
var TopUpLink = ""
var ChatLink = ""
var ChatLinks = ""
var AnalyticsCode = ""

const (
	// MoneyScaleMicroUSD defines the fixed internal money precision.
	// 1 USD = 1,000,000 internal units.
	MoneyScaleMicroUSD = 1_000_000.0
	// TokenPricePerMillionBase indicates that token prices are stored as USD / 1M tokens.
	TokenPricePerMillionBase = 1_000_000.0
)

var QuotaPerUnit = MoneyScaleMicroUSD
var DisplayInCurrencyEnabled = true

// 是否开启用户月账单功能
var UserInvoiceMonth = false

// Any options with "Secret", "Token" in its key won't be return by GetOptions

var SessionSecret = uuid.New().String()

var ItemsPerPage = 50    // 修改单页数量
var MaxRecentItems = 150 // 修改最大最近项目数量

var PasswordLoginEnabled = true
var PasswordRegisterEnabled = true
var EmailVerificationEnabled = false
var GitHubOAuthEnabled = false
var CZLConnectAuthEnabled = false
var TurnstileCheckEnabled = false
var RegisterEnabled = true
var OIDCAuthEnabled = false

// 是否开启内容审查
var EnableSafe = false

// 默认使用系统自带关键词审查工具
var SafeToolName = "Keyword"

// 系统自带关键词审查默认字典
var SafeKeyWords = []string{
	"fuck",
	"shit",
	"bitch",
	"pussy",
	"cunt",
	"dick",
	"asshole",
	"bastard",
	"slut",
	"whore",
	"nigger",
	"nigga",
	"nazi",
	"gay",
	"lesbian",
	"transgender",
	"queer",
	"homosexual",
	"incest",
	"rape",
	"rapist",
	"raped",
	"raping",
	"raped",
	"raping",
	"rapist",
	"rape",
	"sex",
	"sexual",
	"sexually",
	"sexualize",
	"sexualized",
	"sexualizes",
	"sexualizing",
	"sexually",
	"sex",
	"porn",
	"pornography",
	"prostitute",
	"prostitution",
	"masturbate",
	"masturbation",
	"pedophile",
	"pedophilia",
	"hentai",
	"explicit",
	"obscene",
	"obscenity",
	"erotic",
	"erotica",
	"fetish",
	"NSFW",
	"nude",
	"nudity",
	"harassment",
	"abuse",
	"violent",
	"violence",
	"suicide",
	"racist",
	"racism",
	"discrimination",
	"hate",
	"terrorism",
	"terrorist",
	"drugs",
	"cocaine",
	"heroin",
	"methamphetamine",
}

var EmailDomainRestrictionEnabled = false
var EmailDomainWhitelist = []string{
	"gmail.com",
	"163.com",
	"126.com",
	"qq.com",
	"outlook.com",
	"hotmail.com",
	"icloud.com",
	"yahoo.com",
	"foxmail.com",
}

var MemoryCacheEnabled = false

var LogConsumeEnabled = true

var SMTPServer = ""
var SMTPPort = 587
var SMTPAccount = ""
var SMTPFrom = ""
var SMTPToken = ""

var ChatImageRequestProxy = ""

var GitHubProxy = ""
var GitHubClientId = ""
var GitHubClientSecret = ""
var GitHubOldIdCloseEnabled = false

var CZLConnectClientId = ""
var CZLConnectClientSecret = ""
var CZLConnectRedirectUri = ""

var TurnstileSiteKey = ""
var TurnstileSecretKey = ""

var OIDCClientId = ""
var OIDCClientSecret = ""
var OIDCIssuer = ""
var OIDCScopes = ""
var OIDCUsernameClaims = ""

var QuotaForNewUser = 0
var QuotaForInviter = 0
var QuotaForInvitee = 0
var ChannelDisableThreshold = 5.0
var AutomaticDisableChannelEnabled = false
var AutomaticEnableChannelEnabled = false
var QuotaRemindThreshold = 2000
var PreConsumedQuota = 1000
var ApproximateTokenEnabled = false
var DisableTokenEncoders = false
var RetryTimes = 0
var RetryTimeOut = 10

var DefaultChannelWeight = uint(1)
var RetryCooldownSeconds = 5

var CFWorkerImageUrl = ""
var CFWorkerImageKey = ""

var RootUserEmail = ""

var IsMasterNode = true

var RequestInterval time.Duration

var BatchUpdateEnabled = false
var BatchUpdateInterval = 5

var MCP_ENABLE = false

var UPTIMEKUMA_ENABLE = false
var UPTIMEKUMA_DOMAIN = ""
var UPTIMEKUMA_STATUS_PAGE_NAME = ""

const (
	RoleGuestUser  = 0
	RoleCommonUser = 1
	RoleAdminUser  = 10
	RoleRootUser   = 100
)

var RateLimitKeyExpirationDuration = 20 * time.Minute

const (
	UserStatusEnabled  = 1 // don't use 0, 0 is the default value!
	UserStatusDisabled = 2 // also don't use 0
)

const (
	TokenStatusEnabled   = 1 // don't use 0, 0 is the default value!
	TokenStatusDisabled  = 2 // also don't use 0
	TokenStatusExpired   = 3
	TokenStatusExhausted = 4
)

const (
	RedemptionCodeStatusEnabled  = 1 // don't use 0, 0 is the default value!
	RedemptionCodeStatusDisabled = 2 // also don't use 0
	RedemptionCodeStatusUsed     = 3 // also don't use 0
)

const (
	ChannelStatusUnknown          = 0
	ChannelStatusEnabled          = 1 // don't use 0, 0 is the default value!
	ChannelStatusManuallyDisabled = 2 // also don't use 0
	ChannelStatusAutoDisabled     = 3
)

const (
	ChannelTypeUnknown         = 0
	ChannelTypeOpenAI          = 1
	ChannelTypeAzure           = 3
	ChannelTypeCustom          = 8
	ChannelTypeAnthropic       = 14
	ChannelTypeZhipu           = 16
	ChannelTypeAli             = 17
	ChannelType360             = 19
	ChannelTypeOpenRouter      = 20 // deprecated: reserved for removed OpenRouter provider
	ChannelTypeTencent         = 23
	ChannelTypeAzureSpeech     = 24
	ChannelTypeGemini          = 25
	ChannelTypeMiniMax         = 27
	ChannelTypeDeepseek        = 28
	ChannelTypeMoonshot        = 29
	ChannelTypeGroq            = 31
	ChannelTypeBedrock         = 32
	ChannelTypeCloudflareAI    = 35
	ChannelTypeCohere          = 36
	ChannelTypeOllama          = 39
	ChannelTypeHunyuan         = 40
	ChannelTypeVertexAI        = 42
	ChannelTypeLLAMA           = 43
	ChannelTypeIdeogram        = 44
	ChannelTypeSiliconflow     = 45
	ChannelTypeFlux            = 46
	ChannelTypeRerank          = 48
	ChannelTypeGithub          = 49 // deprecated: reserved for removed GitHub provider
	ChannelTypeReplicate       = 52
	ChannelTypeAzureDatabricks = 54
	ChannelTypeAzureV1         = 55
	ChannelTypeXAI             = 56
)

const (
	RelayModeUnknown = iota
	RelayModeChatCompletions
	RelayModeCompletions
	RelayModeEmbeddings
	RelayModeModerations
	RelayModeImagesGenerations
	RelayModeImagesEdits
	RelayModeImagesVariations
	RelayModeEdits
	RelayModeAudioSpeech
	RelayModeAudioTranscription
	RelayModeAudioTranslation
	RelayModeRerank
	RelayModeChatRealtime
	RelayModeResponses
	RelayModeResponsesWS
)

type ContextKey string
