import axios from 'axios'

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
        if (err?.response?.status === 401) {
            localStorage.removeItem('cp_token')
            window.location.href = '/cp/login'
        }
        return Promise.reject(err)
    }
)
