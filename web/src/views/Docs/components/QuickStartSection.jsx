import { Box, Typography, Chip, useTheme, Tabs, Tab } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import CodeBlock from './CodeBlock';

const guides = [
  {
    id: 'guide-claude-code',
    title: 'Claude Code',
    description: 'Anthropic 官方 CLI 编程工具，支持代码生成、调试和重构。通过环境变量配置即可接入。',
    tabs: [
      {
        label: 'macOS / Linux',
        config: [
          {
            title: '终端环境变量',
            path: 'Terminal',
            content: (baseUrl) =>
              `export ANTHROPIC_BASE_URL="${baseUrl}"\nexport ANTHROPIC_AUTH_TOKEN="sk-your-api-key"\nexport CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
          },
          {
            title: 'Claude Code Settings（推荐，永久生效）',
            path: '~/.claude/settings.json',
            content: (baseUrl) =>
              JSON.stringify(
                {
                  env: {
                    ANTHROPIC_BASE_URL: baseUrl,
                    ANTHROPIC_AUTH_TOKEN: 'sk-your-api-key',
                    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1'
                  }
                },
                null,
                2
              )
          }
        ]
      },
      {
        label: 'Windows CMD',
        config: [
          {
            title: '命令提示符',
            path: 'Command Prompt',
            content: (baseUrl) =>
              `set ANTHROPIC_BASE_URL=${baseUrl}\nset ANTHROPIC_AUTH_TOKEN=sk-your-api-key\nset CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
          },
          {
            title: 'Claude Code Settings（推荐，永久生效）',
            path: '%userprofile%\\.claude\\settings.json',
            content: (baseUrl) =>
              JSON.stringify(
                {
                  env: {
                    ANTHROPIC_BASE_URL: baseUrl,
                    ANTHROPIC_AUTH_TOKEN: 'sk-your-api-key',
                    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1'
                  }
                },
                null,
                2
              )
          }
        ]
      },
      {
        label: 'PowerShell',
        config: [
          {
            title: 'PowerShell',
            path: 'PowerShell',
            content: (baseUrl) =>
              `$env:ANTHROPIC_BASE_URL="${baseUrl}"\n$env:ANTHROPIC_AUTH_TOKEN="sk-your-api-key"\n$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
          }
        ]
      }
    ]
  },
  {
    id: 'guide-codex-cli',
    title: 'OpenAI Codex CLI',
    description: 'OpenAI 官方命令行编程助手。需要在 ~/.codex 目录下配置 config.toml 和 auth.json 两个文件。',
    tabs: [
      {
        label: 'macOS / Linux',
        config: [
          {
            title: '配置文件',
            path: '~/.codex/config.toml',
            content: (baseUrl) =>
              `model_provider = "OpenAI"\nmodel = "gpt-4o"\nreview_model = "gpt-4o"\nmodel_reasoning_effort = "high"\ndisable_response_storage = true\nnetwork_access = "enabled"\nmodel_context_window = 1000000\nmodel_auto_compact_token_limit = 900000\n\n[model_providers.OpenAI]\nname = "OpenAI"\nbase_url = "${baseUrl}"\nwire_api = "responses"\nrequires_openai_auth = true`
          },
          {
            title: '认证文件',
            path: '~/.codex/auth.json',
            content: () => JSON.stringify({ OPENAI_API_KEY: 'sk-your-api-key' }, null, 2)
          }
        ]
      },
      {
        label: 'Windows',
        config: [
          {
            title: '配置文件',
            path: '%userprofile%\\.codex\\config.toml',
            content: (baseUrl) =>
              `model_provider = "OpenAI"\nmodel = "gpt-4o"\nreview_model = "gpt-4o"\nmodel_reasoning_effort = "high"\ndisable_response_storage = true\nnetwork_access = "enabled"\nmodel_context_window = 1000000\nmodel_auto_compact_token_limit = 900000\n\n[model_providers.OpenAI]\nname = "OpenAI"\nbase_url = "${baseUrl}"\nwire_api = "responses"\nrequires_openai_auth = true`
          },
          {
            title: '认证文件',
            path: '%userprofile%\\.codex\\auth.json',
            content: () => JSON.stringify({ OPENAI_API_KEY: 'sk-your-api-key' }, null, 2)
          }
        ]
      }
    ]
  },
  {
    id: 'guide-gemini-cli',
    title: 'Gemini CLI',
    description: 'Google 官方 Gemini 命令行工具。通过环境变量配置 Base URL 和 API Key。',
    tabs: [
      {
        label: 'macOS / Linux',
        config: [
          {
            title: '终端环境变量',
            path: 'Terminal',
            content: (baseUrl) =>
              `export GOOGLE_GEMINI_BASE_URL="${baseUrl}"\nexport GEMINI_API_KEY="sk-your-api-key"\nexport GEMINI_MODEL="gemini-2.5-pro"  # 可修改为其他支持的模型`
          }
        ]
      },
      {
        label: 'Windows CMD',
        config: [
          {
            title: '命令提示符',
            path: 'Command Prompt',
            content: (baseUrl) =>
              `set GOOGLE_GEMINI_BASE_URL=${baseUrl}\nset GEMINI_API_KEY=sk-your-api-key\nset GEMINI_MODEL=gemini-2.5-pro`
          }
        ]
      },
      {
        label: 'PowerShell',
        config: [
          {
            title: 'PowerShell',
            path: 'PowerShell',
            content: (baseUrl) =>
              `$env:GOOGLE_GEMINI_BASE_URL="${baseUrl}"\n$env:GEMINI_API_KEY="sk-your-api-key"\n$env:GEMINI_MODEL="gemini-2.5-pro"  # 可修改为其他支持的模型`
          }
        ]
      }
    ]
  },
  {
    id: 'guide-opencode',
    title: 'OpenCode',
    description: '开源终端 AI 编程助手，支持多个 AI 提供商。通过 JSON 配置文件接入。',
    tabs: [
      {
        label: 'macOS / Linux',
        config: [
          {
            title: '配置文件',
            path: '~/.config/opencode/opencode.json',
            content: (baseUrl) =>
              JSON.stringify(
                {
                  $schema: 'https://opencode.ai/config.json',
                  provider: {
                    czloapi: {
                      options: {
                        baseURL: baseUrl,
                        apiKey: 'sk-your-api-key'
                      },
                      models: {
                        'gpt-4o': { maxTokens: 16384, contextWindow: 128000 },
                        'claude-sonnet-4-20250514': { maxTokens: 16384, contextWindow: 200000 }
                      }
                    }
                  }
                },
                null,
                2
              )
          }
        ]
      },
      {
        label: 'Windows',
        config: [
          {
            title: '配置文件',
            path: '%userprofile%\\.config\\opencode\\opencode.json',
            content: (baseUrl) =>
              JSON.stringify(
                {
                  $schema: 'https://opencode.ai/config.json',
                  provider: {
                    czloapi: {
                      options: {
                        baseURL: baseUrl,
                        apiKey: 'sk-your-api-key'
                      },
                      models: {
                        'gpt-4o': { maxTokens: 16384, contextWindow: 128000 },
                        'claude-sonnet-4-20250514': { maxTokens: 16384, contextWindow: 200000 }
                      }
                    }
                  }
                },
                null,
                2
              )
          }
        ]
      }
    ]
  }
];

