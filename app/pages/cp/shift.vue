<template>
  <div class="shift-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="hero-pill" :class="{ live: isOpen }">
          <Icon :name="isOpen ? 'lucide:badge-check' : 'lucide:circle-off'" size="14" />
          {{ isOpen ? `Shift #${shift?.id}` : copy.closed }}
        </span>
        <span class="hero-pill">
          <Icon name="lucide:clock-3" size="14" />
          {{ lastSyncLabel }}
        </span>
      </template>

      <template #actions>
        <div class="hero-toolbar">
          <label class="toggle-chip">
            <input v-model="autoRefresh" type="checkbox" />
            <Icon name="lucide:timer-reset" size="14" />
            <span>{{ copy.autoRefresh }}</span>
          </label>
          <button class="toolbar-btn" :disabled="loading || actionLoading" @click="reload">
            <Icon name="lucide:refresh-cw" size="15" />
            <span>{{ copy.refresh }}</span>
          </button>
          <button
            v-if="!isOpen"
            class="toolbar-btn toolbar-btn-primary"
            :disabled="loading || actionLoading"
            @click="openModal = true"
          >
            <Icon name="lucide:play" size="15" />
            <span>{{ copy.openShift }}</span>
          </button>
          <button
            v-else
            class="toolbar-btn toolbar-btn-danger"
            :disabled="loading || actionLoading"
            @click="openCloseModal"
          >
            <Icon name="lucide:circle-stop" size="15" />
            <span>{{ copy.closeShift }}</span>
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="shift-stats">
      <CpStatCard compact tone="tone-blue" :label="copy.revenue" :value="money(grossIncome)" :hint="`${copy.cashIncome} ${money(cashIncome)} · Karta ${money(cardIncome)}`" />
      <CpStatCard compact tone="tone-green" :label="copy.expectedCash" :value="money(expectedCashNow)" :hint="`${copy.opening} ${money(openingCash)} · ${copy.returns} ${money(returnsCashTotal)}`" />
      <CpStatCard compact tone="tone-amber" :label="copy.expenses" :value="money(expensesTotal)" :hint="`${expenseRatio}% ${copy.share} · ${topExpenseCategory.name}`" />
      <CpStatCard compact tone="tone-rose" :label="copy.discipline" :value="`${disciplineScore}%`" :hint="disciplineHint" />
    </div>

    <p v-if="pageError" class="alert err">{{ pageError }}</p>

    <div class="shift-grid">
      <CpPanelCard :title="copy.cashflowTitle" :subtitle="copy.cashflowSubtitle">
        <div v-if="isOpen" class="cash-card-stack">
          <div v-for="row in cashRows" :key="row.key" class="cash-row" :class="row.tone">
            <div class="cash-copy">
              <span>{{ row.label }}</span>
              <small>{{ row.note }}</small>
            </div>
            <strong>{{ row.value }}</strong>
          </div>

          <div v-if="handoverData?.carry" class="handover-card">
            <div class="handover-head">
              <Icon name="lucide:badge-info" size="15" />
              <span>{{ copy.handover }}</span>
            </div>
            <p>{{ handoverLabel }}</p>
          </div>
        </div>

        <div v-else class="closed-state">
          <div class="closed-icon">
            <Icon name="lucide:briefcase-business" size="18" />
          </div>
          <strong>{{ copy.closed }}</strong>
          <ul class="closed-list">
            <li v-for="hint in assistantHints" :key="hint">{{ hint }}</li>
          </ul>
          <button class="toolbar-btn toolbar-btn-primary" :disabled="loading || actionLoading" @click="openModal = true">
            <Icon name="lucide:play" size="15" />
            <span>{{ copy.openShift }}</span>
          </button>
        </div>
      </CpPanelCard>

      <CpPanelCard :title="copy.assistantTitle" :subtitle="copy.assistantSubtitle">
        <div class="assistant-stack">
          <div class="assistant-highlight" :class="disciplineToneClass">
            <div>
              <span>{{ copy.discipline }}</span>
              <strong>{{ disciplineScore }}%</strong>
            </div>
            <small>{{ disciplineHint }}</small>
          </div>

          <ul class="hint-list">
            <li v-for="hint in assistantHints" :key="hint">{{ hint }}</li>
          </ul>

          <div v-if="operatorLeaderboard.length" class="leaderboard">
            <div class="leaderboard-head">
              <span>{{ copy.operator }}</span>
              <span>{{ copy.sales }}</span>
              <span>{{ copy.expenses }}</span>
              <span>{{ copy.net }}</span>
            </div>
            <div v-for="item in operatorLeaderboard.slice(0, 5)" :key="item.key" class="leaderboard-row">
              <span>{{ item.name }}</span>
              <span>{{ money(item.salesGross) }}</span>
              <span>{{ money(item.expenses) }}</span>
              <strong>{{ money(item.net) }}</strong>
            </div>
          </div>
          <div v-else class="empty-state compact">{{ copy.noOperatorData }}</div>
        </div>
      </CpPanelCard>
    </div>

    <div class="shift-grid">
      <CpPanelCard :title="copy.expensesTitle" :subtitle="copy.expensesSubtitle">
        <template #actions>
          <button class="toolbar-btn toolbar-btn-primary compact-btn" :disabled="!isOpen || actionLoading" @click="openExpenseModal">
            <Icon name="lucide:plus" size="14" />
            <span>{{ copy.addExpense }}</span>
          </button>
        </template>

        <div v-if="expenses.length" class="feed-list">
          <article v-for="item in expenses" :key="item.id" class="feed-item">
            <div class="feed-icon expense">
              <Icon name="lucide:receipt-text" size="15" />
            </div>
            <div class="feed-main">
              <div class="feed-topline">
                <strong>{{ item.title || '-' }}</strong>
                <span>{{ money(item.amount) }}</span>
              </div>
              <small>{{ item.category || copy.other }} · {{ formatDateTime(item.spent_at || item.created_at) }}</small>
            </div>
            <button class="toolbar-btn compact-btn" :disabled="!isOpen || actionLoading" @click="removeExpense(item)">
              <Icon name="lucide:trash-2" size="14" />
              <span>{{ copy.remove }}</span>
            </button>
          </article>
        </div>
        <div v-else class="empty-state">{{ copy.noExpenses }}</div>
      </CpPanelCard>

      <CpPanelCard :title="copy.returnsTitle" :subtitle="copy.returnsSubtitle">
        <div v-if="returns.length" class="feed-list">
          <article v-for="item in returns.slice(0, 8)" :key="item.id" class="feed-item">
            <div class="feed-icon return">
              <Icon name="lucide:rotate-ccw" size="15" />
            </div>
            <div class="feed-main">
              <div class="feed-topline">
                <strong>{{ item.client?.login || item.client?.phone || `#${item.client_id || '-'}` }}</strong>
                <span>{{ money(item.amount) }}</span>
              </div>
              <small>{{ item.payment_method || '-' }} · {{ formatDateTime(item.created_at) }}</small>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">{{ copy.noReturns }}</div>
      </CpPanelCard>
    </div>

    <div v-if="openModal" class="overlay" @click.self="openModal = false">
      <div class="dialog">
        <div class="dialog-head">
          <div>
            <span class="dialog-eyebrow">{{ copy.openShift }}</span>
            <h3>{{ copy.openShiftTitle }}</h3>
          </div>
          <button class="dialog-close" type="button" @click="openModal = false">
            <Icon name="lucide:x" size="16" />
          </button>
        </div>

        <div class="dialog-grid single">
          <label class="field-block">
            <span>{{ copy.openingCash }}</span>
            <div class="field-shell">
              <Icon name="lucide:wallet" size="16" />
              <input v-model.number="openForm.openingCash" type="number" min="0" class="field-input" />
            </div>
          </label>

          <div class="summary-box">
            <span>{{ copy.openingCash }}</span>
            <strong>{{ money(openForm.openingCash) }}</strong>
          </div>
        </div>

        <p v-if="openError" class="alert err">{{ openError }}</p>

        <div class="dialog-actions">
          <button class="toolbar-btn" :disabled="actionLoading" @click="openModal = false">{{ copy.cancel }}</button>
          <button class="toolbar-btn toolbar-btn-primary" :disabled="actionLoading" @click="submitOpen">
            <Icon name="lucide:play" size="15" />
            <span>{{ copy.open }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="closeModal" class="overlay" @click.self="closeModal = false">
      <div class="dialog dialog-wide">
        <div class="dialog-head">
          <div>
            <span class="dialog-eyebrow">{{ copy.closeShift }}</span>
            <h3>{{ copy.closeShiftTitle }}</h3>
          </div>
          <button class="dialog-close" type="button" @click="closeModal = false">
            <Icon name="lucide:x" size="16" />
          </button>
        </div>

        <div class="close-layout">
          <div class="close-panel">
            <div class="summary-box strong-box">
              <span>{{ copy.byFormula }}</span>
              <strong>{{ money(expectedCashNow) }}</strong>
            </div>

            <div class="cash-card-stack">
              <div v-for="row in closeRows" :key="row.key" class="cash-row" :class="row.tone">
                <div class="cash-copy">
                  <span>{{ row.label }}</span>
                  <small>{{ row.note }}</small>
                </div>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
          </div>

          <div class="close-panel">
            <label class="field-block">
              <span>{{ copy.actualCash }}</span>
              <div class="field-shell">
                <Icon name="lucide:banknote" size="16" />
                <input v-model.number="closeForm.closingCash" type="number" min="0" class="field-input" />
              </div>
            </label>

            <div class="diff-box" :class="diffClass">
              <div>
                <span>{{ copy.diff }}</span>
                <strong>{{ money(diffCash) }}</strong>
              </div>
              <small>{{ diffLabel }}</small>
            </div>

            <div class="check-list">
              <label class="check-item">
                <input v-model="closeChecks.cashCounted" type="checkbox" />
                <span>{{ copy.cashCounted }}</span>
              </label>
              <label class="check-item">
                <input v-model="closeChecks.expensesChecked" type="checkbox" />
                <span>{{ copy.expensesChecked }}</span>
              </label>
              <label class="check-item">
                <input v-model="closeChecks.returnsChecked" type="checkbox" />
                <span>{{ copy.returnsChecked }}</span>
              </label>
            </div>
          </div>
        </div>

        <p v-if="closeError" class="alert err">{{ closeError }}</p>

        <div class="dialog-actions">
          <button class="toolbar-btn" :disabled="actionLoading" @click="closeModal = false">{{ copy.cancel }}</button>
          <button class="toolbar-btn toolbar-btn-danger" :disabled="actionLoading || !canClose" @click="submitClose">
            <Icon name="lucide:check-check" size="15" />
            <span>{{ copy.closeConfirm }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="expenseModal" class="overlay" @click.self="expenseModal = false">
      <div class="dialog">
        <div class="dialog-head">
          <div>
            <span class="dialog-eyebrow">{{ copy.expenses }}</span>
            <h3>{{ copy.newExpenseTitle }}</h3>
          </div>
          <button class="dialog-close" type="button" @click="expenseModal = false">
            <Icon name="lucide:x" size="16" />
          </button>
        </div>

        <div class="dialog-grid">
          <label class="field-block">
            <span>{{ copy.amount }}</span>
            <div class="field-shell">
              <Icon name="lucide:banknote" size="16" />
              <input v-model.number="expenseForm.amount" type="number" min="1" class="field-input" />
            </div>
          </label>
          <label class="field-block">
            <span>{{ copy.name }}</span>
            <div class="field-shell">
              <Icon name="lucide:tag" size="16" />
              <input v-model.trim="expenseForm.title" class="field-input" />
            </div>
          </label>
          <label class="field-block">
            <span>{{ copy.category }}</span>
            <div class="field-shell">
              <Icon name="lucide:folder" size="16" />
              <input v-model.trim="expenseForm.category" class="field-input" />
            </div>
          </label>
          <label class="field-block">
            <span>{{ copy.note }}</span>
            <div class="field-shell">
              <Icon name="lucide:file-text" size="16" />
              <input v-model.trim="expenseForm.note" class="field-input" />
            </div>
          </label>
        </div>

        <p v-if="expenseError" class="alert err">{{ expenseError }}</p>

        <div class="dialog-actions">
          <button class="toolbar-btn" :disabled="actionLoading" @click="expenseModal = false">{{ copy.cancel }}</button>
          <button class="toolbar-btn toolbar-btn-primary" :disabled="actionLoading || !canCreateExpense" @click="submitExpense">
            <Icon name="lucide:save" size="15" />
            <span>{{ copy.save }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'
import { cpNativePageCopy } from '../../constants/cp-native-copy'

definePageMeta({
  layout: 'cp',
})

const copy = useCpCopy(cpNativePageCopy.shift)

useHead({
  title: computed(() => `${copy.value.headTitle} - NEXORA CLOUD CP`),
})

const shift = ref<any>(null)
const loading = ref(false)
const actionLoading = ref(false)
const pageError = ref('')
const autoRefresh = ref(true)
const lastSyncedAt = ref<string | null>(null)

const openModal = ref(false)
const closeModal = ref(false)
const expenseModal = ref(false)
const openError = ref('')
const closeError = ref('')
const expenseError = ref('')

const openForm = reactive({ openingCash: 0 })
const closeForm = reactive({ closingCash: 0 })
const expenseForm = reactive({
  amount: 0,
  title: '',
  category: '',
  note: '',
})
const closeChecks = reactive({
  cashCounted: false,
  expensesChecked: false,
  returnsChecked: false,
})

const totals = reactive({
  cash: 0,
  card: 0,
  bonus: 0,
  opsCount: 0,
})

const expenses = ref<any[]>([])
const expensesTotal = ref(0)
const returns = ref<any[]>([])
const operatorSummary = ref<any[]>([])
const handoverData = ref<any>(null)
const expectedFromApi = ref<number | null>(null)

let refreshTimer: number | null = null

const { formatMoney, formatDateTime } = useCpFormatters()

function txt(template: string, params: Record<string, string | number> = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`))
}

function toNum(value: any) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function money(value: any) {
  return `${formatMoney(toNum(value))} UZS`
}

function extractError(cause: any, fallback: string) {
  const firstError = cause?.response?.data?.errors ? Object.values(cause.response.data.errors).flat()[0] : null
  return String(firstError || cause?.response?.data?.message || fallback)
}

function operatorName(operator: any) {
  if (!operator) return '-'
  return operator.name || operator.login || '-'
}

const isOpen = computed(() => Boolean(shift.value && !shift.value.closed_at))
const openingCash = computed(() => toNum(shift.value?.opening_cash))
const cashIncome = computed(() => toNum(totals.cash))
const cardIncome = computed(() => toNum(totals.card))
const grossIncome = computed(() => cashIncome.value + cardIncome.value)
const returnsCashTotal = computed(() =>
  returns.value.reduce((sum, item) => {
    return String(item?.payment_method || '').toLowerCase() === 'cash' ? sum + toNum(item.amount) : sum
  }, 0),
)
const expectedCashBase = computed(() => {
  if (!isOpen.value) return 0
  if (expectedFromApi.value !== null) return expectedFromApi.value
  return openingCash.value + cashIncome.value - expensesTotal.value
})
const expectedCashNow = computed(() => (isOpen.value ? expectedCashBase.value - returnsCashTotal.value : 0))
const expenseRatio = computed(() => (grossIncome.value > 0 ? Math.round((expensesTotal.value / grossIncome.value) * 100) : 0))
const diffCash = computed(() => toNum(closeForm.closingCash) - expectedCashNow.value)
const diffClass = computed(() => {
  const abs = Math.abs(diffCash.value)
  if (abs === 0) return 'ok'
  if (abs <= 5000) return 'warn'
  return 'danger'
})
const diffLabel = computed(() => {
  if (diffCash.value === 0) return copy.value.diffMatch
  return diffCash.value > 0 ? copy.value.diffExtra : copy.value.diffShortage
})
const canClose = computed(() => isOpen.value && closeChecks.cashCounted && closeChecks.expensesChecked && closeChecks.returnsChecked)
const canCreateExpense = computed(() => isOpen.value && toNum(expenseForm.amount) > 0 && String(expenseForm.title).trim().length >= 2)
const expenseBreakdown = computed(() => {
  const map = new Map<string, number>()
  for (const item of expenses.value) {
    const key = String(item?.category || copy.value.other)
    map.set(key, (map.get(key) || 0) + toNum(item.amount))
  }
  return [...map.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
})
const topExpenseCategory = computed(() => expenseBreakdown.value[0] || { name: copy.value.other, total: 0 })
const disciplineScore = computed(() => {
  if (!isOpen.value) return 0
  let score = 100
  if (expenseRatio.value > 40) score -= 25
  else if (expenseRatio.value > 25) score -= 10
  if (returnsCashTotal.value > 0) score -= 10
  if (!totals.opsCount) score -= 10
  return Math.max(0, score)
})
const disciplineHint = computed(() => {
  if (!isOpen.value) return copy.value.disciplinePending
  if (disciplineScore.value >= 85) return copy.value.disciplineGood
  if (disciplineScore.value >= 65) return copy.value.disciplineMedium
  return copy.value.disciplineBad
})
const disciplineToneClass = computed(() => {
  if (disciplineScore.value >= 85) return 'good'
  if (disciplineScore.value >= 65) return 'mid'
  return 'risk'
})
const assistantHints = computed(() => {
  if (!isOpen.value) return copy.value.closedHints
  const hints = [txt(copy.value.opsRecorded, { value: totals.opsCount })]
  hints.push(expenseRatio.value > 35 ? copy.value.expenseHigh : copy.value.expenseNormal)
  hints.push(returnsCashTotal.value > 0 ? txt(copy.value.returnsPresent, { value: money(returnsCashTotal.value) }) : copy.value.returnsAbsent)
  if (topExpenseCategory.value.total > 0) hints.push(txt(copy.value.topCategory, { value: topExpenseCategory.value.name }))
  return hints.slice(0, 4)
})
const handoverLabel = computed(() => {
  const carry = handoverData.value?.carry
  if (!carry) return copy.value.noHandover
  if (carry.status === 'full') return copy.value.carryFull
  if (carry.status === 'partial') return copy.value.carryPartial
  if (carry.status === 'not_carried') return copy.value.carryNone
  return copy.value.noShortage
})
const operatorLeaderboard = computed(() => {
  const map = new Map<string, any>()
  for (const item of operatorSummary.value) {
    const key = String(item?.operator_id || item?.operator || 'unknown')
    map.set(key, {
      key,
      name: item?.operator || `operator #${item?.operator_id || '-'}`,
      salesGross: toNum(item?.gross),
      expenses: 0,
      returns: 0,
    })
  }
  for (const expense of expenses.value) {
    const key = String(expense?.operator_id || expense?.operator?.id || operatorName(expense?.operator))
    if (!map.has(key)) map.set(key, { key, name: operatorName(expense?.operator), salesGross: 0, expenses: 0, returns: 0 })
    map.get(key).expenses += toNum(expense.amount)
  }
  for (const ret of returns.value) {
    const key = String(ret?.operator_id || ret?.operator?.id || operatorName(ret?.operator))
    if (!map.has(key)) map.set(key, { key, name: operatorName(ret?.operator), salesGross: 0, expenses: 0, returns: 0 })
    map.get(key).returns += toNum(ret.amount)
  }
  return [...map.values()].map((item) => ({ ...item, net: item.salesGross - item.expenses - item.returns })).sort((a, b) => b.net - a.net)
})
const lastSyncLabel = computed(() => (!lastSyncedAt.value ? copy.value.notSynced : `${copy.value.syncedAt}: ${formatDateTime(lastSyncedAt.value)}`))
const cashRows = computed(() => [
  { key: 'opening', label: copy.value.openingCash, note: copy.value.opening, value: `+ ${money(openingCash.value)}`, tone: 'plus' },
  { key: 'cash', label: copy.value.cashIncome, note: copy.value.revenue, value: `+ ${money(cashIncome.value)}`, tone: 'plus' },
  { key: 'expenses', label: copy.value.expenses, note: `${expenseRatio.value}% ${copy.value.share}`, value: `- ${money(expensesTotal.value)}`, tone: 'minus' },
  { key: 'returns', label: copy.value.returns, note: copy.value.returnsTitle, value: `- ${money(returnsCashTotal.value)}`, tone: 'minus' },
  { key: 'expected', label: copy.value.expectedTotal, note: copy.value.byFormula, value: money(expectedCashNow.value), tone: 'total' },
])
const closeRows = computed(() => [
  { key: 'formula-opening', label: copy.value.openingCash, note: copy.value.opening, value: `+ ${money(openingCash.value)}`, tone: 'plus' },
  { key: 'formula-revenue', label: copy.value.cashIncome, note: copy.value.revenue, value: `+ ${money(cashIncome.value)}`, tone: 'plus' },
  { key: 'formula-expense', label: copy.value.expenses, note: copy.value.expensesTitle, value: `- ${money(expensesTotal.value)}`, tone: 'minus' },
  { key: 'formula-return', label: copy.value.returns, note: copy.value.returnsTitle, value: `- ${money(returnsCashTotal.value)}`, tone: 'minus' },
])

