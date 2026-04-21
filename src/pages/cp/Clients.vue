<template>
  <div class="cp-page">
    <div class="cp-head glass">
      <div class="left">
        <div class="title">Clients</div>
        <div class="sub">Search, topup, and operation history</div>
      </div>

      <div class="right">
        <div class="searchBox">
          <input
              v-model="search"
              class="cp-input"
              placeholder="Search by login..."
              @keydown.enter="applySearchNow"
          />
          <button v-if="search" class="iconBtn" @click="clearSearch" title="Clear">×</button>
        </div>

        <button class="btn ghost" @click="reload(page)" :disabled="loading">
          {{ loading ? '...' : 'Refresh' }}
        </button>
        <button class="btn primary" @click="openCreate">
          + Add
        </button>
      </div>
    </div>

    <div class="cp-card glass">
      <div class="tableTop">
        <label class="checkAll">
          <input type="checkbox" :checked="allChecked" @change="toggleAll($event)" />
          <span>Select all</span>
        </label>

        <div v-if="selected.length" class="bulk-actions">
          <span class="bulk-count">Selected: <b>{{ selected.length }}</b></span>
          <button class="btn small primary" @click="openBulkTopup">Topup</button>
        </div>
        <div v-else class="bulk-actions bulk-actions--placeholder">
          <span>&nbsp;</span>
        </div>

        <div class="meta">
          <span>Total: <b>{{ total }}</b></span>
        </div>
      </div>

      <div class="table">
        <div class="thead">
          <div class="th c-check"></div>
          <div class="th c-login">Login</div>
          <div class="th c-rank">Rank</div>
          <div class="th c-balance">Balance</div>
          <div class="th c-bonus">Bonus</div>
          <div class="th c-actions">Actions</div>
        </div>

        <div v-if="loading" class="skeleton-list">
          <div v-for="i in 6" :key="i" class="skeleton-row"></div>
        </div>

        <div v-else-if="!clients.length" class="empty">
          No data
        </div>

        <div v-else v-for="c in clients"
            :key="c.id"
            class="tr"
            @contextmenu.prevent="openClientMenu($event, c)"
        >
          <div class="td c-check">
            <input type="checkbox" v-model="selected" :value="c.id" />
          </div>

          <div class="td c-login">
            <div class="loginRow">
              <span class="dot"></span>
              <span class="login">{{ c.login }}</span>
            </div>

            <div class="muted">
              Created: {{ formatDateTime(c.created_at) }}
            </div>
          </div>

          <div class="td c-rank">
            <span class="tier-badge" :style="tierStyle(c)" :title="tierTitle(c)">
              <span class="tier-ic">{{ getTier(c).icon }}</span>
              <span class="tier-tx">{{ getTier(c).name }}</span>
            </span>
          </div>

          <div class="td c-balance">
            <div class="bal">{{ formatMoney(c.balance) }} <span class="muted">UZS</span></div>
          </div>

          <div class="td c-bonus">
            <div class="bal">{{ formatMoney(c.bonus) }} <span class="muted">UZS</span></div>
          </div>

          <div class="td c-actions">
            <button class="btn small primary" @click="openTopup(c)">Topup</button>
            <button class="btn small ghost" @click="openHistory(c)">History</button>
            <button class="btn small ghost" @click="openRanks(c)">Ranks</button>
          </div>
        </div>

        <div v-if="false && loading" class="loadingRow">
          Loading...
        </div>
      </div>

      <div class="pager">
        <button class="btn ghost small" :disabled="page<=1 || loading" @click="go(page-1)">&lt;</button>
        <div class="pageText">Page <b>{{ page }}</b></div>
        <button class="btn ghost small" :disabled="!hasMore || loading" @click="go(page+1)">&gt;</button>
      </div>
    </div>

    <!-- Create client -->
    <ClientFormModal
        v-if="createOpen"
        :open="createOpen"
        @close="createOpen=false"
        @created="onCreated"
    />

    <!-- Topup -->
    <ClientTopupModal
        v-if="topupOpen && activeClient"
        :open="topupOpen"
        :client="activeClient"
        @close="topupOpen=false"
        @done="onTopupDone"
    />

    <ClientPackageModal
        v-if="packageOpen && packageClient"
        :open="packageOpen"
        :client="packageClient"
        @close="closePackage"
        @done="onPackageDone"
    />

    <!-- History -->
    <ClientHistoryDrawer
        :open="historyOpen"
        :client="historyClient"
        @close="closeHistory"
    />
    <ClientSessionsDrawer
        :open="sessionsOpen"
        :client="sessionsClient"
        @close="closeSessions"
    />

    <ClientPackagesDrawer
        :open="packagesOpen"
        :client="packagesClient"
        @close="closePackages"
    />

    <ClientSubscribeModal
        v-if="subscribeOpen && subscribeClient"
        :open="subscribeOpen"
        :client="subscribeClient"
        :zones="zones"
        @close="closeSubscribe"
        @done="onSubscribeDone"
    />

    <ClientSubscriptionsDrawer
        :open="subsOpen"
        :client="subsClient"
        @close="closeSubs"
    />

    <ClientReturnModal
        v-if="returnOpen && returnClient"
        :open="returnOpen"
        :client="returnClient"
        @close="closeReturn"
        @done="onReturnDone"
    />
    <ClientTransferModal
        v-if="transferOpen && transferClient"
        :open="transferOpen"
        :client="transferClient"
        @close="closeTransfer"
        @done="onTransferDone"
    />

    <!-- Ranks Modal -->
    <div v-if="ranksOpen" class="overlay" @click.self="closeRanks">
      <div class="modal glass">
        <div class="modalHead">
          <div>
            <div class="mTitle">Client ranks</div>
            <div class="mSub">Progress across all ranks</div>
          </div>
          <button class="btn ghost small" @click="closeRanks">Close</button>
        </div>
        <div class="modalBody">
          <div v-if="!ranksClient" class="muted">No data</div>
          <div v-else class="ranks-list">
            <div v-for="(t, i) in TIERS" :key="t.key" class="rank-row">
              <div class="rank-left">
                <div class="rank-name">
                  <span class="rank-ic">{{ t.icon }}</span>
                  <span>{{ t.name }}</span>
                </div>
                <div class="muted small">{{ formatMoney(t.min) }} UZS</div>
              </div>
              <div class="rank-right">
                <div class="rank-bar">
                  <div class="rank-bar-in" :style="rankBarStyle(t, i)"></div>
                </div>
                <div class="rank-label muted">
                  {{ rankLabel(t, i) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Topup Modal -->
    <div v-if="bulkOpen" class="mc-modal-overlay" @mousedown.self="closeBulkTopup">
      <div class="mc-modal">
        <div class="mc-head">
          <div>
            <div class="mc-title">Bulk topup</div>
            <div class="mc-sub">Selected clients: <b>{{ selected.length }}</b></div>
            <div class="mc-sub mc-sub-phones" v-if="selectedPhones.length">
              <span v-for="(p, i) in selectedPhones" :key="p + i" class="phone-pill">{{ p }}</span>
            </div>
          </div>
          <button class="mc-x" @click="closeBulkTopup">×</button>
        </div>

        <!-- Promo -->
        <div v-if="bulkPromo" class="mc-promo">
          <div class="mc-promo-title">Promo active: <b>{{ bulkPromo.name }}</b></div>
          <div class="mc-promo-sub">
            Bonus will be added automatically: <b>+{{ formatMoney(bulkPromoBonus) }}</b> UZS
          </div>
        </div>
        <div v-if="bulkPromoLoading" class="mc-hint" style="margin-top:10px;">
          Checking promo...
        </div>
        <div v-if="bulkPromoError" class="mc-error">{{ bulkPromoError }}</div>

        <div class="mc-grid">
          <div class="mc-card">
            <div class="mc-card-title">Amount (UZS)</div>
            <input
                v-model="bulkAmountStr"
                class="mc-input"
                inputmode="numeric"
                placeholder="Enter amount"
                @input="onBulkAmountInput"
            />
            <div class="mc-chips">
              <button class="mc-chip" type="button" @click="bulkAdd(5000)">+ 5 000</button>
              <button class="mc-chip" type="button" @click="bulkAdd(10000)">+ 10 000</button>
              <button class="mc-chip" type="button" @click="bulkAdd(20000)">+ 20 000</button>
              <button class="mc-chip" type="button" @click="bulkAdd(50000)">+ 50 000</button>
            </div>

            <div v-if="canBulkBonus" class="mc-bonus-inline">
              <div class="mc-card-title" style="margin-top:12px;">Bonus (optional)</div>
              <input
                  v-model="bulkBonusStr"
                  class="mc-input"
                  inputmode="numeric"
                  placeholder="0"
                  @input="onBulkBonusInput"
              />
            </div>
          </div>

          <div class="mc-card">
            <div class="mc-card-title">Payment method</div>
            <div class="mc-seg">
              <button
                  class="mc-seg-btn"
                  :class="{ active: bulkMethod === 'cash' }"
                  type="button"
                  @click="bulkMethod = 'cash'"
              >Cash</button>
              <button
                  class="mc-seg-btn"
                  :class="{ active: bulkMethod === 'card' }"
                  type="button"
                  @click="bulkMethod = 'card'"
              >Card</button>
            </div>
          </div>
        </div>

        <div class="mc-actions">
          <button class="mc-btn ghost" type="button" @click="closeBulkTopup">Cancel</button>
          <button class="mc-btn primary" type="button" :disabled="bulkSubmitting || bulkAmount <= 0" @click="submitBulkTopup">
            {{ bulkSubmitting ? '...' : 'Apply' }}
          </button>
        </div>

        <div v-if="bulkError" class="mc-error">{{ bulkError }}</div>
      </div>
    </div>

    <ContextMenu
        :open="cmOpen"
        :x="cmX"
        :y="cmY"
        :title="cmClient ? cmClient.login : ''"
        :items="cmItems"
        @close="cmOpen=false"
        @select="onMenuSelect"
    />
  </div>
</template>


<script setup>
import { ref, computed, watch } from 'vue'
import { cpApi } from '../../api/cp'
import { useCpAuthStore, hasRole } from '../../stores/cpAuth'
import ClientFormModal from '../../components/cp/ClientFormModal.vue'
import ClientTopupModal from '../../components/cp/ClientTopupModal.vue'
import ClientHistoryDrawer from '../../components/cp/ClientHistoryDrawer.vue'
import ClientSessionsDrawer from '../../components/cp/ClientSessionsDrawer.vue'
import ContextMenu from '../../components/ui/ContextMenu.vue'
import ClientPackageModal from '../../components/cp/ClientPackageModal.vue'
import ClientPackagesDrawer from '../../components/cp/ClientPackagesDrawer.vue'
import ClientSubscribeModal from '../../components/cp/ClientSubscribeModal.vue'
import ClientSubscriptionsDrawer from '../../components/cp/ClientSubscriptionsDrawer.vue'
import ClientReturnModal from '../../components/cp/ClientReturnModal.vue'
import ClientTransferModal from '../../components/cp/ClientTransferModal.vue'

/**
 * * Global tiers (admin panel yo'q, hamma klub uchun bir xil)
 * lifetime_topup bo'yicha hisoblanadi.
 */
const auth = useCpAuthStore()

const TIERS = [
  { key: 'rookie',   name: 'Новобранец', icon: '🪖', min: 0,           color: '#9CA3AF' },
  { key: 'squire',   name: 'Оруженосец', icon: '🛡️', min: 1_000_000,   color: '#22C55E' },
  { key: 'knight',   name: 'Рыцарь',     icon: '⚔️', min: 5_000_000,   color: '#3B82F6' },
  { key: 'captain',  name: 'Капитан',    icon: '🎖️', min: 12_000_000,  color: '#8B5CF6' },
  { key: 'baron',    name: 'Барон',      icon: '👑', min: 25_000_000,  color: '#F59E0B' },
  { key: 'investor', name: 'Инвестор',   icon: '💎', min: 50_000_000,  color: '#EF4444' },
  { key: 'legend',   name: 'Легенда',    icon: '🐉', min: 90_000_000,  color: '#06B6D4' },
]

function lifetimeOf(c) {
  const v = c?.lifetime_topup ?? c?.lifetime_total ?? 0
  const n = Number(v || 0)
  return Number.isFinite(n) ? n : 0
}
function calcTier(total) {
  let cur = TIERS[0]
  for (const t of TIERS) if (total >= t.min) cur = t
  return cur
}
function calcNextTier(total) {
  for (const t of TIERS) if (total < t.min) return t
  return null
}
function getTier(c) {
  return calcTier(lifetimeOf(c))
}
function getNextTier(c) {
  return calcNextTier(lifetimeOf(c))
}
function remainToNext(c) {
  const total = lifetimeOf(c)
  const next = getNextTier(c)
  if (!next) return 0
  return Math.max(0, next.min - total)
}
function progressToNext(c) {
  const total = lifetimeOf(c)
  const cur = getTier(c)
  const next = getNextTier(c)
  if (!next) return 100
  const span = Math.max(1, next.min - cur.min)
  const done = Math.min(span, Math.max(0, total - cur.min))
  return Math.round((done / span) * 100)
}
function tierStyle(c) {
  const t = getTier(c)
  return {
    borderColor: t.color,
    background: 'rgba(255,255,255,.05)',
  }
}
function tierTitle(c) {
  const total = lifetimeOf(c)
  const cur = getTier(c)
  const next = getNextTier(c)
  if (!next) return `${cur.icon} ${cur.name}\nОбщий топап: ${formatMoney(total)} UZS\nМаксимальный ранг`
  return `${cur.icon} ${cur.name}\nОбщий топап: ${formatMoney(total)} UZS\nДо «${next.name}»: ${formatMoney(remainToNext(c))} UZS`
}


function rankBarStyle(t, idx){
  const total = lifetimeOf(ranksClient.value)
  const cur = getTier(ranksClient.value)
  const curIndex = TIERS.findIndex(x => x.key === cur.key)
  if (idx < curIndex) return { width: '100%', background: t.color }
  if (idx > curIndex) return { width: '0%', background: t.color }
  const next = getNextTier(ranksClient.value)
  if (!next) return { width: '100%', background: t.color }
  const span = Math.max(1, next.min - cur.min)
  const done = Math.min(span, Math.max(0, total - cur.min))
  const pct = Math.round((done / span) * 100)
  return { width: pct + '%', background: t.color }
}

function rankLeftAmount(){
  const total = lifetimeOf(ranksClient.value)
  const cur = getTier(ranksClient.value)
  const next = getNextTier(ranksClient.value)
  if (!next) return 0
  return Math.max(0, next.min - total)
}


function rankLabel(t, idx){
  const total = lifetimeOf(ranksClient.value)
  const cur = getTier(ranksClient.value)
  const curIndex = TIERS.findIndex(x => x.key === cur.key)
  if (idx < curIndex) return 'Completed'
  if (idx > curIndex) return 'Pending'
  const next = getNextTier(ranksClient.value)
  if (!next) return 'Max rank'
  return `Left: ${formatMoney(rankLeftAmount())} UZS`
}


const loading = ref(false)
const clients = ref([])
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 20 })
const total = ref(0)

