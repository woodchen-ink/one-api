package controller

import (
	"czloapi/common"
	"czloapi/model"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetSubscriptionPlanList(c *gin.Context) {
	var params model.SearchSubscriptionPlanParams
	if err := c.ShouldBindQuery(&params); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	plans, err := model.GetSubscriptionPlanList(&params)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    plans,
	})
}

func GetSubscriptionPlan(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	plan, err := model.GetSubscriptionPlanById(id)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    plan,
	})
}

func CreateSubscriptionPlan(c *gin.Context) {
	plan := model.SubscriptionPlan{}
	if err := c.ShouldBindJSON(&plan); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	if err := plan.Insert(); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func UpdateSubscriptionPlan(c *gin.Context) {
	plan := model.SubscriptionPlan{}
	if err := c.ShouldBindJSON(&plan); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	if err := plan.Update(); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func DeleteSubscriptionPlan(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	plan := model.SubscriptionPlan{ID: id}
	if err := plan.Delete(); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func EnableSubscriptionPlan(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	plan, err := model.GetSubscriptionPlanById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	err = model.ChangeSubscriptionPlanEnable(id, !*plan.Enable)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// GetAvailableSubscriptionPlans 用户获取可购买套餐列表
func GetAvailableSubscriptionPlans(c *gin.Context) {
	plans, err := model.GetAvailableSubscriptionPlans()
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    plans,
	})
}
