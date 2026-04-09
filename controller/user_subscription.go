package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"czloapi/common"
	"czloapi/common/logger"
	"czloapi/common/utils"
	"czloapi/model"
	"czloapi/payment"
	paymentTypes "czloapi/payment/types"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ---- 用户端 API ----

type PurchaseSubscriptionRequest struct {
	PlanId       int    `json:"plan_id" binding:"required"`
	UUID         string `json:"uuid" binding:"required"` // 支付网关 UUID
	BillingCycle string `json:"billing_cycle"`            // monthly, quarterly, yearly; 默认 monthly
}

type PurchaseSubscriptionResponse struct {
	TradeNo string `json:"trade_no"`
	*paymentTypes.PayRequest
}

// calculateSubscriptionOrderAmount computes the payable amount in the gateway currency while keeping fee stored in USD.
// basePrice is the plan price for the selected billing cycle (may differ from plan.Price for quarterly/yearly).
func calculateSubscriptionOrderAmount(basePrice float64, priceCurrency model.CurrencyType, payment *model.Payment) (fee, payMoney float64, err error) {
	orderCurrency := model.NormalizeCurrencyType(payment.Currency)
	normalizedPriceCurrency := model.NormalizeCurrencyType(priceCurrency)

	baseAmount, err := model.ConvertCurrencyAmount(basePrice, normalizedPriceCurrency, orderCurrency)
	if err != nil {
		return 0, 0, err
	}

	feeInOrderCurrency := 0.0
	if payment.PercentFee > 0 {
		baseAmountUSD, convertErr := model.ConvertCurrencyAmount(basePrice, normalizedPriceCurrency, model.CurrencyTypeUSD)
		if convertErr != nil {
			return 0, 0, convertErr
		}
		fee = utils.Decimal(baseAmountUSD*payment.PercentFee, 2)
	} else if payment.FixedFee > 0 {
		fee = utils.Decimal(payment.FixedFee, 2)
	}

	if fee > 0 {
		feeInOrderCurrency, err = model.ConvertCurrencyAmount(fee, model.CurrencyTypeUSD, orderCurrency)
		if err != nil {
			return 0, 0, err
		}
	}

	payMoney = utils.Decimal(baseAmount+feeInOrderCurrency, 2)
	return fee, payMoney, nil
}

func normalizeBillingCycle(cycle string) string {
	switch cycle {
	case "quarterly", "yearly":
		return cycle
	default:
		return "monthly"
	}
}

func purchaseSubscription(c *gin.Context, req PurchaseSubscriptionRequest) {
	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("用户不存在"))
		return
	}

	// 获取套餐
	plan, err := model.GetSubscriptionPlanById(req.PlanId)
	if err != nil || plan.Enable == nil || !*plan.Enable {
		common.APIRespondWithError(c, http.StatusOK, errors.New("套餐不存在或已下架"))
		return
	}

	// 校验并获取计费周期对应的价格
	billingCycle := normalizeBillingCycle(req.BillingCycle)
	cyclePrice, _, err := plan.PriceForCycle(billingCycle)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	// 关闭未完成的订单
	go model.CloseUnfinishedOrder()

	// 获取支付网关
	paymentService, err := payment.NewPaymentService(req.UUID)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	// 计算支付金额（套餐价格固定，不走充值折扣）
	fee, payMoney, err := calculateSubscriptionOrderAmount(cyclePrice, plan.PriceCurrency, paymentService.Payment)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("套餐支付金额计算失败，请检查币种与汇率配置"))
		return
	}

	// 发起支付
	tradeNo := utils.GenerateTradeNo()
	payRequest, err := paymentService.Pay(tradeNo, payMoney, user)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("创建支付失败，请稍后再试"))
		return
	}

	// 创建订单
	order := &model.Order{
		UserId:             userId,
		GatewayId:          paymentService.Payment.ID,
		TradeNo:            tradeNo,
		Amount:             cyclePrice,
		AmountCurrency:     model.NormalizeCurrencyType(plan.PriceCurrency),
		OrderAmount:        payMoney,
		OrderCurrency:      model.NormalizeCurrencyType(paymentService.Payment.Currency),
		Fee:                fee,
		Discount:           0,
		Status:             model.OrderStatusPending,
		Quota:              0, // 套餐订单不直接加 quota
		SubscriptionPlanId: plan.ID,
		BillingCycle:       billingCycle,
	}

	err = order.Insert()
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("创建订单失败，请稍后再试"))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": &PurchaseSubscriptionResponse{
			TradeNo:    tradeNo,
			PayRequest: payRequest,
		},
	})
}

