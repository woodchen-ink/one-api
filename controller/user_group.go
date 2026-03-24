package controller

import (
	"czloapi/common"
	"czloapi/model"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetUserGroups(c *gin.Context) {
	var params model.SearchUserGroupParams
	if err := c.ShouldBindQuery(&params); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	userGroups, err := model.GetUserGroupsList(&params)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    userGroups,
	})
}

func GetUserGroupById(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	userGroup, err := model.GetUserGroupsById(id)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    userGroup,
	})
}

func AddUserGroup(c *gin.Context) {
	userGroup := model.UserGroup{}
	if err := c.ShouldBindJSON(&userGroup); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	if err := userGroup.Create(); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func UpdateUserGroup(c *gin.Context) {
	userGroup := model.UserGroup{}
	if err := c.ShouldBindJSON(&userGroup); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	if err := userGroup.Update(); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func DeleteUserGroup(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	userGroup, err := model.GetUserGroupsById(id)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	if userGroup.IsDefault {
		common.APIRespondWithError(c, http.StatusOK, errors.New("default user group cannot be deleted"))
		return
	}

	if err := userGroup.Delete(); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func ChangeUserGroupEnable(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	userGroup, err := model.GetUserGroupsById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if *userGroup.Enable && userGroup.IsDefault {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "default user group cannot be disabled",
		})
		return
	}

	err = model.ChangeUserGroupEnable(id, !*userGroup.Enable)
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
