<template>
  <div class="dashboard-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="hero-meta-badge">{{ copy.updatedAt }}: {{ refreshedAtLabel }}</span>
        <span class="hero-meta-badge">{{ activeTabMeta }}</span>
      </template>
      <template #actions>
        <button class="hero-btn" :disabled="loading" @click="refreshAll">
          <Icon name="lucide:refresh-cw" size="15" />
          <span>{{ loading ? copy.refreshing : copy.refresh }}</span>
        </button>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard
        compact
        :label="copy.shift"
        :value="shiftOpen ? copy.shiftOpen : copy.shiftClosed"
        :hint="shiftOpen ? `ID #${shiftId} · ${formatDateTime(shiftOpenedAt)}` : copy.shiftNeedOpen"
        :chip="shiftOpen ? copy.live : copy.idle"
        tone="tone-green"
      />
      <CpStatCard
        compact
        :label="copy.cashflow"
        :value="`${formatMoney(shiftGross)} UZS`"
        :hint="`Naqd ${formatMoney(shiftCash)} · Karta ${formatMoney(shiftCard)}`"
        tone="tone-blue"
      />
      <CpStatCard
        compact
        :label="copy.activeSessions"
        :value="String(sessions.length)"
        :hint="`${txt(copy.averageMinutes, { value: avgSessionMinutes })} · ${txt(copy.longestMinutes, { value: maxSessionMinutes })}`"
        tone="tone-amber"
      />
      <CpStatCard
        compact
        :label="copy.hallOccupancy"
        :value="`${pcBusy}/${pcTotal}`"
        :hint="`Online ${pcOnline} · Bron ${pcReserved} · Offline ${pcOffline}`"
        tone="tone-rose"
      />
    </div>

    <div class="dashboard-tabs">
      <button
        v-for="tab in dashboardTabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        type="button"
        @click="activeTab = tab.key"
      >
        <Icon :name="tab.icon" size="15" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <template v-if="activeTab === 'overview'">
      <div class="overview-grid">
        <CpPanelCard :title="copy.operatorFlowTitle" :subtitle="copy.operatorFlowSubtitle">
          <div class="overview-kpis">
            <article class="mini-kpi">
              <span>{{ copy.expectedCash }}</span>
              <strong>{{ formatMoney(expectedCashNow) }} UZS</strong>
            </article>
            <article class="mini-kpi">
              <span>{{ copy.cashflow }}</span>
              <strong>{{ formatMoney(shiftGross) }} UZS</strong>
            </article>
            <article class="mini-kpi">
              <span>{{ copy.expenses }}</span>
              <strong>{{ formatMoney(shiftExpenses) }} UZS</strong>
            </article>
            <article class="mini-kpi">
              <span>{{ copy.bonus }}</span>
              <strong>{{ formatMoney(shiftBonus) }} UZS</strong>
            </article>
            <article class="mini-kpi">
              <span>{{ copy.operations }}</span>
              <strong>{{ shiftOps }}</strong>
            </article>
            <article class="mini-kpi">
              <span>{{ copy.activeSessions }}</span>
              <strong>{{ sessions.length }}</strong>
            </article>
          </div>
        </CpPanelCard>

        <CpPanelCard :title="copy.signalsTitle" :subtitle="copy.signalsSubtitle">
          <div class="signal-grid">
            <div class="signal danger">{{ copy.failedCommand }}: {{ failedCommands }}</div>
            <div class="signal warn">{{ copy.pendingCommand }}: {{ pendingCommands }}</div>
            <div class="signal info">{{ copy.offlinePc }}: {{ pcOffline }}</div>
          </div>

          <div class="overview-status-grid">
            <article class="status-card">
              <span>{{ copy.shift }}</span>
              <strong>{{ shiftOpen ? copy.shiftOpen : copy.shiftClosed }}</strong>
              <small>{{ shiftOpen ? `ID #${shiftId}` : copy.shiftNeedOpen }}</small>
            </article>
            <article class="status-card">
              <span>{{ copy.hallOccupancy }}</span>
              <strong>{{ pcBusy }}/{{ pcTotal }}</strong>
              <small>Online {{ pcOnline }} · Bron {{ pcReserved }} · Offline {{ pcOffline }}</small>
            </article>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'activity'">
      <div class="main-grid">
        <CpPanelCard :title="copy.liveSessionsTitle" :subtitle="copy.liveSessionsSubtitle">
          <template #actions>
            <NuxtLink class="link-btn" to="/cp/pcs">{{ copy.hallView }}</NuxtLink>
          </template>

          <div v-if="sessionsTop.length" class="list-table">
            <div class="list-row list-head">
              <span>{{ copy.pc }}</span>
              <span>{{ copy.client }}</span>
              <span>{{ copy.startedAt }}</span>
              <span>{{ copy.duration }}</span>
              <span></span>
            </div>
            <div v-for="session in sessionsTop" :key="session.id" class="list-row">
              <span>{{ session.pc?.code || '-' }}</span>
              <span>{{ session.client?.login || session.client?.phone || '-' }}</span>
              <span>{{ formatDateTime(session.started_at) }}</span>
              <span>{{ sessionMinutes(session.started_at) }} min</span>
              <button class="danger-btn" @click="stopSessionQuick(session.id)">{{ copy.stop }}</button>
            </div>
          </div>
          <div v-else class="empty-state">{{ copy.noActiveSessions }}</div>
        </CpPanelCard>

        <CpPanelCard :title="copy.bookingQueueTitle" :subtitle="copy.bookingQueueSubtitle">
          <template #actions>
            <NuxtLink class="link-btn" to="/cp/bookings">{{ copy.all }}</NuxtLink>
          </template>

          <div v-if="bookingsTop.length" class="booking-list">
            <article v-for="booking in bookingsTop" :key="booking.id" class="booking-card">
              <div>
                <strong>{{ booking.pc?.code || `PC #${booking.pc_id}` }}</strong>
                <p>{{ booking.client?.login || booking.client?.phone || `#${booking.client_id}` }}</p>
              </div>
              <div class="booking-meta">
                <span>{{ formatDateTime(booking.start_at) }}</span>
                <button class="ghost-btn" @click="cancelBookingQuick(booking.id)">{{ copy.cancel }}</button>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">{{ copy.noActiveBookings }}</div>
        </CpPanelCard>
      </div>
    </template>

    <CpPanelCard v-else :title="copy.signalsTitle" :subtitle="copy.signalsSubtitle">
      <div class="signal-grid">
        <div class="signal danger">{{ copy.failedCommand }}: {{ failedCommands }}</div>
        <div class="signal warn">{{ copy.pendingCommand }}: {{ pendingCommands }}</div>
        <div class="signal info">{{ copy.offlinePc }}: {{ pcOffline }}</div>
      </div>

      <div v-if="importantLogs.length" class="log-list">
        <article v-for="log in importantLogs" :key="log.id" class="log-card">
          <div class="log-top">
            <strong>{{ log.type }}</strong>
            <span>{{ formatDateTime(log.happened_at) }}</span>
          </div>
          <p>{{ log.action }} · {{ log.pc?.code || '-' }}</p>
          <small>{{ log.status || '-' }} · {{ log.note || copy.noNote }}</small>
        </article>
      </div>
      <div v-else class="empty-state">{{ copy.noImportantLogs }}</div>
    </CpPanelCard>
  </div>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpFormatters } from '../../../composables/useCpFormatters'
