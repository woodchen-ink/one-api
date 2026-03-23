import PropTypes from 'prop-types';
import { useState } from 'react';
import { Box, Skeleton, Tab, Tabs, Typography } from '@mui/material';
import Chart from 'react-apexcharts';
import { useTranslation } from 'react-i18next';
import SubCard from 'ui-component/cards/SubCard';
import QuotaLogWeek from './QuotaLogWeek';

function InsightTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-insight-tabpanel-${index}`}
      aria-labelledby={`dashboard-insight-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

InsightTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired
};

function a11yProps(index) {
  return {
    id: `dashboard-insight-tab-${index}`,
    'aria-controls': `dashboard-insight-tabpanel-${index}`
  };
}

const SevenDayInsightCard = ({ isLoading, chartDatas, quotaLogData }) => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);

  const tabItems = [{ label: t('dashboard_index.week_model_statistics') }, { label: t('dashboard_index.week_consumption_log') }];

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const renderChartContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ p: 2.5 }}>
          <Skeleton variant="text" width={180} height={28} />
          <Skeleton variant="text" width={120} height={20} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={420} />
        </Box>
      );
    }

    if (!chartDatas?.series) {
      return (
        <Box
          sx={{
            minHeight: 490,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2.5
          }}
        >
          <Typography variant="h3" color="text.secondary">
            {t('dashboard_index.no_data_available')}
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
        <Chart {...chartDatas} />
      </Box>
    );
  };

  return (
    <SubCard content={false}>
      <Box
        sx={{
          px: 2.5,
          pt: 1.5,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="seven day dashboard insights"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 44 }}
        >
          {tabItems.map((item, index) => (
            <Tab key={item.label} label={item.label} disableRipple sx={{ minHeight: 44, px: 1.5 }} {...a11yProps(index)} />
          ))}
        </Tabs>
      </Box>
      <InsightTabPanel value={tabValue} index={0}>
        {renderChartContent()}
      </InsightTabPanel>
      <InsightTabPanel value={tabValue} index={1}>
        <QuotaLogWeek data={quotaLogData} embedded />
      </InsightTabPanel>
    </SubCard>
  );
};

SevenDayInsightCard.propTypes = {
  chartDatas: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  isLoading: PropTypes.bool,
  quotaLogData: PropTypes.array
};

export default SevenDayInsightCard;
