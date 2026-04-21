<template>
  <div class="transfers-page">
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

          <button class="hero-btn" :disabled="loading" @click="load(page)">
            {{ loading ? copy.refreshing : copy.refresh }}
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard compact tone="tone-blue" :label="copy.totalRows" :value="String(total)" :hint="`${copy.page} ${page}/${lastPage}`" />
      <CpStatCard compact tone="tone-green" :label="copy.pageAmount" :value="money(pageAmount)" :hint="`${copy.count}: ${rows.length}`" />
      <CpStatCard compact tone="tone-amber" :label="copy.uniqueClients" :value="String(uniqueClientCount)" :hint="`${copy.count}: ${uniqueClientCount}`" />
    </div>

    <CpPanelCard :title="copy.headTitle" :subtitle="copy.subtitle">
      <div v-if="loading" class="transfers-list">
        <div v-for="item in 6" :key="item" class="transfer-card skeleton-card"></div>
      </div>

      <div v-else-if="!filteredRows.length" class="empty-state">{{ copy.noData }}</div>

      <div v-else class="transfers-list">
        <article v-for="row in filteredRows" :key="row.id" class="transfer-card">
          <div class="transfer-top">
            <div class="amount-block">
              <span>{{ copy.pageAmount }}</span>
              <strong>{{ money(row.amount) }} UZS</strong>
            </div>
            <span class="shift-chip">#{{ row.shift_id || '-' }}</span>
          </div>

          <div class="transfer-body">
            <div class="transfer-cell transfer-party">
              <span>{{ copy.from }}</span>
              <strong>{{ clientName(row.from_client, row.from_client_id) }}</strong>
              <small>ID: {{ row.from_client_id || '-' }}</small>
            </div>

            <div class="transfer-arrow">
              <Icon name="lucide:arrow-right-left" size="18" />
            </div>

            <div class="transfer-cell transfer-party">
              <span>{{ copy.to }}</span>
              <strong>{{ clientName(row.to_client, row.to_client_id) }}</strong>
              <small>ID: {{ row.to_client_id || '-' }}</small>
            </div>
          </div>

          <div class="transfer-footer">
            <div class="footer-chip">
              <Icon name="lucide:user-round-cog" size="14" />
              <span>{{ operatorName(row) }}</span>
            </div>
            <div class="footer-chip">
              <Icon name="lucide:clock-3" size="14" />
              <span>{{ formatDateTime(row.created_at) }}</span>
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
import { computed, ref, watch } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'
import { cpNativePageCopy } from '../../constants/cp-native-copy'

definePageMeta({
  layout: 'cp',
})

const copy = useCpCopy(cpNativePageCopy.transfers)

useHead({
  title: computed(() => `${copy.value.headTitle} - MyCafeCloud CP`),
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

let searchTimer: number | null = null

function money(value: any) {
  return formatMoney(Number(value || 0))
}

function clientName(client: any, fallbackId: any) {
  return client?.login || client?.phone || fallbackId || copy.value.unknownClient
}

function operatorName(row: any) {
  return row.operator?.login || row.operator?.name || row.operator_id || copy.value.unknownOperator
}

const refreshedAtLabel = computed(() => (refreshedAt.value ? formatDateTime(refreshedAt.value) : '-'))
const filteredRows = computed(() => rows.value)
const pageAmount = computed(() => filteredRows.value.reduce((sum, row) => sum + Number(row.amount || 0), 0))
const uniqueClientCount = computed(() => {
  const ids = new Set<string>()
  for (const row of filteredRows.value) {
    if (row.from_client_id != null) ids.add(`from-${row.from_client_id}`)
    if (row.to_client_id != null) ids.add(`to-${row.to_client_id}`)
  }
  return ids.size
})

async function load(nextPage = 1) {
  loading.value = true
  try {
    const response = await cpApi.transfersList({
      page: nextPage,
      per_page: perPage.value,
      q: search.value || undefined,
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

watch(search, () => {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    load(1)
  }, 250)
})

load(1)
</script>

<style scoped>
.transfers-page,
.stats-grid,
.hero-actions {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.hero-actions {
  grid-template-columns: minmax(260px, 360px) auto;
  align-items: center;
  gap: 10px;
}

.search-field {
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

.search-field input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 13px;
}

.transfers-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: stretch;
  justify-content: flex-start;
}

.transfer-card {
  display: grid;
  gap: 12px;
  width: min(100%, 360px);
  min-height: 196px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.transfer-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.amount-block {
  display: grid;
  gap: 6px;
}

.amount-block span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.amount-block strong {
  font-size: 20px;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.shift-chip,
.pager-chip,
.footer-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-faint);
}

.transfer-body {
  display: flex;
  align-items: center;
  gap: 8px;
}

.transfer-arrow {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  color: var(--brand-secondary);
}

.transfer-cell {
  display: grid;
  gap: 4px;
}

.transfer-party {
  flex: 1 1 0;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface);
}

.transfer-cell span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.transfer-cell strong {
  font-size: 14px;
  line-height: 1.2;
}

.transfer-cell small {
  font-size: 11px;
  color: var(--text-muted);
}

.transfer-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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
  min-height: 180px;
  opacity: 0.72;
  animation: pulse 1.2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 0.52; }
  50% { opacity: 0.9; }
}

@media (max-width: 1100px) {
  .hero-actions,
  .stats-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .transfer-card {
    width: 100%;
  }

  .transfer-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .transfer-arrow {
    margin: 0 auto;
  }
}
</style>
