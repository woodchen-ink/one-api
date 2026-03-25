import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import ReactApexChart from 'react-apexcharts';

import { API } from 'utils/api';
import { calculateQuota, renderNumber, showError } from 'utils/common';
import DateRangePicker from 'ui-component/DateRangePicker';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { Icon } from '@iconify/react';

const GROUP_TABS = [
  { value: 'model_type', label: '模型厂商', icon: 'solar:buildings-3-line-duotone' },
  { value: 'model', label: '模型', icon: 'solar:cpu-line-duotone' },
  { value: 'channel', label: '渠道', icon: 'solar:server-path-line-duotone' },
  { value: 'request_path', label: '入口端点', icon: 'solar:login-3-line-duotone' },
  { value: 'upstream_path', label: '上游端点', icon: 'solar:logout-2-line-duotone' }
];

const METRIC_TABS = [
  { value: 'requests', label: '请求', icon: 'solar:chat-round-line-duotone' },
  { value: 'tokens', label: 'Token', icon: 'solar:database-line-duotone' },
  { value: 'cost', label: '消费', icon: 'solar:dollar-minimalistic-line-duotone' },
  { value: 'latency', label: '耗时', icon: 'solar:clock-circle-line-duotone' }
];

const OPS_TABS = [
  { value: 'users', label: '注册趋势' },
  { value: 'orders', label: '订单充值' },
  { value: 'redemptions', label: '兑换码' }
];

const PRESET_OPTIONS = [
  {
    value: 'today',
    label: '今天',
    getRange: () => ({
      start: dayjs().startOf('day'),
      end: dayjs().endOf('day')
    })
  },
  {
    value: '7d',
    label: '近7天',
    getRange: () => ({
      start: dayjs().subtract(6, 'day').startOf('day'),
      end: dayjs().endOf('day')
    })
  },
  {
    value: '30d',
    label: '近30天',
    getRange: () => ({
      start: dayjs().subtract(29, 'day').startOf('day'),
      end: dayjs().endOf('day')
    })
  },
  {
    value: 'month',
    label: '本月',
    getRange: () => ({
      start: dayjs().startOf('month'),
      end: dayjs().endOf('day')
    })
  },
  {
    value: 'custom',
    label: '自定义',
    getRange: () => ({
      start: dayjs().subtract(6, 'day').startOf('day'),
      end: dayjs().endOf('day')
    })
  }
];

const EMPTY_ANALYTICS = {
  channel_statistics: [],
  user_statistics: [],
  redemption_statistics: [],
  order_statistics: []
};

function getPresetRange(preset) {
  const target = PRESET_OPTIONS.find((item) => item.value === preset) || PRESET_OPTIONS[1];
  return target.getRange();
}

function getDateKey(item) {
  return item?.Date || item?.date || '';
}

function getChannelKey(item) {
  return item?.Channel || item?.channel || '未知';
}

function getDates(start, end) {
  const dates = [];
  let current = start.startOf('day');
  const last = end.startOf('day');

  while (current.isBefore(last) || current.isSame(last, 'day')) {
    dates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }

  return dates;
}

function getMetricValue(item, metric) {
  const requestCount = Number(item?.RequestCount || item?.request_count || 0);
  const quota = Number(item?.Quota || item?.quota || 0);
  const promptTokens = Number(item?.PromptTokens || item?.prompt_tokens || 0);
  const completionTokens = Number(item?.CompletionTokens || item?.completion_tokens || 0);
  const requestTime = Number(item?.RequestTime || item?.request_time || 0);

  switch (metric) {
    case 'tokens':
      return promptTokens + completionTokens;
    case 'cost':
      return Number(calculateQuota(quota, 6));
    case 'latency':
      return requestCount > 0 ? requestTime / requestCount / 1000 : 0;
    case 'requests':
    default:
      return requestCount;
  }
}

function formatMetricValue(metric, value) {
  const number = Number(value || 0);

  switch (metric) {
    case 'cost':
      return `$${number.toFixed(4)}`;
    case 'latency':
      return `${number.toFixed(2)}s`;
    case 'tokens':
      return renderNumber(number);
    case 'requests':
    default:
      return renderNumber(number);
  }
}

function getRankingMetricValue(item, metric) {
  if (metric === 'requests') {
    return item.requests;
  }
  if (metric === 'tokens') {
    return item.tokens;
  }
  if (metric === 'cost') {
    return item.cost;
  }
  return item.latency;
}

