<template>
  <div class="billing-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="hero-meta-badge">{{ copy.updatedAt }}: {{ refreshedAtLabel }}</span>
        <span class="hero-meta-badge">{{ filters.from }} - {{ filters.to }}</span>
      </template>

      <template #actions>
        <div class="hero-actions">
          <button class="hero-btn" :disabled="loading" @click="loadLogs(page)">
            {{ loading ? copy.refreshing : copy.refresh }}
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard compact tone="tone-green" :label="copy.totalAmount" :value="money(totalAmount)" :hint="`${copy.page}: ${page}/${totalPages}`" />
      <CpStatCard compact tone="tone-blue" :label="copy.totalMinutes" :value="`${totalMinutes} ${copy.minutesShort}`" :hint="`${copy.rows}: ${rows.length}`" />
      <CpStatCard compact tone="tone-amber" :label="copy.walletAmount" :value="money(walletAmount)" :hint="`${walletCount} ${copy.rows}`" />
      <CpStatCard compact tone="tone-rose" :label="copy.packageAmount" :value="money(packageAmount)" :hint="`${packageCount} ${copy.rows}`" />
    </div>

    <CpPanelCard :title="copy.filtersTitle" :subtitle="copy.filtersSubtitle">
      <div class="filter-grid">
        <label class="field-card">
          <span>{{ copy.from }}</span>
          <div class="field-shell">
            <Icon name="lucide:calendar-days" size="16" />
            <input v-model="filters.from" type="date" />
          </div>
        </label>

        <label class="field-card">
          <span>{{ copy.to }}</span>
          <div class="field-shell">
            <Icon name="lucide:calendar-days" size="16" />
            <input v-model="filters.to" type="date" />
          </div>
        </label>

        <label class="field-card">
          <span>{{ copy.mode }}</span>
          <div class="field-shell">
            <Icon name="lucide:wallet-cards" size="16" />
            <select v-model="filters.mode">
              <option value="">{{ copy.allModes }}</option>
              <option value="wallet">{{ copy.modeWallet }}</option>
              <option value="package">{{ copy.modePackage }}</option>
            </select>
          </div>
        </label>

        <label class="field-card search-card">
          <span>{{ copy.search }}</span>
          <div class="field-shell">
            <Icon name="lucide:search" size="16" />
            <input
              v-model.trim="filters.search"
              type="text"
              :placeholder="copy.searchPlaceholder"
              @keydown.enter.prevent="applyFilters"
            />
          </div>
        </label>

        <div class="filter-actions">
          <button class="action-btn ghost" :disabled="loading" @click="resetFilters">{{ copy.reset }}</button>
          <button class="action-btn primary" :disabled="loading" @click="applyFilters">{{ copy.apply }}</button>
        </div>
      </div>
    </CpPanelCard>

    <CpPanelCard :title="copy.chartTitle" :subtitle="chartSubtitle">
      <div class="chart-head">
        <div class="chart-meta-card">
          <span>{{ copy.chartTotal }}</span>
          <strong>{{ money(totalAmount) }}</strong>
        </div>
        <div class="chart-meta-card">
          <span>{{ copy.chartMinutes }}</span>
          <strong>{{ totalMinutes }} {{ copy.minutesShort }}</strong>
        </div>
      </div>

      <div v-if="summary.length" class="chart-stack">
        <CpReportChart type="line" :data="chartData" :options="chartOptions" />

        <div class="summary-strip">
          <article v-for="item in summary.slice(-6)" :key="item.key" class="summary-card">
            <span>{{ item.label }}</span>
            <strong>{{ money(item.amount) }}</strong>
            <small>{{ int(item.minutes) }} {{ copy.minutesShort }}</small>
          </article>
        </div>
      </div>

      <div v-else class="empty-state">{{ copy.noChart }}</div>
    </CpPanelCard>

    <CpPanelCard :title="copy.listTitle" :subtitle="copy.listSubtitle">
      <div v-if="error" class="error-state">
        <Icon name="lucide:triangle-alert" size="16" />
        <span>{{ error }}</span>
      </div>

      <div v-if="loading" class="ledger-list">
        <div v-for="item in 6" :key="item" class="ledger-card skeleton-card"></div>
      </div>

      <div v-else-if="!rows.length" class="empty-state">{{ copy.noData }}</div>

      <div v-else class="ledger-list">
        <article v-for="row in rows" :key="row.id" class="ledger-card">
          <div class="ledger-top">
            <div class="ledger-main">
              <strong>{{ clientLabel(row) }}</strong>
              <span class="session-chip">#{{ row.session_id || '-' }}</span>
            </div>
            <div class="ledger-side">
              <span class="mode-chip" :class="row.mode">{{ modeLabel(row.mode) }}</span>
              <strong class="amount-value">{{ money(row.amount) }}</strong>
            </div>
          </div>

          <div class="ledger-grid">
            <div class="ledger-cell">
              <span>{{ copy.time }}</span>
              <strong>{{ formatDateTime(row.created_at) }}</strong>
              <small>{{ copy.pc }}: {{ row.pc_code || '-' }}</small>
            </div>

            <div class="ledger-cell">
              <span>{{ copy.minutes }}</span>
              <strong>{{ int(row.minutes) }} {{ copy.minutesShort }}</strong>
              <small>{{ copy.reason }}: {{ row.reason || '-' }}</small>
            </div>

            <div class="ledger-cell">
              <span>{{ copy.balanceFlow }}</span>
              <strong>{{ money(row.balance_before) }} → {{ money(row.balance_after) }}</strong>
              <small>{{ copy.bonusFlow }}: {{ money(row.bonus_before) }} → {{ money(row.bonus_after) }}</small>
            </div>

            <div class="ledger-cell">
              <span>{{ copy.tariff }}</span>
              <strong>{{ copy.perHour }}: {{ priceLabel(row.price_per_hour) }}</strong>
              <small>{{ copy.perMinute }}: {{ priceLabel(row.price_per_min) }}</small>
            </div>
          </div>
        </article>
      </div>

      <div class="pager">
        <button class="pager-btn" :disabled="loading || page <= 1" @click="loadLogs(page - 1)">{{ copy.prev }}</button>
        <span class="pager-chip">{{ copy.page }} {{ page }}/{{ totalPages }}</span>
        <button class="pager-btn" :disabled="loading || page >= totalPages" @click="loadLogs(page + 1)">{{ copy.next }}</button>
      </div>
    </CpPanelCard>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'

