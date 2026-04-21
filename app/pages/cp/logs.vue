<template>
  <div class="logs-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="hero-meta-badge">{{ copy.updatedAt }}: {{ refreshedAtLabel }}</span>
        <span class="hero-meta-badge">{{ copy.page }} {{ page }}/{{ lastPage }}</span>
      </template>

      <template #actions>
        <div class="hero-actions">
          <button class="hero-btn" :disabled="loading" @click="load(page)">
            {{ loading ? copy.refreshing : copy.refresh }}
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard compact tone="tone-blue" :label="copy.totalRows" :value="String(total)" :hint="`${copy.count}: ${rows.length}`" />
      <CpStatCard compact tone="tone-green" :label="copy.sessionLogs" :value="String(sessionCount)" :hint="copy.sessionHint" />
      <CpStatCard compact tone="tone-amber" :label="copy.commandLogs" :value="String(commandCount)" :hint="copy.commandHint" />
      <CpStatCard compact tone="tone-rose" :label="copy.amountFlow" :value="money(totalAmount)" :hint="copy.amountHint" />
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
          <span>{{ copy.type }}</span>
          <div class="field-shell">
            <Icon name="lucide:rows-3" size="16" />
            <select v-model="filters.type">
              <option value="">{{ copy.allTypes }}</option>
              <option v-for="item in typeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
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

    <CpPanelCard :title="copy.listTitle" :subtitle="copy.listSubtitle">
      <div v-if="error" class="error-state">
        <Icon name="lucide:triangle-alert" size="16" />
        <span>{{ error }}</span>
      </div>

      <div v-if="loading" class="logs-list">
        <div v-for="item in 6" :key="item" class="log-card skeleton-card"></div>
      </div>

      <div v-else-if="!rows.length" class="empty-state">{{ copy.noData }}</div>

      <div v-else class="logs-list">
        <article v-for="row in rows" :key="row.id" class="log-card">
          <div class="log-top">
            <div class="log-top-left">
              <span class="type-chip" :class="typeToneClass(row.type)">{{ row.type || copy.unknownType }}</span>
              <strong class="action-title">{{ actionLabel(row) }}</strong>
            </div>

            <div class="log-top-right">
              <span class="status-chip" :class="statusToneClass(row.status)">{{ row.status || copy.noStatus }}</span>
              <span class="time-chip">{{ formatDateTime(row.happened_at) }}</span>
            </div>
          </div>

          <div class="log-grid">
            <div class="log-cell">
              <span>{{ copy.subject }}</span>
              <strong>{{ subjectLabel(row) }}</strong>
              <small>{{ actorLabel(row) }}</small>
            </div>

            <div class="log-cell">
              <span>{{ copy.note }}</span>
              <strong>{{ noteLabel(row) }}</strong>
              <small>{{ copy.id }}: #{{ row.id || '-' }}</small>
            </div>

            <div class="log-cell amount-cell">
              <span>{{ copy.amount }}</span>
              <strong>{{ amountLabel(row) }}</strong>
              <small>{{ copy.zone }}: {{ zoneLabel(row) }}</small>
            </div>
          </div>
        </article>
      </div>

      <div class="pager">
        <button class="pager-btn" :disabled="page <= 1 || loading" @click="load(page - 1)">{{ copy.prev }}</button>
        <div class="pager-chip">{{ copy.page }} {{ page }}/{{ lastPage }}</div>
        <button class="pager-btn" :disabled="page >= lastPage || loading" @click="load(page + 1)">{{ copy.next }}</button>
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
  roles: ['admin', 'owner'],
})

