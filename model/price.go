package model

import (
	"czloapi/common/config"
	"encoding/json"

	"github.com/shopspring/decimal"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	TokensPriceType                = "tokens"
	TimesPriceType                 = "times"
	DefaultPrice                   = 60.0
	legacyTokenRateToUSDPerMillion = 2.0
	legacyTimesRateToUSD           = 1.0 / 500.0

	DefaultCachedWriteRatio   = 1.25
	DefaultCachedWrite5mRatio = 1.25
	DefaultCachedWrite1hRatio = 2.0
	DefaultCachedReadRatio    = 0.1
)

func LegacyTokenPriceToUSDPerMillion(price float64) float64 {
	if price <= 0 {
		return 0
	}

	return decimal.NewFromFloat(price).
		Mul(decimal.NewFromFloat(legacyTokenRateToUSDPerMillion)).
		InexactFloat64()
}

func LegacyTimesPriceToUSD(price float64) float64 {
	if price <= 0 {
		return 0
	}

	return decimal.NewFromFloat(price).
		Mul(decimal.NewFromFloat(legacyTimesRateToUSD)).
		InexactFloat64()
}

var ExtraKeyUsesInputPrice = map[string]bool{
	config.UsageExtraCache:             true,
	config.UsageExtraCachedWrite:       true,
	config.UsageExtraCachedWrite5m:     true,
	config.UsageExtraCachedWrite1h:     true,
	config.UsageExtraCachedRead:        true,
	config.UsageExtraInputAudio:        true,
	config.UsageExtraOutputAudio:       false,
	config.UsageExtraReasoning:         false,
	config.UsageExtraInputTextTokens:   true,
	config.UsageExtraOutputTextTokens:  false,
	config.UsageExtraInputImageTokens:  true,
	config.UsageExtraOutputImageTokens: false,
}

func GetExtraPriceUsesInputPrice(key string) bool {
	useInputPrice, ok := ExtraKeyUsesInputPrice[key]
	if !ok {
		return true
	}

	return useInputPrice
}

var defaultExtraPriceFactor = map[string]float64{
	config.UsageExtraCache:            1,
	config.UsageExtraCachedWrite:      DefaultCachedWriteRatio,
	config.UsageExtraCachedWrite5m:    DefaultCachedWrite5mRatio,
	config.UsageExtraCachedWrite1h:    DefaultCachedWrite1hRatio,
	config.UsageExtraCachedRead:       DefaultCachedReadRatio,
	config.UsageExtraInputAudio:       1,
	config.UsageExtraOutputAudio:      1,
	config.UsageExtraReasoning:        1,
	config.UsageExtraInputTextTokens:  1,
	config.UsageExtraOutputTextTokens: 1,
}

type Price struct {
	Model       string  `json:"model" gorm:"type:varchar(100)" binding:"required"`
	Type        string  `json:"type"  gorm:"default:'tokens'" binding:"required"`
	ChannelType int     `json:"channel_type" gorm:"default:0" binding:"gte=0"`
	Input       float64 `json:"input" gorm:"default:0" binding:"gte=0"`
	Output      float64 `json:"output" gorm:"default:0" binding:"gte=0"`
	Locked      bool    `json:"locked" gorm:"default:false"`

	ExtraRatios  *datatypes.JSONType[map[string]float64] `json:"extra_ratios,omitempty" gorm:"type:json"`
	BillingRules *datatypes.JSONType[[]BillingRule]      `json:"billing_rules,omitempty" gorm:"type:json"`
	ModelInfo    *ModelInfoResponse                      `json:"model_info,omitempty" gorm:"-"`
}

func GetAllPrices() ([]*Price, error) {
	var prices []*Price
	if err := DB.Find(&prices).Error; err != nil {
		return nil, err
	}
	// if config.ExtraTokenPriceJson == "" {
	// 	return prices, nil
	// }

	// extraRatios := make(map[string]map[string]float64)
	// err := json.Unmarshal([]byte(config.ExtraTokenPriceJson), &extraRatios)
	// if err != nil {
	// 	return nil, err
	// }

	// for _, price := range prices {
	// 	if ratio, ok := extraRatios[price.Model]; ok {
	// 		price.ExtraRatios = ratio
	// 	}
	// }

	return prices, nil
}

