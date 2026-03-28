import { useState, useEffect, useRef } from 'react';
import { showError, showSuccess, trims } from 'utils/common';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import PerfectScrollbar from 'react-perfect-scrollbar';
import TablePagination from '@mui/material/TablePagination';
import LinearProgress from '@mui/material/LinearProgress';
import ButtonGroup from '@mui/material/ButtonGroup';
import Toolbar from '@mui/material/Toolbar';

import { Button, Card, Box, Container, Typography } from '@mui/material';
import TutorialTableRow from './component/TableRow';
import KeywordTableHead from 'ui-component/TableHead';
import TableToolBar from 'ui-component/TableToolBar';
import { API } from 'utils/api';
import { PAGE_SIZE_OPTIONS, getPageSize, savePageSize } from 'constants';
import { Icon } from '@iconify/react';
import EditModal from './component/EditModal';

// reorderTutorialList moves the dragged tutorial to the hovered row position.
function reorderTutorialList(tutorialList, activeId, overId) {
  const activeIndex = tutorialList.findIndex((tutorial) => tutorial.id === activeId);
  const overIndex = tutorialList.findIndex((tutorial) => tutorial.id === overId);
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
    return tutorialList;
  }

  const nextTutorials = [...tutorialList];
  const [activeTutorial] = nextTutorials.splice(activeIndex, 1);
  nextTutorials.splice(overIndex, 0, activeTutorial);
  return nextTutorials;
}

// restoreTutorialOrder rebuilds the current page according to a saved id order.
function restoreTutorialOrder(tutorialList, orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return tutorialList;
  }

  const tutorialMap = new Map(tutorialList.map((tutorial) => [tutorial.id, tutorial]));
  return orderedIds.map((id) => tutorialMap.get(id)).filter(Boolean);
}

