package relay

import (
	"net/http"
	"strings"

	"czloapi/common"
	"czloapi/common/config"
	"czloapi/model"
	providersBase "czloapi/providers/base"
	"czloapi/types"

	"github.com/gin-gonic/gin"
)

type conversationResource struct {
	ID string `json:"id,omitempty"`
}

func ConversationsCreate(c *gin.Context) {
	provider, apiErr := resolveConversationProvider(c, "")
	if apiErr != nil {
		relayResponseWithOpenAIErr(c, apiErr)
		return
	}

	url, apiErr := getResponsesResourceURL(provider, "/v1/conversations", "")
	if apiErr != nil {
		relayResponseWithOpenAIErr(c, apiErr)
		return
	}

	response := &conversationResource{}
	if apiErr = proxyResourceRequestAndDecode(c, provider, url, c.Request.Body, response); apiErr != nil {
		newErrWithCode := FilterOpenAIErr(c, apiErr)
		relayResponseWithOpenAIErr(c, &newErrWithCode)
		return
	}

	model.StoreConversationResourceBinding(response.ID, provider.GetChannel().Id)
	recordResourceRelayLog(c, "中继:"+c.Request.URL.Path, map[string]any{
		"conversation_id": response.ID,
		"resource_type":   "conversations",
	})
}

func ConversationsResource(c *gin.Context) {
	conversationID := strings.TrimSpace(c.Param("conversation_id"))
	if conversationID == "" {
		common.AbortWithMessage(c, http.StatusBadRequest, "conversation_id is required")
		return
	}

	provider, apiErr := resolveConversationProvider(c, conversationID)
	if apiErr != nil {
		relayResponseWithOpenAIErr(c, apiErr)
		return
	}

	url, apiErr := getResponsesResourceURL(provider, c.Request.URL.Path, "")
	if apiErr != nil {
		relayResponseWithOpenAIErr(c, apiErr)
		return
	}

	response := &conversationResource{}
	if c.Request.Method == http.MethodGet || c.Request.Method == http.MethodPost {
		if apiErr = proxyResourceRequestAndDecode(c, provider, url, c.Request.Body, response); apiErr != nil {
			newErrWithCode := FilterOpenAIErr(c, apiErr)
			relayResponseWithOpenAIErr(c, &newErrWithCode)
			return
		}
		if response.ID == "" {
			response.ID = conversationID
		}
		model.StoreConversationResourceBinding(response.ID, provider.GetChannel().Id)
		recordResourceRelayLog(c, "中继:"+c.Request.URL.Path, map[string]any{
			"conversation_id": response.ID,
			"resource_type":   "conversations",
		})
		return
	}

	if apiErr = proxyResponsesResourceRequest(c, provider, url, c.Request.Body); apiErr != nil {
		newErrWithCode := FilterOpenAIErr(c, apiErr)
		relayResponseWithOpenAIErr(c, &newErrWithCode)
		return
	}

	recordResourceRelayLog(c, "中继:"+c.Request.URL.Path, map[string]any{
		"conversation_id": conversationID,
		"resource_type":   "conversations",
	})
}

func ConversationItemsResource(c *gin.Context) {
	conversationID := strings.TrimSpace(c.Param("conversation_id"))
	if conversationID == "" {
		common.AbortWithMessage(c, http.StatusBadRequest, "conversation_id is required")
		return
	}

	provider, apiErr := resolveConversationProvider(c, conversationID)
	if apiErr != nil {
		relayResponseWithOpenAIErr(c, apiErr)
		return
	}

	url, apiErr := getResponsesResourceURL(provider, c.Request.URL.Path, "")
	if apiErr != nil {
		relayResponseWithOpenAIErr(c, apiErr)
		return
	}

	if apiErr = proxyResponsesResourceRequest(c, provider, url, c.Request.Body); apiErr != nil {
		newErrWithCode := FilterOpenAIErr(c, apiErr)
		relayResponseWithOpenAIErr(c, &newErrWithCode)
		return
	}

	metadata := map[string]any{
		"conversation_id": conversationID,
		"resource_type":   "conversation_items",
	}
	if itemID := strings.TrimSpace(c.Param("item_id")); itemID != "" {
		metadata["item_id"] = itemID
	}
	recordResourceRelayLog(c, "中继:"+c.Request.URL.Path, metadata)
}

func resolveConversationProvider(c *gin.Context, conversationID string) (providersBase.ProviderInterface, *types.OpenAIErrorWithStatusCode) {
	if conversationID != "" {
		if channelID, ok := model.GetConversationResourceBinding(conversationID); ok {
			c.Set("specific_channel_id", channelID)
			c.Set("specific_channel_id_ignore", false)
		} else {
			return nil, common.StringErrorWrapperLocal("该 conversation_id 暂无渠道映射，请先通过当前网关创建该 conversation", "one_hub_error", http.StatusBadRequest)
		}
	} else {
		channel, err := model.PickResourceChannel(
			c.GetString("key_group"),
			config.ChannelTypeOpenAI,
			config.ChannelTypeAzure,
			config.ChannelTypeAzureV1,
			config.ChannelTypeCustom,
		)
		if err != nil {
			return nil, common.StringErrorWrapperLocal(err.Error(), "channel_error", http.StatusServiceUnavailable)
		}
		c.Set("specific_channel_id", channel.Id)
		c.Set("specific_channel_id_ignore", false)
	}

	provider, _, fail := GetProvider(c, "")
	if fail != nil {
		return nil, common.StringErrorWrapperLocal(fail.Error(), "one_hub_error", http.StatusServiceUnavailable)
	}

	return provider, nil
}
