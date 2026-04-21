<template>
  <div class="returns-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="hero-meta-badge">{{ copy.updatedAt }}: {{ refreshedAtLabel }}</span>
      </template>
      <template #actions>
        <div class="hero-actions">
          <label class="search-field">
            <Icon name="lucide:search" size="16" />
            <input v-model.trim="search" type="text" :placeholder="copy.searchPlaceholder" />
          </label>

          <label class="filter-field">
            <Icon name="lucide:wallet" size="15" />
            <select v-model="method">
              <option value="">{{ copy.allMethods }}</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="balance">Balance</option>
            </select>
          </label>

          <button class="hero-btn" :disabled="loading" @click="load(page)">
            {{ loading ? copy.refreshing : copy.refresh }}
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard compact tone="tone-blue" :label="copy.totalRows" :value="String(total)" :hint="`${copy.page} ${page}/${lastPage}`" />
      <CpStatCard compact tone="tone-green" :label="copy.pageAmount" :value="money(pageAmount)" :hint="`${copy.count}: ${rows.length}`" />
      <CpStatCard compact tone="tone-amber" :label="copy.cashReturns" :value="money(cashAmount)" :hint="`${cashCount} ${copy.count}`" />
    </div>

    <CpPanelCard :title="copy.headTitle" :subtitle="copy.subtitle">
      <div v-if="loading" class="returns-list">
        <div v-for="item in 6" :key="item" class="return-card skeleton-card"></div>
      </div>

      <div v-else-if="!filteredRows.length" class="empty-state">{{ copy.noData }}</div>

      <div v-else class="returns-list">
        <article v-for="row in filteredRows" :key="row.id" class="return-card">
          <div class="return-top">
            <div class="return-type">
              <span class="type-chip">{{ row.type || 'return' }}</span>
              <strong>{{ money(row.amount) }} UZS</strong>
            </div>
            <span class="shift-chip">#{{ row.shift_id || '-' }}</span>
          </div>

          <div class="return-grid">
            <div class="return-cell">
              <span>{{ copy.client }}</span>
              <strong>{{ clientName(row) }}</strong>
              <small>ID: {{ row.client_id || '-' }}</small>
            </div>

            <div class="return-cell">
              <span>{{ copy.operator }}</span>
              <strong>{{ operatorName(row) }}</strong>
              <small>{{ copy.method }}: {{ row.payment_method || '-' }}</small>
            </div>

            <div class="return-cell">
              <span>{{ copy.date }}</span>
              <strong>{{ formatDateTime(row.created_at) }}</strong>
              <small>{{ copy.shift }}: #{{ row.shift_id || '-' }}</small>
            </div>
          </div>

          <div class="return-note">
            <Icon name="lucide:file-text" size="14" />
            <span>{{ row.reason || row.note || copy.noReason }}</span>
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
import { computed, ref, watch } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'
import { cpNativePageCopy } from '../../constants/cp-native-copy'

definePageMeta({
  layout: 'cp',
})

const copy = useCpCopy(cpNativePageCopy.returns)

useHead({
  title: computed(() => `${copy.value.headTitle} - NEXORA CLOUD CP`),
})

const { formatMoney, formatDateTime } = useCpFormatters()

const loading = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const lastPage = ref(1)
const refreshedAt = ref<string | null>(null)
const search = ref('')
const method = ref('')

let searchTimer: number | null = null

function money(value: any) {
  return formatMoney(Number(value || 0))
}

function clientName(row: any) {
  return row.client?.login || row.client?.phone || copy.value.unknownClient
}

function operatorName(row: any) {
  return row.operator?.login || row.operator?.name || row.operator_id || copy.value.unknownOperator
}

const refreshedAtLabel = computed(() => (refreshedAt.value ? formatDateTime(refreshedAt.value) : '-'))
const filteredRows = computed(() => rows.value)
const pageAmount = computed(() => filteredRows.value.reduce((sum, row) => sum + Number(row.amount || 0), 0))
const cashRows = computed(() => filteredRows.value.filter((row) => String(row.payment_method || '').toLowerCase() === 'cash'))
const cashAmount = computed(() => cashRows.value.reduce((sum, row) => sum + Number(row.amount || 0), 0))
const cashCount = computed(() => cashRows.value.length)

async function load(nextPage = 1) {
  loading.value = true
  try {
    const response = await cpApi.returnsList({
      page: nextPage,
      per_page: perPage.value,
      q: search.value || undefined,
      payment_method: method.value || undefined,
    })
    const payload = response?.data?.data ?? response?.data ?? {}
    const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
    rows.value = list
    page.value = Number(payload?.current_page || nextPage)
    total.value = Number(payload?.total || list.length)
    lastPage.value = Math.max(1, Number(payload?.last_page || 1))
    refreshedAt.value = new Date().toISOString()
  } finally {
    loading.value = false
  }
}

watch(method, () => {
  load(1)
})

watch(search, () => {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    load(1)
  }, 250)
})

load(1)
</script>

<style scoped>
.returns-page,
.stats-grid,
.returns-list,
.hero-actions {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.hero-actions {
  grid-template-columns: minmax(260px, 340px) 190px auto;
  align-items: center;
  gap: 10px;
}

.search-field,
.filter-field {
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

.search-field input,
.filter-field select {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 13px;
}

.returns-list {
  gap: 12px;
}

.return-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.return-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.return-type {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.type-chip,
.shift-chip,
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
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

.return-type strong {
  font-size: 18px;
  line-height: 1;
}

.return-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.return-cell {
  display: grid;
  gap: 6px;
}

.return-cell span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.return-cell strong {
  font-size: 14px;
  line-height: 1.2;
}

.return-cell small,
.return-note {
  font-size: 12px;
  color: var(--text-muted);
}

.return-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-top: 2px;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 10px;
}

.pager-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}

.pager-btn:disabled {
  opacity: 0.55;
}

.skeleton-card {
  min-height: 148px;
  opacity: 0.72;
  animation: pulse 1.2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 0.52; }
  50% { opacity: 0.9; }
}

@media (max-width: 1100px) {
  .hero-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .stats-grid,
  .return-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