// PurchaseSubscription 用户购买套餐
func PurchaseSubscription(c *gin.Context) {
	var req PurchaseSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("invalid request"))
		return
	}

	purchaseSubscription(c, req)
}

// RenewSubscription 用户续订
func RenewSubscription(c *gin.Context) {
	type RenewSubscriptionRequest struct {
		PlanId         int    `json:"plan_id"`
		SubscriptionId int    `json:"subscription_id"`
		UUID           string `json:"uuid" binding:"required"`
		BillingCycle   string `json:"billing_cycle"`
	}

	var req RenewSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("invalid request"))
		return
	}

	userId := c.GetInt("id")
	planId := req.PlanId
	billingCycle := req.BillingCycle

	if req.SubscriptionId != 0 {
		sub, err := model.GetUserSubscriptionById(req.SubscriptionId)
		if err != nil {
			common.APIRespondWithError(c, http.StatusOK, errors.New("订阅不存在"))
			return
		}
		if sub.UserId != userId {
			common.APIRespondWithError(c, http.StatusOK, errors.New("无权操作该订阅"))
			return
		}
		if planId == 0 {
			planId = sub.PlanId
		}
		if planId == 0 {
			plan, err := model.GetSubscriptionPlanByNameAndGroup(sub.PlanName, sub.GroupSymbol)
			if err == nil && plan != nil {
				planId = plan.ID
			}
		}
		// 如果没有指定 billing_cycle，使用原订阅的周期
		if billingCycle == "" {
			billingCycle = sub.BillingCycle
		}
	}

	if planId == 0 {
		common.APIRespondWithError(c, http.StatusOK, errors.New("invalid request"))
		return
	}

	// 获取套餐并检查是否允许续订
	plan, err := model.GetSubscriptionPlanById(planId)
	if err != nil || plan.Enable == nil || !*plan.Enable {
		common.APIRespondWithError(c, http.StatusOK, errors.New("套餐不存在或已下架"))
		return
	}

	if plan.AllowRenewal == nil || !*plan.AllowRenewal {
		common.APIRespondWithError(c, http.StatusOK, errors.New("该套餐不允许续订"))
		return
	}

	// 续订走购买相同流程
	purchaseSubscription(c, PurchaseSubscriptionRequest{
		PlanId:       planId,
		UUID:         req.UUID,
		BillingCycle: billingCycle,
	})
}

// GetMySubscriptions 获取我的订阅列表
func GetMySubscriptions(c *gin.Context) {
	userId := c.GetInt("id")
	subs, err := model.GetMySubscriptions(userId)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    subs,
	})
}

// GetMySubscriptionGroups 获取用户已订阅的分组列表（供 token 创建使用）
func GetMySubscriptionGroups(c *gin.Context) {
	userId := c.GetInt("id")
	groups, err := model.GetActiveSubscriptionGroups(userId)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    groups,
	})
}

// ---- 管理员端 API ----

// AdminGetSubscriptionList 管理员查看所有订阅
func AdminGetSubscriptionList(c *gin.Context) {
	var params model.SearchUserSubscriptionParams
	if err := c.ShouldBindQuery(&params); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	subs, err := model.GetUserSubscriptionList(&params)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    subs,
	})
}

// AdminAssignSubscription 管理员分配订阅
type AssignSubscriptionRequest struct {
	UserId       int    `json:"user_id" binding:"required"`
	PlanId       int    `json:"plan_id" binding:"required"`
	BillingCycle string `json:"billing_cycle"` // 可选，默认 monthly
}