function buildSummaryRows(data) {
  const summary = {
    requests: 0,
    tokens: 0,
    cost: 0,
    latency: 0,
    activeEntities: new Set()
  };

  data.forEach((item) => {
    const requestCount = Number(item?.RequestCount || item?.request_count || 0);
    const quota = Number(item?.Quota || item?.quota || 0);
    const promptTokens = Number(item?.PromptTokens || item?.prompt_tokens || 0);
    const completionTokens = Number(item?.CompletionTokens || item?.completion_tokens || 0);
    const requestTime = Number(item?.RequestTime || item?.request_time || 0);

    summary.requests += requestCount;
    summary.tokens += promptTokens + completionTokens;
    summary.cost += Number(calculateQuota(quota, 6));
    summary.latency += requestTime;
    summary.activeEntities.add(getChannelKey(item));
  });

  return {
    requests: summary.requests,
    tokens: summary.tokens,
    cost: summary.cost,
    avgLatency: summary.requests > 0 ? summary.latency / summary.requests / 1000 : 0,
    activeEntities: summary.activeEntities.size
  };
}

function buildRankingRows(data) {
  const summaryMap = new Map();

  data.forEach((item) => {
    const key = getChannelKey(item);
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        name: key,
        requests: 0,
        tokens: 0,
        cost: 0,
        requestTime: 0
      });
    }

    const target = summaryMap.get(key);
    const requestCount = Number(item?.RequestCount || item?.request_count || 0);
    const quota = Number(item?.Quota || item?.quota || 0);
    const promptTokens = Number(item?.PromptTokens || item?.prompt_tokens || 0);
    const completionTokens = Number(item?.CompletionTokens || item?.completion_tokens || 0);
    const requestTime = Number(item?.RequestTime || item?.request_time || 0);

    target.requests += requestCount;
    target.tokens += promptTokens + completionTokens;
    target.cost += Number(calculateQuota(quota, 6));
    target.requestTime += requestTime;
  });

  return Array.from(summaryMap.values())
    .map((item) => ({
      ...item,
      latency: item.requests > 0 ? item.requestTime / item.requests / 1000 : 0
    }))
    .sort((a, b) => b.requests - a.requests);
}

function buildTrendData(data, dateRange, metric) {
  const dates = getDates(dateRange.start, dateRange.end);
  const rankingRows = buildRankingRows(data);
  const topNames = rankingRows.slice(0, 5).map((item) => item.name);
  const seriesMap = new Map();

  topNames.forEach((name) => {
    seriesMap.set(name, new Array(dates.length).fill(0));
  });
  seriesMap.set('其他', new Array(dates.length).fill(0));

  if (metric === 'latency') {
    const sums = new Array(dates.length).fill(0);
    const counts = new Array(dates.length).fill(0);

    data.forEach((item) => {
      const date = getDateKey(item);
      const index = dates.indexOf(date);
      if (index === -1) {
        return;
      }

      const requestCount = Number(item?.RequestCount || item?.request_count || 0);
      const requestTime = Number(item?.RequestTime || item?.request_time || 0);
      sums[index] += requestTime;
      counts[index] += requestCount;
    });

    return {
      categories: dates,
      series: [
        {
          name: '平均耗时',
          data: sums.map((sum, index) => (counts[index] > 0 ? Number((sum / counts[index] / 1000).toFixed(3)) : 0))
        }
      ],
      stacked: false
    };
  }

  data.forEach((item) => {
    const date = getDateKey(item);
    const index = dates.indexOf(date);
    if (index === -1) {
      return;
    }

    const name = getChannelKey(item);
    const value = getMetricValue(item, metric);

    if (seriesMap.has(name)) {
      seriesMap.get(name)[index] += value;
    } else {
      seriesMap.get('其他')[index] += value;
    }
  });

  return {
    categories: dates,
    series: Array.from(seriesMap.entries())
      .filter(([, values]) => values.some((value) => value > 0))
      .map(([name, values]) => ({
        name,
        data: values.map((value) => Number(value.toFixed ? value.toFixed(6) : value))
      })),
    stacked: true
  };
}

