import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { showError } from 'utils/common';
import { API } from 'utils/api';
import BaseIndex from './baseIndex';
import { Box, Container, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ContentViewer from 'ui-component/ContentViewer';

const Home = () => {
  const { t } = useTranslation();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [loading, setLoading] = useState(true);

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    try {
      const res = await API.get('/api/home_page_content');
      const { success, message, data } = res.data;
      if (success) {
        setHomePageContent(data);
        localStorage.setItem('home_page_content', data);
      } else {
        showError(message);
        setHomePageContent(t('home.loadingErr'));
      }
      setHomePageContentLoaded(true);
    } catch (error) {
      setHomePageContentLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  // SEO 数据
  const seoData = {
    title: 'CZLOapi - 专业AI API服务平台 | OpenAI、Claude、Gemini等多模型接入',
    description: '提供OpenAI、Claude、Gemini等主流AI模型的统一API接入服务。支持联网搜索、思考模式、飞书机器人等强大功能，为开发者和企业提供稳定、高效的AI解决方案。',
    keywords: 'AI API, OpenAI, Claude, Gemini, AI接口, 人工智能, 机器学习, 自然语言处理, AI服务, 开发者工具, 联网搜索, 思考模式',
    canonical: 'https://oapi.czl.net',
    ogImage: 'https://oapi.czl.net/logo.svg'
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>{seoData.title}</title>
          <meta name="description" content={seoData.description} />
          <meta name="keywords" content={seoData.keywords} />
          <link rel="canonical" href={seoData.canonical} />
          
          {/* Open Graph */}
          <meta property="og:title" content={seoData.title} />
          <meta property="og:description" content={seoData.description} />
          <meta property="og:image" content={seoData.ogImage} />
          <meta property="og:url" content={seoData.canonical} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="CZLOapi" />
          
          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={seoData.title} />
          <meta name="twitter:description" content={seoData.description} />
          <meta name="twitter:image" content={seoData.ogImage} />
          
          {/* 结构化数据 */}
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'CZLOapi',
              description: seoData.description,
              url: seoData.canonical,
              logo: 'https://oapi.czl.net/logo.svg',
              sameAs: [
                'https://docs.czl.net/czloapi/'
              ],
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer service',
                url: 'https://work.weixin.qq.com/kfid/kfce787ac8bbad50026'
              },
              offers: {
                '@type': 'Offer',
                description: 'AI API服务',
                category: '人工智能服务'
              }
            })}
          </script>
        </Helmet>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 136px)' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <link rel="canonical" href={seoData.canonical} />
        
        {/* Open Graph */}
        <meta property="og:title" content={seoData.title} />
        <meta property="og:description" content={seoData.description} />
        <meta property="og:image" content={seoData.ogImage} />
        <meta property="og:url" content={seoData.canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CZLOapi" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoData.title} />
        <meta name="twitter:description" content={seoData.description} />
        <meta name="twitter:image" content={seoData.ogImage} />
        
        {/* 结构化数据 */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'CZLOapi',
            description: seoData.description,
            url: seoData.canonical,
            logo: 'https://oapi.czl.net/logo.svg',
            sameAs: [
              'https://docs.czl.net/czloapi/'
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer service',
              url: 'https://work.weixin.qq.com/kfid/kfce787ac8bbad50026'
            },
            offers: {
              '@type': 'Offer',
              description: 'AI API服务',
              category: '人工智能服务'
            }
          })}
        </script>
      </Helmet>
      {homePageContentLoaded && homePageContent === '' ? (
        <BaseIndex />
      ) : (
        <Box sx={{ width: '100%' }}>
          {homePageContent.startsWith('https://') ? (
            <iframe title="home_page_content" src={homePageContent} style={{ width: '100%', height: '100vh', border: 'none' }} />
          ) : (
            <>
              <Container>
                <div style={{ fontSize: 'larger', padding: '24px 0' }} dangerouslySetInnerHTML={{ __html: homePageContent }}></div>
              </Container>
            </>
          )}
        </Box>
      )}
    </>
  );
};

export default Home;
