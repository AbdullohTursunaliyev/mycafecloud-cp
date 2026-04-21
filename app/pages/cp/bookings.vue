<template>
  <div class="bookings-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="meta-chip">
          <Icon name="lucide:clock-3" size="14" />
          {{ copy.updatedAt }}: {{ refreshedAtLabel }}
        </span>
        <span class="meta-chip">
          <Icon name="lucide:list-filter" size="14" />
          {{ copy.total }}: {{ total }}
        </span>
      </template>

      <template #actions>
        <div class="hero-actions">
          <label class="hero-field">
            <Icon name="lucide:filter" size="16" />
            <select v-model="filters.status" class="hero-input" @change="reload(1)">
              <option value="">{{ copy.statusAll }}</option>
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="hero-field">
            <Icon name="lucide:search" size="16" />
            <input v-model.trim="filters.search" class="hero-input" :placeholder="copy.searchPlaceholder" />
          </label>

          <button class="primary-btn" :disabled="loadingList" @click="reload(1)">
            <Icon name="lucide:refresh-cw" size="16" />
            {{ loadingList ? copy.refreshing : copy.refresh }}
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard :label="copy.statsActive" :value="String(activeCount)" :hint="`${upcomingCount} ${copy.statsUpcoming}`" tone="tone-green" compact />
      <CpStatCard :label="copy.statsOverdue" :value="String(overdueCount)" :hint="txt(copy.statsToday, { value: todayCount })" tone="tone-amber" compact />
      <CpStatCard :label="copy.statsFiltered" :value="String(filteredRows.length)" :hint="filters.status ? statusLabel(filters.status) : copy.statusAll" tone="tone-blue" compact />
    </div>

    <div class="content-grid">
      <CpPanelCard :title="copy.newBookingTitle" :subtitle="copy.newBookingSubtitle">
        <div class="composer-grid">
          <section class="picker-card">
            <div class="picker-head">
              <span class="picker-label">
                <Icon name="lucide:monitor" size="14" />
                {{ copy.pc }}
              </span>
              <span v-if="selectedPc" class="picked-chip">
                <Icon name="lucide:check" size="13" />
                {{ selectedPc.code }}
              </span>
            </div>

            <label class="picker-search">
              <Icon name="lucide:search" size="16" />
              <input
                v-model.trim="picker.pcQuery"
                class="picker-search-input"
                :placeholder="copy.pcPlaceholder"
              />
              <button v-if="picker.pcQuery" type="button" class="icon-btn" @click="picker.pcQuery = ''">
                <Icon name="lucide:x" size="14" />
              </button>
            </label>

            <div v-if="showPcResults" class="picker-results">
              <button
                v-for="pc in pcOptions"
                :key="pc.id"
                type="button"
                class="result-card"
                :class="{ active: Number(form.pc_id) === Number(pc.id) }"
                @click="choosePc(pc)"
              >
                <div class="result-main">
                  <strong>{{ pc.code }}</strong>
                  <small>{{ pc.zone || copy.statusAll }}</small>
                </div>
                <span class="result-tag">{{ pc.statusLabel }}</span>
              </button>

              <div v-if="pcLoading" class="picker-empty">{{ copy.refreshing }}</div>
              <div v-else-if="!pcOptions.length" class="picker-empty">{{ copy.notFound }}</div>
            </div>
            <div v-else class="picker-idle">
              <Icon name="lucide:keyboard" size="16" />
              <span>{{ copy.pcPlaceholder }}</span>
            </div>
          </section>

          <section class="picker-card">
            <div class="picker-head">
              <span class="picker-label">
                <Icon name="lucide:user-round" size="14" />
                {{ copy.client }}
              </span>
              <span v-if="selectedClient" class="picked-chip">
                <Icon name="lucide:check" size="13" />
                {{ clientName(selectedClient) }}
              </span>
            </div>

            <label class="picker-search">
              <Icon name="lucide:search" size="16" />
              <input
                v-model.trim="picker.clientQuery"
                class="picker-search-input"
                :placeholder="copy.clientPlaceholder"
              />
              <button v-if="picker.clientQuery" type="button" class="icon-btn" @click="picker.clientQuery = ''">
                <Icon name="lucide:x" size="14" />
              </button>
            </label>

            <div v-if="showClientResults" class="picker-results">
              <button
                v-for="client in clientOptions"
                :key="client.id"
                type="button"
                class="result-card"
                :class="{ active: Number(form.client_id) === Number(client.id) }"
                @click="chooseClient(client)"
              >
                <div class="result-main">
                  <strong>{{ clientName(client) || `#${client.id}` }}</strong>
                  <small>{{ client.phone || client.account_id || copy.clientPlaceholder }}</small>
                </div>
                <div class="client-money">
                  <span>{{ formatMoney(client.balance) }} UZS</span>
                  <small>{{ copy.optionBonus }}: {{ formatMoney(client.bonus || 0) }}</small>
                </div>
              </button>

              <div v-if="clientLoading" class="picker-empty">{{ copy.refreshing }}</div>
              <div v-else-if="!clientOptions.length" class="picker-empty">{{ copy.notFound }}</div>
            </div>
            <div v-else class="picker-idle">
              <Icon name="lucide:keyboard" size="16" />
              <span>{{ copy.clientPlaceholder }}</span>
            </div>
          </section>
        </div>

        <div class="form-grid">
          <label class="field-card">
            <span class="field-label">
              <Icon name="lucide:calendar-clock" size="14" />
              {{ copy.arrivalTime }}
            </span>
            <div class="field-shell">
              <input v-model="form.start_at" type="datetime-local" class="field-input" />
            </div>
            <small>{{ copy.arrival }}: {{ startAtLabel }}</small>
          </label>

          <label class="field-card">
            <span class="field-label">
              <Icon name="lucide:file-text" size="14" />
              {{ copy.note }}
            </span>
            <div class="field-shell">
              <input v-model.trim="form.note" class="field-input" :placeholder="copy.notePlaceholder" />
            </div>
            <small>{{ form.note || copy.notePlaceholder }}</small>
          </label>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <span class="summary-label">
              <Icon name="lucide:monitor" size="14" />
              {{ copy.pc }}
            </span>
            <strong>{{ selectedPc ? selectedPc.code : copy.pcPlaceholder }}</strong>
            <small>{{ selectedPc ? selectedPc.zone || copy.statusAll : copy.statusAll }}</small>
          </div>

          <div class="summary-card">
            <span class="summary-label">
              <Icon name="lucide:user-round" size="14" />
              {{ copy.client }}
            </span>
            <strong>{{ selectedClient ? clientName(selectedClient) : copy.clientPlaceholder }}</strong>
            <small>{{ selectedClient ? clientSummary(selectedClient) : copy.clientPlaceholder }}</small>
          </div>

          <div class="summary-card">
            <span class="summary-label">
              <Icon name="lucide:clock-3" size="14" />
              {{ copy.arrival }}
            </span>
            <strong>{{ startAtLabel }}</strong>
            <small>{{ bookingArrivalMeta }}</small>
          </div>

          <div class="summary-card">
            <span class="summary-label">
              <Icon name="lucide:badge-check" size="14" />
              {{ copy.state }}
            </span>
            <strong>{{ copy.activeUntilArrival }}</strong>
            <small>{{ selectedPc && selectedClient ? copy.created : copy.newBookingSubtitle }}</small>
          </div>
        </div>

        <div class="panel-actions">
          <button class="primary-btn" :disabled="saving || !canCreate" @click="createBooking">
            <Icon name="lucide:calendar-plus-2" size="16" />
            {{ saving ? copy.creating : copy.create }}
          </button>
          <span v-if="message" class="message ok">{{ message }}</span>
          <span v-if="error" class="message err">{{ error }}</span>
        </div>
      </CpPanelCard>

      <CpPanelCard :title="copy.queueTitle" :subtitle="copy.queueSubtitle">
        <div v-if="filteredRows.length" class="queue-grid">
          <article v-for="row in filteredRows" :key="row.id" class="queue-card" :class="statusTone(row.status)">
            <div class="queue-top">
              <div>
                <strong>{{ row.pc?.code || `PC #${row.pc_id}` }}</strong>
                <p>{{ clientName(row.client) || `#${row.client_id}` }}</p>
              </div>
              <span class="status-pill">{{ statusLabel(row.status) }}</span>
            </div>

            <div class="queue-meta">
              <div class="meta-box">
                <span>{{ copy.arrival }}</span>
                <strong>{{ formatDateTime(row.start_at) }}</strong>
              </div>
              <div class="meta-box">
                <span>{{ copy.state }}</span>
                <strong>{{ bookingStateLabel(row) }}</strong>
              </div>
            </div>

            <div class="queue-note">
              <span>{{ copy.note }}</span>
              <strong>{{ row.note || '-' }}</strong>
            </div>

            <div class="queue-actions">
              <button v-if="row.status === 'active'" class="ghost-btn danger" @click="cancelBooking(row.id)">
                <Icon name="lucide:x-circle" size="15" />
                {{ copy.cancel }}
              </button>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">{{ copy.notFound }}</div>

        <div class="pager">
          <button class="ghost-btn" :disabled="page <= 1 || loadingList" @click="reload(page - 1)">{{ copy.prev }}</button>
          <span class="meta-chip">{{ page }} / {{ lastPage }}</span>
          <button class="ghost-btn" :disabled="page >= lastPage || loadingList" @click="reload(page + 1)">{{ copy.next }}</button>
        </div>
      </CpPanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpFormatters } from '../../../composables/useCpFormatters'
