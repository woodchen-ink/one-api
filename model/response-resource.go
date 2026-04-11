package model

import (
	"fmt"
	"strconv"
	"sync"
	"time"

	"czloapi/common/config"
	"czloapi/common/redis"
)

const (
	responseResourceBindingCacheKey = "response_resource_binding:%s"
	responseResourceBindingTTL      = 30 * 24 * time.Hour
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
	if responseID == "" || channelID <= 0 {
		return
	}

	binding := responseResourceBinding{
		ChannelID: channelID,
		ExpireAt:  time.Now().Add(responseResourceBindingTTL),
	}
	responseResourceBindings.Store(responseID, binding)

	if config.RedisEnabled {
		_ = redis.RedisSet(
			fmt.Sprintf(responseResourceBindingCacheKey, responseID),
			strconv.Itoa(channelID),
			responseResourceBindingTTL,
		)
	}
}

// GetResponseResourceBinding resolves the channel previously used for a stored
// response resource.
func GetResponseResourceBinding(responseID string) (int, bool) {
	if responseID == "" {
		return 0, false
	}

	if value, ok := responseResourceBindings.Load(responseID); ok {
		if binding, ok := value.(responseResourceBinding); ok {
			if time.Now().Before(binding.ExpireAt) {
				return binding.ChannelID, true
			}
		}
		responseResourceBindings.Delete(responseID)
	}

	if !config.RedisEnabled {
		return 0, false
	}

	channelIDStr, err := redis.RedisGet(fmt.Sprintf(responseResourceBindingCacheKey, responseID))
	if err != nil {
		return 0, false
	}

	channelID, err := strconv.Atoi(channelIDStr)
	if err != nil || channelID <= 0 {
		return 0, false
	}

	responseResourceBindings.Store(responseID, responseResourceBinding{
		ChannelID: channelID,
		ExpireAt:  time.Now().Add(responseResourceBindingTTL),
	})

	return channelID, true
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
