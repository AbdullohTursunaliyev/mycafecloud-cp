<template>
  <div class="cp-shell">
    <aside class="cp-side">
      <div class="cp-brand">
        <div class="logo" :class="{ 'has-image': !!safeClubLogo }">
          <img v-if="safeClubLogo" :src="safeClubLogo" alt="Club logo" />
          <span v-else>{{ logoInitials }}</span>
        </div>

        <div class="brand-copy">
          <div class="brand-title">{{ clubDisplayName }}</div>
          <div class="brand-sub">{{ tenantName }} · {{ operatorLabel }}</div>
        </div>
      </div>

      <div class="license-chip">
        <span>{{ copy.licenseLabel }}</span>
        <strong>{{ licenseLabel }}</strong>
      </div>

      <nav class="cp-nav">
        <section v-for="group in visibleGroups" :key="group.key" class="nav-group">
          <div class="nav-group-title">{{ t(group.titleKey) }}</div>

          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="cp-link"
            :class="{ active: isActive(item.to) }"
          >
            <span class="link-icon-wrap">
              <Icon :name="iconMap[item.icon] || defaultIcon" class="link-icon" />
            </span>
            <span class="link-copy">
              <span class="link-title">{{ t(item.labelKey) }}</span>
            </span>
          </NuxtLink>
        </section>
      </nav>
    </aside>

    <section class="cp-main">
      <header class="cp-top">
        <div class="top-actions">
          <button class="theme-btn" type="button" @click="toggleTheme">
            <Icon :name="isDark ? 'solar:sun-2-linear' : 'solar:moon-stars-linear'" class="action-icon" />
            <span>{{ isDark ? 'Light' : 'Dark' }}</span>
          </button>

          <div class="lang-switch">
            <button
              v-for="code in supportedLocales"
              :key="code"
              class="lang-btn"
              :class="{ active: locale === code }"
              @click="setLocale(code)"
            >
              {{ t(`layout.lang.${code}`) }}
            </button>
          </div>

          <button class="btn-logout" @click="logout">
            <Icon name="solar:logout-3-linear" class="action-icon" />
            <span>{{ t('layout.header.logout') }}</span>
          </button>
        </div>
      </header>

      <main class="cp-content">
        <slot />
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { navigateTo } from '#app'
import { cpApi } from '@legacy/api/cp'
import { useI18n } from '@legacy/i18n'
import { useCpAuthStore } from '@legacy/stores/cpAuth'
import { cpNavigationGroups } from '../constants/cp-navigation'
import { cpLayoutCopy } from '../constants/cp-copy'
import { useCpCopy } from '../../composables/useCpCopy'
import { useCpTheme } from '../../composables/useCpTheme'

const auth = useCpAuthStore()
const route = useRoute()
const { t, locale, setLocale, supportedLocales } = useI18n()
const copy = useCpCopy(cpLayoutCopy)
const { isDark, initTheme, toggleTheme } = useCpTheme()

const iconMap = {
  Box: 'solar:box-linear',
  Calendar: 'solar:calendar-linear',
  Coin: 'solar:wallet-money-linear',
  DataAnalysis: 'solar:chart-square-linear',
  Document: 'solar:document-text-linear',
  Download: 'solar:cloud-download-linear',
  Grid: 'solar:widget-5-linear',
  Histogram: 'solar:chart-linear',
  House: 'solar:home-2-linear',
  MapLocation: 'solar:map-point-wave-linear',
  Money: 'solar:card-transfer-linear',
  Monitor: 'solar:monitor-smartphone-linear',
  Present: 'solar:gift-linear',
  RefreshLeft: 'solar:refresh-linear',
  Setting: 'solar:settings-linear',
  Ticket: 'solar:ticket-sale-linear',
  User: 'solar:user-linear',
  VideoPlay: 'solar:gameboy-linear',
}

const defaultIcon = 'solar:square-academic-cap-2-linear'

const clubName = ref('')
const clubLogo = ref('')

function normalizeLogoSrc(raw) {
  if (typeof raw !== 'string') return ''
  let value = raw.trim()
  if (!value) return ''

  try {
    const decoded = decodeURIComponent(value)
    if (decoded) value = decoded
  } catch {
    // noop
  }

  value = value.replace(/^[\"']+|[\"']+$/g, '').trim()
  if (!value) return ''

  const lower = value.toLowerCase()
  if (lower.startsWith('data:image/')) return value
  if (lower.startsWith('http://') || lower.startsWith('https://') || value.startsWith('/')) return value
  return ''
}

function mapSettings(items) {
  const out = {}
  for (const row of items || []) {
    if (row && typeof row.key === 'string') out[row.key] = row.value
  }
  return out
}

async function loadClubSettings() {
  try {
    const { data } = await cpApi.settingsList()
    const mapped = mapSettings(data?.data || [])
    clubName.value = typeof mapped.club_name === 'string' ? mapped.club_name : ''
    clubLogo.value = normalizeLogoSrc(mapped.club_logo)
  } catch {
    clubName.value = ''
    clubLogo.value = ''
  }
}

function onClubSettingsUpdated(event) {
  const payload = event?.detail || {}
  if (Object.prototype.hasOwnProperty.call(payload, 'club_name')) {
    clubName.value = typeof payload.club_name === 'string' ? payload.club_name : ''
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'club_logo')) {
    clubLogo.value = normalizeLogoSrc(payload.club_logo)
  } else if (payload?.key === 'club_logo') {
    clubLogo.value = normalizeLogoSrc(payload?.value)
  }
}

const currentRole = computed(() => auth.operator?.role || null)

const visibleGroups = computed(() =>
  cpNavigationGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(currentRole.value)),
  })),
)

