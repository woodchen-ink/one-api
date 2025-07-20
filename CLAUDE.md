# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Frontend (React/Vite)
```bash
cd web
yarn install          # Install dependencies
yarn dev              # Start development server
yarn build             # Build for production
yarn lint              # Run ESLint
yarn lint:fix          # Fix linting issues
yarn prettier          # Format code with Prettier
```

### Backend (Go)
```bash
# Using Task (preferred)
task build             # Build complete application (web + go binary)
task web               # Build only web frontend
task run               # Build and run the application
task lint              # Run Go linting (gofmt + golangci-lint)
task clean             # Clean build artifacts

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
No test commands are configured in the build files. Tests should be run with:
```bash
go test ./...          # Run all Go tests
```

## Project Architecture

### Core Structure
- **Frontend**: React/Vite application in `web/` directory with Material-UI components
- **Backend**: Go REST API with Gin framework serving both API and static web content
- **Database**: GORM with support for MySQL, PostgreSQL, and SQLite
- **Caching**: Redis and Freecache implementations
- **Authentication**: JWT tokens, OIDC, GitHub, WeChat, Lark OAuth

### Key Directories

#### Backend Go Modules
- `common/` - Shared utilities, configuration, database, logging, rate limiting
- `controller/` - HTTP handlers for API endpoints
- `middleware/` - Gin middleware (auth, CORS, rate limiting, metrics)
- `model/` - Database models and data access layer
- `providers/` - AI service provider implementations (OpenAI, Claude, Gemini, etc.)
- `relay/` - Request proxying and transformation logic
- `router/` - Route definitions and setup
- `payment/` - Payment gateway integrations (Alipay, WeChat Pay, Stripe)

#### Frontend React Structure
- `web/src/views/` - Main application pages and components
- `web/src/layout/` - Layout components (MainLayout, MinimalLayout)
- `web/src/ui-component/` - Reusable UI components
- `web/src/contexts/` - React context providers (User, Status)
- `web/src/hooks/` - Custom React hooks
- `web/src/i18n/` - Internationalization setup and translations

### Provider System
The application implements a provider pattern for different AI services:
- Each provider in `providers/` implements standardized interfaces
- Base interfaces defined in `providers/base/`
- Supports chat, embeddings, image generation, audio transcription/TTS
- Automatic model discovery and pricing updates

### Configuration
- Environment variables and YAML config file support via Viper
- Database configuration in `common/config/`
- Provider-specific configurations in respective provider directories
- Web build embeds directly into Go binary via embed.FS

### Key Features
- Multi-provider AI API gateway with unified OpenAI-compatible interface
- User management with quotas, groups, and billing
- Channel load balancing and failover
- Real-time usage monitoring and analytics
- Payment processing and automatic billing
- Telegram bot integration
- Prometheus metrics and monitoring
- Multi-language support (Chinese, English, Japanese)