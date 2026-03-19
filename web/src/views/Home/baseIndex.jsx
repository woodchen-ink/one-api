import React from 'react';
import {
  Box,
  Typography,
  Container,
  Stack,
  Grid,
  Card,
  CardContent,
  Button,
  Link,
  useTheme,
  Avatar,
  Chip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ChatIcon from '@mui/icons-material/Chat';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import InfoIcon from '@mui/icons-material/Info';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import ExtensionIcon from '@mui/icons-material/Extension';
import CodeIcon from '@mui/icons-material/Code';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import PolylineOutlinedIcon from '@mui/icons-material/PolylineOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';

const FeatureCard = ({ icon, title, description, link, index }) => {
  const theme = useTheme();
  return (
    <Card
      component="a"
      href={link}
      target="_blank"
      sx={{
        height: '100%',
        textDecoration: 'none',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid transparent',
        borderRadius: '24px',
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.background.default, 0.88)} 100%)`
            : `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.primary.light, 0.08)} 100%)`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 18px 40px rgba(0,0,0,0.18)'
            : '0 18px 40px rgba(16,19,26,0.06)',
        transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 24px 48px rgba(0,0,0,0.26)'
              : `0 24px 48px ${alpha(theme.palette.primary.main, 0.1)}`,
          '& .feature-icon': {
            transform: 'scale(1.08) translateY(-2px)'
          },
          '& .feature-arrow': {
            transform: 'translateX(2px)'
          }
        }
      }}
    >
      <CardContent
        sx={{
          p: 4,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          textAlign: 'left',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ width: '100%', mb: 3 }}>
          <Avatar
            className="feature-icon"
            sx={{
              width: 64,
              height: 64,
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.1),
              color: 'primary.main',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
            }}
          >
            {icon}
          </Avatar>
          <Typography
            variant="overline"
            sx={{
              color: 'text.secondary',
              letterSpacing: '0.14em'
            }}
          >
            FEATURE 0{index + 1}
          </Typography>
        </Stack>
        <Typography
          variant="h6"
          sx={{
            mb: 1.5,
            fontWeight: 600,
            fontSize: '1.12rem',
            color: 'text.primary'
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            flexGrow: 1,
            color: 'text.secondary',
            lineHeight: 1.75,
            fontSize: '0.93rem',
            mb: 3
          }}
        >
          {description}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'primary.main', mt: 'auto' }}>
          <Typography variant="caption" sx={{ letterSpacing: '0.12em', fontWeight: 600 }}>
            LEARN MORE
          </Typography>
          <ArrowForwardIcon className="feature-arrow" sx={{ fontSize: '1rem', transition: 'transform 0.3s ease' }} />
        </Stack>
      </CardContent>
    </Card>
  );
};

const FooterLink = ({ icon, title, link }) => {
  const theme = useTheme();
  return (
    <Button
      component={Link}
      href={link}
      target="_blank"
      startIcon={icon}
      sx={{
        color: 'text.secondary',
        borderRadius: '999px',
        px: 2.25,
        py: 1,
        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
        backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.42 : 0.78),
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        '&:hover': {
          color: 'primary.main',
          borderColor: alpha(theme.palette.primary.main, 0.24),
          backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
          transform: 'translateY(-2px)'
        }
      }}
    >
      {title}
    </Button>
  );
};

const NativeRoutePanel = ({ nativeRoutes }) => {
  const theme = useTheme();
  const totalRoutes = nativeRoutes.reduce((sum, item) => sum + item.routes.length, 0);

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '28px',
        border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.34 : 0.16)}`,
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.92)} 100%)`
            : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 28px 60px rgba(0, 0, 0, 0.34)'
            : `0 28px 60px ${alpha(theme.palette.primary.main, 0.14)}`,
        backdropFilter: 'blur(16px)',
        p: { xs: 2.5, md: 3 },
        isolation: 'isolate',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 'auto -15% -35% auto',
          width: { xs: 220, md: 280 },
          height: { xs: 220, md: 280 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.16)} 0%, transparent 72%)`,
          animation: 'heroOrb 10s ease-in-out infinite'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${alpha(theme.palette.common.white, 0)} 0%, ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.24)} 50%, ${alpha(theme.palette.common.white, 0)} 100%)`,
          transform: 'translateY(-120%)',
          animation: 'panelScan 8s linear infinite',
          pointerEvents: 'none'
        },
        '@keyframes heroOrb': {
          '0%, 100%': {
            transform: 'translate3d(0, 0, 0) scale(1)'
          },
          '50%': {
            transform: 'translate3d(-18px, -12px, 0) scale(1.08)'
          }
        },
        '@keyframes panelScan': {
          '0%': {
            transform: 'translateY(-120%)'
          },
          '100%': {
            transform: 'translateY(120%)'
          }
        },
        '@keyframes signalFloat': {
          '0%, 100%': {
            transform: 'translate3d(0, 0, 0)'
          },
          '50%': {
            transform: 'translate3d(0, -6px, 0)'
          }
        }
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: theme.palette.mode === 'dark' ? 0.2 : 0.08,
          backgroundImage: `
            linear-gradient(${alpha(theme.palette.primary.main, 0.45)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.45)} 1px, transparent 1px)
          `,
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(circle at center, black 45%, transparent 90%)',
          pointerEvents: 'none'
        }}
      />

      <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Chip
              icon={<HubOutlinedIcon sx={{ fontSize: '1rem !important' }} />}
              label="Native Route Matrix"
              sx={{
                mb: 1.5,
                color: 'primary.main',
                borderColor: alpha(theme.palette.primary.main, 0.24),
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                '& .MuiChip-icon': {
                  color: 'primary.main'
                }
              }}
              variant="outlined"
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                mb: 0.75,
                letterSpacing: '-0.03em',
                color: 'text.primary'
              }}
            >
              支持的原生厂家与路径
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.75,
                maxWidth: '520px'
              }}
            >
              直接复用本站域名访问 OpenAI Compatible、Claude 与 Gemini 的原生路径，降低迁移成本，同时保留原生 SDK
              与请求习惯。
            </Typography>
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 84,
              height: 84,
              borderRadius: '24px',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
              boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.4)}`,
              animation: 'signalFloat 5s ease-in-out infinite'
            }}
          >
            <MemoryOutlinedIcon color="primary" sx={{ fontSize: '2rem' }} />
          </Box>
        </Stack>

        <Grid container spacing={1.5}>
          {[
            { label: '原生厂商', value: `${nativeRoutes.length}`, icon: <MemoryOutlinedIcon fontSize="small" /> },
            { label: '可用路径', value: `${totalRoutes}`, icon: <PolylineOutlinedIcon fontSize="small" /> },
            { label: '接入方式', value: '原生兼容', icon: <AutoAwesomeOutlinedIcon fontSize="small" /> }
          ].map((item) => (
            <Grid item xs={12} sm={4} key={item.label}>
              <Box
                sx={{
                  p: { xs: 1.25, md: 1.5 },
                  borderRadius: '18px',
                  border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                  backgroundColor: alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.54 : 0.56)
                }}
              >
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75, color: 'primary.main' }}>
                  {item.icon}
                  <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
                    {item.label}
                  </Typography>
                </Stack>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1rem', md: '1.2rem' },
                    color: 'text.primary'
                  }}
                >
                  {item.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Stack spacing={1.5}>
          {nativeRoutes.map((item, index) => (
            <Box
              key={item.provider}
              sx={{
                position: 'relative',
                p: { xs: 1.75, md: 2.25 },
                borderRadius: '22px',
                border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12)}`,
                background:
                  theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.82)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`
                    : `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.92)} 0%, ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
                transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.35s ease, box-shadow 0.35s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  borderColor: alpha(theme.palette.primary.main, 0.32),
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 18px 36px rgba(0, 0, 0, 0.22)'
                      : `0 18px 36px ${alpha(theme.palette.primary.main, 0.1)}`
                }
              }}
            >
              <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 1.75 }}>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      display: 'block',
                      color: 'primary.main',
                      letterSpacing: '0.12em'
                    }}
                  >
                    {item.vendor}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      fontSize: { xs: '1.1rem', md: '1.25rem' }
                    }}
                  >
                    {item.provider}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    minWidth: 44,
                    height: 44,
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                    color: 'primary.main',
                    fontWeight: 700,
                    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08)
                  }}
                >
                  0{index + 1}
                </Box>
              </Stack>

              <Stack spacing={1}>
                {item.routes.map((route, routeIndex) => (
                  <Box
                    key={route}
                    sx={{
                      p: 1.25,
                      borderRadius: '16px',
                      border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                      backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.32 : 0.76)
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mb: 0.5,
                        color: 'text.secondary',
                        letterSpacing: '0.08em'
                      }}
                    >
                      ROUTE {routeIndex + 1}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
                        fontSize: '0.84rem',
                        color: 'text.primary',
                        wordBreak: 'break-all'
                      }}
                    >
                      {route}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
};

const BaseIndex = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const nativeRoutes = [
    {
      provider: 'OpenAI Compatible',
      vendor: 'OpenAI / OpenAI-compatible',
      routes: ['/v1/chat/completions', '/v1/responses', '/v1/embeddings']
    },
    {
      provider: 'Claude Native',
      vendor: 'Anthropic Claude',
      routes: ['/v1/messages']
    },
    {
      provider: 'Gemini Native',
      vendor: 'Google Gemini',
      routes: ['/v1beta/models/{model}:generateContent', '/v1beta/models/{model}:streamGenerateContent']
    }
  ];

  const features = [
    {
      icon: <SearchIcon fontSize="large" />,
      title: '开启联网搜索',
      description: '获取最新信息和数据，让AI回答更加准确和全面，实时获取互联网上的最新信息。',
      link: 'https://docs.czl.net/czloapi/features/open-web-search'
    },
    {
      icon: <PsychologyIcon fontSize="large" />,
      title: '使用思考模式',
      description: '让AI模型通过分步思考提高回答质量，对复杂问题进行逻辑推理和分析，提供更加深入的见解。',
      link: 'https://docs.czl.net/czloapi/features/thinking-mode'
    },
    {
      icon: <ChatIcon fontSize="large" />,
      title: '部署到飞书机器人',
      description: '将CZLOapi的强大能力无缝集成到飞书平台，提升团队协作与知识管理效率。',
      link: 'https://docs.czl.net/czloapi/practice/feishugpt'
    },
    {
      icon: <LibraryBooksIcon fontSize="large" />,
      title: '接入到思源笔记',
      description: '将AI能力与思源笔记结合，增强您的知识管理和笔记系统，提升工作效率。',
      link: 'https://docs.czl.net/czloapi/practice/siyuan'
    },
    {
      icon: <ExtensionIcon fontSize="large" />,
      title: 'Cline AI编程',
      description: '了解如何接入VSCode Cline，AI自动编程插件，提升您的开发效率。',
      link: 'https://www.sunai.net/t/429'
    },
    {
      icon: <CodeIcon fontSize="large" />,
      title: 'Claude Code AI编程',
      description: '使用Claude Code进行AI辅助编程，支持代码生成、调试和优化，大大提升开发效率和代码质量。',
      link: 'https://www.sunai.net/t/topic/939'
    }
  ];

  const footerLinks = [
    {
      icon: <InfoIcon />,
      title: '关于我们',
      link: 'https://docs.czl.net/czloapi/about/%E5%85%B3%E4%BA%8E%E6%88%91%E4%BB%AC'
    },
    {
      icon: <GavelIcon />,
      title: '服务条款',
      link: 'https://www.czl.net/tos'
    },
    {
      icon: <SecurityIcon />,
      title: '免责声明',
      link: 'https://docs.czl.net/czloapi/about/%E5%85%8D%E8%B4%A3%E5%A3%B0%E6%98%8E'
    },
    {
      icon: <PrivacyTipIcon />,
      title: '隐私政策',
      link: 'https://www.czl.net/privacy'
    }
  ];

  const totalNativeRoutes = nativeRoutes.reduce((sum, item) => sum + item.routes.length, 0);
  const advantages = [
    {
      title: '高性能',
      description: '提供先进模型访问与稳定吞吐，兼顾响应速度、调度效率和持续可用性。',
      icon: <PolylineOutlinedIcon fontSize="small" />,
      tag: 'LOW LATENCY'
    },
    {
      title: '易于集成',
      description: '保持原生路径和接入习惯，迁移成本更低，文档与示例也更容易落地。',
      icon: <HubOutlinedIcon fontSize="small" />,
      tag: 'NATIVE COMPAT'
    },
    {
      title: '安全可靠',
      description: '通过稳健的代理层与数据保护机制，让业务上线更安心，扩展也更从容。',
      icon: <SecurityIcon fontSize="small" />,
      tag: 'TRUSTED LAYER'
    }
  ];

  return (
    <>
      {/* 头部区域 */}
      <Box
        sx={{
          minHeight: '86vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === 'dark'
              ? `radial-gradient(circle at top left, ${alpha(theme.palette.primary.main, 0.18)} 0%, transparent 34%), linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.88)} 0%, ${theme.palette.background.default} 100%)`
              : `radial-gradient(circle at top left, ${alpha(theme.palette.primary.light, 0.24)} 0%, transparent 34%), linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${theme.palette.background.default} 100%)`
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)} 1px, transparent 1px),
              linear-gradient(90deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)} 1px, transparent 1px)
            `,
            backgroundSize: { xs: '28px 28px', md: '40px 40px' },
            maskImage: 'radial-gradient(circle at center, black 38%, transparent 94%)',
            pointerEvents: 'none'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 72, md: 120 },
            right: { xs: -72, md: 40 },
            width: { xs: 180, md: 280 },
            height: { xs: 180, md: 280 },
            borderRadius: '50%',
            border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.12)}`,
            boxShadow: `0 0 0 24px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.03)}, 0 0 0 54px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.04 : 0.02)}`
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 8, md: 10 } }}>
          <Grid container spacing={{ xs: 5, md: 7 }} alignItems="center">
            <Grid item xs={12} lg={5}>
              <Stack spacing={3}>
                <Chip
                  label="AI Native Gateway"
                  icon={<AutoAwesomeOutlinedIcon sx={{ fontSize: '1rem !important' }} />}
                  sx={{
                    width: 'fit-content',
                    color: 'primary.main',
                    borderColor: alpha(theme.palette.primary.main, 0.24),
                    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                    '& .MuiChip-icon': {
                      color: 'primary.main'
                    }
                  }}
                  variant="outlined"
                />
                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 300,
                    fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
                    color: 'text.primary',
                    letterSpacing: '-0.04em',
                    lineHeight: 0.95
                  }}
                >
                  CZLOapi
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 500,
                    fontSize: { xs: '1.6rem', md: '2.2rem' },
                    color: 'text.primary',
                    letterSpacing: '-0.03em',
                    maxWidth: '560px'
                  }}
                >
                  让原生 SDK 直接连上你的未来接口层
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 400,
                    color: 'text.secondary',
                    maxWidth: '560px',
                    lineHeight: 1.75
                  }}
                >
                  {t('description')} 
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    component={RouterLink}
                    to="/panel"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      borderRadius: '14px',
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? '0 12px 28px rgba(0,0,0,0.26)'
                          : `0 12px 28px ${alpha(theme.palette.primary.main, 0.16)}`,
                      transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow:
                          theme.palette.mode === 'dark'
                            ? '0 16px 36px rgba(0,0,0,0.32)'
                            : `0 16px 36px ${alpha(theme.palette.primary.main, 0.2)}`
                      }
                    }}
                  >
                    开始使用
                  </Button>
                  <Button
                    component={Link}
                    href="https://docs.czl.net/czloapi/"
                    target="_blank"
                    variant="outlined"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.05rem',
                      fontWeight: 500,
                      borderRadius: '14px',
                      borderWidth: '1px',
                      transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                      '&:hover': {
                        borderWidth: '1px',
                        backgroundColor: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
                        borderColor: theme.palette.secondary.main,
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    查看文档
                  </Button>
                </Stack>

                <Grid container spacing={1.5} sx={{ pt: 0.5 }}>
                  {[
                    { label: '兼容厂家', value: `${nativeRoutes.length}` },
                    { label: '原生路径', value: `${totalNativeRoutes}` },
                    { label: '接入体验', value: '零心智切换' }
                  ].map((item) => (
                    <Grid item xs={12} sm={4} key={item.label}>
                      <Box
                        sx={{
                          p: 1.75,
                          height: '100%',
                          borderRadius: '18px',
                          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                          backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.5 : 0.82),
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
                          {item.label}
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            mt: 0.5,
                            fontWeight: 700,
                            color: item.label === '接入体验' ? 'primary.main' : 'text.primary',
                            fontSize: { xs: '1.05rem', md: '1.2rem' }
                          }}
                        >
                          {item.value}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={7}>
              <NativeRoutePanel nativeRoutes={nativeRoutes} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box
        sx={{
          position: 'relative',
          py: 10,
          px: 2,
          backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.4) : '#FBFBFC',
          borderTop: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Container maxWidth="lg">
          <Stack alignItems="center" spacing={2} sx={{ mb: 8, textAlign: 'center' }}>
            <Chip
              label="Capability Modules"
              variant="outlined"
              sx={{
                color: 'primary.main',
                borderColor: alpha(theme.palette.primary.main, 0.24),
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06)
              }}
            />
          <Typography
            variant="h2"
            align="center"
            sx={{
              fontWeight: 300,
              fontSize: { xs: '2rem', md: '2.5rem' },
              color: 'text.primary'
            }}
          >
            强大特性
          </Typography>
          <Typography
            variant="h6"
            align="center"
            sx={{
              fontWeight: 400,
              color: 'text.secondary',
              maxWidth: '760px',
              mx: 'auto',
              lineHeight: 1.7
            }}
          >
            探索 CZLOapi 为您带来的无限可能
          </Typography>
          </Stack>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} lg={4} key={index}>
                <FeatureCard {...feature} index={index} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 优势区域 - Apple风格 */}
      <Box
        sx={{
          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.96) : '#F6F7F8',
          py: 10,
          px: 2,
          position: 'relative',
          overflow: 'hidden',
          borderTop: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: { xs: -120, md: -180 },
            left: { xs: -120, md: -40 },
            width: { xs: 240, md: 360 },
            height: { xs: 240, md: 360 },
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)} 0%, transparent 72%)`,
            pointerEvents: 'none'
          }}
        />
        <Container maxWidth="lg">
          <Stack alignItems="center" spacing={2} sx={{ mb: 8, textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <Chip
              label="Why CZLOapi"
              variant="outlined"
              sx={{
                color: 'primary.main',
                borderColor: alpha(theme.palette.primary.main, 0.24),
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06)
              }}
            />
            <Typography
              variant="h2"
              align="center"
              sx={{
                fontWeight: 300,
                fontSize: { xs: '2rem', md: '2.5rem' },
                color: 'text.primary'
              }}
            >
              为什么选择 CZLOapi
            </Typography>
            <Typography
              variant="h6"
              align="center"
              sx={{
                fontWeight: 400,
                color: 'text.secondary',
                maxWidth: '680px',
                mx: 'auto',
                lineHeight: 1.75
              }}
            >
              不只是把模型接进来，而是把接入体验、稳定性和长期扩展一起整理成可复用的接口层。
            </Typography>
          </Stack>
          <Grid container spacing={4}>
            {advantages.map((advantage, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box
                  sx={{
                    p: 4,
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '24px',
                    background:
                      theme.palette.mode === 'dark'
                        ? `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.92)} 0%, ${alpha(theme.palette.background.default, 0.88)} 100%)`
                        : `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.primary.light, 0.07)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1)}`,
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 18px 40px rgba(0,0,0,0.16)'
                        : '0 18px 40px rgba(16,19,26,0.05)',
                    transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: '0 0 auto 0',
                      height: '2px',
                      background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.72)} 0%, ${alpha(theme.palette.secondary.main, 0.24)} 100%)`
                    },
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      borderColor: alpha(theme.palette.secondary.main, 0.24),
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? '0 24px 48px rgba(0,0,0,0.22)'
                          : `0 24px 48px ${alpha(theme.palette.primary.main, 0.08)}`
                    }
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'primary.main',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                        backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08)
                      }}
                    >
                      {advantage.icon}
                    </Box>
                    <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.14em' }}>
                      0{index + 1}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.14em' }}>
                    {advantage.tag}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 600,
                      mt: 1.5,
                      mb: 2,
                      color: 'text.primary',
                      fontSize: { xs: '1.45rem', md: '1.7rem' }
                    }}
                  >
                    {advantage.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.8,
                      fontSize: '0.98rem'
                    }}
                  >
                    {advantage.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 页脚链接区域 - 简化版 */}
      <Box
        sx={{
          py: 7,
          px: 2,
          backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.96) : '#F6F7F8',
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: '28px',
              border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1)}`,
              background:
                theme.palette.mode === 'dark'
                  ? `linear-gradient(150deg, ${alpha(theme.palette.background.paper, 0.76)} 0%, ${alpha(theme.palette.background.default, 0.92)} 100%)`
                  : `linear-gradient(150deg, ${alpha(theme.palette.background.paper, 0.92)} 0%, ${alpha(theme.palette.primary.light, 0.06)} 100%)`,
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 18px 40px rgba(0,0,0,0.12)'
                  : '0 18px 40px rgba(16,19,26,0.04)'
            }}
          >
            <Stack spacing={2.5} alignItems="center">
              <Chip
                label="Explore More"
                variant="outlined"
                sx={{
                  color: 'primary.main',
                  borderColor: alpha(theme.palette.primary.main, 0.24),
                  backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06)
                }}
              />
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="center"
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
              >
                {footerLinks.map((link, index) => (
                  <FooterLink key={index} {...link} />
                ))}
              </Stack>
            </Stack>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default BaseIndex;
