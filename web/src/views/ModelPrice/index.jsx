import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  Card,
  Stack,
  Typography,
  Box,
  InputBase,
  Paper,
  IconButton,
  useMediaQuery,
  Avatar,
  ButtonBase,
  Tooltip,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Select,
  FormControl
} from '@mui/material';
import { Icon } from '@iconify/react';
import { API } from 'utils/api';
import { showError, ValueFormatter, copy } from 'utils/common';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ModelDetailModal from './component/ModelDetailModal';
import BillingRuleDetails, { getExtraRatioDisplayName } from './component/BillingRuleDetails';
import { MODALITY_OPTIONS } from 'constants/Modality';
import Label from 'ui-component/Label';
import { Helmet } from 'react-helmet-async';

// ----------------------------------------------------------------------
export default function ModelPrice() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const ownedby = useSelector((state) => state.siteInfo?.ownedby);
  const user = useSelector((state) => state.account?.user);

  const [availableModels, setAvailableModels] = useState({});
  const [modelInfoMap, setModelInfoMap] = useState({});
  const [userGroupMap, setUserGroupMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedOwnedBy, setSelectedOwnedBy] = useState('all');
  const [selectedModality, setSelectedModality] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 详情对话框状态
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedModelDetail, setSelectedModelDetail] = useState(null);

  const pageSizeOptions = [20, 30, 60, 100];

  const sortedGroupEntries = useMemo(() => {
    return Object.entries(userGroupMap).sort(([, a], [, b]) => {
      if (a.ratio !== b.ratio) {
        return a.ratio - b.ratio;
      }
      return a.id - b.id;
    });
  }, [userGroupMap]);

  // 获取可用模型
  const fetchAvailableModels = useCallback(async () => {
    try {
      const res = await API.get('/api/pricing_model');
      const { success, message, data } = res.data;
      if (success) {
        setAvailableModels(data);
      } else {
        showError(message);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  // 获取模型信息
  const fetchModelInfo = useCallback(async () => {
    try {
      const res = await API.get('/api/model_info/');
      const { success, message, data } = res.data;
      if (success) {
        // 转换为 map 方便查找
        const infoMap = {};
        data.forEach((info) => {
          infoMap[info.model] = info;
        });
        setModelInfoMap(infoMap);
      } else {
        showError(message);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  // 获取用户组
  const fetchUserGroupMap = useCallback(async () => {
    try {
      const res = await API.get('/api/pricing_group_map');
      const { success, message, data } = res.data;
      if (success) {
        setUserGroupMap(data);
        const sortedEntries = Object.entries(data).sort(([, a], [, b]) => {
          if (a.ratio !== b.ratio) {
            return a.ratio - b.ratio;
          }
          return a.id - b.id;
        });
        const currentGroupKey = user?.group && data[user.group] ? user.group : sortedEntries[0]?.[0];
        setSelectedGroup(currentGroupKey || '');
      } else {
        showError(message);
      }
    } catch (error) {
      console.error(error);
    }
  }, [user?.group]);

  useEffect(() => {
    fetchAvailableModels();
    fetchModelInfo();
    fetchUserGroupMap();
  }, [fetchAvailableModels, fetchModelInfo, fetchUserGroupMap]);

  useEffect(() => {
    if (!user?.group || !userGroupMap[user.group]) {
      return;
    }

    setSelectedGroup((prev) => {
      if (!prev || !userGroupMap[prev]) {
        return user.group;
      }
      return prev;
    });
  }, [user?.group, userGroupMap]);

  // 提取所有唯一标签
  const allTags = [
    ...new Set(
      Object.values(modelInfoMap).flatMap((info) => {
        try {
          return JSON.parse(info.tags || '[]');
        } catch (e) {
          return [];
        }
      })
    )
  ];

  // 格式化价格
  const formatPrice = (value, type) => {
    if (typeof value === 'number') {
      let nowUnit = '';
      let isM = true;
      if (type === 'times') {
        isM = false;
      }
      if (type === 'tokens') {
        nowUnit = '/ 1M';
      }
      return ValueFormatter(value, true, isM) + nowUnit;
    }
    return value;
  };

  // 过滤模型
  const filteredModels = useMemo(() => {
    return Object.entries(availableModels)
      .filter(([modelName, model]) => {
        // 供应商筛选
        if (selectedOwnedBy !== 'all' && model.owned_by !== selectedOwnedBy) return false;

        // 仅显示可用
        if (selectedGroup && !model.groups.includes(selectedGroup)) return false;

        // 搜索
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const modelInfo = modelInfoMap[modelName];
          const matchModel = modelName.toLowerCase().includes(query);
          const matchDescription = modelInfo?.description?.toLowerCase().includes(query);
          if (!matchModel && !matchDescription) return false;
        }

        // 模态筛选
        if (selectedModality !== 'all') {
          const modelInfo = modelInfoMap[modelName];
          if (modelInfo) {
            try {
              const inputModalities = JSON.parse(modelInfo.input_modalities || '[]');
              const outputModalities = JSON.parse(modelInfo.output_modalities || '[]');
              if (!inputModalities.includes(selectedModality) && !outputModalities.includes(selectedModality)) {
                return false;
              }
            } catch (e) {
              return false;
            }
          } else {
            return false;
          }
        }

        // 标签筛选
        if (selectedTag !== 'all') {
          const modelInfo = modelInfoMap[modelName];
          if (modelInfo) {
            try {
              const tags = JSON.parse(modelInfo.tags || '[]');
              if (!tags.includes(selectedTag)) return false;
            } catch (e) {
              return false;
            }
          } else {
            return false;
          }
        }

        return true;
      })
      .map(([modelName, model]) => {
        const group = userGroupMap[selectedGroup];
        const hasAccess = model.groups.includes(selectedGroup);
        const price = hasAccess
          ? {
              input: group.ratio * model.price.input,
              output: group.ratio * model.price.output
            }
          : { input: t('modelpricePage.noneGroup'), output: t('modelpricePage.noneGroup') };

        // 计算所有用户组的价格F
        const allGroupPrices = sortedGroupEntries.map(([key, grp]) => {
          const hasGroupAccess = model.groups.includes(key);
          return {
            groupName: grp.name,
            groupKey: key,
            available: hasGroupAccess,
            input: hasGroupAccess ? grp.ratio * model.price.input : null,
            output: hasGroupAccess ? grp.ratio * model.price.output : null,
            type: model.price.type,
            ratio: grp.ratio,
            extraRatios:
              model.price.extra_ratios && hasGroupAccess
                ? Object.fromEntries(Object.entries(model.price.extra_ratios).map(([k, v]) => [k, grp.ratio * v]))
                : null
          };
        });

        const selectedGroupExtraRatios =
          model.price.extra_ratios && hasAccess
            ? Object.fromEntries(Object.entries(model.price.extra_ratios).map(([k, v]) => [k, group.ratio * v]))
            : null;

        return {
          model: modelName,
          provider: model.owned_by,
          modelInfo: modelInfoMap[modelName],
          price,
          group: hasAccess ? group : null,
          hasAccess,
          type: model.price.type,
          priceData: {
            price: model.price,
            allGroupPrices,
            selectedGroupKey: selectedGroup,
            selectedGroupName: group?.name,
            selectedGroupHasAccess: hasAccess,
            selectedGroupRatio: group?.ratio || 0,
            selectedGroupExtraRatios
          }
        };
      })
      .sort((a, b) => {
        const ownerA = ownedby?.find((item) => item.name === a.provider);
        const ownerB = ownedby?.find((item) => item.name === b.provider);
        return (ownerA?.id || 0) - (ownerB?.id || 0);
      });
  }, [
    availableModels,
    selectedOwnedBy,
    selectedGroup,
    searchQuery,
    modelInfoMap,
    selectedModality,
    selectedTag,
    userGroupMap,
    sortedGroupEntries,
    ownedby,
    t
  ]);

  // 分页处理
  const paginatedModels = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredModels.slice(startIndex, startIndex + pageSize);
  }, [filteredModels, page, pageSize]);

  // 重置页码
  useEffect(() => {
    setPage(1);
  }, [selectedOwnedBy, selectedGroup, searchQuery, selectedModality, selectedTag, pageSize]);

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (event) => {
    setPageSize(event.target.value);
    setPage(1);
  };

  const handleOwnedByChange = (newValue) => {
    setSelectedOwnedBy(newValue);
  };

  const handleGroupChange = (groupKey) => {
    setSelectedGroup(groupKey);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const uniqueOwnedBy = [
    'all',
    ...[...new Set(Object.values(availableModels).map((model) => model.owned_by))].sort((a, b) => {
      const ownerA = ownedby?.find((item) => item.name === a);
      const ownerB = ownedby?.find((item) => item.name === b);
      return (ownerA?.id || 0) - (ownerB?.id || 0);
    })
  ];

  const getIconByName = (name) => {
    if (name === 'all') return null;
    const owner = ownedby?.find((item) => item.name === name);
    return owner?.icon;
  };

  const getTags = (tagsJson) => {
    if (!tagsJson) return [];
    try {
      return JSON.parse(tagsJson);
    } catch (e) {
      return [];
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleViewDetail = (modelData) => {
    setSelectedModelDetail(modelData);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedModelDetail(null);
  };

  return (
    <>
      <Helmet>
        <title>模型价格 - CZLOapi</title>
        <meta name="description" content="CZLOapi 各 AI 模型定价一览，支持 OpenAI、Claude、Gemini 等主流模型，按 token 计费，价格透明。" />
      </Helmet>
      <Stack spacing={3} sx={{ padding: theme.spacing(3) }}>
        <Card
          elevation={0}
          sx={{
            p: 3,
            overflow: 'visible',
            backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : theme.palette.background.paper,
            borderRadius: 2
          }}
        >
          {/* 搜索和单位提示 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              mb: 3
            }}
          >
            <Paper
              component="form"
              sx={{
                p: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                width: isMobile ? '100%' : 300,
                borderRadius: '8px',
                border: 'none',
                boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                backgroundColor:
                  theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.6) : theme.palette.background.default
              }}
            >
              <IconButton sx={{ p: '8px' }} aria-label="search">
                <Icon icon="eva:search-fill" width={18} height={18} />
              </IconButton>
              <InputBase
                sx={{ ml: 1, flex: 1 }}
                placeholder={t('modelpricePage.search')}
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searchQuery && (
                <IconButton sx={{ p: '8px' }} aria-label="clear" onClick={clearSearch}>
                  <Icon icon="eva:close-fill" width={16} height={16} />
                </IconButton>
              )}
            </Paper>

            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}
            >
              {selectedGroup && userGroupMap[selectedGroup] && (
                <Label color="primary" variant="soft">
                  {t('modelpricePage.selectedGroupDisplay', {
                    name: userGroupMap[selectedGroup].name,
                    ratio: userGroupMap[selectedGroup].ratio
                  })}
                </Label>
              )}
              <Label color="info" variant="soft">
                {t('modelpricePage.tokenUnitHint', 'Token 按 USD / 1M')}
              </Label>
              <Label color="warning" variant="soft">
                {t('modelpricePage.timesUnitHint', '按次模型按 USD / 次')}
              </Label>
            </Box>
          </Box>

          {/* 模型提供商标签 */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1.5,
                fontWeight: 600,
                color: theme.palette.text.primary,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Icon icon="eva:globe-outline" width={18} height={18} />
              {t('modelpricePage.channelType')}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              {uniqueOwnedBy.map((ownedBy, index) => {
                const isSelected = selectedOwnedBy === ownedBy;
                return (
                  <ButtonBase
                    key={index}
                    onClick={() => handleOwnedByChange(ownedBy)}
                    sx={{
                      borderRadius: '6px',
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      transform: isSelected ? 'translateY(-1px)' : 'none',
                      '&:hover': {
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        py: 0.75,
                        px: 1.5,
                        borderRadius: '6px',
                        backgroundColor: isSelected
                          ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.25 : 0.1)
                          : theme.palette.mode === 'dark'
                            ? alpha(theme.palette.background.default, 0.5)
                            : theme.palette.background.default,
                        border: `1px solid ${
                          isSelected
                            ? theme.palette.primary.main
                            : theme.palette.mode === 'dark'
                              ? alpha('#fff', 0.08)
                              : alpha('#000', 0.05)
                        }`,
                        boxShadow: isSelected ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}` : 'none'
                      }}
                    >
                      {ownedBy !== 'all' ? (
                        <Avatar
                          src={getIconByName(ownedBy)}
                          alt={ownedBy}
                          sx={{
                            width: 20,
                            height: 20,
                            backgroundColor: theme.palette.mode === 'dark' ? '#fff' : theme.palette.background.paper,
                            '.MuiAvatar-img': {
                              objectFit: 'contain',
                              padding: '2px'
                            }
                          }}
                        >
                          {ownedBy.charAt(0).toUpperCase()}
                        </Avatar>
                      ) : (
                        <Icon
                          icon="eva:grid-outline"
                          width={18}
                          height={18}
                          color={isSelected ? theme.palette.primary.main : theme.palette.text.secondary}
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
                          fontSize: '0.8125rem'
                        }}
                      >
                        {ownedBy === 'all' ? t('modelpricePage.all') : ownedBy}
                      </Typography>
                    </Box>
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>

          {/* 模态类型筛选 */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1.5,
                fontWeight: 600,
                color: theme.palette.text.primary,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Icon icon="eva:layers-outline" width={18} height={18} />
              {t('modelpricePage.modalityType')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <ButtonBase
                onClick={() => setSelectedModality('all')}
                sx={{
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  transform: selectedModality === 'all' ? 'translateY(-1px)' : 'none',
                  '&:hover': { transform: 'translateY(-1px)' }
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    py: 0.75,
                    px: 1.5,
                    borderRadius: '6px',
                    backgroundColor:
                      selectedModality === 'all'
                        ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.25 : 0.1)
                        : theme.palette.mode === 'dark'
                          ? alpha(theme.palette.background.default, 0.5)
                          : theme.palette.background.default,
                    border: `1px solid ${
                      selectedModality === 'all'
                        ? theme.palette.primary.main
                        : theme.palette.mode === 'dark'
                          ? alpha('#fff', 0.08)
                          : alpha('#000', 0.05)
                    }`,
                    boxShadow: selectedModality === 'all' ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}` : 'none'
                  }}
                >
                  <Icon
                    icon="eva:grid-outline"
                    width={16}
                    height={16}
                    color={selectedModality === 'all' ? theme.palette.primary.main : theme.palette.text.secondary}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: selectedModality === 'all' ? 600 : 500,
                      color: selectedModality === 'all' ? theme.palette.primary.main : theme.palette.text.primary,
                      fontSize: '0.8125rem'
                    }}
                  >
                    {t('modelpricePage.allModality')}
                  </Typography>
                </Box>
              </ButtonBase>
              {Object.entries(MODALITY_OPTIONS).map(([key, option]) => {
                const isSelected = selectedModality === key;
                return (
                  <ButtonBase
                    key={key}
                    onClick={() => setSelectedModality(key)}
                    sx={{
                      borderRadius: '6px',
                      transition: 'all 0.2s ease',
                      transform: isSelected ? 'translateY(-1px)' : 'none',
                      '&:hover': { transform: 'translateY(-1px)' }
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        py: 0.75,
                        px: 1.5,
                        borderRadius: '6px',
                        backgroundColor: isSelected
                          ? alpha(
                              theme.palette[option.color]?.main || theme.palette.primary.main,
                              theme.palette.mode === 'dark' ? 0.25 : 0.1
                            )
                          : theme.palette.mode === 'dark'
                            ? alpha(theme.palette.background.default, 0.5)
                            : theme.palette.background.default,
                        border: `1px solid ${
                          isSelected
                            ? theme.palette[option.color]?.main || theme.palette.primary.main
                            : theme.palette.mode === 'dark'
                              ? alpha('#fff', 0.08)
                              : alpha('#000', 0.05)
                        }`,
                        boxShadow: isSelected
                          ? `0 2px 8px ${alpha(theme.palette[option.color]?.main || theme.palette.primary.main, 0.2)}`
                          : 'none'
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? theme.palette[option.color]?.main || theme.palette.primary.main : theme.palette.text.primary,
                          fontSize: '0.8125rem'
                        }}
                      >
                        {option.text}
                      </Typography>
                    </Box>
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>

          {/* 标签筛选 */}
          {allTags.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 1.5,
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Icon icon="eva:pricetags-outline" width={18} height={18} />
                {t('modelpricePage.tags')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <ButtonBase
                  onClick={() => setSelectedTag('all')}
                  sx={{
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    transform: selectedTag === 'all' ? 'translateY(-1px)' : 'none',
                    '&:hover': { transform: 'translateY(-1px)' }
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      py: 0.75,
                      px: 1.5,
                      borderRadius: '6px',
                      backgroundColor:
                        selectedTag === 'all'
                          ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.25 : 0.1)
                          : theme.palette.mode === 'dark'
                            ? alpha(theme.palette.background.default, 0.5)
                            : theme.palette.background.default,
                      border: `1px solid ${
                        selectedTag === 'all'
                          ? theme.palette.primary.main
                          : theme.palette.mode === 'dark'
                            ? alpha('#fff', 0.08)
                            : alpha('#000', 0.05)
                      }`,
                      boxShadow: selectedTag === 'all' ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}` : 'none'
                    }}
                  >
                    <Icon
                      icon="eva:grid-outline"
                      width={16}
                      height={16}
                      color={selectedTag === 'all' ? theme.palette.primary.main : theme.palette.text.secondary}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: selectedTag === 'all' ? 600 : 500,
                        color: selectedTag === 'all' ? theme.palette.primary.main : theme.palette.text.primary,
                        fontSize: '0.8125rem'
                      }}
                    >
                      {t('modelpricePage.allTags')}
                    </Typography>
                  </Box>
                </ButtonBase>
                {allTags.map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <ButtonBase
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      sx={{
                        borderRadius: '6px',
                        transition: 'all 0.2s ease',
                        transform: isSelected ? 'translateY(-1px)' : 'none',
                        '&:hover': { transform: 'translateY(-1px)' }
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          py: 0.75,
                          px: 1.5,
                          borderRadius: '6px',
                          backgroundColor: isSelected
                            ? alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.25 : 0.1)
                            : theme.palette.mode === 'dark'
                              ? alpha(theme.palette.background.default, 0.5)
                              : theme.palette.background.default,
                          border: `1px solid ${
                            isSelected ? theme.palette.info.main : theme.palette.mode === 'dark' ? alpha('#fff', 0.08) : alpha('#000', 0.05)
                          }`,
                          boxShadow: isSelected ? `0 2px 8px ${alpha(theme.palette.info.main, 0.2)}` : 'none'
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isSelected ? 600 : 500,
                            color: isSelected ? theme.palette.info.main : theme.palette.text.primary,
                            fontSize: '0.8125rem'
                          }}
                        >
                          {tag}
                        </Typography>
                      </Box>
                    </ButtonBase>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* 用户组标签 */}
          <Box sx={{ mb: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1.5
              }}
            >
              <Icon icon="eva:people-outline" width={18} height={18} />
              {t('modelpricePage.group')}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
                p: 1.5,
                borderRadius: '10px',
                backgroundColor:
                  theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.5) : theme.palette.background.default,
                border: `1px solid ${theme.palette.mode === 'dark' ? alpha('#fff', 0.08) : alpha('#000', 0.05)}`
              }}
            >
              {sortedGroupEntries.map(([key, group]) => {
                const isSelected = selectedGroup === key;

                return (
                  <ButtonBase
                    key={key}
                    onClick={() => handleGroupChange(key)}
                    sx={{
                      borderRadius: '6px',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      transform: isSelected ? 'translateY(-1px)' : 'none',
                      '&:hover': {
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.75,
                        px: 1.5,
                        borderRadius: '6px',
                        backgroundColor: isSelected
                          ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.25 : 0.1)
                          : theme.palette.mode === 'dark'
                            ? alpha(theme.palette.background.paper, 0.6)
                            : alpha(theme.palette.background.paper, 1),
                        border: `1px solid ${
                          isSelected
                            ? theme.palette.primary.main
                            : theme.palette.mode === 'dark'
                              ? alpha('#fff', 0.08)
                              : alpha('#000', 0.05)
                        }`
                      }}
                    >
                      <Icon
                        icon={isSelected ? 'eva:checkmark-circle-2-fill' : 'eva:radio-button-off-outline'}
                        width={16}
                        height={16}
                        color={isSelected ? theme.palette.primary.main : theme.palette.text.secondary}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
                          fontSize: '0.8125rem'
                        }}
                      >
                        {group.name}
                      </Typography>
                      <Label color={group.ratio > 1 ? 'warning' : 'info'} variant="soft" sx={{ fontSize: '0.7rem' }}>
                        x{group.ratio}
                      </Label>
                    </Box>
                  </ButtonBase>
                );
              })}
              <Typography variant="body2" color="text.secondary">
                仅展示当前分组可用的模型
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* 模型列表 */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('modelpricePage.totalModels', { count: filteredModels.length })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('modelpricePage.listHint', '列表价格已按当前分组实时换算')}
            </Typography>
          </Box>
          {filteredModels.length > 0 ? (
            <>
              <TableContainer
                component={Paper}
                sx={{
                  boxShadow: 'none',
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  borderRadius: 3,
                  background:
                    theme.palette.mode === 'dark'
                      ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.88)} 0%, ${alpha(theme.palette.background.default, 0.72)} 100%)`
                      : `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.grey[50], 0.9)} 100%)`,
                  overflowX: 'auto'
                }}
              >
                <Table
                  size="small"
                  sx={{
                    minWidth: 1180,
                    borderCollapse: 'separate',
                    borderSpacing: '0 10px',
                    px: 1
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ borderBottom: 'none', color: 'text.secondary', fontWeight: 700 }}>
                        {t('modelpricePage.modelName')}
                      </TableCell>
                      <TableCell sx={{ borderBottom: 'none', color: 'text.secondary', fontWeight: 700 }}>
                        {t('modelpricePage.provider')}
                      </TableCell>
                      <TableCell sx={{ borderBottom: 'none', color: 'text.secondary', fontWeight: 700 }}>
                        {t('modelpricePage.price')}
                      </TableCell>
                      <TableCell sx={{ borderBottom: 'none', color: 'text.secondary', fontWeight: 700 }}>
                        {t('modelpricePage.extraRatios')}
                      </TableCell>
                      <TableCell sx={{ borderBottom: 'none', color: 'text.secondary', fontWeight: 700 }}>
                        {t('modelpricePage.billingRules', '分档价格')}
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: 'none', color: 'text.secondary', fontWeight: 700 }}>
                        {t('common.action')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedModels.map((model) => {
                      const tags = getTags(model.modelInfo?.tags);
                      const isHot = tags.some((tag) => tag.toLowerCase() === 'hot');
                      const visibleTags = tags.filter((tag) => tag.toLowerCase() !== 'hot');

                      return (
                        <TableRow
                          key={model.model}
                          hover
                          sx={{
                            '& .MuiTableCell-root': {
                              borderTop: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                              backgroundColor:
                                theme.palette.mode === 'dark'
                                  ? alpha(theme.palette.background.paper, 0.72)
                                  : alpha(theme.palette.background.paper, 0.95),
                              py: 2
                            },
                            '& .MuiTableCell-root:first-of-type': {
                              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                              borderTopLeftRadius: 16,
                              borderBottomLeftRadius: 16,
                              pl: 2.5
                            },
                            '& .MuiTableCell-root:last-of-type': {
                              borderRight: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                              borderTopRightRadius: 16,
                              borderBottomRightRadius: 16,
                              pr: 2
                            },
                            '&:hover .MuiTableCell-root': {
                              backgroundColor:
                                theme.palette.mode === 'dark'
                                  ? alpha(theme.palette.primary.main, 0.12)
                                  : alpha(theme.palette.primary.main, 0.05)
                            }
                          }}
                        >
                          <TableCell sx={{ width: '30%' }}>
                            <Stack spacing={1.2}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                                  {model.model}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => copy(model.model, t('modelpricePage.modelName'))}
                                  sx={{ color: 'text.secondary', p: 0.5 }}
                                >
                                  <Icon icon="eva:copy-outline" width={16} height={16} />
                                </IconButton>
                                {isHot && (
                                  <Label variant="soft" color="error" startIcon={<Icon icon="mdi:fire" />}>
                                    HOT
                                  </Label>
                                )}
                              </Box>

                              {model.modelInfo?.description && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    lineHeight: 1.6
                                  }}
                                >
                                  {model.modelInfo.description}
                                </Typography>
                              )}

                              {visibleTags.length > 0 && (
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                  {visibleTags.map((tag) => (
                                    <Label key={tag} variant="soft" color="default">
                                      {tag}
                                    </Label>
                                  ))}
                                </Stack>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ width: '18%' }}>
                            <Stack spacing={1}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar
                                  src={getIconByName(model.provider)}
                                  alt={model.provider}
                                  sx={{
                                    width: 30,
                                    height: 30,
                                    backgroundColor: theme.palette.mode === 'dark' ? '#fff' : theme.palette.background.paper,
                                    '.MuiAvatar-img': {
                                      objectFit: 'contain',
                                      p: '4px'
                                    }
                                  }}
                                >
                                  {model.provider?.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {model.provider}
                                </Typography>
                              </Box>

                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                <Label color="primary" variant="soft">
                                  {model.type === 'tokens' ? t('modelpricePage.tokens') : t('modelpricePage.times')}
                                </Label>
                                {model.hasAccess ? (
                                  <>
                                    <Label color="info" variant="soft">
                                      {model.priceData.selectedGroupName}
                                    </Label>
                                    <Label color={model.priceData.selectedGroupRatio > 1 ? 'warning' : 'info'} variant="outlined">
                                      x{model.priceData.selectedGroupRatio}
                                    </Label>
                                  </>
                                ) : (
                                  <Label color="default" variant="outlined">
                                    {t('modelpricePage.noneGroup')}
                                  </Label>
                                )}
                              </Stack>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ width: '16%' }}>
                            {model.hasAccess ? (
                              <Stack spacing={1}>
                                <Box
                                  sx={{
                                    p: 1.25,
                                    borderRadius: 2,
                                    border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                                    backgroundColor: alpha(theme.palette.success.main, 0.08)
                                  }}
                                >
                                  <Typography variant="caption" color="text.secondary">
                                    {model.type === 'times' ? t('modelpricePage.timesPrice') : t('modelpricePage.inputPrice')}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                                    {formatPrice(model.price.input, model.type)}
                                  </Typography>
                                </Box>
                                {model.type !== 'times' && (
                                  <Box
                                    sx={{
                                      p: 1.25,
                                      borderRadius: 2,
                                      border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                                      backgroundColor: alpha(theme.palette.warning.main, 0.08)
                                    }}
                                  >
                                    <Typography variant="caption" color="text.secondary">
                                      {t('modelpricePage.outputPrice')}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                                      {formatPrice(model.price.output, model.type)}
                                    </Typography>
                                  </Box>
                                )}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {t('modelpricePage.noneGroup')}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell sx={{ width: '16%' }}>
                            {model.hasAccess && model.priceData.selectedGroupExtraRatios ? (
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                {Object.entries(model.priceData.selectedGroupExtraRatios).map(([key, value]) => (
                                  <Label key={key} color="default" variant="soft" sx={{ maxWidth: 220 }}>
                                    {`${getExtraRatioDisplayName(key)}: ${formatPrice(value, 'tokens')}`}
                                  </Label>
                                ))}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {model.hasAccess ? t('modelpricePage.noExtraRatios') : t('modelpricePage.noneGroup')}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell sx={{ width: '28%' }}>
                            <BillingRuleDetails
                              rules={model.priceData.price.billing_rules}
                              priceType={model.type}
                              groupRatio={model.priceData.selectedGroupRatio}
                              formatPrice={formatPrice}
                              compact
                            />
                          </TableCell>

                          <TableCell align="center" sx={{ width: '8%' }}>
                            <Tooltip title={t('modelpricePage.viewDetail')}>
                              <IconButton
                                onClick={() => handleViewDetail(model)}
                                size="small"
                                sx={{
                                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                  color: theme.palette.primary.main
                                }}
                              >
                                <Icon icon="eva:eye-outline" width={20} height={20} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4, gap: 2, flexWrap: 'wrap' }}>
                <Pagination
                  count={Math.ceil(filteredModels.length / pageSize)}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size={isMobile ? 'small' : 'medium'}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    displayEmpty
                    inputProps={{ 'aria-label': 'Without label' }}
                    sx={{
                      borderRadius: '8px',
                      '& .MuiSelect-select': {
                        py: 1
                      }
                    }}
                  >
                    {pageSizeOptions.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size} / Page
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </>
          ) : (
            <Card
              sx={{
                p: 8,
                textAlign: 'center',
                backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : theme.palette.background.paper
              }}
            >
              <Stack spacing={2} alignItems="center">
                <Icon icon="eva:search-outline" width={64} height={64} color={theme.palette.text.secondary} />
                <Typography variant="h5" color="text.secondary">
                  {t('modelpricePage.noModelsFound')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('modelpricePage.noModelsFoundTip')}
                </Typography>
              </Stack>
            </Card>
          )}
        </Box>

        {/* 模型详情对话框 */}
        <ModelDetailModal
          open={detailModalOpen}
          onClose={handleCloseDetail}
          model={selectedModelDetail?.model}
          provider={selectedModelDetail?.provider}
          modelInfo={selectedModelDetail?.modelInfo}
          priceData={selectedModelDetail?.priceData}
          ownedbyIcon={selectedModelDetail ? getIconByName(selectedModelDetail.provider) : null}
          userGroupMap={userGroupMap}
          formatPrice={formatPrice}
        />
      </Stack>
    </>
  );
}