function buildSupportChart(type, analyticsData, dateRange, theme) {
  const dates = getDates(dateRange.start, dateRange.end);
  let series = [];
  let yAxisLabel = '';

  if (type === 'users') {
    const direct = new Array(dates.length).fill(0);
    const invited = new Array(dates.length).fill(0);

    (analyticsData.user_statistics || []).forEach((item) => {
      const index = dates.indexOf(item?.date);
      if (index === -1) {
        return;
      }
      direct[index] = Number(item?.user_count || 0) - Number(item?.inviter_user_count || 0);
      invited[index] = Number(item?.inviter_user_count || 0);
    });

    series = [
      { name: '直接注册', type: 'column', data: direct },
      { name: '邀请注册', type: 'column', data: invited }
    ];
    yAxisLabel = '人数';
  }

  if (type === 'orders') {
    const orderData = new Array(dates.length).fill(0);
    (analyticsData.order_statistics || []).forEach((item) => {
      const index = dates.indexOf(item?.date);
      if (index === -1) {
        return;
      }
      orderData[index] = Number(item?.order_amount || 0);
    });

    series = [{ name: '订单充值', type: 'area', data: orderData }];
    yAxisLabel = '金额';
  }

  if (type === 'redemptions') {
    const quotaData = new Array(dates.length).fill(0);
    const userData = new Array(dates.length).fill(0);

    (analyticsData.redemption_statistics || []).forEach((item) => {
      const index = dates.indexOf(item?.date);
      if (index === -1) {
        return;
      }
      quotaData[index] = Number(calculateQuota(item?.quota || 0, 6));
      userData[index] = Number(item?.user_count || 0);
    });

    series = [
      { name: '兑换额度', type: 'column', data: quotaData },
      { name: '独立用户', type: 'line', data: userData }
    ];
    yAxisLabel = '额度 / 用户';
  }

  return {
    series,
    options: {
      chart: {
        type: 'line',
        background: 'transparent',
        toolbar: {
          show: false
        }
      },
      stroke: {
        width: series.map((item) => (item.type === 'line' ? 3 : 0))
      },
      fill: {
        type: series.map((item) => (item.type === 'area' ? 'gradient' : 'solid')),
        gradient: {
          shadeIntensity: 0,
          opacityFrom: 0.22,
          opacityTo: 0.04,
          stops: [0, 100]
        }
      },
      colors: ['#4B669A', '#7E9FA1', '#756B80'],
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        labels: {
          colors: theme.palette.text.primary
        }
      },
      xaxis: {
        categories: dates.map((date) => dayjs(date).format('MM-DD'))
      },
      yaxis: {
        title: {
          text: yAxisLabel
        }
      },
      grid: {
        borderColor: alpha(theme.palette.text.primary, 0.08),
        strokeDashArray: 4
      },
      tooltip: {
        theme: theme.palette.mode
      }
    }
  };
}

