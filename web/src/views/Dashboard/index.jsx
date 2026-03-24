import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Grid, Box, Stack, Button } from '@mui/material';
import { gridSpacing } from 'store/constant';
import StatisticalLineChartCard from './component/StatisticalLineChartCard';
import { getLastSevenDays, generateBarChartOptions, renderChartNumber } from 'utils/chart';
import { API } from 'utils/api';
import { showError, calculateQuota } from 'utils/common';
import ModelUsagePieChart from './component/ModelUsagePieChart';
import { useTranslation } from 'react-i18next';
import RPM from './component/RPM';
import StatusPanel from './component/StatusPanel';
import SevenDayInsightCard from './component/SevenDayInsightCard';
import { useSelector } from 'react-redux';

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`dashboard-tabpanel-${index}`} aria-labelledby={`dashboard-tab-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number,
  value: PropTypes.number
};

const Dashboard = () => {
  const [isLoading, setLoading] = useState(true);
  const [keyUsageLoading, setKeyUsageLoading] = useState(true);
  const [statisticalData, setStatisticalData] = useState([]);
  const [requestChart, setRequestChart] = useState(null);
  const [quotaChart, setQuotaChart] = useState(null);
  const [tokenChart, setTokenChart] = useState(null);
  const { t } = useTranslation();
  const [modelUsageData, setModelUsageData] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);

  const [dashboardData, setDashboardData] = useState(null);
  const [todayKeyUsage, setTodayKeyUsage] = useState([]);
  const [weekKeyUsage, setWeekKeyUsage] = useState([]);
  const siteInfo = useSelector((state) => state.siteInfo);

  const handleTabChange = (newValue) => {
    setCurrentTab(newValue);
  };

  const userDashboard = async () => {
    try {
      const res = await API.get('/api/user/dashboard');
      const { success, message, data } = res.data;
      if (success) {
        if (data) {
          setDashboardData(data);
          let lineData = getLineDataGroup(data);
          setRequestChart(getLineCardOption(lineData, 'RequestCount'));
          setQuotaChart(getLineCardOption(lineData, 'Quota'));
          setTokenChart(getLineCardOption(lineData, 'PromptTokens'));
          setStatisticalData(getBarDataGroup(data));
          setModelUsageData(getModelUsageData(data));
        }
      } else {
        showError(message);
      }
      setLoading(false);
    } catch (error) {
      return;
    }
  };

  const fetchKeyUsage = async () => {
    setKeyUsageLoading(true);
    try {
      const [todayRes, weekRes] = await Promise.all([
        API.get('/api/user/dashboard/key-usage', {
          params: { period: 'today' }
        }),
        API.get('/api/user/dashboard/key-usage', {
          params: { period: '7d' }
        })
      ]);

      const { success: todaySuccess, message: todayMessage, data: todayData } = todayRes.data;
      const { success: weekSuccess, message: weekMessage, data: weekData } = weekRes.data;

      if (todaySuccess) {
        setTodayKeyUsage(todayData || []);
      } else {
        showError(todayMessage);
      }

      if (weekSuccess) {
        setWeekKeyUsage(weekData || []);
      } else {
        showError(weekMessage);
      }
    } catch (error) {
      return;
    } finally {
      setKeyUsageLoading(false);
    }
  };

  useEffect(() => {
    userDashboard();
    fetchKeyUsage();
  }, []);

  // Dashboard content
  const dashboardContent = (
    <Grid container spacing={gridSpacing}>
      {/* 今日请求、消费、token */}
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item lg={3} xs={12} sx={{ height: '160' }}>
            <StatisticalLineChartCard
              isLoading={isLoading}
              title={t('dashboard_index.today_requests')}
              type="request"
              chartData={requestChart?.chartData}
              todayValue={requestChart?.todayValue}
              lastDayValue={requestChart?.lastDayValue}
            />
          </Grid>
          <Grid item lg={3} xs={12} sx={{ height: '160' }}>
            <StatisticalLineChartCard
              isLoading={isLoading}
              title={t('dashboard_index.today_consumption')}
              type="quota"
              chartData={quotaChart?.chartData}
              todayValue={quotaChart?.todayValue}
              lastDayValue={quotaChart?.lastDayValue}
            />
          </Grid>
          <Grid item lg={3} xs={12} sx={{ height: '160' }}>
            <StatisticalLineChartCard
              isLoading={isLoading}
              title={t('dashboard_index.today_tokens')}
              type="token"
              chartData={tokenChart?.chartData}
              todayValue={tokenChart?.todayValue}
              lastDayValue={tokenChart?.lastDayValue}
            />
          </Grid>
          <Grid item lg={3} xs={12} sx={{ height: '160' }}>
            <RPM />
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item lg={8} xs={12}>
            <SevenDayInsightCard isLoading={isLoading} chartDatas={statisticalData} quotaLogData={dashboardData} />
          </Grid>

          <Grid item lg={4} xs={12}>
            <ModelUsagePieChart
              isLoading={isLoading}
              data={modelUsageData}
              todayKeyUsage={todayKeyUsage}
              weekKeyUsage={weekKeyUsage}
              keyUsageLoading={keyUsageLoading}
            />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Stack direction="row" alignItems="center" spacing={3}>
          {siteInfo.UptimeEnabled && (
            <Stack direction="row" spacing={1}>
              <Button
                onClick={() => handleTabChange(0)}
                variant={currentTab === 0 ? 'contained' : 'text'}
                size="small"
                disableElevation
                sx={{
                  padding: '6px 16px',
                  borderRadius: '4px',
                  backgroundColor: currentTab === 0 ? 'primary.main' : 'transparent',
                  color: currentTab === 0 ? 'white' : 'text.primary',
                  '&:hover': {
                    backgroundColor: currentTab === 0 ? 'primary.dark' : 'action.hover'
                  }
                }}
              >
                {t('dashboard_index.tab_dashboard')}
              </Button>
              <Button
                onClick={() => handleTabChange(1)}
                variant={currentTab === 1 ? 'contained' : 'text'}
                size="small"
                disableElevation
                sx={{
                  padding: '6px 16px',
                  borderRadius: '4px',
                  backgroundColor: currentTab === 1 ? 'primary.main' : 'transparent',
                  color: currentTab === 1 ? 'white' : 'text.primary',
                  '&:hover': {
                    backgroundColor: currentTab === 1 ? 'primary.dark' : 'action.hover'
                  }
                }}
              >
                {t('dashboard_index.tab_status')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Stack>

      {siteInfo.UptimeEnabled ? (
        <>
          <TabPanel value={currentTab} index={0}>
            {dashboardContent}
          </TabPanel>
          <TabPanel value={currentTab} index={1}>
            <StatusPanel />
          </TabPanel>
        </>
      ) : (
        dashboardContent
      )}
    </>
  );
};

// 新增函数来处理模型使用数据
function getModelUsageData(data) {
  const modelUsage = {};
  data.forEach((item) => {
    if (!modelUsage[item.ModelName]) {
      modelUsage[item.ModelName] = 0;
    }
    modelUsage[item.ModelName] += item.RequestCount;
  });

  return Object.entries(modelUsage).map(([name, count]) => ({
    name,
    value: count
  }));
}

export default Dashboard;

function getLineDataGroup(statisticalData) {
  let groupedData = statisticalData.reduce((acc, cur) => {
    if (!acc[cur.Date]) {
      acc[cur.Date] = {
        date: cur.Date,
        RequestCount: 0,
        Quota: 0,
        PromptTokens: 0,
        CompletionTokens: 0
      };
    }
    acc[cur.Date].RequestCount += cur.RequestCount;
    acc[cur.Date].Quota += cur.Quota;
    acc[cur.Date].PromptTokens += cur.PromptTokens;
    acc[cur.Date].CompletionTokens += cur.CompletionTokens;
    return acc;
  }, {});
  let lastSevenDays = getLastSevenDays();
  return lastSevenDays.map((Date) => {
    if (!groupedData[Date]) {
      return {
        date: Date,
        RequestCount: 0,
        Quota: 0,
        PromptTokens: 0,
        CompletionTokens: 0
      };
    } else {
      return groupedData[Date];
    }
  });
}

function getBarDataGroup(data) {
  const lastSevenDays = getLastSevenDays();
  const result = [];
  const map = new Map();
  let totalCosts = 0;

  for (const item of data) {
    if (!map.has(item.ModelName)) {
      const newData = { name: item.ModelName, data: new Array(7).fill(0) };
      map.set(item.ModelName, newData);
      result.push(newData);
    }
    const index = lastSevenDays.indexOf(item.Date);
    if (index !== -1) {
      let costs = Number(calculateQuota(item.Quota, 3));
      map.get(item.ModelName).data[index] = costs;
      totalCosts += parseFloat(costs.toFixed(3));
    }
  }

  let chartData = generateBarChartOptions(lastSevenDays, result, 'USD', 3);
  chartData.options.title.text = 'Total：$' + renderChartNumber(totalCosts, 3);

  return chartData;
}

function getLineCardOption(lineDataGroup, field) {
  let todayValue = 0;
  let lastDayValue = 0;
  let chartData = null;

  let lineData = lineDataGroup.map((item) => {
    let tmp = {
      x: item.date,
      y: item[field]
    };
    switch (field) {
      case 'Quota':
        tmp.y = calculateQuota(item.Quota, 3);
        break;
      case 'PromptTokens':
        tmp.y += item.CompletionTokens;
        break;
    }

    return tmp;
  });

  // 获取今天和昨天的数据
  if (lineData.length > 1) {
    todayValue = lineData[lineData.length - 1].y;
    if (lineData.length > 2) {
      lastDayValue = lineData[lineData.length - 2].y;
    }
  }

  switch (field) {
    case 'RequestCount':
      // chartData = generateLineChartOptions(lineData, '次');
      lastDayValue = parseFloat(lastDayValue);
      todayValue = parseFloat(todayValue);
      break;
    case 'Quota':
      // chartData = generateLineChartOptions(lineData, '美元');
      lastDayValue = parseFloat(lastDayValue);
      todayValue = '$' + parseFloat(todayValue);
      break;
    case 'PromptTokens':
      // chartData = generateLineChartOptions(lineData, '');
      lastDayValue = parseFloat(lastDayValue);
      todayValue = parseFloat(todayValue);
      break;
  }

  chartData = {
    series: [
      {
        data: lineData
      }
    ]
  };

  return { chartData: chartData, todayValue: todayValue, lastDayValue: lastDayValue };
}
