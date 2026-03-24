package controller

import (
	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/utils"
	"czloapi/model"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetUserKeysList(c *gin.Context) {
	userId := c.GetInt("id")
	var params model.GenericParams
	if err := c.ShouldBindQuery(&params); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	keys, err := model.GetUserKeysList(userId, &params)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    keys,
	})
}

// GetKeysListByAdmin 管理员查询 Key 列表（可按用户ID或Key ID查询）
func GetKeysListByAdmin(c *gin.Context) {
	var params model.AdminSearchKeysParams
	if err := c.ShouldBindQuery(&params); err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	keys, err := model.GetKeysListByAdmin(&params)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    keys,
	})
}

func GetKey(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	userId := c.GetInt("id")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	key, err := model.GetKeyByIds(id, userId)
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
		"data":    key,
	})
}

func GetPlaygroundKey(c *gin.Context) {
	keyName := "sys_playground"
	userId := c.GetInt("id")
	key, err := model.GetKeyByName(keyName, userId)
	if err != nil {
		cleanKey := model.Key{
			UserId: userId,
			Name:   keyName,
			// Key:            utils.GenerateKey(),
			CreatedTime:    utils.GetTimestamp(),
			AccessedTime:   utils.GetTimestamp(),
			ExpiredTime:    0,
			RemainQuota:    0,
			UnlimitedQuota: true,
		}
		err = cleanKey.Insert()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "创建Key失败，请去系统手动配置一个名称为：sys_playground 的Key",
			})
			return
		}
		key = &cleanKey
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    key.Key,
	})
}

func AddKey(c *gin.Context) {
	userId := c.GetInt("id")
	key := model.Key{}
	err := c.ShouldBindJSON(&key)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if len(key.Name) > 30 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Key名称过长",
		})
		return
	}

	setting := key.Setting.Data()
	err = validateTokenSetting(&setting)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	backupGroup, err := normalizeAndValidateTokenGroups(key.Group, key.BackupGroup, &setting, userId, validateTokenGroup)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	cleanKey := model.Key{
		UserId: userId,
		Name:   key.Name,
		// Key:            utils.GenerateKey(),
		CreatedTime:    utils.GetTimestamp(),
		AccessedTime:   utils.GetTimestamp(),
		ExpiredTime:    key.ExpiredTime,
		RemainQuota:    key.RemainQuota,
		UnlimitedQuota: key.UnlimitedQuota,
		Group:          key.Group,
		BackupGroup:    backupGroup,
	}
	cleanKey.Setting.Set(setting)
	err = cleanKey.Insert()
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

func DeleteKey(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userId := c.GetInt("id")
	err := model.DeleteKeyById(id, userId)
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

func UpdateKey(c *gin.Context) {
	userId := c.GetInt("id")
	statusOnly := c.Query("status_only")
	key := model.Key{}
	err := c.ShouldBindJSON(&key)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if len(key.Name) > 30 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Key名称过长",
		})
		return
	}

	newSetting := key.Setting.Data()
	err = validateTokenSetting(&newSetting)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	cleanKey, err := model.GetKeyByIds(key.Id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if key.Status == config.TokenStatusEnabled {
		if cleanKey.Status == config.TokenStatusExpired && cleanKey.ExpiredTime <= utils.GetTimestamp() && cleanKey.ExpiredTime != -1 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "Key已过期，无法启用，请先修改Key过期时间，或者设置为永不过期",
			})
			return
		}
		if cleanKey.Status == config.TokenStatusExhausted && cleanKey.RemainQuota <= 0 && !cleanKey.UnlimitedQuota {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "Key可用额度已用尽，无法启用，请先修改Key剩余额度，或者设置为无限额度",
			})
			return
		}
	}

	if statusOnly != "" {
		cleanKey.Status = key.Status
	} else {
		backupGroup, err := normalizeAndValidateTokenGroups(key.Group, key.BackupGroup, &newSetting, userId, validateTokenGroup)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		// If you add more fields, please also update token.Update()
		cleanKey.Name = key.Name
		cleanKey.ExpiredTime = key.ExpiredTime
		cleanKey.RemainQuota = key.RemainQuota
		cleanKey.UnlimitedQuota = key.UnlimitedQuota
		cleanKey.Group = key.Group
		cleanKey.BackupGroup = backupGroup
		cleanKey.Setting.Set(newSetting)
	}
	err = cleanKey.Update()
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
		"data":    cleanKey,
	})
}

