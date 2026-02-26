package model

import (
	"encoding/json"
	"one-api/common/logger"
	"sync"
)

type ModelMapping struct {
	Id           int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Alias        string `json:"alias" gorm:"type:varchar(100);uniqueIndex;not null"`
	TargetModels string `json:"target_models" gorm:"type:text;not null"` // JSON array: ["model-a","model-b"]
	Enabled      bool   `json:"enabled" gorm:"default:true"`
	CreatedAt    int64  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (m *ModelMapping) TableName() string {
	return "model_mapping"
}

// GetTargetModelsList 解析 TargetModels JSON 字符串为切片
func (m *ModelMapping) GetTargetModelsList() []string {
	var targets []string
	if m.TargetModels == "" {
		return targets
	}
	_ = json.Unmarshal([]byte(m.TargetModels), &targets)
	return targets
}

// CRUD

func CreateModelMapping(mapping *ModelMapping) error {
	return DB.Create(mapping).Error
}

func UpdateModelMapping(mapping *ModelMapping) error {
	return DB.Omit("id", "created_at").Save(mapping).Error
}

func GetModelMappingById(id int) (*ModelMapping, error) {
	mapping := &ModelMapping{}
	err := DB.Where("id = ?", id).First(mapping).Error
	if err != nil {
		return nil, err
	}
	return mapping, nil
}

func GetModelMappingByAlias(alias string) (*ModelMapping, error) {
	mapping := &ModelMapping{}
	err := DB.Where("alias = ?", alias).First(mapping).Error
	if err != nil {
		return nil, err
	}
	return mapping, nil
}

func GetAllModelMappings() ([]*ModelMapping, error) {
	var mappings []*ModelMapping
	err := DB.Order("id desc").Find(&mappings).Error
	if err != nil {
		return nil, err
	}
	return mappings, nil
}

func DeleteModelMapping(id int) error {
	return DB.Delete(&ModelMapping{}, id).Error
}

// 内存缓存

type ModelMappingCacheType struct {
	sync.RWMutex
	AliasToTargets map[string][]string
}

var GlobalModelMappingCache = &ModelMappingCacheType{}

func (c *ModelMappingCacheType) Load() {
	var mappings []*ModelMapping
	DB.Where("enabled = ?", true).Find(&mappings)

	newAliasToTargets := make(map[string][]string)
	for _, m := range mappings {
		targets := m.GetTargetModelsList()
		if len(targets) > 0 {
			newAliasToTargets[m.Alias] = targets
		}
	}

	c.Lock()
	c.AliasToTargets = newAliasToTargets
	c.Unlock()

	logger.SysLog("global model mapping cache loaded")
}

func (c *ModelMappingCacheType) GetAll() map[string][]string {
	c.RLock()
	defer c.RUnlock()

	// 返回副本
	result := make(map[string][]string, len(c.AliasToTargets))
	for k, v := range c.AliasToTargets {
		copied := make([]string, len(v))
		copy(copied, v)
		result[k] = copied
	}
	return result
}

func (c *ModelMappingCacheType) GetTargets(alias string) []string {
	c.RLock()
	defer c.RUnlock()

	targets, ok := c.AliasToTargets[alias]
	if !ok {
		return nil
	}

	copied := make([]string, len(targets))
	copy(copied, targets)
	return copied
}
