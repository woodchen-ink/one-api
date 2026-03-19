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
  Avatar
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

const FeatureCard = ({ icon, title, description, link }) => {
  const theme = useTheme();
  return (
    <Card
      component="a"
      href={link}
      target="_blank"
      sx={{
        height: '100%',
        textDecoration: 'none',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        backgroundColor: theme.palette.background.paper,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px) scale(1.02)',
          boxShadow: theme.mode === 'dark' ? '0 18px 36px rgba(0,0,0,0.3)' : '0 18px 36px rgba(16,19,26,0.08)',
          borderColor: alpha(theme.palette.secondary.main, 0.32),
          '& .feature-icon': {
            transform: 'scale(1.1)'
          }
        }
      }}
    >
      <CardContent sx={{ 
        p: 4, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        <Avatar
          className="feature-icon"
          sx={{
            width: 64,
            height: 64,
            mb: 3,
            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.1),
            color: 'primary.main',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {icon}
        </Avatar>
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2, 
            fontWeight: 600,
            fontSize: '1.1rem',
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
            lineHeight: 1.6,
            fontSize: '0.9rem'
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const FooterLink = ({ icon, title, link }) => {
  return (
    <Button
      component={Link}
      href={link}
      target="_blank"
      startIcon={icon}
      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
    >
      {title}
    </Button>
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
    },
    {
      provider: 'Recraft',
      vendor: 'Recraft AI',
      routes: ['/recraftAI/v1/images/generations']
    },
    {
      provider: 'Suno',
      vendor: 'Suno',
      routes: ['/suno/submit/{action}']
    },
    {
      provider: 'Kling',
      vendor: 'Kling',
      routes: ['/kling/v1/{class}/{action}']
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

  return (
    <>
      {/* 头部区域 - Apple风格简洁设计 */}
      <Box
        sx={{
          backgroundColor: theme.palette.background.default,
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 300,
              fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
              mb: 3,
              color: 'text.primary',
              letterSpacing: '-0.02em'
            }}
          >
            CZLOapi
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 400,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              mb: 6,
              color: 'text.secondary',
              maxWidth: '600px',
              mx: 'auto',
              lineHeight: 1.4
            }}
          >
            {t('description')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              component={RouterLink}
              to="/panel"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                px: 4,
                py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 500,
              borderRadius: '12px',
              boxShadow: theme.mode === 'dark' ? '0 8px 20px rgba(0,0,0,0.24)' : `0 8px 20px ${alpha(theme.palette.primary.main, 0.12)}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.mode === 'dark' ? '0 12px 26px rgba(0,0,0,0.3)' : `0 12px 26px ${alpha(theme.palette.primary.main, 0.16)}`
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
                fontSize: '1.1rem',
                fontWeight: 500,
                borderRadius: '12px',
                borderWidth: '1px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
        </Container>
      </Box>

      {/* 特性区域 - Apple风格 */}
      <Box
        sx={{
          py: 10,
          px: 2,
          backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.4) : '#FBFBFC',
          borderTop: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            align="center"
            sx={{
              fontWeight: 300,
              fontSize: { xs: '2rem', md: '2.5rem' },
              mb: 2,
              color: 'text.primary'
            }}
          >
            支持的原生厂家与路径
          </Typography>
          <Typography
            variant="h6"
            align="center"
            sx={{
              fontWeight: 400,
              color: 'text.secondary',
              mb: 8,
              maxWidth: '760px',
              mx: 'auto',
              lineHeight: 1.7
            }}
          >
            你可以直接使用本站域名访问各厂家的原生路径。
            <br />
            例如 Claude 走 <strong>/v1/messages</strong>，Gemini 走 <strong>/v1beta/models/&#123;model&#125;:generateContent</strong>。
          </Typography>
          <Grid container spacing={3}>
            {nativeRoutes.map((item) => (
              <Grid item xs={12} md={6} lg={4} key={item.provider}>
                <Card
                  sx={{
                    height: '100%',
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: `${theme.shape.borderRadius}px`
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: '0.08em' }}>
                      {item.vendor}
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 1, mb: 2, fontWeight: 600 }}>
                      {item.provider}
                    </Typography>
                    <Stack spacing={1.25}>
                      {item.routes.map((route) => (
                        <Box
                          key={route}
                          sx={{
                            px: 1.5,
                            py: 1.25,
                            borderRadius: '10px',
                            backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.5) : '#F6F7F8',
                            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'Consolas, Monaco, monospace',
                              fontSize: '0.85rem',
                              color: 'text.primary',
                              wordBreak: 'break-all'
                            }}
                          >
                            {route}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: 10, px: 2, backgroundColor: '#F6F7F8' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            align="center"
            sx={{
              fontWeight: 300,
              fontSize: { xs: '2rem', md: '2.5rem' },
              mb: 2,
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
              mb: 8,
              maxWidth: '600px',
              mx: 'auto'
            }}
          >
            探索 CZLOapi 为您带来的无限可能
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} lg={4} key={index}>
                <FeatureCard {...feature} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 优势区域 - Apple风格 */}
      <Box
        sx={{
          bgcolor: '#F6F7F8',
          py: 10,
          px: 2,
          position: 'relative',
          borderTop: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            align="center"
            sx={{
              fontWeight: 300,
              fontSize: { xs: '2rem', md: '2.5rem' },
              mb: 2,
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
              mb: 8,
              maxWidth: '600px',
              mx: 'auto'
            }}
          >
            专业的AI接口服务，助力您的业务增长
          </Typography>
          <Grid container spacing={4}>
            {[
              {
                title: '高性能',
                description: '提供最先进的AI模型访问，保证响应速度和服务质量，为您的应用带来卓越性能。'
              },
              {
                title: '易于集成',
                description: '简单清晰的API设计，丰富的文档和示例，让您能够快速将AI能力集成到各种应用中。'
              },
              {
                title: '安全可靠',
                description: '严格的数据保护措施和可靠的服务保障，确保您的数据安全和服务稳定性。'
              }
            ].map((advantage, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box
                  sx={{
                    p: 4,
                    height: '100%',
                    textAlign: 'center',
                    borderRadius: `${theme.shape.borderRadius}px`,
                    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.4) : theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: alpha(theme.palette.secondary.main, 0.24)
                    }
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 600,
                      mb: 2,
                      color: 'primary.main',
                      fontSize: { xs: '1.5rem', md: '1.75rem' }
                    }}
                  >
                    {advantage.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.7,
                      fontSize: '1rem'
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
          py: 6,
          backgroundColor: '#F6F7F8',
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            {footerLinks.map((link, index) => (
              <FooterLink key={index} {...link} />
            ))}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default BaseIndex;