function SummaryCard({ icon, title, value, description, color, integrated = false }) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderRadius: 3,
        borderColor: (theme) =>
          integrated
            ? alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.06)
            : alpha(color, theme.palette.mode === 'dark' ? 0.28 : 0.16),
        background: (theme) =>
          integrated
            ? theme.palette.mode === 'dark'
              ? `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.04)}, ${alpha(theme.palette.background.paper, 0.96)})`
              : `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.9)}, ${alpha('#F6F7F8', 0.92)})`
            : theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${alpha(color, 0.14)}, ${alpha(theme.palette.background.paper, 0.98)})`
              : `linear-gradient(135deg, ${alpha(color, 0.08)}, ${theme.palette.background.paper})`,
        boxShadow: integrated ? 'none' : undefined
      }}
    >
      <Stack direction="row" spacing={2} sx={{ p: 2.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            bgcolor: (theme) => alpha(color, theme.palette.mode === 'dark' ? 0.22 : 0.12)
          }}
        >
          <Icon icon={icon} width={22} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h2" sx={{ fontSize: '2rem', lineHeight: 1.15, mt: 0.5 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
            {description}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

SummaryCard.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  description: PropTypes.string,
  color: PropTypes.string,
  integrated: PropTypes.bool
};

function RankingPanel({ rows, metric, theme }) {
  const topRows = rows
    .map((item) => ({
      ...item,
      metricValue: getRankingMetricValue(item, metric)
    }))
    .sort((a, b) => b.metricValue - a.metricValue)
    .slice(0, 8);
  const maxValue = Math.max(...topRows.map((item) => item.metricValue), 1);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">分布排行</Typography>
          <Typography variant="body2" color="text.secondary">
            当前维度下的头部对象表现
          </Typography>
        </Box>
        <Chip label={`按${METRIC_TABS.find((item) => item.value === metric)?.label || '请求'}`} size="small" />
      </Stack>

      {topRows.length === 0 ? (
        <Box sx={{ minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">当前筛选范围没有统计数据</Typography>
        </Box>
      ) : (
        <Stack spacing={1.75}>
          {topRows.map((item, index) => (
            <Box key={`${item.name}-${index}`}>
              <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 0.75 }}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                  <Chip
                    label={`#${index + 1}`}
                    size="small"
                    sx={{
                      minWidth: 42,
                      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
                      color: 'primary.main',
                      fontWeight: 700
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap sx={{ maxWidth: 260 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      请求 {renderNumber(item.requests)} / Token {renderNumber(item.tokens)} / 费用 ${item.cost.toFixed(4)}
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                  {formatMetricValue(metric, item.metricValue)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={(item.metricValue / maxValue) * 100}
                sx={{
                  height: 8,
                  borderRadius: 999,
                  bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${alpha('#4B669A', 0.55)}, #1B2152)`
                  }
                }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  );
}

RankingPanel.propTypes = {
  rows: PropTypes.array,
  metric: PropTypes.string,
  theme: PropTypes.object
};

function TrendPanel({ trendData, metric, theme, title }) {
  const colorMap = {
    requests: ['#4B669A', '#7E9FA1', '#756B80', '#95A0AE', '#5E7E80', '#1B2152'],
    tokens: ['#1B2152', '#4B669A', '#7B90BF', '#95A0AE', '#7E9FA1', '#756B80'],
    cost: ['#5E7E80', '#7E9FA1', '#4B669A', '#95A0AE', '#756B80', '#1B2152'],
    latency: ['#756B80']
  };

  const isLatency = metric === 'latency';
  const options = {
    chart: {
      type: 'area',
      stacked: !isLatency,
      background: 'transparent',
      toolbar: {
        show: false
      }
    },
    colors: colorMap[metric],
    stroke: {
      curve: 'smooth',
      width: isLatency ? [3] : trendData.series.map(() => 2.4)
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0,
        opacityFrom: isLatency ? 0.22 : 0.16,
        opacityTo: 0.03,
        stops: [0, 100]
      }
    },
    markers: {
      size: isLatency ? 4 : 0
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: {
        colors: theme.palette.text.primary
      }
    },
    xaxis: {
      categories: trendData.categories.map((date) => dayjs(date).format('MM-DD')),
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        formatter: (value) => formatMetricValue(metric, value)
      }
    },
    grid: {
      borderColor: alpha(theme.palette.text.primary, 0.08),
      strokeDashArray: 4
    },
    tooltip: {
      theme: theme.palette.mode,
      x: {
        formatter: (_, { dataPointIndex }) => trendData.categories[dataPointIndex] || ''
      },
      y: {
        formatter: (value) => formatMetricValue(metric, value)
      }
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            选中时间范围内的每日聚合趋势
          </Typography>
        </Box>
        <Chip label="按日聚合" size="small" />
      </Stack>

      {trendData.series.length === 0 ? (
        <Box sx={{ minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">当前筛选范围没有趋势数据</Typography>
        </Box>
      ) : (
        <ReactApexChart options={options} series={trendData.series} type="area" height={360} />
      )}
    </Card>
  );
}

TrendPanel.propTypes = {
  trendData: PropTypes.shape({
    categories: PropTypes.array,
    series: PropTypes.array
  }),
  metric: PropTypes.string,
  theme: PropTypes.object,
  title: PropTypes.string
};

function SupportPanel({ chartData, activeTab, setActiveTab }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}
      >
        <Box>
          <Typography variant="h4">运营辅助</Typography>
          <Typography variant="body2" color="text.secondary">
            用于补充观察注册、充值和兑换码走势
          </Typography>
        </Box>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
          {OPS_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Stack>
      <Divider />
      <Box sx={{ p: 2.5 }}>
        {chartData.series.length === 0 ? (
          <Box sx={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">当前时间范围没有辅助统计数据</Typography>
          </Box>
        ) : (
          <ReactApexChart options={chartData.options} series={chartData.series} type="line" height={320} />
        )}
      </Box>
    </Card>
  );
}

SupportPanel.propTypes = {
  chartData: PropTypes.shape({
    options: PropTypes.object,
    series: PropTypes.array
  }),
  activeTab: PropTypes.string,
  setActiveTab: PropTypes.func
};

export default function Overview() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('7d');
  const [dateRange, setDateRange] = useState(() => getPresetRange('7d'));
  const [groupType, setGroupType] = useState('model_type');
  const [metric, setMetric] = useState('tokens');
  const [opsTab, setOpsTab] = useState('users');
  const [userIdInput, setUserIdInput] = useState('');
  const [userId, setUserId] = useState(0);
  const [analyticsData, setAnalyticsData] = useState(EMPTY_ANALYTICS);

  const fetchData = async (range, currentGroupType, currentUserId) => {
    setLoading(true);
    try {
      const res = await API.get('/api/analytics/period', {
        params: {
          start_timestamp: range.start.unix(),
          end_timestamp: range.end.unix(),
          group_type: currentGroupType,
          user_id: currentUserId
        }
      });
      const { success, message, data } = res.data;
      if (success) {
        setAnalyticsData({
          channel_statistics: data?.channel_statistics || [],
          user_statistics: data?.user_statistics || [],
          redemption_statistics: data?.redemption_statistics || [],
          order_statistics: data?.order_statistics || []
        });
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(dateRange, groupType, userId);
  }, [dateRange, groupType, userId]);

  const handlePresetChange = (value) => {
    setPreset(value);
    if (value !== 'custom') {
      setDateRange(getPresetRange(value));
    }
  };

  const handleApplyFilters = () => {
    setUserId(Number(userIdInput || 0));
  };

  const handleResetFilters = () => {
    setPreset('7d');
    setDateRange(getPresetRange('7d'));
    setUserIdInput('');
    setUserId(0);
    setGroupType('model_type');
    setMetric('tokens');
    setOpsTab('users');
  };

  const summary = buildSummaryRows(analyticsData.channel_statistics || []);
  const rankingRows = buildRankingRows(analyticsData.channel_statistics || []);
  const trendData = buildTrendData(analyticsData.channel_statistics || [], dateRange, metric);
  const supportChart = buildSupportChart(opsTab, analyticsData, dateRange, theme);
  const currentGroupLabel = GROUP_TABS.find((item) => item.value === groupType)?.label || '模型厂商';

  const summaryCards = [
    {
      title: '总请求数',
      value: renderNumber(summary.requests),
      description: `${dateRange.start.format('MM-DD')} 至 ${dateRange.end.format('MM-DD')} · 覆盖 ${summary.activeEntities} 个对象`,
      icon: 'solar:document-text-line-duotone',
      color: theme.palette.mode === 'dark' ? '#7B90BF' : '#4B669A'
    },
    {
      title: '总 Token',
      value: renderNumber(summary.tokens),
      description: `当前维度：${currentGroupLabel}`,
      icon: 'solar:database-line-duotone',
      color: theme.palette.mode === 'dark' ? '#7E9FA1' : '#5E7E80'
    },
    {
      title: '总消费',
      value: `$${summary.cost.toFixed(4)}`,
      description: `用户筛选：${userId > 0 ? `#${userId}` : '全部用户'}`,
      icon: 'solar:dollar-minimalistic-line-duotone',
      color: theme.palette.mode === 'dark' ? '#908095' : '#756B80'
    },
    {
      title: '平均耗时',
      value: `${summary.avgLatency.toFixed(2)}s`,
      description: '按请求均值计算',
      icon: 'solar:clock-circle-line-duotone',
      color: theme.palette.mode === 'dark' ? '#95A0AE' : '#687280'
    }
  ];

  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="h4">时间与筛选</Typography>
              <Typography variant="body2" color="text.secondary">
                预设范围会立即生效，自定义范围支持按需调整。
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {PRESET_OPTIONS.map((item) => (
                <Button
                  key={item.value}
                  variant={preset === item.value ? 'contained' : 'outlined'}
                  color={preset === item.value ? 'primary' : 'inherit'}
                  onClick={() => handlePresetChange(item.value)}
                  startIcon={<Icon icon="solar:calendar-line-duotone" />}
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
          </Stack>

          {preset === 'custom' && (
            <Box sx={{ maxWidth: 620 }}>
              <DateRangePicker
                key={`${dateRange.start.valueOf()}-${dateRange.end.valueOf()}`}
                defaultValue={dateRange}
                onChange={(value) => setDateRange(value)}
                localeText={{ start: '开始时间', end: '结束时间' }}
                fullWidth
              />
            </Box>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              label="用户 ID"
              type="number"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="留空表示全部用户"
              sx={{ width: { xs: '100%', md: 220 } }}
            />
            <Button variant="contained" onClick={handleApplyFilters}>
              应用筛选
            </Button>
            <Button variant="outlined" onClick={handleResetFilters}>
              重置
            </Button>
            <Chip label={`当前范围：${dateRange.start.format('YYYY-MM-DD')} 至 ${dateRange.end.format('YYYY-MM-DD')}`} variant="outlined" />
            <Chip label="统计粒度：按日" variant="outlined" />
          </Stack>

          <Box
            sx={{
              mt: 0.5,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider'
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={1}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  结果概览
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  当前筛选条件下的核心汇总指标
                </Typography>
              </Box>
              <Chip
                label={`对象数 ${summary.activeEntities}`}
                size="small"
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08),
                  color: 'primary.main'
                }}
              />
            </Stack>

            <Grid container spacing={1.5}>
              {summaryCards.map((item) => (
                <Grid item xs={12} sm={6} lg={3} key={item.title}>
                  <SummaryCard {...item} integrated />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, pt: 2.5 }}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            用量分析
          </Typography>
        </Box>
        <Stack spacing={1.5} sx={{ px: 2.5, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack
            direction={{ xs: 'column', xl: 'row' }}
            alignItems={{ xs: 'stretch', xl: 'center' }}
            spacing={{ xs: 1.5, xl: 1 }}
            sx={{ flexWrap: 'wrap' }}
          >
            <Tabs
              value={groupType}
              onChange={(_, value) => setGroupType(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 56,
                flexShrink: 0,
                '& .MuiTab-root': {
                  minHeight: 56,
                  textTransform: 'none'
                }
              }}
            >
              {GROUP_TABS.map((tab) => (
                <Tab key={tab.value} value={tab.value} label={tab.label} icon={<Icon icon={tab.icon} width={18} />} iconPosition="start" />
              ))}
            </Tabs>

            <Box
              sx={{
                ml: { xl: 0.5 },
                px: 0.75,
                py: 0.5,
                borderRadius: 2.5,
                border: 1,
                borderColor: 'divider',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.04) : alpha(theme.palette.common.black, 0.03),
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark' ? 'inset 0 0 0 1px rgba(255,255,255,0.03)' : 'inset 0 0 0 1px rgba(16,19,26,0.03)'
              }}
            >
              <Tabs
                value={metric}
                onChange={(_, value) => setMetric(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 34,
                  '& .MuiTabs-indicator': {
                    display: 'none'
                  },
                  '& .MuiTab-root': {
                    minHeight: 34,
                    minWidth: 'auto',
                    px: 1.2,
                    py: 0.25,
                    mr: 0.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '0.86rem',
                    color: 'text.secondary',
                    transition: 'all 0.18s ease'
                  },
                  '& .MuiTab-root:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
                    color: 'text.primary'
                  },
                  '& .Mui-selected': {
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#7B90BF' : '#1B2152'),
                    color: '#F6F7F8 !important',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark' ? '0 6px 16px rgba(123, 144, 191, 0.28)' : '0 6px 16px rgba(27, 33, 82, 0.22)'
                  }
                }}
              >
                {METRIC_TABS.map((tab) => (
                  <Tab
                    key={tab.value}
                    value={tab.value}
                    label={tab.label}
                    icon={<Icon icon={tab.icon} width={16} />}
                    iconPosition="start"
                  />
                ))}
              </Tabs>
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Chip label={`当前维度：${currentGroupLabel}`} variant="outlined" />
            <Chip label={`当前指标：${METRIC_TABS.find((item) => item.value === metric)?.label || 'Token'}`} variant="outlined" />
            <Typography variant="body2" color="text.secondary">
              指标切换会同步更新排行和趋势图。
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ p: 2.5 }}>
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 14 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} lg={5}>
                <RankingPanel rows={rankingRows} metric={metric} theme={theme} />
              </Grid>
              <Grid item xs={12} lg={7}>
                <TrendPanel trendData={trendData} metric={metric} theme={theme} title={`${currentGroupLabel}趋势`} />
              </Grid>
            </Grid>
          )}
        </Box>
      </Card>

      <SupportPanel chartData={supportChart} activeTab={opsTab} setActiveTab={setOpsTab} />
    </Stack>
  );
}
