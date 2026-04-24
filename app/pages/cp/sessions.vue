<template>
  <div class="page-shell">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="meta-chip">{{ copy.updatedAt }}: {{ refreshedAtLabel }}</span>
        <span class="meta-chip">{{ copy.zone }}: {{ zone === 'all' ? copy.allZones : zone }}</span>
        <span class="meta-chip">{{ stateFilterLabel }}</span>
      </template>

      <template #actions>
        <div class="hero-actions">
          <input v-model.trim="search" class="control" :placeholder="copy.searchPlaceholder" />
          <select v-model="zone" class="control">
            <option value="all">{{ copy.allZones }}</option>
            <option v-for="item in zoneOptions" :key="item" :value="item">{{ item }}</option>
          </select>
          <select v-model="stateFilter" class="control">
            <option value="all">{{ copy.allStates }}</option>
            <option value="running">{{ copy.running }}</option>
            <option value="paused">{{ copy.paused }}</option>
          </select>
          <select v-model="sortBy" class="control">
            <option value="duration">{{ copy.sortDuration }}</option>
            <option value="pc">{{ copy.sortPc }}</option>
            <option value="client">{{ copy.sortClient }}</option>
            <option value="started">{{ copy.sortStarted }}</option>
          </select>
          <button class="primary-btn" :disabled="loading" @click="reload">
            {{ loading ? copy.refreshing : copy.refresh }}
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard :label="copy.activeSessions" :value="String(filteredSessions.length)" :hint="`${runningCount} ${copy.running}`" tone="tone-green" />
      <CpStatCard :label="copy.pausedSessions" :value="String(pausedCount)" :hint="copy.pausedHint" tone="tone-amber" />
      <CpStatCard :label="copy.averageDuration" :value="`${averageMinutes} min`" :hint="txt(copy.longestLabel, { value: longestMinutes })" tone="tone-blue" />
      <CpStatCard :label="copy.busiestZone" :value="topZone.label" :hint="`${topZone.count} ${copy.unitSessions}`" tone="tone-blue" />
    </div>

    <CpPanelCard :title="copy.longSessionsTitle" :subtitle="copy.longSessionsSubtitle">
      <div v-if="longSessions.length" class="chip-row">
        <button v-for="session in longSessions" :key="session.id" class="session-chip" @click="stopSession(session)">
          <strong>{{ session.pcLabel }}</strong>
          <span>{{ session.clientLabel }}</span>
          <em>{{ session.stateLabel }} · {{ session.remainingLabel }}</em>
        </button>
      </div>
      <div v-else class="empty-state">{{ copy.noLongSessions }}</div>
    </CpPanelCard>

    <CpPanelCard :title="copy.listTitle" :subtitle="copy.listSubtitle">
      <div v-if="sortedSessions.length" class="table">
        <div class="table-head">
          <span>{{ copy.pc }}</span>
          <span>{{ copy.client }}</span>
          <span>{{ copy.zoneLabel }}</span>
          <span>{{ copy.billing }}</span>
          <span>{{ copy.duration }}</span>
          <span></span>
        </div>

        <article v-for="session in sortedSessions" :key="session.id" class="table-row" :class="{ paused: session.paused }">
          <div>
            <div class="identity-line">
              <strong>{{ session.pcLabel }}</strong>
              <span class="state-pill" :class="session.paused ? 'paused' : 'running'">{{ session.stateLabel }}</span>
            </div>
            <p>{{ copy.startedAt }}: {{ formatDateTime(session.started_at) }}</p>
            <p>{{ session.ipLabel }}</p>
          </div>
          <div>
            <strong>{{ session.clientLabel }}</strong>
            <p>{{ session.planLabel }}</p>
            <p>{{ copy.source }}: {{ session.sourceLabel }}</p>
          </div>
          <div>
            <strong>{{ session.zoneLabel }}</strong>
            <p>{{ session.operatorLabel }}</p>
          </div>
          <div>
            <strong>{{ session.pricingRuleLabel }}</strong>
            <p>{{ copy.nextCharge }}: {{ session.nextChargeLabel }}</p>
            <p>{{ copy.rate }}: {{ session.rateLabel }}</p>
          </div>
          <div>
            <strong>{{ session.durationMinutes }} min</strong>
            <p>{{ copy.remaining }}: {{ session.remainingLabel }}</p>
          </div>
          <div class="row-actions">
            <button
              v-if="!session.paused"
              class="ghost-btn"
              :disabled="isActing(session.id)"
              @click="pauseSession(session)"
            >
              {{ copy.pause }}
            </button>
            <button
              v-else
              class="ghost-btn primary"
              :disabled="isActing(session.id)"
              @click="resumeSession(session)"
            >
              {{ copy.resume }}
            </button>
            <button class="ghost-btn danger" :disabled="isActing(session.id)" @click="stopSession(session)">{{ copy.stop }}</button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">{{ copy.noSessions }}</div>
    </CpPanelCard>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpFormatters } from '../../../composables/useCpFormatters'
