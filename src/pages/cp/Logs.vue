<template>
  <div class="logs-page">
    <section class="card-flat panel">
      <div class="head">
        <div>
          <h1>Logs</h1>
          <p>Tizimdagi asosiy amallar: sessiya, topup, return, transfer, PC buyruqlari.</p>
        </div>
        <button class="btn ghost" :disabled="loading" @click="loadLogs">
          {{ loading ? 'Yuklanmoqda...' : 'Yangilash' }}
        </button>
      </div>

      <div class="filters">
        <label class="field">
          <span>Dan</span>
          <input v-model="filters.from" type="date" class="input" />
        </label>
        <label class="field">
          <span>Gacha</span>
          <input v-model="filters.to" type="date" class="input" />
        </label>
        <label class="field">
          <span>Turi</span>
          <select v-model="filters.type" class="input">
            <option value="">Barchasi</option>
            <option value="session">Session</option>
            <option value="transaction">Transaction</option>
            <option value="return">Return</option>
            <option value="transfer">Transfer</option>
            <option value="pc_command">PC command</option>
          </select>
        </label>
        <label class="field">
          <span>Qidiruv</span>
          <input v-model.trim="filters.search" class="input" placeholder="operator / mijoz / PC..." />
        </label>
        <button class="btn primary" :disabled="loading" @click="applyFilters">Qo'llash</button>
      </div>
    </section>

    <section class="card-flat panel">
      <div v-if="error" class="err">{{ error }}</div>

      <div v-if="rows.length" class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Vaqt</th>
              <th>Tur</th>
              <th>Amal</th>
              <th>Subyekt</th>
              <th>Izoh</th>
              <th>Summa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ formatDate(row.happened_at) }}</td>
              <td>
                <span class="badge">{{ row.type }}</span>
              </td>
              <td>
                <div class="cell-main">{{ row.action }}</div>
                <div class="cell-sub" v-if="row.status">status: {{ row.status }}</div>
              </td>
              <td>
                <div class="cell-main">{{ subjectLabel(row) }}</div>
                <div class="cell-sub">{{ actorLabel(row) }}</div>
              </td>
              <td>
                <div class="cell-main">{{ noteLabel(row) }}</div>
              </td>
              <td :class="{ plus: Number(row.amount || 0) > 0 }">
                {{ row.amount == null ? '-' : `${money(row.amount)} UZS` }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">Loglar topilmadi.</div>

      <div class="pager">
        <button class="btn ghost" :disabled="loading || page <= 1" @click="prevPage">Oldingi</button>
        <span>Sahifa {{ page }} / {{ totalPages }}</span>
        <button class="btn ghost" :disabled="loading || page >= totalPages" @click="nextPage">Keyingi</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { cpApi } from '../../api/cp'

function dateToInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

const rows = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const perPage = ref(50)
const total = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

function money(v) {
  return new Intl.NumberFormat('en-US').format(Math.round(Number(v || 0)))
}

function formatDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString()
}

function subjectLabel(row) {
  if (row.pc?.code) return `PC: ${row.pc.code}`
  if (row.client?.label) return `Client: ${row.client.label}`
  return '-'
}

function actorLabel(row) {
  if (row.operator?.name) return `Operator: ${row.operator.name}`
  return 'Operator: -'
}

function noteLabel(row) {
  if (!row?.note) return '-'
  if (row.type === 'transfer') return `To: ${row.note}`
  return row.note
}

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      from: filters.from,
      to: filters.to,
      type: filters.type || undefined,
      search: filters.search || undefined,
      page: page.value,
      per_page: perPage.value,
    }
    const { data } = await cpApi.logsList(params)
    rows.value = data?.data || []
    total.value = Number(data?.meta?.total || 0)
  } catch (e) {
    rows.value = []
    total.value = 0
    error.value = e?.response?.data?.message || 'Loglarni yuklashda xato'
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
.logs-page {
  display: grid;
  gap: 12px;
}

.panel {
  padding: 14px;
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
  gap: 8px;
  grid-template-columns: 150px 150px 170px 1fr auto;
  align-items: end;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 11px;
  opacity: 0.72;
}

.input {
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(2, 6, 23, 0.35);
  color: var(--text);
  padding: 0 10px;
}

.btn {
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  padding: 0 12px;
  cursor: pointer;
}

.btn.primary {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.18);
}

.btn.ghost {
  background: rgba(2, 6, 23, 0.35);
}

.table-wrap {
  overflow: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 880px;
}

.table th,
.table td {
  text-align: left;
  padding: 10px 8px;
  border-top: 1px solid var(--stroke);
  vertical-align: top;
  font-size: 12px;
}

.table thead th {
  border-top: none;
  font-size: 11px;
  opacity: 0.7;
  text-transform: uppercase;
}

.badge {
  display: inline-block;
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.15);
  padding: 3px 8px;
  font-size: 11px;
}

.cell-main {
  font-size: 12px;
}

.cell-sub {
  margin-top: 3px;
  font-size: 11px;
  opacity: 0.66;
}

.plus {
  color: rgba(34, 197, 94, 0.95);
}

.empty {
  border: 1px dashed var(--stroke);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  opacity: 0.7;
  font-size: 12px;
}

.pager {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  font-size: 12px;
}

.err {
  margin-bottom: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.13);
  border: 1px solid rgba(239, 68, 68, 0.3);
  font-size: 12px;
}

@media (max-width: 1100px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

