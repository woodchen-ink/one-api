package cron

import (
	"fmt"
	"one-api/common/config"
	"one-api/common/logger"
	"one-api/common/scheduler"
	"one-api/model"
	"time"

	"github.com/spf13/viper"

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

	// 每分钟检查支付成功订单并升级符合条件的用户为VIP
	err = scheduler.Manager.AddJob(
		"check_upgrade_vip",
		gocron.DurationJob(1*time.Minute),
		gocron.NewTask(func() {
			checkAndUpgradeUsersToVIP()
		}),
	)
	if err != nil {
		logger.SysError("Cron job error: " + err.Error())
		return
	}

	// 开启自动更新 并且设置了有效自动更新时间 同时自动更新模式不是system 则会从服务器拉取最新价格表
	autoPriceUpdatesInterval := viper.GetInt("auto_price_updates_interval")
	autoPriceUpdates := viper.GetBool("auto_price_updates")
	autoPriceUpdatesMode := viper.GetString("auto_price_updates_mode")

	if autoPriceUpdates &&
		autoPriceUpdatesInterval > 0 &&
		(autoPriceUpdatesMode == string(model.PriceUpdateModeAdd) ||
			autoPriceUpdatesMode == string(model.PriceUpdateModeOverwrite) ||
			autoPriceUpdatesMode == string(model.PriceUpdateModeUpdate)) {
		// 指定时间周期更新价格表
		err := scheduler.Manager.AddJob(
			"update_pricing_by_service",
			gocron.DurationJob(time.Duration(autoPriceUpdatesInterval)*time.Minute),
			gocron.NewTask(func() {
				err := model.UpdatePriceByPriceService()
				if err != nil {
					logger.SysError("Update Price Error: " + err.Error())
					return
				}
				logger.SysLog("Update Price Done")
			}),
		)
		if err != nil {
			logger.SysError("Cron job error: " + err.Error())
			return
		}
	}

	if err != nil {
		logger.SysError("Cron job error: " + err.Error())
		return
	}
}

// checkAndUpgradeUsersToVIP 检查并升级符合条件的用户为VIP
func checkAndUpgradeUsersToVIP() {
	logger.SysLog("开始检查VIP升级任务")

	// 获取最近1分钟内的支付成功订单
	oneMinuteAgo := time.Now().Unix() - 60
	currentTime := time.Now().Unix()

	params := &model.SearchOrderParams{
		Status:         string(model.OrderStatusSuccess),
		StartTimestamp: oneMinuteAgo,
		EndTimestamp:   currentTime,
		PaginationParams: model.PaginationParams{
			Page: 1,
			Size: 1000, // 假设1分钟内不会有超过1000个订单
		},
	}

	result, err := model.GetOrderList(params)
	if err != nil {
		logger.SysError("获取订单列表失败: " + err.Error())
		return
	}

	if result.Data == nil || len(*result.Data) == 0 {
		logger.SysLog("没有找到新的支付成功订单")
		return
	}

	logger.SysLog(fmt.Sprintf("找到 %d 个新的支付成功订单", len(*result.Data)))

	for _, order := range *result.Data {
		// 获取用户信息
		user, err := model.GetUserById(order.UserId, false)
		if err != nil {
			logger.SysError(fmt.Sprintf("获取用户信息失败 (UserID: %d): %s", order.UserId, err.Error()))
			continue
		}

		// 检查用户是否为 default 组
		if user.Group != "default" {
			logger.SysLog(fmt.Sprintf("用户 %d 不是 default 组，跳过 (当前组: %s)", user.Id, user.Group))
			continue
		}

		// 检查用户充值后的可用金额是否大于等于 $4.9
		// $4.9 = 4.9 * 500000 = 2450000 quota
		requiredQuota := int(4.9 * config.QuotaPerUnit)
		if user.Quota < requiredQuota {
			logger.SysLog(fmt.Sprintf("用户 %d 可用金额不足 (当前: $%.2f, 需要: $4.9)", user.Id, float64(user.Quota)/config.QuotaPerUnit))
			continue
		}

		// 满足条件，升级为 VIP
		err = model.UpdateUser(user.Id, map[string]interface{}{
			"group": "vip",
		})
		if err != nil {
			logger.SysError(fmt.Sprintf("升级用户 %d 为 VIP 失败: %s", user.Id, err.Error()))
			continue
		}

		// 记录日志
		model.RecordLog(user.Id, model.LogTypeSystem, fmt.Sprintf("用户已自动升级为VIP会员 (充值后余额: $%.2f)", float64(user.Quota)/config.QuotaPerUnit))
		logger.SysLog(fmt.Sprintf("用户 %d (%s) 已成功升级为 VIP", user.Id, user.Username))
	}

	logger.SysLog("VIP升级任务检查完成")
}
