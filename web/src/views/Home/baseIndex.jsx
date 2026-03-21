import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Container, Stack, Grid, Button, Link, useTheme, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import PolylineOutlinedIcon from '@mui/icons-material/PolylineOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';

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

const buildTerminalLines = (nativeRoutes) => {
  const totalRoutes = nativeRoutes.reduce((sum, item) => sum + item.routes.length, 0);
  const lines = [
    { text: '$ czloapi list-routes --native', color: '#E8E8E8', speed: 'fast' },
    { text: '', speed: 'instant' },
    { text: '[SCANNING] Detecting native route providers...', color: '#5E7E80', speed: 'medium' },
    { text: '', speed: 'instant' }
  ];

  nativeRoutes.forEach((item) => {
    lines.push({ text: `═══ ${item.provider} ═══`, color: '#7B90BF', speed: 'fast' });
    lines.push({ text: `  VENDOR   ${item.vendor}`, color: '#95A0AE', speed: 'medium' });
    lines.push({
      text: `  ROUTES   ${item.routes.length} endpoint${item.routes.length > 1 ? 's' : ''} detected`,
      color: '#95A0AE',
      speed: 'medium'
    });
    item.routes.forEach((route, i) => {
      const isLast = i === item.routes.length - 1;
      const prefix = isLast ? '  └─ ' : '  ├─ ';
      lines.push({ text: `${prefix}${route}`, color: '#E8E8E8', speed: 'type' });
    });
    lines.push({ text: '', speed: 'instant' });
  });

  lines.push({
    text: `✓ ${nativeRoutes.length} providers | ${totalRoutes} native routes | Ready`,
    color: '#5E7E80',
    speed: 'medium'
  });

  return lines;
};

const NativeRoutePanel = ({ nativeRoutes }) => {
  const terminalLines = useRef(buildTerminalLines(nativeRoutes));
  const [visibleLines, setVisibleLines] = useState([]);
  const [currentTyping, setCurrentTyping] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const animationRef = useRef(null);

  // IntersectionObserver to start animation when visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasStarted]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines, currentTyping]);

  // Typing animation
  useEffect(() => {
    if (!hasStarted) return;

    const lines = terminalLines.current;
    let lineIndex = 0;
    let charIndex = 0;
    let cancelled = false;

    const getDelay = (speed) => {
      switch (speed) {
        case 'instant':
          return 0;
        case 'fast':
          return 20;
        case 'medium':
          return 12;
        case 'type':
          return 35;
        default:
          return 25;
      }
    };

    const getLineDelay = (speed) => {
      switch (speed) {
        case 'instant':
          return 40;
        case 'fast':
          return 80;
        default:
          return 120;
      }
    };

    const tick = () => {
      if (cancelled) return;
      if (lineIndex >= lines.length) {
        setCurrentTyping('');
        setIsComplete(true);
        return;
      }

      const line = lines[lineIndex];
      const text = line.text;

      if (line.speed === 'instant' || charIndex >= text.length) {
        // Line complete - commit it
        setVisibleLines((prev) => [...prev, line]);
        setCurrentTyping('');
        lineIndex++;
        charIndex = 0;
        animationRef.current = setTimeout(tick, getLineDelay(line.speed));
      } else {
        // Type next character
        charIndex++;
        setCurrentTyping(text.substring(0, charIndex));
        animationRef.current = setTimeout(tick, getDelay(line.speed));
      }
    };

    animationRef.current = setTimeout(tick, 400);

    return () => {
      cancelled = true;
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [hasStarted]);

  const currentLineColor = useCallback(() => {
    const lines = terminalLines.current;
    const idx = visibleLines.length;
    if (idx < lines.length) return lines[idx].color || '#E8E8E8';
    return '#E8E8E8';
  }, [visibleLines]);

  return (
    <Box
      ref={containerRef}
      sx={{
        maxWidth: { lg: 520 },
        width: '100%',
        ml: { lg: 'auto' },
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #2a2d3a',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.28)',
        '@keyframes blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 }
        }
      }}
    >
      {/* Terminal title bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          px: 1.5,
          py: 1,
          backgroundColor: '#1e2030',
          borderBottom: '1px solid #2a2d3a'
        }}
      >
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#febc2e' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#28c840' }} />
        <Typography
          sx={{
            ml: 1.5,
            fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
            fontSize: '0.7rem',
            color: '#6b7394',
            userSelect: 'none'
          }}
        >
          czloapi ~ native-routes
        </Typography>
      </Box>

      {/* Terminal body */}
      <Box
        ref={scrollRef}
        sx={{
          backgroundColor: '#141622',
          p: { xs: 1.5, md: 2 },
          minHeight: { xs: 280, md: 360 },
          maxHeight: { xs: 340, md: 420 },
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: '#2a2d3a', borderRadius: 2 }
        }}
      >
        {visibleLines.map((line, i) => (
          <Typography
            key={i}
            component="div"
            sx={{
              fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
              fontSize: { xs: '0.72rem', md: '0.78rem' },
              lineHeight: 1.7,
              color: line.color || '#E8E8E8',
              whiteSpace: 'pre',
              minHeight: '1.7em'
            }}
          >
            {line.text}
          </Typography>
        ))}

        {/* Current typing line */}
        {currentTyping && (
          <Typography
            component="div"
            sx={{
              fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
              fontSize: { xs: '0.72rem', md: '0.78rem' },
              lineHeight: 1.7,
              color: currentLineColor(),
              whiteSpace: 'pre',
              minHeight: '1.7em'
            }}
          >
            {currentTyping}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: '0.5em',
                height: '1em',
                backgroundColor: currentLineColor(),
                ml: '1px',
                verticalAlign: 'text-bottom',
                animation: 'blink 0.8s step-end infinite'
              }}
            />
          </Typography>
        )}

        {/* Final blinking cursor */}
        {isComplete && (
          <Typography
            component="div"
            sx={{
              fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
              fontSize: { xs: '0.72rem', md: '0.78rem' },
              lineHeight: 1.7,
              color: '#6b7394',
              whiteSpace: 'pre',
              minHeight: '1.7em',
              mt: 0.5
            }}
          >
            {'$ '}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: '0.5em',
                height: '1em',
                backgroundColor: '#6b7394',
                ml: '1px',
                verticalAlign: 'text-bottom',
                animation: 'blink 1s step-end infinite'
              }}
            />
          </Typography>
        )}
      </Box>
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
      routes: [
        '/v1/chat/completions',
        '/v1/completions',
        '/v1/responses',
        '/v1/embeddings',
        '/v1/images/generations',
        '/v1/images/edits',
        '/v1/audio/speech',
        '/v1/audio/transcriptions',
        '/v1/audio/translations',
        '/v1/moderations',
        '/v1/rerank',
        '/v1/realtime'
      ]
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

  const footerLinks = [
    {
      icon: <GavelIcon />,
      title: '服务条款',
      link: 'https://www.czl.net/tos'
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
          minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
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
            <Grid item xs={12} lg={7}>
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
                    href="/docs"
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

            <Grid item xs={12} lg={5} sx={{ display: 'flex' }}>
              <NativeRoutePanel nativeRoutes={nativeRoutes} />
            </Grid>
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
                    boxShadow: theme.palette.mode === 'dark' ? '0 18px 40px rgba(0,0,0,0.16)' : '0 18px 40px rgba(16,19,26,0.05)',
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
              boxShadow: theme.palette.mode === 'dark' ? '0 18px 40px rgba(0,0,0,0.12)' : '0 18px 40px rgba(16,19,26,0.04)'
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
