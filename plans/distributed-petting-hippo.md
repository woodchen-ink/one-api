# /v1/messages 支持路由到 OpenAI 等非 Claude 后端

## Context

当前 `/v1/messages` 端点被 `relayClaudeOnly` 硬编码只允许 Anthropic/VertexAI/Bedrock 三种 channel type。很多客户端（如 Claude Code、Cursor 等）只会用 Claude Messages API 格式调用，但用户希望通过这个端点也能调用 GPT 等其他模型。

**目标**: 客户端用 Claude `/v1/messages` 格式发请求 → 网关转成 OpenAI `chat/completions` 调上游 → 响应转回 Claude 格式返回客户端。

## 设计方案

### 核心思路

复用现有的 `ConvertFromChatOpenai()` / `ConvertToChatOpenai()` 双向转换逻辑（已在 `providers/claude/chat.go` 中实现），但**反向使用**：

```
客户端 (Claude Messages 格式)
    ↓
[relayClaudeMessages] 解析 ClaudeRequest
    ↓
Claude→OpenAI 转换 (新函数 ConvertToOpenAIChat)
    ↓
ChatInterface.CreateChatCompletion / CreateChatCompletionStream
    ↓
OpenAI→Claude 转换 (新函数 ConvertFromOpenAIChat)
    ↓
返回 Claude Messages 格式给客户端
```

### 实现步骤

#### 1. 新建转换文件 `providers/claude/chat_reverse.go`

实现两个核心函数：

**`ConvertClaudeToOpenAIChat(claudeReq *ClaudeRequest) (*types.ChatCompletionRequest, error)`**
- `system` → messages 中的 system role message
- `messages[].role: user/assistant` → 同名 role
- `messages[].content[]` 中：
  - `type: text` → `content` 字符串或 `content_parts`
  - `type: image` (base64) → `image_url` (data URI)
  - `type: tool_use` → `tool_calls[]`
  - `type: tool_result` → role=tool 的 message
- `tools[].input_schema` → `tools[].function.parameters`
- `tool_choice` → OpenAI tool_choice 格式
- `thinking` → `reasoning` (effort/max_tokens)
- `max_tokens` → `max_tokens`
- `stop_sequences` → `stop`
- `temperature`, `top_p` → 直接传

**`ConvertOpenAIChatToClaude(openaiResp *types.ChatCompletionResponse) (*ClaudeResponse, error)`**
- `choices[0].message.content` → `content[].type: text`
- `choices[0].message.tool_calls` → `content[].type: tool_use`
- `choices[0].message.reasoning_content` → `content[].type: thinking`
- `finish_reason` → `stop_reason` (stop→end_turn, tool_calls→tool_use, length→max_tokens)
- `usage.prompt_tokens` → `usage.input_tokens`
- `usage.completion_tokens` → `usage.output_tokens`
- `usage.prompt_tokens_details` → cache token 字段

**流式转换 `OpenAIChatStreamToClaudeStream`**：
- 实现 `HandlerStream` 函数，将 `chat.completion.chunk` SSE 转换为 Claude SSE 事件序列：
  - 首个 chunk → `message_start` + `content_block_start`
  - `delta.content` → `content_block_delta` (text_delta)
  - `delta.reasoning_content` → `content_block_delta` (thinking_delta)
  - `delta.tool_calls` → `content_block_start` (tool_use) + `content_block_delta` (input_json_delta)
  - `finish_reason` → `content_block_stop` + `message_delta` + `message_stop`

#### 2. 修改路由层 `relay/claude.go`

将 `relayClaudeOnly` 改为 `relayClaudeMessages`，移除 channel type 限制：

```go
// 不再限制 allow_channel_type
// 当 channel 实现 ClaudeChatInterface 时直接透传（现有逻辑）
// 当 channel 只实现 ChatInterface 时走转换路径
```

