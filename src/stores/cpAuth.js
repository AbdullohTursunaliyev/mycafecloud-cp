import { navigateTo } from '#app'
import { defineStore } from 'pinia'
import { cpApi } from '../api/cp'

export const useCpAuthStore = defineStore('cpAuth', {
    state: () => ({
        tenant: null,
        operator: null,
        loading: false,
    }),
    actions: {
        async fetchMe() {
            this.loading = true
            try {
                const { data } = await cpApi.me()
                this.tenant = data.tenant
                this.operator = data.operator
            } finally {
                this.loading = false
            }
        },
        async login({ license_key, login, password }) {
            const { data } = await cpApi.login({ license_key, login, password })
            localStorage.setItem('cp_token', data.token)
            this.tenant = data.tenant
            this.operator = data.operator
        },
        async logout() {
            try { await cpApi.logout() } catch (e) {}
            localStorage.removeItem('cp_token')
            this.tenant = null
            this.operator = null
            await navigateTo('/cp/login')
        },
    },
})

export function hasRole(user, roles = []) {
    const r = user?.role || user?.roles?.[0]
    return roles.includes(r)
}
