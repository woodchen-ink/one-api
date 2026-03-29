package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"sync"

	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/utils"
	"czloapi/model"
	"czloapi/payment"
	"czloapi/payment/types"

	"github.com/gin-gonic/gin"
)

type OrderRequest struct {
	UUID   string `json:"uuid" binding:"required"`
	Amount int    `json:"amount" binding:"required"`
}

type OrderResponse struct {
	TradeNo string `json:"trade_no"`
	*types.PayRequest
}

// CreateOrder
func CreateOrder(c *gin.Context) {
	var orderReq OrderRequest
	if err := c.ShouldBindJSON(&orderReq); err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("invalid request"))

		return
	}

	if orderReq.Amount <= 0 || orderReq.Amount < config.PaymentMinAmount {
		common.APIRespondWithError(c, http.StatusOK, fmt.Errorf("金额必须大于等于 %d", config.PaymentMinAmount))

		return
	}

	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("用户不存在"))
		return
	}

	// 关闭用户未完成的订单
	go model.CloseUnfinishedOrder()

	paymentService, err := payment.NewPaymentService(orderReq.UUID)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}
	// 获取手续费和支付金额
	discount, fee, payMoney, err := calculateOrderAmount(paymentService.Payment, orderReq.Amount)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("支付金额计算失败，请检查网关币种和汇率配置"))
		return
	}
	// 开始支付
	tradeNo := utils.GenerateTradeNo()
	payRequest, err := paymentService.Pay(tradeNo, payMoney, user)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("创建支付失败，请稍后再试"))
		return
	}

	// 创建订单
	order := &model.Order{
		UserId:         userId,
		GatewayId:      paymentService.Payment.ID,
		TradeNo:        tradeNo,
		Amount:         float64(orderReq.Amount),
		AmountCurrency: model.CurrencyTypeUSD,
		OrderAmount:    payMoney,
		OrderCurrency:  model.NormalizeCurrencyType(paymentService.Payment.Currency),
		Fee:            fee,
		Discount:       discount,
		Status:         model.OrderStatusPending,
		Quota:          orderReq.Amount * int(config.QuotaPerUnit),
	}

	err = order.Insert()
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("创建订单失败，请稍后再试"))
		return
	}

	orderResp := &OrderResponse{
		TradeNo:    tradeNo,
		PayRequest: payRequest,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    orderResp,
	})
}

// tradeNo lock
var orderLocks sync.Map
var createLock sync.Mutex

// LockOrder 尝试对给定订单号加锁
func LockOrder(tradeNo string) {
	lock, ok := orderLocks.Load(tradeNo)
	if !ok {
		createLock.Lock()
		defer createLock.Unlock()
		lock, ok = orderLocks.Load(tradeNo)
		if !ok {
			lock = new(sync.Mutex)
			orderLocks.Store(tradeNo, lock)
		}
	}
	lock.(*sync.Mutex).Lock()
}

// UnlockOrder 释放给定订单号的锁
func UnlockOrder(tradeNo string) {
	lock, ok := orderLocks.Load(tradeNo)
	if ok {
		lock.(*sync.Mutex).Unlock()
	}
}

