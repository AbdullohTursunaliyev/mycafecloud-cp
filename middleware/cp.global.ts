import { useCpAuthStore } from '@legacy/stores/cpAuth'

function asRoles(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (!to.path.startsWith('/cp')) return

  const auth = useCpAuthStore()
  const token = String(localStorage.getItem('cp_token') || '').trim()

  if (to.path === '/cp/login') {
    if (!token) return

    if (!auth.operator) {
      try {
        await auth.fetchMe()
      } catch {
        localStorage.removeItem('cp_token')
        auth.tenant = null
        auth.operator = null
        return
      }
    }

    if (auth.operator) {
      return navigateTo('/cp/dashboard')
    }

    return
  }

  if (!token) {
    return navigateTo('/cp/login')
  }

  if (!auth.operator) {
    try {
      await auth.fetchMe()
    } catch {
      localStorage.removeItem('cp_token')
      auth.tenant = null
      auth.operator = null
      return navigateTo('/cp/login')
    }
  }

  const roles = asRoles(to.meta.roles)
  if (!roles.length) return

  const currentRole = String(auth.operator?.role || '').trim()
  if (roles.includes(currentRole)) return

  return navigateTo('/cp/dashboard')
})