import { useCpPayload } from '../../../composables/useCpPayload'
import { useCpCopy } from '../../../composables/useCpCopy'
import { cpNativePageCopy } from '../../constants/cp-native-copy'

definePageMeta({
  layout: 'cp',
})

const copy = useCpCopy(cpNativePageCopy.sessions)

useHead({
  title: computed(() => `${copy.value.headTitle} · NEXORA CLOUD CP`),
})

const { formatDateTime, formatMoney } = useCpFormatters()
const { asArray } = useCpPayload()

function txt(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`))
}

function errorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message
  const errors = error?.response?.data?.errors
  if (message) return message
  if (errors && typeof errors === 'object') return Object.values(errors).flat().join(' ')
  return fallback
}

function formatSeconds(value: number | string | null | undefined) {
  const total = Math.max(0, Number(value || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  if (hours > 0) return `${hours}:${mm}:${ss}`
  return `${mm}:${ss}`
}

const loading = ref(false)
const refreshedAt = ref<string | null>(null)
const sessions = ref<any[]>([])
const search = ref('')
const zone = ref('all')
const stateFilter = ref<'all' | 'running' | 'paused'>('all')
const sortBy = ref<'duration' | 'pc' | 'client' | 'started'>('duration')
const nowTick = ref(Date.now())
const actingId = ref<number | null>(null)

let refreshTimer: number | null = null
let tickTimer: number | null = null

function durationMinutes(startedAt: string) {
  const started = new Date(startedAt)
  if (Number.isNaN(started.getTime())) return 0
  return Math.max(0, Math.floor((nowTick.value - started.getTime()) / 60000))
}

function sourceLabel(source: string) {
  if (source === 'package') return copy.value.packageSource
  if (source === 'bonus') return copy.value.bonusSource
  return copy.value.balanceSource
}

function pricingRuleLabel(rule: any) {
  const type = rule?.type
  if (type === 'zone_pricing_window') {
    return rule?.window_name ? `${copy.value.pricingWindowRule}: ${rule.window_name}` : copy.value.pricingWindowRule
  }
  if (type === 'tariff') return copy.value.tariffRule
  if (type === 'package') return copy.value.packageRule
  if (type === 'zone') return copy.value.zoneRule
  return copy.value.unknownRule
}

const sessionView = computed(() =>
  sessions.value.map((session) => {
    const paused = !!session.paused
    const rate = Number(session.rate_per_hour || 0)

    return {
      ...session,
      paused,
      pcLabel: session.pc?.code || session.pc?.name || session.pc_code || `PC #${session.pc_id || session.id}`,
      clientLabel: session.client?.login || session.client?.phone || session.client_login || session.account_id || `#${session.client_id || '-'}`,
      zoneLabel: session.pc?.zone || session.zone || copy.value.noZone,
      operatorLabel: session.operator?.login || session.operator_login || copy.value.noOperator,
      ipLabel: session.pc?.ip_address || session.ip_address || copy.value.noIp,
      planLabel: session.package?.name || session.tariff?.name || session.tariff_name || copy.value.noTariff,
      durationMinutes: durationMinutes(session.started_at),
      stateLabel: paused ? copy.value.paused : copy.value.running,
      sourceLabel: sourceLabel(String(session.from || 'balance')),
      pricingRuleLabel: pricingRuleLabel(session.pricing_rule),
      rateLabel: `${formatMoney(rate)} ${copy.value.perHourUnit}`,
      remainingLabel: Number(session.seconds_left || 0) > 0 ? formatSeconds(session.seconds_left) : copy.value.noRemaining,
      nextChargeLabel: session.next_charge_at ? formatDateTime(session.next_charge_at) : copy.value.noNextCharge,
    }
  }),
)

