import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import ReactApexChart from 'react-apexcharts';

import { API } from 'utils/api';
import { showError, renderNumber, timestamp2string } from 'utils/common';
import { CHANNEL_OPTIONS } from 'constants/ChannelConstants';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import { Icon } from '@iconify/react';

const defaultStatistics = {
  channel: {},
  days: 30,
  start_date: '',
  end_date: '',
  summary: {
    request_count: 0,
    quota: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    request_time: 0,
    active_days: 0,
    last_used_at: 0
  },
  daily: [],
  models: []
};

const periodOptions = [7, 30, 90];

function getQuotaPerUnit() {
  return Number(localStorage.getItem('quota_per_unit') || 1000000);
}

function formatQuota(quota, digits = 2) {
  return `$${(Number(quota || 0) / getQuotaPerUnit()).toFixed(digits)}`;
}

function formatAverageLatency(requestTime, requestCount) {
  if (!requestCount) {
    return '-';
  }

  const seconds = requestTime / requestCount / 1000;
  return `${seconds.toFixed(2)}s`;
}

function buildDateRange(startDate, endDate) {
  const dates = [];

  if (!startDate || !endDate) {
    return dates;
  }

  let cursor = dayjs(startDate);
  const end = dayjs(endDate);

  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    dates.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }

  return dates;
}

function buildDailySeries(statistics) {
  const dates = buildDateRange(statistics.start_date, statistics.end_date);
  const dailyMap = new Map((statistics.daily || []).map((item) => [item.Date || item.date, item]));

  const quotaData = [];
  const requestData = [];
  const tokenData = [];

  dates.forEach((date) => {
    const item = dailyMap.get(date) || {};
    quotaData.push(Number(Number(item.Quota || item.quota || 0) / getQuotaPerUnit()).toFixed(4));
    requestData.push(Number(item.RequestCount || item.request_count || 0));
    tokenData.push(Number(item.PromptTokens || item.prompt_tokens || 0) + Number(item.CompletionTokens || item.completion_tokens || 0));
  });

  return { dates, quotaData, requestData, tokenData };
}

function getStatusLabel(status) {
  switch (status) {
    case 1:
      return '启用';
    case 2:
      return '手动禁用';
    case 3:
      return '自动禁用';
    default:
      return '未知状态';
  }
}

function MetricCard({ title, value, subValue, icon, color = 'primary' }) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderRadius: 2,
        borderColor: (theme) => alpha(theme.palette[color].main, theme.palette.mode === 'dark' ? 0.35 : 0.2),
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.18)}, ${alpha(theme.palette.background.paper, 0.98)})`
            : `linear-gradient(135deg, ${alpha(theme.palette[color].light, 0.18)}, ${theme.palette.background.paper})`
      }}
    >
      <Stack spacing={1.5} sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${color}.main`,
              bgcolor: (theme) => alpha(theme.palette[color].main, theme.palette.mode === 'dark' ? 0.22 : 0.12)
            }}
          >
            <Icon icon={icon} width={18} />
          </Box>
        </Stack>
        <Typography variant="h2" sx={{ fontSize: '1.9rem', lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subValue}
        </Typography>
      </Stack>
    </Card>
  );
}

MetricCard.propTypes = {
  title: PropTypes.string,
  value: PropTypes.node,
  subValue: PropTypes.node,
  icon: PropTypes.string,
  color: PropTypes.string
};