const page = ref(1)
const hasMore = ref(false)

const search = ref('')
let searchTimer = null

const selected = ref([])
const allChecked = computed(() => clients.value.length > 0 && selected.value.length === clients.value.length)

const createOpen = ref(false)
const topupOpen = ref(false)
const historyOpen = ref(false)
const historyClient = ref(null)
const sessionsOpen = ref(false)
const sessionsClient = ref(null)

const activeClient = ref(null)

const cmOpen = ref(false)
const cmX = ref(0)
const cmY = ref(0)
const cmClient = ref(null)

const packageOpen = ref(false)
const packageClient = ref(null)

const packagesOpen = ref(false)
const packagesClient = ref(null)

const subscribeOpen = ref(false)
const subscribeClient = ref(null)

const subsOpen = ref(false)
const subsClient = ref(null)

const zones = ref([])

const returnOpen = ref(false)
const returnClient = ref(null)

const transferOpen = ref(false)
const transferClient = ref(null)


const bulkOpen = ref(false)
const bulkAmountStr = ref('')
const bulkBonusStr = ref('')
const bulkMethod = ref('cash')
const bulkSubmitting = ref(false)
const bulkError = ref('')
const bulkPromoLoading = ref(false)
const bulkPromo = ref(null)
const bulkPromoError = ref('')
const canBulkBonus = computed(() => hasRole(auth.operator, ['admin','owner']))
const bulkAmount = computed(() => toNumber(bulkAmountStr.value))
const bulkBonus = computed(() => (canBulkBonus.value ? toNumber(bulkBonusStr.value) : 0))
const bulkPromoBonus = computed(() => {
  if (!bulkPromo.value) return 0
  if (bulkMethod.value !== 'cash') return 0
  if (bulkPromo.value?.type !== 'double_topup') return 0
  return bulkAmount.value > 0 ? bulkAmount.value : 0
})


