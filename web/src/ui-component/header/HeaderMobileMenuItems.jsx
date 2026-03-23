import PropTypes from 'prop-types';
import { ListItemButton, ListItemText, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { getHeaderMobileMenuItems } from './headerConfig';

function isActivePath(pathname, item) {
  if (item.type !== 'route' || !item.to) {
    return false;
  }

  if (item.to === '/') {
    return pathname === '/';
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function HeaderMobileMenuItems({ showStatus = false, showAbout = false }) {
  const theme = useTheme();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const siteInfo = useSelector((state) => state.siteInfo);
  const items = getHeaderMobileMenuItems({ t, siteInfo, showStatus, showAbout });

  return (
    <>
      {items.map((item) => {
        const active = isActivePath(pathname, item);

        return (
          <ListItemButton
            key={item.key}
            component={item.type === 'external' ? 'a' : Link}
            to={item.type === 'route' ? item.to : undefined}
            href={item.type === 'external' ? item.href : undefined}
            target={item.type === 'external' ? '_blank' : undefined}
            rel={item.type === 'external' ? 'noopener noreferrer' : undefined}
            selected={active}
          >
            <ListItemText
              primary={
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: active ? 500 : 400,
                    textAlign: 'center',
                    color: active ? theme.palette.primary.main : theme.palette.text.primary
                  }}
                >
                  {item.label}
                </Typography>
              }
            />
          </ListItemButton>
        );
      })}
    </>
  );
}

HeaderMobileMenuItems.propTypes = {
  showAbout: PropTypes.bool,
  showStatus: PropTypes.bool
};
