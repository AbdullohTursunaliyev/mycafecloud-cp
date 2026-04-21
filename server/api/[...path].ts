import { getProxyRequestHeaders, getRequestURL, getRouterParam, proxyRequest } from 'h3'

const DEFAULT_BACKEND_ORIGIN = 'http://localhost:8080'

function normalizeBackendOrigin(value: string) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

export default defineEventHandler((event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const backendOrigin = normalizeBackendOrigin(runtimeConfig.cpBackendOrigin || DEFAULT_BACKEND_ORIGIN)

  const path = getRouterParam(event, 'path') || ''
  const requestUrl = getRequestURL(event)
  const search = requestUrl.search || ''
  const target = `${backendOrigin}/api/${path}${search}`
  const headers = getProxyRequestHeaders(event)
  delete headers.host

  return proxyRequest(event, target, {
    headers,
  })
})