const ranksOpen = ref(false)
const ranksClient = ref(null)

const selectedPhones = computed(() => {
  const map = new Map(clients.value.map(c => [Number(c.id), c]))
  return selected.value
    .map(id => map.get(Number(id)))
    .filter(Boolean)
    .map(c => c.phone || c.login || String(c.id))
})


function openSubscribe(c){
  subscribeClient.value = c
  subscribeOpen.value = true
}
function closeSubscribe(){
  subscribeOpen.value = false
  subscribeClient.value = null
}

function openSubs(c){
  subsClient.value = c
  subsOpen.value = true
}
function closeSubs(){
  subsOpen.value = false
  subsClient.value = null
}

function openReturn(c){
  returnClient.value = c
  returnOpen.value = true
}
function closeReturn(){
  returnOpen.value = false
  returnClient.value = null
}

function openTransfer(c){
  transferClient.value = c
  transferOpen.value = true
}
function closeTransfer(){
  transferOpen.value = false
  transferClient.value = null
}


function openBulkTopup(){
  if (!selected.value.length) return
  bulkAmountStr.value = ''
  bulkBonusStr.value = ''
  bulkMethod.value = 'cash'
  bulkError.value = ''
  bulkPromo.value = null
  bulkPromoError.value = ''
  bulkPromoLoading.value = false
  bulkOpen.value = true
  fetchBulkPromo('open')
}
function closeBulkTopup(){
  bulkOpen.value = false
}
function onBulkAmountInput(){
  bulkAmountStr.value = String(toNumber(bulkAmountStr.value))
}
function onBulkBonusInput(){
  bulkBonusStr.value = String(toNumber(bulkBonusStr.value))
}
function bulkAdd(v){
  bulkAmountStr.value = String(bulkAmount.value + v)
}
watch(
  () => bulkMethod.value,
  async () => {
    if (!bulkOpen.value) return
    await fetchBulkPromo('method-change')
  }
)
async function submitBulkTopup(){
  if (!selected.value.length) return
  bulkError.value = ''
  bulkSubmitting.value = true
  try {
    const payload = {
      client_ids: selected.value,
      amount: bulkAmount.value,
      payment_method: bulkMethod.value,
      bonus_amount: bulkBonus.value || undefined,
    }
    if (!payload.bonus_amount) delete payload.bonus_amount
    const res = await cpApi.bulkTopup(payload)
    const items = res?.data?.data?.items || []
    if (Array.isArray(items)) {
      for (const it of items) {
        const idx = clients.value.findIndex(x => Number(x.id) === Number(it.id))
        if (idx !== -1) clients.value[idx] = { ...clients.value[idx], ...it }
      }
    }
    selected.value = []
    bulkOpen.value = false
  } catch (e) {
    bulkError.value = e?.response?.data?.message || 'Bulk topup failed'
  } finally {
    bulkSubmitting.value = false
  }
}