export default function ChannelStatisticsDialog({ open, onClose, channel }) {
  const theme = useTheme();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(defaultStatistics);

  useEffect(() => {
    if (!open || !channel?.id) {
      return;
    }

    let active = true;

    const fetchStatistics = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/api/channel/${channel.id}/statistics`, {
          params: { days }
        });
        const { success, message, data } = res.data;
        if (!active) {
          return;
        }
        if (success) {
          setStatistics({
            ...defaultStatistics,
            ...data,
            summary: {
              ...defaultStatistics.summary,
              ...(data?.summary || {})
            },
            daily: data?.daily || [],
            models: data?.models || []
          });
        } else {
          showError(message);
        }
      } catch (error) {
        if (active) {
          showError(error.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchStatistics();

    return () => {
      active = false;
    };
  }, [open, channel?.id, days]);

  useEffect(() => {
    if (open) {
      setDays(30);
    }
  }, [open, channel?.id]);

  const summary = statistics.summary || defaultStatistics.summary;
  const chartSeries = buildDailySeries(statistics);
  const todayDate = statistics.end_date;
  const todayItem = (statistics.daily || []).find((item) => (item.Date || item.date) === todayDate) || {};
  const totalTokens = Number(summary.prompt_tokens || 0) + Number(summary.completion_tokens || 0);
  const averageDailyQuota = summary.quota ? Number(summary.quota / Math.max(statistics.days || 1, 1)) : 0;
  const averageDailyRequest = summary.request_count ? summary.request_count / Math.max(statistics.days || 1, 1) : 0;
  const topQuotaDay = [...(statistics.daily || [])].sort((a, b) => Number(b.Quota || b.quota || 0) - Number(a.Quota || a.quota || 0))[0];
  const topRequestDay = [...(statistics.daily || [])].sort(
    (a, b) => Number(b.RequestCount || b.request_count || 0) - Number(a.RequestCount || a.request_count || 0)
  )[0];
  const topModels = [...(statistics.models || [])].sort((a, b) => Number(b.quota || 0) - Number(a.quota || 0)).slice(0, 8);

  const trendOptions = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      background: 'transparent'
    },
    stroke: {
      width: [3, 3],
      curve: 'smooth'
    },
    colors: [theme.palette.primary.main, theme.palette.warning.main],
    xaxis: {
      categories: chartSeries.dates.map((date) => dayjs(date).format('MM-DD'))
    },
    yaxis: [
      {
        title: { text: '费用 (USD)' },
        labels: {
          formatter: (value) => `$${Number(value).toFixed(2)}`
        }
      },
      {
        opposite: true,
        title: { text: '请求' }
      }
    ],
    legend: {
      position: 'top'
    },
    grid: {
      borderColor: alpha(theme.palette.text.primary, 0.08)
    },
    tooltip: {
      theme: theme.palette.mode
    }
  };

  const trendData = [
    {
      name: '费用 (USD)',
      type: 'area',
      data: chartSeries.quotaData
    },
    {
      name: '请求',
      type: 'line',
      data: chartSeries.requestData
    }
  ];

  const donutOptions = {
    chart: {
      type: 'donut',
      background: 'transparent'
    },
    labels: topModels.map((item) => item.model_name),
    legend: {
      position: 'bottom'
    },
    stroke: {
      colors: [theme.palette.background.paper]
    },
    tooltip: {
      theme: theme.palette.mode,
      y: {
        formatter: (value) => `${renderNumber(value)} 次`
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '62%',
          labels: {
            show: true,
            total: {
              show: true,
              label: '总请求',
              formatter: () => renderNumber(summary.request_count || 0)
            }
          }
        }
      }
    }
  };

  const donutSeries = topModels.map((item) => item.request_count);

  const metricCards = [
    {
      title: `${statistics.days || 30}天费用`,
      value: formatQuota(summary.quota, 2),
      subValue: `日均 ${formatQuota(averageDailyQuota, 4)}`,
      icon: 'solar:dollar-minimalistic-bold-duotone',
      color: 'success'
    },
    {
      title: `${statistics.days || 30}天请求`,
      value: renderNumber(summary.request_count || 0),
      subValue: `日均 ${renderNumber(Number(averageDailyRequest.toFixed(2)))}`,
      icon: 'solar:chat-round-line-duotone',
      color: 'primary'
    },
    {
      title: '今日费用',
      value: formatQuota(todayItem.Quota || todayItem.quota || 0, 4),
      subValue: `统计日期 ${todayDate || '-'}`,
      icon: 'solar:calendar-mark-line-duotone',
      color: 'warning'
    },
    {
      title: '今日请求',
      value: renderNumber(todayItem.RequestCount || todayItem.request_count || 0),
      subValue: `今日 Token ${renderNumber((todayItem.PromptTokens || todayItem.prompt_tokens || 0) + (todayItem.CompletionTokens || todayItem.completion_tokens || 0))}`,
      icon: 'solar:chart-square-line-duotone',
      color: 'secondary'
    },
    {
      title: '总 Token',
      value: renderNumber(totalTokens),
      subValue: `输入 ${renderNumber(summary.prompt_tokens || 0)} / 输出 ${renderNumber(summary.completion_tokens || 0)}`,
      icon: 'solar:database-line-duotone',
      color: 'info'
    },
    {
      title: '活跃天数',
      value: `${summary.active_days || 0} 天`,
      subValue: `周期内 ${statistics.days || 30} 天`,
      icon: 'solar:bolt-circle-line-duotone',
      color: 'success'
    },
    {
      title: '平均响应',
      value: formatAverageLatency(summary.request_time || 0, summary.request_count || 0),
      subValue: `累计时长 ${(Number(summary.request_time || 0) / 1000).toFixed(2)}s`,
      icon: 'solar:stopwatch-line-duotone',
      color: 'warning'
    },
    {
      title: '最近使用',
      value: summary.last_used_at ? dayjs.unix(summary.last_used_at).format('MM-DD HH:mm') : '-',
      subValue: summary.last_used_at ? timestamp2string(summary.last_used_at) : '暂无请求记录',
      icon: 'solar:clock-circle-line-duotone',
      color: 'primary'
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ mb: 1 }}>
              使用统计
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={statistics.channel?.name || channel?.name || `渠道 #${channel?.id || ''}`} color="primary" variant="outlined" />
              <Chip label={CHANNEL_OPTIONS[statistics.channel?.type || channel?.type]?.text || '未知类型'} variant="outlined" />
              <Chip label={getStatusLabel(statistics.channel?.status ?? channel?.status)} variant="outlined" />
              {statistics.channel?.group && <Chip label={`分组: ${statistics.channel.group}`} variant="outlined" />}
            </Stack>
          </Box>
          <IconButton onClick={onClose}>
            <Icon icon="solar:close-circle-line-duotone" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              统计周期
            </Typography>
            <Typography variant="h5">
              {statistics.start_date || '-'} 至 {statistics.end_date || '-'}
            </Typography>
          </Box>
          <ButtonGroup variant="outlined" size="small">
            {periodOptions.map((item) => (
              <Button key={item} variant={days === item ? 'contained' : 'outlined'} onClick={() => setDays(item)}>
                {item} 天
              </Button>
            ))}
          </ButtonGroup>
        </Stack>

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              {metricCards.map((item) => (
                <Grid item xs={12} sm={6} lg={3} key={item.title}>
                  <MetricCard {...item} />
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} lg={8}>
                <Card variant="outlined" sx={{ borderRadius: 2, p: 2, height: '100%' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h4">费用与请求趋势</Typography>
                    <Tooltip title="展示当前周期的每日费用和请求数变化">
                      <IconButton size="small">
                        <Icon icon="solar:question-circle-line-duotone" width={18} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  {chartSeries.dates.length > 0 ? (
                    <ReactApexChart options={trendOptions} series={trendData} type="line" height={340} />
                  ) : (
                    <Box sx={{ minHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography color="text.secondary">最近没有统计数据</Typography>
                    </Box>
                  )}
                </Card>
              </Grid>

              <Grid item xs={12} lg={4}>
                <Card variant="outlined" sx={{ borderRadius: 2, p: 2, height: '100%' }}>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    模型请求分布
                  </Typography>
                  {donutSeries.length > 0 ? (
                    <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={340} />
                  ) : (
                    <Box sx={{ minHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography color="text.secondary">最近没有模型请求</Typography>
                    </Box>
                  )}
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 2, p: 2, height: '100%' }}>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    峰值概览
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        最高费用日
                      </Typography>
                      <Typography variant="h5">
                        {topQuotaDay
                          ? `${topQuotaDay.Date || topQuotaDay.date} · ${formatQuota(topQuotaDay.Quota || topQuotaDay.quota || 0, 4)}`
                          : '-'}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        最高请求日
                      </Typography>
                      <Typography variant="h5">
                        {topRequestDay
                          ? `${topRequestDay.Date || topRequestDay.date} · ${renderNumber(topRequestDay.RequestCount || topRequestDay.request_count || 0)}`
                          : '-'}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 2, p: 2, height: '100%' }}>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    当前渠道信息
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography color="text.secondary">累计面板用量</Typography>
                      <Typography fontWeight={600}>{formatQuota(statistics.channel?.used_quota || 0, 2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography color="text.secondary">最近测速</Typography>
                      <Typography fontWeight={600}>
                        {statistics.channel?.response_time ? `${(statistics.channel.response_time / 1000).toFixed(2)}s` : '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography color="text.secondary">模型数</Typography>
                      <Typography fontWeight={600}>
                        {statistics.channel?.models ? statistics.channel.models.split(',').filter(Boolean).length : 0}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>
            </Grid>

            <Card variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="h4" sx={{ mb: 2 }}>
                模型明细
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>模型</TableCell>
                      <TableCell align="right">请求</TableCell>
                      <TableCell align="right">Token</TableCell>
                      <TableCell align="right">费用</TableCell>
                      <TableCell align="right">平均响应</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statistics.models.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">最近没有模型统计</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      statistics.models.map((item) => (
                        <TableRow key={item.model_name} hover>
                          <TableCell>{item.model_name}</TableCell>
                          <TableCell align="right">{renderNumber(item.request_count || 0)}</TableCell>
                          <TableCell align="right">{renderNumber((item.prompt_tokens || 0) + (item.completion_tokens || 0))}</TableCell>
                          <TableCell align="right">{formatQuota(item.quota || 0, 6)}</TableCell>
                          <TableCell align="right">{formatAverageLatency(item.request_time || 0, item.request_count || 0)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

ChannelStatisticsDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  channel: PropTypes.object
};
