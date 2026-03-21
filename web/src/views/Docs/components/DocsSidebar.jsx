import {
  Box,
  Typography,
  List,
  ListSubheader,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ApiIcon from '@mui/icons-material/Api';
import ArticleIcon from '@mui/icons-material/Article';
import { SIDEBAR_WIDTH } from './apiData';

const DocsSidebar = ({ apiSections, tutorials, activeId, onNavClick }) => {
  const theme = useTheme();

  // Group API sections by their group field
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

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        overflowY: 'auto',
        borderRight: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : alpha(theme.palette.background.paper, 0.9),
        '&::-webkit-scrollbar': { width: 3 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(theme.palette.divider, 0.5), borderRadius: 2 }
      }}
    >
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
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
                selected={activeId === section.id}
                onClick={() => onNavClick(section.id)}
                sx={{
                  px: 2.5,
                  py: 0.75,
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
                    borderRight: `2px solid ${theme.palette.primary.main}`,
                    '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 600 }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: activeId === section.id ? 'primary.main' : 'text.secondary' }}>
                  <ApiIcon sx={{ fontSize: '1rem' }} />
                </ListItemIcon>
                <ListItemText primary={section.title} primaryTypographyProps={{ fontSize: '0.82rem' }} />
              </ListItemButton>
            ))}
          </Box>
        ))}

        {tutorials.length > 0 && (
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
                selected={activeId === `tutorial-${tutorial.id}`}
                onClick={() => onNavClick(`tutorial-${tutorial.id}`)}
                sx={{
                  px: 2.5,
                  py: 0.75,
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
                    borderRight: `2px solid ${theme.palette.primary.main}`,
                    '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 600 }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: activeId === `tutorial-${tutorial.id}` ? 'primary.main' : 'text.secondary' }}>
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
