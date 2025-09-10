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
        border: `1px solid ${theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
        borderRadius: '16px',
        backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(20px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px) scale(1.02)',
          boxShadow: theme.mode === 'dark' 
            ? '0 20px 40px rgba(0,0,0,0.4)' 
            : '0 20px 40px rgba(0,0,0,0.08)',
          borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
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
            backgroundColor: 'primary.main',
            color: 'white',
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
      link: 'https://www.q58.club/t/429'
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
          background: theme.mode === 'dark'
            ? 'linear-gradient(180deg, #000000 0%, #1a1a1a 100%)'
            : 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: theme.mode === 'dark'
              ? 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 70%)'
              : 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.03) 0%, transparent 70%)',
            pointerEvents: 'none'
          }
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
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
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
                borderWidth: '2px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderWidth: '2px',
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
      <Box sx={{ py: 10, px: 2 }}>
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
          bgcolor: theme.mode === 'dark' 
            ? 'rgba(0,0,0,0.2)' 
            : 'rgba(248,249,250,0.8)',
          py: 10,
          px: 2,
          position: 'relative'
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
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)'
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
          borderTop: `1px solid ${theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
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
