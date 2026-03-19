package controller

import (
	"net/http"
	"czloapi/model"

	"github.com/gin-gonic/gin"
)

func GetGroups(c *gin.Context) {
	groupNames := make([]string, 0)

	userGroup := model.GlobalUserGroupRatio.GetAllSorted()

	for _, ug := range userGroup {
		groupNames = append(groupNames, ug.Symbol)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    groupNames,
	})
}

func GetUserGroupRatio(c *gin.Context) {
	userId := c.GetInt("id")
	userSymbol := ""

	if userId > 0 {
		userSymbol, _ = model.CacheGetUserGroup(userId)
	}

	groupRatio := model.GlobalUserGroupRatio.GetAll()
	UserGroup := make(map[string]*model.UserGroup)
	for k, v := range groupRatio {
		if v.Public || k == userSymbol {
			UserGroup[k] = v
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    UserGroup,
	})
}
