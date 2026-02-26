import { useState, useEffect } from 'react';
import { showError, showSuccess } from 'utils/common';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import PerfectScrollbar from 'react-perfect-scrollbar';
import ButtonGroup from '@mui/material/ButtonGroup';
import Toolbar from '@mui/material/Toolbar';

import { Button, Card, Stack, Container, Typography } from '@mui/material';
import ModelMappingTableRow from './component/TableRow';
import KeywordTableHead from 'ui-component/TableHead';
import { API } from 'utils/api';
import EditModal from './component/EditModal';
import { Icon } from '@iconify/react';

import { useTranslation } from 'react-i18next';

export default function ModelMapping() {
  const { t } = useTranslation();
  const [mappings, setMappings] = useState([]);
  const [refreshFlag, setRefreshFlag] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState(0);

  const fetchData = async () => {
    try {
      const res = await API.get('/api/model_mapping/');
      const { success, message, data } = res.data;
      if (success) {
        setMappings(data);
      } else {
        showError(message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRefresh = async () => {
    setRefreshFlag(!refreshFlag);
  };

  useEffect(() => {
    fetchData();
  }, [refreshFlag]);

  const manageMapping = async (id, action) => {
    const url = '/api/model_mapping/';
    let res;
    try {
      switch (action) {
        case 'delete':
          res = await API.delete(url + id);
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

  const handleOpenModal = (id) => {
    setEditId(id);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditId(0);
  };

  const handleOkModal = (status) => {
    if (status === true) {
      handleCloseModal();
      handleRefresh();
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
        <Stack direction="column" spacing={1}>
          <Typography variant="h2">{t('modelMapping.title', '模型映射')}</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {t('modelMapping.subtitle', '全局模型别名，支持一对多跨渠道映射')}
          </Typography>
        </Stack>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Icon icon="solar:add-circle-line-duotone" />}
          onClick={() => handleOpenModal(0)}
        >
          {t('modelMapping.create', '新建映射')}
        </Button>
      </Stack>
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
            </ButtonGroup>
          </Container>
        </Toolbar>
        <PerfectScrollbar component="div">
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <KeywordTableHead
                headLabel={[
                  { id: 'id', label: 'ID', disableSort: false },
                  { id: 'alias', label: t('modelMapping.alias', '别名'), disableSort: false },
                  { id: 'target_models', label: t('modelMapping.targetModels', '目标模型'), disableSort: true },
                  { id: 'enabled', label: t('modelMapping.enabled', '状态'), disableSort: true },
                  { id: 'action', label: t('common.action', '操作'), disableSort: true }
                ]}
              />
              <TableBody>
                {mappings.map((row) => (
                  <ModelMappingTableRow
                    item={row}
                    manageMapping={manageMapping}
                    key={row.id}
                    handleOpenModal={handleOpenModal}
                    setModalId={setEditId}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </PerfectScrollbar>
      </Card>
      <EditModal open={openModal} onCancel={handleCloseModal} onOk={handleOkModal} Oid={editId} />
    </>
  );
}
