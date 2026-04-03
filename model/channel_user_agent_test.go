package model

import "testing"

func TestNormalizeUserAgentConfigDefaults(t *testing.T) {
	channel := &Channel{}

	if err := channel.NormalizeUserAgentConfig(); err != nil {
		t.Fatalf("NormalizeUserAgentConfig returned error: %v", err)
	}

	if channel.UserAgentMode != ChannelUserAgentModeDefault {
		t.Fatalf("expected default mode, got %q", channel.UserAgentMode)
	}
	if channel.UserAgentPreset != "" {
		t.Fatalf("expected empty preset, got %q", channel.UserAgentPreset)
	}
}

func TestNormalizeUserAgentConfigRejectsInvalidPreset(t *testing.T) {
	channel := &Channel{
		UserAgentMode:   ChannelUserAgentModePreset,
		UserAgentPreset: "unknown-preset",
	}

	if err := channel.NormalizeUserAgentConfig(); err == nil {
		t.Fatal("expected invalid preset error")
	}
}

func TestResolveConfiguredUserAgent(t *testing.T) {
	presetChannel := &Channel{
		UserAgentMode:   ChannelUserAgentModePreset,
		UserAgentPreset: "curl",
	}
	if value, ok := presetChannel.ResolveConfiguredUserAgent(""); !ok || value != "curl/8.7.1" {
		t.Fatalf("expected curl preset, got %q ok=%v", value, ok)
	}

	passthroughChannel := &Channel{UserAgentMode: ChannelUserAgentModePassthrough}
	if value, ok := passthroughChannel.ResolveConfiguredUserAgent("client-agent"); !ok || value != "client-agent" {
		t.Fatalf("expected passthrough user agent, got %q ok=%v", value, ok)
	}
	if value, ok := passthroughChannel.ResolveConfiguredUserAgent(""); ok || value != "" {
		t.Fatalf("expected no passthrough value, got %q ok=%v", value, ok)
	}
}
