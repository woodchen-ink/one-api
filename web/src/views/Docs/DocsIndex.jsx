import { Box, Typography, Grid, Card, CardActionArea, CardContent, Chip, Stack, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiSections } from './components/apiData';
import { guides } from './components/QuickStartSection';

const DocsIndex = () => {
  const theme = useTheme();
  const { tutorials } = useOutletContext();

  // Group API sections
  const groups = {};
  apiSections.forEach((s) => {
    const g = s.group || 'Other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(s);
  });

  return (
    <>
      <Helmet>
        <title>API 文档 - CZLOapi</title>
        <meta name="description" content="CZLOapi API 接口文档、快速接入指南和使用教程。支持 OpenAI、Claude、Gemini 等多模型原生接入。" />
      </Helmet>
      <Box sx={{ width: '100%', maxWidth: 900, p: { xs: 2, md: 5 } }}>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
        API 文档
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 5, lineHeight: 1.7 }}>
        查看完整的 API 接口文档、快速接入指南和使用教程。
      </Typography>

      {/* API Endpoints by group */}
      {Object.entries(groups).map(([group, sections]) => (
        <Box key={group} sx={{ mb: 5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.1em', mb: 2, display: 'block' }}>
            {group}
          </Typography>
          <Grid container spacing={2}>
            {sections.map((section) => (
              <Grid item xs={12} sm={6} md={4} key={section.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.1)}`
                    }
                  }}
                >
                  <CardActionArea component={Link} to={`/docs/${section.id}`} sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Chip
                          label={section.method}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            backgroundColor: alpha('#5E7E80', 0.12),
                            color: '#5E7E80'
                          }}
                        />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.85rem' }}>
                          {section.title}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {section.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {/* Quick Start Guides */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.1em', mb: 2, display: 'block' }}>
          QUICK START
        </Typography>
        <Grid container spacing={2}>
          {guides.map((guide) => (
            <Grid item xs={12} sm={6} md={4} key={guide.id}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.1)}`
                  }
                }}
              >
                <CardActionArea component={Link} to={`/docs/${guide.id}`} sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.85rem', mb: 0.5 }}>
                      {guide.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {guide.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Tutorials */}
      {tutorials && tutorials.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.1em', mb: 2, display: 'block' }}>
            TUTORIALS
          </Typography>
          <Grid container spacing={2}>
            {tutorials.map((t) => (
              <Grid item xs={12} sm={6} md={4} key={t.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.1)}`
                    }
                  }}
                >
                  <CardActionArea component={Link} to={`/docs/tutorial-${t.id}`} sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.85rem' }}>
                        {t.title}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
    </>
  );
};

export default DocsIndex;