import { useCpPayload } from '../../../composables/useCpPayload'
import { useCpCopy } from '../../../composables/useCpCopy'
import { cpNativePageCopy } from '../../constants/cp-native-copy'

definePageMeta({
  layout: 'cp',
})

type PcOption = {
  id: number
  code: string
  zone: string
  statusLabel: string
}

type ClientOption = {
  id: number
  login?: string
  account_id?: string | number | null
  phone?: string
  name?: string
  balance: number
  bonus: number
}

const copy = useCpCopy(cpNativePageCopy.bookings)

useHead({
  title: computed(() => `${copy.value.headTitle} | MyCafeCloud CP`),
})

const { formatDateTime, formatMoney, localeCode } = useCpFormatters()
const { pickRows, pickPage } = useCpPayload()

function txt(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`))
}

function dateToInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function clientName(client: ClientOption | Record<string, any> | null | undefined) {
  if (!client) return ''
  return client.login || client.account_id || client.phone || client.name || ''
}

function statusLabel(status: string) {
  return copy.value.statuses[status as keyof typeof copy.value.statuses] || status
}

function clientSummary(client: ClientOption | null) {
  if (!client) return copy.value.clientPlaceholder
  return `${copy.value.optionBalance}: ${formatMoney(client.balance)} UZS · ${copy.value.optionBonus}: ${formatMoney(client.bonus || 0)}`
}

function pcStatusLabel(pc: Record<string, any>) {
  return pc.zone || pc.status || pc.state || copy.value.statusAll
}

const loadingList = ref(false)
const pcLoading = ref(false)
const clientLoading = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')
const refreshedAt = ref<string | null>(null)

const rows = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const lastPage = ref(1)

const pcOptions = ref<PcOption[]>([])
const clientOptions = ref<ClientOption[]>([])
const selectedPc = ref<PcOption | null>(null)
const selectedClient = ref<ClientOption | null>(null)

const filters = reactive({
  status: '',
  search: '',
})

const picker = reactive({
  pcQuery: '',
  clientQuery: '',
})

const form = reactive({
  pc_id: null as number | null,
  client_id: null as number | null,
  start_at: dateToInputValue(new Date(Date.now() + 10 * 60 * 1000)),
  note: '',
})

let pcTimer: ReturnType<typeof setTimeout> | null = null
let clientTimer: ReturnType<typeof setTimeout> | null = null
let refreshTimer: number | null = null

const statusOptions = computed(() => [
  { value: 'active', label: copy.value.statuses.active },
  { value: 'completed', label: copy.value.statuses.completed },
  { value: 'canceled', label: copy.value.statuses.canceled },
  { value: 'expired', label: copy.value.statuses.expired },
])

const refreshedAtLabel = computed(() => (refreshedAt.value ? formatDateTime(refreshedAt.value) : '-'))

const startAtDate = computed(() => {
  const value = new Date(form.start_at)
  return Number.isNaN(value.getTime()) ? null : value
})

const startAtLabel = computed(() => (startAtDate.value ? startAtDate.value.toLocaleString(localeCode.value) : '-'))
const showPcResults = computed(() => picker.pcQuery.trim().length > 0)
const showClientResults = computed(() => picker.clientQuery.trim().length > 0)
const bookingArrivalMeta = computed(() => {
  if (!startAtDate.value) return '-'
  const diff = Math.round((startAtDate.value.getTime() - Date.now()) / 60000)
  if (diff <= 0) return txt(copy.value.overdueMinutes, { value: Math.abs(diff) })
  return txt(copy.value.leftMinutes, { value: diff })
})

const canCreate = computed(() => Boolean(form.pc_id && form.client_id && startAtDate.value))

const filteredRows = computed(() => {
  const needle = filters.search.trim().toLowerCase()
  return rows.value.filter((row) => {
    if (filters.status && row.status !== filters.status) return false
    if (!needle) return true
    const items = [row.pc?.code, row.pc?.name, clientName(row.client), row.note, row.status]
    return items.filter(Boolean).some((value) => String(value).toLowerCase().includes(needle))
  })
})

const activeCount = computed(() => rows.value.filter((row) => row.status === 'active').length)
const todayCount = computed(() => {
  const today = new Date().toDateString()
  return rows.value.filter((row) => new Date(row.start_at).toDateString() === today).length
})
const upcomingCount = computed(() => {
  const now = Date.now()
  return rows.value.filter((row) => {
    const timestamp = new Date(row.start_at).getTime()
    return row.status === 'active' && timestamp >= now && timestamp - now <= 60 * 60 * 1000
  }).length
})
const overdueCount = computed(() => {
  const now = Date.now()
  return rows.value.filter((row) => row.status === 'active' && new Date(row.start_at).getTime() < now).length
})

function bookingStateLabel(row: any) {
  const at = new Date(row.start_at).getTime()
  if (!Number.isFinite(at)) return statusLabel(row.status)
  const diff = at - Date.now()
  if (row.status !== 'active') return statusLabel(row.status)
  if (diff < 0) return txt(copy.value.overdueMinutes, { value: Math.abs(Math.round(diff / 60000)) })
  return txt(copy.value.leftMinutes, { value: Math.round(diff / 60000) })
}

function statusTone(status: string) {
  if (status === 'active') return 'tone-active'
  if (status === 'completed') return 'tone-completed'
  return 'tone-muted'
}

async function loadPcOptions(keyword = '') {
  pcLoading.value = true
  try {
    const response = await cpApi.pcs({
      search: keyword || undefined,
      per_page: 10,
    })
    pcOptions.value = pickRows(response).map((pc: any) => ({
      id: Number(pc.id),
      code: pc.code || pc.name || `PC #${pc.id}`,
      zone: pc.zone || '',
      statusLabel: pcStatusLabel(pc),
    }))
  } finally {
    pcLoading.value = false
  }
}

