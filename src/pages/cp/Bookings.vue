<template>
  <div class="bookings-page">
    <section class="hero card-flat">
      <div>
        <h1>{{ t('bookings.title') }}</h1>
        <p>{{ t('bookings.subtitle') }}</p>
      </div>
      <el-button :loading="loadingList" @click="loadBookings">{{ t('common.refresh') }}</el-button>
    </section>

    <section class="create card-flat">
      <div class="section-head">
        <h2>{{ t('bookings.newBooking') }}</h2>
      </div>

      <div class="create-grid">
        <label class="field">
          <span>{{ t('bookings.searchPc') }}</span>
          <el-select
            v-model="form.pc_id"
            filterable
            remote
            clearable
            reserve-keyword
            :placeholder="t('bookings.pcPlaceholder')"
            :remote-method="onPcSearch"
            :loading="pcLoading"
            class="w-full"
          >
            <el-option
              v-for="p in pcOptions"
              :key="p.id"
              :label="`${p.code} (${p.zone || t('bookings.noZone')})`"
              :value="p.id"
            >
              <div class="opt-row">
                <strong>{{ p.code }}</strong>
                <span class="opt-muted">{{ p.zone || t('bookings.noZone') }}</span>
                <span class="opt-status">{{ p.status }}</span>
              </div>
            </el-option>
          </el-select>
        </label>

        <label class="field">
          <span>{{ t('bookings.searchClient') }}</span>
          <el-select
            v-model="form.client_id"
            filterable
            remote
            clearable
            reserve-keyword
            :placeholder="t('bookings.clientPlaceholder')"
            :remote-method="onClientSearch"
            :loading="clientLoading"
            class="w-full"
          >
            <el-option
              v-for="c in clientOptions"
              :key="c.id"
              :label="clientLabel(c)"
              :value="c.id"
            >
              <div class="opt-row">
                <strong>{{ clientName(c) }}</strong>
                <span class="opt-muted">{{ t('bookings.balanceBonus', { balance: money(c.balance), bonus: money(c.bonus) }) }}</span>
              </div>
            </el-option>
          </el-select>
        </label>

        <label class="field">
          <span>{{ t('bookings.arrivalTime') }}</span>
          <input v-model="form.start_at" type="datetime-local" class="input" />
        </label>
      </div>

      <div class="summary-grid">
        <div class="sum-card">
          <span>{{ t('bookings.arrivalTime') }}</span>
          <strong>{{ startAtPretty }}</strong>
        </div>
        <div class="sum-card">
          <span>{{ t('bookings.state') }}</span>
          <strong>{{ t('bookings.activeUntilClosed') }}</strong>
        </div>
      </div>

      <label class="field">
        <span>{{ t('bookings.note') }}</span>
        <input v-model.trim="form.note" class="input" :placeholder="t('bookings.notePlaceholder')" />
      </label>

      <div class="create-actions">
        <el-button type="primary" :loading="saving" :disabled="!canCreate" @click="createBooking">
          {{ t('bookings.create') }}
        </el-button>
      </div>

      <div v-if="message" class="ok">{{ message }}</div>
      <div v-if="error" class="err">{{ error }}</div>
    </section>

    <section class="list card-flat">
      <div class="list-head">
        <h2>{{ t('bookings.listTitle') }}</h2>
        <el-select v-model="filters.status" :placeholder="t('bookings.statusFilter')" clearable style="width: 180px" @change="applyFilters">
          <el-option :label="t('common.status.active')" value="active" />
          <el-option :label="t('common.status.completed')" value="completed" />
          <el-option :label="t('common.status.canceled')" value="canceled" />
          <el-option :label="t('common.status.expired')" value="expired" />
        </el-select>
      </div>

      <div v-if="rows.length" class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('bookings.id') }}</th>
              <th>{{ t('bookings.pc') }}</th>
              <th>{{ t('bookings.client') }}</th>
              <th>{{ t('bookings.arrival') }}</th>
              <th>{{ t('bookings.status') }}</th>
              <th>{{ t('bookings.note') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td>#{{ r.id }}</td>
              <td>{{ r.pc?.code || `PC #${r.pc_id}` }}</td>
              <td>{{ r.client?.login || r.client?.account_id || r.client?.phone || `#${r.client_id}` }}</td>
              <td>{{ fmt(r.start_at) }}</td>
              <td>
                <span class="badge" :class="`s-${r.status}`">{{ statusText(r.status) }}</span>
              </td>
              <td>{{ r.note || '-' }}</td>
              <td>
                <el-button
                  v-if="r.status === 'active'"
                  type="danger"
                  plain
                  size="small"
                  @click="cancelBooking(r.id)"
                >
                  {{ t('bookings.cancel') }}
                </el-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">{{ t('bookings.notFound') }}</div>

      <div class="pager">
        <el-button :disabled="page <= 1 || loadingList" @click="prevPage">{{ t('bookings.prev') }}</el-button>
        <span>{{ page }} / {{ totalPages }}</span>
        <el-button :disabled="page >= totalPages || loadingList" @click="nextPage">{{ t('bookings.next') }}</el-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { cpApi } from '../../api/cp'
import { useI18n } from '../../i18n'

const { t, locale } = useI18n()

function dateToInputValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const localeCode = computed(() => {
  if (locale.value === 'ru') return 'ru-RU'
  if (locale.value === 'en') return 'en-US'
  return 'uz-UZ'
})

function fmt(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString(localeCode.value)
}

function money(v) {
  return new Intl.NumberFormat(localeCode.value).format(Math.round(Number(v || 0)))
}

function pickRows(resp) {
  const d = resp?.data
  if (Array.isArray(d?.data?.data)) return d.data.data
  if (Array.isArray(d?.data)) return d.data
  if (Array.isArray(d)) return d
  return []
}

function statusText(status) {
  const map = {
    active: 'common.status.active',
    completed: 'common.status.completed',
    canceled: 'common.status.canceled',
    expired: 'common.status.expired',
  }
  return map[status] ? t(map[status]) : status
}

function clientName(c) {
  return c.login || c.account_id || c.phone || `#${c.id}`
}

function clientLabel(c) {
  return `${clientName(c)} | ${t('bookings.balanceBonus', { balance: money(c.balance), bonus: money(c.bonus) })}`
}

const now = new Date()
const startDefault = new Date(now.getTime() + 10 * 60 * 1000)

const form = reactive({
  pc_id: null,
  client_id: null,
  start_at: dateToInputValue(startDefault),
  note: '',
})

const filters = reactive({
  status: '',
})

const pcOptions = ref([])
const clientOptions = ref([])
const rows = ref([])

const pcLoading = ref(false)
const clientLoading = ref(false)
const loadingList = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')

const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

let pcSearchTimer = null
let clientSearchTimer = null

const startAtDate = computed(() => {
  const s = new Date(form.start_at)
  return Number.isNaN(s.getTime()) ? null : s
})
const startAtPretty = computed(() => (startAtDate.value ? startAtDate.value.toLocaleString(localeCode.value) : '-'))

const canCreate = computed(() => {
  if (!form.pc_id || !form.client_id) return false
  return !!startAtDate.value
})

async function loadBookings() {
  loadingList.value = true
  error.value = ''
  try {
    const params = {
      status: filters.status || undefined,
      page: page.value,
      per_page: perPage.value,
    }
    const { data } = await cpApi.bookingsList(params)
    const payload = data?.data || {}
    rows.value = Array.isArray(payload?.data) ? payload.data : []
    total.value = Number(payload?.total || 0)
  } catch (e) {
    rows.value = []
    total.value = 0
    error.value = e?.response?.data?.message || t('bookings.loadError')
  } finally {
    loadingList.value = false
  }
}

async function loadPcOptions(keyword = '') {
  pcLoading.value = true
  try {
    const { data } = await cpApi.pcs({
      search: keyword || undefined,
      per_page: 200,
    })
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
    pcOptions.value = list.map((p) => ({
      id: p.id,
      code: p.code || p.name || `PC #${p.id}`,
      zone: p.zone || '',
      status: p.status || t('bookings.offline'),
    }))
  } catch (_) {
    pcOptions.value = []
  } finally {
    pcLoading.value = false
  }
}

async function loadClientOptions(keyword = '') {
  clientLoading.value = true
  try {
    const resp = await cpApi.clients({
      search: keyword || undefined,
      per_page: 50,
    })
    const list = pickRows(resp) || []
    clientOptions.value = list.map((c) => ({
      id: c.id,
      login: c.login,
      account_id: c.account_id,
      phone: c.phone,
      balance: Number(c.balance || 0),
      bonus: Number(c.bonus || 0),
    }))
  } catch (_) {
    clientOptions.value = []
  } finally {
    clientLoading.value = false
  }
}

function onPcSearch(keyword) {
  if (pcSearchTimer) clearTimeout(pcSearchTimer)
  pcSearchTimer = setTimeout(() => loadPcOptions((keyword || '').trim()), 250)
}

function onClientSearch(keyword) {
  if (clientSearchTimer) clearTimeout(clientSearchTimer)
  clientSearchTimer = setTimeout(() => loadClientOptions((keyword || '').trim()), 250)
}

async function createBooking() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    await cpApi.bookingCreate({
      pc_id: Number(form.pc_id),
      client_id: Number(form.client_id),
      start_at: startAtDate.value.toISOString(),
      note: form.note || null,
    })
    message.value = t('bookings.createSuccess')
    await loadBookings()
  } catch (e) {
    const errs = e?.response?.data?.errors
    const first = errs ? Object.values(errs).flat()[0] : null
    error.value = first || e?.response?.data?.message || t('bookings.createError')
  } finally {
    saving.value = false
  }
}

