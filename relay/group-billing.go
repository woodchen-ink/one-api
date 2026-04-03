package relay

import (
	"czloapi/model"

	"github.com/gin-gonic/gin"
)

// syncGroupBillingContext keeps request context pricing multipliers aligned with the billable provider.
func syncGroupBillingContext(c *gin.Context, groupSymbol, modelName string) {
	if groupSymbol == "" {
		return
	}

	resolved := model.ResolveGroupBillingRatio(groupSymbol, modelName)
	c.Set("base_group_ratio", resolved.BaseGroupRatio)
	c.Set("provider_ratio", resolved.ProviderRatio)
	c.Set("effective_group_ratio", resolved.EffectiveGroupRatio)
	c.Set("billing_provider", resolved.BillingProvider)
	c.Set("group_ratio", resolved.EffectiveGroupRatio)
}
