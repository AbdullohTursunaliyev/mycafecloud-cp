export function useCpPayload() {
  function asArray<T = any>(value: any): T[] {
    return Array.isArray(value) ? value : []
  }

  function unwrapData(payload: any) {
    if (payload && typeof payload === 'object' && 'data' in payload) return payload.data
    return payload
  }

  function pickRows<T = any>(payload: any): T[] {
    const first = unwrapData(payload)
    const second = unwrapData(first)
    if (Array.isArray(second?.data)) return second.data
    if (Array.isArray(second)) return second
    if (Array.isArray(first?.data)) return first.data
    if (Array.isArray(first)) return first
    return []
  }

  function pickPage<T = any>(payload: any) {
    const first = unwrapData(payload)
    const second = unwrapData(first)
    const items = Array.isArray(second?.data)
      ? second.data
      : Array.isArray(second)
        ? second
        : Array.isArray(first?.data)
          ? first.data
          : []

    const metaSource = second && typeof second === 'object' && !Array.isArray(second) ? second : first

    return {
      items: asArray<T>(items),
      total: Number(metaSource?.total || items.length || 0),
      currentPage: Number(metaSource?.current_page || metaSource?.page || 1),
      lastPage: Number(metaSource?.last_page || 1),
    }
  }

  return {
    asArray,
    pickRows,
    pickPage,
    unwrapData,
  }
}
