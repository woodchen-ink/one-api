package channel_test

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"

	"czloapi/common/notify/channel"
	"czloapi/common/requester"

	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
)

func InitConfig() {
	viper.AddConfigPath("/czloapi")
	viper.SetConfigName("config")
	viper.ReadInConfig()
	requester.InitHttpClient()
}

func requireNotifyIntegrationTest(t *testing.T, configKeys ...string) {
	t.Helper()
	if os.Getenv("RUN_INTEGRATION_TESTS") != "1" {
		t.Skip("requires real notification credentials; set RUN_INTEGRATION_TESTS=1 to run")
	}

	InitConfig()

	missing := make([]string, 0)
	for _, key := range configKeys {
		if viper.GetString(key) == "" {
			missing = append(missing, key)
		}
	}
	if len(missing) > 0 {
		t.Skipf("missing integration config: %s", strings.Join(missing, ", "))
	}
}

func TestDingTalkSend(t *testing.T) {
	requireNotifyIntegrationTest(t, "notify.dingtalk.token", "notify.dingtalk.secret")
	access_token := viper.GetString("notify.dingtalk.token")
	secret := viper.GetString("notify.dingtalk.secret")
	dingTalk := channel.NewDingTalk(access_token, secret)

	err := dingTalk.Send(context.Background(), "Test Title", "*Test Message*")
	fmt.Println(err)
	assert.Nil(t, err)
}

func TestDingTalkSendWithKeyWord(t *testing.T) {
	requireNotifyIntegrationTest(t, "notify.dingtalk.token", "notify.dingtalk.keyWord")
	access_token := viper.GetString("notify.dingtalk.token")
	keyWord := viper.GetString("notify.dingtalk.keyWord")

	dingTalk := channel.NewDingTalkWithKeyWord(access_token, keyWord)

	err := dingTalk.Send(context.Background(), "Test Title", "Test Message")
	assert.Nil(t, err)
}

func TestDingTalkSendError(t *testing.T) {
	requireNotifyIntegrationTest(t, "notify.dingtalk.token")
	access_token := viper.GetString("notify.dingtalk.token")
	secret := "test"
	dingTalk := channel.NewDingTalk(access_token, secret)

	err := dingTalk.Send(context.Background(), "Test Title", "*Test Message*")
	fmt.Println(err)
	assert.Error(t, err)
}

func TestLarkSend(t *testing.T) {
	requireNotifyIntegrationTest(t, "notify.lark.token", "notify.lark.secret")
	access_token := viper.GetString("notify.lark.token")
	secret := viper.GetString("notify.lark.secret")
	dingTalk := channel.NewLark(access_token, secret)

	err := dingTalk.Send(context.Background(), "Test Title", "*Test Message*")
	fmt.Println(err)
	assert.Nil(t, err)
}

func TestLarkSendWithKeyWord(t *testing.T) {
	requireNotifyIntegrationTest(t, "notify.lark.token", "notify.lark.keyWord")
	access_token := viper.GetString("notify.lark.token")
	keyWord := viper.GetString("notify.lark.keyWord")

	dingTalk := channel.NewLarkWithKeyWord(access_token, keyWord)

	err := dingTalk.Send(context.Background(), "Test Title", "Test Message\n\n- 111\n- 222")
	assert.Nil(t, err)
}

func TestLarkSendError(t *testing.T) {
	requireNotifyIntegrationTest(t, "notify.lark.token")
	access_token := viper.GetString("notify.lark.token")
	secret := "test"
	dingTalk := channel.NewLark(access_token, secret)

	err := dingTalk.Send(context.Background(), "Title", "*Message*")
	fmt.Println(err)
	assert.Error(t, err)
}

func TestPushdeerSend(t *testing.T) {
	requireNotifyIntegrationTest(t, "notify.pushdeer.pushkey")
	pushkey := viper.GetString("notify.pushdeer.pushkey")
	dingTalk := channel.NewPushdeer(pushkey, "")

	err := dingTalk.Send(context.Background(), "Test Title", "*Test Message*")
	fmt.Println(err)
	assert.Nil(t, err)
}

func TestPushdeerSendError(t *testing.T) {
	requireNotifyIntegrationTest(t)
	pushkey := "test"
	dingTalk := channel.NewPushdeer(pushkey, "")

	err := dingTalk.Send(context.Background(), "Test Title", "*Test Message*")
	fmt.Println(err)
	assert.Error(t, err)
}

func TestTelegramSend(t *testing.T) {
	requireNotifyIntegrationTest(t, "notify.telegram.bot_api_key", "notify.telegram.chat_id")
	secret := viper.GetString("notify.telegram.bot_api_key")
	chatID := viper.GetString("notify.telegram.chat_id")
	httpProxy := viper.GetString("notify.telegram.http_proxy")
	dingTalk := channel.NewTelegram(secret, chatID, httpProxy)

	err := dingTalk.Send(context.Background(), "Test Title", "*Test Message*")
	fmt.Println(err)
	assert.Nil(t, err)
}

func TestTelegramSendError(t *testing.T) {
	requireNotifyIntegrationTest(t, "notify.telegram.chat_id")
	secret := "test"
	chatID := viper.GetString("notify.telegram.chat_id")
	dingTalk := channel.NewTelegram(secret, chatID, "")

	err := dingTalk.Send(context.Background(), "Test Title", "*Test Message*")
	fmt.Println(err)
	assert.Error(t, err)
}
