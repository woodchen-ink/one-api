import { useState, useEffect } from 'react';
import { showError, showSuccess, timestamp2string } from 'utils/common';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import PerfectScrollbar from 'react-perfect-scrollbar';
import TablePagination from '@mui/material/TablePagination';
import LinearProgress from '@mui/material/LinearProgress';
import ButtonGroup from '@mui/material/ButtonGroup';
import Toolbar from '@mui/material/Toolbar';

import {
  Button,
  Card,
  Stack,
  Container,
  TableRow,
  TableCell,
  IconButton,
  Popover,
  MenuItem,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput
} from '@mui/material';
import KeywordTableHead from 'ui-component/TableHead';
import Label from 'ui-component/Label';
import { API } from 'utils/api';
import { PAGE_SIZE_OPTIONS, getPageSize, savePageSize } from 'constants';
import AdjustModal from './component/AdjustModal';
import AssignModal from './component/AssignModal';
import { Icon } from '@iconify/react';

import { useTranslation } from 'react-i18next';
// ----------------------------------------------------------------------

const statusMap = {
  active: 'success',
  expired: 'default',
  revoked: 'error'
};

export default function UserSubscription() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('id');
  const [rowsPerPage, setRowsPerPage] = useState(() => getPageSize('userSubscription'));
  const [listCount, setListCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [refreshFlag, setRefreshFlag] = useState(false);

  const [openAdjust, setOpenAdjust] = useState(false);
  const [adjustSubId, setAdjustSubId] = useState(0);

  const [openAssign, setOpenAssign] = useState(false);

  // Filters
  const [filterUserId, setFilterUserId] = useState('');
  const [filterGroupSymbol, setFilterGroupSymbol] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Per-row menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRowId, setMenuRowId] = useState(null);

  const handleSort = (event, id) => {
    const isAsc = orderBy === id && order === 'asc';
    if (id !== '') {
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setPage(0);
    setRowsPerPage(newRowsPerPage);
    savePageSize('userSubscription', newRowsPerPage);
  };

  const fetchData = async (page, rowsPerPage, order, orderBy) => {
    setSearching(true);
    try {
      if (orderBy) {
        orderBy = order === 'desc' ? '-' + orderBy : orderBy;
      }
      const params = {
        page: page + 1,
        size: rowsPerPage,
        order: orderBy
      };
      if (filterUserId) params.user_id = filterUserId;
      if (filterGroupSymbol) params.group_symbol = filterGroupSymbol;
      if (filterStatus) params.status = filterStatus;

      const res = await API.get(`/api/user_subscription/admin/`, { params });
      const { success, message, data } = res.data;
      if (success) {
        setListCount(data.total_count);
        setSubscriptions(data.data);
      } else {
        showError(message);
      }
    } catch (error) {
      console.error(error);
    }
    setSearching(false);
  };

  const handleRefresh = async () => {
    setOrderBy('id');
    setOrder('desc');
    setRefreshFlag(!refreshFlag);
  };

  const handleSearch = () => {
    setPage(0);
    setRefreshFlag(!refreshFlag);
  };

  useEffect(() => {
    fetchData(page, rowsPerPage, order, orderBy);
  }, [page, rowsPerPage, order, orderBy, refreshFlag]);

  const handleRevoke = async (id) => {
    try {
      const res = await API.put(`/api/user_subscription/admin/revoke/${id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('userPage.operationSuccess'));
        await handleRefresh();
      } else {
        showError(message);
      }
    } catch (error) {
      return;
    }
  };

  const handleResetQuota = async (id) => {
    try {
      const res = await API.put(`/api/user_subscription/admin/reset/${id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('userPage.operationSuccess'));
        await handleRefresh();
      } else {
        showError(message);
      }
    } catch (error) {
      return;
    }
  };

  const handleOpenAdjust = (subId) => {
    setAdjustSubId(subId);
    setOpenAdjust(true);
  };

  const handleCloseAdjust = () => {
    setOpenAdjust(false);
    setAdjustSubId(0);
  };

  const handleOkAdjust = (status) => {
    if (status === true) {
      handleCloseAdjust();
      handleRefresh();
    }
  };

  const handleOpenAssign = () => {
    setOpenAssign(true);
  };

  const handleCloseAssign = () => {
    setOpenAssign(false);
  };

  const handleOkAssign = (status) => {
    if (status === true) {
      handleCloseAssign();
      handleRefresh();
    }
  };

  const handleOpenMenu = (event, rowId) => {
    setMenuAnchor(event.currentTarget);
    setMenuRowId(rowId);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuRowId(null);
  };

  const getUsagePercent = (used, total) => {
    if (!total || total === 0) return 0;
    return Math.min((used / total) * 100, 100);
  };

  return (
    <>
      <Card>
        <Toolbar
          sx={{
            textAlign: 'right',
            height: 50,
            display: 'flex',
            justifyContent: 'space-between',
            p: (theme) => theme.spacing(0, 1, 0, 3)
          }}
        >
          <Container maxWidth="xl">
            <ButtonGroup variant="outlined" aria-label="outlined small primary button group">
              <Button onClick={handleRefresh} startIcon={<Icon icon="solar:refresh-bold-duotone" width={18} />}>
                {t('userPage.refresh')}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Icon icon="solar:add-circle-line-duotone" />}
                onClick={handleOpenAssign}
              >
                {t('userSubscription.assign')}
              </Button>
            </ButtonGroup>
          </Container>
        </Toolbar>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 2, md: 3 }} padding={'16px'} paddingBottom={'0px'}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel htmlFor="filter-user-id">{t('userSubscription.userId')}</InputLabel>
            <OutlinedInput
              id="filter-user-id"
              label={t('userSubscription.userId')}
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              size="small"
            />
          </FormControl>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel htmlFor="filter-group-symbol">{t('userSubscription.groupSymbol')}</InputLabel>
            <OutlinedInput
              id="filter-group-symbol"
              label={t('userSubscription.groupSymbol')}
              value={filterGroupSymbol}
              onChange={(e) => setFilterGroupSymbol(e.target.value)}
              size="small"
            />
          </FormControl>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel htmlFor="filter-status">{t('userSubscription.status')}</InputLabel>
            <Select
              id="filter-status"
              label={t('userSubscription.status')}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              size="small"
            >
              <MenuItem value="">{t('userSubscription.all')}</MenuItem>
              <MenuItem value="active">{t('userSubscription.statusActive')}</MenuItem>
              <MenuItem value="expired">{t('userSubscription.statusExpired')}</MenuItem>
              <MenuItem value="revoked">{t('userSubscription.statusRevoked')}</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch} startIcon={<Icon icon="solar:magnifer-bold-duotone" width={18} />}>
            {t('userSubscription.search')}
          </Button>
        </Stack>

        {searching && <LinearProgress />}
        <PerfectScrollbar component="div">
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <KeywordTableHead
                order={order}
                orderBy={orderBy}
                onRequestSort={handleSort}
                headLabel={[
                  { id: 'id', label: t('userSubscription.id'), disableSort: false },
                  { id: 'username', label: t('userSubscription.username'), disableSort: true },
                  { id: 'plan_name', label: t('userSubscription.planName'), disableSort: true },
                  { id: 'group_symbol', label: t('userSubscription.groupSymbol'), disableSort: false },
                  { id: 'usage', label: t('userSubscription.usage'), disableSort: true, minWidth: 180 },
                  { id: 'expire_time', label: t('userSubscription.expireTime'), disableSort: false },
                  { id: 'status', label: t('userSubscription.status'), disableSort: false },
                  { id: 'action', label: t('userPage.action'), disableSort: true }
                ]}
              />
              <TableBody>
                {subscriptions.map((row) => {
                  const usagePercent = getUsagePercent(row.used_amount, row.quota_amount);
                  return (
                    <TableRow key={row.id} tabIndex={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.username}</TableCell>
                      <TableCell>{row.plan_name}</TableCell>
                      <TableCell>{row.group_symbol}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={usagePercent}
                              sx={{ height: 8, borderRadius: 4 }}
                              color={usagePercent >= 90 ? 'error' : usagePercent >= 70 ? 'warning' : 'primary'}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ minWidth: 80, textAlign: 'right' }}>
                            ${row.used_amount || 0} / ${row.quota_amount || 0}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{row.expire_time ? timestamp2string(row.expire_time) : '-'}</TableCell>
                      <TableCell>
                        <Label color={statusMap[row.status] || 'default'} variant="soft">
                          {t(`userSubscription.status${row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Unknown'}`)}
                        </Label>
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={(e) => handleOpenMenu(e, row.id)} sx={{ color: 'rgb(99, 115, 129)' }}>
                          <Icon icon="solar:menu-dots-circle-bold-duotone" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </PerfectScrollbar>
        <TablePagination
          page={page}
          component="div"
          count={listCount}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          onRowsPerPageChange={handleChangeRowsPerPage}
          showFirstButton
          showLastButton
        />
      </Card>

      <Popover
        open={!!menuAnchor}
        anchorEl={menuAnchor}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { minWidth: 160 }
        }}
      >
        <MenuItem
          onClick={() => {
            handleCloseMenu();
            handleOpenAdjust(menuRowId);
          }}
        >
          <Icon icon="solar:calendar-bold-duotone" style={{ marginRight: '16px' }} />
          {t('userSubscription.adjust')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleCloseMenu();
            handleResetQuota(menuRowId);
          }}
        >
          <Icon icon="solar:restart-bold-duotone" style={{ marginRight: '16px' }} />
          {t('userSubscription.resetQuota')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleCloseMenu();
            handleRevoke(menuRowId);
          }}
          sx={{ color: 'error.main' }}
        >
          <Icon icon="solar:close-circle-bold-duotone" style={{ marginRight: '16px' }} />
          {t('userSubscription.revoke')}
        </MenuItem>
      </Popover>

      <AdjustModal open={openAdjust} onCancel={handleCloseAdjust} onOk={handleOkAdjust} subscriptionId={adjustSubId} />
      <AssignModal open={openAssign} onCancel={handleCloseAssign} onOk={handleOkAssign} />
    </>
  );
}
