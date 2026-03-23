export function getHeaderDesktopNavItems({ t, siteInfo, showStatus = false }) {
  const items = [
    {
      key: 'home',
      type: 'route',
      to: '/',
      label: t('menu.home', '首页')
    },
    {
      key: 'price',
      type: 'route',
      to: '/price',
      label: t('price', '价格')
    },
    {
      key: 'docs',
      type: 'route',
      to: '/docs',
      label: '文档'
    }
  ];

  if (showStatus && siteInfo?.UptimeEnabled) {
    items.push({
      key: 'status',
      type: 'external',
      href: siteInfo.UptimeDomain,
      label: t('menu.status', '状态')
    });
  }

  return items;
}

export function getHeaderMobileMenuItems({ t, siteInfo, showStatus = false, showAbout = false }) {
  const items = [
    ...getHeaderDesktopNavItems({ t, siteInfo, showStatus }),
    {
      key: 'notice',
      type: 'route',
      to: '/notice',
      label: t('menu.notice', '公告')
    }
  ];

  if (showAbout) {
    items.push({
      key: 'about',
      type: 'route',
      to: '/about',
      label: t('menu.about', '关于')
    });
  }

  return items;
}
