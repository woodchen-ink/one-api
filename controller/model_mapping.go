package controller

import (
	"net/http"
	"one-api/model"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetAllModelMappings(c *gin.Context) {
	mappings, err := model.GetAllModelMappings()
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
		"data":    mappings,
	})
}

func GetModelMapping(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	mapping, err := model.GetModelMappingById(id)
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
		"data":    mapping,
	})
}

func CreateModelMapping(c *gin.Context) {
	mapping := model.ModelMapping{}
	err := c.ShouldBindJSON(&mapping)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if mapping.Alias == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "别名不能为空",
		})
		return
	}

	existing, _ := model.GetModelMappingByAlias(mapping.Alias)
	if existing != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "该别名已存在",
		})
		return
	}

	err = model.CreateModelMapping(&mapping)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	model.GlobalModelMappingCache.Load()
	model.ChannelGroup.Load()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func UpdateModelMapping(c *gin.Context) {
	mapping := model.ModelMapping{}
	err := c.ShouldBindJSON(&mapping)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if mapping.Alias == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "别名不能为空",
		})
		return
	}

	existing, _ := model.GetModelMappingByAlias(mapping.Alias)
	if existing != nil && existing.Id != mapping.Id {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "该别名已存在",
		})
		return
	}

	err = model.UpdateModelMapping(&mapping)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	model.GlobalModelMappingCache.Load()
	model.ChannelGroup.Load()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func DeleteModelMapping(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	err = model.DeleteModelMapping(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	model.GlobalModelMappingCache.Load()
	model.ChannelGroup.Load()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
