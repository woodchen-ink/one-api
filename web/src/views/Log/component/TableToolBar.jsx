import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { Box, InputAdornment, OutlinedInput, FormControl, InputLabel } from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import 'dayjs/locale/zh-cn';

// ----------------------------------------------------------------------

export default function TableToolBar({ filterName, handleFilterName, userIsAdmin }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const grey500 = theme.palette.grey[500];
  const filterGridColumns = userIsAdmin
    ? { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(7, minmax(0, 1fr))' }
    : { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' };
  const compactFieldSx = {
    minWidth: 0,
    '& .MuiInputBase-root': {
      minWidth: 0
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'zh-cn'}>
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            alignItems: 'start',
            gridTemplateColumns: filterGridColumns
          }}
        >
          <FormControl fullWidth size="small" sx={compactFieldSx}>
            <InputLabel htmlFor="channel-key_name-label">{t('tableToolBar.tokenName')}</InputLabel>
            <OutlinedInput
              id="key_name"
              name="key_name"
              size="small"
              sx={compactFieldSx}
              label={t('tableToolBar.tokenName')}
              value={filterName.key_name}
              onChange={handleFilterName}
              placeholder={t('tableToolBar.tokenName')}
              startAdornment={
                <InputAdornment position="start">
                  <Icon icon="solar:key-bold-duotone" width="18" color={grey500} />
                </InputAdornment>
              }
            />
          </FormControl>
          <FormControl fullWidth size="small" sx={compactFieldSx}>
            <InputLabel htmlFor="channel-model_name-label">{t('tableToolBar.modelName')}</InputLabel>
            <OutlinedInput
              id="model_name"
              name="model_name"
              size="small"
              sx={compactFieldSx}
              label={t('tableToolBar.modelName')}
              value={filterName.model_name}
              onChange={handleFilterName}
              placeholder={t('tableToolBar.modelName')}
              startAdornment={
                <InputAdornment position="start">
                  <Icon icon="solar:box-minimalistic-bold-duotone" width="18" color={grey500} />
                </InputAdornment>
              }
            />
          </FormControl>
          {userIsAdmin && (
            <FormControl fullWidth size="small" sx={compactFieldSx}>
              <InputLabel htmlFor="channel-source_ip-label">{t('tableToolBar.sourceIp')}</InputLabel>
              <OutlinedInput
                id="source_ip"
                name="source_ip"
                size="small"
                sx={compactFieldSx}
                label={t('tableToolBar.sourceIp')}
                value={filterName.source_ip}
                onChange={handleFilterName}
                placeholder={t('tableToolBar.sourceIp')}
                startAdornment={
                  <InputAdornment position="start">
                    <Icon icon="solar:user-bold-duotone" width="18" color={grey500} />
                  </InputAdornment>
                }
              />
            </FormControl>
          )}
          <DateTimePicker
            label={t('tableToolBar.startTime')}
            ampm={false}
            name="start_timestamp"
            value={filterName.start_timestamp === 0 ? null : dayjs.unix(filterName.start_timestamp)}
            onChange={(value) => {
              if (value === null) {
                handleFilterName({ target: { name: 'start_timestamp', value: 0 } });
                return;
              }
              handleFilterName({ target: { name: 'start_timestamp', value: value.unix() } });
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                sx: compactFieldSx
              },
              actionBar: {
                actions: ['clear', 'today', 'accept']
              }
            }}
          />
          <DateTimePicker
            label={t('tableToolBar.endTime')}
            name="end_timestamp"
            ampm={false}
            value={filterName.end_timestamp === 0 ? null : dayjs.unix(filterName.end_timestamp)}
            onChange={(value) => {
              if (value === null) {
                handleFilterName({ target: { name: 'end_timestamp', value: 0 } });
                return;
              }
              handleFilterName({ target: { name: 'end_timestamp', value: value.unix() } });
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                sx: compactFieldSx
              },
              actionBar: {
                actions: ['clear', 'today', 'accept']
              }
            }}
          />
          {userIsAdmin && (
            <FormControl fullWidth size="small" sx={compactFieldSx}>
              <InputLabel htmlFor="channel-channel_id-label">{t('tableToolBar.channelId')}</InputLabel>
              <OutlinedInput
                id="channel_id"
                name="channel_id"
                size="small"
                sx={compactFieldSx}
                label={t('tableToolBar.channelId')}
                value={filterName.channel_id}
                onChange={handleFilterName}
                placeholder={t('tableToolBar.channelId')}
                startAdornment={
                  <InputAdornment position="start">
                    <Icon icon="ph:open-ai-logo-duotone" width="18" color={grey500} />
                  </InputAdornment>
                }
              />
            </FormControl>
          )}
          {userIsAdmin && (
            <FormControl fullWidth size="small" sx={compactFieldSx}>
              <InputLabel htmlFor="channel-username-label">{t('tableToolBar.username')}</InputLabel>
              <OutlinedInput
                id="username"
                name="username"
                size="small"
                sx={compactFieldSx}
                label={t('tableToolBar.username')}
                value={filterName.username}
                onChange={handleFilterName}
                placeholder={t('tableToolBar.username')}
                startAdornment={
                  <InputAdornment position="start">
                    <Icon icon="solar:user-bold-duotone" width="18" color={grey500} />
                  </InputAdornment>
                }
              />
            </FormControl>
          )}
        </Box>
      </Box>
    </LocalizationProvider>
  );
}

TableToolBar.propTypes = {
  filterName: PropTypes.object,
  handleFilterName: PropTypes.func,
  userIsAdmin: PropTypes.bool
};