func (price *Price) Update(modelName string) error {
	if err := DB.Model(price).Select("*").Where("model = ?", modelName).Updates(price).Error; err != nil {
		return err
	}

	return nil
}

func (price *Price) Insert() error {
	if err := DB.Create(price).Error; err != nil {
		return err
	}

	return nil
}

func (price *Price) GetInput() float64 {
	if price.Input <= 0 {
		return 0
	}
	return price.Input
}

func (price *Price) GetOutput() float64 {
	if price.Output <= 0 || price.Type == TimesPriceType {
		return 0
	}

	return price.Output
}

func (price *Price) GetExtraPrice(key string) float64 {
	if extraRatios := price.GetExplicitExtraRatios(); len(extraRatios) > 0 {
		if extraPrice, ok := extraRatios[key]; ok {
			return extraPrice
		}
	}

	basePrice := price.GetOutput()
	if GetExtraPriceUsesInputPrice(key) {
		basePrice = price.GetInput()
	}

	ratio, ok := defaultExtraPriceFactor[key]
	if !ok {
		return basePrice
	}

	return decimal.NewFromFloat(basePrice).
		Mul(decimal.NewFromFloat(ratio)).
		InexactFloat64()
}

func (price *Price) GetExplicitExtraRatios() map[string]float64 {
	if price.ExtraRatios == nil {
		return nil
	}

	return price.ExtraRatios.Data()
}

func (price *Price) FetchInputCurrencyPrice(rate float64) string {
	r := decimal.NewFromFloat(price.GetInput()).Mul(decimal.NewFromFloat(rate))
	return r.String()
}

func (price *Price) FetchOutputCurrencyPrice(rate float64) string {
	r := decimal.NewFromFloat(price.GetOutput()).Mul(decimal.NewFromFloat(rate))
	return r.String()
}

func UpdatePrices(tx *gorm.DB, models []string, prices *Price) error {
	err := tx.Model(Price{}).Where("model IN (?)", models).Select("*").Omit("model").Updates(
		Price{
			Type:         prices.Type,
			ChannelType:  prices.ChannelType,
			Input:        prices.Input,
			Output:       prices.Output,
			Locked:       prices.Locked,
			ExtraRatios:  prices.ExtraRatios,
			BillingRules: prices.BillingRules,
		}).Error

	return err
}

func DeletePrices(tx *gorm.DB, models []string) error {
	err := tx.Where("model IN (?)", models).Delete(&Price{}).Error

	return err
}

func InsertPrices(tx *gorm.DB, prices []*Price) error {
	err := tx.CreateInBatches(prices, 100).Error
	return err
}

func (price *Price) Delete() error {
	return DB.Where("model = ?", price.Model).Delete(&Price{}).Error
}

type ModelType struct {
	Ratio []float64
	Type  int
}

