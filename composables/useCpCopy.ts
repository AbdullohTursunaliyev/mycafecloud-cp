import { computed, toValue } from 'vue'
import { useI18n } from '@legacy/i18n'

type LocaleCode = 'uz' | 'ru' | 'en'

export function useCpCopy<T>(messages: Record<LocaleCode, T> | (() => Record<LocaleCode, T>)) {
  const { locale } = useI18n()

  return computed(() => {
    const resolved = toValue(messages)
    const current = locale.value as LocaleCode
    return resolved[current] || resolved.uz
  })
}
