<template>
  <div class="shift-page">
    <section class="hero card">
      <div>
        <p class="eyebrow">Cash Desk</p>
        <h1 class="title">Shift Boshqaruvi</h1>
        <p class="subtitle">Smena ochish/yopish, xarajatlar va real-time kassa holati.</p>
      </div>

      <div class="hero-actions">
        <label class="auto-refresh-toggle">
          <input v-model="autoRefresh" type="checkbox" />
          <span>Auto 30s</span>
        </label>
        <span class="sync-badge">{{ lastSyncText }}</span>
        <button class="btn ghost" :disabled="loading || actionLoading" @click="reload">Yangilash</button>
        <button v-if="!isOpen" class="btn primary" :disabled="loading || actionLoading" @click="openModal = true">
          Smenani ochish
        </button>
        <button v-else class="btn danger" :disabled="loading || actionLoading" @click="openCloseModal">
          Smenani yopish
        </button>
      </div>
    </section>

    <section class="hero-insights">
      <article class="insight-pill" :class="isOpen ? 'ok' : 'idle'">
        <span class="insight-title">Session Mode</span>
        <strong>{{ isOpen ? 'Shift online' : 'Shift offline' }}</strong>
        <small>{{ isOpen ? `${operationsCount} ta operatsiya` : 'Kassa harakati yo\'q' }}</small>
      </article>

      <article class="insight-pill" :class="expenseToneClass">
        <span class="insight-title">Expense Pressure</span>
        <strong>{{ expenseRatio }}%</strong>
        <small>{{ expenseToneText }}</small>
      </article>

      <article class="insight-pill" :class="expectedCashNow >= openingCash ? 'ok' : 'risk'">
        <span class="insight-title">Cash Guard</span>
        <strong>{{ money(expectedCashNow) }}</strong>
        <small>{{ cashGuardText }}</small>
      </article>
    </section>

    <p v-if="pageError" class="alert danger">{{ pageError }}</p>

    <section class="command-grid">
      <article class="card command-card">
        <div class="section-head">
          <div>
            <h2>Operator yordamchisi</h2>
            <p>Joriy holat bo'yicha aniq tavsiyalar va tekshiruv yo'riqnomasi.</p>
          </div>
          <span class="score-badge" :class="disciplineToneClass">{{ disciplineScore }}%</span>
        </div>

        <ul class="assistant-list">
          <li v-for="hint in assistantHints" :key="hint">{{ hint }}</li>
        </ul>

        <div class="assistant-mini-grid">
          <div class="assistant-mini">
            <span>O'rtacha chek</span>
            <strong>{{ operationsCount > 0 ? money(Math.round(grossIncome / operationsCount)) : money(0) }}</strong>
          </div>
          <div class="assistant-mini">
            <span>Top kategoriya</span>
            <strong>{{ topExpenseCategory.name }}</strong>
          </div>
          <div class="assistant-mini">
            <span>Top kategoriya summasi</span>
            <strong>{{ money(topExpenseCategory.total) }}</strong>
          </div>
        </div>
      </article>

      <article class="card command-card">
        <div class="section-head">
          <div>
            <h2>Cashflow xaritasi</h2>
            <p>Formula bo'yicha kutilgan kassa holati.</p>
          </div>
        </div>

        <div class="flow-list">
          <div class="flow-row plus">
            <span>Boshlang'ich naqd</span>
            <strong>+ {{ money(openingCash) }}</strong>
          </div>
          <div class="flow-row plus">
            <span>Naqd tushum</span>
            <strong>+ {{ money(cashIncome) }}</strong>
          </div>
          <div class="flow-row minus">
            <span>Xarajatlar</span>
            <strong>- {{ money(expensesTotal) }}</strong>
          </div>
          <div class="flow-row minus">
            <span>Naqd qaytarish</span>
            <strong>- {{ money(returnsCashTotal) }}</strong>
          </div>
          <div class="flow-row total">
            <span>Kutilgan naqd</span>
            <strong>{{ money(expectedCashNow) }}</strong>
          </div>
        </div>

        <div class="timeline-box" v-if="recentEvents.length">
          <h3>So'nggi harakatlar</h3>
          <ul>
            <li v-for="event in recentEvents" :key="event.id">
              <small>{{ event.time }}</small>
              <span>{{ event.label }}</span>
              <strong>{{ money(event.amount) }}</strong>
            </li>
          </ul>
        </div>
        <div v-else class="empty-box">Hali smena harakati yo'q.</div>
      </article>
    </section>

    <section class="ops-grid">
      <article class="card ops-card">
        <div class="section-head">
          <div>
            <h2>Operator mini reyting</h2>
            <p>Sotuv, xarajat va qaytarish asosida joriy smena kesimi.</p>
          </div>
        </div>

        <div v-if="operatorLeaderboard.length" class="ops-table">
          <div class="ops-head">
            <span>#</span>
            <span>Operator</span>
            <span class="right">Sotuv</span>
            <span class="right">Xarajat</span>
            <span class="right">Qaytarish</span>
            <span class="right">Sof</span>
          </div>
          <div v-for="(row, idx) in operatorLeaderboard" :key="row.key" class="ops-row">
            <span>{{ idx + 1 }}</span>
            <span>{{ row.name }}</span>
            <span class="right">{{ money(row.salesGross) }}</span>
            <span class="right">{{ money(row.expenses) }}</span>
            <span class="right">{{ money(row.returns) }}</span>
            <strong class="right" :class="row.net >= 0 ? 'tone-good' : 'tone-bad'">{{ money(row.net) }}</strong>
          </div>
        </div>
        <div v-else class="empty-box">Reyting uchun operator kesimidagi ma'lumot hali yo'q.</div>
      </article>

      <article class="card ops-card">
        <div class="section-head">
          <div>
            <h2>Anomaly signal</h2>
            <p>Kutilmagan holatlarni oldindan ko'rsatadi.</p>
          </div>
        </div>

        <div v-if="anomalySignals.length" class="signals-list">
          <div v-for="(signal, idx) in anomalySignals" :key="`signal-${idx}`" class="signal-item" :class="`s-${signal.level}`">
            <strong>{{ signal.title }}</strong>
            <p>{{ signal.text }}</p>
          </div>
        </div>
        <div v-else class="empty-box">Hozircha ogohlantiruvchi signal topilmadi.</div>
      </article>
    </section>

    <section class="card handover-section">
      <div class="section-head">
        <div>
          <h2>Shift handover mode</h2>
          <p>Oldingi smenadan o'tgan kamomad va current opening mosligi.</p>
        </div>
      </div>

      <div v-if="handoverData?.previous_shift" class="handover-grid">
        <div class="handover-card">
          <div class="row-item"><span>Oldingi shift</span><strong>#{{ handoverData.previous_shift.id }}</strong></div>
          <div class="row-item"><span>Yopilgan vaqt</span><strong>{{ formatDateTime(handoverData.previous_shift.closed_at) }}</strong></div>
          <div class="row-item"><span>Yopilgan naqd</span><strong>{{ money(handoverData.previous_shift.closing_cash) }}</strong></div>
          <div class="row-item"><span>Kutilgan naqd</span><strong>{{ money(handoverData.previous_shift.expected_cash) }}</strong></div>
          <div class="row-item"><span>Kamomad (oldingi)</span><strong class="tone-bad">{{ money(handoverData.carry.previous_shortage) }}</strong></div>
        </div>
        <div class="handover-card">
          <div class="row-item"><span>Current opening</span><strong>{{ money(handoverData.carry.current_opening_cash) }}</strong></div>
          <div class="row-item"><span>Carry qilingan summa</span><strong class="tone-good">{{ money(handoverData.carry.carried_amount) }}</strong></div>
          <div class="row-item"><span>Qolgan kamomad</span><strong :class="handoverData.carry.unresolved_shortage > 0 ? 'tone-bad' : 'tone-good'">{{ money(handoverData.carry.unresolved_shortage) }}</strong></div>
          <div class="row-item"><span>Carry ulushi</span><strong>{{ handoverData.carry.carry_rate }}%</strong></div>
          <div class="handover-status" :class="handoverStatusClass">{{ handoverStatusText }}</div>
        </div>
      </div>
      <div v-else class="empty-box">Handover uchun oldingi yopilgan smena topilmadi.</div>
    </section>

    <section class="kpi-grid">
      <article class="card kpi">
        <p class="kpi-label">Smena holati</p>
        <p class="kpi-value">{{ isOpen ? 'Ochiq' : 'Yopiq' }}</p>
        <span class="status-pill" :class="isOpen ? 'ok' : 'muted'">{{ isOpen ? 'ACTIVE' : 'IDLE' }}</span>
        <p class="kpi-sub">{{ isOpen ? `#${shift?.id}` : 'Smena mavjud emas' }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">Tushum</p>
        <p class="kpi-value">{{ money(grossIncome) }}</p>
        <p class="kpi-sub">Naqd: {{ money(cashIncome) }} · Karta: {{ money(cardIncome) }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">Kutilgan naqd</p>
        <p class="kpi-value">{{ money(expectedCashNow) }}</p>
        <p class="kpi-sub">Boshlang'ich + naqd tushum - xarajat - cash return</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">Xarajat va qaytarish</p>
        <p class="kpi-value">{{ money(expensesTotal + returnsCashTotal) }}</p>
        <p class="kpi-sub">Xarajat: {{ money(expensesTotal) }} · Return: {{ money(returnsCashTotal) }}</p>
      </article>
    </section>

    <section class="content-grid">
      <article class="card summary">
        <div class="section-head">
          <div>
            <h2>Smena ma'lumoti</h2>
            <p>Joriy smena bo'yicha aniq snapshot.</p>
          </div>
        </div>

        <div class="summary-list">
          <div class="row-item">
            <span>Shift ID</span>
            <strong>{{ isOpen ? `#${shift?.id}` : '-' }}</strong>
          </div>
          <div class="row-item">
            <span>Ochilgan vaqt</span>
            <strong>{{ isOpen ? formatDateTime(shift?.opened_at) : '-' }}</strong>
          </div>
          <div class="row-item">
            <span>Ochgan operator</span>
            <strong>{{ isOpen ? operatorName(shift?.opened_by || shift?.openedBy) : '-' }}</strong>
          </div>
          <div class="row-item">
            <span>Boshlang'ich naqd</span>
            <strong>{{ isOpen ? money(openingCash) : '-' }}</strong>
          </div>
          <div class="row-item">
            <span>Bonus</span>
            <strong>{{ isOpen ? money(bonusTotal) : '-' }}</strong>
          </div>
          <div class="row-item">
            <span>Operatsiyalar</span>
            <strong>{{ isOpen ? operationsCount : '-' }}</strong>
          </div>
          <div class="row-item">
            <span>Naqd qaytarish</span>
            <strong>{{ isOpen ? money(returnsCashTotal) : '-' }}</strong>
          </div>
        </div>

        <div v-if="!isOpen" class="empty-box">
          Smena yopiq. Avval smena oching.
        </div>
      </article>

      <article class="card expenses">
        <div class="section-head">
          <div>
            <h2>Smena xarajatlari</h2>
            <p>Faqat ochiq smenada qo'shish va o'chirish mumkin.</p>
          </div>
          <button class="btn primary" :disabled="!isOpen || loading || actionLoading" @click="openExpenseModal">
            Xarajat qo'shish
          </button>
        </div>

        <div v-if="isOpen" class="preset-row">
          <span>Tezkor shablonlar:</span>
          <button
            v-for="preset in expensePresets"
            :key="preset.title"
            class="preset-chip"
            :disabled="loading || actionLoading"
            @click="selectExpensePreset(preset)"
          >
            {{ preset.title }}
          </button>
        </div>

        <div class="table" v-if="expenses.length">
          <div class="thead">
            <span>Vaqt</span>
            <span>Nomi</span>
            <span>Kategoriya</span>
            <span class="right">Summa</span>
            <span class="right">Amal</span>
          </div>

          <div v-for="item in expenses" :key="item.id" class="trow">
            <span>{{ formatDateTime(item.spent_at || item.created_at) }}</span>
            <span>{{ item.title || '-' }}</span>
            <span>{{ item.category || '-' }}</span>
            <strong class="right">{{ money(item.amount) }}</strong>
            <div class="right">
              <button class="btn ghost tiny" :disabled="!isOpen || actionLoading" @click="askDeleteExpense(item)">O'chirish</button>
            </div>
          </div>
        </div>

        <div v-else class="empty-box">Hozircha xarajatlar yo'q.</div>

        <div class="returns-box" v-if="returns.length">
          <div class="returns-head">
            <h3>Qaytarishlar</h3>
            <strong>{{ money(returnsTotal) }}</strong>
          </div>
          <ul>
            <li v-for="ret in returns.slice(0, 6)" :key="ret.id">
              <span>{{ ret.client?.login || ret.client?.phone || `#${ret.client_id || '-'}` }}</span>
              <span>{{ ret.payment_method || '-' }}</span>
              <strong>{{ money(ret.amount) }}</strong>
            </li>
          </ul>
        </div>
      </article>
    </section>

    <div v-if="openModal" class="overlay" @click.self="openModal = false">
      <div class="modal card">
        <div class="modal-head">
          <h3>Smenani ochish</h3>
          <button class="icon-btn" @click="openModal = false">×</button>
        </div>

        <label class="field">
          <span>Boshlang'ich naqd (UZS)</span>
          <input v-model.number="openForm.openingCash" type="number" min="0" class="input" placeholder="0" />
        </label>

        <p v-if="openError" class="alert danger">{{ openError }}</p>

        <div class="modal-actions">
          <button class="btn ghost" :disabled="actionLoading" @click="openModal = false">Bekor</button>
          <button class="btn primary" :disabled="actionLoading" @click="submitOpen">Ochish</button>
        </div>
      </div>
    </div>

    <div v-if="closeModal" class="overlay" @click.self="closeModal = false">
      <div class="modal card wide">
        <div class="modal-head">
          <h3>Smenani yopish</h3>
          <button class="icon-btn" @click="closeModal = false">×</button>
        </div>

        <div class="close-grid">
          <div class="close-card">
            <div class="row-item"><span>Shift</span><strong>#{{ shift?.id || '-' }}</strong></div>
            <div class="row-item"><span>Boshlang'ich naqd</span><strong>{{ money(openingCash) }}</strong></div>
            <div class="row-item"><span>Naqd tushum</span><strong>{{ money(cashIncome) }}</strong></div>
            <div class="row-item"><span>Karta tushum</span><strong>{{ money(cardIncome) }}</strong></div>
            <div class="row-item"><span>Xarajatlar</span><strong>{{ money(expensesTotal) }}</strong></div>
            <div class="row-item"><span>Cash return</span><strong>{{ money(returnsCashTotal) }}</strong></div>
            <div class="row-item strong-line"><span>Kutilgan naqd</span><strong>{{ money(expectedCashNow) }}</strong></div>
          </div>

          <div class="close-card">
            <label class="field">
              <span>Amaldagi naqd (UZS)</span>
              <input v-model.number="closeForm.closingCash" type="number" min="0" class="input" placeholder="0" />
            </label>

            <div class="quick-close-row">
              <button class="btn ghost tiny" type="button" @click="setClosingCashPreset(expectedCashNow)">
                Formula bo'yicha: {{ money(expectedCashNow) }}
              </button>
              <button class="btn ghost tiny" type="button" @click="setClosingCashPreset(Math.max(0, expectedCashNow - 50000))">
                -50 000
              </button>
              <button class="btn ghost tiny" type="button" @click="setClosingCashPreset(expectedCashNow + 50000)">
                +50 000
              </button>
            </div>

            <div class="denom-box">
              <div class="denom-head">
                <strong>Kupyura kalkulyatori</strong>
                <button class="btn ghost tiny" type="button" @click="applyCashBreakdown">Inputga qo'yish</button>
              </div>
              <div class="denom-grid">
                <label v-for="denom in cashDenominations" :key="denom" class="denom-item">
                  <span>{{ money(denom).replace(' UZS', '') }}</span>
                  <input v-model.number="cashBreakdown[String(denom)]" min="0" type="number" class="input small" />
                </label>
              </div>
              <div class="denom-total">
                <span>Hisoblangan naqd</span>
                <strong>{{ money(cashBreakdownTotal) }}</strong>
              </div>
            </div>

            <div class="diff-box" :class="diffClass">
              <span>Farq</span>
              <strong>{{ money(diffCash) }}</strong>
              <em>{{ diffLabel }}</em>
            </div>

            <div class="close-checklist">
              <label><input v-model="closeChecks.cashCounted" type="checkbox" /> Naqd pul fizik sanaldi</label>
              <label><input v-model="closeChecks.expensesChecked" type="checkbox" /> Xarajatlar chek bilan solishtirildi</label>
              <label><input v-model="closeChecks.returnsChecked" type="checkbox" /> Qaytarishlar tasdiqlandi</label>
            </div>
            <p v-if="!closeChecklistDone" class="hint-text">Yopishdan oldin barcha 3 bandni belgilang.</p>
            <button class="btn ghost tiny" type="button" @click="printCloseChecklist">Print / PDF checklist</button>

            <p v-if="closeError" class="alert danger">{{ closeError }}</p>

            <div class="modal-actions">
              <button class="btn ghost" :disabled="actionLoading" @click="closeModal = false">Bekor</button>
              <button class="btn danger" :disabled="actionLoading || !canClose" @click="submitClose">Tasdiqlab yopish</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="expenseModal" class="overlay" @click.self="expenseModal = false">
      <div class="modal card">
        <div class="modal-head">
          <h3>Yangi xarajat</h3>
          <button class="icon-btn" @click="expenseModal = false">×</button>
        </div>

        <label class="field">
          <span>Summa (UZS)</span>
          <input v-model.number="expenseForm.amount" type="number" min="1" class="input" placeholder="0" />
        </label>

        <label class="field">
          <span>Nomi</span>
          <input v-model.trim="expenseForm.title" type="text" class="input" placeholder="Masalan: Suv" />
        </label>

        <label class="field">
          <span>Kategoriya</span>
          <input v-model.trim="expenseForm.category" type="text" class="input" placeholder="masalan: oziq-ovqat / ta'mirlash / boshqa" />
        </label>

        <label class="field">
          <span>Izoh</span>
          <input v-model.trim="expenseForm.note" type="text" class="input" placeholder="ixtiyoriy" />
        </label>

        <p v-if="expenseError" class="alert danger">{{ expenseError }}</p>

        <div class="modal-actions">
          <button class="btn ghost" :disabled="actionLoading" @click="expenseModal = false">Bekor</button>
          <button class="btn primary" :disabled="actionLoading || !canCreateExpense" @click="submitExpense">Saqlash</button>
        </div>
      </div>
    </div>

    <div v-if="deleteModal.open" class="overlay" @click.self="deleteModal.open = false">
      <div class="modal card">
        <div class="modal-head">
          <h3>Xarajatni o'chirish</h3>
          <button class="icon-btn" @click="deleteModal.open = false">×</button>
        </div>

        <p class="subtitle" style="margin:0 0 12px 0">Ushbu amal ortga qaytmaydi.</p>

        <div class="row-item">
          <span>{{ deleteModal.item?.title || '-' }}</span>
          <strong>{{ money(deleteModal.item?.amount) }}</strong>
        </div>

        <p v-if="deleteModal.error" class="alert danger">{{ deleteModal.error }}</p>

        <div class="modal-actions">
          <button class="btn ghost" :disabled="deleteModal.loading" @click="deleteModal.open = false">Bekor</button>
          <button class="btn danger" :disabled="deleteModal.loading" @click="submitDeleteExpense">O'chirish</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { cpApi } from '../../api/cp'

const loading = ref(false)
const actionLoading = ref(false)
const pageError = ref('')

const shift = ref(null)
const autoRefresh = ref(true)
const lastSyncedAt = ref(null)

const totals = reactive({
  cash: 0,
  card: 0,
  bonus: 0,
  opsCount: 0,
})

const expectedFromApi = ref(null)

const expenses = ref([])
const expensesTotal = ref(0)
const returns = ref([])
const operatorSummary = ref([])
const handoverData = ref(null)

const openModal = ref(false)
const closeModal = ref(false)
const expenseModal = ref(false)

const openError = ref('')
const closeError = ref('')
const expenseError = ref('')

const openForm = reactive({ openingCash: 0 })
const closeForm = reactive({ closingCash: 0 })
const closeChecks = reactive({
  cashCounted: false,
  expensesChecked: false,
  returnsChecked: false,
})
const expenseForm = reactive({
  amount: 0,
  title: '',
  category: '',
  note: '',
})

const cashDenominations = [200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000]
const cashBreakdown = reactive(
  cashDenominations.reduce((acc, denom) => {
    acc[String(denom)] = 0
    return acc
  }, {})
)

const expensePresets = [
  { title: 'Suv', category: 'maishiy', note: 'Tezkor xarajat' },
  { title: 'Tozalash', category: 'maishiy', note: 'Tezkor xarajat' },
  { title: 'Oziq-ovqat', category: 'xomashyo', note: 'Tezkor xarajat' },
  { title: 'Ta\'mirlash', category: 'ta\'mirlash', note: 'Tezkor xarajat' },
  { title: 'Transport', category: 'logistika', note: 'Tezkor xarajat' },
]

const deleteModal = reactive({
  open: false,
  loading: false,
  error: '',
  item: null,
})

const toNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const money = (v) => {
  const value = toNum(v)
  return `${new Intl.NumberFormat('ru-RU').format(value)} UZS`
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const extractError = (error, fallback) => {
  const validation = error?.response?.data?.errors
  if (validation && typeof validation === 'object') {
    const first = Object.values(validation).flat()[0]
    if (first) return String(first)
  }
  return String(error?.response?.data?.message || fallback)
}

const operatorName = (operator) => {
  if (!operator) return '-'
  return operator.name || operator.login || '-'
}

const operatorKeyFrom = (id, name) => {
  if (id != null && id !== '') return `id-${id}`
  return `name-${String(name || 'unknown').toLowerCase()}`
}

const isOpen = computed(() => !!shift.value && !shift.value.closed_at)
const openingCash = computed(() => toNum(shift.value?.opening_cash))

const cashIncome = computed(() => toNum(totals.cash))
const cardIncome = computed(() => toNum(totals.card))
const grossIncome = computed(() => cashIncome.value + cardIncome.value)
const bonusTotal = computed(() => toNum(totals.bonus))
const operationsCount = computed(() => toNum(totals.opsCount))

const returnsTotal = computed(() => returns.value.reduce((sum, item) => sum + toNum(item.amount), 0))
const returnsCashTotal = computed(() => returns.value.reduce((sum, item) => {
  const method = String(item?.payment_method || '').toLowerCase()
  return method === 'cash' ? sum + toNum(item.amount) : sum
}, 0))

const expectedCashBase = computed(() => {
  if (!isOpen.value) return 0
  if (expectedFromApi.value != null) return toNum(expectedFromApi.value)
  return openingCash.value + cashIncome.value - expensesTotal.value
})

const expectedCashNow = computed(() => {
  if (!isOpen.value) return 0
  return expectedCashBase.value - returnsCashTotal.value
})

const diffCash = computed(() => toNum(closeForm.closingCash) - expectedCashNow.value)
const diffClass = computed(() => {
  const abs = Math.abs(diffCash.value)
  if (abs === 0) return 'ok'
  if (abs <= 5000) return 'warn'
  return 'danger'
})
const diffLabel = computed(() => {
  if (diffCash.value === 0) return 'Mos'
  return diffCash.value > 0 ? 'Ortiqcha' : 'Kamomad'
})

const closeChecklistDone = computed(() => {
  return closeChecks.cashCounted && closeChecks.expensesChecked && closeChecks.returnsChecked
})

const canClose = computed(() => {
  return isOpen.value && toNum(closeForm.closingCash) >= 0 && closeChecklistDone.value
})
const canCreateExpense = computed(() => {
  return isOpen.value && toNum(expenseForm.amount) > 0 && String(expenseForm.title).trim().length >= 2
})

const expenseRatio = computed(() => {
  if (!isOpen.value || grossIncome.value <= 0) return 0
  return Math.round((expensesTotal.value / grossIncome.value) * 100)
})

const expenseToneClass = computed(() => {
  if (!isOpen.value) return 'idle'
  if (expenseRatio.value <= 20) return 'ok'
  if (expenseRatio.value <= 40) return 'warn'
  return 'risk'
})

const expenseToneText = computed(() => {
  if (!isOpen.value) return 'Smena ochilganda baho beriladi'
  if (expenseRatio.value <= 20) return 'Sog\'lom xarajat ulushi'
  if (expenseRatio.value <= 40) return 'Nazorat talab etiladi'
  return 'Xarajat bosimi yuqori'
})

const cashGuardText = computed(() => {
  if (!isOpen.value) return 'Smena hozir yopiq'
  if (expectedCashNow.value >= openingCash.value) return 'Kassa oqimi me\'yorda'
  return 'Kassani qayta tekshiring'
})

const cashBreakdownTotal = computed(() => {
  return cashDenominations.reduce((sum, denom) => {
    return sum + denom * Math.max(0, toNum(cashBreakdown[String(denom)]))
  }, 0)
})

const expenseCategoryBreakdown = computed(() => {
  const grouped = new Map()
  for (const item of expenses.value) {
    const key = String(item?.category || 'Boshqa').trim() || 'Boshqa'
    grouped.set(key, (grouped.get(key) || 0) + toNum(item?.amount))
  }
  return [...grouped.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
})

const topExpenseCategory = computed(() => {
  if (!expenseCategoryBreakdown.value.length) return { name: '-', total: 0 }
  return expenseCategoryBreakdown.value[0]
})

const recentEvents = computed(() => {
  const expenseEvents = expenses.value.map((item) => ({
    id: `exp-${item.id}`,
    at: item?.spent_at || item?.created_at,
    amount: toNum(item?.amount),
    label: `Xarajat: ${item?.title || '-'} (${item?.category || 'Boshqa'})`,
  }))

  const returnEvents = returns.value.map((item) => ({
    id: `ret-${item.id}`,
    at: item?.created_at,
    amount: toNum(item?.amount),
    label: `Qaytarish: ${item?.client?.login || item?.client?.phone || `#${item?.client_id || '-'}`}`,
  }))

  return [...expenseEvents, ...returnEvents]
    .sort((a, b) => {
      const aTime = new Date(a.at || 0).getTime() || 0
      const bTime = new Date(b.at || 0).getTime() || 0
      return bTime - aTime
    })
    .slice(0, 7)
    .map((event) => ({
      ...event,
      time: formatDateTime(event.at),
    }))
})

const disciplineScore = computed(() => {
  if (!isOpen.value) return 0

  let score = 100

  if (expenseRatio.value > 45) score -= 35
  else if (expenseRatio.value > 30) score -= 20
  else if (expenseRatio.value > 20) score -= 8

  if (returnsCashTotal.value > 0) {
    const ratio = grossIncome.value > 0 ? (returnsCashTotal.value / grossIncome.value) * 100 : 0
    if (ratio > 12) score -= 25
    else if (ratio > 6) score -= 12
    else score -= 5
  }

  if (operationsCount.value === 0) score -= 10

  return Math.max(0, Math.min(100, Math.round(score)))
})

const disciplineToneClass = computed(() => {
  if (!isOpen.value) return 'idle'
  if (disciplineScore.value >= 85) return 'ok'
  if (disciplineScore.value >= 65) return 'warn'
  return 'risk'
})

const assistantHints = computed(() => {
  if (!isOpen.value) {
    return [
      'Smena yopiq: yangi smena ochib boshlang.',
      'Opening naqdni real kassa bilan bir xil kiriting.',
      'Smena yopilganda formula va real naqd mosligini tekshiring.',
    ]
  }

  const hints = []

  if (operationsCount.value === 0) {
    hints.push('Operatsiya yo\'q: POS yoki buyurtma oqimini tekshiring.')
  } else {
    hints.push(`Jami ${operationsCount.value} operatsiya qayd etilgan.`)
  }

  if (expenseRatio.value > 40) {
    hints.push('Xarajat ulushi yuqori: xarajat cheklarini qayta tasdiqlang.')
  } else if (expenseRatio.value > 25) {
    hints.push('Xarajat ulushi o\'rtacha: smena oxirida kategoriya kesimini tekshiring.')
  } else {
    hints.push('Xarajat intizomi yaxshi holatda.')
  }

  if (returnsCashTotal.value > 0) {
    hints.push(`Naqd qaytarish mavjud: ${money(returnsCashTotal.value)}. Return sabablari bilan solishtiring.`)
  } else {
    hints.push('Naqd qaytarishlar yo\'q yoki nolga teng.')
  }

  const cat = topExpenseCategory.value
  if (cat.total > 0) {
    hints.push(`Eng katta xarajat: ${cat.name} (${money(cat.total)}).`)
  }

  return hints.slice(0, 4)
})

const lastSyncText = computed(() => {
  if (!lastSyncedAt.value) return 'Sinxronlanmagan'
  return `So'nggi yangilanish: ${formatDateTime(lastSyncedAt.value)}`
})

const handoverStatusClass = computed(() => {
  const status = handoverData.value?.carry?.status
  if (status === 'full') return 'ok'
  if (status === 'partial') return 'warn'
  if (status === 'not_carried') return 'risk'
  return 'idle'
})

const handoverStatusText = computed(() => {
  const carry = handoverData.value?.carry
  if (!carry) return 'Handover ma\'lumot yo\'q'

  if (carry.status === 'none') return 'Oldingi smenada kamomad yo\'q'
  if (carry.status === 'full') return 'Kamomad to\'liq openingga ko\'chgan'
  if (carry.status === 'partial') return 'Kamomad qisman openingga ko\'chgan'
  if (carry.status === 'not_carried') return 'Kamomad openingga o\'tmagan'
  return 'Handover holati aniqlanmadi'
})

const operatorLeaderboard = computed(() => {
  const map = new Map()

  for (const row of operatorSummary.value) {
    const key = operatorKeyFrom(row?.operator_id, row?.operator)
    map.set(key, {
      key,
      name: row?.operator || (row?.operator_id ? `operator #${row.operator_id}` : 'Noma\'lum'),
      salesGross: toNum(row?.gross),
      salesCash: toNum(row?.cash),
      salesCard: toNum(row?.card),
      expenses: 0,
      returns: 0,
      ops: toNum(row?.ops_count),
    })
  }

  for (const item of expenses.value) {
    const op = item?.operator || null
    const key = operatorKeyFrom(op?.id ?? item?.operator_id ?? null, operatorName(op))
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: operatorName(op),
        salesGross: 0,
        salesCash: 0,
        salesCard: 0,
        expenses: 0,
        returns: 0,
        ops: 0,
      })
    }
    map.get(key).expenses += toNum(item?.amount)
  }

  for (const item of returns.value) {
    const op = item?.operator || null
    const key = operatorKeyFrom(op?.id ?? item?.operator_id ?? null, operatorName(op))
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: operatorName(op),
        salesGross: 0,
        salesCash: 0,
        salesCard: 0,
        expenses: 0,
        returns: 0,
        ops: 0,
      })
    }
    map.get(key).returns += toNum(item?.amount)
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      net: row.salesGross - row.expenses - row.returns,
    }))
    .sort((a, b) => b.net - a.net)
})

