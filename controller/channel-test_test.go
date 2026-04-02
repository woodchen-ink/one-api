package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"czloapi/common/config"
	"czloapi/common/logger"
	commonTest "czloapi/common/test"
	"czloapi/model"
	"czloapi/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	logger.SetupLogger()
}

func TestShouldPreferResponsesChannelTest(t *testing.T) {
	testCases := []struct {
		name     string
		model    string
		expected bool
	}{
		{
			name:     "gpt5 uses responses first",
			model:    "gpt-5.4-mini",
			expected: true,
		},
		{
			name:     "o series uses responses first",
			model:    "o3-pro",
			expected: true,
		},
		{
			name:     "special responses model uses responses first",
			model:    "codex-mini-latest",
			expected: true,
		},
		{
			name:     "chat model keeps chat first",
			model:    "gpt-4o",
			expected: false,
		},
		{
			name:     "embedding model keeps embeddings",
			model:    "text-embedding-3-small",
			expected: false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, shouldPreferResponsesChannelTest(testCase.model))
		})
	}
}

func TestChannelPrefersResponsesForGpt5Models(t *testing.T) {
	baseURL, server, teardown := setupChannelTestServer()
	defer teardown()

	var responsesCount int
	var chatCount int
	var responseModel string

	server.RegisterHandler("/v1/responses", func(w http.ResponseWriter, r *http.Request) {
		responsesCount++
		var request types.OpenAIResponsesRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		responseModel = request.Model

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintln(w, `{"id":"resp_1","object":"response","model":"gpt-5.4-mini","status":"completed","output":[{"type":"message","id":"msg_1","status":"completed","role":"assistant","content":[{"type":"output_text","text":"hi"}]}],"usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}`)
	})
	server.RegisterHandler("/v1/chat/completions", func(w http.ResponseWriter, r *http.Request) {
		chatCount++
		http.Error(w, "chat should not be called", http.StatusInternalServerError)
	})

	channel := commonTest.GetChannel(config.ChannelTypeOpenAI, baseURL, "", "", "")
	openAIError, err := testChannel(&channel, "gpt-5.4-mini")
	require.NoError(t, err)
	require.Nil(t, openAIError)
	assert.Equal(t, 1, responsesCount)
	assert.Equal(t, 0, chatCount)
	assert.Equal(t, "gpt-5.4-mini", responseModel)
}

func TestChannelFallsBackToChatWhenResponsesFails(t *testing.T) {
	baseURL, server, teardown := setupChannelTestServer()
	defer teardown()

	var responsesCount int
	var chatCount int
	var responseModel string
	var chatModel string

	server.RegisterHandler("/v1/responses", func(w http.ResponseWriter, r *http.Request) {
		responsesCount++
		var request types.OpenAIResponsesRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		responseModel = request.Model

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprintln(w, `{"error":{"message":"responses unavailable","type":"invalid_request_error","code":"unsupported_api"}}`)
	})
	server.RegisterHandler("/v1/chat/completions", func(w http.ResponseWriter, r *http.Request) {
		chatCount++
		var request types.ChatCompletionRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		chatModel = request.Model

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintln(w, `{"id":"chatcmpl_1","object":"chat.completion","created":123,"model":"gpt-5.4-mini","choices":[{"index":0,"message":{"role":"assistant","content":"hi"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}`)
	})

	channel := commonTest.GetChannel(config.ChannelTypeOpenAI, baseURL, "", "", "")
	openAIError, err := testChannel(&channel, "gpt-5.4-mini")
	require.NoError(t, err)
	require.Nil(t, openAIError)
	assert.Equal(t, 1, responsesCount)
	assert.Equal(t, 1, chatCount)
	assert.Equal(t, "gpt-5.4-mini", responseModel)
	assert.Equal(t, "gpt-5.4-mini", chatModel)
}

func TestChannelUsesMappedModelForResponsesPreference(t *testing.T) {
	baseURL, server, teardown := setupChannelTestServer()
	defer teardown()

	var responsesCount int
	var chatCount int
	var responseModel string

	server.RegisterHandler("/v1/responses", func(w http.ResponseWriter, r *http.Request) {
		responsesCount++
		var request types.OpenAIResponsesRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		responseModel = request.Model

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintln(w, `{"id":"resp_2","object":"response","model":"gpt-5.4-mini","status":"completed","output":[{"type":"message","id":"msg_2","status":"completed","role":"assistant","content":[{"type":"output_text","text":"hi"}]}],"usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}`)
	})
	server.RegisterHandler("/v1/chat/completions", func(w http.ResponseWriter, r *http.Request) {
		chatCount++
		http.Error(w, "chat should not be called", http.StatusInternalServerError)
	})

	channel := newCustomChannel(baseURL, `{"alias-model":"gpt-5.4-mini"}`)
	openAIError, err := testChannel(&channel, "alias-model")
	require.NoError(t, err)
	require.Nil(t, openAIError)
	assert.Equal(t, 1, responsesCount)
	assert.Equal(t, 0, chatCount)
	assert.Equal(t, "gpt-5.4-mini", responseModel)
}

func setupChannelTestServer() (baseURL string, server *commonTest.ServerTest, teardown func()) {
	server = commonTest.NewTestServer()
	ts := server.TestServer(func(w http.ResponseWriter, r *http.Request) bool {
		return commonTest.OpenAICheck(w, r)
	})
	ts.Start()
	teardown = ts.Close
	baseURL = ts.URL
	return
}

func newCustomChannel(baseURL string, modelMapping string) model.Channel {
	channel := commonTest.GetChannel(config.ChannelTypeCustom, baseURL, "", "", modelMapping)
	channel.Name = "custom-test"
	return channel
}
