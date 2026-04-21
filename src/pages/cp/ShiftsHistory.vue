<template>
  <div class="history-page">
    <section class="hero card">
      <div>
        <p class="eyebrow">{{ tt('analytics') }}</p>
        <h1 class="title">{{ tt('title') }}</h1>
        <p class="subtitle">{{ tt('subtitle') }}</p>
      </div>

      <div class="hero-actions">
        <span class="range-badge">{{ selectedRangeLabel }}</span>
        <button class="btn ghost" :disabled="loading || exportLoading" @click="downloadExport()">
          {{ exportLoading ? tt('exporting') : tt('exportExcel') }}
        </button>
        <button class="btn ghost" :disabled="loading" @click="reload()">{{ tt('refresh') }}</button>
      </div>
    </section>

    <p v-if="forbidden" class="alert danger">{{ tt('adminOnly') }}</p>
    <p v-if="errorText" class="alert danger">{{ errorText }}</p>

    <section class="card filters">
      <div class="filters-top">
        <div>
          <h2>{{ tt('filtersTitle') }}</h2>
          <p>{{ tt('filtersSub') }}</p>
        </div>

        <div class="quick-actions">
          <button class="btn ghost" :class="{ active: quickRange === 'today' }" @click="applyQuick('today')">{{ tt('today') }}</button>
          <button class="btn ghost" :class="{ active: quickRange === '7d' }" @click="applyQuick('7d')">{{ tt('range7') }}</button>
          <button class="btn ghost" :class="{ active: quickRange === '30d' }" @click="applyQuick('30d')">{{ tt('range30') }}</button>
        </div>
      </div>

      <div class="filter-grid">
        <label class="field">
          <span>{{ tt('from') }}</span>
          <input v-model="filters.from" class="input" type="date" />
        </label>

        <label class="field">
          <span>{{ tt('to') }}</span>
          <input v-model="filters.to" class="input" type="date" />
        </label>

        <label class="field">
          <span>{{ tt('perPage') }}</span>
          <select v-model.number="filters.perPage" class="input">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="30">30</option>
            <option :value="50">50</option>
          </select>
        </label>

        <div class="filter-actions">
          <button class="btn ghost" :disabled="loading" @click="resetFilters">{{ tt('clear') }}</button>
          <button class="btn primary" :disabled="loading" @click="reload(1)">{{ tt('apply') }}</button>
        </div>
      </div>
    </section>

    <section class="story-grid">
      <article class="card story-card">
        <p class="story-label">{{ tt('avgClosing') }}</p>
        <p class="story-value">{{ money(averageClosingCash) }}</p>
        <p class="story-sub">{{ tt('avgClosingSub') }}</p>
      </article>

      <article class="card story-card" :class="reconcileCoverage.rate >= 90 ? 'story-positive' : 'story-negative'">
        <p class="story-label">{{ tt('coverage') }}</p>
        <p class="story-value">{{ reconcileCoverage.rate }}%</p>
        <p class="story-sub">{{ tt('coverageSub', { matched: summary.reconciledCount, total: summary.shiftsCount }) }}</p>
      </article>

      <article class="card story-card">
        <p class="story-label">{{ tt('bestWorst') }}</p>
        <p class="story-sub" v-if="bestShift && worstShift">
          {{ tt('bestWorstLine', { bestId: bestShift.id, bestNet: money(netCash(bestShift)), worstId: worstShift.id, worstNet: money(netCash(worstShift)) }) }}
        </p>
        <p class="story-sub" v-if="bestShift && worstShift">{{ tt('diffLine', { diff: money(Math.abs(netCash(bestShift) - netCash(worstShift))) }) }}</p>
        <p class="story-sub" v-else>{{ tt('noData') }}</p>
      </article>
    </section>

    <section class="kpi-grid">
      <article class="card kpi">
        <p class="kpi-label">{{ tt('shiftsCount') }}</p>
        <p class="kpi-value">{{ summary.shiftsCount }}</p>
        <p class="kpi-sub">{{ tt('shiftsCountSub') }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">{{ tt('cashIn') }}</p>
        <p class="kpi-value">{{ money(summary.cashIn) }}</p>
        <p class="kpi-sub">{{ tt('cashInSub') }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">{{ tt('cardIn') }}</p>
        <p class="kpi-value">{{ money(summary.cardIn) }}</p>
        <p class="kpi-sub">{{ tt('cardInSub') }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">{{ tt('grossIn') }}</p>
        <p class="kpi-value">{{ money(summary.cashIn + summary.cardIn) }}</p>
        <p class="kpi-sub">{{ tt('grossInSub') }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">{{ tt('returnsTotal') }}</p>
        <p class="kpi-value">{{ money(summary.returnsTotal) }}</p>
        <p class="kpi-sub">{{ tt('returnsTotalSub') }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">{{ tt('cashOut') }}</p>
        <p class="kpi-value">{{ money(summary.expensesTotal + summary.returnsCash) }}</p>
        <p class="kpi-sub">{{ tt('cashOutSub') }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">{{ tt('netCash') }}</p>
        <p class="kpi-value">{{ money(summary.netCash) }}</p>
        <p class="kpi-sub">{{ tt('netCashSub') }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">{{ tt('expectedCash') }}</p>
        <p class="kpi-value">{{ money(summary.expectedSum) }}</p>
        <p class="kpi-sub">{{ tt('expectedCashSub') }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">{{ tt('closingCash') }}</p>
        <p class="kpi-value">{{ money(summary.closingSum) }}</p>
        <p class="kpi-sub">{{ tt('closingCashSub') }}</p>
      </article>

      <article class="card kpi">
        <p class="kpi-label">{{ tt('overShort') }}</p>
        <p class="kpi-value">{{ money(summary.diffOverageSum) }} / {{ money(summary.diffShortageSum) }}</p>
        <p class="kpi-sub">{{ tt('overShortSub') }}</p>
      </article>
    </section>

    <section class="charts-grid">
      <article class="card chart-box">
        <div class="section-head">
          <h2>{{ tt('netTrend') }}</h2>
          <span class="muted">{{ tt('min') }}: {{ money(chartData.min) }} · {{ tt('max') }}: {{ money(chartData.max) }}</span>
        </div>

        <div v-if="chartData.points.length" class="svg-wrap">
          <svg viewBox="0 0 640 220" preserveAspectRatio="none">
            <defs>
              <linearGradient id="netAreaFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="rgba(56, 189, 248, 0.28)" />
                <stop offset="100%" stop-color="rgba(56, 189, 248, 0.02)" />
              </linearGradient>
            </defs>
            <g class="grid">
              <line v-for="n in 5" :key="`line-${n}`" :x1="0" :x2="640" :y1="n * 36" :y2="n * 36" />
            </g>
            <polygon :points="chartData.area" class="area" />
            <polyline :points="chartData.polyline" class="line" />
            <circle v-for="(point, idx) in chartData.points" :key="`pt-${idx}`" :cx="point.x" :cy="point.y" r="4" class="dot" />
          </svg>
        </div>

        <div v-else class="empty-box">{{ tt('noChart') }}</div>
      </article>

      <article class="card chart-box">
        <div class="section-head">
          <h2>{{ tt('categoryBreakdown') }}</h2>
        </div>

        <div v-if="detailCategoryBars.length" class="bars">
          <div v-for="bar in detailCategoryBars" :key="bar.category" class="bar-row">
            <span class="bar-label">{{ bar.category }}</span>
            <div class="track">
              <div class="fill" :style="{ width: `${bar.percent}%` }"></div>
            </div>
            <strong>{{ money(bar.total) }}</strong>
          </div>
        </div>

        <div v-else class="empty-box">{{ tt('detailBreakdownHint') }}</div>
      </article>
    </section>

    <section class="card table-box">
      <div class="section-head table-head">
        <h2>{{ tt('closedShifts') }}</h2>
        <strong>{{ tt('total') }}: {{ pagination.total }}</strong>
      </div>

      <div v-if="rows.length" class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ tt('openedAt') }}</th>
              <th>{{ tt('closedAt') }}</th>
              <th>{{ tt('operator') }}</th>
              <th class="right">{{ tt('start') }}</th>
              <th class="right">{{ tt('cashIn') }}</th>
              <th class="right">{{ tt('cardIn') }}</th>
              <th class="right">{{ tt('gross') }}</th>
              <th class="right">{{ tt('return') }}</th>
              <th class="right">{{ tt('expense') }}</th>
              <th class="right">{{ tt('expected') }}</th>
              <th class="right">{{ tt('diff') }}</th>
              <th class="right">{{ tt('net') }}</th>
              <th class="right">{{ tt('closing') }}</th>
              <th>{{ tt('status') }}</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="row in rows" :key="row.id" :class="rowToneClass(row)" @click="openDetail(row.id)">
              <td><strong>#{{ row.id }}</strong></td>
              <td>{{ formatDateTime(row.opened_at) }}</td>
              <td>{{ formatDateTime(row.closed_at) }}</td>
              <td>{{ operatorName(row.closedBy || row.openedBy) }}</td>
              <td class="right">{{ money(openingCash(row)) }}</td>
              <td class="right">{{ money(cashIn(row)) }}</td>
              <td class="right">{{ money(cardIn(row)) }}</td>
              <td class="right">{{ money(grossIn(row)) }}</td>
              <td class="right">{{ money(returnsTotal(row)) }}</td>
              <td class="right">{{ money(expensesCash(row)) }}</td>
              <td class="right">{{ money(expectedCash(row)) }}</td>
              <td class="right" :class="diffValue(row) >= 0 ? 'diff-positive' : 'diff-negative'">{{ money(diffValue(row)) }}</td>
              <td class="right"><strong>{{ money(netCash(row)) }}</strong></td>
              <td class="right">{{ money(closingCash(row)) }}</td>
              <td>
                <span class="status-pill" :class="statusClass(reconcileStatus(row))">{{ statusLabel(reconcileStatus(row)) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-box">{{ tt('noShifts') }}</div>

      <div v-if="pagination.lastPage > 1" class="pager">
        <button class="btn ghost" :disabled="loading || pagination.page <= 1" @click="reload(pagination.page - 1)">{{ tt('prev') }}</button>
        <span>{{ tt('page') }} {{ pagination.page }} / {{ pagination.lastPage }}</span>
        <button class="btn ghost" :disabled="loading || pagination.page >= pagination.lastPage" @click="reload(pagination.page + 1)">{{ tt('next') }}</button>
      </div>
    </section>

    <div v-if="detail.open" class="overlay" @click.self="closeDetail">
      <div class="modal card wide">
        <div class="modal-head">
          <div>
            <h3>{{ tt('shift') }} #{{ detail.shift?.id || '-' }}</h3>
            <p>{{ formatDateTime(detail.shift?.opened_at) }} -> {{ formatDateTime(detail.shift?.closed_at) }}</p>
          </div>
          <div class="modal-head-actions">
            <span class="status-pill" :class="statusClass(detailReconcileStatus)">{{ statusLabel(detailReconcileStatus) }}</span>
            <button class="icon-btn" @click="closeDetail">x</button>
          </div>
        </div>

        <p v-if="detail.error" class="alert danger">{{ detail.error }}</p>

        <div class="detail-grid" v-if="detail.shift">
          <div class="detail-card detail-summary">
            <div class="row-item"><span>{{ tt('openedBy') }}</span><strong>{{ operatorName(detail.shift.openedBy) }}</strong></div>
            <div class="row-item"><span>{{ tt('closedBy') }}</span><strong>{{ operatorName(detail.shift.closedBy) }}</strong></div>
            <div class="row-item"><span>{{ tt('start') }}</span><strong>{{ money(detailFinance.opening_cash) }}</strong></div>
            <div class="row-item"><span>{{ tt('cashIn') }}</span><strong>{{ money(detailFinance.cash_in) }}</strong></div>
            <div class="row-item"><span>{{ tt('cardIn') }}</span><strong>{{ money(detailFinance.card_in) }}</strong></div>
            <div class="row-item"><span>{{ tt('grossInLabel') }}</span><strong>{{ money(detailFinance.gross_in) }}</strong></div>
            <div class="row-item"><span>{{ tt('returnsCash') }}</span><strong>{{ money(detailFinance.returns_cash) }}</strong></div>
            <div class="row-item"><span>{{ tt('returnsAll') }}</span><strong>{{ money(detailFinance.returns_total) }}</strong></div>
            <div class="row-item"><span>{{ tt('expense') }}</span><strong>{{ money(detailFinance.expenses_cash) }}</strong></div>
            <div class="row-item"><span>{{ tt('expectedCash') }}</span><strong>{{ money(detailFinance.expected_cash) }}</strong></div>
            <div class="row-item"><span>{{ tt('diff') }}</span><strong :class="detailFinance.diff >= 0 ? 'diff-positive' : 'diff-negative'">{{ money(detailFinance.diff) }}</strong></div>
            <div class="row-item strong-line"><span>{{ tt('net') }}</span><strong>{{ money(detailFinance.net_cash) }}</strong></div>
            <div class="row-item"><span>{{ tt('closingCash') }}</span><strong>{{ money(detailFinance.closing_cash) }}</strong></div>
          </div>

          <div class="detail-card">
            <div class="section-head compact">
              <h4>{{ tt('categoryBreakdownShort') }}</h4>
              <button class="btn ghost tiny" :disabled="detail.loading" @click="reloadDetail">{{ tt('refresh') }}</button>
            </div>

            <div class="formula-box">
              <p>{{ tt('formulaTitle') }}</p>
              <strong>{{ money(detailFinance.opening_cash) }} + {{ money(detailFinance.cash_in) }} - {{ money(detailFinance.returns_cash) }} - {{ money(detailFinance.expenses_cash) }} = {{ money(detailFinance.expected_cash) }}</strong>
            </div>

            <div class="detail-mini-grid">
              <article class="mini-stat">
                <p>{{ tt('txCount') }}</p>
                <strong>{{ detailFinance.tx_count }}</strong>
              </article>
              <article class="mini-stat">
                <p>{{ tt('returnsCount') }}</p>
                <strong>{{ detailFinance.returns_count }}</strong>
              </article>
              <article class="mini-stat">
                <p>{{ tt('expensesCount') }}</p>
                <strong>{{ detailFinance.expenses_count }}</strong>
              </article>
            </div>

            <div v-if="detailCategoryBars.length" class="bars">
              <div v-for="bar in detailCategoryBars" :key="bar.category" class="bar-row">
                <span class="bar-label">{{ bar.category }}</span>
                <div class="track">
                  <div class="fill" :style="{ width: `${bar.percent}%` }"></div>
                </div>
                <strong>{{ money(bar.total) }}</strong>
              </div>
            </div>

            <div v-else class="empty-box">{{ tt('noCategoryData') }}</div>
          </div>
        </div>

        <div class="detail-block card-soft" v-if="detail.shift">
          <div class="section-head compact">
            <h4>{{ tt('ownerForensics') }}</h4>
          </div>

          <div class="detail-mini-grid">
            <article class="mini-stat">
              <p>{{ tt('exactGap') }}</p>
              <strong :class="detailFinance.diff >= 0 ? 'diff-positive' : 'diff-negative'">{{ money(forensicSummary.absDiff) }}</strong>
            </article>
            <article class="mini-stat">
              <p>{{ tt('expectedCash') }}</p>
              <strong>{{ money(detailFinance.expected_cash) }}</strong>
            </article>
            <article class="mini-stat">
              <p>{{ tt('closingCash') }}</p>
              <strong>{{ money(detailFinance.closing_cash) }}</strong>
            </article>
          </div>

          <p class="muted forensics-caption">
            {{ tt('expectedVsClosing', { expected: money(detailFinance.expected_cash), closing: money(detailFinance.closing_cash) }) }}
          </p>

          <div class="forensics-signals">
            <p class="forensics-head">{{ tt('likelyReasons') }}</p>
            <ul class="forensics-list">
              <li v-for="(signal, idx) in forensicSummary.signals" :key="`signal-${idx}`">{{ signal }}</li>
            </ul>
          </div>

          <div class="forensics-peaks-grid">
            <div class="forensics-peaks">
              <p class="forensics-head">{{ tt('topExpensePeaks') }}</p>
              <div v-if="topExpensePeaks.length" class="forensics-peaks-list">
                <div v-for="row in topExpensePeaks" :key="`peak-exp-${row.id}`" class="forensics-row">
                  <span>{{ row.title || '-' }} ({{ row.category || '-' }})</span>
                  <strong>{{ money(row.absAmount) }}</strong>
                </div>
              </div>
              <div v-else class="empty-box">{{ tt('noExpensePeaks') }}</div>
            </div>

            <div class="forensics-peaks">
              <p class="forensics-head">{{ tt('topReturnPeaks') }}</p>
              <div v-if="topCashReturnPeaks.length" class="forensics-peaks-list">
                <div v-for="row in topCashReturnPeaks" :key="`peak-ret-${row.id}`" class="forensics-row">
                  <span>{{ clientLabel(row.client) }}</span>
                  <strong>{{ money(row.absAmount) }}</strong>
                </div>
              </div>
              <div v-else class="empty-box">{{ tt('noReturnPeaks') }}</div>
            </div>
          </div>
        </div>

        <div class="detail-block card-soft" v-if="detail.shift">
          <div class="section-head compact">
            <h4>{{ tt('txAudit') }}</h4>
            <span class="muted">{{ tt('operationsCount', { count: detail.transactions.length }) }}</span>
          </div>

          <div v-if="detailTxBreakdown.length" class="detail-chip-grid">
            <div v-for="row in detailTxBreakdown" :key="row.key" class="chip-row">
              <span>{{ row.label }}</span>
              <strong>{{ money(row.total) }}</strong>
              <small>{{ row.count }} ta</small>
            </div>
          </div>

          <div v-if="detail.transactions.length" class="table-wrap detail-table-wrap">
            <table class="table detail-table">
              <thead>
                <tr>
                  <th>{{ tt('time') }}</th>
                  <th>{{ tt('type') }}</th>
                  <th>{{ tt('client') }}</th>
                  <th>{{ tt('payment') }}</th>
                  <th class="right">{{ tt('amount') }}</th>
                  <th class="right">{{ tt('bonus') }}</th>
                  <th>{{ tt('comment') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in detail.transactions" :key="`tx-${tx.id}`">
                  <td>{{ formatDateTime(tx.created_at) }}</td>
                  <td>{{ txTypeLabel(tx.type) }}</td>
                  <td>{{ clientLabel(tx.client) }}</td>
                  <td>{{ paymentLabel(tx.payment_method) }}</td>
                  <td class="right">{{ money(tx.amount) }}</td>
                  <td class="right">{{ money(tx.bonus_amount) }}</td>
                  <td>{{ tx.comment || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="empty-box">{{ tt('noTransactions') }}</div>
        </div>

        <div class="detail-block card-soft" v-if="detail.shift">
          <div class="section-head compact">
            <h4>{{ tt('returnAudit') }}</h4>
            <span class="muted">{{ tt('returnsCountLine', { count: detail.returns.length }) }}</span>
          </div>

          <div v-if="detailReturnBreakdown.length" class="detail-chip-grid">
            <div v-for="row in detailReturnBreakdown" :key="row.key" class="chip-row">
              <span>{{ row.label }}</span>
              <strong>{{ money(row.total) }}</strong>
              <small>{{ row.count }} ta</small>
            </div>
          </div>

          <div v-if="detail.returns.length" class="table-wrap detail-table-wrap">
            <table class="table detail-table">
              <thead>
                <tr>
                  <th>{{ tt('time') }}</th>
                  <th>{{ tt('client') }}</th>
                  <th>{{ tt('method') }}</th>
                  <th>{{ tt('type') }}</th>
                  <th class="right">{{ tt('amount') }}</th>
                  <th>{{ tt('source') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in detail.returns" :key="`ret-${row.id}`">
                  <td>{{ formatDateTime(row.created_at) }}</td>
                  <td>{{ clientLabel(row.client) }}</td>
                  <td>{{ paymentLabel(row.payment_method) }}</td>
                  <td>{{ row.type || '-' }}</td>
                  <td class="right">{{ money(row.amount) }}</td>
                  <td>{{ row.source_type || '-' }} #{{ row.source_id || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="empty-box">{{ tt('noReturns') }}</div>
        </div>

        <div class="detail-block card-soft" v-if="detail.shift">
          <div class="section-head compact">
            <h4>{{ tt('expensesList') }}</h4>
            <span class="muted">{{ tt('expensesCountLine', { count: detail.expenses.length }) }}</span>
          </div>

          <div v-if="detail.expenses.length" class="table-wrap detail-table-wrap">
            <table class="table detail-table">
              <thead>
                <tr>
                  <th>{{ tt('time') }}</th>
                  <th>{{ tt('name') }}</th>
                  <th>{{ tt('category') }}</th>
                  <th class="right">{{ tt('sum') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="expense in detail.expenses" :key="expense.id">
                  <td>{{ formatDateTime(expense.spent_at || expense.created_at) }}</td>
                  <td>{{ expense.title }}</td>
                  <td>{{ expense.category || '-' }}</td>
                  <td class="right">{{ money(expense.amount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="empty-box">{{ tt('noExpenses') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { cpApi } from '../../api/cp'
import { useI18n } from '../../i18n'

const { locale } = useI18n()

const loading = ref(false)
const exportLoading = ref(false)
const forbidden = ref(false)
const errorText = ref('')
const quickRange = ref('')

const filters = reactive({
  from: '',
  to: '',
  perPage: 10,
})

const rows = ref([])

const pagination = reactive({
  page: 1,
  lastPage: 1,
  total: 0,
})

const summary = reactive({
  shiftsCount: 0,
  cashIn: 0,
  cardIn: 0,
  cashOut: 0,
  netCash: 0,
  closingSum: 0,
  closingAvg: 0,
  returnsTotal: 0,
  returnsCash: 0,
  expensesTotal: 0,
  expectedSum: 0,
  diffOverageSum: 0,
  diffShortageSum: 0,
  reconciledCount: 0,
  unreconciledCount: 0,
})

const detail = reactive({
  open: false,
  loading: false,
  error: '',
  shift: null,
  finance: {},
  transactions: [],
  txBreakdown: [],
  returns: [],
  returnBreakdown: [],
  expenses: [],
  categories: [],
})

const pageText = {
  uz: {
    analytics: 'Tahlil',
    title: 'Shift Tarixi',
    subtitle: "Yopilgan smenalar bo'yicha trend, reconciliatsiya va to'liq audit tafsilotlari.",
    forbidden: "Bu bo'lim faqat admin/owner uchun.",
    filtersTitle: 'Filtrlar',
    filtersSub: "Sana oralig'ini tanlang yoki tayyor intervaldan foydalaning.",
    today: 'Bugun',
    range7: '7 kun',
    range30: '30 kun',
    from: 'Dan',
    to: 'Gacha',
    perPage: 'Sahifada',
    clear: 'Tozalash',
    apply: "Qo'llash",
    avgClosing: "O'rtacha yakuniy kassa",
    avgClosingSub: "Yopilgan smenalarning o'rtacha yakuniy kassasi",
    coverage: 'Solishtirish qamrovi',
    coverageSub: "{matched} / {total} smena to'liq mos",
    bestWorst: 'Eng yaxshi / eng past smena',
    bestWorstLine: 'Eng yaxshi: #{bestId} ({bestNet}) · Eng past: #{worstId} ({worstNet})',
    diffLine: 'Farq: {diff}',
    noData: "Yetarli ma'lumot yo'q",
    shiftsCount: 'Smenalar soni',
    shiftsCountSub: 'Joriy sahifadagi natijalar',
    cashIn: 'Naqd kirim',
    cashInSub: "Naqd to'lov tushumlari",
    cardIn: 'Karta kirim',
    cardInSub: "Karta to'lov tushumlari",
    grossIn: 'Umumiy kirim',
    grossInSub: "Naqd + karta umumiy tushumi",
    returnsTotal: 'Qaytarilgan summa',
    returnsTotalSub: 'Naqd/Karta/Balans qaytarishlar',
    cashOut: 'Naqd chiqim',
    cashOutSub: 'Xarajat + naqd qaytarish',
    netCash: 'Sof naqd',
    netCashSub: 'Naqd tushum - xarajat - naqd qaytarish',
    expectedCash: 'Kutilgan kassa',
    expectedCashSub: "Formula bo'yicha yakuniy kassa",
    closingCash: 'Yakuniy kassa',
    closingCashSub: 'Faktik yopilish kassasi',
    overShort: 'Over / Short',
    overShortSub: "Ortiqcha / kamomad yig'indisi",
    netTrend: 'Sof naqd trendi',
    min: 'Min',
    max: 'Max',
    noChart: "Grafik uchun ma'lumot yo'q.",
    categoryBreakdown: 'Tanlangan smena kategoriya breakdown',
    detailBreakdownHint: 'Smena detail ochilganda bu yerda taqsimot chiqadi.',
    closedShifts: 'Yopilgan smenalar',
    total: 'Jami',
    openedAt: 'Ochilgan',
    closedAt: 'Yopilgan',
    operator: 'Operator',
    start: 'Boshlangich',
    gross: 'Umumiy',
    return: 'Qaytarish',
    expense: 'Xarajat',
    expected: 'Kutilgan',
    diff: 'Farq',
    net: 'Sof',
    closing: 'Yopilish',
    status: 'Status',
    noShifts: "Berilgan filterda smena topilmadi.",
    prev: 'Oldingi',
    next: 'Keyingi',
    page: 'Sahifa',
    refresh: 'Yangilash',
    shift: 'Smena',
    openedBy: 'Smenani ochgan',
    closedBy: 'Smenani yopgan',
    returnsCash: 'Qaytarish (naqd)',
    returnsAll: 'Qaytarish (jami)',
    grossInLabel: 'Umumiy kirim',
    categoryBreakdownShort: 'Kategoriya breakdown',
    formulaTitle: "Kutilgan = Boshlangich + Naqd tushum - Naqd qaytarish - Xarajat",
    txCount: 'Tranzaksiya soni',
    returnsCount: 'Qaytarish soni',
    expensesCount: 'Xarajat soni',
    noCategoryData: "Xarajat kategoriyalari bo'yicha ma'lumot topilmadi.",
    txAudit: 'Tranzaksiyalar auditi',
    operationsCount: '{count} ta operatsiya',
    time: 'Vaqt',
    type: 'Turi',
    client: 'Mijoz',
    payment: "To'lov",
    amount: 'Summa',
    bonus: 'Bonus',
    comment: 'Izoh',
    noTransactions: "Bu smenada transactionlar topilmadi.",
    returnAudit: 'Qaytarish auditi',
    returnsCountLine: '{count} ta qaytarish',
    method: 'Usul',
    source: 'Source',
    noReturns: "Bu smenada return yo'q.",
    expensesList: "Xarajatlar ro'yxati",
    expensesCountLine: '{count} ta xarajat',
    name: 'Nomi',
    category: 'Kategoriya',
    sum: 'Summa',
    noExpenses: "Bu smenada xarajat yo'q.",
    statusMatched: 'Mos',
    statusCarried: "Otkazilgan",
    statusPartial: "Qisman otkazilgan",
    statusOverage: 'Ortiqcha',
    statusShortage: 'Kamomad',
    statusUnknown: "Nomalum",
    paymentCash: 'Naqd',
    paymentCard: 'Karta',
    paymentBalance: 'Balance',
    txTopup: "To'ldirish",
    txPackage: 'Paket',
    txSubscription: 'Obuna',
    unknownCategory: 'No category',
    loadError: 'Shift tarixini yuklashda xato.',
    detailLoadError: 'Shift detail yuklanmadi.',
    lastClosedRange: 'Oxirgi yopilgan smenalar',
    adminOnly: "Bu bo'lim faqat admin/owner uchun.",
    exportExcel: 'Excel yuklab olish',
    exporting: 'Yuklanmoqda...',
    exportError: 'Excel export qilishda xato.',
    ownerForensics: 'Owner nazorati (kamomad tahlili)',
    exactGap: 'Aniq kassa farqi',
    expectedVsClosing: 'Expected: {expected} · Closing: {closing}',
    likelyReasons: 'Taxminiy sabab signallari',
    signalShortage: "Kassa expecteddan {amount} kam. Bu summa qayd etilmagan chiqim yoki sanash xatosi bo'lishi mumkin.",
    signalOverage: "Kassa expecteddan {amount} ko'p. Bu summa ortiqcha naqd yoki noto'g'ri yopish kiritilishi bo'lishi mumkin.",
    signalHighExpense: "Xarajat bosimi yuqori: naqd kirimning {ratio}% qismi xarajatlarga ketgan.",
    signalHighReturns: "Naqd qaytarish ulushi yuqori: naqd kirimning {ratio}% qismi qaytarilgan.",
    signalManyOps: "Naqd operatsiyalar soni yuqori ({count} ta). Kassa sanash xatosi ehtimoli oshadi.",
    signalCarryToNext: "Kamomadning {amount} qismi keyingi smena opening kassasiga o'tgan (Shift #{shiftId}).",
    signalCarryPartial: "Kamomaddan {carried} keyingi smenaga o'tgan, lekin {unresolved} hali yopilmagan.",
    signalNoSignals: 'Kuchli risk signallari aniqlanmadi.',
    topExpensePeaks: 'Eng katta xarajatlar',
    topReturnPeaks: 'Eng katta naqd qaytarishlar',
    noExpensePeaks: "Yirik xarajat topilmadi.",
    noReturnPeaks: "Yirik naqd qaytarish topilmadi.",
  },
  ru: {
    analytics: 'Аналитика',
    title: 'История смен',
    subtitle: 'Тренд закрытых смен, сверка кассы и полный аудит.',
    forbidden: 'Раздел доступен только admin/owner.',
    filtersTitle: 'Фильтры',
    filtersSub: 'Выберите период или используйте быстрый диапазон.',
    today: 'Сегодня',
    range7: '7 дней',
    range30: '30 дней',
    from: 'От',
    to: 'До',
    perPage: 'На странице',
    clear: 'Сброс',
    apply: 'Применить',
    avgClosing: 'Средний closing cash',
    avgClosingSub: 'Средняя фактическая касса закрытия по сменам',
    coverage: 'Покрытие сверки',
    coverageSub: 'Полностью сходится: {matched} / {total}',
    bestWorst: 'Лучшая / худшая смена',
    bestWorstLine: 'Лучшая: #{bestId} ({bestNet}) · Худшая: #{worstId} ({worstNet})',
    diffLine: 'Разница: {diff}',
    noData: 'Недостаточно данных',
    shiftsCount: 'Количество смен',
    shiftsCountSub: 'Результаты на текущей странице',
    cashIn: 'Наличный приход',
    cashInSub: 'Поступления cash',
    cardIn: 'Карточный приход',
    cardInSub: 'Поступления card',
    grossIn: 'Валовый приход',
    grossInSub: 'Сумма cash + card',
    returnsTotal: 'Сумма возвратов',
    returnsTotalSub: 'Возвраты cash/card/balance',
    cashOut: 'Наличный расход',
    cashOutSub: 'Расходы + cash возвраты',
    netCash: 'Net cash',
    netCashSub: 'Cash in - расходы - cash возвраты',
    expectedCash: 'Ожидаемая касса',
    expectedCashSub: 'Расчетная касса по формуле',
    closingCash: 'Closing cash',
    closingCashSub: 'Фактическая касса закрытия',
    overShort: 'Излишек / Недостача',
    overShortSub: 'Сумма излишка и недостачи',
    netTrend: 'Тренд net cash',
    min: 'Мин',
    max: 'Макс',
    noChart: 'Нет данных для графика.',
    categoryBreakdown: 'Разбивка категорий выбранной смены',
    detailBreakdownHint: 'Откройте смену, чтобы увидеть разбивку.',
    closedShifts: 'Закрытые смены',
    total: 'Всего',
    openedAt: 'Открыта',
    closedAt: 'Закрыта',
    operator: 'Оператор',
    start: 'Старт',
    gross: 'Валовый',
    return: 'Возврат',
    expense: 'Расход',
    expected: 'Ожидаемо',
    diff: 'Разница',
    net: 'Net',
    closing: 'Закрытие',
    status: 'Статус',
    noShifts: 'По выбранному фильтру смены не найдены.',
    prev: 'Назад',
    next: 'Вперед',
    page: 'Страница',
    refresh: 'Обновить',
    shift: 'Смена',
    openedBy: 'Открыл',
    closedBy: 'Закрыл',
    returnsCash: 'Возвраты (cash)',
    returnsAll: 'Возвраты (всего)',
    grossInLabel: 'Валовый приход',
    categoryBreakdownShort: 'Разбивка по категориям',
    formulaTitle: 'Ожидаемо = Старт + Cash in - Cash return - Расход',
    txCount: 'Кол-во TX',
    returnsCount: 'Кол-во возвратов',
    expensesCount: 'Кол-во расходов',
    noCategoryData: 'Нет данных по категориям расходов.',
    txAudit: 'Аудит транзакций',
    operationsCount: 'Операций: {count}',
    time: 'Время',
    type: 'Тип',
    client: 'Клиент',
    payment: 'Оплата',
    amount: 'Сумма',
    bonus: 'Бонус',
    comment: 'Комментарий',
    noTransactions: 'В этой смене нет транзакций.',
    returnAudit: 'Аудит возвратов',
    returnsCountLine: 'Возвратов: {count}',
    method: 'Метод',
    source: 'Источник',
    noReturns: 'В этой смене нет возвратов.',
    expensesList: 'Список расходов',
    expensesCountLine: 'Расходов: {count}',
    name: 'Название',
    category: 'Категория',
    sum: 'Сумма',
    noExpenses: 'В этой смене нет расходов.',
    statusMatched: 'Сходится',
    statusCarried: 'Перенесено',
    statusPartial: 'Частично перенесено',
    statusOverage: 'Излишек',
    statusShortage: 'Недостача',
    statusUnknown: 'Неизвестно',
    paymentCash: 'Наличные',
    paymentCard: 'Карта',
    paymentBalance: 'Баланс',
    txTopup: 'Пополнение',
    txPackage: 'Пакет',
    txSubscription: 'Подписка',
    unknownCategory: 'Без категории',
    loadError: 'Не удалось загрузить историю смен.',
    detailLoadError: 'Не удалось загрузить детали смены.',
    lastClosedRange: 'Последние закрытые смены',
    adminOnly: 'Раздел доступен только admin/owner.',
    exportExcel: 'Скачать Excel',
    exporting: 'Загрузка...',
    exportError: 'Ошибка при экспорте Excel.',
    ownerForensics: 'Контроль owner (анализ недостачи)',
    exactGap: 'Точная кассовая разница',
    expectedVsClosing: 'Ожидаемо: {expected} · Факт: {closing}',
    likelyReasons: 'Сигналы вероятных причин',
    signalShortage: 'Касса ниже ожидаемой на {amount}. Возможен неучтенный расход или ошибка пересчета.',
    signalOverage: 'Касса выше ожидаемой на {amount}. Возможна лишняя наличность или ошибка при закрытии.',
    signalHighExpense: 'Высокая доля расходов: {ratio}% от наличного прихода.',
    signalHighReturns: 'Высокая доля cash-возвратов: {ratio}% от наличного прихода.',
    signalManyOps: 'Много наличных операций ({count}). Риск ошибки пересчета выше.',
    signalCarryToNext: 'Сумма {amount} перенесена в opening следующей смены (Shift #{shiftId}).',
    signalCarryPartial: 'Из недостачи {carried} перенесено в следующую смену, но {unresolved} еще не закрыто.',
    signalNoSignals: 'Сильные риск-сигналы не обнаружены.',
    topExpensePeaks: 'Крупнейшие расходы',
    topReturnPeaks: 'Крупнейшие cash-возвраты',
    noExpensePeaks: 'Крупных расходов не найдено.',
    noReturnPeaks: 'Крупных cash-возвратов не найдено.',
  },
  en: {
    analytics: 'Analytics',
    title: 'Shift History',
    subtitle: 'Closed-shift trends, cash reconciliation, and full audit details.',
    forbidden: 'This section is available only for admin/owner.',
    filtersTitle: 'Filters',
    filtersSub: 'Pick a date range or use a quick interval.',
    today: 'Today',
    range7: '7 days',
    range30: '30 days',
    from: 'From',
    to: 'To',
    perPage: 'Per page',
    clear: 'Clear',
    apply: 'Apply',
    avgClosing: 'Average closing cash',
    avgClosingSub: 'Average final cash at shift close',
    coverage: 'Reconciled coverage',
    coverageSub: 'Fully matched shifts: {matched} / {total}',
    bestWorst: 'Best / Worst shift',
    bestWorstLine: 'Best: #{bestId} ({bestNet}) · Worst: #{worstId} ({worstNet})',
    diffLine: 'Difference: {diff}',
    noData: 'Not enough data',
    shiftsCount: 'Shifts count',
    shiftsCountSub: 'Current page results',
    cashIn: 'Cash in',
    cashInSub: 'Cash payment inflow',
    cardIn: 'Card in',
    cardInSub: 'Card payment inflow',
    grossIn: 'Gross inflow',
    grossInSub: 'Cash + card total inflow',
    returnsTotal: 'Returned amount',
    returnsTotalSub: 'Cash/Card/Balance returns',
    cashOut: 'Cash out',
    cashOutSub: 'Expenses + cash returns',
    netCash: 'Net cash',
    netCashSub: 'Cash in - expense - cash return',
    expectedCash: 'Expected cash',
    expectedCashSub: 'Formula-based final cash',
    closingCash: 'Closing cash',
    closingCashSub: 'Actual final cash',
    overShort: 'Over / Short',
    overShortSub: 'Overage and shortage totals',
    netTrend: 'Net cash trend',
    min: 'Min',
    max: 'Max',
    noChart: 'No data for chart.',
    categoryBreakdown: 'Selected shift category breakdown',
    detailBreakdownHint: 'Open a shift detail to see breakdown here.',
    closedShifts: 'Closed shifts',
    total: 'Total',
    openedAt: 'Opened',
    closedAt: 'Closed',
    operator: 'Operator',
    start: 'Start',
    gross: 'Gross',
    return: 'Return',
    expense: 'Expense',
    expected: 'Expected',
    diff: 'Diff',
    net: 'Net',
    closing: 'Closing',
    status: 'Status',
    noShifts: 'No shifts found for selected filter.',
    prev: 'Previous',
    next: 'Next',
    page: 'Page',
    refresh: 'Refresh',
    shift: 'Shift',
    openedBy: 'Opened by',
    closedBy: 'Closed by',
    returnsCash: 'Returns (cash)',
    returnsAll: 'Returns (total)',
    grossInLabel: 'Gross in',
    categoryBreakdownShort: 'Category breakdown',
    formulaTitle: 'Expected = Start + Cash in - Cash return - Expense',
    txCount: 'TX count',
    returnsCount: 'Returns count',
    expensesCount: 'Expenses count',
    noCategoryData: 'No expense category data.',
    txAudit: 'Transaction audit',
    operationsCount: '{count} operations',
    time: 'Time',
    type: 'Type',
    client: 'Client',
    payment: 'Payment',
    amount: 'Amount',
    bonus: 'Bonus',
    comment: 'Comment',
    noTransactions: 'No transactions in this shift.',
    returnAudit: 'Return audit',
    returnsCountLine: '{count} returns',
    method: 'Method',
    source: 'Source',
    noReturns: 'No returns in this shift.',
    expensesList: 'Expenses list',
    expensesCountLine: '{count} expenses',
    name: 'Name',
    category: 'Category',
    sum: 'Amount',
    noExpenses: 'No expenses in this shift.',
    statusMatched: 'Matched',
    statusCarried: 'Carried',
    statusPartial: 'Partially carried',
    statusOverage: 'Overage',
    statusShortage: 'Shortage',
    statusUnknown: 'Unknown',
    paymentCash: 'Cash',
    paymentCard: 'Card',
    paymentBalance: 'Balance',
    txTopup: 'Topup',
    txPackage: 'Package',
    txSubscription: 'Subscription',
    unknownCategory: 'No category',
    loadError: 'Failed to load shift history.',
    detailLoadError: 'Failed to load shift details.',
    lastClosedRange: 'Latest closed shifts',
    adminOnly: 'This section is available only for admin/owner.',
    exportExcel: 'Download Excel',
    exporting: 'Downloading...',
    exportError: 'Failed to export Excel.',
    ownerForensics: 'Owner control (shortage forensics)',
    exactGap: 'Exact cash gap',
    expectedVsClosing: 'Expected: {expected} · Closing: {closing}',
    likelyReasons: 'Likely cause signals',
    signalShortage: 'Cash is {amount} below expected. This may indicate unlogged cash outflow or counting error.',
    signalOverage: 'Cash is {amount} above expected. This may indicate extra cash or close-entry mismatch.',
    signalHighExpense: 'High expense pressure: {ratio}% of cash inflow spent as expenses.',
    signalHighReturns: 'High cash-return pressure: {ratio}% of cash inflow returned.',
    signalManyOps: 'High count of cash operations ({count}). Counting-error risk is higher.',
    signalCarryToNext: '{amount} appears carried into next shift opening (Shift #{shiftId}).',
    signalCarryPartial: '{carried} appears carried into next shift, but {unresolved} is still unresolved.',
    signalNoSignals: 'No strong risk signals detected.',
    topExpensePeaks: 'Largest expenses',
    topReturnPeaks: 'Largest cash returns',
    noExpensePeaks: 'No large expenses found.',
    noReturnPeaks: 'No large cash returns found.',
  },
}

const tt = (key, params = {}) => {
  const lang = pageText[locale.value] ? locale.value : 'uz'
  let text = pageText[lang][key] ?? pageText.uz[key] ?? key
  for (const [k, v] of Object.entries(params)) {
    text = text.replaceAll(`{${k}}`, String(v))
  }
  return text
}

const toNum = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const localeCode = computed(() => {
  if (locale.value === 'ru') return 'ru-RU'
  if (locale.value === 'en') return 'en-US'
  return 'uz-UZ'
})

const money = (value) => `${new Intl.NumberFormat(localeCode.value).format(toNum(value))} UZS`

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(localeCode.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const operatorName = (operator) => {
  if (!operator) return '-'
  return operator.name || operator.login || '-'
}

const clientLabel = (client) => {
  if (!client) return '-'
  return client.login || client.phone || `#${client.id}`
}

const paymentLabel = (value) => {
  const method = String(value || '').toLowerCase()
  if (method === 'cash') return tt('paymentCash')
  if (method === 'card') return tt('paymentCard')
  if (method === 'balance') return tt('paymentBalance')
  return method || '-'
}

const txTypeLabel = (value) => {
  const type = String(value || '').toLowerCase()
  if (type === 'topup') return tt('txTopup')
  if (type === 'package') return tt('txPackage')
  if (type === 'subscription') return tt('txSubscription')
  return type || '-'
}

const extractError = (error, fallback) => {
  const validation = error?.response?.data?.errors
  if (validation && typeof validation === 'object') {
    const first = Object.values(validation).flat()[0]
    if (first) return String(first)
  }
  return String(error?.response?.data?.message || fallback)
}

const parseFilename = (contentDisposition) => {
  if (!contentDisposition) return ''
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]).replace(/["']/g, '')
  const plainMatch = contentDisposition.match(/filename="?([^\";]+)"?/i)
  if (plainMatch?.[1]) return plainMatch[1]
  return ''
}

const normalizeFinance = (raw = {}, fallback = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const row = fallback && typeof fallback === 'object' ? fallback : {}

  const openingCash = toNum(source.opening_cash ?? row.opening_cash)
  const cashIn = toNum(source.cash_in ?? row.topups_cash_total)
  const cardIn = toNum(source.card_in ?? row.topups_card_total)
  const grossIn = toNum(source.gross_in ?? (cashIn + cardIn))
  const returnsCash = Math.abs(toNum(source.returns_cash ?? 0))
  const returnsCard = Math.abs(toNum(source.returns_card ?? 0))
  const returnsBalance = Math.abs(toNum(source.returns_balance ?? 0))
  const returnsTotal = Math.abs(toNum(source.returns_total ?? (returnsCash + returnsCard)))
  const expensesCash = Math.abs(toNum(source.expenses_cash ?? row.expenses_cash_total))
  const adjustmentsTotal = toNum(source.adjustments_total ?? row.adjustments_total)
  const expectedCash = toNum(source.expected_cash ?? (openingCash + cashIn - returnsCash - expensesCash))
  const closingCash = toNum(source.closing_cash ?? row.closing_cash)
  const rawDiff = toNum(source.diff ?? (closingCash - expectedCash))
  const diff = toNum(source.effective_diff ?? rawDiff)
  const netCash = toNum(source.net_cash ?? (cashIn - expensesCash - returnsCash))

  return {
    opening_cash: openingCash,
    cash_in: cashIn,
    card_in: cardIn,
    gross_in: grossIn,
    returns_cash: returnsCash,
    returns_card: returnsCard,
    returns_balance: returnsBalance,
    returns_total: returnsTotal,
    expenses_cash: expensesCash,
    adjustments_total: adjustmentsTotal,
    expected_cash: expectedCash,
    closing_cash: closingCash,
    raw_diff: rawDiff,
    diff,
    carry_to_next_opening: toNum(source.carry_to_next_opening),
    shortage_carried_to_next: Boolean(source.shortage_carried_to_next),
    shortage_partially_carried_to_next: Boolean(source.shortage_partially_carried_to_next),
    shortage_unresolved: toNum(source.shortage_unresolved),
    next_shift_id: toNum(source.next_shift_id),
    next_shift_opening_cash: toNum(source.next_shift_opening_cash),
    net_cash: netCash,
    tx_count: toNum(source.tx_count),
    returns_count: toNum(source.returns_count),
    expenses_count: toNum(source.expenses_count),
  }
}

const financeOf = (row) => normalizeFinance(row?.finance || {}, row)

const openingCash = (row) => financeOf(row).opening_cash
const cashIn = (row) => financeOf(row).cash_in
const cardIn = (row) => financeOf(row).card_in
const grossIn = (row) => financeOf(row).gross_in
const returnsTotal = (row) => financeOf(row).returns_total
const expensesCash = (row) => financeOf(row).expenses_cash
const expectedCash = (row) => financeOf(row).expected_cash
const closingCash = (row) => financeOf(row).closing_cash
const diffValue = (row) => financeOf(row).diff
const netCash = (row) => financeOf(row).net_cash

const reconcileStatus = (row) => {
  const raw = String(row?.reconcile_status || '').toLowerCase()
  if (raw === 'matched' || raw === 'carried' || raw === 'partial' || raw === 'overage' || raw === 'shortage') return raw
  if (financeOf(row).shortage_carried_to_next) return 'carried'
  if (financeOf(row).shortage_partially_carried_to_next) return 'partial'
  const diff = diffValue(row)
  if (diff === 0) return 'matched'
  return diff > 0 ? 'overage' : 'shortage'
}

const statusLabel = (status) => {
  if (status === 'matched') return tt('statusMatched')
  if (status === 'carried') return tt('statusCarried')
  if (status === 'partial') return tt('statusPartial')
  if (status === 'overage') return tt('statusOverage')
  if (status === 'shortage') return tt('statusShortage')
  return tt('statusUnknown')
}

const statusClass = (status) => {
  if (status === 'matched') return 'status-matched'
  if (status === 'carried') return 'status-carried'
  if (status === 'partial') return 'status-partial'
  if (status === 'overage') return 'status-overage'
  if (status === 'shortage') return 'status-shortage'
  return 'status-unknown'
}

const rowToneClass = (row) => {
  const status = reconcileStatus(row)
  if (status === 'matched') return 'row-status-matched'
  if (status === 'carried') return 'row-status-carried'
  if (status === 'partial') return 'row-status-partial'
  if (status === 'overage') return 'row-status-overage'
  return 'row-status-shortage'
}

const detailFinance = computed(() => normalizeFinance(detail.finance, detail.shift || {}))

const detailReconcileStatus = computed(() => {
  if (detail.shift?.reconcile_status) return detail.shift.reconcile_status
  if (detailFinance.value.shortage_carried_to_next) return 'carried'
  if (detailFinance.value.shortage_partially_carried_to_next) return 'partial'
  if (detailFinance.value.diff === 0) return 'matched'
  return detailFinance.value.diff > 0 ? 'overage' : 'shortage'
})

const selectedRangeLabel = computed(() => {
  if (filters.from && filters.to) return `${filters.from} -> ${filters.to}`
  return tt('lastClosedRange')
})

const averageClosingCash = computed(() => {
  if (!rows.value.length) return 0
  const sum = rows.value.reduce((acc, row) => acc + closingCash(row), 0)
  return Math.round(sum / rows.value.length)
})

const bestShift = computed(() => {
  if (!rows.value.length) return null
  return rows.value.reduce((best, row) => (netCash(row) > netCash(best) ? row : best), rows.value[0])
})

const worstShift = computed(() => {
  if (!rows.value.length) return null
  return rows.value.reduce((worst, row) => (netCash(row) < netCash(worst) ? row : worst), rows.value[0])
})

const reconcileCoverage = computed(() => {
  if (!summary.shiftsCount) {
    return { rate: 0 }
  }
  return {
    rate: Math.round((summary.reconciledCount / summary.shiftsCount) * 100),
  }
})

const detailTxBreakdown = computed(() => {
  if (!detail.txBreakdown.length) return []
  return detail.txBreakdown.map((row, index) => ({
    key: `tx-${index}`,
    label: `${txTypeLabel(row.type)} / ${paymentLabel(row.payment_method)}`,
    total: toNum(row.total_amount),
    count: toNum(row.ops_count),
  }))
})

const detailReturnBreakdown = computed(() => {
  if (!detail.returnBreakdown.length) return []
  return detail.returnBreakdown.map((row, index) => ({
    key: `return-${index}`,
    label: paymentLabel(row.payment_method),
    total: toNum(row.total_amount),
    count: toNum(row.ops_count),
  }))
})

const forensicSummary = computed(() => {
  const f = detailFinance.value
  const absDiff = Math.abs(toNum(f.diff))
  const rawAbsDiff = Math.abs(toNum(f.raw_diff))
  const cashInSafe = Math.max(1, toNum(f.cash_in))
  const expenseRatio = Math.round((Math.abs(toNum(f.expenses_cash)) / cashInSafe) * 100)
  const returnRatio = Math.round((Math.abs(toNum(f.returns_cash)) / cashInSafe) * 100)
  const signals = []

  if (f.shortage_carried_to_next && toNum(f.carry_to_next_opening) > 0) {
    signals.push(tt('signalCarryToNext', { amount: money(f.carry_to_next_opening), shiftId: toNum(f.next_shift_id) || '-' }))
  }

  if (f.shortage_partially_carried_to_next && toNum(f.carry_to_next_opening) > 0) {
    signals.push(tt('signalCarryPartial', { carried: money(f.carry_to_next_opening), unresolved: money(f.shortage_unresolved) }))
  }

  if (!f.shortage_carried_to_next && f.diff < 0) {
    signals.push(tt('signalShortage', { amount: money(absDiff) }))
  } else if (f.diff > 0) {
    signals.push(tt('signalOverage', { amount: money(absDiff) }))
  }

  if (expenseRatio >= 35) {
    signals.push(tt('signalHighExpense', { ratio: expenseRatio }))
  }

  if (returnRatio >= 20) {
    signals.push(tt('signalHighReturns', { ratio: returnRatio }))
  }

  if (toNum(f.tx_count) >= 80) {
    signals.push(tt('signalManyOps', { count: toNum(f.tx_count) }))
  }

  if (!signals.length) {
    signals.push(tt('signalNoSignals'))
  }

  return {
    absDiff,
    rawAbsDiff,
    signals,
  }
})

const topExpensePeaks = computed(() => {
  if (!detail.expenses.length) return []
  return [...detail.expenses]
    .map((row) => ({ ...row, absAmount: Math.abs(toNum(row.amount)) }))
    .sort((a, b) => b.absAmount - a.absAmount)
    .slice(0, 3)
})

const topCashReturnPeaks = computed(() => {
  if (!detail.returns.length) return []
  return detail.returns
    .filter((row) => String(row?.payment_method || '').toLowerCase() === 'cash')
    .map((row) => ({ ...row, absAmount: Math.abs(toNum(row.amount)) }))
    .sort((a, b) => b.absAmount - a.absAmount)
    .slice(0, 3)
})

const dayString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const applyQuick = (mode) => {
  quickRange.value = mode

  const to = new Date()
  const from = new Date()

  if (mode === 'today') {
    filters.from = dayString(to)
    filters.to = dayString(to)
  } else if (mode === '7d') {
    from.setDate(to.getDate() - 6)
    filters.from = dayString(from)
    filters.to = dayString(to)
  } else if (mode === '30d') {
    from.setDate(to.getDate() - 29)
    filters.from = dayString(from)
    filters.to = dayString(to)
  }

  reload(1)
}

const resetFilters = () => {
  quickRange.value = ''
  filters.from = ''
  filters.to = ''
  filters.perPage = 10
  reload(1)
}

const downloadExport = async () => {
  exportLoading.value = true
  errorText.value = ''

  try {
    const params = {
      lang: locale.value,
      limit: 2000,
    }

    if (filters.from) params.from = filters.from
    if (filters.to) params.to = filters.to

    let response
    try {
      response = await cpApi.shiftHistoryExportXlsx(params)
    } catch (xlsxError) {
      response = await cpApi.shiftHistoryExport(params)
    }
    const contentType = response?.headers?.['content-type'] || 'application/vnd.ms-excel'
    const disposition = response?.headers?.['content-disposition'] || ''
    const filename = parseFilename(disposition) || `shift-history-${Date.now()}.xlsx`
    const blob = new Blob([response.data], { type: contentType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    errorText.value = tt('exportError')
  } finally {
    exportLoading.value = false
  }
}

const applySummary = (raw = {}) => {
  summary.shiftsCount = toNum(raw.shifts_count)
  summary.cashIn = toNum(raw.cash_in)
  summary.cardIn = toNum(raw.card_in)
  summary.cashOut = toNum(raw.cash_out)
  summary.netCash = toNum(raw.net_cash)
  summary.closingSum = toNum(raw.closing_sum)
  summary.closingAvg = toNum(raw.closing_avg)
  summary.returnsTotal = toNum(raw.returns_total)
  summary.returnsCash = toNum(raw.returns_cash)
  summary.expensesTotal = toNum(raw.expenses_total)
  summary.expectedSum = toNum(raw.expected_sum)
  summary.diffOverageSum = toNum(raw.diff_overage_sum)
  summary.diffShortageSum = toNum(raw.diff_shortage_sum)
  summary.reconciledCount = toNum(raw.reconciled_count)
  summary.unreconciledCount = toNum(raw.unreconciled_count)
}

const reload = async (page = pagination.page) => {
  loading.value = true
  forbidden.value = false
  errorText.value = ''

  try {
    const params = {
      page,
      per_page: filters.perPage,
    }

    if (filters.from) params.from = filters.from
    if (filters.to) params.to = filters.to

    const response = await cpApi.shiftHistory(params)
    const payload = response?.data?.data || {}

    rows.value = Array.isArray(payload.items) ? payload.items : []

    const pg = payload.pagination || {}
    pagination.page = toNum(pg.current_page || page || 1)
    pagination.lastPage = Math.max(1, toNum(pg.last_page || 1))
    pagination.total = toNum(pg.total)

    applySummary(payload.summary || {})
  } catch (error) {
    if (error?.response?.status === 403) {
      forbidden.value = true
    } else {
      errorText.value = extractError(error, tt('loadError'))
    }
  } finally {
    loading.value = false
  }
}

const loadDetail = async (id) => {
  detail.loading = true
  detail.error = ''

  try {
    const response = await cpApi.shiftHistoryDetail(id)
    const payload = response?.data?.data || {}

    detail.shift = payload.shift || null
    detail.finance = payload.finance || detail.shift?.finance || {}
    detail.transactions = Array.isArray(payload.transactions) ? payload.transactions : []
    detail.txBreakdown = Array.isArray(payload.transactions_by_type) ? payload.transactions_by_type : []
    detail.returns = Array.isArray(payload.returns) ? payload.returns : []
    detail.returnBreakdown = Array.isArray(payload.returns_by_method) ? payload.returns_by_method : []
    detail.expenses = Array.isArray(payload.expenses) ? payload.expenses : []
    detail.categories = Array.isArray(payload.expenses_by_category) ? payload.expenses_by_category : []
  } catch (error) {
    detail.error = extractError(error, tt('detailLoadError'))
  } finally {
    detail.loading = false
  }
}

const openDetail = async (id) => {
  detail.open = true
  detail.shift = null
  detail.finance = {}
  detail.transactions = []
  detail.txBreakdown = []
  detail.returns = []
  detail.returnBreakdown = []
  detail.expenses = []
  detail.categories = []
  detail.error = ''
  await loadDetail(id)
}

const reloadDetail = async () => {
  if (!detail.shift?.id) return
  await loadDetail(detail.shift.id)
}

const closeDetail = () => {
  detail.open = false
}

const chartData = computed(() => {
  if (!rows.value.length) {
    return { points: [], polyline: '', area: '', min: 0, max: 0 }
  }

  const ordered = [...rows.value].reverse()
  const values = ordered.map((row) => netCash(row))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || 1

  const width = 640
  const height = 220
  const padX = 24
  const padY = 18
  const floorY = height - padY
  const stepX = ordered.length === 1 ? 0 : (width - padX * 2) / (ordered.length - 1)

  const points = values.map((value, index) => {
    const x = padX + stepX * index
    const ratio = (value - min) / spread
    const y = floorY - ratio * (height - padY * 2)
    return { x, y }
  })

  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')
  const area = points.length
    ? `${points[0].x},${floorY} ${polyline} ${points[points.length - 1].x},${floorY}`
    : ''

  return {
    points,
    polyline,
    area,
    min,
    max,
  }
})

const detailCategoryBars = computed(() => {
  if (!detail.categories.length) return []

  const max = Math.max(...detail.categories.map((row) => toNum(row.total))) || 1

  return detail.categories.map((row) => {
    const total = toNum(row.total)
    return {
      category: row.category || tt('unknownCategory'),
      total,
      percent: Math.max(4, Math.round((total / max) * 100)),
    }
  })
})

onMounted(() => {
  reload(1)
})
</script>

<style scoped>
.history-page {
  display: grid;
  gap: 14px;
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
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  z-index: 1;
}

.range-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.44);
  background: rgba(14, 165, 233, 0.14);
  color: #e0f2fe;
  font-size: 11px;
  font-weight: 800;
  padding: 7px 12px;
}

.filters {
  padding: 14px;
}

.filters-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.filters-top h2 {
  margin: 0;
  font-size: 15px;
}

.filters-top p {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(203, 213, 225, 0.72);
}

.quick-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 220px 220px 160px 1fr;
  gap: 10px;
  align-items: end;
}

.field {
  display: grid;
  gap: 6px;
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

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.story-card {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.story-positive {
  border-color: rgba(16, 185, 129, 0.4);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.16), rgba(15, 23, 42, 0.55));
}

.story-negative {
  border-color: rgba(248, 113, 113, 0.42);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.14), rgba(15, 23, 42, 0.55));
}

.story-label {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(226, 232, 240, 0.68);
}

.story-value {
  margin: 7px 0 5px;
  font-size: 22px;
  font-weight: 900;
  color: #f8fafc;
}

.story-sub {
  margin: 0;
  font-size: 12px;
  color: rgba(203, 213, 225, 0.74);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
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

.charts-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 12px;
}

.chart-box,
.table-box {
  padding: 14px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.section-head h2,
.section-head h4 {
  margin: 0;
  font-size: 15px;
}

.section-head.compact {
  margin-bottom: 8px;
}

.muted {
  font-size: 12px;
  color: rgba(203, 213, 225, 0.72);
}

.svg-wrap {
  margin-top: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.5);
}

svg {
  width: 100%;
  height: 220px;
}

.grid line {
  stroke: rgba(148, 163, 184, 0.3);
  stroke-width: 1;
}

.area {
  fill: url(#netAreaFill);
}

.line {
  fill: none;
  stroke: rgba(56, 189, 248, 0.95);
  stroke-width: 3;
}

.dot {
  fill: #f8fafc;
  stroke: rgba(56, 189, 248, 0.9);
  stroke-width: 1.5;
}

.bars {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.bar-row {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  gap: 10px;
  align-items: center;
  font-size: 12px;
}

.bar-label {
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track {
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
  background: rgba(15, 23, 42, 0.65);
}

.fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.88), rgba(56, 189, 248, 0.9));
}

.table-head {
  margin-bottom: 10px;
}

.table-wrap {
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1320px;
}

th,
td {
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  color: #e2e8f0;
}

th {
  text-align: left;
  background: rgba(15, 23, 42, 0.72);
  font-weight: 700;
}

tbody tr {
  cursor: pointer;
  transition: background 0.16s ease;
}

tbody tr.row-status-matched {
  box-shadow: inset 3px 0 0 rgba(34, 197, 94, 0.58);
}

tbody tr.row-status-carried {
  box-shadow: inset 3px 0 0 rgba(168, 85, 247, 0.62);
}

tbody tr.row-status-partial {
  box-shadow: inset 3px 0 0 rgba(245, 158, 11, 0.72);
}

tbody tr.row-status-overage {
  box-shadow: inset 3px 0 0 rgba(249, 115, 22, 0.68);
}

tbody tr.row-status-shortage {
  box-shadow: inset 3px 0 0 rgba(248, 113, 113, 0.62);
}

tbody tr:hover {
  background: rgba(56, 189, 248, 0.08);
}

.right {
  text-align: right;
}

.diff-positive {
  color: #86efac;
}

.diff-negative {
  color: #fca5a5;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 82px;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.status-matched {
  color: #bbf7d0;
  border-color: rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.18);
}

.status-overage {
  color: #fed7aa;
  border-color: rgba(249, 115, 22, 0.44);
  background: rgba(249, 115, 22, 0.2);
}

.status-carried {
  color: #e9d5ff;
  border-color: rgba(168, 85, 247, 0.46);
  background: rgba(168, 85, 247, 0.22);
}

.status-partial {
  color: #fde68a;
  border-color: rgba(245, 158, 11, 0.48);
  background: rgba(245, 158, 11, 0.2);
}

.status-shortage {
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.45);
  background: rgba(239, 68, 68, 0.2);
}

.status-unknown {
  color: #dbeafe;
  border-color: rgba(148, 163, 184, 0.4);
  background: rgba(148, 163, 184, 0.18);
}

.pager {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.btn.ghost {
  background: rgba(15, 23, 42, 0.55);
}

.btn.ghost.active {
  border-color: rgba(56, 189, 248, 0.55);
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.32);
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
  width: min(980px, 96vw);
  max-height: calc(100vh - 30px);
  overflow: auto;
  padding: 14px;
  animation: modal-in 0.18s ease;
}

.modal.wide {
  width: min(1080px, 96vw);
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.modal-head h3 {
  margin: 0;
}

.modal-head p {
  margin: 4px 0 0;
  color: rgba(203, 213, 225, 0.74);
  font-size: 12px;
}

.modal-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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

.detail-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 10px;
}

.detail-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  gap: 8px;
}

.detail-summary {
  align-content: start;
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
}

.row-item span {
  color: rgba(226, 232, 240, 0.76);
}

.row-item strong {
  color: #f8fafc;
}

.row-item.strong-line {
  border-color: rgba(56, 189, 248, 0.35);
}

.formula-box {
  border: 1px solid rgba(56, 189, 248, 0.24);
  border-radius: 10px;
  background: rgba(14, 165, 233, 0.09);
  padding: 10px;
}

.formula-box p {
  margin: 0;
  font-size: 11px;
  color: rgba(186, 230, 253, 0.9);
}

.formula-box strong {
  display: block;
  margin-top: 7px;
  color: #f8fafc;
  font-size: 12px;
  line-height: 1.45;
  word-break: break-word;
}

.detail-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.mini-stat {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.46);
  padding: 8px;
}

.mini-stat p {
  margin: 0;
  color: rgba(203, 213, 225, 0.76);
  font-size: 11px;
}

.mini-stat strong {
  display: block;
  margin-top: 6px;
  color: #f8fafc;
  font-size: 16px;
}

.detail-block {
  margin-top: 10px;
  padding: 10px;
}

.card-soft {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.42);
}

.detail-chip-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.chip-row {
  border: 1px solid rgba(56, 189, 248, 0.28);
  border-radius: 10px;
  background: rgba(14, 165, 233, 0.1);
  padding: 8px;
  display: grid;
  gap: 4px;
}

.chip-row span {
  color: rgba(186, 230, 253, 0.9);
  font-size: 11px;
}

.chip-row strong {
  color: #f8fafc;
  font-size: 13px;
}

.chip-row small {
  color: rgba(203, 213, 225, 0.76);
  font-size: 11px;
}

.detail-table-wrap {
  max-height: 290px;
}

.detail-table {
  min-width: 760px;
}

.forensics-caption {
  margin: 8px 0 0;
}

.forensics-signals {
  margin-top: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.38);
}

.forensics-head {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: #e2e8f0;
}

.forensics-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: rgba(226, 232, 240, 0.82);
  font-size: 12px;
}

.forensics-peaks-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.forensics-peaks {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.35);
}

.forensics-peaks-list {
  display: grid;
  gap: 6px;
}

.forensics-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  font-size: 12px;
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 7px 8px;
}

.expense-list {
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  overflow: hidden;
}

.expense-head,
.expense-row {
  display: grid;
  grid-template-columns: 160px 1fr 140px 120px;
  gap: 8px;
  padding: 9px 10px;
  font-size: 12px;
}

.expense-head {
  background: rgba(15, 23, 42, 0.72);
  color: rgba(226, 232, 240, 0.84);
  font-weight: 700;
}

.expense-row {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
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

@media (max-width: 1200px) {
  .story-grid {
    grid-template-columns: 1fr;
  }

  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-chip-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .forensics-peaks-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .hero {
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    justify-content: flex-start;
  }

  .bar-row {
    grid-template-columns: 1fr;
  }

  .expense-head,
  .expense-row {
    grid-template-columns: 1fr;
  }

  .detail-mini-grid,
  .detail-chip-grid {
    grid-template-columns: 1fr;
  }
}
</style>

