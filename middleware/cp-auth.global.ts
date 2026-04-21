import { useCpAuthStore } from '@legacy/stores/cpAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!process.client) return

  const auth = useCpAuthStore()
  const rawToken = localStorage.getItem('cp_token')
  const token = (rawToken || '').trim()
  const hasToken = Boolean(token)
  const isCpRoute = to.path.startsWith('/cp')
  const isLogin = to.path === '/cp/login'

  if (!isCpRoute) return

  if (!hasToken) {
    if (!isLogin) return navigateTo('/cp/login')
    return
  }

  if (!auth.operator) {
    try {
      await auth.fetchMe()
    } catch {
      localStorage.removeItem('cp_token')
      auth.tenant = null
      auth.operator = null
      if (!isLogin) return navigateTo('/cp/login')
      return
    }
  }

  if (isLogin && auth.operator) {
    return navigateTo('/cp/dashboard')
  }
})
