import { useState, useEffect } from 'react';
import { Box, Typography, Container, Stack, Chip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { marked } from 'marked';
import { API } from 'utils/api';
import { Helmet } from 'react-helmet-async';

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatRelative = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  return formatDate(timestamp);
};

export default function PublicNotice() {
  const theme = useTheme();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await API.get('/api/notice/list');
        const { success, data } = res.data;
        if (success && data) {
          setNotices(data);
        }
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };
    fetchNotices();
  }, []);

  return (
    <>
      <Helmet>
        <title>公告 - CZLOapi</title>
      </Helmet>
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
          py: { xs: 4, md: 6 },
          px: 2,
          background:
            theme.palette.mode === 'dark'
              ? theme.palette.background.default
              : `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${theme.palette.background.default} 100%)`
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={2} alignItems="center" sx={{ mb: 6, textAlign: 'center' }}>
            <Chip
              label="Announcements"
              variant="outlined"
              sx={{
                color: 'primary.main',
                borderColor: alpha(theme.palette.primary.main, 0.24),
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06)
              }}
            />
            <Typography
              variant="h2"
              sx={{
                fontWeight: 300,
                fontSize: { xs: '2rem', md: '2.5rem' },
                color: 'text.primary'
              }}
            >
              公告动态
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 480 }}>
              了解我们的最新动态与更新
            </Typography>
          </Stack>

          {loading ? (
            <Stack alignItems="center" sx={{ py: 8 }}>
              <Typography color="text.secondary">加载中...</Typography>
            </Stack>
          ) : notices.length === 0 ? (
            <Stack alignItems="center" sx={{ py: 8 }}>
              <Typography color="text.secondary">暂无公告</Typography>
            </Stack>
          ) : (
            <Box sx={{ position: 'relative', pl: { xs: 3, md: 4 } }}>
              {/* Timeline line */}
              <Box
                sx={{
                  position: 'absolute',
                  left: { xs: 8, md: 12 },
                  top: 8,
                  bottom: 8,
                  width: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.16),
                  borderRadius: 1
                }}
              />

              <Stack spacing={4}>
                {notices.map((notice, index) => (
                  <Box key={notice.id} sx={{ position: 'relative' }}>
                    {/* Timeline dot */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: { xs: -23, md: -28 },
                        top: 20,
                        width: index === 0 ? 14 : 10,
                        height: index === 0 ? 14 : 10,
                        borderRadius: '50%',
                        backgroundColor: index === 0 ? 'primary.main' : alpha(theme.palette.primary.main, 0.4),
                        border: index === 0 ? `3px solid ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
                        transform: index === 0 ? 'translate(-2px, -2px)' : 'none'
                      }}
                    />

                    {/* Card */}
                    <Box
                      sx={{
                        p: { xs: 2.5, md: 3 },
                        borderRadius: '8px',
                        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                        backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.6 : 0.9),
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: alpha(theme.palette.primary.main, 0.2),
                          boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04)}`
                        }
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            fontSize: { xs: '1.05rem', md: '1.15rem' }
                          }}
                        >
                          {notice.title}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, ml: 2 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {formatRelative(notice.publish_time)}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                        {formatDate(notice.publish_time)}
                      </Typography>

                      {notice.content && (
                        <Box
                          sx={{
                            color: 'text.secondary',
                            lineHeight: 1.8,
                            fontSize: '0.9rem',
                            '& p': { my: 0.5 },
                            '& a': { color: 'primary.main' },
                            '& code': {
                              px: 0.5,
                              py: 0.25,
                              borderRadius: '4px',
                              backgroundColor: alpha(theme.palette.primary.main, 0.08),
                              fontSize: '0.85em'
                            },
                            '& pre': {
                              p: 1.5,
                              borderRadius: '8px',
                              backgroundColor: theme.palette.mode === 'dark' ? alpha('#000', 0.3) : alpha('#000', 0.04),
                              overflow: 'auto'
                            },
                            '& ul, & ol': { pl: 2.5 },
                            '& img': { maxWidth: '100%', borderRadius: '8px' }
                          }}
                          dangerouslySetInnerHTML={{ __html: marked(notice.content) }}
                        />
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
}
