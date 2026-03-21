import { Box, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

const CodeBlock = ({ children }) => {
  const theme = useTheme();
  return (
    <Box
      component="pre"
      sx={{
        p: 2,
        borderRadius: '8px',
        backgroundColor: theme.palette.mode === 'dark' ? '#141622' : '#1a1d27',
        color: '#e8e8e8',
        fontSize: '0.8rem',
        lineHeight: 1.6,
        fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
        overflow: 'auto',
        border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: '#2a2d3a', borderRadius: 2 }
      }}
    >
      <code>{children}</code>
    </Box>
  );
};

export default CodeBlock;
