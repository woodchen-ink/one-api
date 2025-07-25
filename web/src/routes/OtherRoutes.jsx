import { lazy } from 'react';
import { Box } from '@mui/material';

// project imports
import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';

// login option 3 routing
const AuthLogin = Loadable(lazy(() => import('views/Authentication/Auth/Login')));
const AuthRegister = Loadable(lazy(() => import('views/Authentication/Auth/Register')));
const GitHubOAuth = Loadable(lazy(() => import('views/Authentication/Auth/GitHubOAuth')));
const LarkOAuth = Loadable(lazy(() => import('views/Authentication/Auth/LarkOAuth')));
const CZLConnectOAuth = Loadable(lazy(() => import('views/Authentication/Auth/CZLConnectOAuth')));
const OIDCOAuth = Loadable(lazy(() => import('views/Authentication/Auth/OIDCOAuth')));
const ForgetPassword = Loadable(lazy(() => import('views/Authentication/Auth/ForgetPassword')));
const ResetPassword = Loadable(lazy(() => import('views/Authentication/Auth/ResetPassword')));
const Home = Loadable(lazy(() => import('views/Home')));
const About = Loadable(lazy(() => import('views/About')));
const NotFoundView = Loadable(lazy(() => import('views/Error')));
const Jump = Loadable(lazy(() => import('views/Jump')));
const ModelPrice = Loadable(lazy(() => import('views/ModelPrice')));

const WithMargins = ({ children }) => (
  <Box
    sx={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: { xs: 0, sm: '0 24px' }
    }}
  >
    {children}
  </Box>
);

// ==============================|| AUTHENTICATION ROUTING ||============================== //

const OtherRoutes = {
  path: '/',
  element: <MinimalLayout />,
  children: [
    {
      path: '',
      element: <Home />
    },
    {
      path: '/about',
      element: <About />
    },
    {
      path: '/login',
      element: <AuthLogin />
    },
    {
      path: '/register',
      element: <AuthRegister />
    },
    {
      path: '/reset',
      element: <ForgetPassword />
    },
    {
      path: '/user/reset',
      element: <ResetPassword />
    },
    {
      path: '/oauth/github',
      element: <GitHubOAuth />
    },
    {
      path: '/oauth/oidc',
      element: <OIDCOAuth />
    },
    {
      path: '/oauth/lark',
      element: <LarkOAuth />
    },
    {
      path: '/oauth/czlconnect',
      element: <CZLConnectOAuth />
    },
    {
      path: '/oauth/czlconnect/bind',
      element: <CZLConnectOAuth />
    },
    {
      path: '/404',
      element: <NotFoundView />
    },
    {
      path: '/jump',
      element: <Jump />
    },
    {
      path: '/price',
      element: (
        <WithMargins>
          <ModelPrice />
        </WithMargins>
      )
    }
  ]
};

export default OtherRoutes;
