import { Icon } from '@iconify/react';

const icons = {
  IconArticle: () => <Icon width={20} icon="solar:document-text-bold-duotone" />,
  IconInvoice: () => <Icon width={20} icon="solar:dollar-minimalistic-bold-duotone" />
};

const usage = {
  id: 'usage',
  title: 'Usage',
  type: 'group',
  children: [
    {
      id: 'log',
      title: '我的日志',
      type: 'item',
      url: '/panel/log',
      icon: icons.IconArticle,
      breadcrumbs: false,
      isAdmin: false
    },
    {
      id: 'admin_log',
      title: '管理员日志',
      type: 'item',
      url: '/panel/admin_log',
      icon: icons.IconArticle,
      breadcrumbs: false,
      isAdmin: true
    },
    {
      id: 'invoice',
      title: '月度账单',
      type: 'item',
      url: '/panel/invoice',
      icon: icons.IconInvoice,
      breadcrumbs: false
    }
  ]
};

export default usage;
