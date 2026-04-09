import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
import BillingRuleDetails, { getExtraRatioDisplayName } from './component/BillingRuleDetails';
import Label from 'ui-component/Label';
import SubscriptionPlanCards from 'ui-component/SubscriptionPlanCards';
import { Helmet } from 'react-helmet-async';

const getProviderRatioRules = (group) => {
  return Array.isArray(group?.provider_ratios) ? group.provider_ratios : [];
};

const getProviderRatioForGroup = (group, channelType) => {
  if (!group || !Number.isFinite(Number(channelType)) || Number(channelType) <= 0) {
    return 1;
  }

  const matchedRule = getProviderRatioRules(group).find((rule) => Number(rule?.channel_type) === Number(channelType));
  const providerRatio = Number(matchedRule?.ratio);
  return Number.isFinite(providerRatio) && providerRatio > 0 ? providerRatio : 1;
};

const getEffectiveGroupRatio = (group, channelType) => {
  const baseGroupRatio = Number(group?.ratio);
  if (!Number.isFinite(baseGroupRatio)) {
    return 0;
  }

  return baseGroupRatio * getProviderRatioForGroup(group, channelType);
};

const scaleExtraRatios = (extraRatios, effectiveRatio) => {
  if (!extraRatios) {
    return null;
  }

  return Object.fromEntries(Object.entries(extraRatios).map(([key, value]) => [key, effectiveRatio * value]));
};

const formatRatioLabel = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 'x0';
  }

  return `x${numericValue.toFixed(numericValue >= 1 ? 4 : 6).replace(/(\.\d*?[1-9])0+$|\.0*$/, '$1')}`;
};

