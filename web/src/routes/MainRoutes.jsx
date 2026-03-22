import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';

const Channel = Loadable(lazy(() => import('views/Channel')));
const Log = Loadable(lazy(() => import('views/Log')));
const Redemption = Loadable(lazy(() => import('views/Redemption')));
const Setting = Loadable(lazy(() => import('views/Setting')));
const Token = Loadable(lazy(() => import('views/Token')));
const Topup = Loadable(lazy(() => import('views/Topup')));
const OrderManagement = Loadable(lazy(() => import('views/Order')));
const User = Loadable(lazy(() => import('views/User')));
const Profile = Loadable(lazy(() => import('views/Profile')));
const NotFoundView = Loadable(lazy(() => import('views/Error')));
const Analytics = Loadable(lazy(() => import('views/Analytics')));
const Pricing = Loadable(lazy(() => import('views/Pricing')));
const ModelPrice = Loadable(lazy(() => import('views/ModelPrice')));
const Playground = Loadable(lazy(() => import('views/Playground')));
const Payment = Loadable(lazy(() => import('views/Payment')));
const UserGroup = Loadable(lazy(() => import('views/UserGroup')));
const ModelOwnedby = Loadable(lazy(() => import('views/ModelOwnedby')));
const ModelInfo = Loadable(lazy(() => import('views/ModelInfo')));
const ModelMapping = Loadable(lazy(() => import('views/ModelMapping')));
const Invoice = Loadable(lazy(() => import('views/Invoice')));
const InvoiceDetail = Loadable(lazy(() => import('views/Invoice/detail')));
const Tutorial = Loadable(lazy(() => import('views/Tutorial')));
const SubscriptionPlan = Loadable(lazy(() => import('views/SubscriptionPlan')));
const UserSubscription = Loadable(lazy(() => import('views/UserSubscription')));
const MySubscription = Loadable(lazy(() => import('views/MySubscription')));
// dashboard routing
const Dashboard = Loadable(lazy(() => import('views/Dashboard')));

const SystemInfo = Loadable(lazy(() => import('views/SystemInfo')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/panel',
  element: <MainLayout />,
  children: [
    {
      path: '',
      element: <Dashboard />
    },
    {
      path: 'dashboard',
      element: <Dashboard />
    },
    {
      path: 'invoice',
      element: <Invoice />
    },
    {
      path: 'invoice/detail/:date',
      element: <InvoiceDetail />
    },
    {
      path: 'channel',
      element: <Channel />
    },
    {
      path: 'log',
      element: <Log key="user-log" adminMode={false} />
    },
    {
      path: 'admin_log',
      element: <Log key="admin-log" adminMode />
    },
    {
      path: 'redemption',
      element: <Redemption />
    },
    {
      path: 'setting',
      element: <Setting />
    },
    {
      path: 'token',
      element: <Token />
    },
    {
      path: 'topup',
      element: <Topup />
    },
    {
      path: 'order',
      element: <OrderManagement />
    },
    {
      path: 'user',
      element: <User />
    },
    {
      path: 'profile',
      element: <Profile />
    },
    {
      path: 'analytics',
      element: <Analytics />
    },
    {
      path: '404',
      element: <NotFoundView />
    },
    {
      path: 'pricing',
      element: <Pricing />
    },
    {
      path: 'model_price',
      element: <ModelPrice />
    },
    {
      path: 'playground',
      element: <Playground />
    },
    {
      path: 'payment',
      element: <Payment />
    },
    {
      path: 'user_group',
      element: <UserGroup />
    },
    {
      path: 'model_ownedby',
      element: <ModelOwnedby />
    },
    {
      path: 'model_info',
      element: <ModelInfo />
    },
    {
      path: 'model_mapping',
      element: <ModelMapping />
    },
    {
      path: 'system_info',
      element: <SystemInfo />
    },
    {
      path: 'tutorial',
      element: <Tutorial />
    },
    {
      path: 'subscription_plan',
      element: <SubscriptionPlan />
    },
    {
      path: 'user_subscription',
      element: <UserSubscription />
    },
    {
      path: 'my_subscription',
      element: <MySubscription />
    }
  ]
};

export default MainRoutes;
