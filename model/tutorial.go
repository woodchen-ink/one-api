package model

import (
	"errors"
	"fmt"

	"gorm.io/gorm"

	"czloapi/common/utils"
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
	if params.Order == "" {
		params.Order = "-sort,id"
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

// ReorderTutorials rewrites tutorial sort values according to the reordered page slice.
func ReorderTutorials(ids []int, page int, size int) error {
	if len(ids) < 2 {
		return errors.New("至少需要两个教程才能重新排序")
	}
	if page < 1 || size < 1 {
		return errors.New("分页参数无效")
	}

	var tutorials []*Tutorial
	if err := DB.Order("sort DESC, id ASC").Find(&tutorials).Error; err != nil {
		return err
	}
	if len(tutorials) == 0 {
		return errors.New("教程列表为空")
	}

	start := (page - 1) * size
	end := start + len(ids)
	if start < 0 || start >= len(tutorials) || end > len(tutorials) {
		return errors.New("排序范围无效，请刷新后重试")
	}

	pageItems := tutorials[start:end]
	pageIDSet := make(map[int]int, len(pageItems))
	for _, tutorial := range pageItems {
		pageIDSet[tutorial.Id]++
	}
	for _, id := range ids {
		if pageIDSet[id] == 0 {
			return fmt.Errorf("教程 %d 不在当前页中，请刷新后重试", id)
		}
		pageIDSet[id]--
	}
	for _, remain := range pageIDSet {
		if remain != 0 {
			return errors.New("提交的教程顺序不完整，请刷新后重试")
		}
	}

	reorderedIDs := make([]int, 0, len(tutorials))
	for _, tutorial := range tutorials[:start] {
		reorderedIDs = append(reorderedIDs, tutorial.Id)
	}
	reorderedIDs = append(reorderedIDs, ids...)
	for _, tutorial := range tutorials[end:] {
		reorderedIDs = append(reorderedIDs, tutorial.Id)
	}

	now := utils.GetTimestamp()
	total := len(reorderedIDs)
	return DB.Transaction(func(tx *gorm.DB) error {
		for index, id := range reorderedIDs {
			sortValue := total - index
			err := tx.Model(&Tutorial{}).Where("id = ?", id).Updates(map[string]interface{}{
				"sort":         sortValue,
				"updated_time": now,
			}).Error
			if err != nil {
				return err
			}
		}
		return nil
	})
}