const anomalySignals = computed(() => {
  if (!isOpen.value) return []

  const alerts = []
  const biggestExpense = expenses.value.reduce((max, item) => Math.max(max, toNum(item?.amount)), 0)
  const biggestReturn = returns.value
    .filter((item) => String(item?.payment_method || '').toLowerCase() === 'cash')
    .reduce((max, item) => Math.max(max, toNum(item?.amount)), 0)

  const expenseThreshold = Math.max(300000, Math.round(grossIncome.value * 0.25))
  const returnThreshold = Math.max(200000, Math.round(cashIncome.value * 0.2))

  if (biggestExpense >= expenseThreshold) {
    alerts.push({
      level: 'high',
      title: 'Yirik xarajat',
      text: `${money(biggestExpense)} hajmli xarajat qayd etilgan. Chek va sababni owner bilan tekshiring.`,
    })
  }

  if (biggestReturn >= returnThreshold) {
    alerts.push({
      level: 'high',
      title: 'Yirik naqd qaytarish',
      text: `${money(biggestReturn)} naqd qaytarish bor. Mijoz va operator izohini solishtiring.`,
    })
  }

  const recentExpenseWindow = expenses.value.filter((item) => {
    const ts = new Date(item?.spent_at || item?.created_at || 0).getTime()
    if (!ts) return false
    return Date.now() - ts <= 15 * 60 * 1000
  })
  const recentExpenseSum = recentExpenseWindow.reduce((sum, item) => sum + toNum(item?.amount), 0)
  if (recentExpenseWindow.length >= 3 && recentExpenseSum >= 300000) {
    alerts.push({
      level: 'medium',
      title: 'Qisqa vaqtda ko\'p xarajat',
      text: `So'nggi 15 daqiqada ${recentExpenseWindow.length} ta xarajat (${money(recentExpenseSum)}).`,
    })
  }

  if (expenseRatio.value >= 45) {
    alerts.push({
      level: 'medium',
      title: 'Xarajat bosimi yuqori',
      text: `Xarajat ulushi ${expenseRatio.value}%. Limit yoki tasdiqlash qoidalarini qayta ko'ring.`,
    })
  }

  const uncategorizedExpense = expenses.value
    .filter((item) => String(item?.category || '').trim() === '')
    .reduce((sum, item) => sum + toNum(item?.amount), 0)
  const uncategorizedRatio = expensesTotal.value > 0 ? Math.round((uncategorizedExpense / expensesTotal.value) * 100) : 0
  if (uncategorizedRatio >= 35 && uncategorizedExpense > 0) {
    alerts.push({
      level: 'medium',
      title: 'Kategoriyasiz xarajat ko\'p',
      text: `Xarajatlarning ${uncategorizedRatio}% qismi kategoriyasiz (${money(uncategorizedExpense)}).`,
    })
  }

  const topOperator = operatorLeaderboard.value[0]
  if (topOperator && grossIncome.value > 0 && operationsCount.value >= 10) {
    const topShare = Math.round((topOperator.salesGross / grossIncome.value) * 100)
    if (topShare >= 80) {
      alerts.push({
        level: 'low',
        title: 'Operator konsentratsiyasi yuqori',
        text: `Bitta operator ulushi ${topShare}% (${topOperator.name}). Smеnani taqsimlashni ko'rib chiqing.`,
      })
    }
  }

  if (Math.abs(diffCash.value) >= 100000 && (closeModal.value || closeForm.closingCash > 0)) {
    alerts.push({
      level: 'high',
      title: 'Yopish farqi katta',
      text: `Hozirgi farq ${money(diffCash.value)}. Yopishdan oldin checklist va kupyuralarni tekshiring.`,
    })
  }

  if (handoverData.value?.carry?.unresolved_shortage > 0) {
    alerts.push({
      level: 'medium',
      title: 'Oldingi smenadan qolgan kamomad',
      text: `${money(handoverData.value.carry.unresolved_shortage)} hali yopilmagan. Handoverni owner bilan tekshiring.`,
    })
  }

  return alerts.slice(0, 5)
})

