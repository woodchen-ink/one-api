package model

import (
	"czloapi/common/utils"
	"errors"
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
	PriceCurrency  CurrencyType   `json:"price_currency" gorm:"type:varchar(5);not null;default:'USD'"`
	QuotaAmount    float64        `json:"quota_amount" gorm:"type:decimal(10,2);not null"`
	DurationType   string         `json:"duration_type" gorm:"type:varchar(10);not null"` // day, week, month
	DurationCount  int            `json:"duration_count" gorm:"default:1"`
	Sort           int            `json:"sort" gorm:"default:0"`
	PaymentProduct string         `json:"payment_product" gorm:"type:varchar(200)"`
	Enable         *bool          `json:"enable" gorm:"default:true"`
	AllowRenewal      *bool          `json:"allow_renewal" gorm:"default:true"`
	EnableQuarterly   *bool          `json:"enable_quarterly" gorm:"default:false"`
	QuarterlyDiscount float64        `json:"quarterly_discount" gorm:"type:decimal(5,2);default:0"`
	EnableYearly      *bool          `json:"enable_yearly" gorm:"default:false"`
	YearlyDiscount    float64        `json:"yearly_discount" gorm:"type:decimal(5,2);default:0"`
	CreatedAt         int            `json:"created_at"`
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
	p.Features = strings.TrimSpace(p.Features)
	p.PaymentProduct = strings.TrimSpace(p.PaymentProduct)
	p.PriceCurrency = NormalizeCurrencyType(p.PriceCurrency)
	if p.QuarterlyDiscount < 0 {
		p.QuarterlyDiscount = 0
	} else if p.QuarterlyDiscount > 100 {
		p.QuarterlyDiscount = 100
	}
	if p.YearlyDiscount < 0 {
		p.YearlyDiscount = 0
	} else if p.YearlyDiscount > 100 {
		p.YearlyDiscount = 100
	}
}

// GetQuarterlyPrice 计算季度总价
func (p *SubscriptionPlan) GetQuarterlyPrice() float64 {
	return utils.Decimal(p.Price*3*(1-p.QuarterlyDiscount/100), 2)
}

// GetYearlyPrice 计算年度总价
func (p *SubscriptionPlan) GetYearlyPrice() float64 {
	return utils.Decimal(p.Price*12*(1-p.YearlyDiscount/100), 2)
}

// PriceForCycle 根据计费周期返回价格和对应月数
func (p *SubscriptionPlan) PriceForCycle(cycle string) (price float64, months int, err error) {
	switch cycle {
	case "monthly", "":
		return p.Price, 1, nil
	case "quarterly":
		if p.EnableQuarterly == nil || !*p.EnableQuarterly {
			return 0, 0, errors.New("该套餐未开启季度订阅")
		}
		return p.GetQuarterlyPrice(), 3, nil
	case "yearly":
		if p.EnableYearly == nil || !*p.EnableYearly {
			return 0, 0, errors.New("该套餐未开启年度订阅")
		}
		return p.GetYearlyPrice(), 12, nil
	default:
		return 0, 0, errors.New("不支持的计费周期: " + cycle)
	}
}

// SubscriptionPlanPricing 包含计算后价格的套餐响应
type SubscriptionPlanPricing struct {
	*SubscriptionPlan
	MonthlyPrice   float64 `json:"monthly_price"`
	QuarterlyPrice float64 `json:"quarterly_price,omitempty"`
	YearlyPrice    float64 `json:"yearly_price,omitempty"`
}

// ToSubscriptionPlanPricing 转换为包含计算价格的响应
func (p *SubscriptionPlan) ToSubscriptionPlanPricing() *SubscriptionPlanPricing {
	pricing := &SubscriptionPlanPricing{
		SubscriptionPlan: p,
		MonthlyPrice:     p.Price,
	}
	if p.EnableQuarterly != nil && *p.EnableQuarterly {
		pricing.QuarterlyPrice = p.GetQuarterlyPrice()
	}
	if p.EnableYearly != nil && *p.EnableYearly {
		pricing.YearlyPrice = p.GetYearlyPrice()
	}
	return pricing
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
	if !IsSupportedCurrencyType(p.PriceCurrency) {
		return errors.New("不支持的套餐售价币种")
	}
	return DB.Create(p).Error
}

func (p *SubscriptionPlan) Update() error {
	p.normalize()
	if !IsSupportedCurrencyType(p.PriceCurrency) {
		return errors.New("不支持的套餐售价币种")
	}
	return DB.Model(&SubscriptionPlan{}).Where("id = ?", p.ID).
		Select("name", "group_symbol", "description", "features", "price", "price_currency", "quota_amount",
			"duration_type", "duration_count", "sort", "payment_product", "allow_renewal",
			"enable_quarterly", "quarterly_discount", "enable_yearly", "yearly_discount").
		Updates(p).Error
}

func (p *SubscriptionPlan) Delete() error {
	return DB.Delete(p).Error
}

func ChangeSubscriptionPlanEnable(id int, enable bool) error {
	return DB.Model(&SubscriptionPlan{}).Where("id = ?", id).Update("enable", enable).Error
}