import { useCpCopy } from '../../../composables/useCpCopy'
import { cpNativePageCopy } from '../../constants/cp-native-copy'

definePageMeta({
  layout: 'cp',
})

const copy = useCpCopy(cpNativePageCopy.dashboard)

useHead({
  title: computed(() => `${copy.value.headTitle} · MyCafeCloud CP`),
})

const { formatMoney, formatDateTime } = useCpFormatters()

function txt(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`))
}

const loading = ref(false)
const refreshedAt = ref<string | null>(null)
const tickNow = ref(Date.now())
const activeTab = ref<'overview' | 'activity' | 'signals'>('overview')

const shiftSummary = ref<any>(null)
const pcs = ref<any[]>([])
const sessions = ref<any[]>([])
const activeBookings = ref<any[]>([])
const logs = ref<any[]>([])

let refreshTimer: number | null = null
let tickTimer: number | null = null

const dashboardTabs = [
  { key: 'overview', label: 'Overview', icon: 'lucide:layout-dashboard' },
  { key: 'activity', label: 'Activity', icon: 'lucide:activity' },
  { key: 'signals', label: 'Signals', icon: 'lucide:siren' },
] as const

function asArray(value: any) {
  return Array.isArray(value) ? value : []
}

function sessionMinutes(startedAt: string) {
  const date = new Date(startedAt)
  if (Number.isNaN(date.getTime())) return 0
  return Math.max(0, Math.floor((tickNow.value - date.getTime()) / 60000))
}

const refreshedAtLabel = computed(() => (refreshedAt.value ? formatDateTime(refreshedAt.value) : '-'))
const activeTabMeta = computed(() => dashboardTabs.find((tab) => tab.key === activeTab.value)?.label || 'Overview')
const shift = computed(() => shiftSummary.value?.shift || null)
const shiftTotals = computed(() => shiftSummary.value?.totals || {})
const shiftExpected = computed(() => shiftSummary.value?.expected || {})

const shiftOpen = computed(() => Boolean(shift.value))
const shiftId = computed(() => shift.value?.id || '-')
const shiftOpenedAt = computed(() => shift.value?.opened_at || null)
const shiftCash = computed(() => Number(shiftTotals.value?.cash || 0))
const shiftCard = computed(() => Number(shiftTotals.value?.card || 0))
const shiftGross = computed(() => Number(shiftTotals.value?.gross || 0))
const shiftBonus = computed(() => Number(shiftTotals.value?.bonus || 0))
const shiftOps = computed(() => Number(shiftTotals.value?.ops_count || 0))
const shiftExpenses = computed(() => Number(shiftTotals.value?.expenses || 0))
const expectedCashNow = computed(() => Number(shiftExpected.value?.cash_now || 0))

const pcTotal = computed(() => pcs.value.length)
const pcBusy = computed(() => pcs.value.filter((item) => item.status === 'busy').length)
const pcReserved = computed(() => pcs.value.filter((item) => item.status === 'reserved').length)
const pcOffline = computed(() => pcs.value.filter((item) => item.status === 'offline').length)
const pcOnline = computed(() => pcs.value.filter((item) => ['online', 'busy', 'reserved'].includes(item.status)).length)

const avgSessionMinutes = computed(() => {
  if (!sessions.value.length) return 0
  const sum = sessions.value.reduce((acc, item) => acc + sessionMinutes(item.started_at), 0)
  return Math.round(sum / sessions.value.length)
})

const maxSessionMinutes = computed(() => {
  if (!sessions.value.length) return 0
  return Math.max(...sessions.value.map((item) => sessionMinutes(item.started_at)))
})

const sessionsTop = computed(() => sessions.value.slice(0, 6))
const bookingsTop = computed(() =>
  activeBookings.value
    .slice()
    .sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime())
    .slice(0, 6),
)

const failedCommands = computed(() =>
  logs.value.filter((item) => item.type === 'pc_command' && ['failed', 'error', 'rejected'].includes(String(item.status || '').toLowerCase())).length,
)

const pendingCommands = computed(() =>
  logs.value.filter((item) => item.type === 'pc_command' && ['pending', 'sent'].includes(String(item.status || '').toLowerCase())).length,
)

const importantLogs = computed(() =>
  logs.value
    .filter((item) => {
      const status = String(item.status || '').toLowerCase()
      if (item.type === 'pc_command' && ['failed', 'error', 'rejected', 'pending', 'sent'].includes(status)) return true
      if (item.type === 'session' && item.action === 'ended') return true
      return false
    })
    .slice(0, 8),
)

async function refreshAll() {
  loading.value = true
  try {
    const today = new Date()
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10)
    const to = from

    const [shiftResp, pcsResp, sessionsResp, bookingsResp, logsResp] = await Promise.all([
      cpApi.currentShiftSummary().catch(() => ({ data: { data: null } })),
      cpApi.pcs({}).catch(() => ({ data: { data: [] } })),
      cpApi.activeSessions().catch(() => ({ data: { data: [] } })),
      cpApi.bookingsList({ status: 'active', per_page: 100 }).catch(() => ({ data: { data: { data: [] } } })),
      cpApi.logsList({ from, to, per_page: 100 }).catch(() => ({ data: { data: [] } })),
    ])

    shiftSummary.value = shiftResp?.data?.data || null
    pcs.value = asArray(pcsResp?.data?.data)
    sessions.value = asArray(sessionsResp?.data?.data)

    const bookingsPayload = bookingsResp?.data?.data
    activeBookings.value = Array.isArray(bookingsPayload?.data) ? bookingsPayload.data : asArray(bookingsPayload)
    logs.value = asArray(logsResp?.data?.data)
    refreshedAt.value = new Date().toISOString()
  } finally {
    loading.value = false
  }
}

async function stopSessionQuick(sessionId: number) {
  try {
    await ElMessageBox.confirm(copy.value.stopSessionConfirm, copy.value.confirmTitle, {
      type: 'warning',
      confirmButtonText: copy.value.confirmYes,
      cancelButtonText: copy.value.confirmNo,
    })
  } catch {
    return
  }

  await cpApi.stopSession(sessionId)
  await refreshAll()
}

async function cancelBookingQuick(bookingId: number) {
  try {
    await ElMessageBox.confirm(copy.value.cancelBookingConfirm, copy.value.confirmTitle, {
      type: 'warning',
      confirmButtonText: copy.value.confirmYes,
      cancelButtonText: copy.value.confirmNo,
    })
  } catch {
    return
  }

  await cpApi.bookingCancel(bookingId)
  await refreshAll()
}

onMounted(async () => {
  await refreshAll()
  refreshTimer = window.setInterval(refreshAll, 20000)
  tickTimer = window.setInterval(() => {
    tickNow.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
  if (tickTimer) window.clearInterval(tickTimer)
})
</script>

<style scoped>
.dashboard-page { display:grid; gap:16px; }
.dashboard-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--stroke);
  border-radius: 18px;
  background: var(--surface);
}

.tab-btn,
.hero-meta-badge,
.hero-btn,
.danger-btn,
.ghost-btn,
.link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
}

.tab-btn {
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.tab-btn.active {
  border-color: color-mix(in srgb, var(--brand-secondary) 28%, var(--stroke));
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 12%, var(--surface-soft)), color-mix(in srgb, var(--brand) 12%, var(--surface)));
}

.hero-meta-badge {
  min-height: 32px;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.hero-btn {
  gap: 8px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 72%, white), color-mix(in srgb, var(--brand) 64%, transparent));
  border-color: color-mix(in srgb, var(--brand-secondary) 24%, var(--stroke));
  color: #08111e;
  font-weight: 800;
}

.link-btn {
  text-decoration:none;
}

.danger-btn {
  border-color: color-mix(in srgb, var(--danger) 28%, var(--stroke));
  background: color-mix(in srgb, var(--danger) 12%, transparent);
}

.ghost-btn {
  min-height: 36px;
  padding: 0 12px;
}

.stats-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }
.overview-grid { display:grid; grid-template-columns:1.1fr .9fr; gap:16px; }
.main-grid { display:grid; grid-template-columns:1.2fr 1fr; gap:16px; }
.list-table { display:grid; gap:10px; }

.list-row {
  display:grid;
  grid-template-columns:.8fr 1fr 1fr .7fr 110px;
  gap:12px;
  align-items:center;
  padding:12px 14px;
  border-radius:14px;
  background: var(--surface-soft);
  border:1px solid var(--stroke);
}

.list-head {
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color: var(--text-faint);
}

.booking-list,.log-list { display:grid; gap:10px; }

.booking-card,.log-card {
  display:flex;
  justify-content:space-between;
  gap:12px;
  padding:14px;
  border-radius:16px;
  border:1px solid var(--stroke);
  background: var(--surface-soft);
}

.booking-card p,.log-card p {
  margin:6px 0 0;
  font-size:12px;
  color: var(--text-muted);
}

.booking-meta,.log-top { display:flex; flex-direction:column; gap:8px; align-items:flex-end; font-size:12px; }
.signal-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-bottom:14px; }
.signal { padding:12px; border-radius:14px; border:1px solid var(--stroke); font-size:13px; font-weight:700; }
.signal.danger { border-color:color-mix(in srgb, var(--danger) 30%, var(--stroke)); background:color-mix(in srgb, var(--danger) 12%, transparent); }
.signal.warn { border-color:color-mix(in srgb, var(--accent) 30%, var(--stroke)); background:color-mix(in srgb, var(--accent) 12%, transparent); }
.signal.info { border-color:color-mix(in srgb, var(--brand-secondary) 30%, var(--stroke)); background:color-mix(in srgb, var(--brand-secondary) 12%, transparent); }

.overview-kpis { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.overview-status-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:14px; }

.mini-kpi,
.status-card {
  padding:14px;
  border-radius:16px;
  background:var(--surface-soft);
  border:1px solid var(--stroke);
}

.mini-kpi span,
.status-card span {
  display:block;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:var(--text-faint);
}

.mini-kpi strong,
.status-card strong {
  display:block;
  margin-top:8px;
  font-size:20px;
  line-height:1.15;
}

.mini-kpi small,
.status-card small {
  display:block;
  margin-top:6px;
  font-size:12px;
  color:var(--text-muted);
}

.empty-state {
  padding:26px;
  text-align:center;
  border:1px dashed var(--stroke);
  border-radius:16px;
  color: var(--text-muted);
}

@media (max-width:1200px) {
  .stats-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .overview-grid,
  .main-grid,
  .signal-grid,
  .overview-kpis,
  .overview-status-grid { grid-template-columns:1fr; }
}

@media (max-width:800px) {
  .stats-grid { grid-template-columns:1fr; }
  .list-row { grid-template-columns:1fr; }
  .booking-card,.log-card { flex-direction:column; }
  .booking-meta,.log-top { align-items:flex-start; }
}
</style>