const logsCopy = {
  uz: {
    eyebrow: 'Audit trail',
    title: 'Loglar',
    subtitle: "Sessiya, tranzaksiya, qaytarish va PC buyruqlarini bitta audit lentada ko'ring.",
    updatedAt: 'Yangilandi',
    refresh: 'Yangilash',
    refreshing: 'Yuklanmoqda...',
    totalRows: 'Jami yozuvlar',
    sessionLogs: 'Sessiya loglari',
    sessionHint: 'Boshlanish va tugash oqimi',
    commandLogs: 'Buyruq loglari',
    commandHint: 'PC command holati',
    amountFlow: 'Summali loglar',
    amountHint: 'Topup, return, transfer oqimi',
    filtersTitle: 'Filtrlar',
    filtersSubtitle: "Davr, tur va qidiruv bo'yicha lentani toraytiring.",
    from: 'Dan',
    to: 'Gacha',
    type: 'Turi',
    allTypes: 'Barchasi',
    search: 'Qidiruv',
    searchPlaceholder: 'operator / mijoz / PC...',
    reset: 'Tozalash',
    apply: "Qo'llash",
    listTitle: 'Audit lenta',
    listSubtitle: 'Eng yangi yozuvlar tepada chiqadi.',
    noData: "Log topilmadi.",
    unknownType: 'log',
    noStatus: 'status yo‘q',
    subject: 'Subyekt',
    note: 'Izoh',
    amount: 'Summa',
    zone: 'Zona',
    id: 'ID',
    noZone: "Yo'q",
    noAmount: "Yo'q",
    noNote: "Izoh yo'q",
    unknownClient: 'Mijoz topilmadi',
    unknownOperator: 'Operator topilmadi',
    unknownSubject: 'Subyekt topilmadi',
    prev: 'Oldingi',
    next: 'Keyingi',
    page: 'Sahifa',
    count: 'Ko‘rinmoqda',
    types: {
      session: 'Sessiya',
      transaction: 'Tranzaksiya',
      return: 'Qaytarish',
      transfer: "O‘tkazma",
      pc_command: 'PC command',
    },
  },
  ru: {
    eyebrow: 'Audit trail',
    title: 'Логи',
    subtitle: 'Следите за сессиями, транзакциями, возвратами и командами ПК в одной ленте.',
    updatedAt: 'Обновлено',
    refresh: 'Обновить',
    refreshing: 'Загрузка...',
    totalRows: 'Всего записей',
    sessionLogs: 'Логи сессий',
    sessionHint: 'Старт и завершение',
    commandLogs: 'Команды ПК',
    commandHint: 'Статусы команд',
    amountFlow: 'Суммовые записи',
    amountHint: 'Topup, возвраты и переводы',
    filtersTitle: 'Фильтры',
    filtersSubtitle: 'Сузьте ленту по датам, типу и поиску.',
    from: 'От',
    to: 'До',
    type: 'Тип',
    allTypes: 'Все',
    search: 'Поиск',
    searchPlaceholder: 'оператор / клиент / ПК...',
    reset: 'Сбросить',
    apply: 'Применить',
    listTitle: 'Лента аудита',
    listSubtitle: 'Свежие события идут сверху.',
    noData: 'Логи не найдены.',
    unknownType: 'log',
    noStatus: 'без статуса',
    subject: 'Субъект',
    note: 'Комментарий',
    amount: 'Сумма',
    zone: 'Зона',
    id: 'ID',
    noZone: 'Нет',
    noAmount: 'Нет',
    noNote: 'Комментарий отсутствует',
    unknownClient: 'Клиент не найден',
    unknownOperator: 'Оператор не найден',
    unknownSubject: 'Субъект не найден',
    prev: 'Назад',
    next: 'Далее',
    page: 'Страница',
    count: 'Видимо',
    types: {
      session: 'Сессия',
      transaction: 'Транзакция',
      return: 'Возврат',
      transfer: 'Перевод',
      pc_command: 'Команда ПК',
    },
  },
  en: {
    eyebrow: 'Audit trail',
    title: 'Logs',
    subtitle: 'Track sessions, transactions, returns, and PC commands in one audit stream.',
    updatedAt: 'Updated',
    refresh: 'Refresh',
    refreshing: 'Loading...',
    totalRows: 'Total rows',
    sessionLogs: 'Session logs',
    sessionHint: 'Start and end flow',
    commandLogs: 'PC commands',
    commandHint: 'Command statuses',
    amountFlow: 'Amount logs',
    amountHint: 'Topup, returns, and transfers',
    filtersTitle: 'Filters',
    filtersSubtitle: 'Narrow the stream by date, type, and search.',
    from: 'From',
    to: 'To',
    type: 'Type',
    allTypes: 'All',
    search: 'Search',
    searchPlaceholder: 'operator / client / PC...',
    reset: 'Reset',
    apply: 'Apply',
    listTitle: 'Audit stream',
    listSubtitle: 'Newest records appear first.',
    noData: 'No logs found.',
    unknownType: 'log',
    noStatus: 'no status',
    subject: 'Subject',
    note: 'Note',
    amount: 'Amount',
    zone: 'Zone',
    id: 'ID',
    noZone: 'None',
    noAmount: 'None',
    noNote: 'No note',
    unknownClient: 'Unknown client',
    unknownOperator: 'Unknown operator',
    unknownSubject: 'Unknown subject',
    prev: 'Prev',
    next: 'Next',
    page: 'Page',
    count: 'Visible',
    types: {
      session: 'Session',
      transaction: 'Transaction',
      return: 'Return',
      transfer: 'Transfer',
      pc_command: 'PC command',
    },
  },
}

const copy = useCpCopy(logsCopy)
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
  type: '',
  search: '',
})

const loading = ref(false)
const error = ref('')
const rows = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const lastPage = ref(1)
const refreshedAt = ref<string | null>(null)

const typeOptions = computed(() => [
  { value: 'session', label: copy.value.types.session },
  { value: 'transaction', label: copy.value.types.transaction },
  { value: 'return', label: copy.value.types.return },
  { value: 'transfer', label: copy.value.types.transfer },
  { value: 'pc_command', label: copy.value.types.pc_command },
])

const refreshedAtLabel = computed(() => (refreshedAt.value ? formatDateTime(refreshedAt.value) : '-'))
const sessionCount = computed(() => rows.value.filter((row) => row.type === 'session').length)
const commandCount = computed(() => rows.value.filter((row) => row.type === 'pc_command').length)
const totalAmount = computed(() => rows.value.reduce((sum, row) => sum + Number(row.amount || 0), 0))

