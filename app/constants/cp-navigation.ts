export const cpNavigationGroups = [
  {
    key: 'main',
    titleKey: 'layout.nav.main',
    items: [
      { to: '/cp/dashboard', labelKey: 'layout.menu.dashboard', icon: 'House' },
      { to: '/cp/pcs', labelKey: 'layout.menu.pcs', icon: 'Monitor' },
      { to: '/cp/layout', labelKey: 'layout.menu.layout', icon: 'Grid', roles: ['admin', 'owner'] },
      { to: '/cp/clients', labelKey: 'layout.menu.clients', icon: 'User' },
      { to: '/cp/bookings', labelKey: 'layout.menu.bookings', icon: 'Calendar' },
    ],
  },
  {
    key: 'operations',
    titleKey: 'layout.nav.operations',
    items: [
      { to: '/cp/shift', labelKey: 'layout.menu.cashier', icon: 'Coin' },
      { to: '/cp/returns', labelKey: 'layout.menu.returns', icon: 'Money' },
      { to: '/cp/transfers', labelKey: 'layout.menu.transfers', icon: 'RefreshLeft' },
      { to: '/cp/shifts-history', labelKey: 'layout.menu.shiftsHistory', icon: 'Histogram', roles: ['admin', 'owner'] },
    ],
  },
  {
    key: 'management',
    titleKey: 'layout.nav.management',
    items: [
      { to: '/cp/reports', labelKey: 'layout.menu.reports', icon: 'DataAnalysis', roles: ['admin', 'owner'] },
      { to: '/cp/install-center', labelKey: 'layout.menu.installCenter', icon: 'Download', roles: ['admin', 'owner'] },
      { to: '/cp/shell-games', labelKey: 'layout.menu.shellGames', icon: 'VideoPlay', roles: ['admin', 'owner'] },
      { to: '/cp/promotions', labelKey: 'layout.menu.promotions', icon: 'Present', roles: ['admin', 'owner'] },
      { to: '/cp/zones', labelKey: 'layout.menu.zones', icon: 'MapLocation', roles: ['admin', 'owner'] },
      { to: '/cp/packages', labelKey: 'layout.menu.packages', icon: 'Box', roles: ['admin', 'owner'] },
      { to: '/cp/subscriptions', labelKey: 'layout.menu.subscriptions', icon: 'Ticket', roles: ['admin', 'owner'] },
      { to: '/cp/logs', labelKey: 'layout.menu.logs', icon: 'Document' },
      { to: '/cp/billing-logs', labelKey: 'layout.menu.billingLogs', icon: 'Document' },
      { to: '/cp/settings', labelKey: 'layout.menu.settings', icon: 'Setting', roles: ['admin', 'owner'] },
    ],
  },
]