async function fetchBulkPromo(reason = ''){
  bulkPromoError.value = ''
  bulkPromoLoading.value = true
  try {
    if (!cpApi?.promotionActiveForTopup) {
      bulkPromo.value = null
      bulkPromoError.value = 'cpApi.promotionActiveForTopup() not found'
      return
    }
    const r = await cpApi.promotionActiveForTopup({ payment_method: bulkMethod.value })
    bulkPromo.value = r?.data?.data ?? null
  } catch (e) {
    bulkPromo.value = null
    bulkPromoError.value = e?.response?.data?.message || 'Failed to check promo'
  } finally {
    bulkPromoLoading.value = false
  }
}

function openRanks(c){
  ranksClient.value = c
  ranksOpen.value = true
}
function closeRanks(){
  ranksOpen.value = false
  ranksClient.value = null
}

async function loadZonesSafe(){
  try{
    if (!cpApi?.zones) return
    const r = await cpApi.zones({ per_page: 200, page: 1, active: 1 })
    const raw = r?.data?.data ?? r?.data ?? {}
    zones.value = Array.isArray(raw?.data) ? raw.data : []
  } catch {
    zones.value = zones.value || []
  }
}


function openPackage(c){
  packageClient.value = c
  packageOpen.value = true
}
function closePackage(){
  packageOpen.value = false
  packageClient.value = null
}