// Legacy default table uses historical "rate" values.
// It is converted to direct USD prices when loading defaults.
func GetDefaultPrice() []*Price {
	ModelTypes := map[string]ModelType{
		// 	$0.03 / 1K tokens	$0.06 / 1K tokens
		"gpt-4":      {[]float64{15, 30}, config.ChannelTypeOpenAI},
		"gpt-4-0314": {[]float64{15, 30}, config.ChannelTypeOpenAI},
		"gpt-4-0613": {[]float64{15, 30}, config.ChannelTypeOpenAI},
		// 	$0.06 / 1K tokens	$0.12 / 1K tokens
		"gpt-4-32k":      {[]float64{30, 60}, config.ChannelTypeOpenAI},
		"gpt-4-32k-0314": {[]float64{30, 60}, config.ChannelTypeOpenAI},
		"gpt-4-32k-0613": {[]float64{30, 60}, config.ChannelTypeOpenAI},
		// 	$0.01 / 1K tokens	$0.03 / 1K tokens
		"gpt-4-preview":          {[]float64{5, 15}, config.ChannelTypeOpenAI},
		"gpt-4-turbo":            {[]float64{5, 15}, config.ChannelTypeOpenAI},
		"gpt-4-turbo-2024-04-09": {[]float64{5, 15}, config.ChannelTypeOpenAI},
		"gpt-4-1106-preview":     {[]float64{5, 15}, config.ChannelTypeOpenAI},
		"gpt-4-0125-preview":     {[]float64{5, 15}, config.ChannelTypeOpenAI},
		"gpt-4-turbo-preview":    {[]float64{5, 15}, config.ChannelTypeOpenAI},
		"gpt-4-vision-preview":   {[]float64{5, 15}, config.ChannelTypeOpenAI},
	}

	var prices []*Price

	for model, modelType := range ModelTypes {
		prices = append(prices, &Price{
			Model:       model,
			Type:        TokensPriceType,
			ChannelType: modelType.Type,
			Input:       LegacyTokenPriceToUSDPerMillion(modelType.Ratio[0]),
			Output:      LegacyTokenPriceToUSDPerMillion(modelType.Ratio[1]),
		})
	}

	return prices
}

func GetDefaultExtraRatio() string {
	legacyExtraRatios := map[string]map[string]float64{
		"gpt-4o-audio-preview":                    {"input_audio_tokens": 40, "output_audio_tokens": 20},
		"gpt-4o-audio-preview-2024-10-01":         {"input_audio_tokens": 40, "output_audio_tokens": 20},
		"gpt-4o-audio-preview-2024-12-17":         {"input_audio_tokens": 16, "output_audio_tokens": 8},
		"gpt-4o-mini-audio-preview":               {"input_audio_tokens": 67, "output_audio_tokens": 34},
		"gpt-4o-mini-audio-preview-2024-12-17":    {"input_audio_tokens": 67, "output_audio_tokens": 34},
		"gpt-4o-realtime-preview":                 {"input_audio_tokens": 20, "output_audio_tokens": 10},
		"gpt-4o-realtime-preview-2024-10-01":      {"input_audio_tokens": 20, "output_audio_tokens": 10},
		"gpt-4o-realtime-preview-2024-12-17":      {"input_audio_tokens": 8, "output_audio_tokens": 4},
		"gpt-4o-mini-realtime-preview":            {"input_audio_tokens": 17, "output_audio_tokens": 8.4},
		"gpt-4o-mini-realtime-preview-2024-12-17": {"input_audio_tokens": 17, "output_audio_tokens": 8.4},
		"gemini-2.5-flash-preview-04-17":          {"reasoning_tokens": 5.833},
		"gpt-image-1":                             {"input_text_tokens": 0.5},
	}

	defaultPrices := GetDefaultPrice()
	priceMap := make(map[string]*Price, len(defaultPrices))
	for _, price := range defaultPrices {
		priceMap[price.Model] = price
	}

	extraPrices := make(map[string]map[string]float64, len(legacyExtraRatios))
	for modelName, extraRatios := range legacyExtraRatios {
		price, ok := priceMap[modelName]
		if !ok {
			continue
		}

		modelExtraPrices := make(map[string]float64, len(extraRatios))
		for key, ratio := range extraRatios {
			basePrice := price.GetOutput()
			if GetExtraPriceUsesInputPrice(key) {
				basePrice = price.GetInput()
			}
			modelExtraPrices[key] = decimal.NewFromFloat(basePrice).
				Mul(decimal.NewFromFloat(ratio)).
				InexactFloat64()
		}
		extraPrices[modelName] = modelExtraPrices
	}

	data, err := json.Marshal(extraPrices)
	if err != nil {
		return "{}"
	}

	return string(data)
}
