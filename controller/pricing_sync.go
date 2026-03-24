package controller

import (
	"net/http"

	"czloapi/common"
	"czloapi/model"

	"github.com/gin-gonic/gin"
)

func GetPriceSyncProviders(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    model.GetPriceSyncProviders(),
	})
}

func PreviewPriceSync(c *gin.Context) {
	request := &model.PriceSyncRequest{}
	if err := c.ShouldBindJSON(request); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	preview, err := model.PreviewPriceSync(c.Request.Context(), request.Provider)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    preview,
	})
}

func ApplyPriceSync(c *gin.Context) {
	request := &model.PriceSyncApplyRequest{}
	if err := c.ShouldBindJSON(request); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	if err := model.ApplyPriceSync(c.Request.Context(), request); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
