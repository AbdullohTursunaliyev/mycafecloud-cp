<template>
  <div class="clients-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="meta-chip">{{ copy.updatedAt }}: {{ updatedAtLabel }}</span>
        <span class="meta-chip">{{ currentRangeLabel }}</span>
      </template>
      <template #actions>
        <div class="hero-tools">
          <label class="hero-search">
            <Icon name="lucide:search" size="16" />
            <input v-model="searchInput" class="field-input" :placeholder="copy.searchPlaceholder" />
          </label>
          <label class="hero-select">
            <Icon name="lucide:filter" size="16" />
            <select v-model="statusFilter" class="field-input select-input">
              <option value="all">{{ copy.statusAll }}</option>
              <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <button v-if="searchInput" class="ghost-btn" type="button" @click="clearSearch">{{ copy.clearSearch }}</button>
          <button class="ghost-btn" type="button" :disabled="loading" @click="reload(page)">
            {{ loading ? copy.refreshing : copy.refresh }}
          </button>
          <button class="primary-btn" type="button" @click="createOpen = true">{{ copy.addClient }}</button>
        </div>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard :label="copy.totalClients" :value="String(meta.total)" :hint="currentRangeLabel" tone="tone-blue" compact />
      <CpStatCard :label="copy.selectedClients" :value="String(selected.length)" :hint="selectedPhonesLabel" tone="tone-amber" compact />
      <CpStatCard :label="copy.pageBalance" :value="`${formatMoney(pageBalance)} UZS`" :hint="copy.currentPage" tone="tone-green" compact />
      <CpStatCard :label="copy.pageBonus" :value="`${formatMoney(pageBonus)} UZS`" :hint="copy.currentPage" tone="tone-rose" compact />
    </div>

    <CpPanelCard :title="copy.tableTitle" :subtitle="copy.tableSubtitle">
      <template #actions>
        <div class="row gap">
          <span class="meta-chip">{{ copy.pageLabel }} {{ meta.current_page }} / {{ meta.last_page }}</span>
          <button class="ghost-btn small" type="button" :disabled="!selected.length" @click="clearSelection">
            {{ copy.clearSelection }}
          </button>
        </div>
      </template>

      <div v-if="selected.length" class="selection-bar">
        <div><strong>{{ selected.length }}</strong> {{ copy.selectedClients.toLowerCase() }}</div>
        <div class="row gap">
          <button class="primary-btn small" type="button" @click="openBulkTopup">{{ copy.bulkTopup }}</button>
          <button class="ghost-btn small" type="button" @click="clearSelection">{{ copy.clearSelection }}</button>
        </div>
      </div>

      <div class="table-shell">
        <div v-if="loading" class="state-box">
          <div class="loader-grid"><span v-for="i in 8" :key="i" class="loader-card" /></div>
        </div>
        <div v-else-if="!visibleClients.length" class="state-box">
          <ElEmpty :description="copy.noRows" />
        </div>
        <div v-else class="table-scroll">
          <table class="clients-grid clients-table">
            <thead>
              <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                <th
                  v-for="header in headerGroup.headers"
                  :key="header.id"
                  :style="{ width: `${header.getSize()}px` }"
                >
                  <FlexRender
                    v-if="!header.isPlaceholder"
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in table.getRowModel().rows" :key="row.id">
                <td
                  v-for="cell in row.getVisibleCells()"
                  :key="cell.id"
                  :style="{ width: `${cell.column.getSize()}px` }"
                >
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="pager">
        <div class="row gap"><span class="muted">{{ copy.totalLabel }}</span><strong>{{ meta.total }}</strong></div>
        <div class="row gap">
          <button class="ghost-btn small" type="button" :disabled="loading || page <= 1" @click="go(page - 1)">{{ copy.prev }}</button>
          <span class="meta-chip">{{ meta.current_page }} / {{ meta.last_page }}</span>
          <button class="ghost-btn small" type="button" :disabled="loading || page >= meta.last_page" @click="go(page + 1)">{{ copy.next }}</button>
        </div>
      </div>
    </CpPanelCard>

    <ClientFormModal v-if="createOpen" :open="createOpen" @close="createOpen = false" @created="onCreated" />
    <ClientTopupModal v-if="topupOpen && activeClient" :open="topupOpen" :client="activeClient" @close="topupOpen = false" @done="onTopupDone" />
    <ClientHistoryDrawer v-if="historyOpen && historyClient" :open="historyOpen" :client="historyClient" @close="closeHistory" />
    <ClientSessionsDrawer v-if="sessionsOpen && sessionsClient" :open="sessionsOpen" :client="sessionsClient" @close="closeSessions" />
    <ClientPackageModal v-if="packageOpen && packageClient" :open="packageOpen" :client="packageClient" @close="closePackage" @done="onPackageDone" />
    <ClientPackagesDrawer v-if="packagesOpen && packagesClient" :open="packagesOpen" :client="packagesClient" @close="closePackages" />
    <ClientSubscribeModal v-if="subscribeOpen && subscribeClient" :open="subscribeOpen" :client="subscribeClient" :zones="zones" @close="closeSubscribe" @done="onSubscribeDone" />
    <ClientSubscriptionsDrawer v-if="subsOpen && subsClient" :open="subsOpen" :client="subsClient" @close="closeSubs" />
    <ClientReturnModal v-if="returnOpen && returnClient" :open="returnOpen" :client="returnClient" @close="closeReturn" @done="onReturnDone" />
    <ClientTransferModal v-if="transferOpen && transferClient" :open="transferOpen" :client="transferClient" @close="closeTransfer" @done="onTransferDone" />

    <ElDialog v-model="ranksOpen" :title="copy.ranks.title" width="760px" top="7vh" class="cp-dialog cp-dialog--ranks">
      <div v-if="ranksClient" class="ranks-box">
        <div class="summary-grid">
          <div class="mini-card"><span>{{ copy.ranks.lifetime }}</span><strong>{{ formatMoney(lifetimeOf(ranksClient)) }} UZS</strong></div>
          <div class="mini-card"><span>{{ copy.ranks.nextTarget }}</span><strong>{{ nextTierForRanks ? `${formatMoney(remainToNext(ranksClient))} UZS` : copy.ranks.max }}</strong></div>
        </div>
        <div class="rank-list">
          <article v-for="tier in clientTiers" :key="tier.key" class="rank-row">
            <div class="rank-title">
              <Icon :name="tier.icon" size="16" />
              <div>
                <strong>{{ tierName(tier.key) }}</strong>
                <small>{{ formatMoney(tier.min) }} UZS</small>
              </div>
            </div>
            <div>
              <div class="rank-bar"><div class="rank-bar-in" :style="rankBarStyle(tier)" /></div>
              <p class="muted">{{ rankLabel(tier) }}</p>
            </div>
          </article>
        </div>
      </div>
    </ElDialog>

    <ElDialog v-model="bulkOpen" :title="copy.bulk.title" width="760px" top="8vh" class="cp-dialog cp-dialog--bulk">
      <div class="bulk-box">
        <div class="bulk-headline">
          <div class="bulk-meta">
            <span class="bulk-kicker">
              <Icon name="lucide:users" size="14" />
              {{ txt(copy.bulk.subtitle, { count: selected.length }) }}
            </span>
            <div class="bulk-logins" v-if="selectedRows.length">
              <span v-for="row in selectedRows.slice(0, 8)" :key="row._key" class="bulk-login-chip">
                <Icon name="lucide:user-round" size="13" />
                {{ row.login }}
              </span>
              <span v-if="selectedRows.length > 8" class="bulk-login-chip">+{{ selectedRows.length - 8 }}</span>
            </div>
          </div>
          <div class="bulk-summary-grid">
            <div class="bulk-summary-card">
              <span>{{ copy.selectedClients }}</span>
              <strong>{{ selected.length }}</strong>
            </div>
            <div class="bulk-summary-card">
              <span>{{ copy.bulk.amount }}</span>
              <strong>{{ bulkAmount ? `${formatMoney(bulkAmount).replace(/\./g, ' ')} UZS` : '0 UZS' }}</strong>
            </div>
          </div>
        </div>
        <div class="bulk-promo-slot">
          <div v-if="bulkPromoLoading" class="promo-card promo-card-muted">
            <strong>{{ copy.bulk.loadingPromo }}</strong>
            <span>...</span>
          </div>
          <div v-else-if="bulkPromoError" class="promo-card promo-card-error">
            <strong>{{ copy.bulk.failed }}</strong>
            <span>{{ bulkPromoError }}</span>
          </div>
          <div v-else-if="bulkMethod !== 'cash'" class="promo-card promo-card-muted">
            <strong>{{ copy.bulk.card }}</strong>
            <span>{{ copy.currentPage }}</span>
          </div>
          <div v-else-if="bulkPromo" class="promo-card">
            <strong>{{ copy.bulk.promoActive }}</strong>
            <span>{{ txt(copy.bulk.promoBonus, { value: `${formatMoney(bulkPromoBonus).replace(/\./g, ' ')} UZS` }) }}</span>
          </div>
          <div v-else class="promo-card promo-card-muted">
            <strong>{{ copy.bulk.cash }}</strong>
            <span>{{ copy.noRows }}</span>
          </div>
        </div>
        <div class="bulk-grid">
          <label class="field">
            <span><Icon name="lucide:banknote" size="14" /> {{ copy.bulk.amount }}</span>
            <input v-model="bulkAmountStr" class="field-input" :placeholder="'5 000 000'" inputmode="numeric" @input="onBulkAmountInput" />
          </label>
          <div class="field">
            <span><Icon name="lucide:wallet" size="14" /> {{ copy.bulk.method }}</span>
            <div class="bulk-methods">
              <button class="method-btn" :class="{ active: bulkMethod === 'cash' }" type="button" @click="bulkMethod = 'cash'">
                <Icon name="lucide:banknote" size="16" />
                {{ copy.bulk.cash }}
              </button>
              <button class="method-btn" :class="{ active: bulkMethod === 'card' }" type="button" @click="bulkMethod = 'card'">
                <Icon name="lucide:credit-card" size="16" />
                {{ copy.bulk.card }}
              </button>
            </div>
          </div>
          <label v-if="canBulkBonus" class="field field-wide">
            <span><Icon name="lucide:gift" size="14" /> {{ copy.bulk.bonus }}</span>
            <input v-model="bulkBonusStr" class="field-input" :placeholder="'0'" inputmode="numeric" @input="onBulkBonusInput" />
          </label>
        </div>
        <div class="row gap end">
          <button class="ghost-btn" type="button" @click="closeBulkTopup">{{ copy.bulk.cancel }}</button>
          <button class="primary-btn" type="button" :disabled="bulkSubmitting || bulkAmount <= 0" @click="submitBulkTopup">
            {{ bulkSubmitting ? copy.refreshing : copy.bulk.apply }}
          </button>
        </div>
        <p v-if="bulkError" class="inline-error">{{ bulkError }}</p>
      </div>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'cp',
})