async function loadClientOptions(keyword = '') {
  clientLoading.value = true
  try {
    const response = await cpApi.clients({
      search: keyword || undefined,
      per_page: 10,
    })
    clientOptions.value = pickRows(response).map((client: any) => ({
      id: Number(client.id),
      login: client.login,
      account_id: client.account_id,
      phone: client.phone,
      name: client.name,
      balance: Number(client.balance || 0),
      bonus: Number(client.bonus || 0),
    }))
  } finally {
    clientLoading.value = false
  }
}

function choosePc(pc: PcOption) {
  selectedPc.value = pc
  form.pc_id = pc.id
  picker.pcQuery = pc.code
}

function chooseClient(client: ClientOption) {
  selectedClient.value = client
  form.client_id = client.id
  picker.clientQuery = clientName(client)
}

async function reload(nextPage = page.value) {
  loadingList.value = true
  error.value = ''
  try {
    const response = await cpApi.bookingsList({
      page: nextPage,
      per_page: 20,
    })
    const payload = pickPage(response)
    rows.value = payload.items
    total.value = payload.total
    page.value = payload.currentPage
    lastPage.value = Math.max(1, payload.lastPage || Math.ceil(payload.total / 20))
    refreshedAt.value = new Date().toISOString()
  } catch (cause: any) {
    error.value = cause?.response?.data?.message || copy.value.loadError
    rows.value = []
    total.value = 0
    lastPage.value = 1
  } finally {
    loadingList.value = false
  }
}