const resetFinancialState = () => {
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

const setClosingCashPreset = (value) => {
  closeForm.closingCash = Math.max(0, toNum(value))
}

const applyCashBreakdown = () => {
  setClosingCashPreset(cashBreakdownTotal.value)
}

const resetCloseAssistants = () => {
  closeChecks.cashCounted = false
  closeChecks.expensesChecked = false
  closeChecks.returnsChecked = false
  for (const denom of cashDenominations) {
    cashBreakdown[String(denom)] = 0
  }
}

const selectExpensePreset = (preset) => {
  openExpenseModal()
  expenseForm.title = String(preset?.title || '')
  expenseForm.category = String(preset?.category || '')
  expenseForm.note = String(preset?.note || '')
}

const printCloseChecklist = () => {
  if (typeof window === 'undefined') return

  const rows = [
    ['Shift ID', shift.value?.id ? `#${shift.value.id}` : '-'],
    ['Ochilgan vaqt', formatDateTime(shift.value?.opened_at)],
    ['Operator', operatorName(shift.value?.opened_by || shift.value?.openedBy)],
    ['Boshlang\'ich naqd', money(openingCash.value)],
    ['Naqd tushum', money(cashIncome.value)],
    ['Karta tushum', money(cardIncome.value)],
    ['Xarajatlar', money(expensesTotal.value)],
    ['Naqd qaytarish', money(returnsCashTotal.value)],
    ['Kutilgan naqd', money(expectedCashNow.value)],
    ['Kiritilgan amaldagi naqd', money(closeForm.closingCash)],
    ['Farq', `${money(diffCash.value)} (${diffLabel.value})`],
  ]

  const checks = [
    ['Naqd pul fizik sanaldi', closeChecks.cashCounted],
    ['Xarajatlar chek bilan solishtirildi', closeChecks.expensesChecked],
    ['Qaytarishlar tasdiqlandi', closeChecks.returnsChecked],
  ]

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Smena yopish checklist</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    p { margin: 0 0 14px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    td, th { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; }
    th { background: #e2e8f0; text-align: left; }
    .ok { color: #166534; font-weight: 700; }
    .no { color: #991b1b; font-weight: 700; }
    .foot { margin-top: 16px; font-size: 11px; color: #475569; }
  </style>
</head>
<body>
  <h1>Smena yopish checklist</h1>
  <p>Yaratilgan: ${new Date().toLocaleString('ru-RU')}</p>
  <table>
    <tbody>
      ${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}
    </tbody>
  </table>
  <table>
    <thead><tr><th>Checklist bandi</th><th>Holat</th></tr></thead>
    <tbody>
      ${checks.map(([k, ok]) => `<tr><td>${k}</td><td class="${ok ? 'ok' : 'no'}">${ok ? 'Tasdiqlandi' : 'Tasdiqlanmagan'}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="foot">Print oynasida "Save as PDF" ni tanlab PDF ko'rinishida saqlashingiz mumkin.</div>
</body>
</html>
`

  const popup = window.open('', '_blank', 'width=900,height=700')
  if (!popup) return
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.focus()
  popup.print()
}

const loadCurrentShift = async () => {
  const response = await cpApi.shiftCurrent()
  shift.value = response?.data?.data || null

  if (!shift.value) {
    resetFinancialState()
  }
}

const loadCurrentSummary = async () => {
  if (!isOpen.value) {
    totals.cash = 0
    totals.card = 0
    totals.bonus = 0
    totals.opsCount = 0
    expectedFromApi.value = null
    operatorSummary.value = []
    handoverData.value = null
    return
  }

  const response = await cpApi.currentShiftSummary()
  const payload = response?.data?.data

  if (!payload) {
    totals.cash = 0
    totals.card = 0
    totals.bonus = 0
    totals.opsCount = 0
    expectedFromApi.value = null
    operatorSummary.value = []
    handoverData.value = null
    return
  }

  if (payload.shift && !payload.shift.closed_at) {
    shift.value = {
      ...(shift.value || {}),
      ...payload.shift,
    }
  }

  const t = payload.totals || {}
  totals.cash = toNum(t.cash ?? t.cash_total)
  totals.card = toNum(t.card ?? t.card_total)
  totals.bonus = toNum(t.bonus ?? t.bonus_total)
  totals.opsCount = toNum(t.ops_count ?? t.operations_count)

  const expected = payload.expected?.cash_now
  expectedFromApi.value = expected == null ? null : toNum(expected)
  operatorSummary.value = Array.isArray(payload.by_operator) ? payload.by_operator : []
  handoverData.value = payload.handover || null
}

const loadCurrentExpenses = async () => {
  if (!isOpen.value) {
    expenses.value = []
    expensesTotal.value = 0
    return
  }

  const response = await cpApi.shiftExpensesCurrent({ limit: 200 })
  const payload = response?.data?.data || {}
  expenses.value = Array.isArray(payload.items) ? payload.items : []
  expensesTotal.value = toNum(payload.total)
}

const loadCurrentReturns = async () => {
  if (!isOpen.value || !shift.value?.id) {
    returns.value = []
    return
  }

  const response = await cpApi.returnsList({
    shift_id: shift.value.id,
    page: 1,
    per_page: 200,
  })

  const data = response?.data?.data
  if (Array.isArray(data?.data)) {
    returns.value = data.data
    return
  }

  returns.value = Array.isArray(data) ? data : []
}

const reload = async () => {
  loading.value = true
  pageError.value = ''

  try {
    await loadCurrentShift()

    if (isOpen.value) {
      await Promise.all([
        loadCurrentSummary(),
        loadCurrentExpenses(),
        loadCurrentReturns(),
      ])
    }

    lastSyncedAt.value = new Date().toISOString()
  } catch (error) {
    pageError.value = extractError(error, 'Shift ma\'lumotlarini yuklashda xato.')
  } finally {
    loading.value = false
  }
}

const submitOpen = async () => {
  openError.value = ''
  actionLoading.value = true

  try {
    await cpApi.shiftOpen({ opening_cash: Math.max(0, toNum(openForm.openingCash)) })
    openModal.value = false
    openForm.openingCash = 0
    await reload()
  } catch (error) {
    openError.value = extractError(error, 'Smenani ochishda xato.')
  } finally {
    actionLoading.value = false
  }
}

const openCloseModal = () => {
  closeError.value = ''
  closeForm.closingCash = expectedCashNow.value
  resetCloseAssistants()
  closeModal.value = true
}

const submitClose = async () => {
  closeError.value = ''
  actionLoading.value = true

  try {
    await cpApi.shiftClose({ closing_cash: Math.max(0, toNum(closeForm.closingCash)) })
    closeModal.value = false
    await reload()
  } catch (error) {
    closeError.value = extractError(error, 'Smenani yopishda xato.')
  } finally {
    actionLoading.value = false
  }
}

const openExpenseModal = () => {
  expenseError.value = ''
  expenseForm.amount = 0
  expenseForm.title = ''
  expenseForm.category = ''
  expenseForm.note = ''
  expenseModal.value = true
}

const submitExpense = async () => {
  expenseError.value = ''
  actionLoading.value = true

  try {
    await cpApi.shiftExpenseCreate({
      amount: toNum(expenseForm.amount),
      title: String(expenseForm.title || '').trim(),
      category: String(expenseForm.category || '').trim() || null,
      note: String(expenseForm.note || '').trim() || null,
    })

    expenseModal.value = false
    await Promise.all([loadCurrentSummary(), loadCurrentExpenses()])
  } catch (error) {
    expenseError.value = extractError(error, 'Xarajat qo\'shishda xato.')
  } finally {
    actionLoading.value = false
  }
}

const askDeleteExpense = (item) => {
  deleteModal.error = ''
  deleteModal.item = item
  deleteModal.open = true
}

const submitDeleteExpense = async () => {
  if (!deleteModal.item?.id) return

  deleteModal.loading = true
  deleteModal.error = ''

  try {
    await cpApi.shiftExpenseDelete(deleteModal.item.id)
    deleteModal.open = false
    deleteModal.item = null
    await Promise.all([loadCurrentSummary(), loadCurrentExpenses()])
  } catch (error) {
    deleteModal.error = extractError(error, 'Xarajatni o\'chirishda xato.')
  } finally {
    deleteModal.loading = false
  }
}

let autoRefreshTimer = null

onMounted(() => {
  reload()
  autoRefreshTimer = setInterval(() => {
    if (!autoRefresh.value) return
    if (loading.value || actionLoading.value) return
    if (openModal.value || closeModal.value || expenseModal.value || deleteModal.open) return
    reload()
  }, 30000)
})

onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
})
</script>

<style scoped>
.shift-page {
  display: grid;
  gap: 14px;
  position: relative;
}

.card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  background:
    radial-gradient(1300px 420px at -8% -42%, rgba(56, 189, 248, 0.16), transparent 62%),
    radial-gradient(980px 360px at 110% -24%, rgba(14, 165, 233, 0.13), transparent 62%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.64));
  backdrop-filter: blur(12px);
  box-shadow:
    0 20px 55px rgba(2, 6, 23, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.hero {
  padding: 18px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  right: -40px;
  top: -38px;
  width: 210px;
  height: 210px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(125, 211, 252, 0.24), transparent 68%);
  pointer-events: none;
}

.eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(186, 230, 253, 0.92);
}

.title {
  margin: 6px 0 0;
  font-size: 26px;
  color: var(--text);
  font-weight: 900;
}

.subtitle {
  margin: 8px 0 0;
  color: rgba(226, 232, 240, 0.78);
  font-size: 13px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  z-index: 1;
}

.auto-refresh-toggle {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(56, 189, 248, 0.32);
  background: rgba(14, 165, 233, 0.12);
  color: #e0f2fe;
  font-size: 12px;
  font-weight: 700;
}

.auto-refresh-toggle input {
  margin: 0;
}

.sync-badge {
  height: 34px;
  display: inline-flex;
  align-items: center;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  padding: 0 10px;
  font-size: 11px;
  color: rgba(226, 232, 240, 0.82);
  background: rgba(15, 23, 42, 0.58);
}

.hero-insights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.command-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.command-card {
  padding: 14px;
}

.ops-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
}

.ops-card {
  padding: 14px;
}

.ops-table {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.ops-head,
.ops-row {
  display: grid;
  grid-template-columns: 42px 1.1fr 1fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 9px 10px;
  font-size: 12px;
  align-items: center;
}

.ops-head {
  background: rgba(15, 23, 42, 0.75);
  color: rgba(226, 232, 240, 0.85);
  font-weight: 700;
}

.ops-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(248, 250, 252, 0.95);
}

.ops-row:nth-child(even) {
  background: rgba(14, 165, 233, 0.05);
}

.tone-good {
  color: #86efac;
}

.tone-bad {
  color: #fda4af;
}

.signals-list {
  display: grid;
  gap: 8px;
}

.signal-item {
  border-radius: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(15, 23, 42, 0.42);
}

.signal-item strong {
  display: block;
  font-size: 12px;
  margin-bottom: 3px;
}

.signal-item p {
  margin: 0;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.86);
  line-height: 1.4;
}

.signal-item.s-high {
  border-color: rgba(248, 113, 113, 0.5);
  background: rgba(239, 68, 68, 0.16);
}

.signal-item.s-medium {
  border-color: rgba(250, 204, 21, 0.46);
  background: rgba(234, 179, 8, 0.14);
}

.signal-item.s-low {
  border-color: rgba(56, 189, 248, 0.44);
  background: rgba(14, 165, 233, 0.12);
}

.handover-section {
  padding: 14px;
}

.handover-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.handover-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  gap: 8px;
  min-width: 0;
}

.handover-status {
  border-radius: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(15, 23, 42, 0.42);
  font-size: 12px;
  font-weight: 700;
}

.handover-status.ok {
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.16);
  color: #bbf7d0;
}