import { MoreFilled } from '@element-plus/icons-vue'
import {
  ElCheckbox,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElIcon,
  ElMessage,
} from 'element-plus'
import { FlexRender, createColumnHelper, getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { computed, defineAsyncComponent, h, onBeforeUnmount, onMounted, ref, resolveComponent, watch } from 'vue'
import { cpClientsPageCopy } from '../../constants/cp-clients-copy'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpClientTiers } from '../../../composables/useCpClientTiers'
import { useCpFormatters } from '../../../composables/useCpFormatters'
import { cpApi } from '@legacy/api/cp'
import { hasRole, useCpAuthStore } from '@legacy/stores/cpAuth'

const ClientFormModal = defineAsyncComponent(() => import('@legacy/components/cp/ClientFormModal.vue'))
const ClientHistoryDrawer = defineAsyncComponent(() => import('@legacy/components/cp/ClientHistoryDrawer.vue'))
const ClientPackageModal = defineAsyncComponent(() => import('@legacy/components/cp/ClientPackageModal.vue'))
const ClientPackagesDrawer = defineAsyncComponent(() => import('@legacy/components/cp/ClientPackagesDrawer.vue'))
const ClientReturnModal = defineAsyncComponent(() => import('@legacy/components/cp/ClientReturnModal.vue'))
const ClientSessionsDrawer = defineAsyncComponent(() => import('@legacy/components/cp/ClientSessionsDrawer.vue'))
const ClientSubscribeModal = defineAsyncComponent(() => import('@legacy/components/cp/ClientSubscribeModal.vue'))
const ClientSubscriptionsDrawer = defineAsyncComponent(() => import('@legacy/components/cp/ClientSubscriptionsDrawer.vue'))
const ClientTopupModal = defineAsyncComponent(() => import('@legacy/components/cp/ClientTopupModal.vue'))
const ClientTransferModal = defineAsyncComponent(() => import('@legacy/components/cp/ClientTransferModal.vue'))