func AdminAssignSubscription(c *gin.Context) {
	var req AssignSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("invalid request"))
		return
	}

	plan, err := model.GetSubscriptionPlanById(req.PlanId)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("套餐不存在"))
		return
	}

	_, err = model.GetUserById(req.UserId, false)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("用户不存在"))
		return
	}

	billingCycle := normalizeBillingCycle(req.BillingCycle)
	cyclePrice, months, err := plan.PriceForCycle(billingCycle)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	nowTime := time.Now()
	now := nowTime.Unix()
	expireTime := nowTime.AddDate(0, months, 0).Unix()
	tradeNo := utils.GenerateTradeNo()
	planCurrency := model.NormalizeCurrencyType(plan.PriceCurrency)

	var nextResetTime int64
	if months > 1 {
		nextResetTime = nowTime.AddDate(0, 1, 0).Unix()
	}

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		order := &model.Order{
			UserId:             req.UserId,
			GatewayId:          0,
			TradeNo:            tradeNo,
			GatewayNo:          "",
			Amount:             cyclePrice,
			AmountCurrency:     planCurrency,
			OrderAmount:        0,
			OrderCurrency:      planCurrency,
			Quota:              0,
			Fee:                0,
			Discount:           0,
			SubscriptionPlanId: plan.ID,
			BillingCycle:       billingCycle,
			Status:             model.OrderStatusSuccess,
			CreatedAt:          int(now),
		}
		if err := tx.Create(order).Error; err != nil {
			return err
		}

		sub := &model.UserSubscription{
			UserId:        req.UserId,
			PlanId:        plan.ID,
			PlanName:      plan.Name,
			GroupSymbol:   plan.GroupSymbol,
			QuotaAmount:   plan.QuotaAmount,
			UsedAmount:    0,
			TradeNo:       tradeNo,
			BillingCycle:  billingCycle,
			StartTime:     now,
			ExpireTime:    expireTime,
			NextResetTime: nextResetTime,
			Status:        model.SubscriptionStatusActive,
			CreatedAt:     int(now),
		}
		if err := tx.Create(sub).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}
	model.ClearUserSubscriptionCache(req.UserId)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminAdjustSubscription 管理员调整订阅到期时间
type AdjustSubscriptionRequest struct {
	ExpireTime int64 `json:"expire_time"` // Unix 时间戳
	AdjustDays int   `json:"adjust_days"` // 调整天数（正数延长，负数缩短）
}

func AdminAdjustSubscription(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var req AdjustSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("invalid request"))
		return
	}

	sub, err := model.GetUserSubscriptionById(id)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("订阅不存在"))
		return
	}

	var newExpireTime int64
	if req.ExpireTime > 0 {
		newExpireTime = req.ExpireTime
	} else if req.AdjustDays != 0 {
		newExpireTime = sub.ExpireTime + int64(req.AdjustDays)*86400
	} else {
		common.APIRespondWithError(c, http.StatusOK, errors.New("请提供到期时间或调整天数"))
		return
	}

	if err := model.AdminAdjustExpireTime(id, newExpireTime); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminResetSubscription 管理员重置配额
func AdminResetSubscription(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	if err := model.AdminResetQuota(id); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminRevokeSubscription 管理员撤销订阅
func AdminRevokeSubscription(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	if err := model.AdminRevokeSubscription(id); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// CreateSubscriptionFromOrder 支付成功后创建订阅（从 PaymentCallback 调用）
func CreateSubscriptionFromOrder(order *model.Order) {
	plan, err := model.GetSubscriptionPlanById(order.SubscriptionPlanId)
	if err != nil {
		logger.SysError(fmt.Sprintf("create subscription from order failed: plan not found, plan_id: %d, trade_no: %s", order.SubscriptionPlanId, order.TradeNo))
		return
	}

	billingCycle := normalizeBillingCycle(order.BillingCycle)
	now := time.Now()

	// 根据计费周期计算到期时间
	var expireTime int64
	_, months, err := plan.PriceForCycle(billingCycle)
	if err != nil {
		// 回退到套餐默认周期
		expireTime = model.CalculateExpireTime(plan.DurationType, plan.DurationCount)
		billingCycle = "monthly"
	} else {
		expireTime = now.AddDate(0, months, 0).Unix()
	}

	// 多月订阅设置月度配额重置时间
	var nextResetTime int64
	if months > 1 {
		nextResetTime = now.AddDate(0, 1, 0).Unix()
	}

	sub := &model.UserSubscription{
		UserId:        order.UserId,
		PlanId:        plan.ID,
		PlanName:      plan.Name,
		GroupSymbol:   plan.GroupSymbol,
		QuotaAmount:   plan.QuotaAmount,
		UsedAmount:    0,
		TradeNo:       order.TradeNo,
		BillingCycle:  billingCycle,
		StartTime:     now.Unix(),
		ExpireTime:    expireTime,
		NextResetTime: nextResetTime,
		Status:        model.SubscriptionStatusActive,
	}

	if err := sub.Insert(); err != nil {
		logger.SysError(fmt.Sprintf("create subscription from order failed: %s, trade_no: %s", err.Error(), order.TradeNo))
	}
}
