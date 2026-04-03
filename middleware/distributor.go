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

// SetupGroups 设置用户分组和 Key 分组
func (gd *GroupDistributor) SetupGroups() error {
	userId := gd.context.GetInt("id")
	userGroup, _ := model.CacheGetUserGroup(userId)
	gd.context.Set("group", userGroup)

	keyGroup := gd.context.GetString("key_group")
	backupGroups := getContextBackupGroups(gd.context)

	// 统一分组优先级逻辑
	effectiveGroup := gd.determineEffectiveGroup(keyGroup, backupGroups, userGroup)
	gd.context.Set("key_group", effectiveGroup)

	// 设置分组比例
	return gd.setGroupRatio(effectiveGroup)
}

// determineEffectiveGroup 确定有效的分组
func (gd *GroupDistributor) determineEffectiveGroup(keyGroup string, backupGroups []string, userGroup string) string {
	if keyGroup != "" {
		return keyGroup
	}
	if len(backupGroups) > 0 {
		return backupGroups[0]
	}
	return userGroup
}

func getContextBackupGroups(c *gin.Context) []string {
	value, ok := c.Get("key_backup_groups")
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

	resolved := model.ResolveGroupBillingRatioByChannelType(group, 0)
	gd.context.Set("base_group_ratio", resolved.BaseGroupRatio)
	gd.context.Set("provider_ratio", resolved.ProviderRatio)
	gd.context.Set("effective_group_ratio", resolved.EffectiveGroupRatio)
	gd.context.Set("billing_provider", resolved.BillingProvider)
	gd.context.Set("group_ratio", resolved.EffectiveGroupRatio)
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
