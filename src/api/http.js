import axios from 'axios'

const AUTH_FAILURE_PATTERNS = [
    /unauthenticated/i,
    /token has expired/i,
    /expired token/i,
    /invalid token/i,
]

function clearAuthAndRedirect() {
    localStorage.removeItem('cp_token')
    if (window.location.pathname !== '/cp/login') {
        window.location.href = '/cp/login'
    }
}

function shouldForceLogout(err) {
    if (err?.response?.status !== 401) return false

    const requestUrl = String(err?.config?.url || '')
    if (/\/cp\/auth\/login\b/.test(requestUrl)) return false
    if (/\/cp\/auth\/(me|logout)\b/.test(requestUrl)) return true

    const message = String(err?.response?.data?.message || '')
    return AUTH_FAILURE_PATTERNS.some((pattern) => pattern.test(message))
}

export const http = axios.create({
    baseURL: '/api',
    timeout: 15000,
    withCredentials: false,
    xsrfCookieName: null,
    xsrfHeaderName: null,
})

http.interceptors.request.use((config) => {
    const tokenRaw = localStorage.getItem('cp_token')
    const token = (tokenRaw || '').replace(/^"+|"+$/g, '').trim()

    // Guard against corrupted oversized token causing 431 headers.
    if (token.length > 2048) {
        localStorage.removeItem('cp_token')
        window.location.href = '/cp/login'
        return config
    }

    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

http.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 431) {
            console.error('431 Header too large: check token/cookies and re-login.')
        }
        if (shouldForceLogout(err)) {
            clearAuthAndRedirect()
        }
        return Promise.reject(err)
    }
)
