import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Drawer, IconButton, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ContentViewer from 'ui-component/ContentViewer';
import { API } from 'utils/api';
import { showError } from 'utils/common';

import { SIDEBAR_WIDTH, apiSections } from './components/apiData';
import DocsSidebar from './components/DocsSidebar';
import ApiSection from './components/ApiSection';

const Docs = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tutorials, setTutorials] = useState([]);
  const [activeId, setActiveId] = useState(apiSections[0]?.id || '');

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

  const handleNavClick = useCallback(
    (id) => {
      setActiveId(id);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      if (isMobile) {
        setDrawerOpen(false);
      }
    },
    [isMobile]
  );

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      {/* Mobile menu button */}
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

      {/* Sidebar - desktop */}
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
          <DocsSidebar apiSections={apiSections} tutorials={tutorials} activeId={activeId} onNavClick={handleNavClick} />
        </Box>
      )}

      {/* Sidebar - mobile drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: SIDEBAR_WIDTH } }}>
        <DocsSidebar apiSections={apiSections} tutorials={tutorials} activeId={activeId} onNavClick={handleNavClick} />
      </Drawer>

      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          ml: { md: `${SIDEBAR_WIDTH}px` }
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 860, p: { xs: 2, md: 5 } }}>
          {/* API Sections */}
          {apiSections.map((section) => (
            <ApiSection key={section.id} section={section} />
          ))}

          {/* Tutorial Sections */}
          {tutorials.map((tutorial) => (
            <Box key={tutorial.id} id={`tutorial-${tutorial.id}`} sx={{ mb: 6, scrollMarginTop: '80px' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                {tutorial.title}
              </Typography>
              <ContentViewer content={tutorial.content} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Docs;