func PaymentCallback(c *gin.Context) {
	uuid := c.Param("uuid")
	paymentService, err := payment.NewPaymentService(uuid)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, errors.New("payment not found"))
		return
	}

	payNotify, err := paymentService.HandleCallback(c, paymentService.Payment.Config)
	if err != nil {
		return
	}

	LockOrder(payNotify.GatewayNo)
	defer UnlockOrder(payNotify.GatewayNo)

	order, err := model.GetOrderByTradeNo(payNotify.TradeNo)
	if err != nil {
		logger.SysError(fmt.Sprintf("gateway callback failed to find order, trade_no: %s,", payNotify.TradeNo))
		return
	}

	if order.Status != model.OrderStatusPending {
		return
	}

	order.GatewayNo = payNotify.GatewayNo
	order.Status = model.OrderStatusSuccess
	err = order.Update()
	if err != nil {
		logger.SysError(fmt.Sprintf("gateway callback failed to update order, trade_no: %s,", payNotify.TradeNo))
		return
	}

	// 套餐购买订单：创建订阅
	if order.SubscriptionPlanId > 0 {
		CreateSubscriptionFromOrder(order)
		model.RecordQuotaLog(order.UserId, model.LogTypeTopup, 0, common.GetClientIP(c),
			fmt.Sprintf("购买套餐成功，套餐ID: %d，支付金额：%.2f %s", order.SubscriptionPlanId, order.OrderAmount, order.OrderCurrency))
		return
	}

	// 普通充值订单：增加余额
	err = model.IncreaseUserQuota(order.UserId, order.Quota)
	if err != nil {
		logger.SysError(fmt.Sprintf("gateway callback failed to increase user quota, trade_no: %s,", payNotify.TradeNo))
		return
	}
	usdQuota := float64(order.Quota) / config.QuotaPerUnit

	// Try to upgrade user group based on cumulative recharge amount
	err = model.CheckAndUpgradeUserGroup(order.UserId, order.Quota)
	if err != nil {
		logger.SysError(fmt.Sprintf("failed to check and upgrade user group, trade_no: %s, error: %s", payNotify.TradeNo, err.Error()))
	}

	model.RecordQuotaLog(order.UserId, model.LogTypeTopup, order.Quota, common.GetClientIP(c), fmt.Sprintf("在线充值成功，充值金额: %.2f USD，支付金额：%.2f %s", usdQuota, order.OrderAmount, order.OrderCurrency))

}

func CheckOrderStatus(c *gin.Context) {
	tradeNo := c.Query("trade_no")
	userId := c.GetInt("id")
	success := false

	if tradeNo != "" {
		order, err := model.GetUserOrder(userId, tradeNo)
		if err == nil {
			if order.Status == model.OrderStatusSuccess {
				success = true
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": success,
		"message": "",
	})
}

func GetUserOrderList(c *gin.Context) {
	var params model.SearchOrderParams
	if err := c.ShouldBindQuery(&params); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	params.UserId = c.GetInt("id")

	orders, err := model.GetOrderList(&params)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    orders,
	})
}

// calculateOrderAmount computes the top-up discount and payable amount, while keeping fee stored in USD.
func calculateOrderAmount(payment *model.Payment, amount int) (discountMoney, fee, payMoney float64, err error) {
	// 步骤1: 获取折扣数据
	discountData := common.RechargeDiscount

	// 步骤2: 初始化折扣变量
	discount := 1.0 // 默认无折扣
	maxThreshold := 0

	// 步骤3: 遍历折扣数据，找到适用的最大阈值
	for thresholdStr, discountRate := range discountData {
		threshold, err := strconv.Atoi(thresholdStr)
		if err != nil {
			logger.SysError(fmt.Sprintf("invalid recharge discount threshold: %s", thresholdStr))
			continue
		}

		if amount >= threshold && threshold > maxThreshold {
			discount = discountRate
			maxThreshold = threshold
		}
	}

	// 步骤4: 计算折后价值
	newMoney := utils.Decimal(float64(amount)*discount, 2)
	oldTotal := float64(amount)
	feeUSD := 0.0

	// 步骤5: 计算手续费
	if payment.PercentFee > 0 {
		feeUSD = utils.Decimal(newMoney*payment.PercentFee, 2) // 折后手续
		oldTotal = utils.Decimal(oldTotal*(1+payment.PercentFee), 2)
	} else if payment.FixedFee > 0 {
		feeUSD = utils.Decimal(payment.FixedFee, 2)
		oldTotal = utils.Decimal(oldTotal+payment.FixedFee, 2)
	}

	// 步骤6: 计算实际费用
	total := utils.Decimal(newMoney+feeUSD, 2)
	orderCurrency := model.NormalizeCurrencyType(payment.Currency)

	payMoney, err = model.ConvertCurrencyAmount(total, model.CurrencyTypeUSD, orderCurrency)
	if err != nil {
		return
	}
	oldTotal, err = model.ConvertCurrencyAmount(oldTotal, model.CurrencyTypeUSD, orderCurrency)
	if err != nil {
		return
	}

	// 步骤7: 计算折扣金额
	fee = feeUSD
	discountMoney = utils.Decimal(oldTotal-payMoney, 2)

	return
}

func GetOrderList(c *gin.Context) {
	var params model.SearchOrderParams
	if err := c.ShouldBindQuery(&params); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	payments, err := model.GetOrderList(&params)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    payments,
	})
}
