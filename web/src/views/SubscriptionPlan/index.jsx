import { useState, useEffect } from 'react';
import { showError, showSuccess } from 'utils/common';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import PerfectScrollbar from 'react-perfect-scrollbar';
import TablePagination from '@mui/material/TablePagination';
import LinearProgress from '@mui/material/LinearProgress';
import ButtonGroup from '@mui/material/ButtonGroup';
import Toolbar from '@mui/material/Toolbar';

import { Button, Card, Container } from '@mui/material';
import SubscriptionPlanTableRow from './component/TableRow';
import KeywordTableHead from 'ui-component/TableHead';
import { API } from 'utils/api';
import { PAGE_SIZE_OPTIONS, getPageSize, savePageSize } from 'constants';
import EditModal from './component/EditModal';
import { Icon } from '@iconify/react';

import { useTranslation } from 'react-i18next';
// ----------------------------------------------------------------------
export default function SubscriptionPlan() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('id');
  const [rowsPerPage, setRowsPerPage] = useState(() => getPageSize('subscriptionPlan'));
  const [listCount, setListCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [plans, setPlans] = useState([]);
  const [refreshFlag, setRefreshFlag] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editPlanId, setEditPlanId] = useState(0);

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
    savePageSize('subscriptionPlan', newRowsPerPage);
  };

  const fetchData = async (page, rowsPerPage, order, orderBy) => {
    setSearching(true);
    try {
      if (orderBy) {
        orderBy = order === 'desc' ? '-' + orderBy : orderBy;
      }
      const res = await API.get(`/api/subscription_plan/`, {
        params: {
          page: page + 1,
          size: rowsPerPage,
          order: orderBy
        }
      });
      const { success, message, data } = res.data;
      if (success) {
        setListCount(data.total_count);
        setPlans(data.data);
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

  useEffect(() => {
    fetchData(page, rowsPerPage, order, orderBy);
  }, [page, rowsPerPage, order, orderBy, refreshFlag]);

  const managePlan = async (id, action) => {
    const url = '/api/subscription_plan/';
    let res;
    try {
      switch (action) {
        case 'delete':
          res = await API.delete(url + id);
          break;
        case 'status':
          res = await API.put(`${url}enable/${id}`);
          break;
        default:
          return false;
      }

      const { success, message } = res.data;
      if (success) {
        showSuccess(t('userPage.operationSuccess'));
        await handleRefresh();
      } else {
        showError(message);
      }

      return res.data;
    } catch (error) {
      return;
    }
  };

  const handleOpenModal = (planId) => {
    setEditPlanId(planId);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditPlanId(0);
  };

  const handleOkModal = (status) => {
    if (status === true) {
      handleCloseModal();
      handleRefresh();
    }
  };

  const durationTypeLabel = (type) => {
    switch (type) {
      case 'day':
        return t('subscriptionPlan.durationDay');
      case 'week':
        return t('subscriptionPlan.durationWeek');
      case 'month':
        return t('subscriptionPlan.durationMonth');
      default:
        return type;
    }
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
                onClick={() => handleOpenModal(0)}
              >
                {t('subscriptionPlan.create')}
              </Button>
            </ButtonGroup>
          </Container>
        </Toolbar>
        {searching && <LinearProgress />}
        <PerfectScrollbar component="div">
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <KeywordTableHead
                order={order}
                orderBy={orderBy}
                onRequestSort={handleSort}
                headLabel={[
                  { id: 'id', label: t('subscriptionPlan.id'), disableSort: false },
                  { id: 'name', label: t('subscriptionPlan.name'), disableSort: false },
                  { id: 'group_symbol', label: t('subscriptionPlan.groupSymbol'), disableSort: false },
                  { id: 'price', label: t('subscriptionPlan.price') + '($)', disableSort: false },
                  { id: 'quota_amount', label: t('subscriptionPlan.quotaAmount') + '($)', disableSort: false },
                  { id: 'duration', label: t('subscriptionPlan.duration'), disableSort: true },
                  { id: 'sort', label: t('subscriptionPlan.sort'), disableSort: false },
                  { id: 'enable', label: t('subscriptionPlan.enable'), disableSort: false },
                  { id: 'action', label: t('userPage.action'), disableSort: true }
                ]}
              />
              <TableBody>
                {plans.map((row) => (
                  <SubscriptionPlanTableRow
                    item={row}
                    managePlan={managePlan}
                    key={row.id}
                    handleOpenModal={handleOpenModal}
                    setModalPlanId={setEditPlanId}
                    durationTypeLabel={durationTypeLabel}
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
      <EditModal open={openModal} onCancel={handleCloseModal} onOk={handleOkModal} planId={editPlanId} />
    </>
  );
}
