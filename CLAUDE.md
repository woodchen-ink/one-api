# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

- 前端 管理员界面直接使用中文, 不需要i18n, 用户界面使用i18n.
- 当需要实现后端新功能或新组件, 先看看`https://github.com/QuantumNous/new-api`这个项目有没有参考实现.
- 关于openai responeses相关接口, 可以参考`https://github.com/Wei-Shaw/sub2api`项目的实现方式
- 关于`/v1/messages`转`responses`的实现, 参考`https://github.com/farion1231/cc-switch`这个项目
- 只要不影响我们计费和转发, 除非兼容老旧客户端, 否则都直接透传, 不做任何处理.

## Build and Development Commands

### Frontend (React/Vite)
```bash
cd web
yarn install          # Install dependencies
yarn dev              # Start development server (port 3010)
yarn build             # Build for production
yarn lint              # Run ESLint
yarn lint:fix          # Fix linting issues
yarn prettier          # Format code with Prettier
yarn i18n             # Update internationalization
```

### Backend (Go)
```bash
# Using Task (preferred)
task build             # Build complete application (web + go binary)
task web               # Build only web frontend
task run               # Build and run the application
task lint              # Run Go linting (gofmt + golangci-lint)
task clean             # Clean build artifacts
task fmt               # Format Go code (gomod + gofmt + golint)

# Using Make (alternative)
make czloapi           # Build complete application
make web               # Build web frontend only
make clean             # Clean build artifacts

# Direct Go commands
go mod tidy            # Update dependencies
go build               # Build Go binary
go run main.go         # Run application directly
```

### Testing
Tests should be run with:
```bash
go test ./...          # Run all Go tests
```

### Development Environment
- Backend runs on port 3000 by default
- Frontend dev server runs on port 3010 with proxy to backend
- Frontend proxies `/api` requests to backend (configurable in vite.config.mjs)

## Project Architecture

### Core Structure
This is a multi-provider AI API gateway that provides a unified OpenAI-compatible interface for various AI services. The system consists of:
- **Frontend**: React/Vite application with Material-UI components for admin dashboard
- **Backend**: Go REST API using Gin framework that serves both API and static content
- **Database**: GORM-based data layer supporting MySQL, PostgreSQL, and SQLite
- **Caching**: Redis and Freecache for performance optimization
- **Authentication**: GitHub OAuth, OIDC, CZLConnect, plus JWT tokens

### Key Directories

#### Backend Go Architecture
- `main.go` - Entry point with embedded web assets and server initialization
- `common/` - Core utilities and configuration
  - `config/` - Configuration management using Viper
  - `cache/` - Caching layer abstraction
  - `limit/` - Rate limiting implementations
  - `logger/` - Structured logging with Zap
  - `notify/` - Notification channels (Telegram, email, etc.)
  - `requester/` - HTTP client abstraction with streaming support
- `controller/` - HTTP handlers for REST API endpoints
- `middleware/` - Gin middleware stack (auth, CORS, rate limiting, metrics)
- `model/` - Database models and data access using GORM
- `providers/` - AI service provider implementations with pluggable architecture
- `relay/` - Request routing and transformation logic
- `router/` - Route registration and API endpoint definitions
- `payment/` - Payment gateway integrations (Alipay, WeChat Pay, Stripe)

#### Provider System Architecture
The provider system implements a plugin-based architecture in `providers/`:
- `base/interface.go` - Defines standardized interfaces for all providers
- Each provider directory (e.g., `openai/`, `claude/`, `gemini/`) implements:
  - Chat completion interfaces
  - Embedding interfaces  
  - Image generation interfaces
  - Audio transcription/TTS interfaces
  - Balance checking interfaces
  - Model listing interfaces
