import PropTypes from 'prop-types';
import { useState } from 'react';

import {
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Chip,
  Stack
} from '@mui/material';

import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';

function parseTargetModels(targetModelsStr) {
  try {
    return JSON.parse(targetModelsStr);
  } catch {
    return [];
  }
}

export default function ModelMappingTableRow({ item, manageMapping, handleOpenModal, setModalId }) {
  const { t } = useTranslation();
  const [openDelete, setOpenDelete] = useState(false);

  const handleDeleteOpen = () => {
    setOpenDelete(true);
  };

  const handleDeleteClose = () => {
    setOpenDelete(false);
  };

  const handleDelete = async () => {
    await manageMapping(item.id, 'delete');
  };

  const targets = parseTargetModels(item.target_models);

  return (
    <>
      <TableRow tabIndex={item.id}>
        <TableCell>{item.id}</TableCell>
        <TableCell>
          <Chip label={item.alias} color="primary" variant="outlined" size="small" />
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {targets.map((model, index) => (
              <Chip key={index} label={model} size="small" variant="outlined" />
            ))}
          </Stack>
        </TableCell>
        <TableCell>
          <Chip
            label={item.enabled ? t('modelMapping.enabled', '启用') : t('modelMapping.disabled', '禁用')}
            color={item.enabled ? 'success' : 'default'}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  handleOpenModal();
                  setModalId(item.id);
                }}
              >
                <Icon icon="solar:pen-bold-duotone" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton size="small" color="error" onClick={handleDeleteOpen}>
                <Icon icon="solar:trash-bin-trash-bold-duotone" width={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>

      <Dialog open={openDelete} onClose={handleDeleteClose}>
        <DialogTitle>{t('common.delete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('common.deleteConfirm', { title: item.alias })}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>{t('common.close')}</Button>
          <Button onClick={handleDelete} sx={{ color: 'error.main' }} autoFocus>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

ModelMappingTableRow.propTypes = {
  item: PropTypes.object,
  manageMapping: PropTypes.func,
  handleOpenModal: PropTypes.func,
  setModalId: PropTypes.func
};