definePageMeta({
  layout: 'cp',
})

const billingLogsCopy = {
  uz: {
    eyebrow: 'Billing audit',
    title: 'Billing loglar',
    subtitle: 'Sessiya bo‘yicha minutlar, yechimlar va balans oqimini kuzating.',
    updatedAt: 'Yangilandi',
    refresh: 'Yangilash',
    refreshing: 'Yuklanmoqda...',
    totalAmount: 'Jami yechilgan',
    totalMinutes: 'Jami minut',
    walletAmount: 'Wallet mode',
    packageAmount: 'Package mode',
    rows: 'yozuv',
    filtersTitle: 'Filtrlar',
    filtersSubtitle: 'Davr, manba va qidiruv bo‘yicha billing oqimini toraytiring.',
    from: 'Dan',
    to: 'Gacha',
    mode: 'Manba',
    allModes: 'Barchasi',
    modeWallet: 'Wallet',
    modePackage: 'Package',
    search: 'Qidiruv',
    searchPlaceholder: 'login / PC / session...',
    reset: 'Tozalash',
    apply: "Qo'llash",
    chartTitle: 'Kunlik trend',
    chartTotal: 'Jami yechim',
    chartMinutes: 'Jami minut',
    noChart: 'Chart uchun maʼlumot topilmadi.',
    listTitle: 'Billing lenta',
    listSubtitle: 'Har bir billing tick, wallet va package yechimlari.',
    noData: 'Billing log topilmadi.',
    page: 'Sahifa',
    minutesShort: 'min',
    time: 'Vaqt',
    pc: 'PC',
    minutes: 'Minut',
    reason: 'Sabab',
    balanceFlow: 'Balans oqimi',
    bonusFlow: 'Bonus oqimi',
    tariff: 'Tarif',
    perHour: 'Soat',
    perMinute: 'Minut',
  },
  ru: {
    eyebrow: 'Billing audit',
    title: 'Биллинг логи',
    subtitle: 'Следите за списаниями минут, wallet и package-потоком по сессиям.',
    updatedAt: 'Обновлено',
    refresh: 'Обновить',
    refreshing: 'Загрузка...',
    totalAmount: 'Итого списано',
    totalMinutes: 'Всего минут',
    walletAmount: 'Режим wallet',
    packageAmount: 'Режим package',
    rows: 'записей',
    filtersTitle: 'Фильтры',
    filtersSubtitle: 'Сузьте биллинг по датам, источнику и поиску.',
    from: 'От',
    to: 'До',
    mode: 'Источник',
    allModes: 'Все',
    modeWallet: 'Wallet',
    modePackage: 'Package',
    search: 'Поиск',
    searchPlaceholder: 'логин / ПК / сессия...',
    reset: 'Сбросить',
    apply: 'Применить',
    chartTitle: 'Дневной тренд списаний',
    chartTotal: 'Итого списано',
    chartMinutes: 'Всего минут',
    noChart: 'Нет данных для графика.',
    listTitle: 'Лента биллинга',
    listSubtitle: 'Каждый billing tick, wallet и package-списание.',
    noData: 'Биллинг-логи не найдены.',
    page: 'Страница',
    minutesShort: 'мин',
    time: 'Время',
    pc: 'ПК',
    minutes: 'Минуты',
    reason: 'Причина',
    balanceFlow: 'Баланс',
    bonusFlow: 'Бонус',
    tariff: 'Тариф',
    perHour: 'Час',
    perMinute: 'Минута',
  },
  en: {
    eyebrow: 'Billing audit',
    title: 'Billing logs',
    subtitle: 'Track minute debits, wallet usage, and package flow per session.',
    updatedAt: 'Updated',
    refresh: 'Refresh',
    refreshing: 'Loading...',
    totalAmount: 'Total debited',
    totalMinutes: 'Total minutes',
    walletAmount: 'Wallet mode',
    packageAmount: 'Package mode',
    rows: 'rows',
    filtersTitle: 'Filters',
    filtersSubtitle: 'Narrow billing by date, source, and search.',
    from: 'From',
    to: 'To',
    mode: 'Source',
    allModes: 'All',
    modeWallet: 'Wallet',
    modePackage: 'Package',
    search: 'Search',
    searchPlaceholder: 'login / PC / session...',
    reset: 'Reset',
    apply: 'Apply',
    chartTitle: 'Daily billing trend',
    chartTotal: 'Total charged',
    chartMinutes: 'Total minutes',
    noChart: 'No chart data found.',
    listTitle: 'Billing stream',
    listSubtitle: 'Each billing tick, wallet and package write-off.',
    noData: 'No billing logs found.',
    page: 'Page',
    minutesShort: 'min',
    time: 'Time',
    pc: 'PC',
    minutes: 'Minutes',
    reason: 'Reason',
    balanceFlow: 'Balance flow',
    bonusFlow: 'Bonus flow',
    tariff: 'Tariff',
    perHour: 'Per hour',
    perMinute: 'Per minute',
  },
}

