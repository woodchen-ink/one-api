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
  const pageBackground = theme.palette.mode === 'dark' ? theme.palette.background.default : '#F6F7F8';

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
  const seoData = useMemo(() => {
    const canonical = typeof window !== 'undefined' ? `${window.location.origin}/notice` : '/notice';
    const ogImage = typeof window !== 'undefined' ? `${window.location.origin}/logo.svg` : '/logo.svg';
    const latestTitle = latestNotice?.title;
    const title = latestTitle ? `${latestTitle} - CZLOapi 公告时间线` : 'CZLOapi 公告时间线 - 产品更新、运营通知与版本动态';
    const description = latestTitle
      ? `查看 CZLOapi 最新公告：${latestTitle}。这里汇总产品更新、运营通知、版本动态与服务变更。`
      : '查看 CZLOapi 公告时间线，了解产品更新、运营通知、版本动态与服务变更。';
    const keywords = 'CZLOapi 公告, 公告时间线, 产品更新, 版本动态, 运营通知, 服务变更, AI API 平台';

    return {
      title,
      description,
      keywords,
      canonical,
      ogImage
    };
  }, [latestNotice]);
  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'CZLOapi 公告时间线',
      description: seoData.description,
      url: seoData.canonical,
      inLanguage: 'zh-CN',
      isPartOf: {
        '@type': 'WebSite',
        name: 'CZLOapi',
        url: typeof window !== 'undefined' ? window.location.origin : seoData.canonical
      },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: notices.slice(0, 10).map((notice, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Article',
            headline: notice.title,
            datePublished: notice.publish_time ? new Date(notice.publish_time * 1000).toISOString() : undefined,
            url: `${seoData.canonical}#notice-${notice.id}`
          }
        }))
      }
    }),
    [notices, seoData]
  );

  return (
    <>
      <Helmet>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={seoData.canonical} />

        <meta property="og:title" content={seoData.title} />
        <meta property="og:description" content={seoData.description} />
        <meta property="og:url" content={seoData.canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CZLOapi" />
        <meta property="og:locale" content="zh_CN" />
        <meta property="og:image" content={seoData.ogImage} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoData.title} />
        <meta name="twitter:description" content={seoData.description} />
        <meta name="twitter:image" content={seoData.ogImage} />

        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <Box
        sx={{
          height: '100%',
          minHeight: '100%',
          py: { xs: 2, md: 3 },
          px: 2,
          boxSizing: 'border-box',
          backgroundColor: pageBackground,
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg" sx={{ height: '100%' }}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack spacing={1.25} sx={{ flexShrink: 0, mb: { xs: 2, md: 2.5 }, ml: { xs: 0, md: 12 }, maxWidth: 620 }}>
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
                      backgroundColor: alpha(pageBackground, theme.palette.mode === 'dark' ? 0.36 : 0.92),
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
                        backgroundColor: alpha(pageBackground, theme.palette.mode === 'dark' ? 0.36 : 0.92),
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
                        backgroundColor: alpha(pageBackground, theme.palette.mode === 'dark' ? 0.36 : 0.92),
                        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`
                      }}
                    />
                  )}
                </Stack>
              )}
            </Stack>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                pr: { xs: 0.5, md: 1 },
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': {
                  width: '7px'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(16,19,26,0.14)',
                  borderRadius: '999px'
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent'
                }
              }}
            >
              {loading ? (
                <Stack
                  alignItems="center"
                  spacing={1.5}
                  sx={{
                    minHeight: '100%',
                    justifyContent: 'center',
                    py: 6,
                    borderRadius: '18px',
                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                    backgroundColor: alpha(pageBackground, 0.98)
                  }}
                >
                  <Icon icon="svg-spinners:3-dots-scale" width={24} />
                  <Typography color="text.secondary" sx={{ fontSize: '0.88rem' }}>
                    加载公告中...
                  </Typography>
                </Stack>
              ) : notices.length === 0 ? (
                <Stack
                  alignItems="center"
                  spacing={1.5}
                  sx={{
                    minHeight: '100%',
                    justifyContent: 'center',
                    px: 3,
                    borderRadius: '18px',
                    border: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
                    backgroundColor: alpha(pageBackground, 0.98),
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
                        id={`notice-${notice.id}`}
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
                              backgroundColor: alpha(pageBackground, theme.palette.mode === 'dark' ? 0.88 : 0.98),
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
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
