import React, { useState } from 'react';
import { Box, Button, FormControl, InputAdornment, InputLabel, OutlinedInput, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';

import SubCard from 'ui-component/cards/SubCard';
import { API } from 'utils/api';
import { showError, showInfo, showSuccess, trims } from 'utils/common';
import { useTranslation } from 'react-i18next';

const RedemptionCard = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [redemptionCode, setRedemptionCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const panelSx = {
    borderRadius: 3,
    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.28) : alpha(theme.palette.grey[50], 0.7),
    p: { xs: 1.5, sm: 2 }
  };

  const topUp = async () => {
    if (redemptionCode === '') {
      showInfo(t('topupCard.inputPlaceholder'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post('/api/user/topup', {
        key: trims(redemptionCode)
      });
      const { success, message, upgradedToVIP } = res.data;

      if (success) {
        if (upgradedToVIP) {
          showSuccess('充值成功，升级为 VIP 会员！');
        } else {
          showSuccess('充值成功，谢谢。');
        }
        setRedemptionCode('');
      } else {
        showError(message);
      }
    } catch (err) {
      showError('失败,请右下角联系客服');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SubCard sx={{ borderRadius: 3 }} contentSX={{ p: { xs: 2, sm: 2.5 } }} title={t('topupCard.redemptionCodeTopup')}>
      <Stack spacing={2.5}>
        <Box
          sx={{
            ...panelSx,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexDirection: { xs: 'column', sm: 'row' }
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1)
              }}
            >
              <Icon icon="solar:ticket-sale-linear" width={20} />
            </Box>
            <Box>
              <Typography variant="subtitle2">{t('topupCard.redemptionCodeTopup')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('topupCard.inputPlaceholder')}
              </Typography>
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
            {t('topupPage.redemptionModeDescription')}
          </Typography>
        </Box>

        <Box sx={panelSx}>
          <FormControl fullWidth variant="outlined">
            <InputLabel htmlFor="key">{t('topupCard.inputLabel')}</InputLabel>
            <OutlinedInput
              id="key"
              label={t('topupCard.inputLabel')}
              type="text"
              value={redemptionCode}
              onChange={(e) => setRedemptionCode(e.target.value)}
              name="key"
              placeholder={t('topupCard.inputPlaceholder')}
              endAdornment={
                <InputAdornment position="end">
                  <Button variant="contained" onClick={topUp} disabled={isSubmitting} sx={{ borderRadius: 2 }}>
                    {isSubmitting ? t('topupCard.exchangeButton.submitting') : t('topupCard.exchangeButton.default')}
                  </Button>
                </InputAdornment>
              }
              aria-describedby="helper-text-channel-quota-label"
            />
          </FormControl>
        </Box>
      </Stack>
    </SubCard>
  );
};

export default RedemptionCard;
