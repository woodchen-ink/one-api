import PropTypes from 'prop-types';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { renderQuota, timestamp2string } from 'utils/common';
import { useTranslation } from 'react-i18next';
import SubCard from 'ui-component/cards/SubCard';

const TodayTokenUsageCard = ({ data, isLoading }) => {
  const { t } = useTranslation();
  const rows = data.slice(0, 8);

  return (
    <SubCard title={t('dashboard_index.today_token_usage')} contentSX={{ p: 0 }}>
      <TableContainer component={Paper} sx={{ boxShadow: 'none', p: 2, maxHeight: 320 }}>
        <Table stickyHeader size="small" aria-label="today token usage table">
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
    </SubCard>
  );
};

TodayTokenUsageCard.propTypes = {
  data: PropTypes.array,
  isLoading: PropTypes.bool
};

export default TodayTokenUsageCard;
