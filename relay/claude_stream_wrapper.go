package relay

import (
	"czloapi/common"
	"czloapi/common/requester"
	"czloapi/common/utils"
	"czloapi/providers/claude"
	"czloapi/types"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/bytedance/gopkg/util/gopool"
)

type openAIToClaudeStreamWrapper struct {
	source requester.StreamReaderInterface[string]
	usage  *types.Usage
	model  string

	dataChan chan string
	errChan  chan error

	trustEstimatedInputTokens bool

	messageStarted bool
	messageID      string
	created        any

	nextBlockIndex     int
	thinkingBlockIndex int
	thinkingBlockOpen  bool
	textBlockIndex     int
	textBlockOpen      bool

	toolBlockIndexByStreamIndex map[int]int
	toolBlockOrder              []int
	toolBlockOpen               map[int]bool

	lastUsage *types.Usage
	finished  bool
	hasOutput bool
}

func newOpenAIToClaudeStreamWrapper(source requester.StreamReaderInterface[string], usage *types.Usage, model string, trustEstimatedInputTokens bool) requester.StreamReaderInterface[string] {
	return &openAIToClaudeStreamWrapper{
		source:                      source,
		usage:                       usage,
		model:                       model,
		dataChan:                    make(chan string, 16),
		errChan:                     make(chan error, 2),
		trustEstimatedInputTokens:   trustEstimatedInputTokens,
		thinkingBlockIndex:          -1,
		textBlockIndex:              -1,
		toolBlockIndexByStreamIndex: make(map[int]int),
		toolBlockOrder:              make([]int, 0),
		toolBlockOpen:               make(map[int]bool),
	}
}

func (w *openAIToClaudeStreamWrapper) Recv() (<-chan string, <-chan error) {
	gopool.Go(w.run)
	return w.dataChan, w.errChan
}

func (w *openAIToClaudeStreamWrapper) Close() {
	w.source.Close()
}

func (w *openAIToClaudeStreamWrapper) run() {
	defer close(w.dataChan)
	defer close(w.errChan)

	sourceData, sourceErr := w.source.Recv()
	for sourceData != nil || sourceErr != nil {
		select {
		case raw, ok := <-sourceData:
			if !ok {
				sourceData = nil
				continue
			}
			w.handleChunk(raw)
		case err, ok := <-sourceErr:
			if !ok {
				sourceErr = nil
				continue
			}
			if errors.Is(err, io.EOF) {
				w.finish("")
				w.errChan <- io.EOF
				return
			}

			if !w.hasOutput {
				w.errChan <- normalizeClaudeStreamError(err)
				return
			}

			w.emitStreamError(err)
			w.errChan <- io.EOF
			return
		}
	}

	w.finish("")
	w.errChan <- io.EOF
}

func (w *openAIToClaudeStreamWrapper) handleChunk(raw string) {
	if strings.TrimSpace(raw) == "" {
		return
	}

	var chunk types.ChatCompletionStreamResponse
	if err := json.Unmarshal([]byte(raw), &chunk); err != nil {
		if !w.hasOutput {
			w.errChan <- common.ErrorToOpenAIError(err)
			w.finished = true
			return
		}
		w.emitStreamError(common.ErrorToOpenAIError(err))
		w.finished = true
		return
	}

	if chunk.ID != "" {
		w.messageID = chunk.ID
	}
	if chunk.Model != "" {
		w.model = chunk.Model
	}
	if chunk.Created != nil {
		w.created = chunk.Created
	}
	if chunk.Usage != nil {
		w.lastUsage = cloneUsage(chunk.Usage)
	}

	for _, choice := range chunk.Choices {
		if choice.Usage != nil {
			w.lastUsage = cloneUsage(choice.Usage)
		}

		delta := choice.Delta
		reasoningDelta := delta.ReasoningContent
		if reasoningDelta == "" {
			reasoningDelta = delta.Reasoning
		}

		if delta.Role != "" || delta.Content != "" || reasoningDelta != "" || len(delta.ToolCalls) > 0 {
			w.ensureMessageStart()
		}

		if reasoningDelta != "" {
			w.closeTextBlock()
			w.ensureThinkingBlock()
			w.emitEvent("content_block_delta", map[string]any{
				"type":  "content_block_delta",
				"index": w.thinkingBlockIndex,
				"delta": map[string]any{
					"type":     claude.ContentStreamTypeThinking,
					"thinking": reasoningDelta,
				},
			})
		}

		if delta.Content != "" {
			w.closeThinkingBlock()
			w.ensureTextBlock()
			w.emitEvent("content_block_delta", map[string]any{
				"type":  "content_block_delta",
				"index": w.textBlockIndex,
				"delta": map[string]any{
					"type": "text_delta",
					"text": delta.Content,
				},
			})
		}

		if len(delta.ToolCalls) > 0 {
			w.closeThinkingBlock()
			w.closeTextBlock()
			for _, toolCall := range delta.ToolCalls {
				w.handleToolDelta(toolCall)
			}
		}

		if finishReason := normalizeFinishReason(choice.FinishReason); finishReason != "" {
			w.finish(finishReason)
		}
	}
}

