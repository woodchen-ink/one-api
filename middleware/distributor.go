package middleware

import (
	"czloapi/model"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GroupDistributor 统一分组分发逻辑
type GroupDistributor struct {
	context *gin.Context
}

// NewGroupDistributor 创建分组分发器
func NewGroupDistributor(c *gin.Context) *GroupDistributor {
	return &GroupDistributor{context: c}
}

// SetupGroups 设置用户分组和令牌分组
func (gd *GroupDistributor) SetupGroups() error {
	userId := gd.context.GetInt("id")
	userGroup, _ := model.CacheGetUserGroup(userId)
	gd.context.Set("group", userGroup)

	tokenGroup := gd.context.GetString("token_group")
	backupGroups := getContextBackupGroups(gd.context)

	// 统一分组优先级逻辑
	effectiveGroup := gd.determineEffectiveGroup(tokenGroup, backupGroups, userGroup)
	gd.context.Set("token_group", effectiveGroup)

	// 设置分组比例
	return gd.setGroupRatio(effectiveGroup)
}

// determineEffectiveGroup 确定有效的分组
func (gd *GroupDistributor) determineEffectiveGroup(tokenGroup string, backupGroups []string, userGroup string) string {
	if tokenGroup != "" {
		return tokenGroup
	}
	if len(backupGroups) > 0 {
		return backupGroups[0]
	}
	return userGroup
}

func getContextBackupGroups(c *gin.Context) []string {
	value, ok := c.Get("token_backup_groups")
	if !ok {
		return nil
	}

	backupGroups, ok := value.([]string)
	if !ok {
		return nil
	}

	return backupGroups
}

// setGroupRatio 设置分组倍率
func (gd *GroupDistributor) setGroupRatio(group string) error {
	groupRatio := model.GlobalUserGroupRatio.GetBySymbol(group)
	if groupRatio == nil {
		abortWithMessage(gd.context, http.StatusForbidden, fmt.Sprintf("分组 %s 不存在", group))
		return fmt.Errorf("分组 %s 不存在", group)
	}

	gd.context.Set("group_ratio", groupRatio.Ratio)
	return nil
}

func Distribute() func(c *gin.Context) {
	return func(c *gin.Context) {
		distributor := NewGroupDistributor(c)
		if err := distributor.SetupGroups(); err != nil {
			return
		}
		c.Next()
	}
}
