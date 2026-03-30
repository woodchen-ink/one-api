package claude

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"czloapi/common/config"
	"czloapi/common/requester"
	"czloapi/model"
	"czloapi/providers/base"
	"czloapi/types"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateClaudeChatRawPreservesUnknownFieldsAndHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var receivedBody string
	var receivedBeta string
	var receivedVersion string
	var receivedAuthorization string
	var receivedXAPIKey string
	var receivedXGoogAPIKey string
	var receivedAcceptEncoding string
	var receivedCookie string
	var receivedXFF string
	var receivedXRealIP string
	var receivedCFConnectingIP string
	var receivedCFRay string
	var receivedUserAgent string
	var receivedTraceparent string
	var receivedXRequestID string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		receivedBody = string(body)
		receivedBeta = r.Header.Get("Anthropic-Beta")
		receivedVersion = r.Header.Get("Anthropic-Version")
		receivedAuthorization = r.Header.Get("Authorization")
		receivedXAPIKey = r.Header.Get("X-Api-Key")
		receivedXGoogAPIKey = r.Header.Get("X-Goog-Api-Key")
		receivedAcceptEncoding = r.Header.Get("Accept-Encoding")
		receivedCookie = r.Header.Get("Cookie")
		receivedXFF = r.Header.Get("X-Forwarded-For")
		receivedXRealIP = r.Header.Get("X-Real-Ip")
		receivedCFConnectingIP = r.Header.Get("Cf-Connecting-Ip")
		receivedCFRay = r.Header.Get("Cf-Ray")
		receivedUserAgent = r.Header.Get("User-Agent")
		receivedTraceparent = r.Header.Get("Traceparent")
		receivedXRequestID = r.Header.Get("X-Request-Id")

		w.Header().Set("Content-Type", "application/json")
		_, err = w.Write([]byte(`{"id":"msg_123","type":"message","role":"assistant","content":[{"type":"text","text":"ok"}],"model":"claude-sonnet-4-6","usage":{"input_tokens":12,"output_tokens":34},"thinking_info":{"effort":"max"}}`))
		require.NoError(t, err)
	}))
	defer server.Close()

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/messages", strings.NewReader(`{"model":"alias-model","max_tokens":128,"stream":false,"messages":[{"role":"user","content":"hello"}],"output_config":{"effort":"max","display":"verbose"},"future_field":{"enabled":true}}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Request.Header.Set("Anthropic-Version", "2023-06-01")
	c.Request.Header.Set("Anthropic-Beta", "thinking-v2")
	c.Request.Header.Set("Authorization", "Bearer gateway-token")
	c.Request.Header.Set("X-API-Key", "client-claude-key")
	c.Request.Header.Set("X-Goog-Api-Key", "client-gemini-key")
	c.Request.Header.Set("Accept-Encoding", "gzip, br")
	c.Request.Header.Set("Cookie", "session=secret")
	c.Request.Header.Set("X-Forwarded-For", "1.2.3.4")
	c.Request.Header.Set("X-Real-IP", "5.6.7.8")
	c.Request.Header.Set("CF-Connecting-IP", "9.8.7.6")
	c.Request.Header.Set("CF-Ray", "ray-id")
	c.Request.Header.Set("User-Agent", "client-agent")
	c.Request.Header.Set("Traceparent", "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01")
	c.Request.Header.Set("X-Request-Id", "client-request-id")
	c.Set(config.GinRequestBodyKey, []byte(`{"model":"alias-model","max_tokens":128,"stream":false,"messages":[{"role":"user","content":"hello"}],"output_config":{"effort":"max","display":"verbose"},"future_field":{"enabled":true}}`))

	baseURL := server.URL
	proxy := ""
	provider := &ClaudeProvider{}
	provider.BaseProvider = base.BaseProvider{
		Config:    getConfig(),
		Channel:   &model.Channel{Key: "upstream-key", BaseURL: &baseURL, Proxy: &proxy},
		Requester: requester.NewHTTPRequester(proxy, RequestErrorHandle),
		Context:   c,
		Usage:     &types.Usage{},
	}

	response, errWithCode := provider.CreateClaudeChatRaw(&ClaudeRequest{
		Model:     "claude-sonnet-4-6",
		MaxTokens: 128,
		Messages: []Message{
			{Role: "user", Content: "hello"},
		},
	})
	require.Nil(t, errWithCode)
	require.NotNil(t, response)
	defer response.Body.Close()

	rawResponse, err := io.ReadAll(response.Body)
	require.NoError(t, err)

	assert.Contains(t, receivedBody, `"model":"claude-sonnet-4-6"`)
	assert.Contains(t, receivedBody, `"display":"verbose"`)
	assert.Contains(t, receivedBody, `"future_field":{"enabled":true}`)
	assert.Equal(t, "thinking-v2", receivedBeta)
	assert.Equal(t, "2023-06-01", receivedVersion)
	assert.Empty(t, receivedAuthorization)
	assert.Equal(t, "upstream-key", receivedXAPIKey)
	assert.Empty(t, receivedXGoogAPIKey)
	assert.Equal(t, "identity", receivedAcceptEncoding)
	assert.Empty(t, receivedCookie)
	assert.Empty(t, receivedXFF)
	assert.Empty(t, receivedXRealIP)
	assert.Empty(t, receivedCFConnectingIP)
	assert.Empty(t, receivedCFRay)
	assert.Empty(t, receivedUserAgent)
	assert.Empty(t, receivedTraceparent)
	assert.Empty(t, receivedXRequestID)
	assert.Contains(t, string(rawResponse), `"thinking_info":{"effort":"max"}`)
	assert.Equal(t, 12, provider.GetUsage().PromptTokens)
	assert.Equal(t, 34, provider.GetUsage().CompletionTokens)
}