function resetState() {
  totals.cash = 0
  totals.card = 0
  totals.bonus = 0
  totals.opsCount = 0
  expectedFromApi.value = null
  expenses.value = []
  expensesTotal.value = 0
  returns.value = []
  operatorSummary.value = []
  handoverData.value = null
}

async function loadCurrentShift() {
  const response = await cpApi.shiftCurrent()
  shift.value = response?.data?.data || null
  if (!shift.value) resetState()
}

async function loadCurrentSummary() {
  if (!isOpen.value) return
  const response = await cpApi.currentShiftSummary()
  const payload = response?.data?.data || {}
  totals.cash = toNum(payload?.totals?.cash ?? payload?.totals?.cash_total)
  totals.card = toNum(payload?.totals?.card ?? payload?.totals?.card_total)
  totals.bonus = toNum(payload?.totals?.bonus ?? payload?.totals?.bonus_total)
  totals.opsCount = toNum(payload?.totals?.ops_count ?? payload?.totals?.operations_count)
  expectedFromApi.value = payload?.expected?.cash_now == null ? null : toNum(payload.expected.cash_now)
  operatorSummary.value = Array.isArray(payload?.by_operator) ? payload.by_operator : []
  handoverData.value = payload?.handover || null
  if (payload?.shift && !payload.shift.closed_at) shift.value = { ...(shift.value || {}), ...payload.shift }
}

