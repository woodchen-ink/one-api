import { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Box, Drawer, IconButton, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { SIDEBAR_WIDTH, apiSections } from './components/apiData';
import { guides } from './components/QuickStartSection';
import DocsSidebar from './components/DocsSidebar';
import { API } from 'utils/api';
import { showError } from 'utils/common';

const DocsLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tutorials, setTutorials] = useState([]);
  const { slug } = useParams();

  useEffect(() => {
    const fetchTutorials = async () => {
      try {
        const res = await API.get('/api/tutorial/list');
        const { success, message, data } = res.data;
        if (success) {
          setTutorials(data || []);
        } else {
          showError(message);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchTutorials();
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      {isMobile && (
        <IconButton
          onClick={() => setDrawerOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1200,
            width: 48,
            height: 48,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            '&:hover': { backgroundColor: 'primary.dark' }
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {!isMobile && (
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            position: 'fixed',
            top: 64,
            left: 0,
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            zIndex: 100
          }}
        >
          <DocsSidebar
            apiSections={apiSections}
            tutorials={tutorials}
            guides={guides}
            activeSlug={slug || ''}
            onMobileClose={() => setDrawerOpen(false)}
          />
        </Box>
      )}

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: SIDEBAR_WIDTH } }}>
        <DocsSidebar
          apiSections={apiSections}
          tutorials={tutorials}
          guides={guides}
          activeSlug={slug || ''}
          onMobileClose={() => setDrawerOpen(false)}
        />
      </Drawer>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          ml: { md: `${SIDEBAR_WIDTH}px` },
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        <Outlet context={{ tutorials }} />
      </Box>
    </Box>
  );
};

export default DocsLayout;
