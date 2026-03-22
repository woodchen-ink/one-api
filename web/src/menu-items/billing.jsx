import { Icon } from '@iconify/react';

const icons = {
  IconCreditCard: () => <Icon width={20} icon="solar:card-bold-duotone" />,
  IconBrandGithubCopilot: () => <Icon width={20} icon="solar:box-minimalistic-bold-duotone" />,
  IconReceipt: () => <Icon width={20} icon="solar:bill-list-bold-duotone" />,
  IconSubscription: () => <Icon width={20} icon="solar:card-recive-bold-duotone" />
};

const Billing = {
  id: 'billing',
  title: 'Billing',
  type: 'group',
  children: [
    {
      id: 'topup',
      title: '充值',
      type: 'item',
      url: '/panel/topup',
      icon: icons.IconCreditCard,
      breadcrumbs: false
    },
    {
      id: 'order',
      title: '订单管理',
      type: 'item',
      url: '/panel/order',
      icon: icons.IconReceipt,
      breadcrumbs: false
    },
    {
      id: 'my_subscription',
      title: '我的订阅',
      type: 'item',
      url: '/panel/my_subscription',
      icon: icons.IconSubscription,
      breadcrumbs: false
    },
    {
      id: 'model_price',
      title: '可用模型',
      type: 'item',
      url: '/panel/model_price',
      icon: icons.IconBrandGithubCopilot,
      breadcrumbs: false,
      isAdmin: false
    }
  ]
};

export default Billing;
