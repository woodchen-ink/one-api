import { useEffect, useState } from 'react';
import {
  Button,
  ButtonGroup,
  Card,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Toolbar,
  Typography
} from '@mui/material';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { Icon } from '@iconify/react';
import AdminContainer from 'ui-component/AdminContainer';
import KeywordTableHead from 'ui-component/TableHead';
import ConfirmDialog from 'ui-component/confirm-dialog';
import { useBoolean } from 'hooks/use-boolean';
import { API } from 'utils/api';
import { showError, showSuccess, timestamp2string } from 'utils/common';
import EditModal from './component/EditModal';

const IPProxy = () => {
  const confirmDelete = useBoolean();
  const [items, setItems] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState(0);
  const [deleteItem, setDeleteItem] = useState(null);

  // 拉取代理池列表，并按最新创建顺序展示。
  const fetchData = async () => {
    try {
      const res = await API.get('/api/ip_proxy/');
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }

      setItems(data || []);
    } catch (error) {
      showError(error.message);
    }
  };

  // 删除代理前会先让后端检查是否仍有渠道在引用它。
  const handleDelete = async () => {
    if (!deleteItem) {
      return;
    }

    try {
      const res = await API.delete(`/api/ip_proxy/${deleteItem.id}`);
      const { success, message } = res.data;
      if (!success) {
        showError(message);
        return;
      }

      showSuccess('代理已删除');
      confirmDelete.onFalse();
      setDeleteItem(null);
      fetchData().then();
    } catch (error) {
      showError(error.message);
    }
  };

  // 触发后端延迟测试，并把最新结果刷新到列表中。
  const handleTest = async (id) => {
    try {
      const res = await API.get(`/api/ip_proxy/${id}/test`);
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }

      showSuccess(`测速成功，延迟 ${data.latency} ms`);
      fetchData().then();
    } catch (error) {
      showError(error.message);
    }
  };

  const handleOpenModal = (id = 0) => {
    setEditId(id);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditId(0);
  };

  useEffect(() => {
    fetchData().then();
  }, []);

  return (
    <AdminContainer>
      <Card>
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            p: (theme) => theme.spacing(0, 1, 0, 3)
          }}
        >
          <Typography variant="h4">IP代理池</Typography>
          <ButtonGroup variant="outlined">
            <Button onClick={() => fetchData().then()} startIcon={<Icon icon="solar:refresh-bold-duotone" width={18} />}>
              刷新
            </Button>
            <Button variant="contained" onClick={() => handleOpenModal()} startIcon={<Icon icon="solar:add-circle-line-duotone" />}>
              新增代理
            </Button>
          </ButtonGroup>
        </Toolbar>

        <PerfectScrollbar component="div">
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 960 }}>
              <KeywordTableHead
                headLabel={[
                  { id: 'id', label: 'ID', disableSort: true },
                  { id: 'name', label: '名称', disableSort: true },
                  { id: 'proxy', label: '代理地址', disableSort: true },
                  { id: 'remark', label: '备注', disableSort: true },
                  { id: 'latency', label: '最近延迟', disableSort: true },
                  { id: 'status', label: '最近状态', disableSort: true },
                  { id: 'test_time', label: '最近测试', disableSort: true },
                  { id: 'action', label: '操作', disableSort: true }
                ]}
              />
              <TableBody>
                {items.map((item) => (
                  <TableRow hover key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {item.proxy}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.remark || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{typeof item.latency === 'number' ? `${item.latency} ms` : '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={item.test_status ? 'success' : 'default'}
                        label={item.test_status ? '可用' : item.test_time ? '失败' : '未测试'}
                      />
                    </TableCell>
                    <TableCell>{item.test_time ? timestamp2string(item.test_time) : '-'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton color="info" onClick={() => handleTest(item.id)} size="small">
                          <Icon icon="mdi:speedometer" />
                        </IconButton>
                        <IconButton onClick={() => handleOpenModal(item.id)} size="small">
                          <Icon icon="solar:pen-bold" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => {
                            setDeleteItem(item);
                            confirmDelete.onTrue();
                          }}
                          size="small"
                        >
                          <Icon icon="solar:trash-bin-trash-bold-duotone" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                      <Typography variant="body2" color="text.secondary">
                        暂无代理池配置
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </PerfectScrollbar>
      </Card>

      <EditModal
        open={openModal}
        proxyId={editId}
        onCancel={handleCloseModal}
        onOk={() => {
          handleCloseModal();
          fetchData().then();
        }}
      />

      <ConfirmDialog
        open={confirmDelete.value}
        onClose={() => {
          confirmDelete.onFalse();
          setDeleteItem(null);
        }}
        title="删除IP代理"
        content={deleteItem ? `确认删除代理「${deleteItem.name}」吗？` : ''}
        action={
          <Button variant="contained" color="error" onClick={handleDelete}>
            确认删除
          </Button>
        }
      />
    </AdminContainer>
  );
};

export default IPProxy;
