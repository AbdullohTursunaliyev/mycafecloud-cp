export const cpSectionMeta = {
  'billing-logs': {
    loader: () => import('@legacy/pages/cp/BillingLogs.vue'),
  },
  bookings: {
    loader: () => import('@legacy/pages/cp/Bookings.vue'),
  },
  'install-center': {
    loader: () => import('@legacy/pages/cp/InstallCenter.vue'),
  },
  layout: {
    loader: () => import('@legacy/pages/cp/Layout.vue'),
  },
  logs: {
    loader: () => import('@legacy/pages/cp/Logs.vue'),
  },
  packages: {
    loader: () => import('@legacy/pages/cp/Packages.vue'),
  },
  promotions: {
    loader: () => import('@legacy/pages/cp/Promotions.vue'),
  },
  reports: {
    loader: () => import('@legacy/pages/cp/Reports.vue'),
  },
  returns: {
    loader: () => import('@legacy/pages/cp/Returns.vue'),
  },
  sessions: {
    loader: () => import('@legacy/pages/cp/Sessions.vue'),
  },
  settings: {
    loader: () => import('@legacy/pages/cp/Settings.vue'),
  },
  'shell-games': {
    loader: () => import('@legacy/pages/cp/ShellGames.vue'),
  },
  shift: {
    loader: () => import('@legacy/pages/cp/Shift.vue'),
  },
  'shifts-history': {
    loader: () => import('@legacy/pages/cp/ShiftsHistory.vue'),
  },
  subscriptions: {
    loader: () => import('@legacy/pages/cp/SubscriptionPlans.vue'),
  },
  transfers: {
    loader: () => import('@legacy/pages/cp/Transfers.vue'),
  },
  zones: {
    loader: () => import('@legacy/pages/cp/Zones.vue'),
  },
} as const

export type CpSectionKey = keyof typeof cpSectionMeta
