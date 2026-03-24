package middleware

import (
	"czloapi/common/config"
	"czloapi/common/utils"
	"czloapi/model"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func authHelper(c *gin.Context, minRole int) {
	session := sessions.Default(c)
	username := session.Get("username")
	role := session.Get("role")
	id := session.Get("id")
	status := session.Get("status")
	if username == nil {
		accessKey := c.Request.Header.Get("Authorization")
		if accessKey == "" {
			token := c.Param("accessToken")
			if token == "" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"success": false,
					"message": "未登录且未提供 access key",
				})
				c.Abort()
				return
			}
			accessKey = fmt.Sprintf("Bearer %s", token)
		}
		user := model.ValidateAccessKey(accessKey)
		if user != nil && user.Username != "" {
			username = user.Username
			role = user.Role
			id = user.Id
			status = user.Status
		} else {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "access key 无效",
			})
			c.Abort()
			return
		}
	}
	if status.(int) == config.UserStatusDisabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户已被封禁",
		})
		c.Abort()
		return
	}
	if role.(int) < minRole {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "权限不足",
		})
		c.Abort()
		return
	}
	c.Set("username", username)
	c.Set("role", role)
	c.Set("id", id)
	c.Next()
}

func TrySetUserBySession() func(c *gin.Context) {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		id := session.Get("id")
		if id == nil {
			c.Next()
			return
		}

		idInt, ok := id.(int)
		if !ok {
			c.Next()
			return
		}

		c.Set("id", idInt)
		userGroup, err := model.CacheGetUserGroup(idInt)
		if err == nil {
			c.Set("group", userGroup)
		}
		c.Next()
	}
}

func UserAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		authHelper(c, config.RoleCommonUser)
	}
}

func AdminAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		authHelper(c, config.RoleAdminUser)
	}
}

func RootAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		authHelper(c, config.RoleRootUser)
	}
}

func tokenAuth(c *gin.Context, key string) {
	key = strings.TrimPrefix(key, "Bearer ")
	key = strings.TrimPrefix(key, "sk-")

	if len(key) < 48 {
		abortWithMessage(c, http.StatusUnauthorized, "无效的令牌")
		return
	}

	parts := strings.Split(key, "#")
	key = parts[0]
	credential, err := model.ValidateUserKey(key)
	if err != nil {
		abortWithMessage(c, http.StatusUnauthorized, err.Error())
		return
	}

	c.Set("id", credential.UserId)
	c.Set("key_id", credential.Id)
	c.Set("key_name", credential.Name)
	c.Set("key_group", credential.Group)
	backupGroups := model.MergeTokenFallbackGroups(credential.Group, credential.BackupGroup, credential.Setting.Data().FallbackGroups)
	if len(backupGroups) > 0 {
		c.Set("key_backup_group", backupGroups[0])
	} else {
		c.Set("key_backup_group", "")
	}
	c.Set("key_backup_groups", backupGroups)
	c.Set("key_unlimited_quota", credential.UnlimitedQuota)
	c.Set("key_setting", utils.GetPointer(credential.Setting.Data()))
	if err := checkLimitIP(c); err != nil {
		abortWithMessage(c, http.StatusForbidden, err.Error())
		return
	}
	if len(parts) > 1 {
		if model.IsAdmin(credential.UserId) {
			if strings.HasPrefix(parts[1], "!") {
				channelId := utils.String2Int(parts[1][1:])
				c.Set("skip_channel_ids", []int{channelId})
			} else {
				channelId := utils.String2Int(parts[1])
				if channelId == 0 {
					abortWithMessage(c, http.StatusForbidden, "无效的渠道 ID")
					return
				}
				c.Set("specific_channel_id", channelId)
				if len(parts) == 3 && parts[2] == "ignore" {
					c.Set("specific_channel_id_ignore", true)
				}
			}
		} else {
			abortWithMessage(c, http.StatusForbidden, "普通用户不支持指定渠道")
			return
		}
	}
	c.Next()
}

func checkLimitIP(c *gin.Context) (error error) {
	keySetting, exists := c.Get("key_setting")
	if !exists {
		return nil
	}
	setting, ok := keySetting.(*model.KeySetting)
	if !ok || setting == nil {
		return nil
	}
	if !setting.Limits.LimitsIPSetting.Enabled {
		return nil
	}
	if len(setting.Limits.LimitsIPSetting.Whitelist) == 0 {
		return nil
	}

	ip := c.ClientIP()
	for _, allowedIP := range setting.Limits.LimitsIPSetting.Whitelist {
		if allowedIP == ip {
			return nil
		}
		if strings.Contains(allowedIP, "/") && utils.IsIpInCidr(ip, allowedIP) {
			return nil
		}
	}

	return fmt.Errorf("IP %s is not allowed to access", ip)
}

func OpenaiAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		isWebSocket := c.GetHeader("Upgrade") == "websocket"
		key := c.Request.Header.Get("Authorization")

		if isWebSocket && key == "" {
			protocols := c.Request.Header["Sec-Websocket-Protocol"]
			if len(protocols) > 0 {
				protocolList := strings.Split(protocols[0], ",")
				for _, protocol := range protocolList {
					protocol = strings.TrimSpace(protocol)
					if strings.HasPrefix(protocol, "openai-insecure-api-key.") {
						key = strings.TrimPrefix(protocol, "openai-insecure-api-key.")
						break
					}
				}
			}
		}
		tokenAuth(c, key)
	}
}

func ClaudeAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		key := c.Request.Header.Get("x-api-key")
		if key == "" {
			key = c.Request.Header.Get("Authorization")
		}
		tokenAuth(c, key)
	}
}

func GeminiAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		key := c.Request.Header.Get("x-goog-api-key")
		if key == "" {
			key = c.Query("key")
			if key == "" {
				key = c.Request.Header.Get("Authorization")
			}
		}
		tokenAuth(c, key)
	}
}

func SpecifiedChannel() func(c *gin.Context) {
	return func(c *gin.Context) {
		channelId := c.GetInt("specific_channel_id")
		c.Set("specific_channel_id_ignore", false)

		if channelId <= 0 {
			abortWithMessage(c, http.StatusForbidden, "必须指定渠道")
			return
		}
		c.Next()
	}
}
