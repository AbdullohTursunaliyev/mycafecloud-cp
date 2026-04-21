<template>
  <div class="cp-shell">
    <aside class="cp-side">
      <div class="cp-brand">
        <div class="logo" :class="{ 'has-image': !!safeClubLogo }">
          <img v-if="safeClubLogo" :src="safeClubLogo" alt="Club logo" />
          <span v-else>{{ logoInitials }}</span>
        </div>
        <div>
          <div class="brand-title">{{ clubDisplayName }}</div>
          <div class="brand-sub">{{ tenantName }} - {{ operatorLabel }}</div>
        </div>
      </div>

      <div class="cp-nav-scroll">
        <nav class="cp-nav">
          <section class="nav-group">
            <div class="nav-group-title">{{ t('layout.nav.main') }}</div>
            <RouterLink class="cp-link" to="/cp/dashboard" :class="{ a: is('/cp/dashboard') }">
              <el-icon class="link-icon"><House /></el-icon>
              <span>{{ t('layout.menu.dashboard') }}</span>
            </RouterLink>
            <RouterLink class="cp-link" to="/cp/pcs" :class="{ a: is('/cp/pcs') }">
              <el-icon class="link-icon"><Monitor /></el-icon>
              <span>{{ t('layout.menu.pcs') }}</span>
            </RouterLink>
            <RouterLink v-if="isAdminOwner" class="cp-link" to="/cp/layout" :class="{ a: is('/cp/layout') }">
              <el-icon class="link-icon"><Grid /></el-icon>
              <span>{{ t('layout.menu.layout') }}</span>
            </RouterLink>
            <RouterLink class="cp-link" to="/cp/clients" :class="{ a: is('/cp/clients') }">
              <el-icon class="link-icon"><User /></el-icon>
              <span>{{ t('layout.menu.clients') }}</span>
            </RouterLink>
            <RouterLink class="cp-link" to="/cp/bookings" :class="{ a: is('/cp/bookings') }">
              <el-icon class="link-icon"><Calendar /></el-icon>
              <span>{{ t('layout.menu.bookings') }}</span>
            </RouterLink>
          </section>

          <section class="nav-group">
            <div class="nav-group-title">{{ t('layout.nav.operations') }}</div>
            <RouterLink class="cp-link" to="/cp/shift" :class="{ a: is('/cp/shift') }">
              <el-icon class="link-icon"><Coin /></el-icon>
              <span>{{ t('layout.menu.cashier') }}</span>
            </RouterLink>
            <RouterLink class="cp-link" to="/cp/returns" :class="{ a: is('/cp/returns') }">
              <el-icon class="link-icon"><Money /></el-icon>
              <span>{{ t('layout.menu.returns') }}</span>
            </RouterLink>
            <RouterLink class="cp-link" to="/cp/transfers" :class="{ a: is('/cp/transfers') }">
              <el-icon class="link-icon"><RefreshLeft /></el-icon>
              <span>{{ t('layout.menu.transfers') }}</span>
            </RouterLink>
            <RouterLink v-if="canSeeShiftHistory" to="/cp/shifts-history" class="cp-link" :class="{ a: is('/cp/shifts-history') }">
              <el-icon class="link-icon"><Histogram /></el-icon>
              <span>{{ t('layout.menu.shiftsHistory') }}</span>
            </RouterLink>
          </section>

          <section class="nav-group">
            <div class="nav-group-title">{{ t('layout.nav.management') }}</div>
            <RouterLink v-if="isAdminOwner" to="/cp/reports" class="cp-link" :class="{ a: is('/cp/reports') }">
              <el-icon class="link-icon"><DataAnalysis /></el-icon>
              <span>{{ t('layout.menu.reports') }}</span>
            </RouterLink>
            <RouterLink v-if="isAdminOwner" to="/cp/install-center" class="cp-link" :class="{ a: is('/cp/install-center') }">
              <el-icon class="link-icon"><Download /></el-icon>
              <span>{{ t('layout.menu.installCenter') }}</span>
            </RouterLink>
            <RouterLink v-if="isAdminOwner" to="/cp/shell-games" class="cp-link" :class="{ a: is('/cp/shell-games') }">
              <el-icon class="link-icon"><VideoPlay /></el-icon>
              <span>{{ t('layout.menu.shellGames') }}</span>
            </RouterLink>
            <RouterLink v-if="canSeePromotions" to="/cp/promotions" class="cp-link" :class="{ a: is('/cp/promotions') }">
              <el-icon class="link-icon"><Present /></el-icon>
              <span>{{ t('layout.menu.promotions') }}</span>
            </RouterLink>
            <RouterLink v-if="isAdminOwner" to="/cp/zones" class="cp-link" :class="{ a: is('/cp/zones') }">
              <el-icon class="link-icon"><MapLocation /></el-icon>
              <span>{{ t('layout.menu.zones') }}</span>
            </RouterLink>
            <RouterLink v-if="isAdminOwner" to="/cp/packages" class="cp-link" :class="{ a: is('/cp/packages') }">
              <el-icon class="link-icon"><Box /></el-icon>
              <span>{{ t('layout.menu.packages') }}</span>
            </RouterLink>
            <RouterLink v-if="isAdminOwner" to="/cp/subscriptions" class="cp-link" :class="{ a: is('/cp/subscriptions') }">
              <el-icon class="link-icon"><Ticket /></el-icon>
              <span>{{ t('layout.menu.subscriptions') }}</span>
            </RouterLink>
            <RouterLink class="cp-link" to="/cp/logs" :class="{ a: is('/cp/logs') }">
              <el-icon class="link-icon"><Document /></el-icon>
              <span>{{ t('layout.menu.logs') }}</span>
            </RouterLink>
            <RouterLink class="cp-link" to="/cp/billing-logs" :class="{ a: is('/cp/billing-logs') }">
              <el-icon class="link-icon"><Document /></el-icon>
              <span>{{ t('layout.menu.billingLogs') }}</span>
            </RouterLink>
            <RouterLink v-if="isAdminOwner" class="cp-link" to="/cp/settings" :class="{ a: is('/cp/settings') }">
              <el-icon class="link-icon"><Setting /></el-icon>
              <span>{{ t('layout.menu.settings') }}</span>
            </RouterLink>
          </section>
        </nav>
      </div>
    </aside>

    <section class="cp-main">
      <header class="cp-top card-flat">
        <div class="top-left">
          <div class="title-row">
            <span class="title-badge">
              <el-icon><Monitor /></el-icon>
            </span>
            <div>
              <div class="h1">{{ t('layout.header.title') }}</div>
              <div class="muted" style="margin-top: 4px">{{ t('layout.header.subtitle') }}</div>
            </div>
          </div>
        </div>

        <div class="top-right">
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

          <div class="pill status">
            <el-icon class="pill-icon"><Monitor /></el-icon>
            <span class="pill-dot"></span>
            {{ t('layout.header.statusOnline') }}
          </div>

          <div class="pill license" v-if="licenseLabel">
            <el-icon class="pill-icon"><Ticket /></el-icon>
            {{ licenseLabel }}
          </div>

          <button class="btn-logout" @click="logout">
            <el-icon><SwitchButton /></el-icon>
            <span>{{ t('layout.header.logout') }}</span>
          </button>
        </div>
      </header>

      <main class="cp-content">
        <RouterView />
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Box,
  Calendar,
  Coin,
  Download,
  DataAnalysis,
  Document,
  Grid,
  Histogram,
  House,
  MapLocation,
  Money,
  Monitor,
  Present,
  RefreshLeft,
  Setting,
  SwitchButton,
  Ticket,
  User,
  VideoPlay,
} from '@element-plus/icons-vue'
import { useCpAuthStore } from '../stores/cpAuth'
import { cpApi } from '../api/cp'
import { useI18n } from '../i18n'

