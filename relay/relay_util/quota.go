package relay_util

import (
	"context"
	"errors"
	"math"
	"net/http"
	"time"

	"one-api/common"
	"one-api/common/config"
	"one-api/common/logger"
	"one-api/common/utils"
	"one-api/model"
	"one-api/types"

	"github.com/gin-gonic/gin"
)

type Quota struct {
	modelName        string
	promptTokens     int
	price            model.Price
	groupName        string
	isBackupGroup    bool
	backupGroupName  string
	groupRatio       float64
	inputPrice       float64
	outputPrice      float64
	preConsumedQuota int
	cacheQuota       int
	userId           int
	channelId        int
	tokenId          int
	unlimitedQuota   bool
	HandelStatus     bool

	startTime         time.Time
	firstResponseTime time.Time
	extraBillingData  map[string]ExtraBillingData
	requestPath       string
	reasoningMetadata *types.LogReasoningMetadata
}

func NewQuota(c *gin.Context, modelName string, promptTokens int) *Quota {
	isBackupGroup := c.GetBool("is_backupGroup")

	quota := &Quota{
		modelName:      modelName,
		promptTokens:   promptTokens,
		userId:         c.GetInt("id"),
		channelId:      c.GetInt("channel_id"),
		tokenId:        c.GetInt("token_id"),
		unlimitedQuota: c.GetBool("token_unlimited_quota"),
		HandelStatus:   false,
		isBackupGroup:  isBackupGroup,
	}

	if reasoningMetadata, ok := utils.GetGinValue[*types.LogReasoningMetadata](c, types.LogReasoningMetadataContextKey); ok && reasoningMetadata != nil {
		clonedMetadata := *reasoningMetadata
		if reasoningMetadata.BudgetTokens != nil {
			budgetTokens := *reasoningMetadata.BudgetTokens
			clonedMetadata.BudgetTokens = &budgetTokens
		}
		quota.reasoningMetadata = &clonedMetadata
	}

	quota.price = *model.PricingInstance.GetPrice(quota.modelName)
	quota.groupName = c.GetString("token_group")
	quota.backupGroupName = c.GetString("token_backup_group")
	quota.groupRatio = c.GetFloat64("group_ratio")
	quota.inputPrice = quota.price.GetInput()
	quota.outputPrice = quota.price.GetOutput()

	return quota
}

func (q *Quota) PreQuotaConsumption() *types.OpenAIErrorWithStatusCode {
	if q.price.Type == model.TimesPriceType {
		q.preConsumedQuota = q.getFlatPriceQuota(q.inputPrice)
	} else if q.inputPrice != 0 || q.outputPrice != 0 {
		q.preConsumedQuota = q.getTokenPriceQuota(q.promptTokens, q.inputPrice) + config.PreConsumedQuota
	}

	if q.preConsumedQuota == 0 {
		return nil
	}

	userQuota, err := model.CacheGetUserQuota(q.userId)
	if err != nil {
		return common.ErrorWrapper(err, "get_user_quota_failed", http.StatusInternalServerError)
	}

	if userQuota < q.preConsumedQuota {
		return common.ErrorWrapper(errors.New("user quota is not enough"), "insufficient_user_quota", http.StatusPaymentRequired)
	}

	err = model.CacheDecreaseUserQuota(q.userId, q.preConsumedQuota)
	if err != nil {
		return common.ErrorWrapper(err, "decrease_user_quota_failed", http.StatusInternalServerError)
	}

	if userQuota > 100*q.preConsumedQuota {
		q.preConsumedQuota = 0
	}

	if q.preConsumedQuota > 0 {
		err := model.PreConsumeTokenQuota(q.tokenId, q.preConsumedQuota)
		if err != nil {
			return common.ErrorWrapper(err, "pre_consume_token_quota_failed", http.StatusForbidden)
		}
		q.HandelStatus = true
	}

	return nil
}