const zoneOptions = computed(() => Array.from(new Set(sessionView.value.map((item) => item.zoneLabel))).sort())

const filteredSessions = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return sessionView.value.filter((session) => {
    const matchesZone = zone.value === 'all' ? true : session.zoneLabel === zone.value
    const matchesState = stateFilter.value === 'all'
      ? true
      : stateFilter.value === 'paused'
        ? session.paused
        : !session.paused

    if (!matchesZone || !matchesState) return false
    if (!needle) return true

    return [
      session.pcLabel,
      session.clientLabel,
      session.zoneLabel,
      session.operatorLabel,
      session.pricingRuleLabel,
    ].some((value) => String(value).toLowerCase().includes(needle))
  })
})

const sortedSessions = computed(() => {
  const list = [...filteredSessions.value]
  if (sortBy.value === 'pc') {
    list.sort((left, right) => left.pcLabel.localeCompare(right.pcLabel))
    return list
  }
  if (sortBy.value === 'client') {
    list.sort((left, right) => left.clientLabel.localeCompare(right.clientLabel))
    return list
  }
  if (sortBy.value === 'started') {
    list.sort((left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime())
    return list
  }
  list.sort((left, right) => right.durationMinutes - left.durationMinutes)
  return list
})

const longSessions = computed(() => sortedSessions.value.filter((item) => item.durationMinutes >= 120).slice(0, 6))
const averageMinutes = computed(() => {
  if (!filteredSessions.value.length) return 0
  const total = filteredSessions.value.reduce((sum, item) => sum + item.durationMinutes, 0)
  return Math.round(total / filteredSessions.value.length)
})
const longestMinutes = computed(() => (sortedSessions.value[0] ? sortedSessions.value[0].durationMinutes : 0))
const pausedCount = computed(() => filteredSessions.value.filter((item) => item.paused).length)
const runningCount = computed(() => Math.max(0, filteredSessions.value.length - pausedCount.value))
const topZone = computed(() => {
  const map = new Map<string, number>()
  for (const item of filteredSessions.value) {
    map.set(item.zoneLabel, (map.get(item.zoneLabel) || 0) + 1)
  }
  const first = [...map.entries()].sort((a, b) => b[1] - a[1])[0]
  return { label: first?.[0] || '-', count: first?.[1] || 0 }
})
const refreshedAtLabel = computed(() => (refreshedAt.value ? formatDateTime(refreshedAt.value) : '-'))
const stateFilterLabel = computed(() => {
  if (stateFilter.value === 'paused') return `${copy.value.pausedSessions}: ${copy.value.paused}`
  if (stateFilter.value === 'running') return `${copy.value.activeSessions}: ${copy.value.running}`
  return `${copy.value.activeSessions}: ${copy.value.allStates}`
})

function isActing(id: number) {
  return actingId.value === Number(id)
}

async function reload() {
  loading.value = true
  try {
    const response = await cpApi.activeSessions()
    sessions.value = asArray(response?.data?.data)
    refreshedAt.value = new Date().toISOString()
  } catch (error: any) {
    ElMessage.error(errorMessage(error, copy.value.requestError))
  } finally {
    loading.value = false
  }
}

async function withConfirmation(message: string) {
  try {
    await ElMessageBox.confirm(message, copy.value.confirmTitle, {
      type: 'warning',
      confirmButtonText: copy.value.confirmYes,
      cancelButtonText: copy.value.confirmNo,
    })
    return true
  } catch {
    return false
  }
}

async function pauseSession(session: any) {
  const confirmed = await withConfirmation(txt(copy.value.pauseConfirm, { pc: session.pcLabel }))
  if (!confirmed) return

  actingId.value = Number(session.id)
  try {
    await cpApi.pauseSession(session.id)
    ElMessage.success(copy.value.pausedDone)
    await reload()
  } catch (error: any) {
    ElMessage.error(errorMessage(error, copy.value.requestError))
  } finally {
    actingId.value = null
  }
}

async function resumeSession(session: any) {
  const confirmed = await withConfirmation(txt(copy.value.resumeConfirm, { pc: session.pcLabel }))
  if (!confirmed) return

  actingId.value = Number(session.id)
  try {
    await cpApi.resumeSession(session.id)
    ElMessage.success(copy.value.resumedDone)
    await reload()
  } catch (error: any) {
    ElMessage.error(errorMessage(error, copy.value.requestError))
  } finally {
    actingId.value = null
  }
}

async function stopSession(session: any) {
  const confirmed = await withConfirmation(txt(copy.value.stopConfirm, { pc: session.pcLabel }))
  if (!confirmed) return

  actingId.value = Number(session.id)
  try {
    await cpApi.stopSession(session.id)
    ElMessage.success(copy.value.stopped)
    await reload()
  } catch (error: any) {
    ElMessage.error(errorMessage(error, copy.value.requestError))
  } finally {
    actingId.value = null
  }
}

onMounted(async () => {
  await reload()
  refreshTimer = window.setInterval(reload, 20000)
  tickTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
  if (tickTimer) window.clearInterval(tickTimer)
})
</script>

<style scoped>
.page-shell,
.hero-actions,
.stats-grid {
  display: grid;
  gap: 16px;
}

.hero-actions {
  grid-template-columns: minmax(220px, 1.4fr) 180px 180px 160px 160px;
}

.stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.control,
.primary-btn,
.ghost-btn {
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  padding: 0 14px;
}

.primary-btn,
.ghost-btn.primary {
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 72%, white), color-mix(in srgb, var(--brand) 64%, transparent));
  border-color: color-mix(in srgb, var(--brand-secondary) 24%, var(--stroke));
  color: #08111e;
  font-weight: 800;
}