const route = useRoute()
const auth = useCpAuthStore()
const { t, locale, setLocale, supportedLocales } = useI18n()

const clubName = ref('')
const clubLogo = ref('')

function normalizeLogoSrc(raw) {
  if (typeof raw !== 'string') return ''
  let value = raw.trim()
  if (!value) return ''

  try {
    const decoded = decodeURIComponent(value)
    if (decoded) value = decoded
  } catch (_) {}

  // Remove accidental wrapper quotes: "data:image..." or 'data:image...'
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
  } catch (_) {
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

onMounted(() => {
  if (!auth.operator && localStorage.getItem('cp_token')) auth.fetchMe().catch(() => {})
  loadClubSettings()
  window.addEventListener('cp-club-settings-updated', onClubSettingsUpdated)
})

onBeforeUnmount(() => {
  window.removeEventListener('cp-club-settings-updated', onClubSettingsUpdated)
})

const tenantName = computed(() => auth.tenant?.name || '-')
const clubDisplayName = computed(() => clubName.value || tenantName.value || 'MyCafeCloud - CP')
const safeClubLogo = computed(() => normalizeLogoSrc(clubLogo.value))
const logoInitials = computed(() => {
  const src = String(clubDisplayName.value || 'MC').trim()
  if (!src) return 'MC'
  const chars = src
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
  return chars.join('').toUpperCase() || 'MC'
})

const operatorLabel = computed(() => (auth.operator ? `${auth.operator.login} (${auth.operator.role})` : '-'))
const logout = () => auth.logout()
const is = (p) => route.path === p

const canSeeShiftHistory = computed(() => {
  const role = auth.operator?.role
  return role === 'admin' || role === 'owner'
})

const canSeePromotions = computed(() => {
  const role = auth.operator?.role
  return role === 'admin' || role === 'owner'
})

const isAdminOwner = computed(() => {
  const role = auth.operator?.role
  return role === 'admin' || role === 'owner'
})

const licenseLabel = computed(() => {
  const exp = auth.tenant?.license_expires_at
  if (!exp) return t('layout.license.unknown')

  const d = new Date(exp)
  if (Number.isNaN(d.getTime())) return t('layout.license.unknown')

  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const days = Math.ceil(diffMs / 86400000)

  if (days <= 0) return t('layout.license.expired')
  return t('layout.license.daysLeft', { days })
})
</script>

<style scoped>
.cp-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 280px 1fr;
}