async function loadCurrentExpenses() {
  if (!isOpen.value) return
  const response = await cpApi.shiftExpensesCurrent({ limit: 200 })
  const payload = response?.data?.data || {}
  expenses.value = Array.isArray(payload.items) ? payload.items : []
  expensesTotal.value = toNum(payload.total)
}

async function loadCurrentReturns() {
  if (!isOpen.value || !shift.value?.id) return
  const response = await cpApi.returnsList({ shift_id: shift.value.id, page: 1, per_page: 100 })
  const payload = response?.data?.data
  returns.value = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
}

async function reload() {
  loading.value = true
  pageError.value = ''
  try {
    await loadCurrentShift()
    if (isOpen.value) await Promise.all([loadCurrentSummary(), loadCurrentExpenses(), loadCurrentReturns()])
    lastSyncedAt.value = new Date().toISOString()
  } catch (cause: any) {
    pageError.value = extractError(cause, copy.value.pageError)
  } finally {
    loading.value = false
  }
}

async function submitOpen() {
  actionLoading.value = true
  openError.value = ''
  try {
    await cpApi.shiftOpen({ opening_cash: Math.max(0, toNum(openForm.openingCash)) })
    openModal.value = false
    openForm.openingCash = 0
    await reload()
  } catch (cause: any) {
    openError.value = extractError(cause, copy.value.shiftOpenError)
  } finally {
    actionLoading.value = false
  }
}