// UpdateKeyByAdmin 管理员更新任意 Key（支持转移用户）
func UpdateKeyByAdmin(c *gin.Context) {
	statusOnly := c.Query("status_only")
	key := model.Key{}
	err := c.ShouldBindJSON(&key)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if len(key.Name) > 30 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Key名称过长",
		})
		return
	}

	newSetting := key.Setting.Data()
	err = validateTokenSetting(&newSetting)
	if err != nil {
		common.APIRespondWithError(c, http.StatusOK, err)
		return
	}

	cleanKey, err := model.GetKeyById(key.Id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if key.Status == config.TokenStatusEnabled {
		if cleanKey.Status == config.TokenStatusExpired && cleanKey.ExpiredTime <= utils.GetTimestamp() && cleanKey.ExpiredTime != -1 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "Key已过期，无法启用，请先修改Key过期时间，或者设置为永不过期",
			})
			return
		}
		if cleanKey.Status == config.TokenStatusExhausted && cleanKey.RemainQuota <= 0 && !cleanKey.UnlimitedQuota {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "Key可用额度已用尽，无法启用，请先修改Key剩余额度，或者设置为无限额度",
			})
			return
		}
	}

	// 验证目标用户是否存在（如果要转移 Key）
	if key.UserId > 0 && key.UserId != cleanKey.UserId {
		targetUser, err := model.GetUserById(key.UserId, false)
		if err != nil || targetUser == nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "目标用户不存在",
			})
			return
		}
	}

	// 验证用户组（使用目标用户ID）
	targetUserId := cleanKey.UserId
	if key.UserId > 0 {
		targetUserId = key.UserId
	}

	if statusOnly != "" {
		cleanKey.Status = key.Status
	} else {
		backupGroup, err := normalizeAndValidateTokenGroups(key.Group, key.BackupGroup, &newSetting, targetUserId, validateTokenGroupForUser)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		cleanKey.Name = key.Name
		cleanKey.ExpiredTime = key.ExpiredTime
		cleanKey.RemainQuota = key.RemainQuota
		cleanKey.UnlimitedQuota = key.UnlimitedQuota
		cleanKey.Group = key.Group
		cleanKey.BackupGroup = backupGroup
		cleanKey.Setting.Set(newSetting)

		// 管理员可以转移 Key 给其他用户
		if key.UserId > 0 {
			cleanKey.UserId = key.UserId
		}
	}

	err = cleanKey.UpdateByAdmin()
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
		"data":    cleanKey,
	})
}

// validateTokenGroupForUser 验证用户组是否对指定用户有效
func validateTokenGroupForUser(tokenGroup string, userId int) error {
	userGroup, _ := model.CacheGetUserGroup(userId)
	if userGroup == "" {
		return errors.New("获取用户组信息失败")
	}

	groupRatio := model.GlobalUserGroupRatio.GetBySymbol(tokenGroup)
	if groupRatio == nil {
		return errors.New("无效的用户组")
	}

	if !groupRatio.Public && userGroup != tokenGroup {
		// 检查是否有该分组的活跃订阅
		if model.HasActiveSubscription(userId, tokenGroup) {
			return nil
		}
		return errors.New("目标用户无权使用指定的分组")
	}

	return nil
}

func validateTokenGroup(tokenGroup string, userId int) error {
	userGroup, _ := model.CacheGetUserGroup(userId)
	if userGroup == "" {
		return errors.New("获取用户组信息失败")
	}

	groupRatio := model.GlobalUserGroupRatio.GetBySymbol(tokenGroup)
	if groupRatio == nil {
		return errors.New("无效的用户组")
	}

	if !groupRatio.Public && userGroup != tokenGroup {
		// 检查是否有该分组的活跃订阅
		if model.HasActiveSubscription(userId, tokenGroup) {
			return nil
		}
		return errors.New("当前用户组无权使用指定的分组")
	}

	return nil
}

func validateTokenSetting(setting *model.TokenSetting) error {
	if setting == nil {
		return nil
	}

	if setting.Heartbeat.Enabled {
		if setting.Heartbeat.TimeoutSeconds < 30 || setting.Heartbeat.TimeoutSeconds > 90 {
			return errors.New("heartbeat timeout seconds must be between 30 and 90")
		}
	}

	return nil
}

func normalizeAndValidateTokenGroups(
	tokenGroup string,
	backupGroup string,
	setting *model.TokenSetting,
	userId int,
	validateGroup func(string, int) error,
) (string, error) {
	if tokenGroup != "" {
		if err := validateGroup(tokenGroup, userId); err != nil {
			return "", err
		}
	}

	fallbackGroups := model.MergeTokenFallbackGroups(tokenGroup, backupGroup, setting.FallbackGroups)
	for _, group := range fallbackGroups {
		if err := validateGroup(group, userId); err != nil {
			return "", err
		}
	}

	if len(fallbackGroups) == 0 {
		setting.FallbackGroups = nil
		return "", nil
	}

	setting.FallbackGroups = append([]string(nil), fallbackGroups[1:]...)
	return fallbackGroups[0], nil
}
