import { computed } from 'vue'
import { useI18n } from '@legacy/i18n'

export function useCpFormatters() {
  const { locale } = useI18n()

  const localeCode = computed(() => {
    if (locale.value === 'ru') return 'ru-RU'
    if (locale.value === 'en') return 'en-US'
    return 'uz-UZ'
  })

  function groupDigits(value: number, separator: string) {
    return Math.abs(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, separator)
  }

  function formatMoney(value: number | string | null | undefined) {
    const amount = Math.round(Number(value || 0))
    if (locale.value === 'ru' || locale.value === 'uz') {
      const sign = amount < 0 ? '-' : ''
      return `${sign}${groupDigits(amount, '.')}`
    }
    return new Intl.NumberFormat(localeCode.value).format(amount)
  }

  function formatDateTime(value: string | number | Date | null | undefined) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleString(localeCode.value)
  }

  function formatDate(value: string | number | Date | null | undefined) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString(localeCode.value)
  }

  function formatMinutes(value: number | string | null | undefined) {
    return `${Math.round(Number(value || 0))} min`
  }

  return {
    localeCode,
    formatMoney,
    formatDateTime,
    formatDate,
    formatMinutes,
  }
}