function money(value: number | string | null | undefined) {
  return formatMoney(Number(value || 0))
}

function actionLabel(row: any) {
  return row?.action || row?.type || copy.value.unknownType
}

function subjectLabel(row: any) {
  if (row?.pc?.code) return `PC: ${row.pc.code}`
  if (row?.client?.label) return `Client: ${row.client.label}`
  if (row?.client?.login) return `Client: ${row.client.login}`
  if (row?.client?.phone) return `Client: ${row.client.phone}`
  return copy.value.unknownSubject
}

function actorLabel(row: any) {
  if (row?.operator?.name) return `Operator: ${row.operator.name}`
  if (row?.operator?.login) return `Operator: ${row.operator.login}`
  return `Operator: ${copy.value.unknownOperator}`
}

function noteLabel(row: any) {
  if (!row?.note) return copy.value.noNote
  if (row.type === 'transfer') return `To: ${row.note}`
  return String(row.note)
}

function amountLabel(row: any) {
  if (row?.amount == null) return copy.value.noAmount
  return `${money(row.amount)} UZS`
}

function zoneLabel(row: any) {
  return row?.pc?.zone?.name || row?.zone?.name || copy.value.noZone
}

function typeToneClass(type: string) {
  if (type === 'session') return 'tone-blue'
  if (type === 'pc_command') return 'tone-amber'
  if (type === 'return') return 'tone-rose'
  if (type === 'transfer') return 'tone-green'
  return 'tone-neutral'
}

function statusToneClass(status: string) {
  const value = String(status || '').toLowerCase()
  if (['failed', 'error', 'rejected'].includes(value)) return 'status-danger'
  if (['pending', 'sent'].includes(value)) return 'status-warn'
  if (['finished', 'done', 'ok', 'completed'].includes(value)) return 'status-success'
  return 'status-muted'
}

async function load(nextPage = 1) {
  loading.value = true
  error.value = ''

  try {
    const response = await cpApi.logsList({
      from: filters.from || undefined,
      to: filters.to || undefined,
      type: filters.type || undefined,
      search: filters.search || undefined,
      page: nextPage,
      per_page: perPage.value,
    })

    const payload = response?.data?.data ?? response?.data ?? {}
    const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
    rows.value = list
    total.value = Number(payload?.meta?.total ?? payload?.total ?? list.length)
    page.value = Number(payload?.meta?.current_page ?? payload?.current_page ?? nextPage)
    lastPage.value = Math.max(1, Number(payload?.meta?.last_page ?? payload?.last_page ?? 1))
    refreshedAt.value = new Date().toISOString()
  } catch (err: any) {
    rows.value = []
    total.value = 0
    lastPage.value = 1
    error.value = err?.response?.data?.message || 'Logs loading error'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  load(1)
}

function resetFilters() {
  filters.from = dateToInput(from)
  filters.to = dateToInput(to)
  filters.type = ''
  filters.search = ''
  applyFilters()
}

load(1)
</script>

<style scoped>
.logs-page,
.stats-grid,
.filter-grid,
.logs-list {
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
  grid-template-columns: 180px 180px 190px minmax(260px, 1fr) auto;
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
  transition: 160ms ease;
}

.action-btn.primary {
  border-color: rgba(79, 140, 255, 0.35);
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.14), rgba(79, 209, 197, 0.12));
}

.action-btn.ghost:hover,
.pager-btn:hover {
  border-color: var(--stroke-strong);
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

.logs-list {
  gap: 12px;
}

.log-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  box-shadow: var(--shadow-panel);
}

.log-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.log-top-left,
.log-top-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.type-chip,
.status-chip,
.time-chip,
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

.type-chip {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.action-title {
  font-size: 16px;
  line-height: 1.2;
}

.log-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.log-cell {
  display: grid;
  gap: 6px;
  min-height: 96px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface);
}

.log-cell > span {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.log-cell strong {
  font-size: 15px;
  line-height: 1.35;
}

.log-cell small {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
}

.amount-cell strong {
  color: var(--text);
}

.tone-blue {
  color: var(--brand-secondary);
  border-color: rgba(79, 140, 255, 0.28);
}

.tone-green {
  color: var(--success);
  border-color: rgba(52, 211, 153, 0.28);
}

.tone-amber {
  color: var(--accent);
  border-color: rgba(245, 158, 11, 0.28);
}

.tone-rose {
  color: var(--danger);
  border-color: rgba(251, 113, 133, 0.28);
}

.tone-neutral,
.status-muted {
  color: var(--text-faint);
}

.status-danger {
  color: var(--danger);
  border-color: rgba(251, 113, 133, 0.28);
}

.status-warn {
  color: var(--accent);
  border-color: rgba(245, 158, 11, 0.28);
}

.status-success {
  color: var(--success);
  border-color: rgba(52, 211, 153, 0.28);
}

.skeleton-card {
  min-height: 178px;
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
  .log-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .stats-grid,
  .log-grid,
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .log-top,
  .pager {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