.handover-status.warn {
  border-color: rgba(250, 204, 21, 0.46);
  background: rgba(234, 179, 8, 0.16);
  color: #fde68a;
}

.handover-status.risk {
  border-color: rgba(248, 113, 113, 0.46);
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
}

.score-badge {
  min-width: 68px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 900;
  color: #f8fafc;
}

.score-badge.ok {
  border-color: rgba(16, 185, 129, 0.38);
  background: rgba(16, 185, 129, 0.16);
}

.score-badge.warn {
  border-color: rgba(250, 204, 21, 0.4);
  background: rgba(234, 179, 8, 0.18);
}

.score-badge.risk {
  border-color: rgba(248, 113, 113, 0.42);
  background: rgba(239, 68, 68, 0.2);
}

.score-badge.idle {
  opacity: 0.8;
}

.assistant-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 7px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.9);
}

.assistant-mini-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.assistant-mini {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.4);
  padding: 9px;
  display: grid;
  gap: 6px;
}

.assistant-mini span {
  font-size: 11px;
  color: rgba(203, 213, 225, 0.74);
}

.assistant-mini strong {
  color: #f8fafc;
  font-size: 14px;
}

.flow-list {
  display: grid;
  gap: 8px;
}

.flow-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  background: rgba(15, 23, 42, 0.38);
}

