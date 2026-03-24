package relay_util

import (
	"net/http/httptest"
	"testing"

	"czloapi/common/config"
	"czloapi/model"
	"czloapi/types"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/datatypes"
)

func TestQuotaDoesNotDoubleChargeClaudeSplitCacheWriteTokens(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set("group_ratio", 1.0)

	extraRatios := datatypes.NewJSONType(map[string]float64{
		config.UsageExtraCachedWrite5m: 2.5,
		config.UsageExtraCachedWrite1h: 4,
		config.UsageExtraCachedRead:    0.2,
	})
	model.PricingInstance = &model.Pricing{Prices: map[string]*model.Price{
		"test-claude": {
			Model:       "test-claude",
			Type:        model.TokensPriceType,
			ChannelType: config.ChannelTypeAnthropic,
			Input:       2,
			Output:      8,
			ExtraRatios: &extraRatios,
		},
	}}

	quota := NewQuota(c, "test-claude", 0)
	usage := &types.Usage{
		PromptTokens:     1000,
		CompletionTokens: 200,
		TotalTokens:      1200,
		PromptTokensDetails: types.PromptTokensDetails{
			CachedWrite5mTokens: 300,
			CachedWrite1hTokens: 100,
			CachedReadTokens:    200,
		},
	}

	// 输入: (1000-300-100-200)*2 = 800
	// 5m写入: 300*2.5 = 750
	// 1h写入: 100*4 = 400
	// 读取: 200*0.2 = 40
	// 输出: 200*8 = 1600
	// 总计: 3590
	assert.Equal(t, 3590, quota.GetTotalQuotaByUsage(usage))
}
