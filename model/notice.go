package model

import (
	"errors"
	"time"

	"czloapi/common/utils"

	"gorm.io/gorm"
)

type Notice struct {
	Id          int            `json:"id"`
	Title       string         `json:"title" gorm:"type:varchar(255);not null;index"`
	Content     string         `json:"content" gorm:"type:text"`
	PublishTime int64          `json:"publish_time" gorm:"bigint;index"`
	Sort        int            `json:"sort" gorm:"default:0;index"`
	Status      int            `json:"status" gorm:"default:1"`
	CreatedTime int64          `json:"created_time" gorm:"bigint"`
	UpdatedTime int64          `json:"updated_time" gorm:"bigint"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

var allowedNoticeOrderFields = map[string]bool{
	"id":           true,
	"title":        true,
	"publish_time": true,
	"sort":         true,
	"status":       true,
	"created_time": true,
	"updated_time": true,
}

func GetNoticesList(params *GenericParams) (*DataResult[Notice], error) {
	var notices []*Notice
	db := DB
	if params.Keyword != "" {
		db = db.Where("id = ? or title LIKE ?", utils.String2Int(params.Keyword), params.Keyword+"%")
	}
	return PaginateAndOrder[Notice](db, &params.PaginationParams, &notices, allowedNoticeOrderFields)
}

// GetEnabledNotices returns published notices (status=1 and publish_time <= now).
func GetEnabledNotices() ([]*Notice, error) {
	var notices []*Notice
	now := time.Now().Unix()
	err := DB.Where("status = ? AND publish_time <= ?", 1, now).Order("publish_time DESC, id DESC").Find(&notices).Error
	return notices, err
}

// GetLatestNotices returns the most recent N published notices (title + publish_time only).
func GetLatestNotices(limit int) ([]*Notice, error) {
	var notices []*Notice
	now := time.Now().Unix()
	err := DB.Select("id, title, publish_time").
		Where("status = ? AND publish_time <= ?", 1, now).
		Order("publish_time DESC, id DESC").
		Limit(limit).
		Find(&notices).Error
	return notices, err
}

func GetNoticeById(id int) (*Notice, error) {
	if id == 0 {
		return nil, errors.New("id 为空！")
	}
	notice := Notice{Id: id}
	err := DB.First(&notice, "id = ?", id).Error
	return &notice, err
}

func (notice *Notice) Insert() error {
	return DB.Create(notice).Error
}

func (notice *Notice) Update() error {
	return DB.Model(notice).Select("title", "content", "publish_time", "sort", "status", "updated_time").Updates(notice).Error
}

func (notice *Notice) Delete() error {
	return DB.Delete(notice).Error
}

func DeleteNoticeById(id int) error {
	if id == 0 {
		return errors.New("id 为空！")
	}
	notice := Notice{Id: id}
	err := DB.Where(notice).First(&notice).Error
	if err != nil {
		return err
	}
	return notice.Delete()
}