.flow-row.plus strong {
  color: #86efac;
}

.flow-row.minus strong {
  color: #fda4af;
}

.flow-row.total {
  border-color: rgba(56, 189, 248, 0.42);
  background: rgba(14, 165, 233, 0.12);
}

.flow-row.total strong {
  color: #7dd3fc;
}

.timeline-box {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.36);
}

.timeline-box h3 {
  margin: 0 0 8px;
  font-size: 13px;
}

.timeline-box ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 7px;
}

.timeline-box li {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.88);
}

.timeline-box small {
  color: rgba(148, 163, 184, 0.94);
}

.insight-pill {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  padding: 11px 12px;
  display: grid;
  gap: 4px;
  background: rgba(15, 23, 42, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.insight-title {
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.66);
}

.insight-pill strong {
  font-size: 15px;
  color: #f8fafc;
}

.insight-pill small {
  color: rgba(203, 213, 225, 0.72);
  font-size: 11px;
}

.insight-pill.ok {
  border-color: rgba(16, 185, 129, 0.42);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.18), rgba(15, 23, 42, 0.52));
}

.insight-pill.warn {
  border-color: rgba(250, 204, 21, 0.42);
  background: linear-gradient(180deg, rgba(234, 179, 8, 0.14), rgba(15, 23, 42, 0.52));
}