function openCloseModal() {
  closeForm.closingCash = expectedCashNow.value
  closeChecks.cashCounted = false
  closeChecks.expensesChecked = false
  closeChecks.returnsChecked = false
  closeError.value = ''
  closeModal.value = true
}

async function submitClose() {
  actionLoading.value = true
  closeError.value = ''
  try {
    await cpApi.shiftClose({ closing_cash: Math.max(0, toNum(closeForm.closingCash)) })
    closeModal.value = false
    await reload()
  } catch (cause: any) {
    closeError.value = extractError(cause, copy.value.shiftCloseError)
  } finally {
    actionLoading.value = false
  }
}

function openExpenseModal() {
  expenseForm.amount = 0
  expenseForm.title = ''
  expenseForm.category = ''
  expenseForm.note = ''
  expenseError.value = ''
  expenseModal.value = true
}

async function submitExpense() {
  actionLoading.value = true
  expenseError.value = ''
  try {
    await cpApi.shiftExpenseCreate({
      amount: toNum(expenseForm.amount),
      title: expenseForm.title.trim(),
      category: expenseForm.category.trim() || null,
      note: expenseForm.note.trim() || null,
    })
    expenseModal.value = false
    await Promise.all([loadCurrentSummary(), loadCurrentExpenses()])
  } catch (cause: any) {
    expenseError.value = extractError(cause, copy.value.expenseCreateError)
  } finally {
    actionLoading.value = false
  }
}

