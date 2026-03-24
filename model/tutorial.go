package model

import (
	"czloapi/common/utils"
	"errors"

	"gorm.io/gorm"
)

type Tutorial struct {
	Id          int            `json:"id"`
	Title       string         `json:"title" gorm:"type:varchar(255);not null;index"`
	Content     string         `json:"content" gorm:"type:text"`
	Sort        int            `json:"sort" gorm:"default:0;index"`
	Status      int            `json:"status" gorm:"default:1"`
	CreatedTime int64          `json:"created_time" gorm:"bigint"`
	UpdatedTime int64          `json:"updated_time" gorm:"bigint"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

var allowedTutorialOrderFields = map[string]bool{
	"id":           true,
	"title":        true,
	"sort":         true,
	"status":       true,
	"created_time": true,
	"updated_time": true,
}

func GetTutorialsList(params *GenericParams) (*DataResult[Tutorial], error) {
	var tutorials []*Tutorial
	db := DB
	if params.Keyword != "" {
		db = db.Where("id = ? or title LIKE ?", utils.String2Int(params.Keyword), params.Keyword+"%")
	}
	return PaginateAndOrder[Tutorial](db, &params.PaginationParams, &tutorials, allowedTutorialOrderFields)
}

func GetEnabledTutorials() ([]*Tutorial, error) {
	var tutorials []*Tutorial
	err := DB.Where("status = ?", 1).Order("sort DESC, id ASC").Find(&tutorials).Error
	return tutorials, err
}

func GetTutorialById(id int) (*Tutorial, error) {
	if id == 0 {
		return nil, errors.New("id 为空！")
	}
	tutorial := Tutorial{Id: id}
	err := DB.First(&tutorial, "id = ?", id).Error
	return &tutorial, err
}

func (tutorial *Tutorial) Insert() error {
	return DB.Create(tutorial).Error
}

func (tutorial *Tutorial) Update() error {
	return DB.Model(tutorial).Select("title", "content", "sort", "status", "updated_time").Updates(tutorial).Error
}

func (tutorial *Tutorial) Delete() error {
	return DB.Delete(tutorial).Error
}

func DeleteTutorialById(id int) error {
	if id == 0 {
		return errors.New("id 为空！")
	}
	tutorial := Tutorial{Id: id}
	err := DB.Where(tutorial).First(&tutorial).Error
	if err != nil {
		return err
	}
	return tutorial.Delete()
}
