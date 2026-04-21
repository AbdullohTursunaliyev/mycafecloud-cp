import { createRouter, createWebHistory } from 'vue-router'
import CpLayout from '../layouts/CpLayout.vue'
import Login from '../pages/cp/Login.vue'
import Dashboard from '../pages/cp/Dashboard.vue'
import Pcs from '../pages/cp/Pcs.vue'
import Clients from '../pages/cp/Clients.vue'
import Promotions from "../pages/cp/Promotions.vue";
import Reports from '../pages/cp/Reports.vue'

const routes = [
    { path: '/cp/login', component: Login },

    {
        path: '/cp',
        component: CpLayout,
        children: [
            { path: '', redirect: '/cp/dashboard' },
            { path: 'dashboard', component: Dashboard },
            { path: 'pcs', component: Pcs },
            { path: 'layout', name: 'cp.layout', component: () => import('../pages/cp/Layout.vue'), meta: { roles: ['admin', 'owner'] } },
            { path: 'clients', component: Clients },
            {
                path: '/cp/sessions',
                name: 'cp.sessions',
                component: () => import('../pages/cp/Sessions.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/cp/shift',
                name: 'cp.shift',
                component: () => import('../pages/cp/Shift.vue'),
            },
            {
                path: '/cp/shifts-history',
                component: () => import('../pages/cp/ShiftsHistory.vue'),
                meta: { requiresAuth: true, roles: ['admin','owner'] }
            },
            {
                path: '/cp/reports',
                name: 'cp.reports',
                component: Reports,
                meta: { requiresAuth: true, roles: ['admin', 'owner'] },
            },
            {
                path: '/cp/promotions',
                name: 'cp-promotions',
                component: Promotions,
                meta: { requiresAuth: true, roles: ['admin', 'owner'] },
            },
            {
                path: '/cp/zones',
                name: 'cp.zones',
                component: () => import('../pages/cp/Zones.vue'),
                meta: { roles: ['admin', 'owner'] },
            },
            {
                path: '/cp/packages',
                name: 'cp.packages',
                component: () => import('../pages/cp/Packages.vue'),
                meta: { roles: ['admin', 'owner'] },
            },
            {
                path: '/cp/subscriptions',
                name: 'cp.subscriptions',
                component: () => import('../pages/cp/SubscriptionPlans.vue'),
                meta: { title: 'Subscriptions', roles: ['admin','owner'] }
            },
            {
                path: '/cp/returns',
                name: 'cp.returns',
                component: () => import('../pages/cp/Returns.vue'),
            },
            {
                path: '/cp/transfers',
                name: 'cp.transfers',
                component: () => import('../pages/cp/Transfers.vue'),
            },
            {
                path: '/cp/bookings',
                name: 'cp.bookings',
                component: () => import('../pages/cp/Bookings.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: '/cp/logs',
                name: 'cp.logs',
                component: () => import('../pages/cp/Logs.vue'),
                meta: { requiresAuth: true, roles: ['admin', 'owner'] },
            },
            {
                path: '/cp/billing-logs',
                name: 'cp.billing-logs',
                component: () => import('../pages/cp/BillingLogs.vue'),
                meta: { requiresAuth: true, roles: ['admin', 'owner'] },
            },
            {
                path: '/cp/settings',
                name: 'cp.settings',
                component: () => import('../pages/cp/Settings.vue'),
                meta: { requiresAuth: true, roles: ['admin', 'owner'] },
            },
            {
                path: '/cp/install-center',
                name: 'cp.install-center',
                component: () => import('../pages/cp/InstallCenter.vue'),
                meta: { requiresAuth: true, roles: ['admin', 'owner'] },
            },
            {
                path: '/cp/shell-games',
                name: 'cp.shell-games',
                component: () => import('../pages/cp/ShellGames.vue'),
                meta: { requiresAuth: true, roles: ['admin', 'owner'] },
            },
        ],
    },

    { path: '/', redirect: '/cp/login' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
    const token = localStorage.getItem('cp_token')
    if (!token && to.path.startsWith('/cp') && to.path !== '/cp/login') return '/cp/login'
    if (token && to.path === '/cp/login') return '/cp/dashboard'
})

export default router