export default function Tutorial() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(() => getPageSize('tutorial'));
  const [listCount, setListCount] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [tutorials, setTutorials] = useState([]);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [draggingTutorialId, setDraggingTutorialId] = useState(0);

  const [openModal, setOpenModal] = useState(false);
  const [editTutorialId, setEditTutorialId] = useState(0);
  const dragOrderRef = useRef([]);
  const droppedRef = useRef(false);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setPage(0);
    setRowsPerPage(newRowsPerPage);
    savePageSize('tutorial', newRowsPerPage);
  };

  const searchTutorials = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    setPage(0);
    setSearchKeyword(formData.get('keyword'));
  };

  const fetchData = async (page, rowsPerPage, keyword) => {
    setSearching(true);
    keyword = trims(keyword);
    try {
      const res = await API.get(`/api/tutorial/`, {
        params: {
          page: page + 1,
          size: rowsPerPage,
          keyword: keyword,
          order: '-sort,id'
        }
      });
      const { success, message, data } = res.data;
      if (success) {
        setListCount(data.total_count);
        setTutorials(data.data);
      } else {
        showError(message);
      }
    } catch (error) {
      console.error(error);
    }
    setSearching(false);
  };

  const handleRefresh = async () => {
    setRefreshFlag((flag) => !flag);
  };

  useEffect(() => {
    fetchData(page, rowsPerPage, searchKeyword);
  }, [page, rowsPerPage, searchKeyword, refreshFlag]);

  const manageTutorial = async (id, action, value) => {
    const url = '/api/tutorial/';
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

  const handleOpenModal = (tutorialId) => {
    setEditTutorialId(tutorialId);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditTutorialId(0);
  };

  const handleOkModal = (status) => {
    if (status === true) {
      handleCloseModal();
      handleRefresh();
    }
  };

  // restoreDragState reverts the optimistic list when drag did not finish successfully.
  const restoreDragState = () => {
    setTutorials((currentTutorials) => restoreTutorialOrder(currentTutorials, dragOrderRef.current));
  };

  // clearDragState resets transient drag-and-drop state after each interaction.
  const clearDragState = () => {
    dragOrderRef.current = [];
    droppedRef.current = false;
    setDraggingTutorialId(0);
  };

  // handleDragStart stores the original page order for rollback and comparison.
  const handleDragStart = (event, tutorialId) => {
    if (reordering || trims(searchKeyword)) {
      event.preventDefault();
      return;
    }
    dragOrderRef.current = tutorials.map((tutorial) => tutorial.id);
    droppedRef.current = false;
    setDraggingTutorialId(tutorialId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(tutorialId));
  };

  // handleDragOver previews the order immediately so the drop target is visible.
  const handleDragOver = (event, tutorialId) => {
    event.preventDefault();
    if (!draggingTutorialId || draggingTutorialId === tutorialId) {
      return;
    }
    setTutorials((currentTutorials) => reorderTutorialList(currentTutorials, draggingTutorialId, tutorialId));
  };

  // handleDrop persists the current page order through the dedicated reorder API.
  const handleDrop = async (event) => {
    event.preventDefault();
    if (!draggingTutorialId) {
      return;
    }

    droppedRef.current = true;
    const originalIds = [...dragOrderRef.current];
    const orderedIds = tutorials.map((tutorial) => tutorial.id);
    const changed = orderedIds.some((id, index) => id !== originalIds[index]);
    if (!changed) {
      clearDragState();
      return;
    }

    setReordering(true);
    try {
      const res = await API.put('/api/tutorial/reorder', {
        ids: orderedIds,
        page: page + 1,
        size: rowsPerPage
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess('排序已更新');
        handleRefresh();
      } else {
        setTutorials((currentTutorials) => restoreTutorialOrder(currentTutorials, originalIds));
        showError(message);
      }
    } catch (error) {
      setTutorials((currentTutorials) => restoreTutorialOrder(currentTutorials, originalIds));
      showError('排序更新失败');
    } finally {
      setReordering(false);
      clearDragState();
    }
  };

  // handleDragEnd rolls back the preview when the row is not dropped on a valid target.
  const handleDragEnd = () => {
    if (droppedRef.current) {
      return;
    }
    restoreDragState();
    clearDragState();
  };

  const dragDisabled = Boolean(trims(searchKeyword)) || tutorials.length < 2 || reordering;

  return (
    <>
      <Card>
        <Box component="form" onSubmit={searchTutorials} noValidate>
          <TableToolBar placeholder="搜索教程标题..." />
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
                新建教程
              </Button>
            </ButtonGroup>
          </Container>
        </Toolbar>
        <Box sx={{ px: 3, pb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            拖动左侧手柄即可调整教程顺序，排序值越大越靠前。
            {trims(searchKeyword) ? ' 当前是搜索结果，拖拽排序已禁用，请清空关键词后操作。' : ''}
          </Typography>
        </Box>
        {(searching || reordering) && <LinearProgress />}
        <PerfectScrollbar component="div">
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <KeywordTableHead
                order="desc"
                orderBy="sort"
                onRequestSort={() => {}}
                headLabel={[
                  { id: 'drag', label: '拖拽', disableSort: true, align: 'center', width: 72 },
                  { id: 'id', label: 'ID', disableSort: true },
                  { id: 'title', label: '标题', disableSort: true },
                  { id: 'sort', label: '排序', disableSort: true },
                  { id: 'status', label: '状态', disableSort: true },
                  { id: 'created_time', label: '创建时间', disableSort: true },
                  { id: 'action', label: '操作', disableSort: true }
                ]}
              />
              <TableBody>
                {tutorials.map((row) => (
                  <TutorialTableRow
                    item={row}
                    manageTutorial={manageTutorial}
                    key={row.id}
                    handleOpenModal={handleOpenModal}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    isDragging={draggingTutorialId === row.id}
                    dragDisabled={dragDisabled}
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
      <EditModal open={openModal} onCancel={handleCloseModal} onOk={handleOkModal} tutorialId={editTutorialId} />
    </>
  );
}