// ----------------------------------------------------------------------
export default function ModelPrice() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const ownedby = useSelector((state) => state.siteInfo?.ownedby);
  const user = useSelector((state) => state.account?.user);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('models');
  const [availableModels, setAvailableModels] = useState({});
  const [userGroupMap, setUserGroupMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedOwnedBy, setSelectedOwnedBy] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const pageSizeOptions = [20, 30, 60, 100];

  const sortedGroupEntries = useMemo(() => {
    return Object.entries(userGroupMap).sort(([, a], [, b]) => {
      if (a.ratio !== b.ratio) {
        return a.ratio - b.ratio;
      }
      return a.id - b.id;
    });
  }, [userGroupMap]);

  const selectedGroupProviderRatios = useMemo(() => {
    const group = userGroupMap[selectedGroup];
    if (!group) {
      return [];
    }

    return getProviderRatioRules(group)
      .map((rule) => {
        const provider = ownedby?.find((item) => item.id === Number(rule.channel_type));
        return {
          channelType: Number(rule.channel_type),
          ratio: Number(rule.ratio),
          name: provider?.name || `${t('modelpricePage.provider', '供应商')} #${rule.channel_type}`
        };
      })
      .filter((rule) => Number.isFinite(rule.ratio) && rule.ratio > 0)
      .sort((a, b) => a.channelType - b.channelType);
  }, [ownedby, selectedGroup, t, userGroupMap]);

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

  const fetchSubscriptionPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      const res = await API.get('/api/user/subscription_plan');
      if (res.data.success) {
        setSubscriptionPlans(res.data.data || []);
      }
    } catch {
      // not critical
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableModels();
    fetchUserGroupMap();
    fetchSubscriptionPlans();
  }, [fetchAvailableModels, fetchUserGroupMap, fetchSubscriptionPlans]);

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
          const matchModel = modelName.toLowerCase().includes(query);
          if (!matchModel) return false;
        }

        return true;
      })
      .map(([modelName, model]) => {
        const group = userGroupMap[selectedGroup];
        const channelType = Number(model?.price?.channel_type);
        const hasAccess = model.groups.includes(selectedGroup);
        const selectedProviderRatio = hasAccess ? getProviderRatioForGroup(group, channelType) : 1;
        const selectedEffectiveGroupRatio = hasAccess ? getEffectiveGroupRatio(group, channelType) : 0;
        const price = hasAccess
          ? {
              input: selectedEffectiveGroupRatio * model.price.input,
              output: selectedEffectiveGroupRatio * model.price.output
            }
          : { input: t('modelpricePage.noneGroup'), output: t('modelpricePage.noneGroup') };

        const allGroupPrices = sortedGroupEntries.map(([key, grp]) => {
          const hasGroupAccess = model.groups.includes(key);
          const providerRatio = hasGroupAccess ? getProviderRatioForGroup(grp, channelType) : 1;
          const effectiveRatio = hasGroupAccess ? getEffectiveGroupRatio(grp, channelType) : 0;
          return {
            groupName: grp.name,
            groupKey: key,
            available: hasGroupAccess,
            input: hasGroupAccess ? effectiveRatio * model.price.input : null,
            output: hasGroupAccess ? effectiveRatio * model.price.output : null,
            type: model.price.type,
            ratio: grp.ratio,
            providerRatio,
            effectiveRatio,
            extraRatios: hasGroupAccess ? scaleExtraRatios(model.price.extra_ratios, effectiveRatio) : null
          };
        });

        const selectedGroupExtraRatios = hasAccess ? scaleExtraRatios(model.price.extra_ratios, selectedEffectiveGroupRatio) : null;

        return {
          model: modelName,
          provider: model.owned_by,
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
            selectedProviderRatio,
            selectedEffectiveRatio: selectedEffectiveGroupRatio,
            selectedGroupExtraRatios
          }
        };
      })
      .sort((a, b) => {
        const ownerA = ownedby?.find((item) => item.name === a.provider);
        const ownerB = ownedby?.find((item) => item.name === b.provider);
        return (ownerA?.id || 0) - (ownerB?.id || 0);
      });
  }, [availableModels, selectedOwnedBy, selectedGroup, searchQuery, userGroupMap, sortedGroupEntries, ownedby, t]);

  // 分页处理
  const paginatedModels = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredModels.slice(startIndex, startIndex + pageSize);
  }, [filteredModels, page, pageSize]);

  // 重置页码
  useEffect(() => {
    setPage(1);
  }, [selectedOwnedBy, selectedGroup, searchQuery, pageSize]);

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

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <>
      <Helmet>
        <title>模型价格 - CZLOapi</title>
        <meta name="description" content="CZLOapi 各 AI 模型定价一览，支持 OpenAI、Claude、Gemini 等主流模型，按 token 计费，价格透明。" />
      </Helmet>
      <Stack spacing={2} sx={{ padding: { xs: theme.spacing(2), md: theme.spacing(2.5) } }}>
        {/* Tab 切换器 - 仅在有套餐时显示 */}
        {subscriptionPlans.length > 0 && (
          <Box
            sx={{
              width: '100%',
              maxWidth: 420,
              p: 0.5,
              mx: 'auto',
              borderRadius: '999px',
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor:
                theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.72) : alpha(theme.palette.common.white, 0.88),
              backdropFilter: 'blur(12px)'
            }}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.5 }}>
              {[
                { value: 'models', icon: 'solar:tag-bold-duotone', label: t('modelpricePage.modelPrice', '模型价格') },
                { value: 'plans', icon: 'solar:layers-minimalistic-linear', label: t('subscription.subscriptionPlans') }
              ].map((tab) => {
                const selected = activeTab === tab.value;
                return (
                  <ButtonBase
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    sx={{
                      width: '100%',
                      minHeight: 44,
                      px: 2,
                      borderRadius: '999px',
                      color: selected ? theme.palette.primary.main : theme.palette.text.secondary,
                      backgroundColor: selected
                        ? theme.palette.mode === 'dark'
                          ? alpha(theme.palette.primary.main, 0.16)
                          : alpha(theme.palette.primary.main, 0.1)
                        : 'transparent',
                      border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.26) : 'transparent'}`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: selected
                          ? undefined
                          : theme.palette.mode === 'dark'
                            ? alpha(theme.palette.common.white, 0.04)
                            : alpha(theme.palette.common.black, 0.03)
                      }
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <Icon icon={tab.icon} width={18} />
                      <Typography variant="subtitle2" fontWeight={selected ? 700 : 600}>
                        {tab.label}
                      </Typography>
                    </Stack>
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>
        )}

        {activeTab === 'models' && (<>
        <Card
          elevation={0}
          sx={{
            p: { xs: 1.5, md: 2 },
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
              mb: 1.5
            }}
          >
            <Paper
              component="form"
              sx={{
                p: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                width: isMobile ? '100%' : 280,
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
              {selectedGroupProviderRatios.map((item) => (
                <Label key={`selected-provider-ratio-${item.channelType}`} color="warning" variant="soft">
                  {`${item.name} ${formatRatioLabel(item.ratio)}`}
                </Label>
              ))}
              <Typography variant="caption" color="text.secondary">
                {t('modelpricePage.tokenUnitHint', 'Token 按 USD / 1M')} · {t('modelpricePage.timesUnitHint', '按次模型按 USD / 次')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('modelpricePage.groupPriceFormulaHint', '展示价格 = 基础价格 × 分组倍率 × 厂商附加倍率（如命中）')}
              </Typography>
            </Box>
          </Box>

          {/* 模型提供商标签 */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1.25 }} alignItems={{ md: 'flex-start' }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.secondary,
                minWidth: { md: 72 },
                pt: { md: 0.75 }
              }}
            >
              {t('modelpricePage.channelType')}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                flex: 1
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
                        gap: 0.625,
                        py: 0.5,
                        px: 1.125,
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
                            width: 18,
                            height: 18,
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
                          fontSize: '0.75rem',
                          lineHeight: 1.2
                        }}
                      >
                        {ownedBy === 'all' ? t('modelpricePage.all') : ownedBy}
                      </Typography>
                    </Box>
                  </ButtonBase>
                );
              })}
            </Box>
          </Stack>

          {/* 用户组标签 */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 0 }} alignItems={{ md: 'flex-start' }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.secondary,
                minWidth: { md: 72 },
                pt: { md: 0.75 }
              }}
            >
              {t('modelpricePage.group')}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                flexWrap: 'wrap',
                p: 1,
                borderRadius: '8px',
                flex: 1,
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
                        gap: 0.75,
                        py: 0.5,
                        px: 1.125,
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
                          fontSize: '0.75rem',
                          lineHeight: 1.2
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
            </Box>
          </Stack>
        </Card>

        {/* 模型列表 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
            {t('modelpricePage.totalModels', { count: filteredModels.length })} ·{' '}
            {t('modelpricePage.listHint', '列表价格已按当前分组和厂商附加倍率实时换算')}
          </Typography>
          {filteredModels.length > 0 ? (
            <>
              <TableContainer
                component={Paper}
                sx={{
                  boxShadow: 'none',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  overflowX: 'auto'
                }}
              >
                <Table sx={{ minWidth: 1180 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('modelpricePage.modelName')}</TableCell>
                      <TableCell align="center">{t('modelpricePage.type')}</TableCell>
                      <TableCell align="center">{t('modelpricePage.provider')}</TableCell>
                      <TableCell align="center">{t('modelpricePage.inputPrice')}</TableCell>
                      <TableCell align="center">{t('modelpricePage.outputPrice')}</TableCell>
                      <TableCell align="center">{t('modelpricePage.extraRatios')}</TableCell>
                      <TableCell align="center">{t('modelpricePage.billingRules', '分档价格')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedModels.map((model) => {
                      return (
                        <TableRow key={model.model} hover>
                          <TableCell sx={{ width: '28%' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                                  {model.model}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => copy(model.model, t('modelpricePage.modelName'))}
                                  sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                                >
                                  <Icon icon="eva:copy-outline" width={16} height={16} />
                                </IconButton>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell align="center" sx={{ width: '10%' }}>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                            >
                              {model.type === 'tokens' ? t('modelpricePage.tokens') : t('modelpricePage.times')}
                            </Box>
                          </TableCell>

                          <TableCell align="center" sx={{ width: '12%' }}>
                            <Stack spacing={0.75} alignItems="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                <Avatar
                                  src={getIconByName(model.provider)}
                                  alt={model.provider}
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    backgroundColor: theme.palette.mode === 'dark' ? '#fff' : theme.palette.background.paper,
                                    '& .MuiAvatar-img': {
                                      objectFit: 'contain',
                                      padding: '2px'
                                    }
                                  }}
                                />
                                <Typography variant="body2">{model.provider}</Typography>
                              </Box>
                              {model.hasAccess && (
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="center">
                                  <Label color="info" variant="soft" sx={{ fontSize: '0.68rem' }}>
                                    {`${t('modelpricePage.baseGroupRatio', '基础倍率')} ${formatRatioLabel(model.priceData.selectedGroupRatio)}`}
                                  </Label>
                                  {model.priceData.selectedProviderRatio !== 1 && (
                                    <Label color="warning" variant="soft" sx={{ fontSize: '0.68rem' }}>
                                      {`${t('modelpricePage.providerRatio', '厂商倍率')} ${formatRatioLabel(model.priceData.selectedProviderRatio)}`}
                                    </Label>
                                  )}
                                  <Label color="primary" variant="soft" sx={{ fontSize: '0.68rem' }}>
                                    {`${t('modelpricePage.effectiveGroupRatio', '最终倍率')} ${formatRatioLabel(
                                      model.priceData.selectedEffectiveRatio
                                    )}`}
                                  </Label>
                                </Stack>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell align="center" sx={{ width: '10%' }}>
                            {model.hasAccess ? (
                              <Label color="success" variant="outlined">
                                {formatPrice(model.price.input, model.type)}
                              </Label>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {t('modelpricePage.noneGroup')}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell align="center" sx={{ width: '10%' }}>
                            {model.type === 'times' ? (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            ) : model.hasAccess ? (
                              <Label color="warning" variant="outlined">
                                {formatPrice(model.price.output, model.type)}
                              </Label>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {t('modelpricePage.noneGroup')}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell align="center" sx={{ width: '14%' }}>
                            {model.hasAccess && model.priceData.selectedGroupExtraRatios ? (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="center">
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

                          <TableCell align="center" sx={{ width: '10%' }}>
                            <BillingRuleDetails
                              rules={model.priceData.price.billing_rules}
                              priceType={model.type}
                              groupRatio={model.priceData.selectedEffectiveRatio}
                              formatPrice={formatPrice}
                              compact
                            />
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
        </>)}

        {activeTab === 'plans' && (
          <Box sx={{ maxWidth: 1180, mx: 'auto', width: '100%' }}>
            <Typography variant="h4" sx={{ mb: 2, textAlign: 'center', fontWeight: 700 }}>
              {t('subscription.subscriptionPlans')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              {t('subscription.plansDescription')}
            </Typography>
            <SubscriptionPlanCards
              plans={subscriptionPlans}
              loading={plansLoading}
              onBuy={() => navigate('/panel/topup')}
              buyButtonLabel={t('subscription.purchase')}
            />
          </Box>
        )}
      </Stack>
    </>
  );
}