.insight-pill.risk {
  border-color: rgba(248, 113, 113, 0.42);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.15), rgba(15, 23, 42, 0.52));
}

.insight-pill.idle {
  border-style: dashed;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.kpi {
  padding: 14px;
  position: relative;
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.kpi::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.9), rgba(56, 189, 248, 0.35), transparent);
}

.kpi:hover {
  transform: translateY(-2px);
  border-color: rgba(56, 189, 248, 0.35);
}

.kpi-label {
  margin: 0;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.72);
}

.kpi-value {
  margin: 8px 0 6px;
  font-size: 24px;
  font-weight: 800;
  color: #f8fafc;
}

.kpi-sub {
  margin: 8px 0 0;
  color: rgba(203, 213, 225, 0.72);
  font-size: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 800;
}

.status-pill.ok {
  background: rgba(16, 185, 129, 0.16);
  color: #d1fae5;
  border-color: rgba(16, 185, 129, 0.34);
}

.status-pill.muted {
  background: rgba(148, 163, 184, 0.16);
  color: #e2e8f0;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 12px;
}

.summary,
.expenses {
  padding: 14px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.section-head h2 {
  margin: 0;
  font-size: 15px;
}

.section-head p {
  margin: 4px 0 0;
  color: rgba(203, 213, 225, 0.72);
  font-size: 12px;
}

.summary-list {
  display: grid;
  gap: 8px;
}

.row-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 12px;
  background: rgba(15, 23, 42, 0.35);
  transition: background 0.16s ease, border-color 0.16s ease;
}

