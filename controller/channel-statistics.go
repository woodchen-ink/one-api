package controller

import (
	"czloapi/model"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetChannelStatistics(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	statistics, err := model.GetChannelUsageStatistics(id, days)
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
		"data":    statistics,
	})
}
