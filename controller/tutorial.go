package controller

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"czloapi/common"
	"czloapi/common/utils"
	"czloapi/model"
)

type tutorialReorderRequest struct {
	IDs  []int `json:"ids"`
	Page int   `json:"page"`
	Size int   `json:"size"`
}

func GetPublicTutorialList(c *gin.Context) {
	tutorials, err := model.GetEnabledTutorials()
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    tutorials,
	})
}

func GetTutorialsList(c *gin.Context) {
	var params model.GenericParams
	if err := c.ShouldBindQuery(&params); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}
	tutorials, err := model.GetTutorialsList(&params)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    tutorials,
	})
}

func GetTutorial(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	tutorial, err := model.GetTutorialById(id)
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
		"data":    tutorial,
	})
}

func AddTutorial(c *gin.Context) {
	tutorial := model.Tutorial{}
	err := c.ShouldBindJSON(&tutorial)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if len(tutorial.Title) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "标题不能为空",
		})
		return
	}
	tutorial.CreatedTime = utils.GetTimestamp()
	tutorial.UpdatedTime = utils.GetTimestamp()
	err = tutorial.Insert()
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

// ReorderTutorials persists the drag-and-drop order for the current tutorial page.
func ReorderTutorials(c *gin.Context) {
	req := tutorialReorderRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if len(req.IDs) < 2 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": errors.New("至少需要两个教程才能重新排序").Error(),
		})
		return
	}
	if req.Page < 1 || req.Size < 1 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": errors.New("分页参数无效").Error(),
		})
		return
	}
	if err := model.ReorderTutorials(req.IDs, req.Page, req.Size); err != nil {
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

func UpdateTutorial(c *gin.Context) {
	statusOnly := c.Query("status_only")
	tutorial := model.Tutorial{}
	err := c.ShouldBindJSON(&tutorial)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	cleanTutorial, err := model.GetTutorialById(tutorial.Id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if statusOnly != "" {
		cleanTutorial.Status = tutorial.Status
	} else {
		cleanTutorial.Title = tutorial.Title
		cleanTutorial.Content = tutorial.Content
		cleanTutorial.Sort = tutorial.Sort
		cleanTutorial.Status = tutorial.Status
	}
	cleanTutorial.UpdatedTime = utils.GetTimestamp()
	err = cleanTutorial.Update()
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
		"data":    cleanTutorial,
	})
}

func DeleteTutorial(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	err := model.DeleteTutorialById(id)
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
