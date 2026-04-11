import { Box, Typography, Chip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CodeBlock from './CodeBlock';

const ApiSection = ({ section, withTocIds }) => {
  const theme = useTheme();
  const baseUrl = window.location.origin;
  const endpoints =
    section.endpoints && section.endpoints.length > 0 ? section.endpoints : [{ method: section.method, endpoint: section.endpoint }];

  return (
    <Box id={section.id} sx={{ mb: 6, scrollMarginTop: '80px' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
        {section.title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7 }}>
        {section.description}
      </Typography>

      {/* Endpoints */}
      <Typography
        id={withTocIds ? 'toc-endpoint' : undefined}
        variant="subtitle2"
        sx={{ mb: 1, color: 'text.secondary', letterSpacing: '0.05em', scrollMarginTop: '80px' }}
      >
        Endpoint
      </Typography>
      <Box sx={{ mb: 3 }}>
        {endpoints.map((item) => (
          <Box
            key={`${item.method}-${item.endpoint}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 0.75,
              borderRadius: '4px',
              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04) }
            }}
          >
            <Chip
              label={item.method}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                backgroundColor: item.method === 'POST' ? alpha('#5E7E80', 0.15) : alpha('#4B669A', 0.15),
                color: item.method === 'POST' ? '#5E7E80' : '#4B669A'
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontFamily: '"Roboto Mono", Consolas, monospace',
                fontSize: '0.8rem',
                color: 'text.primary'
              }}
            >
              {baseUrl}
              {item.endpoint}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Description */}
      {section.detail && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.8 }}>
          {section.detail}
        </Typography>
      )}

      {/* Headers */}
      <Typography
        id={withTocIds ? 'toc-headers' : undefined}
        variant="subtitle2"
        sx={{ mb: 1, color: 'text.secondary', letterSpacing: '0.05em', scrollMarginTop: '80px' }}
      >
        Headers
      </Typography>
      <CodeBlock>{JSON.stringify(section.headers, null, 2)}</CodeBlock>
      {section.note && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 2, color: 'text.secondary' }}>
          {section.note}
        </Typography>
      )}

      {/* Parameters */}
      {section.parameters && section.parameters.length > 0 && (
        <>
          <Typography
            id={withTocIds ? 'toc-parameters' : undefined}
            variant="subtitle2"
            sx={{ mt: 3, mb: 1.5, color: 'text.secondary', letterSpacing: '0.05em', scrollMarginTop: '80px' }}
          >
            Parameters
          </Typography>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              mb: 3,
              '& th, & td': {
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                p: 1,
                fontSize: '0.8rem',
                textAlign: 'left'
              },
              '& th': {
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04),
                fontWeight: 600,
                color: 'text.primary'
              },
              '& td': {
                color: 'text.secondary'
              },
              '& td:first-of-type': {
                fontFamily: '"Roboto Mono", Consolas, monospace',
                fontSize: '0.75rem',
                color: 'text.primary'
              }
            }}
          >
            <thead>
              <tr>
                <th>参数</th>
                <th>类型</th>
                <th>必填</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {section.parameters.map((param) => (
                <tr key={param.name}>
                  <td>{param.name}</td>
                  <td>{param.type}</td>
                  <td>{param.required ? '是' : '否'}</td>
                  <td>{param.desc}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </>
      )}

      {/* Request Example */}
      <Typography
        id={withTocIds ? 'toc-request' : undefined}
        variant="subtitle2"
        sx={{ mt: 3, mb: 1, color: 'text.secondary', letterSpacing: '0.05em', scrollMarginTop: '80px' }}
      >
        Request Body
      </Typography>
      <CodeBlock>{JSON.stringify(section.requestExample, null, 2)}</CodeBlock>

      {/* Response Example */}
      <Typography
        id={withTocIds ? 'toc-response' : undefined}
        variant="subtitle2"
        sx={{ mt: 3, mb: 1, color: 'text.secondary', letterSpacing: '0.05em', scrollMarginTop: '80px' }}
      >
        Response
      </Typography>
      <CodeBlock>{JSON.stringify(section.responseExample, null, 2)}</CodeBlock>
    </Box>
  );
};

export default ApiSection;
