import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import {
  TableRow,
  TableCell,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Tooltip,
  Stack,
} from '@mui/material';

import TableSwitch from 'ui-component/Switch';
import { renderQuota, timestamp2string, copy } from 'utils/common';
import Label from 'ui-component/Label';

import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

function statusInfo(t, status) {
  switch (status) {
    case 1:
      return t('common.enable');
    case 2:
      return t('common.disable');
    case 3:
      return t('common.expired');
    case 4:
      return t('common.exhaust');
    default:
      return t('common.unknown');
  }
}

export default function TokensTableRow({ item, manageToken, handleOpenModal, setModalTokenId, userGroup, userIsReliable }) {
  const { t } = useTranslation();
  const [openDelete, setOpenDelete] = useState(false);
  const [statusSwitch, setStatusSwitch] = useState(item.status);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDeleteOpen = () => {
    setOpenDelete(true);
  };

  const handleDeleteClose = () => {
    setOpenDelete(false);
  };

  const handleStatus = async () => {
    const switchVlue = statusSwitch === 1 ? 2 : 1;
    const { success } = await manageToken(item.id, 'status', switchVlue);
    if (success) {
      setStatusSwitch(switchVlue);
    }
  };

  const handleDelete = async () => {
    await manageToken(item.id, 'delete', '');
  };

  const handleEdit = () => {
    handleOpenModal();
    setModalTokenId(item.id);
  };

  useEffect(() => {
    setStatusSwitch(item.status);
  }, [item.status]);

  return (
    <>
      <TableRow tabIndex={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>
          <Label color={userGroup[item.group]?.color}>{userGroup[item.group]?.name || '跟随用户'}</Label>
        </TableCell>
        {userIsReliable && (
          <TableCell>
            <Label color={userGroup[item.setting?.billing_tag]?.color}>
              {userGroup[item.setting?.billing_tag]?.name || '-'}
            </Label>
          </TableCell>
        )}
        <TableCell>
          <Tooltip
            title={(() => {
              return statusInfo(t, statusSwitch);
            })()}
            placement="top"
          >
            <TableSwitch
              id={`switch-${item.id}`}
              checked={statusSwitch === 1}
              onChange={handleStatus}
              // disabled={statusSwitch !== 1 && statusSwitch !== 2}
            />
          </Tooltip>
        </TableCell>

        <TableCell>{renderQuota(item.used_quota)}</TableCell>

        <TableCell>{item.unlimited_quota ? t('token_index.unlimited') : renderQuota(item.remain_quota, 2)}</TableCell>

        <TableCell>{timestamp2string(item.created_time)}</TableCell>

        <TableCell>{item.expired_time === -1 ? t('token_index.neverExpires') : timestamp2string(item.expired_time)}</TableCell>

        <TableCell>
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
            <Button
              size="small"
              color="primary"
              onClick={() => {
                copy(`sk-${item.key}`, t('token_index.token'));
              }}
              startIcon={<Icon icon="mdi:content-copy" />}
            >
              {/* {isMobile ? '' : t('token_index.copy')} */}
            </Button>
            <Button
              size="small"
              color="info"
              onClick={handleEdit}
              startIcon={<Icon icon="solar:pen-bold-duotone" />}
            >
              {/* {isMobile ? '' : t('common.edit')} */}
            </Button>
            <Button
              size="small"
              color="error"
              onClick={handleDeleteOpen}
              startIcon={<Icon icon="solar:trash-bin-trash-bold-duotone" />}
            >
              {/* {isMobile ? '' : t('common.delete')} */}
            </Button>
          </Stack>
        </TableCell>
      </TableRow>

      <Dialog open={openDelete} onClose={handleDeleteClose}>
        <DialogTitle>{t('token_index.deleteToken')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('token_index.confirmDeleteToken')} {item.name}？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>{t('token_index.close')}</Button>
          <Button onClick={handleDelete} sx={{ color: 'error.main' }} autoFocus>
            {t('token_index.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

TokensTableRow.propTypes = {
  item: PropTypes.object,
  manageToken: PropTypes.func,
  handleOpenModal: PropTypes.func,
  setModalTokenId: PropTypes.func,
  userGroup: PropTypes.object,
  userIsReliable: PropTypes.bool
};