func (q *Quota) UpdateUserRealtimeQuota(usage *types.UsageEvent, nowUsage *types.UsageEvent) error {
	usage.Merge(nowUsage)

	if !config.RedisEnabled {
		return nil
	}

	increaseQuota := q.GetTotalQuota(
		nowUsage.InputTokens,
		nowUsage.OutputTokens,
		nowUsage.GetExtraTokens(),
		nil,
	)

	cacheQuota, err := model.CacheIncreaseUserRealtimeQuota(q.userId, increaseQuota)
	if err != nil {
		return errors.New("error update user realtime quota cache: " + err.Error())
	}

	q.cacheQuota += increaseQuota
	userQuota, err := model.CacheGetUserQuota(q.userId)
	if err != nil {
		return errors.New("error get user quota cache: " + err.Error())
	}

	if cacheQuota >= int64(userQuota) {
		return errors.New("user quota is not enough")
	}

	return nil
}

func (q *Quota) completedQuotaConsumption(usage *types.Usage, tokenName string, isStream bool, sourceIP string, ctx context.Context) error {
	defer func() {
		if q.cacheQuota > 0 {
			model.CacheDecreaseUserRealtimeQuota(q.userId, q.cacheQuota)
		}
	}()

	quota := q.GetTotalQuotaByUsage(usage)

	if quota > 0 {
		quotaDelta := quota - q.preConsumedQuota
		err := model.PostConsumeTokenQuotaWithInfo(q.tokenId, q.userId, q.unlimitedQuota, quotaDelta)
		if err != nil {
			return errors.New("error consuming token remain quota: " + err.Error())
		}
		err = model.CacheUpdateUserQuota(q.userId)
		if err != nil {
			return errors.New("error consuming token remain quota: " + err.Error())
		}
		model.UpdateChannelUsedQuota(q.channelId, quota)
	}

	model.RecordConsumeLog(
		ctx,
		q.userId,
		q.channelId,
		usage.PromptTokens,
		usage.CompletionTokens,
		q.modelName,
		tokenName,
		quota,
		"",
		q.getRequestTime(),
		isStream,
		q.GetLogMeta(usage, q.requestPath),
		sourceIP,
	)
	model.UpdateUserUsedQuotaAndRequestCount(q.userId, quota)

	return nil
}

func (q *Quota) Undo(c *gin.Context) {
	if q.HandelStatus {
		go func(ctx context.Context) {
			err := model.PostConsumeTokenQuotaWithInfo(q.tokenId, q.userId, q.unlimitedQuota, -q.preConsumedQuota)
			if err != nil {
				logger.LogError(ctx, "error return pre-consumed quota: "+err.Error())
			}
		}(c.Request.Context())
	}
}

func (q *Quota) Consume(c *gin.Context, usage *types.Usage, isStream bool) {
	tokenName := c.GetString("token_name")
	q.startTime = c.GetTime("requestStartTime")
	q.requestPath = c.Request.URL.Path

	go func(ctx context.Context) {
		err := q.completedQuotaConsumption(usage, tokenName, isStream, common.GetClientIP(c), ctx)
		if err != nil {
			logger.LogError(ctx, err.Error())
		}
	}(c.Request.Context())
}

func (q *Quota) GetInputQuota(tokens int) int {
	if q.price.Type == model.TimesPriceType {
		return q.getFlatPriceQuota(q.inputPrice)
	}

	return q.getTokenPriceQuota(tokens, q.inputPrice)
}

func (q *Quota) GetLogMeta(usage *types.Usage, requestPath ...string) map[string]any {
	meta := map[string]any{
		"group_name":        q.groupName,
		"backup_group_name": q.backupGroupName,
		"is_backup_group":   q.isBackupGroup,
		"price_type":        q.price.Type,
		"group_ratio":       q.groupRatio,
		"input_price":       q.price.GetInput(),
		"output_price":      q.price.GetOutput(),
	}

	if len(requestPath) > 0 && requestPath[0] != "" {
		meta["request_path"] = requestPath[0]
	}

	firstResponseTime := q.GetFirstResponseTime()
	if firstResponseTime > 0 {
		meta["first_response"] = firstResponseTime
	}

	if usage != nil {
		extraTokens := usage.GetExtraTokens()
		for key, value := range extraTokens {
			meta[key] = value
			meta[key+"_price"] = q.price.GetExtraPrice(key)
		}
	}

	if q.extraBillingData != nil {
		meta["extra_billing"] = q.extraBillingData
	}

	if q.reasoningMetadata != nil {
		meta["reasoning"] = q.reasoningMetadata
	}

	return meta
}

