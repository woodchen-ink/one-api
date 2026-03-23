import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { getHeaderDesktopNavItems } from './headerConfig';

function isActivePath(pathname, item) {
  if (item.type !== 'route' || !item.to) {
    return false;
  }

  if (item.to === '/') {
    return pathname === '/';
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function HeaderDesktopNav({ showStatus = false }) {
  const theme = useTheme();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const siteInfo = useSelector((state) => state.siteInfo);
  const items = getHeaderDesktopNavItems({ t, siteInfo, showStatus });

  return (
    <>
      {items.map((item) => {
        const active = isActivePath(pathname, item);
        const commonSx = {
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          color: active ? theme.palette.primary.main : theme.palette.text.primary,
          minWidth: 'auto',
          px: 1.5
        };

        if (item.type === 'external') {
          return (
            <Button key={item.key} component="a" variant="text" href={item.href} target="_blank" rel="noopener noreferrer" sx={commonSx}>
              {item.label}
            </Button>
          );
        }

        return (
          <Button key={item.key} component={Link} variant="text" to={item.to} color={active ? 'primary' : 'inherit'} sx={commonSx}>
            {item.label}
          </Button>
        );
      })}
    </>
  );
}

HeaderDesktopNav.propTypes = {
  showStatus: PropTypes.bool
};
