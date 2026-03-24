package relay

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/logger"
	"czloapi/common/requester"
	"czloapi/common/utils"
	"czloapi/metrics"
	providersBase "czloapi/providers/base"
	"czloapi/relay/relay_util"
	"czloapi/types"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type RelayModeResponsesWS struct {
	relayBase
	userConn       *websocket.Conn
	messageHandler requester.MessageHandler
	providerConn   *websocket.Conn
	quota          *relay_util.Quota
	usage          *types.UsageEvent
}

var responsesWSUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func ResponsesWS(c *gin.Context) {
	userConn, err := responsesWSUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Println("upgrade failed", err)
		common.AbortWithMessage(c, http.StatusInternalServerError, "upgrade_failed")
		return
	}

	relay := &RelayModeResponsesWS{
		relayBase: relayBase{
			c: c,
		},
		userConn: userConn,
	}

	// 等待第一条客户端消息来获取 model
	modelName, firstMessage, err := relay.readModelFromFirstMessage()
	if err != nil {
		relay.abortWithMessage("failed to read model from first message: " + err.Error())
		return
	}

	relay.setOriginalModel(modelName)

	if !relay.getProvider() {
		return
	}

	relay.quota = relay_util.NewQuota(relay.getContext(), relay.getModelName(), 0)
	relay.usage = &types.UsageEvent{}

	// 将第一条消息发送到上游
	if err := relay.providerConn.WriteMessage(websocket.TextMessage, firstMessage); err != nil {
		relay.abortWithMessage("failed to send first message to provider: " + err.Error())
		return
	}

	wsProxy := requester.NewWSProxy(relay.userConn, relay.providerConn, time.Minute*2, relay.messageHandler, relay.usageHandler)

	wsProxy.Start()

	go func() {
		var closedBy string
		select {
		case <-wsProxy.UserClosed():
			closedBy = "user"
		case <-wsProxy.SupplierClosed():
			closedBy = "provider"
		}

		logger.LogInfo(relay.c.Request.Context(), fmt.Sprintf("responses ws 连接由%s关闭", closedBy))
		wsProxy.Close()
		relay.quota.Consume(relay.c, relay.usage.ToChatUsage(), false)
	}()

	wsProxy.Wait()
}

func (r *RelayModeResponsesWS) readModelFromFirstMessage() (string, []byte, error) {
	r.userConn.SetReadDeadline(time.Now().Add(30 * time.Second))
	defer r.userConn.SetReadDeadline(time.Time{})

	messageType, message, err := r.userConn.ReadMessage()
	if err != nil {
		return "", nil, fmt.Errorf("read message: %w", err)
	}

	if messageType != websocket.TextMessage {
		return "", nil, fmt.Errorf("expected text message, got %d", messageType)
	}

	// 解析 response.create 事件获取 model
	var event struct {
		Type  string `json:"type"`
		Model string `json:"model"`
	}
	if err := json.Unmarshal(message, &event); err != nil {
		return "", nil, fmt.Errorf("parse message: %w", err)
	}

	if event.Model == "" {
		return "", nil, fmt.Errorf("model not found in message")
	}

	return event.Model, message, nil
}

func (r *RelayModeResponsesWS) abortWithMessage(message string) {
	eventErr := types.NewErrorEvent("", "system_error", "system_error", message)
	r.userConn.WriteMessage(websocket.TextMessage, []byte(eventErr.Error()))
	r.userConn.Close()
}

func (r *RelayModeResponsesWS) getProvider() bool {
	retryTimes := config.RetryTimes
	if retryTimes == 0 {
		retryTimes = 1
	}

	for i := retryTimes; i > 0; i-- {
		if err := r.setProvider(r.getOriginalModel()); err != nil {
			r.abortWithMessage(err.Error())
			return false
		}

		channel := r.provider.GetChannel()

		responsesWSProvider, ok := r.provider.(providersBase.ResponsesWSInterface)
		if !ok {
			r.skipChannelIds(channel.Id)
			logger.LogError(r.c.Request.Context(), fmt.Sprintf("channel #%d(%s) not implemented ResponsesWS, skipping (remain times %d)", channel.Id, channel.Name, i))
			continue
		}

		// 检查渠道是否启用了 ResponsesWS
		if !channel.ResponsesWS {
			r.skipChannelIds(channel.Id)
			logger.LogError(r.c.Request.Context(), fmt.Sprintf("channel #%d(%s) ResponsesWS not enabled, skipping (remain times %d)", channel.Id, channel.Name, i))
			continue
		}

		providerConn, messageHandler, apiErr := responsesWSProvider.CreateResponsesWS()
		if apiErr != nil {
			r.skipChannelIds(channel.Id)
			logger.LogError(r.c.Request.Context(), fmt.Sprintf("using channel #%d(%s) Error: %s to retry (remain times %d)", channel.Id, channel.Name, apiErr.Error(), i))
			metrics.RecordProvider(r.c, apiErr.StatusCode)
			continue
		}

		r.messageHandler = messageHandler
		r.providerConn = providerConn

		metrics.RecordProvider(r.c, 200)
		return true
	}

	r.abortWithMessage("get provider failed")
	return false
}

func (r *RelayModeResponsesWS) skipChannelIds(channelId int) {
	skipChannelIds, ok := utils.GetGinValue[[]int](r.c, "skip_channel_ids")
	if !ok {
		skipChannelIds = make([]int, 0)
	}

	skipChannelIds = append(skipChannelIds, channelId)
	r.c.Set("skip_channel_ids", skipChannelIds)
}

func (r *RelayModeResponsesWS) usageHandler(usage *types.UsageEvent) error {
	err := r.quota.UpdateUserRealtimeQuota(r.usage, usage)
	if err != nil {
		return types.NewErrorEvent("", "system_error", "system_error", err.Error())
	}

	return nil
}
