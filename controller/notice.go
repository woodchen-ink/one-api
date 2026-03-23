package controller

import (
	"czloapi/common"
	"czloapi/common/utils"
	"czloapi/model"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetPublicNoticeList(c *gin.Context) {
	notices, err := model.GetEnabledNotices()
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    notices,
	})
}

func GetLatestNotices(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	if limit <= 0 {
		limit = 5
	}
	if limit > 20 {
		limit = 20
	}
	notices, err := model.GetLatestNotices(limit)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    notices,
	})
}

func GetNoticesList(c *gin.Context) {
	var params model.GenericParams
	if err := c.ShouldBindQuery(&params); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}
	notices, err := model.GetNoticesList(&params)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    notices,
	})
}

func GetNotice2(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	notice, err := model.GetNoticeById(id)
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
		"data":    notice,
	})
}

func AddNotice(c *gin.Context) {
	notice := model.Notice{}
	err := c.ShouldBindJSON(&notice)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if len(notice.Title) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "标题不能为空",
		})
		return
	}
	notice.CreatedTime = utils.GetTimestamp()
	notice.UpdatedTime = utils.GetTimestamp()
	if notice.PublishTime == 0 {
		notice.PublishTime = utils.GetTimestamp()
	}
	err = notice.Insert()
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

func UpdateNotice(c *gin.Context) {
	statusOnly := c.Query("status_only")
	notice := model.Notice{}
	err := c.ShouldBindJSON(&notice)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	cleanNotice, err := model.GetNoticeById(notice.Id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if statusOnly != "" {
		cleanNotice.Status = notice.Status
	} else {
		cleanNotice.Title = notice.Title
		cleanNotice.Content = notice.Content
		cleanNotice.PublishTime = notice.PublishTime
		cleanNotice.Sort = notice.Sort
		cleanNotice.Status = notice.Status
	}
	cleanNotice.UpdatedTime = utils.GetTimestamp()
	err = cleanNotice.Update()
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
		"data":    cleanNotice,
	})
}

func DeleteNotice(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	err := model.DeleteNoticeById(id)
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