async function createBooking() {
  if (!startAtDate.value || !selectedPc.value || !selectedClient.value) return
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    await cpApi.bookingCreate({
      pc_id: Number(selectedPc.value.id),
      client_id: Number(selectedClient.value.id),
      start_at: startAtDate.value.toISOString(),
      note: form.note || null,
    })
    message.value = copy.value.created
    form.note = ''
    form.pc_id = null
    form.client_id = null
    picker.pcQuery = ''
    picker.clientQuery = ''
    selectedPc.value = null
    selectedClient.value = null
    pcOptions.value = []
    clientOptions.value = []
    form.start_at = dateToInputValue(new Date(Date.now() + 10 * 60 * 1000))
    await reload(1)
  } catch (cause: any) {
    const firstError = cause?.response?.data?.errors ? Object.values(cause.response.data.errors).flat()[0] : null
    error.value = String(firstError || cause?.response?.data?.message || copy.value.createError)
  } finally {
    saving.value = false
  }
}

async function cancelBooking(id: number) {
  try {
    await ElMessageBox.confirm(copy.value.cancelConfirm, copy.value.confirmTitle, {
      type: 'warning',
      confirmButtonText: copy.value.confirmYes,
      cancelButtonText: copy.value.confirmNo,
    })
  } catch {
    return
  }

  await cpApi.bookingCancel(id)
  ElMessage.success(copy.value.canceled)
  await reload(page.value)
}