.cp-side {
  border-right: 1px solid var(--stroke);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(9, 14, 28, 0.92));
  padding: 14px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.cp-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.25);
}

.logo {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.18);
  border: 1px solid rgba(59, 130, 246, 0.25);
  font-weight: 900;
  overflow: hidden;
}

.logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo.has-image {
  background: rgba(2, 6, 23, 0.35);
}

.logo span {
  font-size: 12px;
  letter-spacing: 0.04em;
}

.brand-title {
  font-weight: 900;
}

.brand-sub {
  opacity: 0.75;
  font-size: 12px;
  margin-top: 2px;
}

.cp-nav-scroll {
  margin-top: 12px;
  overflow: auto;
  padding-right: 2px;
}

.cp-nav {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav-group {
  border: 1px solid var(--stroke);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.2);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nav-group-title {
  font-size: 11px;
  opacity: 0.64;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px 4px;
}

.cp-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--text);
  opacity: 0.9;
  border: 1px solid transparent;
}

.cp-link:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--stroke);
}

.cp-link.a {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.16), rgba(14, 165, 233, 0.14));
  border-color: rgba(59, 130, 246, 0.32);
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.14);
}

.link-icon {
  width: 16px;
  height: 16px;
  opacity: 0.82;
}

.cp-link.a .link-icon {
  opacity: 1;
}

.cp-main {
  padding: 14px;
}

.cp-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(460px 260px at 15% 0%, rgba(212, 175, 106, 0.18), transparent 60%),
    radial-gradient(460px 260px at 85% 100%, rgba(45, 212, 191, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(12, 18, 36, 0.92), rgba(7, 10, 22, 0.9));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  position: relative;
  overflow: hidden;
}

.top-left {
  display: flex;
  align-items: center;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-badge {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(212, 175, 106, 0.95);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.title-badge .el-icon {
  font-size: 20px;
}

.cp-content {
  padding-top: 12px;
}

.top-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: 4px;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(2, 6, 23, 0.35);
}

.lang-btn {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(2, 6, 23, 0.2);
  color: var(--text);
  border-radius: 999px;
  padding: 7px 10px;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}

.lang-btn.active {
  border-color: rgba(212, 175, 106, 0.6);
  background: linear-gradient(135deg, rgba(212, 175, 106, 0.35), rgba(45, 212, 191, 0.25));
  color: #0f141f;
  font-weight: 700;
}

.pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(2, 6, 23, 0.35);
  color: var(--text);
  font-size: 12px;
}

.pill-icon {
  font-size: 14px;
  opacity: 0.85;
}

.pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: rgba(34, 197, 94, 0.9);
  box-shadow: 0 0 18px rgba(34, 197, 94, 0.35);
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.12);
  color: var(--text);
  border-radius: 999px;
  padding: 9px 14px;
  font-size: 12px;
  cursor: pointer;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.2);
}

@media (max-width: 1200px) {
  .cp-shell {
    grid-template-columns: 250px 1fr;
  }
}

@media (max-width: 900px) {
  .cp-shell {
    grid-template-columns: 1fr;
  }

  .cp-side {
    min-height: auto;
  }

  .cp-nav-scroll {
    max-height: 280px;
  }

  .cp-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .top-right {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>

