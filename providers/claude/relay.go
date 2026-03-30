package claude

import (
	"bytes"
	"czloapi/common"
	"czloapi/common/config"
	"czloapi/common/requester"
	"czloapi/types"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

type ClaudeRelayStreamHandler struct {
	Usage      *types.Usage
	ModelName  string
	Prefix     string
	StartUsage *Usage

	AddEvent bool
}

func (p *ClaudeProvider) CreateClaudeChat(request *ClaudeRequest) (*ClaudeResponse, *types.OpenAIErrorWithStatusCode) {
	req, errWithCode := p.getRelayChatRequest(request)
	if errWithCode != nil {
		return nil, errWithCode
	}
	defer req.Body.Close()

	claudeResponse := &ClaudeResponse{}
	// 发送请求
	_, errWithCode = p.Requester.SendRequest(req, claudeResponse, false)
	if errWithCode != nil {
		return nil, errWithCode
	}

	usage := p.GetUsage()

	isOk := ClaudeUsageToOpenaiUsage(&claudeResponse.Usage, usage)
	if !isOk {
		usage.CompletionTokens = ClaudeOutputUsage(claudeResponse)
		usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	}

	return claudeResponse, nil
}

func (p *ClaudeProvider) CreateClaudeChatRaw(request *ClaudeRequest) (*http.Response, *types.OpenAIErrorWithStatusCode) {
	req, errWithCode := p.getRelayChatRequest(request)
	if errWithCode != nil {
		return nil, errWithCode
	}
	defer req.Body.Close()

	claudeResponse := &ClaudeResponse{}
	resp, errWithCode := p.Requester.SendRequest(req, claudeResponse, true)
	if errWithCode != nil {
		return nil, errWithCode
	}

	usage := p.GetUsage()
	isOk := ClaudeUsageToOpenaiUsage(&claudeResponse.Usage, usage)
	if !isOk {
		usage.CompletionTokens = ClaudeOutputUsage(claudeResponse)
		usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	}

	return resp, nil
}

func (p *ClaudeProvider) CreateClaudeChatStream(request *ClaudeRequest) (requester.StreamReaderInterface[string], *types.OpenAIErrorWithStatusCode) {
	req, errWithCode := p.getRelayChatRequest(request)
	if errWithCode != nil {
		return nil, errWithCode
	}
	defer req.Body.Close()

	chatHandler := &ClaudeRelayStreamHandler{
		Usage:     p.Usage,
		ModelName: request.Model,
		Prefix:    `data: {"type"`,
	}

	// 发送请求
	resp, errWithCode := p.Requester.SendRequestRaw(req)
	if errWithCode != nil {
		return nil, errWithCode
	}

	stream, errWithCode := requester.RequestNoTrimStream(p.Requester, resp, chatHandler.HandlerStream)
	if errWithCode != nil {
		return nil, errWithCode
	}

	return stream, nil
}

func (p *ClaudeProvider) getRelayChatRequest(request *ClaudeRequest) (*http.Request, *types.OpenAIErrorWithStatusCode) {
	url, errWithCode := p.GetSupportedAPIUri(config.RelayModeChatCompletions)
	if errWithCode != nil {
		return nil, errWithCode
	}

	fullRequestURL := p.GetFullRequestURL(url)
	if fullRequestURL == "" {
		return nil, common.ErrorWrapperLocal(nil, "invalid_claude_config", http.StatusInternalServerError)
	}

	headers := p.GetRequestHeaders()
	for key, values := range p.Context.Request.Header {
		if shouldSkipRelayIncomingHeader(key) || hasRelayHeader(headers, key) {
			continue
		}
		headers[key] = strings.Join(values, ", ")
	}
	// Avoid leaking the caller's compression preferences and keep upstream
	// responses in plain text for raw passthrough / SSE handling.
	headers["Accept-Encoding"] = "identity"
	if request.Stream {
		headers["Accept"] = "text/event-stream"
	}

	body := any(request)
	if rawBody, ok := p.GetRawBody(); ok && rawBody != nil {
		var requestMap map[string]any
		if err := json.Unmarshal(rawBody, &requestMap); err == nil {
			requestMap["model"] = request.Model
			body = requestMap
		}
	}

	req, err := p.Requester.NewRequest(http.MethodPost, fullRequestURL, p.Requester.WithBody(body), p.Requester.WithHeader(headers))
	if err != nil {
		return nil, common.ErrorWrapperLocal(err, "new_request_failed", http.StatusInternalServerError)
	}

	return req, nil
}

func hasRelayHeader(headers map[string]string, key string) bool {
	for existing := range headers {
		if strings.EqualFold(existing, key) {
			return true
		}
	}
	return false
}

func shouldSkipRelayIncomingHeader(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "authorization",
		"x-api-key",
		"x-goog-api-key",
		"host",
		"content-length",
		"connection",
		"transfer-encoding",
		"accept-encoding",
		"cookie",
		"x-forwarded-for",
		"x-real-ip",
		"forwarded",
		"cf-connecting-ip",
		"cf-ray",
		"cf-ipcountry",
		"cf-visitor",
		"true-client-ip",
		"x-cluster-client-ip",
		"x-forwarded-host",
		"x-forwarded-proto",
		"x-forwarded-port":
		return true
	default:
		return false
	}
}