watch(
  () => picker.pcQuery,
  (value) => {
    if (pcTimer) clearTimeout(pcTimer)
    const query = (value || '').trim()
    if (!query) {
      pcOptions.value = []
      return
    }
    pcTimer = setTimeout(() => {
      loadPcOptions(query)
    }, 220)
  },
)

watch(
  () => picker.clientQuery,
  (value) => {
    if (clientTimer) clearTimeout(clientTimer)
    const query = (value || '').trim()
    if (!query) {
      clientOptions.value = []
      return
    }
    clientTimer = setTimeout(() => {
      loadClientOptions(query)
    }, 220)
  },
)

onMounted(async () => {
  await reload(1)
  refreshTimer = window.setInterval(() => reload(page.value), 25000)
})

onBeforeUnmount(() => {
  if (pcTimer) clearTimeout(pcTimer)
  if (clientTimer) clearTimeout(clientTimer)
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<style scoped>
.bookings-page,
.stats-grid,
.content-grid,
.hero-actions,
.composer-grid,
.form-grid,
.summary-grid,
.queue-grid {
  display: grid;
  gap: 18px;
}

.stats-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.content-grid {
  grid-template-columns: 1.1fr 0.9fr;
  gap: 20px;
}

.hero-actions {
  grid-template-columns: 190px minmax(240px, 320px) 170px;
}

.hero-field {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.hero-input {
  width: 100%;
  min-height: 46px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font: inherit;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
}

.primary-btn,
.ghost-btn,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 16px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.primary-btn {
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 72%, white), color-mix(in srgb, var(--brand) 64%, transparent));
  border-color: color-mix(in srgb, var(--brand-secondary) 24%, var(--stroke));
  color: #08111e;
}

.ghost-btn:hover,
.primary-btn:hover,
.icon-btn:hover,
.result-card:hover {
  transform: translateY(-1px);
  border-color: var(--stroke-strong);
}

.ghost-btn.danger {
  border-color: color-mix(in srgb, var(--danger) 28%, var(--stroke));
  background: color-mix(in srgb, var(--danger) 12%, transparent);
}

.composer-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.picker-card,
.field-card,
.summary-card,
.queue-card {
  border-radius: 22px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, var(--surface-soft), var(--surface));
}

.picker-card {
  display: grid;
  gap: 14px;
  align-content: start;
  padding: 18px;
}

.picker-head,
.queue-top,
.panel-actions,
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.picker-label,
.field-label,
.summary-label,
.queue-note span,
.meta-box span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.picked-chip,
.status-pill,
.result-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.picker-search {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 54px;
  padding: 0 14px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface);
}

.picker-search-input,
.field-input {
  width: 100%;
  min-height: 50px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font: inherit;
}

.picker-results {
  display: grid;
  gap: 10px;
  max-height: 280px;
  overflow: auto;
  margin-top: 4px;
  padding-right: 4px;
}

.picker-idle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 8px;
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 13px;
}

