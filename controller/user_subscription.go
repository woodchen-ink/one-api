package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/utils"
	"czloapi/model"
	"czloapi/payment"
	paymentTypes "czloapi/payment/types"

	"github.com/gin-gonic/gin"
)

// ---- 用户端 API ----

type PurchaseSubscriptionRequest struct {
	PlanId int    `json:"plan_id" binding:"required"`
	UUID   string `json:"uuid" binding:"required"` // 支付网关 UUID
}

type PurchaseSubscriptionResponse struct {
	TradeNo string `json:"trade_no"`
	*paymentTypes.PayRequest
}

// PurchaseSubscription 用户购买套餐
func PurchaseSubscription(c *gin.Context) {
	var req PurchaseSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("invalid request"))
		return
	}

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

	// 关闭未完成的订单
	go model.CloseUnfinishedOrder()

	// 获取支付网关
	paymentService, err := payment.NewPaymentService(req.UUID)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	// 计算支付金额（套餐价格固定，不走充值折扣）
	payMoney := plan.Price
	var fee float64
	if paymentService.Payment.PercentFee > 0 {
		fee = utils.Decimal(payMoney*paymentService.Payment.PercentFee, 2)
	} else if paymentService.Payment.FixedFee > 0 {
		fee = paymentService.Payment.FixedFee
	}
	payMoney = utils.Decimal(payMoney+fee, 2)

	if paymentService.Payment.Currency != model.CurrencyTypeUSD {
		payMoney = utils.Decimal(payMoney*config.PaymentUSDRate, 2)
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
		Amount:             int(plan.Price),
		OrderAmount:        payMoney,
		OrderCurrency:      paymentService.Payment.Currency,
		Fee:                fee,
		Discount:           0,
		Status:             model.OrderStatusPending,
		Quota:              0, // 套餐订单不直接加 quota
		SubscriptionPlanId: plan.ID,
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

// RenewSubscription 用户续订
func RenewSubscription(c *gin.Context) {
	var req PurchaseSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("invalid request"))
		return
	}

	// 获取套餐并检查是否允许续订
	plan, err := model.GetSubscriptionPlanById(req.PlanId)
	if err != nil || plan.Enable == nil || !*plan.Enable {
		common.APIRespondWithError(c, http.StatusOK, errors.New("套餐不存在或已下架"))
		return
	}

	if plan.AllowRenewal == nil || !*plan.AllowRenewal {
		common.APIRespondWithError(c, http.StatusOK, errors.New("该套餐不允许续订"))
		return
	}

	// 续订走购买相同流程
	PurchaseSubscription(c)
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
	UserId int `json:"user_id" binding:"required"`
	PlanId int `json:"plan_id" binding:"required"`
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

	expireTime := model.CalculateExpireTime(plan.DurationType, plan.DurationCount)

	sub := &model.UserSubscription{
		UserId:      req.UserId,
		PlanId:      plan.ID,
		PlanName:    plan.Name,
		GroupSymbol: plan.GroupSymbol,
		QuotaAmount: plan.QuotaAmount,
		UsedAmount:  0,
		TradeNo:     "", // 管理员分配无订单号
		StartTime:   time.Now().Unix(),
		ExpireTime:  expireTime,
		Status:      model.SubscriptionStatusActive,
	}

	if err := sub.Insert(); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

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

	expireTime := model.CalculateExpireTime(plan.DurationType, plan.DurationCount)

	sub := &model.UserSubscription{
		UserId:      order.UserId,
		PlanId:      plan.ID,
		PlanName:    plan.Name,
		GroupSymbol: plan.GroupSymbol,
		QuotaAmount: plan.QuotaAmount,
		UsedAmount:  0,
		TradeNo:     order.TradeNo,
		StartTime:   time.Now().Unix(),
		ExpireTime:  expireTime,
		Status:      model.SubscriptionStatusActive,
	}

	if err := sub.Insert(); err != nil {
		logger.SysError(fmt.Sprintf("create subscription from order failed: %s, trade_no: %s", err.Error(), order.TradeNo))
	}
}
