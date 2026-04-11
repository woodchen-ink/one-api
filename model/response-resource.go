package model

import (
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"czloapi/common/config"
	"czloapi/common/redis"
)

const (
	responseResourceBindingCacheKey     = "response_resource_binding:%s"
	conversationResourceBindingCacheKey = "conversation_resource_binding:%s"
	responseResourceBindingTTL          = 30 * 24 * time.Hour
)

type responseResourceBinding struct {
	ChannelID int
	ExpireAt  time.Time
}

var responseResourceBindings sync.Map

func init() {
	go func() {
		ticker := time.NewTicker(time.Hour)
		for range ticker.C {
			cleanupResponseResourceBindings()
		}
	}()
}

// StoreResponseResourceBinding caches the channel used to create a stored
// response so subsequent resource requests can be routed back to the same
// upstream account.
func StoreResponseResourceBinding(responseID string, channelID int) {
	storeResourceBinding(&responseResourceBindings, responseResourceBindingCacheKey, responseID, channelID)
}

// StoreConversationResourceBinding caches the channel used for a stored
// conversation resource so conversation follow-up requests can be routed back
// to the same upstream account.
func StoreConversationResourceBinding(conversationID string, channelID int) {
	storeResourceBinding(&responseResourceBindings, conversationResourceBindingCacheKey, conversationID, channelID)
}

func storeResourceBinding(cache *sync.Map, keyPattern string, resourceID string, channelID int) {
	if resourceID == "" || channelID <= 0 {
		return
	}

	binding := responseResourceBinding{
		ChannelID: channelID,
		ExpireAt:  time.Now().Add(responseResourceBindingTTL),
	}
	cache.Store(resourceID, binding)

	if config.RedisEnabled {
		_ = redis.RedisSet(
			fmt.Sprintf(keyPattern, resourceID),
			strconv.Itoa(channelID),
			responseResourceBindingTTL,
		)
	}
}

// GetConversationResourceBinding resolves the channel previously used for a
// stored conversation resource.
func GetConversationResourceBinding(conversationID string) (int, bool) {
	return getResourceBinding(&responseResourceBindings, conversationResourceBindingCacheKey, conversationID)
}

// GetResponseResourceBinding resolves the channel previously used for a stored
// response resource.
func GetResponseResourceBinding(responseID string) (int, bool) {
	return getResourceBinding(&responseResourceBindings, responseResourceBindingCacheKey, responseID)
}

func getResourceBinding(cache *sync.Map, keyPattern string, resourceID string) (int, bool) {
	if resourceID == "" {
		return 0, false
	}

	if value, ok := cache.Load(resourceID); ok {
		if binding, ok := value.(responseResourceBinding); ok {
			if time.Now().Before(binding.ExpireAt) {
				return binding.ChannelID, true
			}
		}
		cache.Delete(resourceID)
	}

	if !config.RedisEnabled {
		return 0, false
	}

	channelIDStr, err := redis.RedisGet(fmt.Sprintf(keyPattern, resourceID))
	if err != nil {
		return 0, false
	}

	channelID, err := strconv.Atoi(channelIDStr)
	if err != nil || channelID <= 0 {
		return 0, false
	}

	cache.Store(resourceID, responseResourceBinding{
		ChannelID: channelID,
		ExpireAt:  time.Now().Add(responseResourceBindingTTL),
	})

	return channelID, true
}

// PickResourceChannel chooses a resource-host channel for endpoints that do not
// carry a model, such as conversations. It limits selection to OpenAI-compatible
// channels that support Responses-style resources.
func PickResourceChannel(group string, channelTypes ...int) (*Channel, error) {
	if strings.TrimSpace(group) == "" {
		return nil, fmt.Errorf("当前分组为空，无法为资源接口选择渠道")
	}

	allowedTypes := make(map[int]bool, len(channelTypes))
	for _, channelType := range channelTypes {
		allowedTypes[channelType] = true
	}

	ChannelGroup.RLock()
	defer ChannelGroup.RUnlock()

	type candidate struct {
		channel *Channel
	}

	candidates := make([]candidate, 0)
	for _, choice := range ChannelGroup.Channels {
		if choice == nil || choice.Disable || choice.Channel == nil {
			continue
		}

		channel := choice.Channel
		if !allowedTypes[channel.Type] {
			continue
		}
		if !channelGroupContains(channel.Group, group) {
			continue
		}
		candidates = append(candidates, candidate{channel: channel})
	}

	if len(candidates) == 0 {
		return nil, fmt.Errorf("当前分组 %s 下无可用的资源渠道", group)
	}

	best := candidates[0].channel
	for _, item := range candidates[1:] {
		channel := item.channel
		if channel.GetPriority() > best.GetPriority() {
			best = channel
			continue
		}
		if channel.GetPriority() == best.GetPriority() && channel.Id > best.Id {
			best = channel
		}
	}

	return best, nil
}

func channelGroupContains(rawGroups string, target string) bool {
	for _, group := range strings.Split(rawGroups, ",") {
		if strings.TrimSpace(group) == target {
			return true
		}
	}
	return false
}

func cleanupResponseResourceBindings() {
	now := time.Now()
	responseResourceBindings.Range(func(key, value interface{}) bool {
		binding, ok := value.(responseResourceBinding)
		if !ok || !now.Before(binding.ExpireAt) {
			responseResourceBindings.Delete(key)
		}
		return true
	})
}
