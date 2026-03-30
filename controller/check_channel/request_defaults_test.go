package check_channel

import "testing"

func TestClaudeCompatibleChecksIncludeMaxTokens(t *testing.T) {
	cases := []struct {
		name string
		got  int
	}{
		{name: "base", got: CreateCheckBaseProcess("claude-sonnet-4-6").GetRequest().MaxTokens},
		{name: "error", got: CreateCheckErrorProcess("claude-sonnet-4-6").GetRequest().MaxTokens},
		{name: "json", got: CreateCheckJsonFormatProcess("claude-sonnet-4-6").GetRequest().MaxTokens},
		{name: "tool", got: CreateCheckToolProcess("claude-sonnet-4-6").GetRequest().MaxTokens},
		{name: "img", got: (&CheckImgProcess{ModelName: "claude-sonnet-4-6", ImageUrl: "https://example.com/check.png"}).GetRequest().MaxTokens},
	}

	for _, tc := range cases {
		if tc.got <= 0 {
			t.Fatalf("%s request should set max_tokens, got %d", tc.name, tc.got)
		}
	}
}