type ClientRow = {
  id: number | string
  _key: string
  login: string
  username?: string
  name?: string
  phone?: string
  account_id?: string | number | null
  created_at?: string | null
  balance: number
  bonus: number
  lifetime_topup?: number
  lifetime_total?: number
  status?: string | null
  is_blocked?: boolean
  _status: string
  raw: Record<string, any>
}

type ZoneRow = Record<string, any>

const auth = useCpAuthStore()
const copy = useCpCopy(cpClientsPageCopy)
const { formatMoney, formatDateTime } = useCpFormatters()
const { clientTiers, lifetimeOf, getTier, getNextTier, remainToNext, progressToNext } = useCpClientTiers()
const NuxtIcon = resolveComponent('Icon')

const loading = ref(false)
const updatedAt = ref<string>('')
const clients = ref<ClientRow[]>([])
const zones = ref<ZoneRow[]>([])
const searchInput = ref('')
const search = ref('')
const statusFilter = ref('all')
const page = ref(1)
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 20 })
const selected = ref<string[]>([])

const createOpen = ref(false)
const topupOpen = ref(false)
const historyOpen = ref(false)
const sessionsOpen = ref(false)
const packageOpen = ref(false)
const packagesOpen = ref(false)
const subscribeOpen = ref(false)
const subsOpen = ref(false)
const returnOpen = ref(false)
const transferOpen = ref(false)
const ranksOpen = ref(false)
const bulkOpen = ref(false)

const activeClient = ref<ClientRow | null>(null)
const historyClient = ref<ClientRow | null>(null)
const sessionsClient = ref<ClientRow | null>(null)
const packageClient = ref<ClientRow | null>(null)
const packagesClient = ref<ClientRow | null>(null)
const subscribeClient = ref<ClientRow | null>(null)
const subsClient = ref<ClientRow | null>(null)
const returnClient = ref<ClientRow | null>(null)
const transferClient = ref<ClientRow | null>(null)
const ranksClient = ref<ClientRow | null>(null)

const bulkAmountStr = ref('')
const bulkBonusStr = ref('')
const bulkMethod = ref('cash')
const bulkSubmitting = ref(false)
const bulkError = ref('')
const bulkPromoLoading = ref(false)
const bulkPromo = ref<Record<string, any> | null>(null)
const bulkPromoError = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null