async function removeExpense(item: any) {
  try {
    await ElMessageBox.confirm(txt(copy.value.removeExpenseConfirm, { title: item.title || copy.value.expenses }), copy.value.confirmTitle, {
      type: 'warning',
      confirmButtonText: copy.value.confirmYes,
      cancelButtonText: copy.value.confirmNo,
    })
  } catch {
    return
  }

  actionLoading.value = true
  try {
    await cpApi.shiftExpenseDelete(item.id)
    ElMessage.success(copy.value.expenseRemoved)
    await Promise.all([loadCurrentSummary(), loadCurrentExpenses()])
  } finally {
    actionLoading.value = false
  }
}

onMounted(async () => {
  await reload()
  refreshTimer = window.setInterval(() => {
    if (!autoRefresh.value || loading.value || actionLoading.value || openModal.value || closeModal.value || expenseModal.value) return
    reload()
  }, 30000)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<style scoped>
.shift-page,
.shift-stats,
.shift-grid,
.hero-toolbar,
.assistant-stack,
.feed-list,
.hint-list,
.cash-card-stack,
.check-list,
.dialog-grid {
  display: grid;
  gap: 16px;
}

.shift-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.shift-grid {
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
}

.hero-toolbar {
  grid-template-columns: repeat(4, max-content);
  justify-content: end;
  align-items: center;
  gap: 10px;
}

.hero-pill,
.toggle-chip,
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}

.hero-pill {
  min-height: 34px;
  font-size: 12px;
  color: var(--text-muted);
}

.hero-pill.live {
  border-color: color-mix(in srgb, var(--success) 30%, var(--stroke));
  color: var(--success);
}

.toggle-chip {
  cursor: pointer;
}

.toggle-chip input {
  margin: 0;
}

.toolbar-btn {
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.toolbar-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.toolbar-btn:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.toolbar-btn-primary {
  border-color: color-mix(in srgb, var(--brand-secondary) 28%, var(--stroke));
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 26%, var(--surface-soft)), color-mix(in srgb, var(--brand) 24%, var(--surface-soft)));
}