func TestClaudeRelayStreamHandlerPassthroughTracksUsageWithoutRewriting(t *testing.T) {
	handler := &ClaudeRelayStreamHandler{
		Usage:  &types.Usage{},
		Prefix: `data: {"type"`,
	}

	dataChan := make(chan string, 4)
	errChan := make(chan error, 1)

	messageStart := []byte("data: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":10},\"future_field\":{\"enabled\":true}}}\n")
	handler.HandlerStream(&messageStart, dataChan, errChan)

	messageDelta := []byte("data: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":7,\"future_metric\":99}}\n")
	handler.HandlerStream(&messageDelta, dataChan, errChan)

	contentDelta := []byte("data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"hello\"},\"new_shape\":{\"x\":1}}\n")
	handler.HandlerStream(&contentDelta, dataChan, errChan)

	assert.Equal(t, string(messageStart), <-dataChan)
	assert.Equal(t, string(messageDelta), <-dataChan)
	assert.Equal(t, string(contentDelta), <-dataChan)
	assert.Equal(t, 10, handler.Usage.PromptTokens)
	assert.Equal(t, 7, handler.Usage.CompletionTokens)
	assert.Equal(t, "hello", handler.Usage.TextBuilder.String())

	select {
	case err := <-errChan:
		t.Fatalf("unexpected stream error: %v", err)
	default:
	}
}

func TestClaudeRelayStreamHandlerPassthroughKeepsErrorPayload(t *testing.T) {
	handler := &ClaudeRelayStreamHandler{
		Usage:  &types.Usage{},
		Prefix: `data: {"type"`,
	}

	dataChan := make(chan string, 2)
	errChan := make(chan error, 1)

	errorLine := []byte("data: {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\",\"message\":\"busy\"},\"future_field\":{\"enabled\":true}}\n")
	handler.HandlerStream(&errorLine, dataChan, errChan)

	assert.Equal(t, string(errorLine), <-dataChan)

	select {
	case err := <-errChan:
		t.Fatalf("unexpected stream error: %v", err)
	default:
	}
}
