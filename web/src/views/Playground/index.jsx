import PropTypes from 'prop-types';
import { useEffect, useState, useCallback } from 'react';
import { API } from 'utils/api';
import { getChatLinks, showError, replaceChatPlaceholders } from 'utils/common';
import { Typography, Tabs, Tab, Box, Card } from '@mui/material';
import SubCard from 'ui-component/cards/SubCard';
// import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`playground-tabpanel-${index}`}
      aria-labelledby={`playground-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired
};

function a11yProps(index) {
  return {
    id: `playground-tab-${index}`,
    'aria-controls': `playground-tabpanel-${index}`
  };
}

const Playground = () => {
  const [value, setValue] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const siteInfo = useSelector((state) => state.siteInfo);
  const chatLinks = getChatLinks(true);
  const [iframeSrc, setIframeSrc] = useState(null);

  const loadTokens = useCallback(async () => {
    setIsLoading(true);
    const res = await API.get(`/api/token/playground`);
    const { success, message, data } = res.data;
    if (success) {
      setValue(data);
    } else {
      showError(message);
    }
    setIsLoading(false);
  }, []);

  const handleTabChange = useCallback(
    (event, newIndex) => {
      setTabIndex(newIndex);
      let server = '';
      if (siteInfo?.server_address) {
        server = siteInfo.server_address;
      } else {
        server = window.location.host;
      }
      server = encodeURIComponent(server);
      const key = 'sk-' + value;

      setIframeSrc(replaceChatPlaceholders(chatLinks[newIndex].url, key, server));
    },
    [siteInfo, value, chatLinks]
  );

  useEffect(() => {
    loadTokens().then(() => {
      if (value !== '') {
        handleTabChange(null, 0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTokens, value]);

  if (chatLinks.length === 0 || isLoading || value === '') {
    return (
      <SubCard title="Playground">
        <Typography align="center">{isLoading ? 'Loading...' : 'No playground available'}</Typography>
      </SubCard>
    );
  } else if (chatLinks.length === 1) {
    return (
      <Box sx={{ width: '100%', height: 'calc(100vh - 110px)' }}>
        <iframe
          title="playground"
          src={iframeSrc}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          allow="clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
        />
      </Box>
    );
  } else {
    return (
      <Box sx={{ width: '100%', height: 'calc(100vh - 110px)' }}>
        <Card sx={{ boxShadow: 'none', height: '100%' }}>
          <Tabs variant="scrollable" value={tabIndex} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            {chatLinks.map((link, index) => link.show && <Tab label={link.name} {...a11yProps(index)} key={index} />)}
          </Tabs>
          <Box>
            <iframe
              title="playground"
              src={iframeSrc}
              style={{ width: '100%', height: 'calc(100vh - 158px)', border: 'none', display: 'block' }}
              allow="clipboard-read; clipboard-write"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
            />
          </Box>
        </Card>
      </Box>
    );
  }
};

export default Playground;
