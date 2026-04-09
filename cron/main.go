package cron

import (
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/scheduler"
	"czloapi/model"
	"fmt"
	"time"

	"github.com/go-co-op/gocron/v2"
)

func InitCron() {
	if !config.IsMasterNode {
		logger.SysLog("Cron is disabled on slave node")
		return
	}

	// 添加每日统计任务
	err := scheduler.Manager.AddJob(
		"update_daily_statistics",
		gocron.DailyJob(
			1,
			gocron.NewAtTimes(
				gocron.NewAtTime(0, 0, 30),
			)),
		gocron.NewTask(func() {
			model.UpdateStatistics(model.StatisticsUpdateTypeYesterday)
			logger.SysLog("更新昨日统计数据")
		}),
	)
	if err != nil {
		logger.SysError("Cron job error: " + err.Error())
		return
	}

	if config.UserInvoiceMonth {
		// 每月一号早上四点生成上个月的账单数据
		err = scheduler.Manager.AddJob(
			"generate_statistics_month",
			gocron.DailyJob(1, gocron.NewAtTimes(gocron.NewAtTime(4, 0, 0))),
			gocron.NewTask(func() {
				err := model.InsertStatisticsMonth()
				if err != nil {
					logger.SysError("Generate statistics month data error:" + err.Error())
				}
			}),
		)
	}

	// 每十分钟更新一次统计数据
	err = scheduler.Manager.AddJob(
		"update_statistics",
		gocron.DurationJob(10*time.Minute),
		gocron.NewTask(func() {
			model.UpdateStatistics(model.StatisticsUpdateTypeToDay)
			logger.SysLog("10分钟统计数据")
		}),
	)

	if err != nil {
		logger.SysError("Cron job error: " + err.Error())
		return
	}

	// 每分钟检查过期订阅
	err = scheduler.Manager.AddJob(
		"expire_subscriptions",
		gocron.DurationJob(1*time.Minute),
		gocron.NewTask(func() {
			count, err := model.ExpireSubscriptions()
			if err != nil {
				logger.SysError("Expire subscriptions error: " + err.Error())
				return
			}
			if count > 0 {
				logger.SysLog(fmt.Sprintf("Expired %d subscriptions", count))
			}
		}),
	)
	if err != nil {
		logger.SysError("Cron job error: " + err.Error())
		return
	}

	// 每2分钟检查订阅配额重置（季度/年度订阅月度重置配额）
	err = scheduler.Manager.AddJob(
		"reset_subscription_quotas",
		gocron.DurationJob(2*time.Minute),
		gocron.NewTask(func() {
			count, err := model.ResetSubscriptionQuotas()
			if err != nil {
				logger.SysError("Reset subscription quotas error: " + err.Error())
				return
			}
			if count > 0 {
				logger.SysLog(fmt.Sprintf("Reset quotas for %d subscriptions", count))
			}
		}),
	)
	if err != nil {
		logger.SysError("Cron job error: " + err.Error())
		return
	}
}