- Automatic model discovery and pricing updates
- Provider additions/removals must keep `common/config/constants.go`, `providers/providers.go`, `model/model_ownedby.go`, and `web/src/constants/ChannelConstants.js` in sync
- Pricing sync providers currently support `openai`, `claude`, and `gemini`.
  - OpenAI price sync pulls from `https://developers.openai.com/api/docs/pricing.md` and currently imports the `standard` token pricing rows only.
  - OpenAI `gpt-5.4` / `gpt-5.4-pro` long-context pricing (`>272K` prompt tokens) is mapped into pricing `billing_rules`.
  - Tool-only charges still stay outside `Price` rows; Responses image-generation extra billing now distinguishes GPT Image model variants.
- Baichuan provider support has been removed in this fork; avoid reintroducing channel type `26` unless the backend provider, pricing data, admin metadata, and docs are restored together
- Baidu/Qianfan provider support has been removed in this fork; avoid reintroducing channel type `15` unless the backend provider, pricing data, and admin metadata are restored together
- OpenRouter provider support has been removed in this fork; keep channel type `20` reserved and blocked unless the backend provider, admin metadata, and compatibility handling are restored together
- GitHub provider support has been removed in this fork; keep channel type `49` reserved and blocked unless the backend provider, admin metadata, and compatibility handling are restored together
- Replicate provider support has been removed in this fork; keep channel type `52` unavailable unless the backend provider, admin metadata, and compatibility handling are restored together
- Siliconflow provider support has been removed in this fork; keep channel type `45` reserved and blocked unless the backend provider, admin metadata, and compatibility handling are restored together
- Tencent provider support has been removed in this fork; keep channel type `23` reserved and blocked unless the backend provider, pricing data, admin metadata, and docs are restored together
- Hunyuan provider support has been removed in this fork; keep channel type `40` reserved and blocked unless the backend provider, pricing data, admin metadata, and docs are restored together
- Pricing data is stored as direct USD amounts.
  - Token prices use USD per 1M tokens.
  - `extra_ratios` now carries direct USD prices for extra token categories rather than relative multipliers.
  - Group ratio remains the only billing multiplier applied at runtime.
  - Cache token categories (`cached_tokens`, `cached_write_tokens`, `cached_read_tokens`) are billed as a split of prompt tokens; when upstream `prompt_tokens` already includes cache usage, subtract the cache portion from base input billing to avoid double charging.
- Claude and Gemini native routes support root-path aliases for client compatibility.
  - Claude can be called via `/v1/messages`.
  - `/v1/messages` now supports Claude-native providers plus OpenAI-compatible Responses/Chat providers. When the channel is not Claude-native, the fallback order is Claude direct -> OpenAI Responses -> OpenAI chat/completions. The Responses-compatible path preserves Claude `thinking` as OpenAI `reasoning` effort and converts compatible reasoning/tool SSE back to Claude Messages format when available.
  - Claude-compatible requests now also accept `output_config.effort` on the gateway side; when `/v1/messages` is bridged to `/v1/responses`, the gateway maps `output_config.effort` / `thinking.budget_tokens` into OpenAI `reasoning`, and cache-marked Claude prefixes can be turned into a stable `prompt_cache_key` for Responses-compatible upstreams.
  - For bridged Claude streaming, upstream stream failures that happen before the first SSE payload are now surfaced back to relay retry logic; once bytes have already been sent to the client, the gateway logs the stream error but avoids retrying the whole request.
  - Gemini can be called via `/v1beta/models/:model` and `/v1/models/:model`.
- The default homepage highlights the currently enabled native routes for quick onboarding.
- Support for streaming responses and WebSocket connections
- WebSocket quota logs can carry `metadata.request_mode` / `metadata.request_transport` so the log page can distinguish `responses v2 wss` and other WS traffic from normal requests
- 渠道编辑页已移除历史 `custom_parameter` JSON 注入能力；如需透传 OpenAI SDK 的 `extra_body` 等扩展字段，继续使用渠道开关 `allow_extra_body`