func (w *openAIToClaudeStreamWrapper) ensureMessageStart() {
	if w.messageStarted {
		return
	}
	w.messageStarted = true

	if w.messageID == "" {
		w.messageID = fmt.Sprintf("msg_%s", utils.GetUUID())
	}
	if w.created == nil {
		w.created = utils.GetTimestamp()
	}

	usage := claude.OpenAIUsageToClaudeUsage(w.messageStartUsageSource())
	startUsage := claude.Usage{
		CacheCreationInputTokens: usage.CacheCreationInputTokens,
		CacheReadInputTokens:     usage.CacheReadInputTokens,
		CacheCreation:            usage.CacheCreation,
	}
	if startSource := w.messageStartUsageSource(); startSource != nil {
		startUsage.InputTokens = usage.InputTokens
	}

	w.emitEvent("message_start", map[string]any{
		"type": "message_start",
		"message": map[string]any{
			"id":    w.messageID,
			"type":  "message",
			"role":  types.ChatMessageRoleAssistant,
			"model": w.model,
			"usage": startUsage,
		},
	})
}

func (w *openAIToClaudeStreamWrapper) ensureThinkingBlock() {
	if w.thinkingBlockOpen {
		return
	}
	w.thinkingBlockOpen = true
	if w.thinkingBlockIndex < 0 {
		w.thinkingBlockIndex = w.nextIndex()
	}

	w.emitEvent("content_block_start", map[string]any{
		"type":  "content_block_start",
		"index": w.thinkingBlockIndex,
		"content_block": map[string]any{
			"type":     claude.ContentTypeThinking,
			"thinking": "",
		},
	})
}

func (w *openAIToClaudeStreamWrapper) ensureTextBlock() {
	if w.textBlockOpen {
		return
	}
	w.textBlockOpen = true
	if w.textBlockIndex < 0 {
		w.textBlockIndex = w.nextIndex()
	}

	w.emitEvent("content_block_start", map[string]any{
		"type":  "content_block_start",
		"index": w.textBlockIndex,
		"content_block": map[string]any{
			"type": claude.ContentTypeText,
			"text": "",
		},
	})
}

func (w *openAIToClaudeStreamWrapper) handleToolDelta(toolCall *types.ChatCompletionToolCalls) {
	if toolCall == nil || toolCall.Function == nil {
		return
	}

	streamIndex := toolCall.Index
	blockIndex, exists := w.toolBlockIndexByStreamIndex[streamIndex]
	if !exists {
		blockIndex = w.nextIndex()
		w.toolBlockIndexByStreamIndex[streamIndex] = blockIndex
		w.toolBlockOrder = append(w.toolBlockOrder, streamIndex)
	}

	if !w.toolBlockOpen[streamIndex] {
		w.toolBlockOpen[streamIndex] = true
		toolID := toolCall.Id
		if toolID == "" {
			toolID = fmt.Sprintf("toolu_%s", utils.GetUUID())
		}
		w.emitEvent("content_block_start", map[string]any{
			"type":  "content_block_start",
			"index": blockIndex,
			"content_block": map[string]any{
				"type":  claude.ContentTypeToolUes,
				"id":    toolID,
				"name":  toolCall.Function.Name,
				"input": map[string]any{},
			},
		})
	}

	if toolCall.Function.Arguments != "" {
		w.emitEvent("content_block_delta", map[string]any{
			"type":  "content_block_delta",
			"index": blockIndex,
			"delta": map[string]any{
				"type":         claude.ContentStreamTypeInputJsonDelta,
				"partial_json": toolCall.Function.Arguments,
			},
		})
	}
}

