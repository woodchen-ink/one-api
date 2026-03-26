package types

import (
	"czloapi/common/config"
	"czloapi/common/utils"
	"encoding/json"
	"fmt"
)

const (
	EventTypeResponseDone   = "response.done"
	EventTypeSessionCreated = "session.created"
	EventTypeError          = "error"

	// Responses API 终端事件类型
	EventTypeResponseCompleted  = "response.completed"
	EventTypeResponseIncomplete = "response.incomplete"
	EventTypeResponseFailed     = "response.failed"
	EventTypeResponseCanceled   = "response.canceled"
	EventTypeResponseCancelled  = "response.cancelled"
)

type Event struct {
	EventId     string         `json:"event_id"`
	Type        string         `json:"type"`
	Response    *ResponseEvent `json:"response,omitempty"`
	ErrorDetail *EventError    `json:"error,omitempty"`
}

type EventError struct {
	OpenAIError
	EventId string `json:"event_id"`
}

func NewErrorEvent(eventId, errType, code, message string) *Event {
	if eventId == "" {
		eventId = fmt.Sprintf("event_%d", utils.GetRandomInt(3))
	}

	return &Event{
		EventId: eventId,
		Type:    EventTypeError,
		ErrorDetail: &EventError{
			EventId: eventId,
			OpenAIError: OpenAIError{
				Type:    errType,
				Code:    code,
				Message: message,
			},
		},
	}
}

func (e *Event) IsError() bool {
	return e.Type == EventTypeError
}

func (e *Event) Error() string {
	if e.ErrorDetail == nil {
		return ""
	}

	// 转换成JSON
	jsonBytes, err := json.Marshal(e)
	if err != nil {
		return ""
	}
	return string(jsonBytes)
}

type ResponseEvent struct {
	ID     string      `json:"id"`
	Object string      `json:"object"`
	Status string      `json:"status"`
	Usage  *UsageEvent `json:"usage,omitempty"`
}

type UsageEvent struct {
	InputTokens        int                     `json:"input_tokens"`
	OutputTokens       int                     `json:"output_tokens"`
	TotalTokens        int                     `json:"total_tokens"`
	InputTokenDetails  PromptTokensDetails     `json:"input_token_details,omitempty"`
	OutputTokenDetails CompletionTokensDetails `json:"output_token_details,omitempty"`

	ExtraTokens      map[string]int             `json:"-"`
	ExtraBilling     map[string]ExtraBilling    `json:"-"`
	extraBillingKeys map[string]map[string]bool `json:"-"`
}

func (u *UsageEvent) GetExtraTokens() map[string]int {
	if u.ExtraTokens == nil {
		u.ExtraTokens = make(map[string]int)
	}

	// 组装，已有的数据
	if u.InputTokenDetails.CachedTokens > 0 && u.ExtraTokens[config.UsageExtraCache] == 0 {
		u.ExtraTokens[config.UsageExtraCache] = u.InputTokenDetails.CachedTokens
	}

	if u.InputTokenDetails.AudioTokens > 0 && u.ExtraTokens[config.UsageExtraInputAudio] == 0 {
		u.ExtraTokens[config.UsageExtraInputAudio] = u.InputTokenDetails.AudioTokens
	}

	if u.InputTokenDetails.TextTokens > 0 && u.ExtraTokens[config.UsageExtraInputTextTokens] == 0 {
		u.ExtraTokens[config.UsageExtraInputTextTokens] = u.InputTokenDetails.TextTokens
	}

	if u.InputTokenDetails.ImageTokens > 0 && u.ExtraTokens[config.UsageExtraInputImageTokens] == 0 {
		u.ExtraTokens[config.UsageExtraInputImageTokens] = u.InputTokenDetails.ImageTokens
	}

	if u.OutputTokenDetails.AudioTokens > 0 && u.ExtraTokens[config.UsageExtraOutputAudio] == 0 {
		u.ExtraTokens[config.UsageExtraOutputAudio] = u.OutputTokenDetails.AudioTokens
	}

	if u.OutputTokenDetails.TextTokens > 0 && u.ExtraTokens[config.UsageExtraOutputTextTokens] == 0 {
		u.ExtraTokens[config.UsageExtraOutputTextTokens] = u.OutputTokenDetails.TextTokens
	}

	if u.OutputTokenDetails.ImageTokens > 0 && u.ExtraTokens[config.UsageExtraOutputImageTokens] == 0 {
		u.ExtraTokens[config.UsageExtraOutputImageTokens] = u.OutputTokenDetails.ImageTokens
	}

	if u.OutputTokenDetails.ReasoningTokens > 0 && u.ExtraTokens[config.UsageExtraReasoning] == 0 {
		u.ExtraTokens[config.UsageExtraReasoning] = u.OutputTokenDetails.ReasoningTokens
	}

	return u.ExtraTokens
}