#### Frontend React Structure
- `web/src/` - React application source
  - `views/` - Main application pages (Dashboard, Channel, User management, etc.)
    - Includes a self-service order management page for users to review recharge orders and payment references
  - `layout/` - Layout components (MainLayout, MinimalLayout)
  - `ui-component/` - Reusable UI components and Material-UI wrappers
  - `contexts/` - React context providers (User, Status management)
  - `hooks/` - Custom React hooks for API calls and state management
  - `i18n/` - Internationalization with support for Chinese, English, Japanese
  - `routes/` - React Router configuration
  - `store/` - Redux state management
  - `themes/` - Material-UI theme customization

### Configuration System
- Environment variable support with automatic mapping (dots to underscores)
- YAML configuration file support via Viper
- Default configuration values defined in `common/config/config.go`
- Database configuration supports connection pooling and multiple drivers
- Provider-specific configurations stored in respective provider directories
- Web frontend build artifacts embedded into Go binary using go:embed
- `gpt-5*` 的 `chat/completions -> responses` 兼容转换独立放在 `types/chat_to_responses.go`
- 兼容模式下的流式请求优先走上游真实 `/v1/responses` SSE，再在本地转回 chat stream

### Key Features and Integrations
- Multi-provider AI API gateway with unified OpenAI-compatible API
- User management with quotas, groups, and hierarchical permissions
- Channel load balancing, failover, and health monitoring
- Real-time usage analytics and billing integration
- User dashboard includes a per-token usage panel with tabs for `today` and `7d`, based on `logs.token_id` aggregation; keep log list UI unchanged and do not expose raw token keys
- Admin channel list now supports per-channel usage statistics in the action column via `/api/channel/:id/statistics`, with 7/30/90-day aggregated views sourced from the `statistics` table plus latest-use time from `logs`
- Endpoint analytics now aggregate `logs.metadata.request_path` and normalized `logs.metadata.upstream_path`; admin analytics supports endpoint grouping in both summary cards and period charts
- Admin analytics page now uses quick time presets plus dimension/metric tabs instead of the old select-heavy layout; keep the experience optimized for fast switching between model, channel, and endpoint views
- Payment processing with multiple gateways
- Users can review their own recharge orders, including trade numbers and gateway order numbers, from the web console
- Subscription plans: Admin-defined quota packages bound to user groups
  - `model/subscription_plan.go` - Plan definitions (name, group, price, price currency, quota, duration)
  - `model/user_subscription.go` - User subscription instances and quota consumption
  - Plan sale price supports both `USD` and `CNY`; included quota remains measured in USD
  - Subscription quota is independent of user balance, measured in USD
  - Multiple subscriptions can stack; earliest-expiring consumed first
  - Cron job in `cron/main.go` expires subscriptions every minute
  - Payment flow reuses existing gateways via `Order.SubscriptionPlanId` field
  - `relay/relay_util/quota.go` checks subscription quota before user balance
  - Token group validation in `controller/token.go` allows subscribed groups
- Telegram bot integration for user interactions
- Prometheus metrics collection and monitoring
- WebSocket support for real-time features
- MCP (Model Context Protocol) server integration
- Safety filtering and content moderation
- Multi-language support with dynamic language switching
- Admin 教程管理页固定按 `sort DESC, id ASC` 展示，支持当前页拖拽排序；拖拽会调用 `/api/tutorial/reorder` 批量重写教程 `sort`，搜索结果中禁用拖拽以避免误排；新建教程在未显式传入 `sort` 时默认使用当前最大排序值加一，从而默认置顶
- `/panel/analytics` 顶部统计卡片保留有业务意义的汇总项：用户总消费金额、总消费 Tokens、用户总数、渠道数量、充值统计；不展示入口端点和上游端点卡片

### Build System
- Task-based build system (Taskfile.yml) with Make fallback
- Frontend assets built with Vite and embedded into Go binary
- Docker support with multi-stage builds
- Version information embedded at build time with Git metadata
- Build artifacts organized in `_output/` directory

### Known Billing Gaps
- **Vector Store storage** ($0.10/GB/day): `/v1/vector_stores` 端点直接透传给上游，storage 费用由 OpenAI 按账号收取，网关不做计费。如需避免漏收，考虑禁用该端点透传或实现存储用量追踪。