func (h *ClaudeRelayStreamHandler) HandlerStream(rawLine *[]byte, dataChan chan string, errChan chan error) {
	rawStr := string(*rawLine)
	// 如果rawLine 前缀不为data:，则直接返回
	if !strings.HasPrefix(rawStr, h.Prefix) {
		dataChan <- rawStr
		return
	}

	if !h.AddEvent {
		h.updateUsageFromRelayLine(*rawLine)
		dataChan <- rawStr
		return
	}

	if h.AddEvent {
		rawStr = fmt.Sprintf("data: %s\n", rawStr)
	}

	noSpaceLine := bytes.TrimSpace(*rawLine)
	if strings.HasPrefix(string(noSpaceLine), "data: ") {
		// 去除前缀
		noSpaceLine = noSpaceLine[6:]
	}

	var claudeResponse ClaudeStreamResponse
	err := json.Unmarshal(noSpaceLine, &claudeResponse)
	if err != nil {
		errChan <- ErrorToClaudeErr(err)
		return
	}

	if claudeResponse.Error != nil {
		if h.AddEvent {
			event := "event: error\n"
			dataChan <- event
		}

		errChan <- claudeResponse.Error
		return
	}

	if h.AddEvent {
		event := fmt.Sprintf("event: %s\n", claudeResponse.Type)
		dataChan <- event
	}

	switch claudeResponse.Type {
	case "message_start":
		if claudeResponse.Message != nil {
			ClaudeUsageToOpenaiUsage(&claudeResponse.Message.Usage, h.Usage)
			h.StartUsage = &claudeResponse.Message.Usage
		}
	case "message_delta":
		if claudeResponse.Usage != nil {
			ClaudeUsageMerge(claudeResponse.Usage, h.StartUsage)
			ClaudeUsageToOpenaiUsage(claudeResponse.Usage, h.Usage)
		}
	case "content_block_delta":
		if claudeResponse.Delta != nil {
			h.Usage.TextBuilder.WriteString(claudeResponse.Delta.Text)
		}
	}

	dataChan <- rawStr

	if h.AddEvent {
		event := "\n"
		dataChan <- event
	}
}

// updateUsageFromRelayLine opportunistically extracts usage from known Claude SSE
// payloads without affecting raw passthrough when Anthropic adds new fields/types.
func (h *ClaudeRelayStreamHandler) updateUsageFromRelayLine(rawLine []byte) {
	noSpaceLine := bytes.TrimSpace(rawLine)
	if strings.HasPrefix(string(noSpaceLine), "data: ") {
		noSpaceLine = noSpaceLine[6:]
	}

	var claudeResponse ClaudeStreamResponse
	if err := json.Unmarshal(noSpaceLine, &claudeResponse); err != nil {
		return
	}

	switch claudeResponse.Type {
	case "message_start":
		if claudeResponse.Message != nil {
			ClaudeUsageToOpenaiUsage(&claudeResponse.Message.Usage, h.Usage)
			h.StartUsage = &claudeResponse.Message.Usage
		}
	case "message_delta":
		if claudeResponse.Usage != nil {
			ClaudeUsageMerge(claudeResponse.Usage, h.StartUsage)
			ClaudeUsageToOpenaiUsage(claudeResponse.Usage, h.Usage)
		}
	case "content_block_delta":
		if claudeResponse.Delta != nil {
			h.Usage.TextBuilder.WriteString(claudeResponse.Delta.Text)
		}
	}
}