func (u *UsageEvent) SetExtraTokens(key string, value int) {
	if u.ExtraTokens == nil {
		u.ExtraTokens = make(map[string]int)
	}

	u.ExtraTokens[key] = value
}

func (u *UsageEvent) ToChatUsage() *Usage {
	usage := &Usage{
		PromptTokens:            u.InputTokens,
		CompletionTokens:        u.OutputTokens,
		TotalTokens:             u.TotalTokens,
		PromptTokensDetails:     u.InputTokenDetails,
		CompletionTokensDetails: u.OutputTokenDetails,
	}

	if len(u.ExtraTokens) > 0 {
		usage.ExtraTokens = make(map[string]int, len(u.ExtraTokens))
		for key, value := range u.ExtraTokens {
			usage.ExtraTokens[key] = value
		}
	}

	if len(u.ExtraBilling) > 0 {
		usage.ExtraBilling = make(map[string]ExtraBilling, len(u.ExtraBilling))
		for key, value := range u.ExtraBilling {
			usage.ExtraBilling[key] = value
		}
	}

	return usage
}

func (u *UsageEvent) IncExtraBilling(key string, bType string) {
	if u.ExtraBilling == nil {
		u.ExtraBilling = make(map[string]ExtraBilling)
	}

	billing := u.ExtraBilling[key]
	billing.Type = bType
	billing.CallCount++
	u.ExtraBilling[key] = billing
}

func (u *UsageEvent) IncExtraBillingOnce(key string, bType string, dedupeID string) {
	if u.extraBillingKeys == nil {
		u.extraBillingKeys = make(map[string]map[string]bool)
	}
	if u.extraBillingKeys[key] == nil {
		u.extraBillingKeys[key] = make(map[string]bool)
	}

	if dedupeID != "" && u.extraBillingKeys[key][dedupeID] {
		return
	}
	u.extraBillingKeys[key][dedupeID] = true
	u.IncExtraBilling(key, bType)
}

func mergeUsageEventExtraTokens(dst map[string]int, src map[string]int) map[string]int {
	if len(src) == 0 {
		return dst
	}
	if dst == nil {
		dst = make(map[string]int, len(src))
	}
	for key, value := range src {
		dst[key] += value
	}

	return dst
}

func mergeUsageEventExtraBilling(dst map[string]ExtraBilling, src map[string]ExtraBilling) map[string]ExtraBilling {
	if len(src) == 0 {
		return dst
	}
	if dst == nil {
		dst = make(map[string]ExtraBilling, len(src))
	}
	for key, value := range src {
		billing := dst[key]
		if billing.Type == "" {
			billing.Type = value.Type
		}
		billing.CallCount += value.CallCount
		dst[key] = billing
	}

	return dst
}

func (u *UsageEvent) Merge(other *UsageEvent) {
	if other == nil {
		return
	}

	u.InputTokens += other.InputTokens
	u.OutputTokens += other.OutputTokens
	u.TotalTokens += other.TotalTokens

	u.InputTokenDetails.Merge(&other.InputTokenDetails)
	u.OutputTokenDetails.Merge(&other.OutputTokenDetails)
	u.ExtraTokens = mergeUsageEventExtraTokens(u.ExtraTokens, other.ExtraTokens)
	u.ExtraBilling = mergeUsageEventExtraBilling(u.ExtraBilling, other.ExtraBilling)
}
