package controller

import (
	"czloapi/common"
	"czloapi/model"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetIPProxyList 返回后台配置的全部代理池记录。
func GetIPProxyList(c *gin.Context) {
	proxies, err := model.GetIPProxyList()
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    proxies,
	})
}

// GetIPProxy 获取单个代理池详情。
func GetIPProxy(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	proxy, err := model.GetIPProxyById(id)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    proxy,
	})
}

// AddIPProxy 新增一个代理池配置。
func AddIPProxy(c *gin.Context) {
	proxy := model.IPProxy{}
	if err := c.ShouldBindJSON(&proxy); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	if err := proxy.Insert(); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    proxy,
	})
}

// UpdateIPProxy 修改已有代理池配置。
func UpdateIPProxy(c *gin.Context) {
	proxy := model.IPProxy{}
	if err := c.ShouldBindJSON(&proxy); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	if proxy.Id == 0 {
		common.AbortWithMessage(c, http.StatusOK, "id不能为空")
		return
	}

	if err := proxy.Update(); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    proxy,
	})
}

// DeleteIPProxy 删除代理池配置。
func DeleteIPProxy(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	proxy, err := model.GetIPProxyById(id)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	if err := proxy.Delete(); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// TestIPProxyLatency 通过代理访问探活地址并记录最近延迟。
func TestIPProxyLatency(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	proxy, err := model.GetIPProxyById(id)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	latency, err := proxy.TestLatency()
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "测试成功",
		"data": gin.H{
			"latency":   latency,
			"test_time": proxy.TestTime,
		},
	})
}