.toolbar-btn-danger {
  border-color: color-mix(in srgb, var(--danger) 30%, var(--stroke));
  background: color-mix(in srgb, var(--danger) 14%, var(--surface-soft));
}

.compact-btn {
  min-height: 34px;
  padding: 0 12px;
  font-size: 12px;
}

.cash-row,
.handover-card,
.assistant-highlight,
.feed-item,
.summary-box,
.diff-box,
.closed-state,
.field-shell,
.dialog,
.check-item {
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.cash-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
}

.cash-copy {
  display: grid;
  gap: 4px;
}

.cash-copy span {
  font-size: 14px;
  font-weight: 600;
}

.cash-copy small {
  font-size: 11px;
  color: var(--text-muted);
}

.cash-row strong {
  font-size: 18px;
  line-height: 1;
}

.cash-row.plus strong {
  color: var(--success);
}

.cash-row.minus strong {
  color: var(--danger);
}

.cash-row.total {
  border-color: color-mix(in srgb, var(--brand) 34%, var(--stroke));
}

.cash-row.total strong {
  color: var(--brand);
}

.handover-card,
.closed-state,
.assistant-highlight,
.summary-box {
  padding: 16px;
  border-radius: 18px;
}

.handover-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand);
}

.handover-card p {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-muted);
}