.row-item:hover {
  border-color: rgba(56, 189, 248, 0.26);
  background: rgba(14, 165, 233, 0.08);
}

.row-item span {
  color: rgba(226, 232, 240, 0.76);
}

.row-item strong {
  color: #f8fafc;
}

.strong-line {
  border-color: rgba(56, 189, 248, 0.35);
}

.table {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

.preset-row {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  font-size: 12px;
  color: rgba(203, 213, 225, 0.82);
}

.preset-chip {
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(14, 165, 233, 0.12);
  color: #e0f2fe;
  border-radius: 999px;
  height: 28px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.preset-chip:hover {
  filter: brightness(1.08);
}

.thead,
.trow {
  display: grid;
  grid-template-columns: 140px 1fr 130px 130px 90px;
  gap: 8px;
  padding: 10px 12px;
  font-size: 12px;
}

.thead {
  background: rgba(15, 23, 42, 0.72);
  font-weight: 700;
  color: rgba(226, 232, 240, 0.82);
}

.trow {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: #f8fafc;
  transition: background 0.16s ease;
}

.trow:hover {
  background: rgba(56, 189, 248, 0.08);
}

.right {
  text-align: right;
}

.returns-box {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.48), rgba(15, 23, 42, 0.28));
}

.returns-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.returns-head h3 {
  margin: 0;
  font-size: 13px;
}

