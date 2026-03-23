package telegram

import (
	"czloapi/common/config"
	"fmt"

	"github.com/PaulSonOfLars/gotgbot/v2"
	"github.com/PaulSonOfLars/gotgbot/v2/ext"
)

func commandBalanceStart(b *gotgbot.Bot, ctx *ext.Context) error {
	user := getBindUser(b, ctx)
	if user == nil {
		return nil
	}

	quota := fmt.Sprintf("%.2f", float64(user.Quota)/config.QuotaPerUnit)
	usedQuota := fmt.Sprintf("%.2f", float64(user.UsedQuota)/config.QuotaPerUnit)

	_, err := ctx.EffectiveMessage.Reply(b, fmt.Sprintf("<b>余额：</b> $%s \n<b>已用：</b> $%s", quota, usedQuota), &gotgbot.SendMessageOpts{
		ParseMode: "html",
	})

	if err != nil {
		return fmt.Errorf("failed to send balance message: %w", err)
	}

	return err
}
