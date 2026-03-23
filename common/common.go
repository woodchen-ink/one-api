package common

import (
	"czloapi/common/config"
	"fmt"
	"math"
)

func LogQuota(quota int) string {
	if quota < 0 {
		return fmt.Sprintf("-＄%.6f 额度", math.Abs(float64(quota)/config.QuotaPerUnit))
	}
	return fmt.Sprintf("＄%.6f 额度", float64(quota)/config.QuotaPerUnit)
}
