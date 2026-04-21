import { computed, ref, watch } from 'vue'

type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'cp_theme'
const theme = ref<ThemeMode>('dark')
let initialized = false
let syncStarted = false

function applyTheme(next: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = next
  document.documentElement.style.colorScheme = next
}

function detectTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'

  const domTheme = document.documentElement.dataset.theme
  if (domTheme === 'dark' || domTheme === 'light') return domTheme

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useCpTheme() {
  if (typeof window !== 'undefined' && !syncStarted) {
    syncStarted = true
    watch(theme, (next) => applyTheme(next), { immediate: true })
  }

  function initTheme() {
    if (!initialized) {
      initialized = true
      theme.value = detectTheme()
    }
    applyTheme(theme.value)
  }

  function setTheme(next: ThemeMode) {
    theme.value = next
    applyTheme(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: computed(() => theme.value),
    isDark: computed(() => theme.value === 'dark'),
    initTheme,
    setTheme,
    toggleTheme,
  }
}
