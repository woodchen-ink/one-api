package tools

import (
	"context"
	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"czloapi/mcp/tools/available_model"
	"czloapi/mcp/tools/calculator"
	"czloapi/mcp/tools/current_time"
	"czloapi/mcp/tools/dashboard"
)

type McpTool interface {
	GetTool() *protocol.Tool
	HandleRequest(ctx context.Context, req *protocol.CallToolRequest) (*protocol.CallToolResult, error)
}

var McpTools = make(map[string]McpTool)

func init() {
	McpTools[calculator.NAME] = &calculator.Calculator{}
	McpTools[available_model.NAME] = &available_model.AvailableModel{}
	McpTools[dashboard.NAME] = &dashboard.Dashboard{}
	McpTools[current_time.NAME] = &current_time.CurrentTime{}
}