const QuickStartSection = () => {
  const theme = useTheme();
  const baseUrl = window.location.origin;

  return (
    <>
      {guides.map((guide) => (
        <GuideItem key={guide.id} guide={guide} baseUrl={baseUrl} />
      ))}
    </>
  );
};

const GuideItem = ({ guide, baseUrl }) => {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const currentTab = guide.tabs[tabIndex] || guide.tabs[0];

  return (
    <Box id={guide.id} sx={{ mb: 6, scrollMarginTop: '80px' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
        {guide.title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.7 }}>
        {guide.description}
      </Typography>

      {/* OS Tabs */}
      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        sx={{
          mb: 2,
          minHeight: 36,
          '& .MuiTab-root': {
            minHeight: 36,
            py: 0.5,
            px: 2,
            fontSize: '0.78rem',
            textTransform: 'none'
          },
          '& .MuiTabs-indicator': {
            height: 2
          }
        }}
      >
        {guide.tabs.map((tab, i) => (
          <Tab key={i} label={tab.label} />
        ))}
      </Tabs>

      {/* Config blocks */}
      {currentTab.config.map((cfg, i) => (
        <Box key={i} sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {cfg.title && (
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                {cfg.title}
              </Typography>
            )}
            <Chip
              label={cfg.path}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontFamily: '"Roboto Mono", Consolas, monospace',
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: 'text.secondary'
              }}
            />
          </Box>
          <CodeBlock>{cfg.content(baseUrl)}</CodeBlock>
        </Box>
      ))}

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
        将 <code style={{ fontSize: '0.75rem' }}>sk-your-api-key</code> 替换为你在本站生成的 API Key
      </Typography>
    </Box>
  );
};

export { guides };
export default QuickStartSection;
