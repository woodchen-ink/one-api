package model

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type PriceSyncProvider interface {
	Key() string
	Name() string
	ChannelType() int
	SourceURL() string
	Fetch(ctx context.Context) ([]byte, error)
	Parse(raw []byte) ([]PriceSyncDraftRow, error)
	FilterModelOptions(options []string) []string
	SuggestModel(sourceModel string, options []string) string
}

type PriceSyncProviderMeta struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	ChannelType int    `json:"channel_type"`
	SourceURL   string `json:"source_url"`
}

type PriceSyncDraftRow struct {
	SourceModel  string             `json:"source_model"`
	Model        string             `json:"model"`
	ChannelType  int                `json:"channel_type"`
	Type         string             `json:"type"`
	Input        float64            `json:"input"`
	Output       float64            `json:"output"`
	ExtraRatios  map[string]float64 `json:"extra_ratios,omitempty"`
	BillingRules []BillingRule      `json:"billing_rules,omitempty"`
}

type PriceSyncPreview struct {
	Provider     PriceSyncProviderMeta `json:"provider"`
	ModelOptions []string              `json:"model_options"`
	Rows         []PriceSyncDraftRow   `json:"rows"`
}

type PriceSyncRequest struct {
	Provider string `json:"provider" binding:"required"`
}

type PriceSyncApplyRequest struct {
	Provider string              `json:"provider" binding:"required"`
	Rows     []PriceSyncDraftRow `json:"rows" binding:"required"`
}

var priceSyncProviders = map[string]PriceSyncProvider{
	"openai": newOpenAIPriceSyncProvider(),
	"claude": newClaudePriceSyncProvider(),
	"gemini": newGeminiPriceSyncProvider(),
}

func GetPriceSyncProviders() []PriceSyncProviderMeta {
	metas := make([]PriceSyncProviderMeta, 0, len(priceSyncProviders))
	for _, provider := range priceSyncProviders {
		metas = append(metas, PriceSyncProviderMeta{
			Key:         provider.Key(),
			Name:        provider.Name(),
			ChannelType: provider.ChannelType(),
			SourceURL:   provider.SourceURL(),
		})
	}

	sort.Slice(metas, func(i, j int) bool {
		return metas[i].Key < metas[j].Key
	})

	return metas
}

func GetPriceSyncProvider(key string) (PriceSyncProvider, error) {
	provider, ok := priceSyncProviders[strings.TrimSpace(strings.ToLower(key))]
	if !ok {
		return nil, fmt.Errorf("unsupported price sync provider: %s", key)
	}

	return provider, nil
}

func PreviewPriceSync(ctx context.Context, providerKey string) (*PriceSyncPreview, error) {
	provider, err := GetPriceSyncProvider(providerKey)
	if err != nil {
		return nil, err
	}

	raw, err := provider.Fetch(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := provider.Parse(raw)
	if err != nil {
		return nil, err
	}

	modelOptions := provider.FilterModelOptions(GetAllKnownModelNames())
	for index := range rows {
		if rows[index].ChannelType == 0 {
			rows[index].ChannelType = provider.ChannelType()
		}
		if rows[index].Type == "" {
			rows[index].Type = TokensPriceType
		}
		if rows[index].Model == "" {
			rows[index].Model = provider.SuggestModel(rows[index].SourceModel, modelOptions)
		}
	}

	return &PriceSyncPreview{
		Provider: PriceSyncProviderMeta{
			Key:         provider.Key(),
			Name:        provider.Name(),
			ChannelType: provider.ChannelType(),
			SourceURL:   provider.SourceURL(),
		},
		ModelOptions: modelOptions,
		Rows:         rows,
	}, nil
}

func ApplyPriceSync(_ context.Context, request *PriceSyncApplyRequest) error {
	if request == nil {
		return errors.New("sync request is required")
	}

	provider, err := GetPriceSyncProvider(request.Provider)
	if err != nil {
		return err
	}

	if len(request.Rows) == 0 {
		return errors.New("sync rows cannot be empty")
	}

	modelSet := make(map[string]bool, len(request.Rows))
	prices := make([]*Price, 0, len(request.Rows))
	for index, row := range request.Rows {
		modelName := strings.TrimSpace(row.Model)
		if modelName == "" {
			return fmt.Errorf("rows[%d].model is required", index)
		}
		if modelSet[modelName] {
			return fmt.Errorf("duplicated model in sync rows: %s", modelName)
		}
		modelSet[modelName] = true

		price := &Price{
			Model:       modelName,
			Type:        TokensPriceType,
			ChannelType: provider.ChannelType(),
			Input:       row.Input,
			Output:      row.Output,
		}
		if strings.TrimSpace(row.Type) != "" {
			price.Type = row.Type
		}
		if row.ChannelType > 0 {
			price.ChannelType = row.ChannelType
		}
		if len(row.ExtraRatios) > 0 {
			extraRatios := datatypes.NewJSONType(clonePriceSyncExtraRatios(row.ExtraRatios))
			price.ExtraRatios = &extraRatios
		}
		if len(row.BillingRules) > 0 {
			billingRules := datatypes.NewJSONType(clonePriceSyncBillingRules(row.BillingRules))
			price.BillingRules = &billingRules
		}
		if err = price.ValidateBillingRules(); err != nil {
			return fmt.Errorf("invalid pricing row %s: %w", modelName, err)
		}
		prices = append(prices, price)
	}

	tx := DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	for _, price := range prices {
		var existing Price
		err = tx.Where("model = ?", price.Model).First(&existing).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			if err = tx.Create(price).Error; err != nil {
				tx.Rollback()
				return err
			}
		case err != nil:
			tx.Rollback()
			return err
		default:
			updates := map[string]any{
				"type":         price.Type,
				"channel_type": price.ChannelType,
				"input":        price.Input,
				"output":       price.Output,
				"extra_ratios": price.ExtraRatios,
			}
			if err = tx.Model(&Price{}).Where("model = ?", price.Model).Updates(updates).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	if err = tx.Commit().Error; err != nil {
		return err
	}

	return PricingInstance.Init()
}

func clonePriceSyncExtraRatios(source map[string]float64) map[string]float64 {
	if len(source) == 0 {
		return nil
	}

	cloned := make(map[string]float64, len(source))
	for key, value := range source {
		cloned[key] = value
	}
	return cloned
}

func clonePriceSyncBillingRules(source []BillingRule) []BillingRule {
	if len(source) == 0 {
		return nil
	}

	cloned := make([]BillingRule, len(source))
	for index, rule := range source {
		cloned[index] = BillingRule{
			Name:        rule.Name,
			Priority:    rule.Priority,
			Strategy:    rule.Strategy,
			Match:       rule.Match,
			Input:       cloneFloat64Pointer(rule.Input),
			Output:      cloneFloat64Pointer(rule.Output),
			ExtraRatios: clonePriceSyncExtraRatios(rule.ExtraRatios),
		}
	}

	return cloned
}

func cloneFloat64Pointer(value *float64) *float64 {
	if value == nil {
		return nil
	}

	cloned := *value
	return &cloned
}

func GetAllKnownModelNames() []string {
	modelsMap := make(map[string]bool)

	if PricingInstance != nil {
		for modelName := range PricingInstance.GetAllPrices() {
			modelsMap[modelName] = true
		}
	}

	for _, modelMap := range ChannelGroup.Rule {
		for modelName := range modelMap {
			modelsMap[modelName] = true
		}
	}

	models := make([]string, 0, len(modelsMap))
	for modelName := range modelsMap {
		models = append(models, modelName)
	}

	sort.Strings(models)
	return models
}