修改 `send()` 方法：
```go
func (r *relayClaudeMessages) send() {
    // 先尝试 ClaudeChatInterface（Claude/VertexAI/Bedrock 直接透传）
    if chatProvider, ok := r.provider.(claude.ClaudeChatInterface); ok {
        // 现有透传逻辑不变
        return
    }

    // fallback: 转换为 OpenAI Chat 格式调用 ChatInterface
    chatProvider, ok := r.provider.(providersBase.ChatInterface)
    if !ok {
        return error
    }

    // Claude → OpenAI 转换
    chatReq := ConvertClaudeToOpenAIChat(r.claudeRequest)

    if r.claudeRequest.Stream {
        // 流式：调用 CreateChatCompletionStream，用转换 handler 包装
        stream := chatProvider.CreateChatCompletionStream(chatReq)
        // 用 Claude SSE 格式写回客户端
    } else {
        // 非流式：调用 CreateChatCompletion，转换响应
        resp := chatProvider.CreateChatCompletion(chatReq)
        claudeResp := ConvertOpenAIChatToClaude(resp)
        responseJsonClient(c, claudeResp)
    }
}
```

#### 3. 路由配置不需要改动

`router/relay-router.go` 中的路由和中间件保持不变，`/v1/messages` 依然走 `relay.Relay`。

#### 4. 流式响应 wrapper

新建 `relay/claude_stream_wrapper.go`，封装一个将 OpenAI chat stream 转为 Claude SSE 的 adapter：

```go
// 包装 OpenAI StreamReaderInterface，输出 Claude SSE 格式字符串
type openaiToClaude StreamWrapper struct {
    // 状态机跟踪当前 content block index
    blockIndex int
    // ...
}
```

SSE 事件格式：
```
event: message_start
data: {"type":"message_start","message":{"id":"...","type":"message","role":"assistant","content":[],"model":"...","usage":{"input_tokens":N}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"..."}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":N}}

event: message_stop
data: {"type":"message_stop"}
```

### 关键文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `providers/claude/chat_reverse.go` | 新建 | Claude→OpenAI 请求转换 + OpenAI→Claude 响应转换 |
| `relay/claude.go` | 修改 | 移除 channel type 限制，添加 ChatInterface fallback |
| `relay/claude_stream_wrapper.go` | 新建 | OpenAI chat stream → Claude SSE 格式转换 |

### 转换映射详表

**请求转换 (Claude → OpenAI)**:

| Claude 字段 | OpenAI 字段 |
|---|---|
| `system` (string) | `messages[0].role="system"` |
| `system` ([]MessageContent) | 多条 system messages（保留 cache_control 信息） |
| `messages[].role` | 同名 |
| `content[].type="text"` | `content` (string) 或 `content[].type="text"` |
| `content[].type="image"` | `content[].type="image_url"` (data:mime;base64,xxx) |
| `content[].type="tool_use"` | `tool_calls[]` |
| `content[].type="tool_result"` | `role="tool"` message |
| `tools[].input_schema` | `tools[].function.parameters` |
| `tool_choice.type="auto/any/tool"` | `tool_choice="auto"/"required"/{"type":"function",...}` |
| `thinking.budget_tokens` | `reasoning.max_tokens` |
| `max_tokens` | `max_tokens` |
| `stop_sequences` | `stop` |

**响应转换 (OpenAI → Claude)**:

| OpenAI 字段 | Claude 字段 |
|---|---|
| `choices[0].message.content` | `content[].type="text"` |
| `choices[0].message.tool_calls` | `content[].type="tool_use"` |
| `choices[0].message.reasoning_content` | `content[].type="thinking"` |
| `finish_reason="stop"` | `stop_reason="end_turn"` |
| `finish_reason="tool_calls"` | `stop_reason="tool_use"` |
| `finish_reason="length"` | `stop_reason="max_tokens"` |
| `usage.prompt_tokens` | `usage.input_tokens` |
| `usage.completion_tokens` | `usage.output_tokens` |

### 验证方式

1. **非流式测试**: 用 curl 以 Claude Messages 格式请求 GPT 模型
```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "x-api-key: sk-xxx" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```
期望：收到 Claude Messages 格式的响应（带 `content[]`, `stop_reason`, `usage.input_tokens` 等）

2. **流式测试**: 同上但加 `"stream": true`，验证收到 Claude SSE 事件序列

3. **Claude 模型直通测试**: 确认 claude-* 模型仍然走原来的直接透传路径

4. **Tool calling 测试**: 验证 tools/tool_choice 的双向转换

5. **Thinking/Reasoning 测试**: 验证 thinking 参数正确转为 reasoning 并反转回来
