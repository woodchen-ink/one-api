package model

import (
	"testing"

	"czloapi/common/config"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeCurrencyType(t *testing.T) {
	assert.Equal(t, CurrencyTypeUSD, NormalizeCurrencyType(""))
	assert.Equal(t, CurrencyTypeUSD, NormalizeCurrencyType(" usd "))
	assert.Equal(t, CurrencyTypeCNY, NormalizeCurrencyType(" cny "))
}

func TestConvertCurrencyAmount(t *testing.T) {
	originalRate := config.PaymentUSDRate
	config.PaymentUSDRate = 7.2
	t.Cleanup(func() {
		config.PaymentUSDRate = originalRate
	})

	usdToCny, err := ConvertCurrencyAmount(50, CurrencyTypeUSD, CurrencyTypeCNY)
	assert.NoError(t, err)
	assert.Equal(t, 360.0, usdToCny)

	cnyToUsd, err := ConvertCurrencyAmount(100, CurrencyTypeCNY, CurrencyTypeUSD)
	assert.NoError(t, err)
	assert.Equal(t, 13.89, cnyToUsd)

	sameCurrency, err := ConvertCurrencyAmount(88.88, CurrencyTypeCNY, CurrencyTypeCNY)
	assert.NoError(t, err)
	assert.Equal(t, 88.88, sameCurrency)
}

func TestConvertCurrencyAmountRejectsUnsupportedCurrency(t *testing.T) {
	_, err := ConvertCurrencyAmount(10, CurrencyType("EUR"), CurrencyTypeUSD)
	assert.Error(t, err)
}
