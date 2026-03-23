import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
// material-ui
import { useTheme, styled } from '@mui/material/styles';
import { Box, Grid, Typography, Stack } from '@mui/material';

// third-party
import Chart from 'react-apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalOrderCard from 'ui-component/cards/Skeleton/EarningCard';
import { Icon } from '@iconify/react';
import { renderNumber } from 'utils/common';
import { useTranslation } from 'react-i18next';

const CardWrapper = styled(MainCard)(({ theme }) => ({
  borderRadius: `${theme.shape.borderRadius}px`,
  border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
  boxShadow: theme.palette.mode === 'dark' ? 'none' : '0px 1px 3px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
  height: '100%',
  display: 'flex',
  flexDirection: 'column'
}));

const getChartOptions = (theme, type = 'default') => {
  const getChartColor = () => {
    switch (type) {
      case 'request':
        return '#60A5FA'; // 浅蓝色
      case 'quota':
        return '#FBBF24'; // 黄色
      case 'token':
        return '#F87171'; // 红色
      default:
        return '#60A5FA';
    }
  };

  return {
    chart: {
      type: 'line',
      toolbar: {
        show: false
      },
      sparkline: {
        enabled: true
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    stroke: {
      curve: 'smooth',
      width: 2,
      lineCap: 'round'
    },
    grid: {
      show: false
    },
    xaxis: {
      type: 'category',
      labels: {
        show: false
      }
    },
    yaxis: {
      show: false,
      padding: {
        top: 2,
        bottom: 2
      }
    },
    colors: [getChartColor()],
    tooltip: {
      enabled: false
    },
    markers: {
      size: 3,
      strokeWidth: 0,
      hover: {
        size: 4,
        sizeOffset: 1
      }
    }
  };
};

// ===============================||仪表板 -总订单线图表卡 ||================================ //

const StatisticalLineChartCard = ({ isLoading, title, chartData, todayValue, lastDayValue, type = 'default' }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [activePoint, setActivePoint] = useState(null);
  const chartAreaRef = useRef(null);

  const points = chartData?.series?.[0]?.data || [];

  useEffect(() => {
    setActivePoint(null);
  }, [chartData]);

  const customChartData = chartData
    ? {
        ...chartData,
        options: {
          ...getChartOptions(theme, type),
          chart: {
            ...getChartOptions(theme, type).chart,
            sparkline: {
              enabled: true
            },
            parentHeightOffset: 0,
            toolbar: {
              show: false
            },
            padding: {
              right: 10
            }
          }
        }
      }
    : null;

  const handleChartMouseMove = (event) => {
    if (!chartAreaRef.current || points.length === 0) {
      return;
    }

    const rect = chartAreaRef.current.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const index = Math.round((relativeX / rect.width) * (points.length - 1));
    setActivePoint(points[index] || points[points.length - 1] || null);
  };

  const handleChartMouseLeave = () => {
    setActivePoint(null);
  };

  // 获取趋势图标
  const getTrendIcon = (percentChange) => {
    if (percentChange > 0) return 'mdi:trending-up';
    if (percentChange < 0) return 'mdi:trending-down';
    return 'mdi:trending-neutral';
  };

  // 获取趋势颜色
  const getTrendColor = (percentChange) => {
    if (percentChange > 0) return theme.palette.error.main;
    if (percentChange < 0) return theme.palette.success.main;
    return theme.palette.info.main;
  };

  // 计算百分比变化
  const getPercentChange = () => {
    const todayValueNum = parseFloat((todayValue || '0').toString().replace('$', ''));
    const lastDayValueNum = parseFloat((lastDayValue || '0').toString().replace('$', ''));

    if (todayValueNum === 0 && lastDayValueNum === 0) return 0;
    if (todayValueNum === 0 && lastDayValueNum > 0) return -100;
    if (todayValueNum > 0 && lastDayValueNum === 0) return 100;
    return Math.round(((todayValueNum - lastDayValueNum) / lastDayValueNum) * 100);
  };

  const percentChange = lastDayValue !== undefined ? getPercentChange() : 0;
  const trendIcon = getTrendIcon(percentChange);
  const trendColor = getTrendColor(percentChange);

  const formatPointValue = (point) => {
    if (!point) {
      return '';
    }

    if (type === 'quota') {
      return `$${renderNumber(point.y || 0)}`;
    }

    return renderNumber(point.y || 0);
  };

  const formatPointDate = (point) => {
    if (!point?.x || typeof point.x !== 'string') {
      return '';
    }

    const parts = point.x.split('-');
    if (parts.length !== 3) {
      return point.x;
    }

    return `${parts[1]}-${parts[2]}`;
  };

  const summaryText = activePoint
    ? `${formatPointDate(activePoint)} · ${formatPointValue(activePoint)}`
    : `${title} · ${t('dashboard_index.seven_day_trend')}`;

  return (
    <>
      {isLoading ? (
        <SkeletonTotalOrderCard />
      ) : (
        <CardWrapper border={false} content={false}>
          <Box
            sx={{
              p: 2,
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Grid container justifyContent="space-between" alignItems="center">
                  <Grid item>
                    <Typography
                      variant="h3"
                      sx={{
                        fontSize: '22px',
                        fontWeight: 500,
                        color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)'
                      }}
                    >
                      {renderNumber(todayValue || 0)}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme.palette.text.secondary,
                          fontSize: '12px',
                          fontWeight: 500,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {summaryText}
                      </Typography>
                      {!activePoint && lastDayValue !== undefined && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                            borderRadius: `${theme.shape.borderRadius}px`,
                            py: 0.5,
                            px: 1
                          }}
                        >
                          <Icon icon={trendIcon} style={{ color: trendColor, fontSize: '16px', marginRight: '4px' }} />
                          <Typography
                            variant="caption"
                            sx={{
                              color: trendColor,
                              fontSize: '12px',
                              fontWeight: 500
                            }}
                          >
                            {`${Math.abs(percentChange)}%`}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: 'auto',
                height: '45px',
                width: '100%'
              }}
            >
              <Box ref={chartAreaRef} onMouseMove={handleChartMouseMove} onMouseLeave={handleChartMouseLeave}>
                {customChartData && <Chart {...customChartData} height="45px" width="100%" />}
              </Box>
            </Box>
          </Box>
        </CardWrapper>
      )}
    </>
  );
};

StatisticalLineChartCard.propTypes = {
  isLoading: PropTypes.bool,
  title: PropTypes.string,
  chartData: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  todayValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  lastDayValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  type: PropTypes.string
};

export default StatisticalLineChartCard;