.closed-state {
  justify-items: start;
  gap: 12px;
}

.closed-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--brand-secondary) 14%, var(--surface));
  color: var(--brand-secondary);
}

.closed-state strong {
  font-size: 16px;
}

.closed-list,
.hint-list {
  margin: 0;
  padding-left: 18px;
}

.closed-list li,
.hint-list li {
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-muted);
}

.assistant-highlight {
  display: grid;
  gap: 6px;
}

.assistant-highlight span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.assistant-highlight strong {
  display: block;
  margin-top: 6px;
  font-size: 28px;
  line-height: 1;
}

.assistant-highlight small {
  font-size: 12px;
  color: var(--text-muted);
}

.assistant-highlight.good {
  border-color: color-mix(in srgb, var(--success) 32%, var(--stroke));
}

.assistant-highlight.mid {
  border-color: color-mix(in srgb, var(--accent) 30%, var(--stroke));
}

.assistant-highlight.risk {
  border-color: color-mix(in srgb, var(--danger) 30%, var(--stroke));
}

.leaderboard {
  display: grid;
  gap: 8px;
}

.leaderboard-head,
.leaderboard-row {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) 0.9fr 0.8fr 0.9fr;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.leaderboard-head {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.leaderboard-row span,
.leaderboard-row strong {
  font-size: 13px;
}

.feed-list {
  gap: 10px;
}

.feed-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
}