function txt(template: string, values: Record<string, string | number>) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))
}

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/[^\d]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatInputNumber(value: unknown) {
  const digits = String(value ?? '').replace(/[^\d]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')
}

function keyOf(value: unknown) {
  return String(value ?? '')
}

function normalizeStatus(row: Record<string, any>) {
  const status = String(row?.status ?? row?.state ?? row?.client_status ?? '').toLowerCase()
  if (row?.is_blocked || status.includes('block')) return 'blocked'
  if (status.includes('expire')) return 'expired'
  if (status.includes('active')) return 'active'
  if (status.includes('inactive') || status.includes('disable')) return 'inactive'
  return 'inactive'
}

function normalizeClient(row: Record<string, any>): ClientRow {
  return {
    id: row?.id,
    _key: keyOf(row?.id),
    login: row?.login || row?.phone || row?.username || '-',
    username: row?.username || '',
    name: row?.name || '',
    phone: row?.phone || '',
    account_id: row?.account_id ?? null,
    created_at: row?.created_at || null,
    balance: Number(row?.balance || 0),
    bonus: Number(row?.bonus || 0),
    lifetime_topup: Number(row?.lifetime_topup ?? row?.lifetime_total ?? 0),
    lifetime_total: Number(row?.lifetime_total ?? row?.lifetime_topup ?? 0),
    status: row?.status ?? null,
    is_blocked: Boolean(row?.is_blocked),
    _status: normalizeStatus(row),
    raw: row,
  }
}

const statusOptions = computed(() => [
  { value: 'active', label: copy.value.statuses.active },
  { value: 'blocked', label: copy.value.statuses.blocked },
  { value: 'inactive', label: copy.value.statuses.inactive },
  { value: 'expired', label: copy.value.statuses.expired },
])

const visibleClients = computed(() => {
  if (statusFilter.value === 'all') return clients.value
  return clients.value.filter((client) => client._status === statusFilter.value)
})

const selectedSet = computed(() => new Set(selected.value))
const selectedRows = computed(() => visibleClients.value.filter((row) => selectedSet.value.has(row._key)))
const selectedClientIds = computed(() => selectedRows.value.map((row) => row.id))
const allVisibleSelected = computed(() => visibleClients.value.length > 0 && visibleClients.value.every((row) => selectedSet.value.has(row._key)))

const pageBalance = computed(() => visibleClients.value.reduce((sum, row) => sum + Number(row.balance || 0), 0))
const pageBonus = computed(() => visibleClients.value.reduce((sum, row) => sum + Number(row.bonus || 0), 0))
const updatedAtLabel = computed(() => (updatedAt.value ? formatDateTime(updatedAt.value) : '-'))
const currentRangeLabel = computed(() => {
  if (!visibleClients.value.length) return txt(copy.value.resultRange, { from: 0, to: 0, total: meta.value.total })
  const from = (meta.value.current_page - 1) * meta.value.per_page + 1
  const to = from + visibleClients.value.length - 1
  return txt(copy.value.resultRange, { from, to, total: meta.value.total })
})
const selectedPhonesLabel = computed(() => {
  if (!selectedRows.value.length) return copy.value.currentPage
  return selectedRows.value.slice(0, 3).map((row) => row.phone || row.login || keyOf(row.id)).join(', ')
})

const canBulkBonus = computed(() => hasRole(auth.operator, ['admin', 'owner']))
const bulkAmount = computed(() => toNumber(bulkAmountStr.value))
const bulkBonus = computed(() => (canBulkBonus.value ? toNumber(bulkBonusStr.value) : 0))
const bulkPromoBonus = computed(() => {
  if (!bulkPromo.value || bulkMethod.value !== 'cash') return 0
  return bulkPromo.value?.type === 'double_topup' && bulkAmount.value > 0 ? bulkAmount.value : 0
})

const nextTierForRanks = computed(() => (ranksClient.value ? getNextTier(ranksClient.value) : null))

function tierName(key: string) {
  const names = copy.value.ranks.names as Record<string, string>
  return names?.[key] || key
}

function statusText(row: ClientRow) {
  const map = copy.value.statuses as Record<string, string>
  return map[row._status] || copy.value.noStatus
}

function clearSelection() {
  selected.value = []
}

function clearSearch() {
  searchInput.value = ''
  search.value = ''
  page.value = 1
  reload(1)
}

function toggleRowSelection(row: ClientRow, checked: boolean) {
  if (checked) {
    if (!selectedSet.value.has(row._key)) selected.value = [...selected.value, row._key]
    return
  }
  selected.value = selected.value.filter((key) => key !== row._key)
}

function toggleAllVisible(checked: boolean) {
  if (checked) {
    selected.value = visibleClients.value.map((row) => row._key)
    return
  }
  clearSelection()
}

function openTopup(client: ClientRow) {
  activeClient.value = client
  topupOpen.value = true
}

function openHistory(client: ClientRow) {
  historyClient.value = client
  historyOpen.value = true
}

function closeHistory() {
  historyOpen.value = false
  historyClient.value = null
}

function openSessions(client: ClientRow) {
  sessionsClient.value = client
  sessionsOpen.value = true
}

function closeSessions() {
  sessionsOpen.value = false
  sessionsClient.value = null
}

function openPackage(client: ClientRow) {
  packageClient.value = client
  packageOpen.value = true
}

function closePackage() {
  packageOpen.value = false
  packageClient.value = null
}

function openPackages(client: ClientRow) {
  packagesClient.value = client
  packagesOpen.value = true
}

function closePackages() {
  packagesOpen.value = false
  packagesClient.value = null
}

function openSubscribe(client: ClientRow) {
  subscribeClient.value = client
  subscribeOpen.value = true
  if (!zones.value.length) {
    loadZonesSafe()
  }
}

function closeSubscribe() {
  subscribeOpen.value = false
  subscribeClient.value = null
}

function openSubs(client: ClientRow) {
  subsClient.value = client
  subsOpen.value = true
}

function closeSubs() {
  subsOpen.value = false
  subsClient.value = null
}

function openReturn(client: ClientRow) {
  returnClient.value = client
  returnOpen.value = true
}

function closeReturn() {
  returnOpen.value = false
  returnClient.value = null
}

function openTransfer(client: ClientRow) {
  transferClient.value = client
  transferOpen.value = true
}

function closeTransfer() {
  transferOpen.value = false
  transferClient.value = null
}

function openRanks(client: ClientRow) {
  ranksClient.value = client
  ranksOpen.value = true
}

function go(nextPage: number) {
  page.value = nextPage
  reload(nextPage)
}

async function loadZonesSafe() {
  try {
    const response = await cpApi.zoneList({ page: 1, per_page: 200, active: 1 })
    const payload = response?.data?.data ?? response?.data ?? {}
    zones.value = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
  } catch {
    zones.value = []
  }
}

async function reload(nextPage = page.value) {
  loading.value = true
  try {
    const response = await cpApi.clients({ search: search.value || '', page: nextPage })
    const payload = response?.data?.data ?? response?.data ?? {}
    const rows = Array.isArray(payload?.data) ? payload.data : []
    clients.value = rows.map(normalizeClient)
    meta.value = {
      current_page: Number(payload?.current_page || 1),
      last_page: Number(payload?.last_page || 1),
      total: Number(payload?.total || rows.length),
      per_page: Number(payload?.per_page || 20),
    }
    page.value = meta.value.current_page
    updatedAt.value = new Date().toISOString()
    const currentKeys = new Set(clients.value.map((row) => row._key))
    selected.value = selected.value.filter((key) => currentKeys.has(key))
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Clients could not be loaded.')
  } finally {
    loading.value = false
  }
}

function onCreated() {
  createOpen.value = false
  page.value = 1
  reload(1)
}

async function onTopupDone(payload?: Record<string, any>) {
  const clientId = keyOf(payload?.client_id ?? payload?.id ?? activeClient.value?.id)
  topupOpen.value = false
  activeClient.value = null
  if (clientId) {
    const index = clients.value.findIndex((row) => row._key === clientId)
    if (index !== -1) {
      const current = clients.value[index]
      clients.value.splice(index, 1, normalizeClient({
        ...current.raw,
        ...payload,
        id: current.id,
        balance: payload?.balance ?? current.balance,
        bonus: payload?.bonus ?? current.bonus,
        lifetime_topup: payload?.lifetime_topup ?? current.lifetime_topup,
      }))
    }
  }
  await reload(page.value)
}

function onPackageDone(payload?: Record<string, any>) {
  const updatedClient = payload?.client
  if (!updatedClient?.id) {
    reload(page.value)
    return
  }
  const key = keyOf(updatedClient.id)
  const index = clients.value.findIndex((row) => row._key === key)
  if (index !== -1) {
    clients.value.splice(index, 1, normalizeClient({ ...clients.value[index].raw, ...updatedClient }))
  } else {
    reload(page.value)
  }
}

function onSubscribeDone(payload?: Record<string, any>) {
  const updatedClient = payload?.client
  if (!updatedClient?.id) {
    reload(page.value)
    return
  }
  const key = keyOf(updatedClient.id)
  const index = clients.value.findIndex((row) => row._key === key)
  if (index !== -1) {
    clients.value.splice(index, 1, normalizeClient({ ...clients.value[index].raw, ...updatedClient }))
  } else {
    reload(page.value)
  }
}

function onReturnDone() {
  closeReturn()
  reload(page.value)
}

function onTransferDone(payload?: Record<string, any>) {
  closeTransfer()
  const sender = payload?.sender
  const receiver = payload?.receiver
  if (sender?.id) {
    const index = clients.value.findIndex((row) => row._key === keyOf(sender.id))
    if (index !== -1) clients.value.splice(index, 1, normalizeClient({ ...clients.value[index].raw, ...sender }))
  }
  if (receiver?.id) {
    const index = clients.value.findIndex((row) => row._key === keyOf(receiver.id))
    if (index !== -1) clients.value.splice(index, 1, normalizeClient({ ...clients.value[index].raw, ...receiver }))
  }
  if (!sender?.id && !receiver?.id) reload(page.value)
}

function openBulkTopup() {
  if (!selectedClientIds.value.length) return
  bulkOpen.value = true
  bulkAmountStr.value = ''
  bulkBonusStr.value = ''
  bulkMethod.value = 'cash'
  bulkError.value = ''
  bulkPromo.value = null
  bulkPromoError.value = ''
  fetchBulkPromo()
}

function closeBulkTopup() {
  bulkOpen.value = false
  bulkSubmitting.value = false
  bulkError.value = ''
}

function onBulkAmountInput() {
  bulkAmountStr.value = formatInputNumber(bulkAmountStr.value)
}

function onBulkBonusInput() {
  bulkBonusStr.value = formatInputNumber(bulkBonusStr.value)
}

async function fetchBulkPromo() {
  if (!bulkOpen.value) return
  if (bulkMethod.value !== 'cash') {
    bulkPromoLoading.value = false
    bulkPromo.value = null
    bulkPromoError.value = ''
    return
  }
  bulkPromoLoading.value = true
  bulkPromoError.value = ''
  try {
    const response = await cpApi.promotionActiveForTopup({ payment_method: bulkMethod.value })
    bulkPromo.value = response?.data?.data ?? null
  } catch (error: any) {
    bulkPromo.value = null
    bulkPromoError.value = error?.response?.data?.message || copy.value.bulk.failed
  } finally {
    bulkPromoLoading.value = false
  }
}

async function submitBulkTopup() {
  if (!selectedClientIds.value.length) return
  bulkSubmitting.value = true
  bulkError.value = ''
  try {
    await cpApi.bulkTopup({
      client_ids: selectedClientIds.value,
      amount: bulkAmount.value,
      payment_method: bulkMethod.value,
      bonus_amount: bulkBonus.value || undefined,
    })
    ElMessage.success(copy.value.bulk.apply)
    closeBulkTopup()
    clearSelection()
    await reload(page.value)
  } catch (error: any) {
    bulkError.value = error?.response?.data?.message || copy.value.bulk.failed
  } finally {
    bulkSubmitting.value = false
  }
}

function rankBarStyle(tier: { color: string; key: string }) {
  if (!ranksClient.value) return { width: '0%', background: tier.color }
  const current = getTier(ranksClient.value)
  const currentIndex = clientTiers.findIndex((item) => item.key === current.key)
  const tierIndex = clientTiers.findIndex((item) => item.key === tier.key)
  if (tierIndex < currentIndex) return { width: '100%', background: tier.color }
  if (tierIndex > currentIndex) return { width: '0%', background: tier.color }
  return { width: `${progressToNext(ranksClient.value)}%`, background: tier.color }
}

function rankLabel(tier: { key: string }) {
  if (!ranksClient.value) return ''
  const current = getTier(ranksClient.value)
  const currentIndex = clientTiers.findIndex((item) => item.key === current.key)
  const tierIndex = clientTiers.findIndex((item) => item.key === tier.key)
  if (tierIndex < currentIndex) return copy.value.ranks.completed
  if (tierIndex > currentIndex) return copy.value.ranks.pending
  const next = getNextTier(ranksClient.value)
  if (!next) return copy.value.ranks.max
  return txt(copy.value.ranks.left, { value: `${formatMoney(remainToNext(ranksClient.value))} UZS` })
}

function moreActions() {
  return [
    { key: 'sessions', label: copy.value.actions.sessions },
    { key: 'package', label: copy.value.actions.package },
    { key: 'packages', label: copy.value.actions.packages },
    { key: 'subscribe', label: copy.value.actions.subscribe },
    { key: 'subscriptions', label: copy.value.actions.subscriptions },
    { key: 'returns', label: copy.value.actions.returns },
    { key: 'transfer', label: copy.value.actions.transfer },
    { key: 'ranks', label: copy.value.actions.ranks },
  ]
}

function onRowCommand(command: string, row: ClientRow) {
  if (command === 'topup') openTopup(row)
  if (command === 'history') openHistory(row)
  if (command === 'ranks') openRanks(row)
  if (command === 'sessions') openSessions(row)
  if (command === 'package') openPackage(row)
  if (command === 'packages') openPackages(row)
  if (command === 'subscribe') openSubscribe(row)
  if (command === 'subscriptions') openSubs(row)
  if (command === 'returns') openReturn(row)
  if (command === 'transfer') openTransfer(row)
}

function renderClientCell({ rowData }: { rowData: ClientRow }) {
  return h('div', { class: 'client-cell' }, [
    h('div', { class: 'client-headline' }, [
      h('strong', rowData.login),
      rowData.account_id ? h('span', { class: 'client-chip' }, `${copy.value.table.account}: ${rowData.account_id}`) : null,
    ]),
    h('div', { class: 'client-meta' }, [
      h('span', `${copy.value.table.created}: ${formatDateTime(rowData.created_at)}`),
      h('span', rowData.phone || copy.value.noPhone),
    ]),
  ])
}

function renderTierCell({ rowData }: { rowData: ClientRow }) {
  const tier = getTier(rowData)
  return h('div', { class: 'tier-pill', style: { '--tier-color': tier.color } }, [
    h(NuxtIcon as any, { name: tier.icon, size: '14', class: 'tier-icon' }),
    h('span', tierName(tier.key)),
  ])
}

function renderMoneyCell(value: number) {
  return h('div', { class: 'money-cell' }, [h('strong', formatMoney(value)), h('span', 'UZS')])
}

function renderStatusCell({ rowData }: { rowData: ClientRow }) {
  return h('span', { class: `status-pill status-${rowData._status}` }, statusText(rowData))
}

function renderActionsCell({ rowData }: { rowData: ClientRow }) {
  return h('div', { class: 'actions-cell' }, [
    h('button', { class: 'table-btn table-btn-primary', type: 'button', onClick: () => openTopup(rowData) }, copy.value.actions.topup),
    h('button', { class: 'table-btn', type: 'button', onClick: () => openHistory(rowData) }, copy.value.actions.history),
    h(
      ElDropdown,
      { trigger: 'click', onCommand: (command: string) => onRowCommand(command, rowData) },
      {
        default: () => h('button', { class: 'table-btn icon-only', type: 'button' }, [h(ElIcon, null, { default: () => h(MoreFilled) })]),
        dropdown: () => h(ElDropdownMenu, null, () => moreActions().map((item) => h(ElDropdownItem, { command: item.key }, () => item.label))),
      },
    ),
  ])
}

const columnHelper = createColumnHelper<ClientRow>()

const columns = computed(() => [
  columnHelper.display({
    id: 'select',
    size: 58,
    header: () => h('div', { class: 'checkbox-wrap' }, [
      h(ElCheckbox, {
        modelValue: allVisibleSelected.value,
        'onUpdate:modelValue': (value: boolean) => toggleAllVisible(Boolean(value)),
      }),
    ]),
    cell: ({ row }) => h('div', { class: 'checkbox-wrap' }, [
      h(ElCheckbox, {
        modelValue: selectedSet.value.has(row.original._key),
        'onUpdate:modelValue': (value: boolean) => toggleRowSelection(row.original, Boolean(value)),
      }),
    ]),
  }),
  columnHelper.accessor('login', {
    id: 'client',
    size: 348,
    header: () => copy.value.table.client,
    cell: ({ row }) => renderClientCell({ rowData: row.original }),
  }),
  columnHelper.display({
    id: 'tier',
    size: 182,
    header: () => copy.value.table.tier,
    cell: ({ row }) => renderTierCell({ rowData: row.original }),
  }),
  columnHelper.accessor('balance', {
    id: 'balance',
    size: 176,
    header: () => copy.value.table.balance,
    cell: ({ getValue }) => renderMoneyCell(Number(getValue() || 0)),
  }),
  columnHelper.accessor('bonus', {
    id: 'bonus',
    size: 176,
    header: () => copy.value.table.bonus,
    cell: ({ getValue }) => renderMoneyCell(Number(getValue() || 0)),
  }),
  columnHelper.accessor('_status', {
    id: 'status',
    size: 144,
    header: () => copy.value.table.status,
    cell: ({ row }) => renderStatusCell({ rowData: row.original }),
  }),
  columnHelper.display({
    id: 'actions',
    size: 272,
    header: () => copy.value.table.actions,
    cell: ({ row }) => renderActionsCell({ rowData: row.original }),
  }),
])

const table = useVueTable({
  get data() {
    return visibleClients.value
  },
  get columns() {
    return columns.value
  },
  getCoreRowModel: getCoreRowModel(),
})

watch(searchInput, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
    page.value = 1
    reload(1)
  }, 260)
})

