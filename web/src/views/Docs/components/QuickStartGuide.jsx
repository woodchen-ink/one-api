import { Box, Typography, Chip, Tabs, Tab, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import CodeBlock from './CodeBlock';

const QuickStartGuide = ({ guide }) => {
  const theme = useTheme();
  const baseUrl = window.location.origin;
  const [tabIndex, setTabIndex] = useState(0);
  const currentTab = guide.tabs[tabIndex] || guide.tabs[0];

  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
        {guide.title}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7 }}>
        {guide.description}
      </Typography>

      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        sx={{
          mb: 3,
          minHeight: 36,
          '& .MuiTab-root': {
            minHeight: 36,
            py: 0.5,
            px: 2,
            fontSize: '0.82rem',
            textTransform: 'none'
          },
          '& .MuiTabs-indicator': { height: 2 }
        }}
      >
        {guide.tabs.map((tab, i) => (
          <Tab key={i} label={tab.label} id={`toc-tab-${i}`} />
        ))}
      </Tabs>

      {currentTab.config.map((cfg, i) => (
        <Box key={i} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {cfg.title && (
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
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

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
        将 <code style={{ fontSize: '0.75rem' }}>sk-your-api-key</code> 替换为你在本站生成的 API Key
      </Typography>
    </Box>
  );
};

export default QuickStartGuide;
