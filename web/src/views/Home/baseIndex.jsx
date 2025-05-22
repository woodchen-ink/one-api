import React, { useState, useEffect } from 'react';
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
  Divider,
  useTheme,
  CircularProgress
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

import Lottie from 'react-lottie';

const FeatureCard = ({ icon, title, description, link }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: theme.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.15)'
        }
      }}
    >
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h4" sx={{ ml: 1, fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ mb: 2, flexGrow: 1 }}>
          {description}
        </Typography>
        <Button component={Link} href={link} target="_blank" variant="outlined" color="primary" sx={{ alignSelf: 'flex-start' }}>
          查看详情
        </Button>
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
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    // 动态加载animation.json文件
    fetch('/lottie/animation.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading animation:', error));
  }, []);

  const defaultOptions = {
    loop: true,
    autoplay: true, 
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid meet'
    }
  };

  const features = [
    {
      icon: <SearchIcon color="primary" fontSize="large" />,
      title: '开启联网搜索',
      description: '获取最新信息和数据，让AI回答更加准确和全面，实时获取互联网上的最新信息。',
      link: 'https://docs.czl.net/czloapi/features/open-web-search'
    },
    {
      icon: <PsychologyIcon color="primary" fontSize="large" />,
      title: '使用思考模式',
      description: '让AI模型通过分步思考提高回答质量，对复杂问题进行逻辑推理和分析，提供更加深入的见解。',
      link: 'https://docs.czl.net/czloapi/features/thinking-mode'
    },
    {
      icon: <ChatIcon color="primary" fontSize="large" />,
      title: '部署到飞书机器人',
      description: '将CZLOapi的强大能力无缝集成到飞书平台，提升团队协作与知识管理效率。',
      link: 'https://docs.czl.net/czloapi/practice/feishugpt'
    },
    {
      icon: <LibraryBooksIcon color="primary" fontSize="large" />,
      title: '接入到思源笔记',
      description: '将AI能力与思源笔记结合，增强您的知识管理和笔记系统，提升工作效率。',
      link: 'https://docs.czl.net/czloapi/practice/siyuan'
    },
    {
      icon: <ExtensionIcon color="primary" fontSize="large" />,
      title: 'Cline AI编程',
      description: '了解如何接入VSCode Cline，AI自动编程插件，提升您的开发效率。',
      link: 'https://www.q58.club/t/429'
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
      {/* 头部区域 */}
      <Box
        sx={{
          background:
            theme.mode === 'dark'
              ? 'linear-gradient(135deg, #1a237e 0%, #311b92 100%)'
              : 'linear-gradient(135deg, #5c6bc0 0%, #7e57c2 100%)',
          color: 'white',
          py: 8
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h1" sx={{ fontWeight: 700, fontSize: { xs: '2.5rem', md: '3.5rem' }, mb: 2 }}>
                CZLOapi
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 400, mb: 4, opacity: 0.9 }}>
                {t('description')}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  component={RouterLink}
                  to="/panel"
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
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
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  查看文档
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', maxHeight: '300px' }}>
                {animationData ? (
                  <Lottie options={defaultOptions} height={300} width="90%" />
                ) : (
                  <CircularProgress />
                )}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 特性区域 */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h2" align="center" gutterBottom sx={{ mb: 6 }}>
          强大特性
        </Typography>
        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <FeatureCard {...feature} />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* 优势区域 */}
      <Box sx={{ bgcolor: theme.mode === 'dark' ? 'background.paper' : 'grey.100', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h2" align="center" color="black" gutterBottom sx={{ mb: 6 }}>
            为什么选择 CZLOapi
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h4" gutterBottom color="primary">
                    高性能
                  </Typography>
                  <Typography variant="body1">提供最先进的AI模型访问，保证响应速度和服务质量，为您的应用带来卓越性能。</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h4" gutterBottom color="primary">
                    易于集成
                  </Typography>
                  <Typography variant="body1">简单清晰的API设计，丰富的文档和示例，让您能够快速将AI能力集成到各种应用中。</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h4" gutterBottom color="primary">
                    安全可靠
                  </Typography>
                  <Typography variant="body1">严格的数据保护措施和可靠的服务保障，确保您的数据安全和服务稳定性。</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default BaseIndex;