function openPackages(c){
  packagesClient.value = c
  packagesOpen.value = true
}
function closePackages(){
  packagesOpen.value = false
  packagesClient.value = null
}

function onPackageDone(payload){
  const updatedClient = payload?.client
  if (updatedClient?.id) {
    const idx = clients.value.findIndex(x => x.id === updatedClient.id)
    if (idx !== -1) clients.value[idx] = { ...clients.value[idx], ...updatedClient }
  } else {
    reload()
  }
}

function openClientMenu(e, client) {
  cmClient.value = client
  cmX.value = e.clientX
  cmY.value = e.clientY
  cmOpen.value = true
}

function clearSearch(){
  search.value = ''
  page.value = 1
  reload(1)
}

function applySearchNow(){
  page.value = 1
  reload(1)
}

function toggleAll(e){
  const checked = e.target.checked
  selected.value = checked ? clients.value.map(x => x.id) : []
}

function openCreate(){
  createOpen.value = true
}

function openTopup(c){
  if (!c) return
  activeClient.value = { ...c }
  topupOpen.value = true
}

function openHistory(client) {
  historyClient.value = client
  historyOpen.value = true
}
function closeHistory() {
  historyOpen.value = false
  historyClient.value = null
}
function openSessions(client) {
  sessionsClient.value = client
  sessionsOpen.value = true
}
function closeSessions() {
  sessionsOpen.value = false
  sessionsClient.value = null
}

function go(p){
  page.value = p
  reload(p)
}

async function reload(p = page.value) {
  loading.value = true
  try {
    const res = await cpApi.clients({ search: search.value || '', page: p })
    const payload = res?.data?.data ?? res?.data ?? {}

    const list = Array.isArray(payload?.data) ? payload.data : []
    clients.value = list

    meta.value = {
      current_page: payload?.current_page ?? 1,
      last_page: payload?.last_page ?? 1,
      total: payload?.total ?? list.length,
      per_page: payload?.per_page ?? 20,
    }

    total.value = meta.value.total
    page.value = meta.value.current_page
    hasMore.value = meta.value.current_page < meta.value.last_page

    selected.value = selected.value.filter(id => clients.value.some(c => c.id === id))
  } finally {
    loading.value = false
  }
}

function onCreated(){
  createOpen.value = false
  page.value = 1
  reload(1)
}

/**
 * * Topupdan keyin darhol list update:
 * payload: { id/client_id, balance, bonus, lifetime_topup }
 */
async function onTopupDone(payload){
  const activeId = activeClient.value?.id
  topupOpen.value = false
  activeClient.value = null
  let localPatched = false

  if (!payload) {
    await reload(page.value)
    return
  }

  const id = payload.client_id ?? payload.id ?? activeId
  if (!id) {
    await reload(page.value)
    return
  }

  const idx = clients.value.findIndex(x => Number(x.id) === Number(id))
  if (idx === -1) {
    await reload(page.value)
    return
  }

  const next = { ...clients.value[idx] }

  if (payload.balance != null) next.balance = payload.balance
  if (payload.bonus != null) next.bonus = payload.bonus
  if (payload.lifetime_topup != null) next.lifetime_topup = payload.lifetime_topup

  clients.value.splice(idx, 1, next)
  localPatched = true

  // Serverdagi yakuniy qiymat (tier/bonus va boshqalar) bilan ham sync bo'lib tursin.
  // Bu qo'lda "Refresh" bosishga ehtiyojni yo'q qiladi.
  if (localPatched) {
    await reload(page.value)
  }
}


