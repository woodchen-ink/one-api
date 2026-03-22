package model

import (
	"strings"

	"gorm.io/gorm"
)

type SubscriptionPlan struct {
	ID             int            `json:"id" gorm:"primaryKey"`
	Name           string         `json:"name" gorm:"type:varchar(100);not null"`
	GroupSymbol    string         `json:"group_symbol" gorm:"type:varchar(50);not null"`
	Description    string         `json:"description" gorm:"type:text"`
	Features       string         `json:"features" gorm:"type:text"`
	Price          float64        `json:"price" gorm:"type:decimal(10,2);not null"`
	QuotaAmount    float64        `json:"quota_amount" gorm:"type:decimal(10,2);not null"`
	DurationType   string         `json:"duration_type" gorm:"type:varchar(10);not null"` // day, week, month
	DurationCount  int            `json:"duration_count" gorm:"default:1"`
	Sort           int            `json:"sort" gorm:"default:0"`
	PaymentProduct string         `json:"payment_product" gorm:"type:varchar(200)"`
	Enable         *bool          `json:"enable" gorm:"default:true"`
	AllowRenewal   *bool          `json:"allow_renewal" gorm:"default:true"`
	CreatedAt      int            `json:"created_at"`
	UpdatedAt      int            `json:"-"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`
}

type SearchSubscriptionPlanParams struct {
	Name        string `form:"name"`
	GroupSymbol string `form:"group_symbol"`
	Enable      *bool  `form:"enable"`
	PaginationParams
}

var allowedSubscriptionPlanOrderFields = map[string]bool{
	"id":     true,
	"name":   true,
	"sort":   true,
	"enable": true,
	"price":  true,
}

func (p *SubscriptionPlan) normalize() {
	p.Name = strings.TrimSpace(p.Name)
	p.GroupSymbol = strings.TrimSpace(p.GroupSymbol)
	p.Description = strings.TrimSpace(p.Description)
	p.PaymentProduct = strings.TrimSpace(p.PaymentProduct)
}

func GetSubscriptionPlanList(params *SearchSubscriptionPlanParams) (*DataResult[SubscriptionPlan], error) {
	var plans []*SubscriptionPlan
	db := DB.Session(&gorm.Session{PrepareStmt: false})

	if params.Name != "" {
		db = db.Where("name LIKE ?", params.Name+"%")
	}
	if params.GroupSymbol != "" {
		db = db.Where("group_symbol = ?", params.GroupSymbol)
	}
	if params.Enable != nil {
		db = db.Where("enable = ?", *params.Enable)
	}

	return PaginateAndOrder(db, &params.PaginationParams, &plans, allowedSubscriptionPlanOrderFields)
}

func GetSubscriptionPlanById(id int) (*SubscriptionPlan, error) {
	var plan SubscriptionPlan
	err := DB.Where("id = ?", id).First(&plan).Error
	return &plan, err
}

func GetSubscriptionPlanByNameAndGroup(name string, groupSymbol string) (*SubscriptionPlan, error) {
	var plan SubscriptionPlan
	err := DB.Where("name = ? AND group_symbol = ?", strings.TrimSpace(name), strings.TrimSpace(groupSymbol)).
		Order("id DESC").
		First(&plan).Error
	return &plan, err
}

func GetAvailableSubscriptionPlans() ([]*SubscriptionPlan, error) {
	var plans []*SubscriptionPlan
	err := DB.Where("enable = ?", true).Order("sort DESC, id ASC").Find(&plans).Error
	return plans, err
}

func (p *SubscriptionPlan) Insert() error {
	p.normalize()
	return DB.Create(p).Error
}

func (p *SubscriptionPlan) Update() error {
	p.normalize()
	return DB.Model(&SubscriptionPlan{}).Where("id = ?", p.ID).
		Select("name", "group_symbol", "description", "features", "price", "quota_amount",
			"duration_type", "duration_count", "sort", "payment_product", "allow_renewal").
		Updates(p).Error
}

func (p *SubscriptionPlan) Delete() error {
	return DB.Delete(p).Error
}

func ChangeSubscriptionPlanEnable(id int, enable bool) error {
	return DB.Model(&SubscriptionPlan{}).Where("id = ?", id).Update("enable", enable).Error
}
