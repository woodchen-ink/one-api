package controller

import (
	"czloapi/common"
	"czloapi/common/config"
	"czloapi/model"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetSubscription(c *gin.Context) {
	var remainQuota int
	var usedQuota int
	var err error
	var key *model.Key
	var expiredTime int64

	keyID := c.GetInt("key_id")
	key, err = model.GetKeyById(keyID)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, fmt.Errorf("获取信息失败: %v", err))
		return
	}

	if key.UnlimitedQuota {
		userId := c.GetInt("id")
		userData, err := model.GetUserFields(userId, []string{"quota", "used_quota"})
		if err != nil {
			common.APIRespondWithError(c, http.StatusOK, fmt.Errorf("获取用户信息失败: %v", err))

			return
		}

		remainQuota = userData["quota"].(int)
		usedQuota = userData["used_quota"].(int)
	} else {
		expiredTime = key.ExpiredTime
		remainQuota = key.RemainQuota
		usedQuota = key.UsedQuota
	}

	if expiredTime <= 0 {
		expiredTime = 0
	}

	quota := remainQuota + usedQuota
	amount := float64(quota) / config.QuotaPerUnit

	subscription := OpenAISubscriptionResponse{
		Object:             "billing_subscription",
		HasPaymentMethod:   true,
		SoftLimitUSD:       amount,
		HardLimitUSD:       amount,
		SystemHardLimitUSD: amount,
		AccessUntil:        expiredTime,
	}
	c.JSON(200, subscription)
}

func GetUsage(c *gin.Context) {
	var quota int
	var err error
	var key *model.Key

	keyID := c.GetInt("key_id")
	key, err = model.GetKeyById(keyID)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, fmt.Errorf("获取信息失败: %v", err))
		return
	}

	if key.UnlimitedQuota {
		userId := c.GetInt("id")
		userData, err := model.GetUserFields(userId, []string{"used_quota"})
		if err != nil {
			common.APIRespondWithError(c, http.StatusOK, fmt.Errorf("获取用户信息失败: %v", err))

			return
		}

		quota = userData["used_quota"].(int)
	} else {
		quota = key.UsedQuota
	}

	amount := float64(quota) / config.QuotaPerUnit
	usage := OpenAIUsageResponse{
		Object:     "list",
		TotalUsage: amount * 100,
	}
	c.JSON(200, usage)
}
