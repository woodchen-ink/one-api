import PropTypes from 'prop-types';
import { useState } from 'react';

import {
  TableRow,
  TableCell,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Tooltip,
  Stack
} from '@mui/material';

import Label from 'ui-component/Label';
import TableSwitch from 'ui-component/Switch';
import { renderQuota, renderNumber, timestamp2string } from 'utils/common';
import { Icon } from '@iconify/react';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

function renderRole(t, role) {
  switch (role) {
    case 1:
      return <Label color="default">{t('userPage.cUserRole')}</Label>;
    case 10:
      return <Label color="orange">{t('userPage.adminUserRole')}</Label>;
    case 100:
      return <Label color="success">{t('userPage.superAdminRole')}</Label>;
    default:
      return <Label color="error">{t('userPage.uUserRole')}</Label>;
  }
}

export default function UsersTableRow({ item, manageUser, handleOpenModal, setModalUserId }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [openDelete, setOpenDelete] = useState(false);
  const [statusSwitch, setStatusSwitch] = useState(item.status);

  const handleDeleteOpen = () => {
    setOpenDelete(true);
  };

  const handleDeleteClose = () => {
    setOpenDelete(false);
  };

  const handleStatus = async () => {
    const switchVlue = statusSwitch === 1 ? 2 : 1;
    const { success } = await manageUser(item.username, 'status', switchVlue);
    if (success) {
      setStatusSwitch(switchVlue);
    }
  };

  const handleDelete = async () => {
    await manageUser(item.username, 'delete', '');
  };

  return (
    <>
      <TableRow tabIndex={item.id}>
        <TableCell>{item.id}</TableCell>

        <TableCell>{item.username}</TableCell>

        <TableCell>
          <Label>{item.group}</Label>
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={0.5} alignItems="left" justifyContent="left">
            <Tooltip title={t('token_index.remainingQuota')} placement="top">
              <Label color={'primary'} variant="outlined">
                {' '}
                {renderQuota(item.quota)}{' '}
              </Label>
            </Tooltip>
            <Tooltip title={t('token_index.usedQuota')} placement="top">
              <Label color={'primary'} variant="outlined">
                {' '}
                {renderQuota(item.used_quota)}{' '}
              </Label>
            </Tooltip>
            <Tooltip title={t('userPage.useQuota')} placement="top">
              <Label color={'primary'} variant="outlined">
                {' '}
                {renderNumber(item.request_count)}{' '}
              </Label>
            </Tooltip>
          </Stack>
        </TableCell>
        <TableCell>{renderRole(t, item.role)}</TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.5} alignItems="left" justifyContent="left">
            <Tooltip title={item.wechat_id ? item.wechat_id : t('profilePage.notBound')} placement="top">
              <Icon icon="ri:wechat-fill" color={item.wechat_id ? theme.palette.success.dark : theme.palette.grey[400]} />
            </Tooltip>
            <Tooltip title={item.github_id ? item.github_id : t('profilePage.notBound')} placement="top">
              <Icon icon="ri:github-fill" color={item.github_id ? theme.palette.grey[900] : theme.palette.grey[400]} />
            </Tooltip>
            <Tooltip title={item.email ? item.email : t('profilePage.notBound')} placement="top">
              <Icon icon="ri:mail-fill" color={item.email ? theme.palette.grey[900] : theme.palette.grey[400]} />
            </Tooltip>
          </Stack>
        </TableCell>
        <TableCell>{item.created_time === 0 ? t('common.unknown') : timestamp2string(item.created_time)}</TableCell>
        <TableCell>
          {' '}
          <TableSwitch id={`switch-${item.id}`} checked={statusSwitch === 1} onChange={handleStatus} />
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1}>
            <Tooltip title={t('common.edit')}>
              <IconButton 
                onClick={() => {
                  handleOpenModal();
                  setModalUserId(item.id);
                }}
                sx={{ color: 'rgb(99, 115, 129)' }}
              >
                <Icon icon="solar:pen-bold-duotone" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton 
                onClick={handleDeleteOpen}
                sx={{ color: 'rgb(99, 115, 129)' }}
              >
                <Icon icon="solar:trash-bin-trash-bold-duotone" />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>

      <Dialog open={openDelete} onClose={handleDeleteClose}>
        <DialogTitle>{t('userPage.del')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('userPage.delTip')} {item.name}？
          </DialogContentText>
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

UsersTableRow.propTypes = {
  item: PropTypes.object,
  manageUser: PropTypes.func,
  handleOpenModal: PropTypes.func,
  setModalUserId: PropTypes.func
};
