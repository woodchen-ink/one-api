// material-ui
import { Box, Chip, Divider, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

// project imports
import NavGroup from './NavGroup';
import menuItem from 'menu-items';
import { useIsAdmin } from 'utils/common';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

// ==============================|| SIDEBAR MENU LIST ||============================== //
const MenuList = ({ isMini = false }) => {
  const theme = useTheme();
  const userIsAdmin = useIsAdmin();
  const { t } = useTranslation();
  const siteInfo = useSelector((state) => state.siteInfo);

  const translateMenuNode = (node) => ({
    ...node,
    title: node.id ? t(node.id, node.title) : node.title,
    children: node.children?.map(translateMenuNode)
  });

  const filterSectionNode = (node, section) => {
    if (node.type === 'item') {
      const visibleForSection = section === 'admin' ? node.isAdmin === true : node.isAdmin !== true;
      const invoiceVisible = !(siteInfo.UserInvoiceMonth === false && node.id === 'invoice');
      return visibleForSection && invoiceVisible ? node : null;
    }

    if (section === 'user' && node.isAdmin === true) {
      return null;
    }

    const filteredChildren = node.children?.map((child) => filterSectionNode(child, section)).filter(Boolean) || [];
    return filteredChildren.length > 0 ? { ...node, children: filteredChildren } : null;
  };

  const translatedGroups = menuItem.items.map(translateMenuNode);
  const userGroups = translatedGroups.map((group) => filterSectionNode(group, 'user')).filter(Boolean);
  const adminGroups = userIsAdmin ? translatedGroups.map((group) => filterSectionNode(group, 'admin')).filter(Boolean) : [];
  const showSplitSections = userGroups.length > 0 && adminGroups.length > 0;

  const sectionHeaderStyles = (isAdminSection) => ({
    borderRadius: `${theme.shape.borderRadius}px`,
    borderColor: isAdminSection ? alpha(theme.palette.secondary.main, 0.24) : theme.palette.divider,
    color: isAdminSection ? theme.palette.secondary.dark : theme.palette.text.secondary,
    backgroundColor: isAdminSection
      ? alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1)
      : alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.85 : 0.92)
  });

  const renderSectionHeader = (label, section) => {
    const isAdminSection = section === 'admin';
    const chipLabel = isAdminSection ? 'A' : 'U';

    if (isMini) {
      return (
        <Tooltip key={section} title={label} placement="right">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5, mb: 0.5 }}>
            <Chip
              size="small"
              label={chipLabel}
              sx={{
                minWidth: 24,
                height: 20,
                fontSize: '0.625rem',
                fontWeight: 700,
                ...sectionHeaderStyles(isAdminSection)
              }}
            />
          </Box>
        </Tooltip>
      );
    }

    return (
      <Stack key={section} direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
        <Divider sx={{ flex: 1, borderColor: theme.palette.divider }} />
        <Chip
          size="small"
          label={label}
          sx={{
            height: 22,
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            ...sectionHeaderStyles(isAdminSection)
          }}
        />
        <Divider sx={{ flex: 1, borderColor: theme.palette.divider }} />
      </Stack>
    );
  };

  const renderGroups = (groups) =>
    groups.map((item) => {
      if (item.type !== 'group') {
        return (
          <Typography key={item.id} variant="h6" color="error" align="center">
            {t('menu.error')}
          </Typography>
        );
      }

      return <NavGroup key={item.id} item={item} isMini={isMini} />;
    });

  return (
    <>
      {showSplitSections && renderSectionHeader(t('sidebar.userMenu', '普通用户菜单'), 'user')}
      {renderGroups(userGroups)}

      {showSplitSections && renderSectionHeader(t('sidebar.adminMenu', '管理员菜单'), 'admin')}
      {renderGroups(adminGroups)}
    </>
  );
};

export default MenuList;