function toNumber(s) {
  const n = Number(String(s ?? '').replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatMoney(v){
  const n = Number(v || 0)
  return n.toLocaleString('ru-RU')
}

function formatDateTime(dt){
  if (!dt) return '-'
  try{
    const d = new Date(dt)
    return d.toLocaleString('ru-RU')
  } catch {
    return String(dt)
  }
}

const cmItems = computed(() => {
  const c = cmClient.value
  return c ? [
    { key: 'topup', label: 'Пополнить' },
    { key: 'history', label: 'История баланса' },
    { key: 'return', label: 'Return' },
    { key: 'transfer', label: 'Transfer' },
    { key: 'sessions', label: 'Сессии клиента' },
    { key: 'package', label: 'Добавить пакет' },
    { key: 'packages', label: 'Пакеты клиента' },
    { key: 'subscribe', label: 'Оформить подписку' },
    { key: 'subs', label: 'Подписки клиента' },
  ] : []
})

function onMenuSelect(item) {
  const c = cmClient.value
  if (!c) return

  if (item.key === 'topup') openTopup(c)
  if (item.key === 'history') openHistory(c)
  if (item.key === 'return') openReturn(c)
  if (item.key === 'transfer') openTransfer(c)
  if (item.key === 'sessions') openSessions(c)
  if (item.key === 'package') openPackage(c)
  if (item.key === 'packages') openPackages(c)
  if (item.key === 'subscribe') openSubscribe(c)
  if (item.key === 'subs') openSubs(c)
}

function onSubscribeDone(payload){
  const updatedClient = payload?.client
  if (updatedClient?.id) {
    const idx = clients.value.findIndex(x => x.id === updatedClient.id)
    if (idx !== -1) {
      clients.value.splice(idx, 1, { ...clients.value[idx], ...updatedClient })
    }
  } else {
    reload(page.value)
  }
}

function onReturnDone(){
  reload(page.value)
}

function onTransferDone(payload){
  const sender = payload?.sender
  const receiver = payload?.receiver
  if (sender?.id) {
    const idx = clients.value.findIndex(x => Number(x.id) === Number(sender.id))
    if (idx !== -1) clients.value[idx] = { ...clients.value[idx], balance: sender.balance }
  }
  if (receiver?.id) {
    const idx = clients.value.findIndex(x => Number(x.id) === Number(receiver.id))
    if (idx !== -1) clients.value[idx] = { ...clients.value[idx], balance: receiver.balance }
  }
  if (!sender?.id && !receiver?.id) reload(page.value)
}

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    reload(1)
  }, 300)
})

loadZonesSafe()
reload(1)
</script>

<style scoped>
/* Sening stylingingni 1px ham buzmadim - aynan o'zing yuborgandek qoldi */
.cm-backdrop{
  position:fixed; inset:0;
  background: rgba(0,0,0,.25);
  z-index: 99998;
}
.cm{
  position:fixed;
  z-index: 99999;
}
.cp-page{ padding: 18px; }
.glass{
  background: rgba(12, 18, 32, .55);
  border: 1px solid rgba(255,255,255,.06);
  box-shadow: 0 12px 40px rgba(0,0,0,.35);
  backdrop-filter: blur(14px);
  border-radius: 16px;
}
.cp-head{
  display:flex; justify-content:space-between; gap:14px;
  padding: 14px 14px;
  align-items:center;
}
.title{ font-size: 18px; font-weight: 700; color: rgba(255,255,255,.92); }
.sub{ font-size: 12px; color: rgba(255,255,255,.55); margin-top: 4px; }
.right{ display:flex; gap:10px; align-items:center; flex-wrap: wrap; justify-content:flex-end; }
.searchBox{ position: relative; display:flex; align-items:center; }
.iconBtn{
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.8);
  width: 34px; height: 34px;
  border-radius: 10px;
  cursor:pointer;
}
.searchBox .iconBtn{
  position:absolute; right: 6px;
  width: 28px; height: 28px;
  border-radius: 9px;
}
.cp-input{
  height: 34px;
  width: 260px;
  padding: 0 38px 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.9);
  outline: none;
}
.btn{
  height: 34px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.14);
  background: linear-gradient(180deg, rgba(12,18,34,.9), rgba(8,12,24,.9));
  color: rgba(230,237,255,.92);
  font-weight: 700;
  letter-spacing: .2px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 8px 16px rgba(0,0,0,.25);
  cursor:pointer;
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease;
}
.btn:hover{
  transform: translateY(-1px);
  border-color: rgba(255,255,255,.22);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.1),
    0 12px 20px rgba(0,0,0,.28);
}
.btn:active{
  transform: translateY(0);
  box-shadow:
    inset 0 2px 6px rgba(0,0,0,.35),
    0 6px 12px rgba(0,0,0,.2);
}
.btn:disabled{ opacity:.6; cursor:not-allowed; }
.btn.primary{
  background: linear-gradient(135deg, rgba(59,130,246,.95), rgba(37,99,235,.85));
  border-color: rgba(99,162,255,.8);
  color: #07101f;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.35),
    0 10px 22px rgba(59,130,246,.28);
}
.btn.primary:hover{
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.45),
    0 14px 26px rgba(59,130,246,.35);
}
.btn.ghost{
  background: rgba(255,255,255,.04);
  border-color: rgba(255,255,255,.12);
  color: rgba(226,232,240,.9);
}
.btn.small{ height: 30px; border-radius: 11px; padding: 0 10px; }
.btn:focus-visible{
  outline: none;
  box-shadow:
    0 0 0 2px rgba(99,162,255,.22),
    inset 0 1px 0 rgba(255,255,255,.1);
}

