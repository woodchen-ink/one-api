import React, { useEffect, useState } from 'react';
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 136px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
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