watch(statusFilter, () => {
  const allowed = new Set(visibleClients.value.map((row) => row._key))
  selected.value = selected.value.filter((key) => allowed.has(key))
})

watch([bulkMethod, bulkOpen], async ([, open]) => {
  if (open) await fetchBulkPromo()
})

watch(visibleClients, () => {
  const allowed = new Set(visibleClients.value.map((row) => row._key))
  selected.value = selected.value.filter((key) => allowed.has(key))
})

onMounted(async () => {
  await reload(1)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.clients-page { display: flex; flex-direction: column; gap: 20px; }
.hero-tools { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.hero-search,
.hero-select { position: relative; display: flex; align-items: center; gap: 8px; min-width: 240px; padding: 0 14px; border-radius: 16px; border: 1px solid var(--stroke); background: var(--surface-soft); }
.field-input { width: 100%; min-height: 44px; border: none; outline: none; background: transparent; color: var(--text); font: inherit; }
.field-input::placeholder { color: var(--text-faint); }
.select-input { padding-right: 8px; }
.meta-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--stroke); background: var(--surface-soft); color: var(--text-muted); font-size: 12px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.selection-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; padding: 14px 16px; border-radius: 18px; border: 1px solid rgba(245, 158, 11, 0.22); background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.04)); }
.table-shell { overflow: hidden; border-radius: 22px; border: 1px solid var(--stroke); background: linear-gradient(180deg, var(--surface-strong), var(--surface)); }
.table-scroll { width: 100%; overflow: auto; }
.clients-table { width: 100%; min-width: 1180px; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
.clients-table thead th { position: sticky; top: 0; z-index: 1; padding: 14px 12px; background: var(--surface-soft); border-bottom: 1px solid var(--stroke); text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); }
.clients-table tbody tr { background: color-mix(in srgb, var(--surface) 88%, transparent); }
.clients-table tbody tr:nth-child(even) { background: color-mix(in srgb, var(--surface-soft) 92%, transparent); }
.clients-table tbody tr:hover { background: color-mix(in srgb, var(--brand-secondary) 10%, var(--surface-soft)); }
.clients-table td { padding: 0 12px; vertical-align: middle; border-bottom: 1px solid var(--stroke); color: var(--text); }
.clients-table th:first-child,
.clients-table td:first-child { padding-left: 16px; }
.clients-table th:last-child,
.clients-table td:last-child { padding-right: 16px; }
.state-box { min-height: 360px; display: grid; place-items: center; padding: 28px; }
.loader-grid { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.loader-card { height: 88px; border-radius: 20px; border: 1px solid var(--stroke); background: linear-gradient(90deg, var(--surface-soft), var(--surface-muted), var(--surface-soft)); background-size: 200% 100%; animation: skeleton 1.2s linear infinite; }
.pager { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 18px; }
.row.gap { gap: 10px; }
.row.end { justify-content: flex-end; }
.ghost-btn,
.primary-btn,
:deep(.table-btn) { min-height: 42px; padding: 0 16px; border-radius: 14px; border: 1px solid var(--stroke); background: var(--surface-soft); color: var(--text); font-size: 13px; font-weight: 700; font-family: inherit; line-height: 1; transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease; }
.ghost-btn:hover,
.primary-btn:hover,
:deep(.table-btn:hover) { transform: translateY(-1px); border-color: var(--stroke-strong); }
.ghost-btn.small,
.primary-btn.small,
:deep(.table-btn.small) { min-height: 36px; padding: 0 12px; }
.primary-btn,
:deep(.table-btn-primary) { border-color: rgba(79, 140, 255, 0.28); background: linear-gradient(135deg, rgba(79, 140, 255, 0.16), rgba(79, 209, 197, 0.18)); }
:deep(.icon-only) { width: 42px; min-width: 42px; padding: 0; display: inline-grid; place-items: center; }
:deep(.checkbox-wrap) { display: grid; place-items: center; }
:deep(.checkbox-wrap .el-checkbox) { margin: 0; display: inline-grid; place-items: center; }
:deep(.checkbox-wrap .el-checkbox__label) { display: none; }
:deep(.checkbox-wrap .el-checkbox__input) { display: inline-grid; place-items: center; }
:deep(.checkbox-wrap .el-checkbox__inner) {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--brand-secondary) 34%, var(--stroke));
  background: color-mix(in srgb, var(--surface-soft) 94%, var(--surface));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}