.ghost-btn {
  font-weight: 700;
}

.ghost-btn.danger {
  border-color: color-mix(in srgb, var(--danger) 28%, var(--stroke));
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
}

.meta-chip {
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  font-size: 12px;
  color: var(--text-muted);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.session-chip {
  min-width: 200px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--stroke));
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.session-chip strong,
.session-chip span,
.session-chip em {
  display: block;
}

.session-chip span,
.session-chip em {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
  font-style: normal;
}

.table {
  display: grid;
  gap: 10px;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.9fr 1.1fr 0.8fr 180px;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.table-head {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

.table-row.paused {
  border-color: color-mix(in srgb, var(--warning) 26%, var(--stroke));
  background: color-mix(in srgb, var(--warning) 6%, var(--surface-soft));
}

.table-row p {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.identity-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.state-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.state-pill.running {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 28%, var(--stroke));
  background: color-mix(in srgb, var(--success) 10%, transparent);
}

.state-pill.paused {
  color: var(--warning);
  border-color: color-mix(in srgb, var(--warning) 28%, var(--stroke));
  background: color-mix(in srgb, var(--warning) 10%, transparent);
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.empty-state {
  padding: 28px;
  border-radius: 18px;
  border: 1px dashed var(--stroke);
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 1280px) {
  .hero-actions,
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .table-head,
  .table-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 780px) {
  .hero-actions,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .table-head {
    display: none;
  }

  .table-row {
    grid-template-columns: 1fr;
  }

  .row-actions {
    justify-content: flex-start;
  }
}
</style>
