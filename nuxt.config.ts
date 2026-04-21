import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-03-13',
  ssr: false,
  devtools: {
    enabled: true,
  },
  modules: ['@pinia/nuxt', '@nuxt/icon'],
  css: [
    'element-plus/dist/index.css',
    './src/styles/theme.css',
    './src/styles/cp-glass.css',
    './app/assets/app.css',
  ],
  runtimeConfig: {
    cpBackendOrigin: process.env.NUXT_CP_BACKEND_ORIGIN || '',
    public: {
      apiBase: '/api',
      appName: 'NEXORA CLOUD',
    },
  },
  alias: {
    '@legacy': fileURLToPath(new URL('./src', import.meta.url)),
  },
  app: {
    head: {
      title: 'NEXORA CLOUD CP',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'NEXORA CLOUD control panel for managing shifts, clients, bookings, and club PCs.',
        },
      ],
    },
  },
  vite: {
    optimizeDeps: {
      include: ['axios', 'element-plus', '@element-plus/icons-vue'],
    },
  },
})
