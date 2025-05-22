import { Container, Box } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

// ==============================|| FOOTER - AUTHENTICATION 2 & 3 ||============================== //

const currentYear = new Date().getFullYear();


const Footer = () => {
  const siteInfo = useSelector((state) => state.siteInfo);
  const { t } = useTranslation();

  return (
    <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '64px', borderRadius: 0 }}>
      <Box sx={{ textAlign: 'center' }}>
          <p>
          Copyright © {currentYear} - CZL LTD. All rights reserved.
          </p>
      </Box>
    </Container>
  );
};

export default Footer;
