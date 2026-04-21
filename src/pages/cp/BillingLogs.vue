<template>
  <div class="billing-page">
    <section class="card-flat panel">
      <div class="head">
        <div>
          <h1>{{ t('billingLogs.title') }}</h1>
          <p>{{ t('billingLogs.subtitle') }}</p>
        </div>
        <button class="btn ghost" :disabled="loading" @click="loadLogs">
          {{ loading ? t('common.refresh') : t('common.refresh') }}
        </button>
      </div>

      <div class="filters">
        <label class="field">
          <span>{{ t('billingLogs.from') }}</span>
          <input v-model="filters.from" type="date" class="input" />
        </label>
        <label class="field">
          <span>{{ t('billingLogs.to') }}</span>
          <input v-model="filters.to" type="date" class="input" />
        </label>
        <label class="field">
          <span>{{ t('billingLogs.mode') }}</span>
          <select v-model="filters.mode" class="input">
            <option value="">{{ t('common.all') }}</option>
            <option value="wallet">{{ t('billingLogs.modeWallet') }}</option>
            <option value="package">{{ t('billingLogs.modePackage') }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('billingLogs.search') }}</span>
          <input v-model.trim="filters.search" class="input" :placeholder="t('billingLogs.searchHint')" />
        </label>
        <button class="btn primary" :disabled="loading" @click="applyFilters">{{ t('billingLogs.apply') }}</button>
      </div>
    </section>

    <section class="card-flat panel chart-panel">
      <div class="chart-head">
        <div>
          <h2>{{ t('billingLogs.chartTitle') }}</h2>
          <p class="muted">{{ t('billingLogs.chartSubtitle', { days: summary.length || 0 }) }}</p>
        </div>
        <div class="chart-meta">
          <div><span>{{ t('billingLogs.chartTotal') }}</span><strong>{{ money(totalAmount) }}</strong></div>
          <div><span>{{ t('billingLogs.chartMinutes') }}</span><strong>{{ totalMinutes }} {{ t('common.minutesShort') }}</strong></div>
        </div>
      </div>

      <div v-if="chartData.points.length" class="chart-wrap">
        <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="line-chart" preserveAspectRatio="none">
          <defs>
            <linearGradient id="billLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#d4af6a" />
              <stop offset="100%" stop-color="#2dd4bf" />
            </linearGradient>
            <linearGradient id="billArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(212,175,106,0.28)" />
              <stop offset="100%" stop-color="rgba(45,212,191,0.02)" />
            </linearGradient>
          </defs>
          <polyline :points="chartData.area" class="area" />
          <polyline :points="chartData.polyline" class="line" />
          <circle v-for="(point, idx) in chartData.points" :key="`pt-${idx}`" :cx="point.x" :cy="point.y" r="3.5" class="dot" />
        </svg>
      </div>
      <div v-else class="empty">{{ t('billingLogs.chartEmpty') }}</div>
    </section>

    <section class="card-flat panel">
      <div v-if="error" class="err">{{ error }}</div>

      <div v-if="rows.length" class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('billingLogs.time') }}</th>
              <th>{{ t('billingLogs.session') }}</th>
              <th>{{ t('billingLogs.client') }}</th>
              <th>{{ t('billingLogs.pc') }}</th>
              <th>{{ t('billingLogs.mode') }}</th>
              <th>{{ t('billingLogs.minutes') }}</th>
              <th>{{ t('billingLogs.amount') }}</th>
              <th>{{ t('billingLogs.wallet') }}</th>
              <th>{{ t('billingLogs.price') }}</th>
              <th>{{ t('billingLogs.reason') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ formatDate(row.created_at) }}</td>
              <td>#{{ row.session_id || '-' }}</td>
              <td>
                <div class="cell-main">{{ row.client_login || '-' }}</div>
                <div class="cell-sub">ID: {{ row.client_id || '-' }}</div>
              </td>
              <td>
                <div class="cell-main">{{ row.pc_code || '-' }}</div>
                <div class="cell-sub">ID: {{ row.pc_id || '-' }}</div>
              </td>
              <td>
                <span class="badge" :class="row.mode">{{ row.mode }}</span>
              </td>
              <td>{{ row.minutes || 0 }} {{ t('common.minutesShort') }}</td>
              <td :class="{ plus: Number(row.amount || 0) > 0 }">
                {{ row.amount ? money(row.amount) : '-' }}
              </td>
              <td>
                <div class="cell-sub">{{ t('billingLogs.balance') }}: {{ money(row.balance_before) }} → {{ money(row.balance_after) }}</div>
                <div class="cell-sub">{{ t('billingLogs.bonus') }}: {{ money(row.bonus_before) }} → {{ money(row.bonus_after) }}</div>
              </td>
              <td>
                <div class="cell-sub">{{ t('billingLogs.perHour') }}: {{ row.price_per_hour ? money(row.price_per_hour) : '-' }}</div>
                <div class="cell-sub">{{ t('billingLogs.perMin') }}: {{ row.price_per_min ? money(row.price_per_min) : '-' }}</div>
              </td>
              <td>{{ row.reason || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">{{ t('billingLogs.empty') }}</div>

      <div class="pager">
        <button class="btn ghost" :disabled="loading || page <= 1" @click="prevPage">{{ t('billingLogs.prev') }}</button>
        <span>{{ t('billingLogs.page') }} {{ page }} / {{ totalPages }}</span>
        <button class="btn ghost" :disabled="loading || page >= totalPages" @click="nextPage">{{ t('billingLogs.next') }}</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { cpApi } from '../../api/cp'
import { useI18n } from '../../i18n'

const { t } = useI18n()

function dateToInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const to = new Date()
const from = new Date()
from.setDate(from.getDate() - 6)

const filters = reactive({
  from: dateToInput(from),
  to: dateToInput(to),
  mode: '',
  search: '',
})

const rows = ref([])
const summary = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const perPage = ref(50)
const total = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const totalAmount = computed(() => summary.value.reduce((acc, row) => acc + Number(row.amount_sum || 0), 0))
const totalMinutes = computed(() => summary.value.reduce((acc, row) => acc + Number(row.minutes_sum || 0), 0))

const chartWidth = 760
const chartHeight = 220
const chartPad = 22
const chartMax = computed(() => {
  const vals = summary.value.map((r) => Number(r.amount_sum || 0))
  return Math.max(1, ...vals)
})
const chartData = computed(() => {
  const list = summary.value || []
  if (!list.length) return { points: [], polyline: '', area: '' }
  const max = chartMax.value
  const n = list.length
  const freeWidth = chartWidth - chartPad * 2
  const freeHeight = chartHeight - chartPad * 2
  const points = list.map((row, idx) => {
    const x = chartPad + (n === 1 ? 0 : (idx / (n - 1)) * freeWidth)
    const val = Number(row.amount_sum || 0)
    const y = chartHeight - chartPad - (val / max) * freeHeight
    return { x, y }
  })
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${chartPad},${chartHeight - chartPad} ${polyline} ${chartPad + freeWidth},${chartHeight - chartPad}`
  return { points, polyline, area }
})

function money(v) {
  const n = Number(v || 0)
  if (!Number.isFinite(n)) return '-'
  return new Intl.NumberFormat('en-US').format(Math.round(n)) + ' UZS'
}

function formatDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString()
}

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      from: filters.from,
      to: filters.to,
      mode: filters.mode || undefined,
      search: filters.search || undefined,
      page: page.value,
      per_page: perPage.value,
    }
    const summaryParams = {
      from: filters.from,
      to: filters.to,
      mode: filters.mode || undefined,
      search: filters.search || undefined,
      summary: 1,
    }
    const [listRes, summaryRes] = await Promise.all([
      cpApi.billingLogs(params),
      cpApi.billingLogs(summaryParams),
    ])
    rows.value = listRes?.data?.data || []
    total.value = Number(listRes?.data?.total || listRes?.data?.meta?.total || 0)
    summary.value = summaryRes?.data?.data || []
  } catch (e) {
    rows.value = []
    total.value = 0
    summary.value = []
    error.value = e?.response?.data?.message || 'Billing loglar yuklanmadi'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  loadLogs()
}

function prevPage() {
  if (page.value <= 1) return
  page.value -= 1
  loadLogs()
}

function nextPage() {
  if (page.value >= totalPages.value) return
  page.value += 1
  loadLogs()
}

onMounted(loadLogs)
</script>

<style scoped>
.billing-page {
  display: grid;
  gap: 12px;
}

.panel {
  padding: 14px;
}

.chart-panel h2 {
  margin: 0;
  font-size: 18px;
}

.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chart-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  opacity: 0.85;
}

.chart-meta strong {
  display: block;
  font-size: 14px;
}

.chart-wrap {
  margin-top: 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: rgba(2, 6, 23, 0.35);
  overflow: hidden;
  padding: 10px;
}

.line-chart {
  width: 100%;
  height: 240px;
}

.line-chart .area {
  fill: url(#billArea);
  stroke: none;
}

.line-chart .line {
  fill: none;
  stroke: url(#billLine);
  stroke-width: 2.5;
}

.line-chart .dot {
  fill: rgba(212, 175, 106, 0.9);
  stroke: rgba(255, 255, 255, 0.6);
  stroke-width: 1;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.head h1 {
  margin: 0;
  font-size: 22px;
}

.head p {
  margin: 6px 0 0;
  opacity: 0.72;
  font-size: 12px;
}

.filters {
  margin-top: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  align-items: end;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 12px;
  opacity: 0.75;
}

.input {
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(2, 6, 23, 0.35);
  color: var(--text);
  padding: 0 10px;
}

.table-wrap {
  overflow: auto;
  border-radius: 12px;
  border: 1px solid var(--stroke);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.table th,
.table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--stroke);
  text-align: left;
  vertical-align: top;
}

.table th {
  font-weight: 700;
  opacity: 0.75;
  background: rgba(2, 6, 23, 0.35);
}

.cell-main {
  font-weight: 700;
}

.cell-sub {
  opacity: 0.7;
  margin-top: 2px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.15);
  font-size: 11px;
  text-transform: uppercase;
}

.badge.package {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.15);
}

.plus {
  color: rgba(34, 197, 94, 0.9);
  font-weight: 700;
}

.empty {
  padding: 16px;
  opacity: 0.7;
}

.pager {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(2, 6, 23, 0.35);
  color: var(--text);
  cursor: pointer;
}

.btn.primary {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.18);
}

.btn.ghost {
  background: rgba(2, 6, 23, 0.35);
}

.err {
  font-size: 12px;
  color: rgba(248, 113, 113, 0.95);
  margin-bottom: 10px;
}

@media (max-width: 1100px) {
  .filters {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }
}
</style>