.cp-card{ margin-top: 14px; padding: 12px; }

.tableTop{
  display:grid;
  grid-template-columns: auto 1fr auto;
  align-items:center;
  gap:12px;
  padding: 6px 6px 12px;
  min-height: 36px;
}
.tableTop .checkAll{ grid-column:1; justify-self:start; display:flex; align-items:center; }
.tableTop .meta{ grid-column:3; justify-self:end; display:flex; align-items:center; }
.checkAll{ display:flex; gap:10px; align-items:center; color: rgba(255,255,255,.72); font-size: 13px; }
.meta{ color: rgba(255,255,255,.55); font-size: 13px; }

/* Premium checkboxes */
.cp-card input[type="checkbox"]{
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.22);
  background: rgba(6,10,20,.55);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
  display: inline-grid;
  place-content: center;
  cursor: pointer;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease, transform .1s ease;
}
.cp-card input[type="checkbox"]::after{
  content: "";
  width: 6px;
  height: 10px;
  border: 2px solid rgba(240,248,255,.95);
  border-top: 0;
  border-left: 0;
  transform: rotate(45deg) scale(0);
  transition: transform .12s ease;
}
.cp-card input[type="checkbox"]:checked{
  background: linear-gradient(135deg, rgba(59,130,246,.95), rgba(37,99,235,.8));
  border-color: rgba(99,162,255,.85);
  box-shadow:
    0 0 0 2px rgba(59,130,246,.16),
    inset 0 1px 0 rgba(255,255,255,.25);
}
.cp-card input[type="checkbox"]:checked::after{
  transform: rotate(45deg) scale(1);
}
.cp-card input[type="checkbox"]:focus-visible{
  outline: none;
  box-shadow: 0 0 0 2px rgba(99,162,255,.25);
}

.bulk-actions{ grid-column:2; justify-self:center; display:flex; align-items:center; gap:10px; min-height:30px }
.bulk-actions--placeholder{ visibility:hidden }


.bulk-count{color: rgba(255,255,255,.75); font-size: 13px}
.bulk-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.bulk-card{border-radius:14px;padding:12px;border:1px solid rgba(255,255,255,.07);background: rgba(255,255,255,.04)}
.bulk-label{font-size:12px;opacity:.7;margin-bottom:6px}
@media (max-width:900px){.bulk-grid{grid-template-columns:1fr}}

.table{
  min-height: 420px;
  border-radius: 14px;
  overflow:hidden;
  border: 1px solid rgba(255,255,255,.06);
}
.thead, .tr{
  display:grid;
  grid-template-columns: 35px 1.1fr 0.7fr 1fr 180px 260px;
  align-items:center;
}
.thead{
  background: rgba(255,255,255,.03);
  color: rgba(255,255,255,.70);
  font-size: 12px;
  padding: 10px 12px;
}
.tr{
  padding: 10px 10px;
  border-top: 1px solid rgba(255,255,255,.06);
}
.td{ color: rgba(255,255,255,.88); }
.muted{ color: rgba(255,255,255,.50); font-size: 12px; margin-top: 4px; }
.loginRow{ display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
.dot{
  width: 8px; height: 8px;
  border-radius: 99px;
  background: rgba(64,150,255,.9);
  box-shadow: 0 0 0 4px rgba(64,150,255,.14);
}
.login{ font-weight: 700; letter-spacing: .2px; }
.bal{ font-weight: 700; }

.c-actions{ display:flex; gap:10px; justify-content:flex-start; }

.empty{
  padding: 26px;
  text-align:center;
  color: rgba(255,255,255,.55);
}
.loadingRow{
  padding: 14px;
  text-align:center;
  color: rgba(255,255,255,.55);
  border-top: 1px solid rgba(255,255,255,.06);
}
.pager{
  display:flex; justify-content:center; align-items:center; gap:10px;
  margin-top: 12px;
}
.pageText{ color: rgba(255,255,255,.65); font-size: 13px; }

.overlay{
  position: fixed; inset:0;
  background: rgba(0,0,0,.55);
  display:flex; align-items:center; justify-content:center;
  padding: 18px;
  z-index: 50;
}
.modal{
  width: min(860px, 100%);
  border-radius: 18px;
}
.modalHead{
  display:flex; justify-content:space-between; align-items:flex-start;
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.mTitle{ font-size: 16px; font-weight: 800; color: rgba(255,255,255,.92); }
.mSub{ margin-top: 4px; font-size: 12px; color: rgba(255,255,255,.55); }
.modalBody{ padding: 14px; }
.modalFoot{
  display:flex; justify-content:flex-end; gap:10px;
  padding: 12px 14px 14px;
  border-top: 1px solid rgba(255,255,255,.06);
}
.historyList{ display:flex; flex-direction:column; gap:10px; }
.historyItem{
  display:flex; justify-content:space-between; align-items:center;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.06);
  background: rgba(255,255,255,.03);
}
.hTitle{ font-weight: 700; }
.hAmount{ font-weight: 800; }

/* * Qo'shimcha style (eski narsaga tegmadi) */
.tier-badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  color: rgba(255,255,255,.88);
  font-size: 12px;
  font-weight: 800;
}
.tier-ic{ line-height: 1; }
.tier-tx{ opacity:.95; }

