import { useEffect, useState, useRef } from 'react';
import { Box, Typography, List, ListItemButton, ListItemText, useTheme, useMediaQuery } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SIDEBAR_WIDTH } from './apiData';

const TOC_WIDTH = 180;

const TableOfContents = ({ items }) => {
  const theme = useTheme();
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'));
  const [activeId, setActiveId] = useState('');
  const observerRef = useRef(null);

  useEffect(() => {
    if (!items || items.length === 0) return;

    const handleIntersect = (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length > 0) {
        setActiveId(visible[0].target.id);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0
    });

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observerRef.current.observe(el);
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [items]);

  if (!isLarge || !items || items.length === 0) return null;

  const handleClick = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box
      sx={{
        width: TOC_WIDTH,
        flexShrink: 0,
        ml: 3,
        display: { xs: 'none', lg: 'block' }
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 88,
          right: `max(24px, calc((100vw - ${SIDEBAR_WIDTH}px - 1100px) / 2 + 32px))`,
          width: TOC_WIDTH,
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 2 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(theme.palette.divider, 0.4), borderRadius: 1 }
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: 'text.secondary',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            px: 1.5,
            mb: 0.5
          }}
        >
          ON THIS PAGE
        </Typography>
        <List component="nav" disablePadding dense>
          {items.map((item) => (
            <ListItemButton
              key={item.id}
              onClick={() => handleClick(item.id)}
              sx={{
                py: 0.25,
                px: 1.5,
                minHeight: 28,
                borderLeft: `2px solid ${activeId === item.id ? theme.palette.primary.main : 'transparent'}`,
                '&:hover': { backgroundColor: 'transparent' }
              }}
            >
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.72rem',
                  color: activeId === item.id ? 'primary.main' : 'text.secondary',
                  fontWeight: activeId === item.id ? 600 : 400,
                  noWrap: true
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Box>
  );
};

export { TOC_WIDTH };
export default TableOfContents;
