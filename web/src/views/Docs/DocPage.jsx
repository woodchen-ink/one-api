import { useMemo } from 'react';
import { useParams, Navigate, useOutletContext } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { apiSections } from './components/apiData';
import { guides } from './components/QuickStartSection';
import ApiSection from './components/ApiSection';
import QuickStartGuide from './components/QuickStartGuide';
import TableOfContents from './components/TableOfContents';
import ContentViewer from 'ui-component/ContentViewer';

const DocPage = () => {
  const { slug } = useParams();
  const { tutorials } = useOutletContext();

  // Find the matching content
  const apiSection = apiSections.find((s) => s.id === slug);
  const guide = guides.find((g) => g.id === slug);
  const tutorial = slug?.startsWith('tutorial-') ? (tutorials || []).find((t) => `tutorial-${t.id}` === slug) : null;

  const contentType = apiSection ? 'api' : guide ? 'guide' : tutorial ? 'tutorial' : null;

  // SEO data
  const seo = useMemo(() => {
    if (apiSection) return { title: `${apiSection.title} API - CZLOapi 文档`, desc: apiSection.description };
    if (guide) return { title: `${guide.title} 接入指南 - CZLOapi 文档`, desc: guide.description };
    if (tutorial) return { title: `${tutorial.title} - CZLOapi 文档`, desc: `${tutorial.title} - CZLOapi 使用教程` };
    return { title: 'CZLOapi 文档', desc: 'CZLOapi API 文档' };
  }, [apiSection, guide, tutorial]);

  // Generate TOC items
  const tocItems = useMemo(() => {
    if (apiSection) {
      const items = [
        { id: 'toc-endpoint', label: 'Endpoint' },
        { id: 'toc-headers', label: 'Headers' }
      ];
      if (apiSection.parameters && apiSection.parameters.length > 0) {
        items.push({ id: 'toc-parameters', label: 'Parameters' });
      }
      items.push({ id: 'toc-request', label: 'Request Body' });
      items.push({ id: 'toc-response', label: 'Response' });
      return items;
    }
    if (guide) {
      return guide.tabs.map((tab, i) => ({
        id: `toc-tab-${i}`,
        label: tab.label
      }));
    }
    return [];
  }, [apiSection, guide]);

  if (!contentType) {
    return <Navigate to="/docs" replace />;
  }

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.desc} />
      </Helmet>
      <Box sx={{ display: 'flex', width: '100%', maxWidth: 1100, p: { xs: 2, md: 5 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {contentType === 'api' && <ApiSection section={apiSection} withTocIds />}
          {contentType === 'guide' && <QuickStartGuide guide={guide} />}
          {contentType === 'tutorial' && (
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
                {tutorial.title}
              </Typography>
              <ContentViewer content={tutorial.content} />
            </Box>
          )}
        </Box>
        <TableOfContents items={tocItems} />
      </Box>
    </>
  );
};

export default DocPage;