async function cancelBooking(id) {
  error.value = ''
  message.value = ''
  try {
    await cpApi.bookingCancel(id)
    message.value = t('bookings.cancelSuccess', { id })
    await loadBookings()
  } catch (e) {
    error.value = e?.response?.data?.message || t('bookings.cancelError')
  }
}

function applyFilters() {
  page.value = 1
  loadBookings()
}

function prevPage() {
  if (page.value <= 1) return
  page.value -= 1
  loadBookings()
}

function nextPage() {
  if (page.value >= totalPages.value) return
  page.value += 1
  loadBookings()
}

onMounted(async () => {
  await Promise.all([loadPcOptions(''), loadClientOptions(''), loadBookings()])
})
</script>

<style scoped>
.bookings-page {
  display: grid;
  gap: 12px;
}

.hero {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hero h1 {
  margin: 0;
  font-size: 22px;
}

.hero p {
  margin: 6px 0 0;
  font-size: 12px;
  opacity: 0.72;
}

.create,
.list {
  padding: 14px;
}

.section-head h2,
.list-head h2 {
  margin: 0;
  font-size: 16px;
}

.create-grid {
  margin-top: 10px;
  display: grid;
  gap: 10px;
  grid-template-columns: 1.3fr 1.3fr 1fr;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 11px;
  opacity: 0.75;
}

.input {
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(2, 6, 23, 0.35);
  color: var(--text);
  padding: 0 10px;
}

.summary-grid {
  margin-top: 10px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sum-card {
  border: 1px solid var(--stroke);
  border-radius: 10px;
  padding: 10px;
  background: rgba(2, 6, 23, 0.3);
  display: grid;
  gap: 5px;
}

.sum-card span {
  font-size: 11px;
  opacity: 0.7;
}

.sum-card strong {
  font-size: 14px;
}

.create-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.ok {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(34, 197, 94, 0.95);
}

.err {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(248, 113, 113, 0.95);
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.table-wrap {
  margin-top: 10px;
  overflow: auto;
}

.table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.table th,
.table td {
  border-top: 1px solid var(--stroke);
  padding: 9px 8px;
  text-align: left;
  font-size: 12px;
}

.table thead th {
  border-top: none;
  text-transform: uppercase;
  font-size: 11px;
  opacity: 0.7;
}

.badge {
  display: inline-block;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  padding: 2px 8px;
  font-size: 11px;
}

.badge.s-active {
  border-color: rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.14);
}

.badge.s-completed {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.14);
}

.badge.s-canceled,
.badge.s-expired {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.12);
}

.empty {
  margin-top: 10px;
  border: 1px dashed var(--stroke);
  border-radius: 11px;
  padding: 16px;
  text-align: center;
  font-size: 12px;
  opacity: 0.7;
}

.pager {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.opt-row {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}

.opt-muted {
  opacity: 0.7;
  font-size: 11px;
}

.opt-status {
  font-size: 11px;
  opacity: 0.8;
}

.w-full {
  width: 100%;
}

@media (max-width: 1280px) {
  .create-grid {
    grid-template-columns: 1fr 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .create-grid {
    grid-template-columns: 1fr;
  }
}
</style>