.tier-progress{ margin-top: 8px; max-width: 520px; }
.tier-progress-top{ display:flex; justify-content:space-between; gap:10px; }
.tier-bar{
  margin-top: 6px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.06);
  overflow:hidden;
}
.tier-bar-in{ height:100%; border-radius:999px; }

.skeleton-list{display:flex;flex-direction:column;gap:10px;padding:10px 10px 14px}
.skeleton-row{height:62px;border-radius:14px;background: rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);animation: skPulse 1.2s infinite ease-in-out}
@keyframes skPulse{0%,100%{opacity:.6}50%{opacity:1}}

.ranks-list{display:flex;flex-direction:column;gap:12px}
.rank-row{display:grid;grid-template-columns: 1fr 2fr;gap:12px;align-items:center;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background: rgba(255,255,255,.03)}
.rank-name{display:flex;gap:8px;align-items:center;font-weight:800}
.rank-ic{font-size:16px}
.rank-bar{height:10px;border-radius:999px;background: rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.06);overflow:hidden}
.rank-bar-in{height:100%;border-radius:999px}
.rank-label{margin-top:6px;font-size:12px}
@media (max-width:800px){.rank-row{grid-template-columns:1fr}}

/* Bulk modal (match single topup style) */
.mc-modal, .mc-card, .mc-grid { box-sizing: border-box; }
.mc-grid > * { min-width: 0; }

.mc-modal-overlay{
  position:fixed; inset:0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(10px);
  display:flex; align-items:center; justify-content:center;
  padding: 24px;
  z-index: 9999;
}
.mc-modal{
  width:min(980px, 100%);
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(10,16,28,.92);
  box-shadow: 0 30px 80px rgba(0,0,0,.55);
  padding: 18px;
  color: rgba(255,255,255,.92);
}
.mc-head{
  display:flex; justify-content:space-between; align-items:flex-start;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.mc-title{ font-size: 18px; font-weight: 700; }
.mc-sub{ margin-top: 4px; opacity:.75; font-size: 12px; }
.mc-sub-phones{
  margin-top: 6px;
  opacity: .8;
  font-size: 12px;
  line-height: 1.4;
  max-height: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mc-x{
  width:36px; height:36px;
  border-radius: 10px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.85);
  cursor:pointer;
}
.mc-promo{
  margin-top: 14px;
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(59,130,246,.10);
  border: 1px solid rgba(59,130,246,.22);
}
.mc-promo-title{ font-weight: 800; font-size: 12px; }
.mc-promo-sub{ margin-top: 6px; font-size: 12px; opacity: .85; }
.mc-hint{ margin-top: 10px; font-size: 12px; opacity: .6; }
.mc-grid{
  margin-top: 14px;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 900px){
  .mc-grid{ grid-template-columns: 1fr; }
}
.mc-card{
  border-radius: 16px;
  padding: 14px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
}
.mc-card .mc-input{
  margin-top: 6px;
}
.mc-card .mc-chips{
  margin-top: 12px;
}
.mc-card .mc-bonus-inline .mc-input{
  margin-top: 6px;
}

.mc-sub-phones{
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.02);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.phone-pill{
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(2,6,23,.35);
  font-weight: 700;
  font-size: 12px;
}
.mc-card-title{
  font-size: 12px;
  opacity: .8;
  margin-bottom: 10px;
}
.mc-input{
  width:100%;
  box-sizing: border-box;
  border-radius: 14px;
  padding: 12px 14px;
  outline:none;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.20);
  color: rgba(255,255,255,.92);
  font-size: 14px;
}
.mc-chips{ margin-top: 10px; display:flex; gap:8px; flex-wrap:wrap; }
.mc-chip{
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.88);
  cursor:pointer;
}
.mc-bonus-inline{ margin-top: 8px; }
.mc-seg{ display:flex; gap:10px; }
.mc-seg-btn{
  flex: 1;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.88);
  cursor:pointer;
  font-weight: 600;
}
.mc-seg-btn.active{
  background: rgba(59,130,246,.22);
  border-color: rgba(59,130,246,.45);
}
.mc-actions{
  margin-top: 14px;
  display:flex;
  justify-content:flex-end;
  gap: 10px;
}
.mc-btn{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  cursor:pointer;
  font-weight: 700;
}
.mc-btn.ghost{
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.85);
}
.mc-btn.primary{
  background: rgba(59,130,246,.95);
  border-color: rgba(59,130,246,.95);
  color: #07101f;
}
.mc-btn:disabled{
  opacity:.45;
  cursor:not-allowed;
}
.mc-error{
  margin-top: 10px;
  font-size: 12px;
  color: rgba(239,68,68,.95);
}
</style>