const copy = useCpCopy(billingLogsCopy)
const { formatMoney, formatDateTime } = useCpFormatters()

useHead({
  title: computed(() => `${copy.value.title} - NEXORA CLOUD CP`),
})

function dateToInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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

const rows = ref<any[]>([])
const summary = ref<any[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const refreshedAt = ref<string | null>(null)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const normalizedSummary = computed(() =>
  summary.value.map((item: any) => ({
    key: item.date || item.day || item.label || String(item.id || Math.random()),
    label: item.date || item.day || item.label || '-',
    amount: Number(item.amount_sum || item.amount || 0),
    minutes: Number(item.minutes_sum || item.minutes || 0),
  })),
)

const totalAmount = computed(() => normalizedSummary.value.reduce((acc, item) => acc + item.amount, 0))
const totalMinutes = computed(() => normalizedSummary.value.reduce((acc, item) => acc + item.minutes, 0))
const walletRows = computed(() => rows.value.filter((row) => String(row.mode || '').toLowerCase() === 'wallet'))
const packageRows = computed(() => rows.value.filter((row) => String(row.mode || '').toLowerCase() === 'package'))
const walletAmount = computed(() => walletRows.value.reduce((acc, row) => acc + Number(row.amount || 0), 0))
const packageAmount = computed(() => packageRows.value.reduce((acc, row) => acc + Number(row.amount || 0), 0))
const walletCount = computed(() => walletRows.value.length)
const packageCount = computed(() => packageRows.value.length)
const chartSubtitle = computed(() => `Summary ${normalizedSummary.value.length} ${copy.value.rows}`)
const refreshedAtLabel = computed(() => (refreshedAt.value ? formatDateTime(refreshedAt.value) : '-'))

function int(value: any) {
  return Math.round(Number(value || 0))
}

function money(value: any) {
  return `${formatMoney(Number(value || 0))} UZS`
}

function modeLabel(mode: string) {
  if (String(mode).toLowerCase() === 'wallet') return copy.value.modeWallet
  if (String(mode).toLowerCase() === 'package') return copy.value.modePackage
  return mode || copy.value.allModes
}

function clientLabel(row: any) {
  return row.client_login || `#${row.client_id || '-'}`
}

function priceLabel(value: any) {
  if (!value) return '-'
  return `${formatMoney(Number(value || 0))} UZS`
}

const chartData = computed(() => ({
  labels: normalizedSummary.value.map((item) => item.label),
  datasets: [
    {
      label: copy.value.chartTotal,
      data: normalizedSummary.value.map((item) => item.amount),
      borderColor: '#d4af6a',
      backgroundColor: 'rgba(212, 175, 106, 0.14)',
      fill: true,
      tension: 0.35,
      yAxisID: 'y',
      pointRadius: 4,
      pointHoverRadius: 5,
    },
    {
      label: copy.value.chartMinutes,
      data: normalizedSummary.value.map((item) => item.minutes),
      borderColor: '#2dd4bf',
      backgroundColor: 'rgba(45, 212, 191, 0.12)',
      fill: false,
      tension: 0.35,
      yAxisID: 'y1',
      pointRadius: 3,
      pointHoverRadius: 4,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: {
        color: '#8ea0bc',
        usePointStyle: true,
        boxWidth: 8,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#8ea0bc' },
      grid: { color: 'rgba(142, 160, 188, 0.12)' },
    },
    y: {
      position: 'left',
      ticks: {
        color: '#8ea0bc',
        callback: (value: any) => formatMoney(value),
      },
      grid: { color: 'rgba(142, 160, 188, 0.12)' },
    },
    y1: {
      position: 'right',
      ticks: { color: '#8ea0bc' },
      grid: { display: false },
    },
  },
}))

async function loadLogs(nextPage = 1) {
  loading.value = true
  error.value = ''
  try {
    const params = {
      from: filters.from || undefined,
      to: filters.to || undefined,
      mode: filters.mode || undefined,
      search: filters.search || undefined,
      page: nextPage,
      per_page: perPage.value,
    }
    const summaryParams = {
      from: filters.from || undefined,
      to: filters.to || undefined,
      mode: filters.mode || undefined,
      search: filters.search || undefined,
      summary: 1,
    }

    const [listRes, summaryRes] = await Promise.all([
      cpApi.billingLogs(params),
      cpApi.billingLogs(summaryParams),
    ])

    const listPayload = listRes?.data?.data ?? listRes?.data ?? {}
    const summaryPayload = summaryRes?.data?.data ?? summaryRes?.data ?? {}
    const list = Array.isArray(listPayload?.data) ? listPayload.data : Array.isArray(listPayload) ? listPayload : []
    const summaryList = Array.isArray(summaryPayload?.data) ? summaryPayload.data : Array.isArray(summaryPayload) ? summaryPayload : []

    rows.value = list
    summary.value = summaryList
    total.value = Number(listPayload?.total ?? listPayload?.meta?.total ?? list.length)
    page.value = nextPage
    refreshedAt.value = new Date().toISOString()
  } catch (err: any) {
    rows.value = []
    summary.value = []
    total.value = 0
    error.value = err?.response?.data?.message || 'Billing logs loading error'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  loadLogs(1)
}

function resetFilters() {
  filters.from = dateToInput(from)
  filters.to = dateToInput(to)
  filters.mode = ''
  filters.search = ''
  applyFilters()
}

loadLogs(1)
</script>

<style scoped>
.billing-page,
.stats-grid,
.filter-grid,
.ledger-list,
.chart-stack {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-grid {
  grid-template-columns: 180px 180px 180px minmax(260px, 1fr) auto;
  align-items: end;
  gap: 12px;
}

.field-card {
  display: grid;
  gap: 7px;
}

.field-card > span {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.field-shell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
}

.field-shell input,
.field-shell select {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 13px;
}

.search-card {
  min-width: 0;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-btn,
.pager-btn {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.action-btn.primary {
  border-color: rgba(79, 140, 255, 0.35);
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.14), rgba(79, 209, 197, 0.12));
}

.chart-head {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 6px;
}

.chart-meta-card {
  display: grid;
  gap: 5px;
  min-width: 150px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.chart-meta-card span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.chart-meta-card strong {
  font-size: 16px;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.summary-card {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.summary-card span,
.ledger-cell span {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.summary-card strong {
  font-size: 15px;
}

.summary-card small,
.ledger-cell small {
  font-size: 12px;
  color: var(--text-muted);
}

.error-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(251, 113, 133, 0.25);
  background: rgba(251, 113, 133, 0.08);
  color: var(--danger);
  margin-bottom: 14px;
}

.ledger-list {
  gap: 12px;
}

.ledger-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.ledger-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.ledger-main,
.ledger-side {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ledger-main strong {
  font-size: 17px;
}

.session-chip,
.mode-chip,
.pager-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  font-size: 11px;
  font-weight: 700;
}

.mode-chip.wallet {
  color: var(--brand-secondary);
  border-color: rgba(79, 140, 255, 0.28);
}

.mode-chip.package {
  color: var(--accent);
  border-color: rgba(245, 158, 11, 0.28);
}

.amount-value {
  font-size: 18px;
  color: var(--success);
}

.ledger-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.ledger-cell {
  display: grid;
  gap: 6px;
  min-height: 96px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface);
}

.ledger-cell strong {
  font-size: 14px;
  line-height: 1.4;
}

.skeleton-card {
  min-height: 176px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent),
    var(--surface-soft);
  background-size: 220px 100%, auto;
  animation: shimmer 1.2s linear infinite;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
}

.empty-state {
  padding: 32px 18px;
  border-radius: 18px;
  border: 1px dashed var(--stroke);
  text-align: center;
  color: var(--text-muted);
}

@keyframes shimmer {
  from { background-position: -220px 0, 0 0; }
  to { background-position: calc(100% + 220px) 0, 0 0; }
}

@media (max-width: 1200px) {
  .stats-grid,
  .filter-grid,
  .ledger-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .stats-grid,
  .filter-grid,
  .ledger-grid,
  .summary-strip {
    grid-template-columns: 1fr;
  }

  .ledger-top,
  .chart-head,
  .pager {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