func (w *openAIToClaudeStreamWrapper) closeTextBlock() {
	if !w.textBlockOpen {
		return
	}
	w.textBlockOpen = false
	w.emitEvent("content_block_stop", map[string]any{
		"type":  "content_block_stop",
		"index": w.textBlockIndex,
	})
}

func (w *openAIToClaudeStreamWrapper) closeThinkingBlock() {
	if !w.thinkingBlockOpen {
		return
	}
	w.thinkingBlockOpen = false
	w.emitEvent("content_block_stop", map[string]any{
		"type":  "content_block_stop",
		"index": w.thinkingBlockIndex,
	})
}

func (w *openAIToClaudeStreamWrapper) closeToolBlocks() {
	for _, streamIndex := range w.toolBlockOrder {
		if !w.toolBlockOpen[streamIndex] {
			continue
		}
		w.toolBlockOpen[streamIndex] = false
		w.emitEvent("content_block_stop", map[string]any{
			"type":  "content_block_stop",
			"index": w.toolBlockIndexByStreamIndex[streamIndex],
		})
	}
}

func (w *openAIToClaudeStreamWrapper) finish(finishReason string) {
	if w.finished {
		return
	}
	w.finished = true

	w.ensureMessageStart()
	w.closeThinkingBlock()
	w.closeTextBlock()
	w.closeToolBlocks()

	stopReason := claude.OpenAIStopReasonToClaude(finishReason)
	if stopReason == "" {
		if len(w.toolBlockOrder) > 0 {
			stopReason = claude.FinishReasonToolUse
		} else {
			stopReason = claude.FinishReasonEndTurn
		}
	}

	usage := claude.OpenAIUsageToClaudeUsage(w.currentUsage())
	w.emitEvent("message_delta", map[string]any{
		"type": "message_delta",
		"delta": map[string]any{
			"stop_reason":   stopReason,
			"stop_sequence": nil,
		},
		"usage": map[string]any{
			"output_tokens": usage.OutputTokens,
		},
	})
	w.emitEvent("message_stop", map[string]any{
		"type": "message_stop",
	})
}

func (w *openAIToClaudeStreamWrapper) currentUsage() *types.Usage {
	if w.lastUsage != nil {
		return w.lastUsage
	}
	return w.usage
}

func (w *openAIToClaudeStreamWrapper) messageStartUsageSource() *types.Usage {
	if w.lastUsage != nil {
		return w.lastUsage
	}
	if w.trustEstimatedInputTokens {
		return w.usage
	}
	return nil
}

func (w *openAIToClaudeStreamWrapper) emitStreamError(err error) {
	if err == nil {
		return
	}

	var openAIErr *types.OpenAIErrorWithStatusCode
	switch value := err.(type) {
	case *types.OpenAIErrorWithStatusCode:
		openAIErr = value
	case *types.OpenAIError:
		openAIErr = &types.OpenAIErrorWithStatusCode{
			OpenAIError: *value,
		}
	default:
		openAIErr = common.ErrorWrapper(err, "stream_error", 900)
	}

	claudeErr := claude.OpenaiErrToClaudeErr(openAIErr)
	if claudeErr == nil {
		return
	}

	payload, marshalErr := json.Marshal(claudeErr.ClaudeError)
	if marshalErr != nil {
		return
	}

	w.dataChan <- "event: error\ndata: " + string(payload) + "\n\n"
}

func (w *openAIToClaudeStreamWrapper) emitEvent(name string, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		return
	}
	w.hasOutput = true
	w.dataChan <- fmt.Sprintf("event: %s\ndata: %s\n\n", name, string(body))
}

func (w *openAIToClaudeStreamWrapper) nextIndex() int {
	index := w.nextBlockIndex
	w.nextBlockIndex++
	return index
}

func normalizeFinishReason(reason any) string {
	switch value := reason.(type) {
	case string:
		return value
	case *string:
		if value != nil {
			return *value
		}
		return ""
	default:
		return ""
	}
}

func cloneUsage(usage *types.Usage) *types.Usage {
	if usage == nil {
		return nil
	}

	cloned := *usage
	return &cloned
}

func normalizeClaudeStreamError(err error) error {
	switch value := err.(type) {
	case *types.OpenAIErrorWithStatusCode:
		return value
	case *types.OpenAIError:
		return &types.OpenAIErrorWithStatusCode{
			OpenAIError: *value,
		}
	default:
		return common.ErrorWrapper(err, "stream_error", 900)
	}
}