const flattenedItems = computed(() => visibleGroups.value.flatMap((group) => group.items))
const currentPage = computed(() => flattenedItems.value.find((item) => route.path === item.to))
const currentPageLabel = computed(() => (currentPage.value ? t(currentPage.value.labelKey) : t('layout.header.title')))

const tenantName = computed(() => auth.tenant?.name || '-')
const clubDisplayName = computed(() => clubName.value || tenantName.value || 'MyCafeCloud')
const safeClubLogo = computed(() => normalizeLogoSrc(clubLogo.value))
const logoInitials = computed(() => {
  const src = String(clubDisplayName.value || 'MC').trim()
  if (!src) return 'MC'
  const chars = src
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || '')
  return chars.join('').toUpperCase() || 'MC'
})
const operatorLabel = computed(() => (auth.operator ? `${auth.operator.login} (${auth.operator.role})` : '-'))

const licenseLabel = computed(() => {
  const exp = auth.tenant?.license_expires_at
  if (!exp) return t('layout.license.unknown')

  const d = new Date(exp)
  if (Number.isNaN(d.getTime())) return t('layout.license.unknown')

  const diffMs = d.getTime() - Date.now()
  const days = Math.ceil(diffMs / 86400000)
  if (days <= 0) return t('layout.license.expired')

  return t('layout.license.daysLeft', { days })
})

function isActive(path) {
  return route.path === path
}

async function logout() {
  await auth.logout()
}

async function ensureAuthenticated() {
  const token = String(localStorage.getItem('cp_token') || '').trim()
  if (!token) {
    await navigateTo('/cp/login')
    return false
  }

  if (auth.operator) return true

  try {
    await auth.fetchMe()
    if (!auth.operator) {
      localStorage.removeItem('cp_token')
      await navigateTo('/cp/login')
      return false
    }
    return true
  } catch {
    localStorage.removeItem('cp_token')
    auth.tenant = null
    auth.operator = null
    await navigateTo('/cp/login')
    return false
  }
}

onMounted(async () => {
  initTheme()
  const ok = await ensureAuthenticated()
  if (!ok) return
  loadClubSettings()
  window.addEventListener('cp-club-settings-updated', onClubSettingsUpdated)
})

onBeforeUnmount(() => {
  window.removeEventListener('cp-club-settings-updated', onClubSettingsUpdated)
})
</script>

<style scoped>
.cp-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 284px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
}

.cp-side,
.cp-top {
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  box-shadow: var(--shadow-panel);
}

.cp-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-lg);
}

.cp-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0 2px;
}

.logo {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-weight: 900;
  color: white;
  background: linear-gradient(135deg, var(--brand-secondary), var(--brand));
  box-shadow: 0 16px 32px rgba(79, 140, 255, 0.24);
}

.logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-title {
  font-size: 18px;
  font-weight: 800;
}

.brand-sub {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-muted);
}

.license-chip {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.license-chip span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-faint);
}

.license-chip strong {
  font-size: 13px;
}

.cp-nav {
  display: grid;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.nav-group {
  display: grid;
  gap: 6px;
}

.nav-group-title {
  padding: 0 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--text-faint);
}

.cp-link {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid transparent;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.cp-link:hover {
  transform: translateX(3px);
  background: var(--surface-soft);
  border-color: var(--stroke);
}

.cp-link.active {
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.16), rgba(79, 209, 197, 0.12));
  border-color: rgba(79, 140, 255, 0.24);
}

.link-icon-wrap {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--surface-muted);
  color: var(--brand-secondary);
}

.link-icon {
  font-size: 18px;
}

.link-copy {
  min-width: 0;
  display: flex;
  align-items: center;
}

.link-title {
  font-size: 13px;
  font-weight: 700;
}

.cp-main {
  display: grid;
  gap: 14px;
  min-width: 0;
  align-content: start;
  justify-items: stretch;
}

.cp-top {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  width: max-content;
  max-width: 100%;
  padding: 8px 10px;
  border-radius: 18px;
  justify-self: end;
  background: linear-gradient(180deg, var(--surface), var(--surface-soft));
  box-shadow: var(--shadow-soft);
}

.top-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  width: auto;
  gap: 8px;
}

.theme-btn,
.btn-logout,
.lang-btn {
  height: 38px;
  padding: 0 13px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
}

.theme-btn,
.btn-logout {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 13px;
}

.theme-btn {
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.14), rgba(79, 209, 197, 0.12));
}

.btn-logout {
  color: var(--danger);
}

.lang-switch {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  height: 38px;
  padding: 0 4px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.lang-btn {
  min-width: 42px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  height: 30px;
}

.lang-btn.active {
  border-color: rgba(79, 209, 197, 0.28);
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.2), rgba(79, 209, 197, 0.16));
  color: var(--brand);
}

.action-icon {
  font-size: 18px;
}

.cp-content {
  min-width: 0;
}

@media (max-width: 1180px) {
  .cp-shell {
    grid-template-columns: 1fr;
  }

  .cp-side {
    order: 2;
  }

  .cp-top {
    justify-self: stretch;
    width: 100%;
    justify-content: flex-start;
  }

  .top-actions {
    justify-content: flex-start;
    width: 100%;
  }
}

@media (max-width: 720px) {
  .cp-shell {
    padding: 10px;
  }

  .cp-side,
  .cp-top {
    border-radius: var(--radius-md);
  }

  .cp-link {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .link-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 12px;
  }
}
</style>