func (q *Quota) getRequestTime() int {
	return int(time.Since(q.startTime).Milliseconds())
}

func (q *Quota) getTokenPriceQuota(tokens int, unitPrice float64) int {
	if tokens <= 0 || unitPrice <= 0 || q.groupRatio <= 0 {
		return 0
	}

	return int(math.Ceil(float64(tokens) * unitPrice * q.groupRatio * config.QuotaPerUnit / 1000000.0))
}

func (q *Quota) getFlatPriceQuota(unitPrice float64) int {
	if unitPrice <= 0 || q.groupRatio <= 0 {
		return 0
	}

	return int(math.Ceil(unitPrice * q.groupRatio * config.QuotaPerUnit))
}

func (q *Quota) GetTotalQuota(promptTokens, completionTokens int, extraTokens map[string]int, extraBilling map[string]types.ExtraBilling) (quota int) {
	if q.price.Type == model.TimesPriceType {
		quota = q.getFlatPriceQuota(q.inputPrice)
	} else {
		quota += q.getTokenPriceQuota(promptTokens, q.inputPrice)
		quota += q.getTokenPriceQuota(completionTokens, q.outputPrice)
		for key, value := range extraTokens {
			quota += q.getTokenPriceQuota(value, q.price.GetExtraPrice(key))
		}
	}

	q.GetExtraBillingData(extraBilling)
	extraBillingQuota := 0
	if q.extraBillingData != nil {
		for _, value := range q.extraBillingData {
			extraBillingQuota += int(math.Ceil(float64(value.Price)*float64(config.QuotaPerUnit))) * value.CallCount
		}
	}

	if extraBillingQuota > 0 {
		quota += int(math.Ceil(float64(extraBillingQuota) * q.groupRatio))
	}

	totalChargeableTokens := promptTokens + completionTokens
	for _, value := range extraTokens {
		totalChargeableTokens += value
	}

	if (q.inputPrice != 0 || q.outputPrice != 0) && totalChargeableTokens > 0 && quota <= 0 {
		quota = 1
	}
	if q.price.Type != model.TimesPriceType && totalChargeableTokens == 0 && extraBillingQuota == 0 {
		quota = 0
	}

	return quota
}

func (q *Quota) GetTotalQuotaByUsage(usage *types.Usage) (quota int) {
	return q.GetTotalQuota(
		usage.PromptTokens,
		usage.CompletionTokens,
		usage.GetExtraTokens(),
		usage.ExtraBilling,
	)
}

func (q *Quota) GetFirstResponseTime() int64 {
	if q.firstResponseTime.IsZero() {
		return 0
	}

	return q.firstResponseTime.Sub(q.startTime).Milliseconds()
}

func (q *Quota) SetFirstResponseTime(firstResponseTime time.Time) {
	q.firstResponseTime = firstResponseTime
}

type ExtraBillingData struct {
	Type      string  `json:"type"`
	CallCount int     `json:"call_count"`
	Price     float64 `json:"price"`
}

func (q *Quota) GetExtraBillingData(extraBilling map[string]types.ExtraBilling) {
	q.extraBillingData = nil

	if extraBilling == nil {
		return
	}

	extraBillingData := make(map[string]ExtraBillingData)
	for serviceType, value := range extraBilling {
		extraBillingData[serviceType] = ExtraBillingData{
			Type:      value.Type,
			CallCount: value.CallCount,
			Price:     getDefaultExtraServicePrice(serviceType, q.modelName, value.Type),
		}
	}

	if len(extraBillingData) == 0 {
		return
	}

	q.extraBillingData = extraBillingData
}
