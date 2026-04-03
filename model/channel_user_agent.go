package model

import (
	"errors"
	"strings"
)

const (
	ChannelUserAgentModeDefault     = "default"
	ChannelUserAgentModePreset      = "preset"
	ChannelUserAgentModePassthrough = "passthrough"
)

var channelUserAgentPresetValues = map[string]string{
	"go-http-client":  "Go-http-client/1.1",
	"python-requests": "python-requests/2.32.3",
	"openai-python":   "OpenAI/Python 1.68.2",
	"openai-node":     "OpenAI/NodeJS 4.77.3",
	"curl":            "curl/8.7.1",
	"chrome-windows":  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
	"channel-test":    "czloapi-channel-test/1.0",
}

// NormalizeUserAgentConfig standardizes the channel User-Agent mode and validates preset selections.
func (c *Channel) NormalizeUserAgentConfig() error {
	mode := normalizeChannelUserAgentMode(c.UserAgentMode)
	c.UserAgentMode = mode

	switch mode {
	case ChannelUserAgentModeDefault, ChannelUserAgentModePassthrough:
		c.UserAgentPreset = ""
		return nil
	case ChannelUserAgentModePreset:
		preset := strings.ToLower(strings.TrimSpace(c.UserAgentPreset))
		if _, ok := channelUserAgentPresetValues[preset]; !ok {
			return errors.New("请选择有效的 User-Agent 预设")
		}
		c.UserAgentPreset = preset
		return nil
	default:
		return errors.New("User-Agent 模式无效")
	}
}

// ResolveConfiguredUserAgent returns the channel-specific User-Agent override when one should be applied.
func (c *Channel) ResolveConfiguredUserAgent(incomingUserAgent string) (string, bool) {
	switch normalizeChannelUserAgentMode(c.UserAgentMode) {
	case ChannelUserAgentModePreset:
		preset := strings.ToLower(strings.TrimSpace(c.UserAgentPreset))
		value, ok := channelUserAgentPresetValues[preset]
		if !ok || value == "" {
			return "", false
		}
		return value, true
	case ChannelUserAgentModePassthrough:
		userAgent := strings.TrimSpace(incomingUserAgent)
		if userAgent == "" {
			return "", false
		}
		return userAgent, true
	default:
		return "", false
	}
}

// normalizeChannelUserAgentMode folds empty or unknown values back to the safe default mode.
func normalizeChannelUserAgentMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "", ChannelUserAgentModeDefault:
		return ChannelUserAgentModeDefault
	case ChannelUserAgentModePreset:
		return ChannelUserAgentModePreset
	case ChannelUserAgentModePassthrough:
		return ChannelUserAgentModePassthrough
	default:
		return ChannelUserAgentModeDefault
	}
}
