import { Box, Typography, List, ListSubheader, ListItemButton, ListItemText, ListItemIcon, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link, useNavigate } from 'react-router-dom';
import ApiIcon from '@mui/icons-material/Api';
import ArticleIcon from '@mui/icons-material/Article';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { SIDEBAR_WIDTH } from './apiData';

const DocsSidebar = ({ apiSections, tutorials, guides, activeSlug, onMobileClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleClick = (slug) => {
    navigate(`/docs/${slug}`);
    if (onMobileClose) onMobileClose();
  };

  // Group API sections
  const groups = [];
  const groupMap = {};
  apiSections.forEach((section) => {
    const group = section.group || 'Other';
    if (!groupMap[group]) {
      groupMap[group] = [];
      groups.push(group);
    }
    groupMap[group].push(section);
  });

  const itemSx = () => ({
    px: 2.5,
    py: 0.75,
    '&.Mui-selected': {
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
      borderRight: `2px solid ${theme.palette.primary.main}`,
      '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 600 }
    }
  });

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        overflowY: 'auto',
        borderRight: `1px solid ${theme.palette.divider}`,
        backgroundColor:
          theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : alpha(theme.palette.background.paper, 0.9),
        '&::-webkit-scrollbar': { width: 3 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(theme.palette.divider, 0.5), borderRadius: 2 }
      }}
    >
      <Box
        component={Link}
        to="/docs"
        sx={{
          display: 'block',
          p: 2.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          textDecoration: 'none',
          '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.03) }
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1rem' }}>
          API 文档
        </Typography>
      </Box>

      <List component="nav" disablePadding>
        {groups.map((group) => (
          <Box key={group}>
            <ListSubheader
              sx={{
                backgroundColor: 'transparent',
                color: 'text.secondary',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                lineHeight: '36px',
                px: 2.5
              }}
            >
              {group.toUpperCase()}
            </ListSubheader>
            {groupMap[group].map((section) => (
              <ListItemButton
                key={section.id}
                selected={activeSlug === section.id}
                onClick={() => handleClick(section.id)}
                sx={itemSx(activeSlug === section.id)}
              >
                <ListItemIcon sx={{ minWidth: 32, color: activeSlug === section.id ? 'primary.main' : 'text.secondary' }}>
                  <ApiIcon sx={{ fontSize: '1rem' }} />
                </ListItemIcon>
                <ListItemText primary={section.title} primaryTypographyProps={{ fontSize: '0.82rem' }} />
              </ListItemButton>
            ))}
          </Box>
        ))}

        {guides && guides.length > 0 && (
          <>
            <ListSubheader
              sx={{
                backgroundColor: 'transparent',
                color: 'text.secondary',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                lineHeight: '36px',
                px: 2.5,
                mt: 1
              }}
            >
              QUICK START
            </ListSubheader>
            {guides.map((guide) => (
              <ListItemButton
                key={guide.id}
                selected={activeSlug === guide.id}
                onClick={() => handleClick(guide.id)}
                sx={itemSx(activeSlug === guide.id)}
              >
                <ListItemIcon sx={{ minWidth: 32, color: activeSlug === guide.id ? 'primary.main' : 'text.secondary' }}>
                  <RocketLaunchIcon sx={{ fontSize: '1rem' }} />
                </ListItemIcon>
                <ListItemText primary={guide.title} primaryTypographyProps={{ fontSize: '0.82rem' }} />
              </ListItemButton>
            ))}
          </>
        )}

        {tutorials && tutorials.length > 0 && (
          <>
            <ListSubheader
              sx={{
                backgroundColor: 'transparent',
                color: 'text.secondary',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                lineHeight: '36px',
                px: 2.5,
                mt: 1
              }}
            >
              TUTORIALS
            </ListSubheader>
            {tutorials.map((tutorial) => (
              <ListItemButton
                key={tutorial.id}
                selected={activeSlug === `tutorial-${tutorial.id}`}
                onClick={() => handleClick(`tutorial-${tutorial.id}`)}
                sx={itemSx(activeSlug === `tutorial-${tutorial.id}`)}
              >
                <ListItemIcon sx={{ minWidth: 32, color: activeSlug === `tutorial-${tutorial.id}` ? 'primary.main' : 'text.secondary' }}>
                  <ArticleIcon sx={{ fontSize: '1rem' }} />
                </ListItemIcon>
                <ListItemText primary={tutorial.title} primaryTypographyProps={{ fontSize: '0.82rem', noWrap: true }} />
              </ListItemButton>
            ))}
          </>
        )}
      </List>
    </Box>
  );
};

export default DocsSidebar;
