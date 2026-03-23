import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Container, Stack, Chip, useTheme, Divider } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import { Icon } from '@iconify/react';
import { Helmet } from 'react-helmet-async';

import ContentViewer from 'ui-component/ContentViewer';
import { API } from 'utils/api';

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMonthDay = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}.${day}`;
};

const formatRelative = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return '刚刚更新';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  return formatDate(timestamp);
};

const getYearLabel = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).getFullYear();
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
        if (success && Array.isArray(data)) {
          setNotices(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  const latestNotice = notices[0];
  const noticeYears = useMemo(() => [...new Set(notices.map((notice) => getYearLabel(notice.publish_time)).filter(Boolean))], [notices]);

  return (
    <>
      <Helmet>
        <title>公告 - CZLOapi</title>
      </Helmet>
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
          py: { xs: 2.5, md: 4 },
          px: 2,
          background:
            theme.palette.mode === 'dark'
              ? `radial-gradient(circle at top left, ${alpha(theme.palette.primary.main, 0.18)} 0%, transparent 28%), linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.88)} 0%, ${theme.palette.background.default} 100%)`
              : `radial-gradient(circle at top left, ${alpha(theme.palette.primary.light, 0.2)} 0%, transparent 28%), linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${theme.palette.background.default} 100%)`
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={1.25} sx={{ mb: { xs: 2.5, md: 3.5 }, ml: { xs: 0, md: 12 }, maxWidth: 620 }}>
            <Chip
              label="Announcements Timeline"
              variant="outlined"
              sx={{
                width: 'fit-content',
                height: 24,
                fontSize: '0.7rem',
                color: 'primary.main',
                borderColor: alpha(theme.palette.primary.main, 0.24),
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06)
              }}
            />
            <Typography
              variant="h2"
              sx={{
                fontWeight: 400,
                fontSize: { xs: '1.6rem', md: '2rem' },
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
                color: 'text.primary'
              }}
            >
              公告
            </Typography>

            {!loading && notices.length > 0 && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} useFlexGap flexWrap="wrap">
                <Chip
                  icon={<Icon icon="solar:bell-bing-bold-duotone" width={16} />}
                  label={`共 ${notices.length} 条公告`}
                  sx={{
                    height: 24,
                    fontSize: '0.72rem',
                    borderRadius: '999px',
                    backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.5 : 0.82),
                    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`
                  }}
                />
                {latestNotice && (
                  <Chip
                    icon={<Icon icon="solar:clock-circle-bold-duotone" width={16} />}
                    label={`最近更新 ${formatRelative(latestNotice.publish_time)}`}
                    sx={{
                      height: 24,
                      fontSize: '0.72rem',
                      borderRadius: '999px',
                      backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.5 : 0.82),
                      border: `1px solid ${alpha(theme.palette.divider, 0.9)}`
                    }}
                  />
                )}
                {noticeYears.length > 0 && (
                  <Chip
                    icon={<Icon icon="solar:calendar-mark-bold-duotone" width={16} />}
                    label={`覆盖 ${noticeYears[noticeYears.length - 1]} - ${noticeYears[0]}`}
                    sx={{
                      height: 24,
                      fontSize: '0.72rem',
                      borderRadius: '999px',
                      backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.5 : 0.82),
                      border: `1px solid ${alpha(theme.palette.divider, 0.9)}`
                    }}
                  />
                )}
              </Stack>
            )}
          </Stack>

          {loading ? (
            <Stack
              alignItems="center"
              spacing={1.5}
              sx={{
                py: 9,
                borderRadius: '22px',
                border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.52 : 0.82)
              }}
            >
              <Icon icon="svg-spinners:3-dots-scale" width={28} />
              <Typography color="text.secondary">加载公告中...</Typography>
            </Stack>
          ) : notices.length === 0 ? (
            <Stack
              alignItems="center"
              spacing={2}
              sx={{
                py: 9,
                px: 3,
                borderRadius: '22px',
                border: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
                backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.48 : 0.78),
                textAlign: 'center'
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main',
                  backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08)
                }}
              >
                <Icon icon="solar:bell-off-bold-duotone" width={30} />
              </Box>
              <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600 }}>
                暂无公告
              </Typography>
              <Typography color="text.secondary">当前还没有已发布的公告内容，稍后再来看看。</Typography>
            </Stack>
          ) : (
            <Timeline
              position="right"
              sx={{
                p: 0,
                m: 0,
                [`& .MuiTimelineItem-root:before`]: {
                  display: 'none'
                },
                [`& .MuiTimelineOppositeContent-root`]: {
                  flex: { xs: 0, md: '0 0 88px' },
                  px: 0,
                  pr: { md: 2 }
                },
                [`& .MuiTimelineContent-root`]: {
                  px: 0,
                  pl: 0,
                  py: 0
                }
              }}
            >
              {notices.map((notice, index) => {
                const isLatest = index === 0;
                const currentYear = getYearLabel(notice.publish_time);
                const previousYear = index > 0 ? getYearLabel(notices[index - 1].publish_time) : null;
                const showYear = index === 0 || currentYear !== previousYear;

                return (
                  <TimelineItem
                    key={notice.id}
                    sx={{
                      alignItems: 'stretch',
                      minHeight: 'auto',
                      pb: { xs: 1.5, md: 2 }
                    }}
                  >
                    <TimelineOppositeContent
                      sx={{
                        display: { xs: 'none', md: 'block' },
                        pt: showYear ? 3.8 : 0.55,
                        textAlign: 'right'
                      }}
                    >
                      <Stack spacing={0.5}>
                        {showYear && (
                          <Chip
                            label={currentYear}
                            size="small"
                            sx={{
                              alignSelf: 'flex-end',
                              mb: 0.75,
                              height: 22,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: 'primary.main',
                              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`
                            }}
                          />
                        )}
                        <Typography
                          variant="overline"
                          sx={{
                            color: 'primary.main',
                            letterSpacing: '0.1em',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            lineHeight: 1.2
                          }}
                        >
                          {formatMonthDay(notice.publish_time)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatRelative(notice.publish_time)}
                        </Typography>
                      </Stack>
                    </TimelineOppositeContent>

                    <TimelineSeparator sx={{ flex: '0 0 auto', px: { xs: 0.25, md: 1.1 } }}>
                      <TimelineDot
                        sx={{
                          my: showYear ? 3.8 : 0.55,
                          p: 0,
                          width: isLatest ? 14 : 8,
                          height: isLatest ? 14 : 8,
                          minWidth: 0,
                          minHeight: 0,
                          boxShadow: 'none',
                          border: 'none',
                          backgroundColor: isLatest ? 'primary.main' : alpha(theme.palette.primary.main, 0.42),
                          outline: isLatest
                            ? `4px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1)}`
                            : 'none'
                        }}
                      />
                      {index !== notices.length - 1 && (
                        <TimelineConnector
                          sx={{
                            width: '1px',
                            borderRadius: '999px',
                            background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`
                          }}
                        />
                      )}
                    </TimelineSeparator>

                    <TimelineContent sx={{ minWidth: 0 }}>
                      <Stack spacing={0.75} sx={{ pb: 0.25 }}>
                        {showYear && (
                          <Chip
                            label={currentYear}
                            size="small"
                            sx={{
                              display: { xs: 'inline-flex', md: 'none' },
                              width: 'fit-content',
                              height: 22,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: 'primary.main',
                              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`
                            }}
                          />
                        )}

                        <Typography
                          variant="overline"
                          sx={{
                            display: { xs: 'block', md: 'none' },
                            color: 'primary.main',
                            letterSpacing: '0.08em',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            lineHeight: 1.2
                          }}
                        >
                          {formatMonthDay(notice.publish_time)}
                        </Typography>
                      </Stack>

                      <Box
                        sx={{
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '14px',
                          border: `1px solid ${alpha(isLatest ? theme.palette.primary.main : theme.palette.divider, isLatest ? 0.2 : 0.8)}`,
                          background:
                            theme.palette.mode === 'dark'
                              ? `linear-gradient(155deg, ${alpha(theme.palette.background.paper, 0.82)} 0%, ${alpha(theme.palette.background.default, 0.72)} 100%)`
                              : `linear-gradient(155deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.primary.light, isLatest ? 0.1 : 0.04)} 100%)`,
                          boxShadow: isLatest
                            ? `0 10px 20px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)}`
                            : theme.palette.mode === 'dark'
                              ? '0 8px 16px rgba(0, 0, 0, 0.12)'
                              : '0 8px 16px rgba(16, 19, 26, 0.04)',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                          '&:hover': {
                            borderColor: alpha(theme.palette.primary.main, 0.24),
                            boxShadow: `0 10px 18px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06)}`
                          }
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: '0 0 auto 0',
                            height: '2px',
                            background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.8)} 0%, ${alpha(theme.palette.secondary.main, 0.28)} 100%)`
                          }}
                        />

                        <Stack spacing={1.25} sx={{ p: { xs: 1.5, md: 1.75 } }}>
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 600,
                              color: 'text.primary',
                              fontSize: { xs: '0.98rem', md: '1.08rem' },
                              lineHeight: 1.4
                            }}
                          >
                            {notice.title}
                          </Typography>

                          {notice.content ? (
                            <>
                              <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.75) }} />
                              <ContentViewer
                                content={notice.content}
                                containerStyle={{ backgroundColor: 'transparent' }}
                                contentStyle={{
                                  padding: 0,
                                  color: theme.palette.text.secondary,
                                  fontSize: { xs: '0.82rem', md: '0.86rem' },
                                  lineHeight: 1.68
                                }}
                              />
                            </>
                          ) : (
                            <Typography color="text.secondary">这条公告暂时没有正文内容。</Typography>
                          )}
                        </Stack>
                      </Box>
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          )}
        </Container>
      </Box>
    </>
  );
}
