package types

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIncExtraBillingOnceDeduplicatesByID(t *testing.T) {
	u := &Usage{}

	// 第一次: 新 container，应该计费
	u.IncExtraBillingOnce("code_interpreter", "4g", "container-abc")
	assert.Equal(t, 1, u.ExtraBilling["code_interpreter"].CallCount)
	assert.Equal(t, "4g", u.ExtraBilling["code_interpreter"].Type)

	// 第二次: 同一 container_id，应该跳过
	u.IncExtraBillingOnce("code_interpreter", "4g", "container-abc")
	assert.Equal(t, 1, u.ExtraBilling["code_interpreter"].CallCount)

	// 第三次: 不同 container_id，应该计费
	u.IncExtraBillingOnce("code_interpreter", "4g", "container-def")
	assert.Equal(t, 2, u.ExtraBilling["code_interpreter"].CallCount)
}

func TestIncExtraBillingOnceEmptyDedupeIDAlwaysCounts(t *testing.T) {
	u := &Usage{}

	// 空 dedupeID 不去重（兼容非 container 场景）
	u.IncExtraBillingOnce("file_search", "", "")
	u.IncExtraBillingOnce("file_search", "", "")
	assert.Equal(t, 2, u.ExtraBilling["file_search"].CallCount)
}

func TestIncExtraBillingOnceDoesNotAffectOtherKeys(t *testing.T) {
	u := &Usage{}

	u.IncExtraBillingOnce("code_interpreter", "1g", "container-1")
	u.IncExtraBilling("web_search_preview", "medium")
	u.IncExtraBilling("web_search_preview", "medium")

	assert.Equal(t, 1, u.ExtraBilling["code_interpreter"].CallCount)
	assert.Equal(t, 2, u.ExtraBilling["web_search_preview"].CallCount)
}

func TestUsageEventToChatUsagePreservesExtraBilling(t *testing.T) {
	event := &UsageEvent{}

	event.IncExtraBillingOnce("code_interpreter", "4g", "container-1")
	event.IncExtraBilling("web_search_preview", "high")

	usage := event.ToChatUsage()
	if assert.NotNil(t, usage) {
		assert.Equal(t, 1, usage.ExtraBilling["code_interpreter"].CallCount)
		assert.Equal(t, "4g", usage.ExtraBilling["code_interpreter"].Type)
		assert.Equal(t, 1, usage.ExtraBilling["web_search_preview"].CallCount)
		assert.Equal(t, "high", usage.ExtraBilling["web_search_preview"].Type)
	}
}
