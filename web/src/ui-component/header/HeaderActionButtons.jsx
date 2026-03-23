import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';

import { CustomerServiceButton } from 'ui-component/customer-service';
import I18nButton from 'ui-component/i18nButton';
import { NoticeButton } from 'ui-component/notice';

export function HeaderActionButtons({ mobile = false }) {
  const theme = useTheme();

  if (mobile) {
    return (
      <>
        <NoticeButton sx={{ mr: 0.5 }} />
        <CustomerServiceButton sx={{ mr: 0.5 }} />
        <I18nButton sx={{ color: theme.palette.text.primary, ml: 0, mr: 1 }} />
      </>
    );
  }

  return (
    <>
      <NoticeButton sx={{ mx: 0.5 }} />
      <CustomerServiceButton sx={{ mr: 0.5 }} />
      <I18nButton sx={{ color: theme.palette.text.primary, ml: 0.5, mr: 0 }} />
    </>
  );
}

HeaderActionButtons.propTypes = {
  mobile: PropTypes.bool
};