.result-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.result-card.active {
  border-color: color-mix(in srgb, var(--brand-secondary) 24%, var(--stroke));
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.1), rgba(79, 209, 197, 0.12));
}

.result-main {
  display: grid;
  gap: 4px;
}

.result-main strong,
.queue-top strong,
.summary-card strong {
  font-size: 16px;
  color: var(--text);
}

.result-main small,
.client-money small,
.field-card small,
.summary-card small,
.queue-top p {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.client-money {
  display: grid;
  gap: 4px;
  justify-items: end;
}

.client-money span {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.picker-empty,
.empty-state {
  padding: 18px;
  border-radius: 18px;
  border: 1px dashed var(--stroke);
  text-align: center;
  color: var(--text-muted);
}

.form-grid,
.summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid {
  margin-bottom: 18px;
}

.summary-grid {
  margin-bottom: 18px;
}

.field-card,
.summary-card,
.queue-card {
  display: grid;
  gap: 10px;
  padding: 18px;
}

.field-shell {
  display: flex;
  align-items: center;
  min-height: 54px;
  padding: 0 16px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface);
}

.field-card .field-input {
  appearance: none;
  -webkit-appearance: none;
  color-scheme: inherit;
  min-height: 50px;
  padding: 0;
  border: none !important;
  background: transparent !important;
  background-color: transparent !important;
  color: var(--text) !important;
  -webkit-text-fill-color: var(--text) !important;
  caret-color: var(--text);
  box-shadow: none !important;
}

.field-card .field-input::placeholder {
  color: var(--text-muted) !important;
}

:global(html[data-theme='dark'] .field-card .field-input::-webkit-calendar-picker-indicator) {
  filter: invert(0.9);
  opacity: 0.9;
}

:global(html[data-theme='dark'] .field-card .field-input::-webkit-datetime-edit),
:global(html[data-theme='dark'] .field-card .field-input::-webkit-datetime-edit-fields-wrapper),
:global(html[data-theme='dark'] .field-card .field-input::-webkit-datetime-edit-text),
:global(html[data-theme='dark'] .field-card .field-input::-webkit-datetime-edit-month-field),
:global(html[data-theme='dark'] .field-card .field-input::-webkit-datetime-edit-day-field),
:global(html[data-theme='dark'] .field-card .field-input::-webkit-datetime-edit-year-field),
:global(html[data-theme='dark'] .field-card .field-input::-webkit-datetime-edit-hour-field),
:global(html[data-theme='dark'] .field-card .field-input::-webkit-datetime-edit-minute-field) {
  color: var(--text) !important;
  -webkit-text-fill-color: var(--text) !important;
}

.queue-grid {
  align-content: start;
}

.queue-card {
  gap: 14px;
}

.queue-top p {
  margin: 6px 0 0;
}

.queue-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.meta-box {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 18px;
  background: var(--surface);
  border: 1px solid var(--stroke);
}

.queue-note {
  display: grid;
  gap: 6px;
}

.queue-note strong,
.meta-box strong {
  color: var(--text);
  font-size: 14px;
}

.tone-active {
  border-color: color-mix(in srgb, var(--brand) 30%, var(--stroke));
}

.tone-completed {
  border-color: color-mix(in srgb, var(--brand-secondary) 30%, var(--stroke));
}

.tone-muted {
  border-color: color-mix(in srgb, var(--text-faint) 30%, var(--stroke));
}

.message {
  font-size: 12px;
}

.panel-actions {
  padding-top: 4px;
}

.pager {
  margin-top: 8px;
  padding-top: 8px;
}

.pager .meta-chip {
  min-width: 72px;
  justify-content: center;
}

.pager .ghost-btn {
  min-width: 116px;
}

.message.ok {
  color: var(--success);
}

.message.err {
  color: var(--danger);
}

.icon-btn {
  min-height: 34px;
  width: 34px;
  min-width: 34px;
  padding: 0;
  border-radius: 12px;
}

@media (max-width: 1220px) {
  .content-grid,
  .stats-grid,
  .hero-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .composer-grid,
  .form-grid,
  .summary-grid,
  .queue-meta {
    grid-template-columns: 1fr;
  }

  .picker-results {
    max-height: 220px;
  }

  .panel-actions,
  .pager {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
