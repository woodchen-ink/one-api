package relay

import (
	"testing"

	"czloapi/common/config"
	"czloapi/model"

	"github.com/stretchr/testify/assert"
)

func TestPickResourceChannelPrefersHigherPriority(t *testing.T) {
	original := model.ChannelGroup
	defer func() {
		model.ChannelGroup = original
	}()

	model.ChannelGroup = model.ChannelsChooser{
		Channels: map[int]*model.ChannelChoice{
			1: {
				Channel: &model.Channel{
					Id:       1,
					Type:     config.ChannelTypeOpenAI,
					Group:    "default",
					Priority: int64Ptr(1),
				},
			},
			2: {
				Channel: &model.Channel{
					Id:       2,
					Type:     config.ChannelTypeOpenAI,
					Group:    "default",
					Priority: int64Ptr(10),
				},
			},
		},
	}

	channel, err := model.PickResourceChannel("default", config.ChannelTypeOpenAI)
	assert.NoError(t, err)
	if assert.NotNil(t, channel) {
		assert.Equal(t, 2, channel.Id)
	}
}

func int64Ptr(value int64) *int64 {
	return &value
}
