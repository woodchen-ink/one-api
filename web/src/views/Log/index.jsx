import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { showError, trims } from 'utils/common';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import PerfectScrollbar from 'react-perfect-scrollbar';
import TablePagination from '@mui/material/TablePagination';
import LinearProgress from '@mui/material/LinearProgress';
import ButtonGroup from '@mui/material/ButtonGroup';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import { Button, Card, Stack, Container, Typography, Box, Menu, MenuItem, Checkbox, ListItemText, Tabs, Tab } from '@mui/material';
import LogTableRow from './component/TableRow';
import KeywordTableHead from 'ui-component/TableHead';
import TableToolBar from './component/TableToolBar';
import { API } from 'utils/api';
import { useIsAdmin } from 'utils/common';
import { PAGE_SIZE_OPTIONS, getPageSize, savePageSize } from 'constants';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { useLogType } from './type/LogType';
import { Navigate } from 'react-router-dom';

export default function Log({ adminMode = false }) {
  const { t } = useTranslation();
  const LogType = useLogType();
  const originalKeyword = useMemo(
    () => ({
      p: 0,
      username: '',
      key_name: '',
      model_name: '',
      start_timestamp: 0,
      end_timestamp: dayjs().unix() + 3600,
      log_type: '0',
      channel_id: '',
      source_ip: ''
    }),
    []
  );

  const [page, setPage] = useState(0);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('created_at');
  const [rowsPerPage, setRowsPerPage] = useState(() => getPageSize('log'));
  const [listCount, setListCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [toolBarValue, setToolBarValue] = useState(originalKeyword);
  const [searchKeyword, setSearchKeyword] = useState(originalKeyword);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const { userGroup } = useSelector((state) => state.account);
  const theme = useTheme();
  const matchUpMd = useMediaQuery(theme.breakpoints.up('sm'));

  const [logs, setLogs] = useState([]);
  const userIsAdmin = useIsAdmin();
  const canViewAdminLogs = adminMode && userIsAdmin;

  // 添加列显示设置相关状态
  const [columnVisibility, setColumnVisibility] = useState({
    created_at: true,
    channel_id: canViewAdminLogs,
    user_id: canViewAdminLogs,
    group: true,
    key_name: true,
    type: true,
    model_name: true,
    reasoning: true,
    request_path: true,
    duration: true,
    tokens: true,
    quota: true,
    source_ip: canViewAdminLogs,
    user_agent: canViewAdminLogs
  });
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);

  useEffect(() => {
    const nextKeyword = {
      ...originalKeyword,
      source_ip: ''
    };

    setToolBarValue(nextKeyword);
    setSearchKeyword(nextKeyword);
    setPage(0);
    setOrder('desc');
    setOrderBy('created_at');
    setColumnVisibility({
      created_at: true,
      channel_id: canViewAdminLogs,
      user_id: canViewAdminLogs,
      group: true,
      key_name: true,
      type: true,
      model_name: true,
      reasoning: true,
      request_path: true,
      duration: true,
      tokens: true,
      quota: true,
      source_ip: canViewAdminLogs,
      user_agent: canViewAdminLogs
    });
    setColumnMenuAnchor(null);
  }, [canViewAdminLogs, originalKeyword]);

  // 处理列显示菜单打开和关闭
  const handleColumnMenuOpen = (event) => {
    setColumnMenuAnchor(event.currentTarget);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchor(null);
  };

  // 处理列显示状态变更
  const handleColumnVisibilityChange = (columnId) => {
    setColumnVisibility({
      ...columnVisibility,
      [columnId]: !columnVisibility[columnId]
    });
  };

  // 处理全选/取消全选列显示
  const handleSelectAllColumns = () => {
    const allColumns = Object.keys(columnVisibility);
    const areAllVisible = allColumns.every((column) => columnVisibility[column]);

    const newColumnVisibility = {};
    allColumns.forEach((column) => {
      newColumnVisibility[column] = !areAllVisible;
    });

    setColumnVisibility(newColumnVisibility);
  };

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
    savePageSize('log', newRowsPerPage);
  };

  const searchLogs = async () => {
    setPage(0);
    setSearchKeyword(toolBarValue);
  };

  const handleToolBarValue = (event) => {
    setToolBarValue({ ...toolBarValue, [event.target.name]: event.target.value });
  };

  const handleTabsChange = async (event, newValue) => {
    const updatedToolBarValue = { ...toolBarValue, log_type: newValue };
    setToolBarValue(updatedToolBarValue);
    setPage(0);
    setSearchKeyword(updatedToolBarValue);
  };

  const fetchData = useCallback(
    async (page, rowsPerPage, keyword, order, orderBy) => {
      setSearching(true);
      keyword = trims(keyword);
      try {
        if (orderBy) {
          orderBy = order === 'desc' ? '-' + orderBy : orderBy;
        }
        const url = canViewAdminLogs ? '/api/admin/log/' : '/api/user/log/';
        if (!canViewAdminLogs) {
          delete keyword.username;
          delete keyword.channel_id;
          delete keyword.source_ip;
        }

        const res = await API.get(url, {
          params: {
            page: page + 1,
            size: rowsPerPage,
            order: orderBy,
            ...keyword
          }
        });
        const { success, message, data } = res.data;
        if (success) {
          setListCount(data.total_count);
          setLogs(data.data);
        } else {
          showError(message);
        }
      } catch (error) {
        console.error(error);
      }
      setSearching(false);
    },
    [canViewAdminLogs]
  );

  // 处理刷新
  const handleRefresh = async () => {
    setOrderBy('created_at');
    setOrder('desc');
    setToolBarValue(originalKeyword);
    setSearchKeyword(originalKeyword);
    setRefreshFlag(!refreshFlag);
  };

  useEffect(() => {
    fetchData(page, rowsPerPage, searchKeyword, order, orderBy);
  }, [page, rowsPerPage, searchKeyword, order, orderBy, fetchData, refreshFlag]);

  if (adminMode && !userIsAdmin) {
    return <Navigate to="/panel/log" replace />;
  }

  return (
    <>
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={toolBarValue.log_type}
            onChange={handleTabsChange}
            aria-label="basic tabs example"
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTabs-indicator': {
                display: 'none'
              }
            }}
          >
            {Object.values(LogType).map((option) => {
              return <Tab key={option.value} label={option.text} value={option.value} />;
            })}
          </Tabs>
        </Box>
        <Box component="form" noValidate>
          <TableToolBar filterName={toolBarValue} handleFilterName={handleToolBarValue} userIsAdmin={canViewAdminLogs} />
        </Box>
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
            {matchUpMd ? (
              <ButtonGroup variant="outlined" aria-label="outlined small primary button group">
                <Button onClick={handleRefresh} size="small" startIcon={<Icon icon="solar:refresh-bold-duotone" width={18} />}>
                  {t('logPage.refreshButton')}
                </Button>

                <Button onClick={searchLogs} size="small" startIcon={<Icon icon="solar:minimalistic-magnifer-line-duotone" width={18} />}>
                  {t('logPage.searchButton')}
                </Button>

                <Button onClick={handleColumnMenuOpen} size="small" startIcon={<Icon icon="solar:settings-bold-duotone" width={18} />}>
                  {t('logPage.columnSettings')}
                </Button>
              </ButtonGroup>
            ) : (
              <Stack
                direction="row"
                spacing={1}
                divider={<Divider orientation="vertical" flexItem />}
                justifyContent="space-around"
                alignItems="center"
              >
                <IconButton onClick={handleRefresh} size="small">
                  <Icon icon="solar:refresh-bold-duotone" width={18} />
                </IconButton>
                <IconButton onClick={searchLogs} size="small">
                  <Icon icon="solar:minimalistic-magnifer-line-duotone" width={18} />
                </IconButton>
                <IconButton onClick={handleColumnMenuOpen} size="small">
                  <Icon icon="solar:settings-bold-duotone" width={18} />
                </IconButton>
              </Stack>
            )}

            <Menu
              anchorEl={columnMenuAnchor}
              open={Boolean(columnMenuAnchor)}
              onClose={handleColumnMenuClose}
              PaperProps={{
                style: {
                  maxHeight: 300,
                  width: 200
                }
              }}
            >
              <MenuItem disabled>
                <Typography variant="subtitle2">{t('logPage.selectColumns')}</Typography>
              </MenuItem>
              <MenuItem onClick={handleSelectAllColumns} dense>
                <Checkbox
                  checked={Object.values(columnVisibility).every((visible) => visible)}
                  indeterminate={
                    !Object.values(columnVisibility).every((visible) => visible) &&
                    Object.values(columnVisibility).some((visible) => visible)
                  }
                  size="small"
                />
                <ListItemText primary={t('logPage.columnSelectAll')} />
              </MenuItem>
              {[
                { id: 'created_at', label: t('logPage.timeLabel') },
                { id: 'channel_id', label: t('logPage.channelLabel'), adminOnly: true },
                { id: 'user_id', label: t('logPage.userLabel'), adminOnly: true },
                { id: 'group', label: t('logPage.groupLabel') },
                { id: 'key_name', label: t('logPage.tokenLabel') },
                { id: 'type', label: t('logPage.typeLabel') },
                { id: 'model_name', label: t('logPage.modelLabel') },
                { id: 'reasoning', label: t('logPage.reasoningLabel') },
                { id: 'request_path', label: t('logPage.requestPath') },
                { id: 'duration', label: t('logPage.durationLabel') },
                { id: 'tokens', label: t('logPage.tokensLabel') },
                { id: 'quota', label: t('logPage.quotaLabel') },
                { id: 'source_ip', label: t('logPage.sourceIp'), adminOnly: true },
                { id: 'user_agent', label: t('logPage.userAgent'), adminOnly: true }
              ].map(
                (column) =>
                  (!column.adminOnly || canViewAdminLogs) && (
                    <MenuItem key={column.id} onClick={() => handleColumnVisibilityChange(column.id)} dense>
                      <Checkbox checked={columnVisibility[column.id] || false} size="small" />
                      <ListItemText primary={column.label} />
                    </MenuItem>
                  )
              )}
            </Menu>
          </Container>
        </Toolbar>
        {searching && <LinearProgress />}
        <PerfectScrollbar component="div">
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: canViewAdminLogs ? 1760 : 1180 }}>
              <KeywordTableHead
                order={order}
                orderBy={orderBy}
                onRequestSort={handleSort}
                headLabel={[
                  {
                    id: 'created_at',
                    label: t('logPage.timeLabel'),
                    disableSort: false,
                    hide: !columnVisibility.created_at,
                    minWidth: 160
                  },
                  {
                    id: 'channel_id',
                    label: t('logPage.channelLabel'),
                    disableSort: false,
                    hide: !columnVisibility.channel_id || !canViewAdminLogs,
                    minWidth: 160
                  },
                  {
                    id: 'user_id',
                    label: t('logPage.userLabel'),
                    disableSort: false,
                    hide: !columnVisibility.user_id || !canViewAdminLogs,
                    minWidth: 120
                  },
                  {
                    id: 'group',
                    label: t('logPage.groupLabel'),
                    disableSort: false,
                    hide: !columnVisibility.group,
                    minWidth: 140
                  },
                  {
                    id: 'key_name',
                    label: t('logPage.tokenLabel'),
                    disableSort: false,
                    hide: !columnVisibility.key_name,
                    minWidth: 140
                  },
                  {
                    id: 'type',
                    label: t('logPage.typeLabel'),
                    disableSort: false,
                    hide: !columnVisibility.type,
                    minWidth: 110
                  },
                  {
                    id: 'model_name',
                    label: t('logPage.modelLabel'),
                    disableSort: false,
                    hide: !columnVisibility.model_name,
                    minWidth: 150
                  },
                  {
                    id: 'reasoning',
                    label: t('logPage.reasoningLabel'),
                    disableSort: true,
                    hide: !columnVisibility.reasoning,
                    minWidth: 110
                  },
                  {
                    id: 'request_path',
                    label: t('logPage.requestPath'),
                    disableSort: true,
                    hide: !columnVisibility.request_path,
                    minWidth: 160,
                    width: 200
                  },
                  {
                    id: 'duration',
                    label: t('logPage.durationLabel'),
                    disableSort: true,
                    hide: !columnVisibility.duration,
                    minWidth: 150
                  },
                  {
                    id: 'tokens',
                    label: t('logPage.tokensLabel'),
                    disableSort: true,
                    hide: !columnVisibility.tokens,
                    minWidth: 160
                  },
                  {
                    id: 'quota',
                    label: t('logPage.quotaLabel'),
                    disableSort: true,
                    hide: !columnVisibility.quota,
                    minWidth: 100
                  },
                  {
                    id: 'source_ip',
                    label: t('logPage.sourceIp'),
                    disableSort: true,
                    hide: !columnVisibility.source_ip || !canViewAdminLogs,
                    minWidth: 140
                  },
                  {
                    id: 'user_agent',
                    label: t('logPage.userAgent'),
                    disableSort: true,
                    hide: !columnVisibility.user_agent || !canViewAdminLogs,
                    minWidth: 220,
                    width: 260
                  }
                ]}
              />
              <TableBody>
                {logs.map((row, index) => (
                  <LogTableRow
                    item={row}
                    key={`${row.id}_${index}`}
                    userIsAdmin={canViewAdminLogs}
                    userGroup={userGroup}
                    columnVisibility={columnVisibility}
                  />
                ))}
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
    </>
  );
}

Log.propTypes = {
  adminMode: PropTypes.bool
};
