# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
make one-api           # Build complete application
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
- **Authentication**: Multiple OAuth providers (GitHub, WeChat, Lark, OIDC) plus JWT tokens

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
- Support for streaming responses and WebSocket connections

#### Frontend React Structure
- `web/src/` - React application source
  - `views/` - Main application pages (Dashboard, Channel, User management, etc.)
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

### Key Features and Integrations
- Multi-provider AI API gateway with unified OpenAI-compatible API
- User management with quotas, groups, and hierarchical permissions
- Channel load balancing, failover, and health monitoring
- Real-time usage analytics and billing integration
- Payment processing with multiple gateways
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