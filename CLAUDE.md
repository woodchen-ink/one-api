# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

- 前端 管理员界面直接使用中文, 不需要i18n, 用户界面使用i18n.
- 当需要实现后端新功能或新组件, 先看看`https://github.com/QuantumNous/new-api`这个项目有没有参考实现.

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
- Claude and Gemini native routes support root-path aliases for client compatibility.
  - Claude can be called via `/v1/messages`.
  - Gemini can be called via `/v1beta/models/:model` and `/v1/models/:model`.
- The default homepage highlights the currently enabled native routes for quick onboarding.
- Support for streaming responses and WebSocket connections

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
- Payment processing with multiple gateways
- Users can review their own recharge orders, including trade numbers and gateway order numbers, from the web console
- Subscription plans: Admin-defined quota packages bound to user groups
  - `model/subscription_plan.go` - Plan definitions (name, group, price, quota, duration)
  - `model/user_subscription.go` - User subscription instances and quota consumption
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

### Build System
- Task-based build system (Taskfile.yml) with Make fallback
- Frontend assets built with Vite and embedded into Go binary
- Docker support with multi-stage builds
- Version information embedded at build time with Git metadata
- Build artifacts organized in `_output/` directory
