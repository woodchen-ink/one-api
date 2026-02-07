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
import ButtonGroup from '@mui/material/ButtonGroup';

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

export default function TokensTableRow({ item, manageToken, handleOpenModal, setModalTokenId, userGroup, userIsReliable, isAdminSearch }) {
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
        {isAdminSearch && (
          <TableCell>
            <Tooltip title={`ID: ${item.user_id}`} placement="top">
              <span>{item.user_id} - {item.owner_name || '-'}</span>
            </Tooltip>
          </TableCell>
        )}
        <TableCell>{item.name}</TableCell>
        <TableCell>
          {isAdminSearch ? (
            // 管理员搜索模式：分组/备用分组两行显示
            <Stack direction="column" spacing={0.5}>
              <Label color={userGroup[item.group]?.color}>{userGroup[item.group]?.name || '跟随用户'}</Label>
              <Label color={userGroup[item.backup_group]?.color}>{userGroup[item.backup_group]?.name || '-'}</Label>
            </Stack>
          ) : (
            // 普通模式：只显示分组
            <Label color={userGroup[item.group]?.color}>{userGroup[item.group]?.name || '跟随用户'}</Label>
          )}
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

        {isAdminSearch ? (
          // 管理员搜索模式：合并额度显示
          <TableCell>
            <Stack direction="column" spacing={0.5}>
              <span>{renderQuota(item.used_quota)}</span>
              <span style={{ color: 'text.secondary' }}>{item.unlimited_quota ? t('token_index.unlimited') : renderQuota(item.remain_quota, 2)}</span>
            </Stack>
          </TableCell>
        ) : (
          // 普通模式：分开显示
          <>
            <TableCell>{renderQuota(item.used_quota)}</TableCell>
            <TableCell>{item.unlimited_quota ? t('token_index.unlimited') : renderQuota(item.remain_quota, 2)}</TableCell>
          </>
        )}

        {isAdminSearch ? (
          // 管理员搜索模式：合并时间显示
          <TableCell>
            <Stack direction="column" spacing={0.5}>
              <span>{timestamp2string(item.created_time)}</span>
              <span style={{ color: 'text.secondary' }}>{item.expired_time === -1 ? t('token_index.neverExpires') : timestamp2string(item.expired_time)}</span>
            </Stack>
          </TableCell>
        ) : (
          // 普通模式：分开显示
          <>
            <TableCell>{timestamp2string(item.created_time)}</TableCell>
            <TableCell>{item.expired_time === -1 ? t('token_index.neverExpires') : timestamp2string(item.expired_time)}</TableCell>
          </>
        )}

        {/* 管理员搜索模式：最近使用日期 */}
        {isAdminSearch && (
          <TableCell>
            {item.accessed_time ? timestamp2string(item.accessed_time) : '-'}
          </TableCell>
        )}

        <TableCell>
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
            {isAdminSearch ? (
              // 管理员搜索模式：只保留简单的复制按钮
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => {
                  copy(`sk-${item.key}`, t('token_index.token'));
                }}
              >
                {isMobile ? <Icon icon="mdi:content-copy" /> : t('token_index.copy')}
              </Button>
            ) : (
              // 普通模式：完整的操作按钮
              <>
                <ButtonGroup size="small" aria-label="split button">
                  <Button
                    color="primary"
                    onClick={() => {
                      copy(`sk-${item.key}`, t('token_index.token'));
                    }}
                  >
                    {isMobile ? <Icon icon="mdi:content-copy" /> : t('token_index.copy')}
                  </Button>
                  <Button size="small" onClick={(e) => handleOpenMenu(e, 'copy')}>
                    <IconCaretDownFilled size={'16px'} />
                  </Button>
                </ButtonGroup>
                <ButtonGroup size="small" onClick={(e) => handleOpenMenu(e, 'link')} aria-label="split button">
                  <Button size="small" color="primary">
                    {isMobile ? <Icon icon="mdi:chat" /> : t('token_index.chat')}
                  </Button>
                  <Button size="small">
                    <IconCaretDownFilled size={'16px'} />
                  </Button>
                </ButtonGroup>
              </>
            )}
            <IconButton onClick={(e) => handleOpenMenu(e, 'action')} sx={{ color: 'rgb(99, 115, 129)' }}>
              <Icon icon="solar:menu-dots-circle-bold-duotone" width={20} />
            </IconButton>
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
  userIsReliable: PropTypes.bool,
  isAdminSearch: PropTypes.bool
};
