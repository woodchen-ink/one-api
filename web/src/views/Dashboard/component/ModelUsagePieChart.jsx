import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ReactApexChart from 'react-apexcharts';
import {
  Grid,
  Typography,
  useTheme,
  Box,
  Paper,
  alpha,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { useTranslation } from 'react-i18next';
import { renderQuota, timestamp2string } from 'utils/common';

const TokenUsageTable = ({ data, isLoading }) => {
  const { t } = useTranslation();
  const rows = data.slice(0, 8);

  return (
    <TableContainer component={Paper} elevation={0} sx={{ boxShadow: 'none', bgcolor: 'transparent', maxHeight: 380 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('token_index.name')}</TableCell>
            <TableCell align="right">{t('dashboard_index.request_count')}</TableCell>
            <TableCell align="right">{t('dashboard_index.amount')}</TableCell>
            <TableCell align="right">{t('token_index.accessedTime')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography variant="body2">{t('dashboard_index.loading')}</Typography>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography variant="h4" color="text.secondary">
                  {t('dashboard_index.no_data')}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((item) => (
              <TableRow key={item.token_id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {item.token_name || `#${item.token_id}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #{item.token_id}
                  </Typography>
                </TableCell>
                <TableCell align="right">{item.request_count}</TableCell>
                <TableCell align="right">{renderQuota(item.quota, 6)}</TableCell>
                <TableCell align="right">{item.last_used_at ? timestamp2string(item.last_used_at) : '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

TokenUsageTable.propTypes = {
  data: PropTypes.array,
  isLoading: PropTypes.bool
};

const ModelUsagePieChart = ({ isLoading, data, todayTokenUsage, weekTokenUsage, tokenUsageLoading }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [tab, setTab] = useState(0);

  const generateColors = () => {
    const baseColors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.info.main,
      '#9c27b0',
      '#00bcd4',
      '#607d8b',
      '#ff9800'
    ];

    const allColors = [];
    baseColors.forEach((color) => {
      allColors.push(color);
      allColors.push(alpha(color, 0.7));
      allColors.push(alpha(color, 0.4));
    });

    return allColors;
  };

  const chartData = {
    options: {
      chart: {
        type: 'donut',
        fontFamily: theme.typography.fontFamily,
        background: 'transparent',
        toolbar: {
          show: false
        }
      },
      labels: data.map((item) => item.name),
      colors: generateColors(),
      dataLabels: {
        enabled: false
      },
      legend: {
        show: true,
        fontSize: '12px',
        position: 'bottom',
        offsetY: 6,
        labels: {
          colors: theme.palette.text.primary
        },
        markers: {
          width: 10,
          height: 10,
          radius: 5
        },
        itemMargin: {
          horizontal: 10,
          vertical: 4
        },
        formatter: function (seriesName, opts) {
          return [seriesName, ' - ', opts.w.globals.series[opts.seriesIndex]];
        }
      },
      stroke: {
        width: 0,
        colors: [theme.palette.background.paper]
      },
      tooltip: {
        theme: theme.palette.mode,
        style: {
          fontSize: '14px',
          fontFamily: theme.typography.fontFamily
        },
        y: {
          formatter: function (value) {
            return value.toLocaleString();
          }
        },
        custom: ({ seriesIndex, w }) => {
          const name = w.globals.labels[seriesIndex];
          const value = w.globals.series[seriesIndex];
          return `<div class="custom-tooltip" style="padding: 8px; color: ${theme.palette.text.primary}; background: ${theme.palette.background.paper}; box-shadow: ${theme.shadows[3]}; border-radius: 4px; border: none;">
                    <span>${name}: <b>${value.toLocaleString()}</b></span>
                  </div>`;
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '16px',
                offsetY: -6,
                fontWeight: 600,
                color: theme.palette.text.primary
              },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 600,
                color: theme.palette.text.primary,
                formatter: function (val) {
                  return val.toLocaleString();
                }
              },
              total: {
                show: true,
                label: t('dashboard_index.total'),
                fontSize: '13px',
                fontWeight: 400,
                color: theme.palette.text.secondary,
                formatter: function (w) {
                  return w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString();
                }
              }
            }
          }
        }
      },
      states: {
        hover: {
          filter: {
            type: 'none'
          }
        },
        active: {
          filter: {
            type: 'none'
          }
        }
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 340
            },
            legend: {
              position: 'bottom',
              fontSize: '12px'
            }
          }
        }
      ]
    },
    series: data.map((item) => item.value)
  };

  const tabConfigs = [
    { key: 'model', label: t('dashboard_index.model_usage_tab') },
    { key: 'today', label: t('dashboard_index.today_token_usage_tab') },
    { key: 'week', label: t('dashboard_index.week_token_usage_tab') }
  ];

  return (
    <MainCard
      sx={{
        borderRadius: `${theme.shape.borderRadius}px`,
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.2)' : '0 8px 24px rgba(0,0,0,0.05)'
      }}
    >
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 0,
              '& .MuiTab-root': {
                minHeight: 0,
                px: 1.25,
                py: 0.5,
                textTransform: 'none',
                fontSize: '0.9rem'
              }
            }}
          >
            {tabConfigs.map((item) => (
              <Tab key={item.key} label={item.label} />
            ))}
          </Tabs>
        </Grid>
        <Grid item xs={12}>
          {tab === 0 ? (
            isLoading ? (
              <Box sx={{ pt: 3, px: 2 }}>
                <Typography>Loading...</Typography>
              </Box>
            ) : data.length > 0 ? (
              <Paper
                elevation={0}
                sx={{
                  bgcolor: 'transparent',
                  position: 'relative',
                  borderRadius: `${theme.shape.borderRadius}px`,
                  overflow: 'hidden',
                  p: 1
                }}
              >
                <ReactApexChart options={chartData.options} series={chartData.series} type="donut" height={380} />
              </Paper>
            ) : (
              <Box
                sx={{
                  height: 320,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: `${theme.shape.borderRadius}px`,
                  bgcolor: alpha(theme.palette.primary.light, 0.05)
                }}
              >
                <Typography
                  variant="h3"
                  color={theme.palette.text.secondary}
                  sx={{
                    fontWeight: 500,
                    opacity: 0.7
                  }}
                >
                  {t('dashboard_index.no_data_available')}
                </Typography>
              </Box>
            )
          ) : tab === 1 ? (
            <TokenUsageTable data={todayTokenUsage} isLoading={tokenUsageLoading} />
          ) : (
            <TokenUsageTable data={weekTokenUsage} isLoading={tokenUsageLoading} />
          )}
        </Grid>
      </Grid>
    </MainCard>
  );
};

ModelUsagePieChart.propTypes = {
  data: PropTypes.array,
  isLoading: PropTypes.bool,
  todayTokenUsage: PropTypes.array,
  tokenUsageLoading: PropTypes.bool,
  weekTokenUsage: PropTypes.array
};

export default ModelUsagePieChart;