.feed-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--brand-secondary) 14%, var(--surface));
  color: var(--brand-secondary);
}

.feed-icon.expense {
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  color: var(--accent);
}

.feed-icon.return {
  background: color-mix(in srgb, var(--danger) 12%, var(--surface));
  color: var(--danger);
}

.feed-main {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.feed-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.feed-topline strong,
.feed-topline span {
  font-size: 14px;
}

.feed-main small {
  font-size: 12px;
  color: var(--text-muted);
}

.empty-state.compact {
  min-height: 96px;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(2, 6, 23, 0.58);
  backdrop-filter: blur(10px);
}

.dialog {
  width: min(560px, 96vw);
  display: grid;
  gap: 18px;
  padding: 20px;
  border-radius: 24px;
  box-shadow: var(--shadow-panel);
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
}

.dialog-wide {
  width: min(840px, 96vw);
}

.dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dialog-head h3 {
  margin: 6px 0 0;
  font-size: 24px;
  line-height: 1.05;
}

.dialog-eyebrow {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand);
}

.dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
}

.dialog-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dialog-grid.single {
  grid-template-columns: minmax(0, 1fr);
}

.close-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.88fr);
  gap: 16px;
}

.close-panel {
  display: grid;
  gap: 14px;
}

.field-block {
  display: grid;
  gap: 8px;
}

.field-block > span {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.field-shell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 16px;
}

.field-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 14px;
}

.summary-box {
  display: grid;
  gap: 8px;
}

.summary-box span {
  font-size: 12px;
  color: var(--text-muted);
}

.summary-box strong {
  font-size: 18px;
  line-height: 1;
}

.strong-box strong {
  font-size: 26px;
}

.diff-box {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
}

.diff-box span,
.diff-box small {
  font-size: 12px;
  color: var(--text-muted);
}

.diff-box strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
  line-height: 1;
}

.diff-box.ok {
  border-color: color-mix(in srgb, var(--brand) 30%, var(--stroke));
}

.diff-box.warn {
  border-color: color-mix(in srgb, var(--accent) 30%, var(--stroke));
}

.diff-box.danger {
  border-color: color-mix(in srgb, var(--danger) 30%, var(--stroke));
}

.check-list {
  gap: 10px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
}

.check-item span {
  font-size: 13px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.alert.err {
  margin: 0;
}

@media (max-width: 1180px) {
  .shift-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .shift-grid,
  .close-layout,
  .dialog-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 920px) {
  .hero-toolbar {
    grid-template-columns: repeat(2, minmax(0, max-content));
    justify-content: start;
  }
}

@media (max-width: 720px) {
  .shift-stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .toolbar-btn,
  .toggle-chip {
    width: 100%;
  }

  .leaderboard-head,
  .leaderboard-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .feed-item {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .feed-item .toolbar-btn {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
