import { useState, useEffect } from 'react';
import { showError, showSuccess, trims } from 'utils/common';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import PerfectScrollbar from 'react-perfect-scrollbar';
import TablePagination from '@mui/material/TablePagination';
import LinearProgress from '@mui/material/LinearProgress';
import ButtonGroup from '@mui/material/ButtonGroup';
import Toolbar from '@mui/material/Toolbar';

import { Button, Card, Box, Container } from '@mui/material';
import NoticeTableRow from './component/TableRow';
import KeywordTableHead from 'ui-component/TableHead';
import TableToolBar from 'ui-component/TableToolBar';
import { API } from 'utils/api';
import { PAGE_SIZE_OPTIONS, getPageSize, savePageSize } from 'constants';
import { Icon } from '@iconify/react';
import EditModal from './component/EditModal';

export default function Notice() {
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('id');
  const [rowsPerPage, setRowsPerPage] = useState(() => getPageSize('notice'));
  const [listCount, setListCount] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [notices, setNotices] = useState([]);
  const [refreshFlag, setRefreshFlag] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editNoticeId, setEditNoticeId] = useState(0);

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
    savePageSize('notice', newRowsPerPage);
  };

  const searchNotices = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    setPage(0);
    setSearchKeyword(formData.get('keyword'));
  };

  const fetchData = async (page, rowsPerPage, keyword, order, orderBy) => {
    setSearching(true);
    keyword = trims(keyword);
    try {
      if (orderBy) {
        orderBy = order === 'desc' ? '-' + orderBy : orderBy;
      }
      const res = await API.get(`/api/notice/`, {
        params: {
          page: page + 1,
          size: rowsPerPage,
          keyword: keyword,
          order: orderBy
        }
      });
      const { success, message, data } = res.data;
      if (success) {
        setListCount(data.total_count);
        setNotices(data.data);
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
    fetchData(page, rowsPerPage, searchKeyword, order, orderBy);
  }, [page, rowsPerPage, searchKeyword, order, orderBy, refreshFlag]);

  const manageNotice = async (id, action, value) => {
    const url = '/api/notice/';
    let res;

    try {
      switch (action) {
        case 'delete':
          res = await API.delete(url + id);
          break;
        case 'status':
          res = await API.put(url + '?status_only=true', {
            id,
            status: value
          });
          break;
      }
      const { success, message } = res.data;
      if (success) {
        showSuccess('操作成功');
        if (action === 'delete') {
          await handleRefresh();
        }
      } else {
        showError(message);
      }

      return res.data;
    } catch (error) {
      return;
    }
  };

  const handleOpenModal = (noticeId) => {
    setEditNoticeId(noticeId);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditNoticeId(0);
  };

  const handleOkModal = (status) => {
    if (status === true) {
      handleCloseModal();
      handleRefresh();
    }
  };

  return (
    <>
      <Card>
        <Box component="form" onSubmit={searchNotices} noValidate>
          <TableToolBar placeholder="搜索公告标题..." />
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
            <ButtonGroup variant="outlined" aria-label="outlined small primary button group">
              <Button onClick={handleRefresh} startIcon={<Icon icon="solar:refresh-bold-duotone" width={18} />}>
                刷新
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Icon icon="solar:add-circle-line-duotone" />}
                onClick={() => handleOpenModal(0)}
              >
                新建公告
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
                  { id: 'id', label: 'ID', disableSort: false },
                  { id: 'title', label: '标题', disableSort: false },
                  { id: 'publish_time', label: '发布时间', disableSort: false },
                  { id: 'sort', label: '排序', disableSort: false },
                  { id: 'status', label: '状态', disableSort: false },
                  { id: 'action', label: '操作', disableSort: true }
                ]}
              />
              <TableBody>
                {notices.map((row) => (
                  <NoticeTableRow
                    item={row}
                    manageNotice={manageNotice}
                    key={row.id}
                    handleOpenModal={handleOpenModal}
                    setModalNoticeId={setEditNoticeId}
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
      <EditModal open={openModal} onCancel={handleCloseModal} onOk={handleOkModal} noticeId={editNoticeId} />
    </>
  );
}