.returns-box ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.returns-box li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.9);
}

.btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.06);
  font-size: 12px;
  font-weight: 700;
  transition: transform 0.12s ease, filter 0.12s ease, border-color 0.12s ease;
}

.btn:hover {
  filter: brightness(1.05);
}

.btn:active {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.78), rgba(59, 130, 246, 0.86));
  border-color: rgba(56, 189, 248, 0.44);
}

.btn.danger {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.72), rgba(220, 38, 38, 0.82));
  border-color: rgba(248, 113, 113, 0.45);
}

.btn.ghost {
  background: rgba(15, 23, 42, 0.55);
}

.btn.tiny {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
}

.alert {
  margin: 0;
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 12px;
  border: 1px solid transparent;
}

.alert.danger {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(248, 113, 113, 0.34);
  color: #fecaca;
}

.empty-box {
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 12px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.72);
  margin-top: 10px;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 14px;
  background: rgba(2, 6, 23, 0.7);
  backdrop-filter: blur(8px);
}

.modal {
  width: min(560px, 96vw);
  padding: 14px;
  animation: modal-in 0.18s ease;
}

.modal.wide {
  width: min(920px, 96vw);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.modal-head h3 {
  margin: 0;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(15, 23, 42, 0.62);
  color: #e2e8f0;
  cursor: pointer;
}

.field {
  display: grid;
  gap: 6px;
  margin-bottom: 10px;
}

.field span {
  font-size: 12px;
  color: rgba(203, 213, 225, 0.84);
}

.input {
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.72);
  color: #f8fafc;
  padding: 0 10px;
}

.input.small {
  height: 32px;
  font-size: 12px;
}

.close-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.close-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.diff-box {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
}

.diff-box em {
  font-style: normal;
  font-size: 12px;
  opacity: 0.9;
}

.diff-box.ok {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(52, 211, 153, 0.4);
}

.diff-box.warn {
  background: rgba(234, 179, 8, 0.12);
  border-color: rgba(250, 204, 21, 0.34);
}

.diff-box.danger {
  background: rgba(239, 68, 68, 0.13);
  border-color: rgba(248, 113, 113, 0.38);
}

.quick-close-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.denom-box {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 9px;
  background: rgba(15, 23, 42, 0.42);
  margin-bottom: 8px;
}

.denom-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.denom-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.denom-item {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.denom-item span {
  font-size: 11px;
  color: rgba(203, 213, 225, 0.8);
}

.denom-item .input.small {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: block;
}

.denom-total {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.9);
}

.close-checklist {
  display: grid;
  gap: 6px;
  margin: 8px 0;
  padding: 8px;
  border: 1px dashed rgba(148, 163, 184, 0.34);
  border-radius: 10px;
}

.close-checklist label {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.9);
}

.hint-text {
  margin: 0;
  font-size: 11px;
  color: #fde68a;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 1100px) {
  .hero-insights {
    grid-template-columns: 1fr;
  }

  .command-grid {
    grid-template-columns: 1fr;
  }

  .ops-grid {
    grid-template-columns: 1fr;
  }

  .handover-grid {
    grid-template-columns: 1fr;
  }

  .assistant-mini-grid {
    grid-template-columns: 1fr;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .thead,
  .trow {
    grid-template-columns: 130px 1fr 110px 110px 80px;
  }

  .denom-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 780px) {
  .hero {
    flex-direction: column;
  }

  .hero-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .ops-head,
  .ops-row {
    grid-template-columns: 1fr;
  }

  .timeline-box li {
    grid-template-columns: 1fr;
  }

  .close-grid {
    grid-template-columns: 1fr;
  }

  .thead,
  .trow {
    grid-template-columns: 1fr;
  }

  .thead {
    display: none;
  }

  .trow {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    gap: 4px;
  }

  .trow span,
  .trow strong,
  .trow .right {
    text-align: left;
  }

  .returns-box li {
    grid-template-columns: 1fr;
  }
}
</style>