:deep(.checkbox-wrap .el-checkbox__input:hover .el-checkbox__inner) {
  border-color: color-mix(in srgb, var(--brand-secondary) 56%, var(--stroke));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 0 0 1px rgba(79, 209, 197, 0.12);
}
:deep(.checkbox-wrap .el-checkbox__input.is-focus .el-checkbox__inner) {
  border-color: color-mix(in srgb, var(--brand-secondary) 58%, var(--stroke));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 0 0 2px rgba(79, 209, 197, 0.12);
}
:deep(.checkbox-wrap .el-checkbox__input.is-checked .el-checkbox__inner),
:deep(.checkbox-wrap .el-checkbox__input.is-indeterminate .el-checkbox__inner) {
  border-color: rgba(79, 209, 197, 0.6);
  background: linear-gradient(135deg, rgba(66, 153, 225, 0.92), rgba(79, 209, 197, 0.92));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 0 0 1px rgba(79, 209, 197, 0.16);
}
:deep(.checkbox-wrap .el-checkbox__input.is-checked .el-checkbox__inner::after) {
  left: 5px;
  top: 1px;
  width: 5px;
  height: 10px;
  border-width: 2px;
}
:deep(.checkbox-wrap .el-checkbox__input.is-indeterminate .el-checkbox__inner::before) {
  top: 7px;
  left: 4px;
  right: 4px;
  height: 2px;
  border-radius: 999px;
}
:deep(.client-cell) { display: flex; flex-direction: column; gap: 6px; padding: 10px 10px 10px 0; }
:deep(.client-headline) { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; line-height: 1.1; }
:deep(.client-chip) { padding: 4px 8px; border-radius: 999px; border: 1px solid var(--stroke); background: var(--surface-soft); font-size: 11px; color: var(--text-muted); }
:deep(.client-headline strong) { font-size: 15px; font-weight: 800; }
:deep(.client-meta) { display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 11px; line-height: 1.35; color: var(--text-muted); }
:deep(.tier-pill),
:deep(.status-pill) { display: inline-flex; align-items: center; gap: 8px; padding: 7px 11px; border-radius: 999px; border: 1px solid var(--stroke); background: var(--surface-soft); font-size: 11px; font-weight: 700; }
:deep(.tier-pill) { border-color: color-mix(in srgb, var(--tier-color) 45%, var(--stroke)); color: color-mix(in srgb, var(--tier-color) 75%, var(--text)); }
:deep(.tier-icon) { font-size: 14px; }
:deep(.money-cell) { display: flex; flex-direction: column; gap: 4px; }
:deep(.money-cell strong) { font-size: 15px; }
:deep(.money-cell span) { color: var(--text-muted); font-size: 11px; }
:deep(.status-active) { color: var(--success); border-color: rgba(52, 211, 153, 0.26); background: rgba(52, 211, 153, 0.1); }
:deep(.status-blocked) { color: var(--danger); border-color: rgba(251, 113, 133, 0.28); background: rgba(251, 113, 133, 0.1); }
:deep(.status-inactive) { color: var(--text-muted); border-color: var(--stroke); background: var(--surface-soft); }
:deep(.status-expired) { color: var(--accent); border-color: rgba(245, 158, 11, 0.28); background: rgba(245, 158, 11, 0.1); }
:deep(.actions-cell) { display: flex; align-items: center; gap: 6px; }
:deep(.actions-cell .table-btn) { min-height: 36px; padding: 0 14px; border-radius: 12px; font-size: 12px; font-weight: 700; }
:deep(.actions-cell .table-btn.icon-only) { width: 36px; min-width: 36px; padding: 0; }
.ranks-box { display: flex; flex-direction: column; gap: 18px; }
.summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.mini-card,
.promo-card { display: flex; justify-content: space-between; gap: 12px; padding: 16px; border-radius: 18px; border: 1px solid var(--stroke); background: var(--surface-soft); }
.mini-card span,
.promo-card span { color: var(--text-muted); font-size: 13px; }
.rank-list { display: grid; gap: 12px; }
.rank-row { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 16px; padding: 14px 16px; border-radius: 18px; border: 1px solid var(--stroke); background: var(--surface-soft); }
.rank-title { display: flex; align-items: center; gap: 10px; }
.rank-title strong,
.rank-title small { display: block; }
.rank-title small { margin-top: 4px; color: var(--text-muted); }
.rank-bar { height: 12px; border-radius: 999px; background: var(--surface-muted); overflow: hidden; }
.rank-bar-in { height: 100%; border-radius: inherit; }
.bulk-box { display: flex; flex-direction: column; gap: 16px; }
.bulk-headline { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(300px, 340px); gap: 16px; align-items: start; }
.bulk-meta { display: flex; flex-direction: column; gap: 12px; }
.bulk-kicker { display: inline-flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 13px; }
.bulk-logins { display: flex; flex-wrap: wrap; gap: 8px; }
.bulk-login-chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 999px; border: 1px solid var(--stroke); background: var(--surface-soft); color: var(--text); font-size: 12px; font-weight: 700; }
.bulk-summary-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.bulk-summary-card { display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: 18px; border: 1px solid var(--stroke); background: var(--surface-soft); }
.bulk-summary-card span { font-size: 12px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.08em; }
.bulk-summary-card strong { font-size: 18px; line-height: 1.15; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bulk-promo-slot { min-height: 76px; }
.bulk-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field span { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); }
.field-wide { grid-column: 1 / -1; }
.inline-error { color: var(--danger); font-size: 13px; }
:deep(.cp-dialog) { border-radius: 26px; overflow: hidden; border: 1px solid var(--stroke); background: linear-gradient(180deg, var(--surface-strong), var(--surface)); box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28); }
:deep(.cp-dialog .el-dialog__header) { margin: 0; padding: 20px 22px 14px; border-bottom: 1px solid var(--stroke); background: transparent; }
:deep(.cp-dialog .el-dialog__title) { color: var(--text); font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
:deep(.cp-dialog .el-dialog__headerbtn) { top: 16px; right: 16px; width: 40px; height: 40px; border-radius: 14px; border: 1px solid var(--stroke); background: var(--surface-soft); transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease; }
:deep(.cp-dialog .el-dialog__headerbtn:hover) { transform: translateY(-1px); border-color: var(--stroke-strong); background: var(--surface-muted); }
:deep(.cp-dialog .el-dialog__close) { color: var(--text-muted); }
:deep(.cp-dialog .el-dialog__body) { padding: 18px 22px 22px; background: transparent; color: var(--text); }
:deep(.cp-dialog .el-dialog__footer) { padding: 0 22px 22px; background: transparent; }
.bulk-box { display: flex; flex-direction: column; gap: 16px; }
.bulk-box :deep(.el-select__wrapper),
.bulk-box select.field-input,
.bulk-box input.field-input { min-height: 48px; padding: 0 14px; border-radius: 16px; border: 1px solid var(--stroke); background: var(--surface-soft); color: var(--text); box-shadow: none; }
.bulk-box select.field-input { appearance: none; }
.bulk-box .field { padding: 16px; border-radius: 20px; border: 1px solid var(--stroke); background: var(--surface-soft); }
.bulk-box .field span { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); }
.bulk-box .promo-card { align-items: center; }
.promo-card-muted { border-color: var(--stroke); background: var(--surface-soft); }
.promo-card-error { border-color: rgba(251, 113, 133, 0.24); background: rgba(251, 113, 133, 0.08); }
.promo-card-error strong,
.promo-card-error span { color: var(--danger); }
.bulk-methods { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.method-btn { min-height: 48px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 16px; border-radius: 16px; border: 1px solid var(--stroke); background: var(--surface); color: var(--text); font: inherit; font-weight: 700; cursor: pointer; transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease; }
.method-btn:hover { transform: translateY(-1px); border-color: var(--stroke-strong); }
.method-btn.active { border-color: rgba(79, 140, 255, 0.28); background: linear-gradient(135deg, rgba(79, 140, 255, 0.16), rgba(79, 209, 197, 0.18)); }
:global(html[data-theme='light'] .cp-dialog) { box-shadow: 0 22px 50px rgba(148, 163, 184, 0.22); }
:global(html[data-theme='light'] .cp-dialog .el-dialog__headerbtn) { background: #fff; }
@keyframes skeleton { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rank-row { grid-template-columns: 1fr; }
}
@media (max-width: 860px) {
  .stats-grid,
  .summary-grid,
  .bulk-grid,
  .bulk-headline,
  .bulk-summary-grid,
  .bulk-methods { grid-template-columns: 1fr; }
  .selection-bar,
  .pager { flex-direction: column; align-items: stretch; }
  .hero-search,
  .hero-select { width: 100%; }
}
</style>
