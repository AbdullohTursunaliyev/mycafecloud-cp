<template>
  <div class="history-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="meta-chip">
          <Icon name="lucide:calendar-range" size="14" />
          {{ selectedRangeLabel }}
        </span>
        <span class="meta-chip">
          <Icon name="lucide:clock-3" size="14" />
          {{ refreshedAtLabel }}
        </span>
      </template>

      <template #actions>
        <div class="hero-toolbar">
          <button class="toolbar-btn" :disabled="loading" @click="setQuickRange('today')">
            {{ copy.today }}
          </button>
          <button class="toolbar-btn" :disabled="loading" @click="setQuickRange('week')">
            {{ copy.week }}
          </button>
          <button class="toolbar-btn" :disabled="loading" @click="setQuickRange('month')">
            {{ copy.month }}
          </button>
          <button class="toolbar-btn" :disabled="loading || exportLoading" @click="downloadExport">
            <Icon name="lucide:download" size="15" />
            <span>{{ exportLoading ? copy.exporting : copy.export }}</span>
          </button>
          <button class="toolbar-btn toolbar-btn-primary" :disabled="loading" @click="reload()">
            <Icon name="lucide:refresh-cw" size="15" />
            <span>{{ copy.refresh }}</span>
          </button>
        </div>
      </template>
    </CpPageHero>

    <CpPanelCard :title="copy.filtersTitle" :subtitle="copy.filtersSubtitle">
      <template #actions>
        <button class="toolbar-btn" :disabled="loading" @click="resetFilters">
          {{ copy.reset }}
        </button>
        <button class="toolbar-btn toolbar-btn-primary" :disabled="loading" @click="reload(1)">
          {{ copy.apply }}
        </button>
      </template>

      <div class="filters-grid">
        <label class="field-block">
          <span>{{ copy.from }}</span>
          <div class="field-shell">
            <Icon name="lucide:calendar-days" size="15" />
            <input v-model="filters.from" type="date" class="field-input" />
          </div>
        </label>

        <label class="field-block">
          <span>{{ copy.to }}</span>
          <div class="field-shell">
            <Icon name="lucide:calendar-days" size="15" />
            <input v-model="filters.to" type="date" class="field-input" />
          </div>
        </label>

        <label class="field-block">
          <span>{{ copy.perPage }}</span>
          <div class="field-shell">
            <Icon name="lucide:list-filter" size="15" />
            <select v-model.number="filters.perPage" class="field-input select-field">
              <option v-for="size in [10, 20, 30, 50]" :key="size" :value="size">{{ size }}</option>
            </select>
          </div>
        </label>
      </div>
    </CpPanelCard>

    <p v-if="pageError" class="alert err">{{ pageError }}</p>
    <p v-if="forbidden" class="alert warn">{{ copy.forbidden }}</p>

    <div class="stats-grid">
      <CpStatCard compact tone="tone-blue" :label="copy.totalShifts" :value="String(summary.shiftsCount)" :hint="`${copy.pageNetCash}: ${money(pageNetCash)}`" />
      <CpStatCard compact tone="tone-green" :label="copy.cashIncome" :value="money(summary.cashIn)" :hint="`${copy.cardIncome}: ${money(summary.cardIn)}`" />
      <CpStatCard compact tone="tone-amber" :label="copy.expectedCash" :value="money(summary.expectedSum)" :hint="`${copy.averageClosing}: ${money(averageClosingCash)}`" />
      <CpStatCard compact tone="tone-rose" :label="copy.reconcileCoverage" :value="`${reconcileCoverage}%`" :hint="`${copy.matched}: ${summary.reconciledCount} · ${copy.unmatched}: ${summary.unreconciledCount}`" />
    </div>

    <div class="history-layout">
      <CpPanelCard :title="copy.historyTitle" :subtitle="copy.historySubtitle">
        <div v-if="rows.length" class="shift-grid">
          <article v-for="row in rows" :key="row.id" class="shift-card" :class="statusClass(reconcileStatus(row))">
            <div class="shift-card-head">
              <div>
                <p class="shift-label">#{{ row.id }}</p>
                <h3>{{ operatorName(row.operator) }}</h3>
              </div>
              <span class="status-pill" :class="statusClass(reconcileStatus(row))">
                {{ statusLabel(reconcileStatus(row)) }}
              </span>
            </div>

            <div class="shift-meta">
              <span>
                <Icon name="lucide:calendar-clock" size="14" />
                {{ formatDateTime(row.closed_at || row.ended_at || row.created_at) }}
              </span>
              <span>
                <Icon name="lucide:wallet" size="14" />
                {{ money(closingCash(row)) }}
              </span>
            </div>

            <div class="metric-pair-grid">
              <div class="metric-pair">
                <span>{{ copy.cashIncome }}</span>
                <strong>{{ money(cashIn(row)) }}</strong>
              </div>
              <div class="metric-pair">
                <span>{{ copy.cardIncome }}</span>
                <strong>{{ money(cardIn(row)) }}</strong>
              </div>
              <div class="metric-pair">
                <span>{{ copy.expenses }}</span>
                <strong>{{ money(expensesCash(row)) }}</strong>
              </div>
              <div class="metric-pair">
                <span>{{ copy.diff || 'Diff' }}</span>
                <strong :class="diffToneClass(diffValue(row))">{{ money(diffValue(row)) }}</strong>
              </div>
            </div>

            <div class="shift-foot">
              <div class="foot-chips">
                <span class="mini-chip">
                  <Icon name="lucide:receipt" size="13" />
                  {{ financeOf(row).tx_count || 0 }}
                </span>
                <span class="mini-chip">
                  <Icon name="lucide:rotate-ccw" size="13" />
                  {{ financeOf(row).returns_count || 0 }}
                </span>
                <span class="mini-chip">
                  <Icon name="lucide:receipt-text" size="13" />
                  {{ financeOf(row).expenses_count || 0 }}
                </span>
              </div>

              <button class="toolbar-btn toolbar-btn-primary compact-btn" :disabled="detailLoading" @click="openDetail(row.id)">
                <Icon name="lucide:scan-search" size="14" />
                <span>{{ copy.details }}</span>
              </button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">{{ loading ? copy.loading : copy.noRows }}</div>

        <div class="pager">
          <button class="toolbar-btn compact-btn" :disabled="loading || pagination.page <= 1" @click="reload(pagination.page - 1)">
            {{ copy.prev }}
          </button>
          <span class="page-chip">{{ pagination.page }}/{{ totalPages }}</span>
          <button class="toolbar-btn compact-btn" :disabled="loading || pagination.page >= totalPages" @click="reload(pagination.page + 1)">
            {{ copy.next }}
          </button>
        </div>
      </CpPanelCard>

      <div class="side-stack">
        <CpPanelCard :title="copy.insightsTitle" :subtitle="copy.insightsSubtitle">
          <div class="insight-list">
            <article class="insight-card">
              <span>{{ copy.bestShift }}</span>
              <strong>{{ bestShift ? `#${bestShift.id}` : '-' }}</strong>
              <small>{{ bestShift ? money(closingCash(bestShift)) : copy.notAvailable }}</small>
            </article>
            <article class="insight-card">
              <span>{{ copy.worstShift }}</span>
              <strong>{{ worstShift ? `#${worstShift.id}` : '-' }}</strong>
              <small>{{ worstShift ? money(closingCash(worstShift)) : copy.notAvailable }}</small>
            </article>
          </div>

          <div class="forensic-list">
            <p v-for="line in summaryNarrative" :key="line">{{ line }}</p>
          </div>
        </CpPanelCard>

        <CpPanelCard :title="copy.integrityTitle" :subtitle="copy.integritySubtitle">
          <div class="integrity-stack">
            <div class="integrity-bar">
              <div class="integrity-fill" :style="{ width: `${reconcileCoverage}%` }"></div>
            </div>
            <div class="metric-pair-grid single-column">
              <div class="metric-pair">
                <span>{{ copy.overage }}</span>
                <strong class="good">{{ money(summary.diffOverageSum) }}</strong>
              </div>
              <div class="metric-pair">
                <span>{{ copy.shortage }}</span>
                <strong class="bad">{{ money(summary.diffShortageSum) }}</strong>
              </div>
              <div class="metric-pair">
                <span>{{ copy.returns }}</span>
                <strong>{{ money(summary.returnsTotal) }}</strong>
              </div>
              <div class="metric-pair">
                <span>{{ copy.closingCash }}</span>
                <strong>{{ money(summary.closingSum) }}</strong>
              </div>
            </div>
          </div>
        </CpPanelCard>
      </div>
    </div>

    <div v-if="detail.open" class="overlay" @click.self="closeDetail">
      <div class="dialog dialog-wide">
        <div class="dialog-head">
          <div>
            <span class="dialog-eyebrow">{{ copy.detailEyebrow }}</span>
            <h3>{{ copy.detailTitle }} #{{ detail.shift?.id || '' }}</h3>
            <p>{{ operatorName(detail.shift?.operator) }} · {{ formatDateTime(detail.shift?.closed_at || detail.shift?.ended_at || detail.shift?.created_at) }}</p>
          </div>
          <button class="dialog-close" type="button" @click="closeDetail">
            <Icon name="lucide:x" size="16" />
          </button>
        </div>

        <div v-if="detailLoading" class="empty-state">{{ copy.loading }}</div>
        <p v-else-if="detailError" class="alert err">{{ detailError }}</p>
        <template v-else>
          <div class="detail-grid">
            <div class="detail-card">
              <span>{{ copy.expectedCash }}</span>
              <strong>{{ money(detailFinance.expected_cash) }}</strong>
            </div>
            <div class="detail-card">
              <span>{{ copy.closingCash }}</span>
              <strong>{{ money(detailFinance.closing_cash) }}</strong>
            </div>
            <div class="detail-card">
              <span>{{ copy.diff || 'Diff' }}</span>
              <strong :class="diffToneClass(detailFinance.diff)">{{ money(detailFinance.diff) }}</strong>
            </div>
            <div class="detail-card">
              <span>{{ copy.status }}</span>
              <strong>{{ statusLabel(detailReconcileStatus) }}</strong>
            </div>
          </div>

          <div class="detail-sections">
            <CpPanelCard :title="copy.auditTitle" :subtitle="copy.auditSubtitle">
              <div class="metric-pair-grid single-column">
                <div class="metric-pair">
                  <span>{{ copy.openingCash }}</span>
                  <strong>{{ money(detailFinance.opening_cash) }}</strong>
                </div>
                <div class="metric-pair">
                  <span>{{ copy.cashIncome }}</span>
                  <strong>{{ money(detailFinance.cash_in) }}</strong>
                </div>
                <div class="metric-pair">
                  <span>{{ copy.cardIncome }}</span>
                  <strong>{{ money(detailFinance.card_in) }}</strong>
                </div>
                <div class="metric-pair">
                  <span>{{ copy.expenses }}</span>
                  <strong>{{ money(detailFinance.expenses_cash) }}</strong>
                </div>
                <div class="metric-pair">
                  <span>{{ copy.returns }}</span>
                  <strong>{{ money(detailFinance.returns_total) }}</strong>
                </div>
                <div class="metric-pair">
                  <span>{{ copy.pageNetCash }}</span>
                  <strong>{{ money(detailFinance.net_cash) }}</strong>
                </div>
              </div>
            </CpPanelCard>

            <CpPanelCard :title="copy.forensicsTitle" :subtitle="copy.forensicsSubtitle">
              <ul class="signal-list">
                <li v-for="line in forensicSummary" :key="line">{{ line }}</li>
              </ul>
            </CpPanelCard>
          </div>

          <div class="detail-sections">
            <CpPanelCard :title="copy.transactionsTitle" :subtitle="copy.transactionsSubtitle">
              <div v-if="detail.transactions.length" class="ledger-list">
                <article v-for="item in detail.transactions.slice(0, 10)" :key="item.id" class="ledger-item">
                  <div>
                    <strong>{{ txTypeLabel(item.type) }}</strong>
                    <p>{{ clientLabel(item.client) }} · {{ paymentLabel(item.payment_method) }}</p>
                  </div>
                  <strong>{{ money(item.amount || item.total || 0) }}</strong>
                </article>
              </div>
              <div v-else class="empty-state compact">{{ copy.noTransactions }}</div>
            </CpPanelCard>

            <CpPanelCard :title="copy.expensePeaksTitle" :subtitle="copy.expensePeaksSubtitle">
              <div v-if="topExpensePeaks.length" class="ledger-list">
                <article v-for="item in topExpensePeaks" :key="`${item.category}-${item.amount}`" class="ledger-item">
                  <div>
                    <strong>{{ item.category || copy.other }}</strong>
                    <p>{{ item.count || 0 }} {{ copy.operations }}</p>
                  </div>
                  <strong>{{ money(item.amount) }}</strong>
                </article>
              </div>
              <div v-else class="empty-state compact">{{ copy.noExpenses }}</div>
            </CpPanelCard>

            <CpPanelCard :title="copy.returnPeaksTitle" :subtitle="copy.returnPeaksSubtitle">
              <div v-if="topCashReturnPeaks.length" class="ledger-list">
                <article v-for="item in topCashReturnPeaks" :key="`${item.method}-${item.amount}`" class="ledger-item">
                  <div>
                    <strong>{{ paymentLabel(item.method) }}</strong>
                    <p>{{ item.count || 0 }} {{ copy.operations }}</p>
                  </div>
                  <strong>{{ money(item.amount) }}</strong>
                </article>
              </div>
              <div v-else class="empty-state compact">{{ copy.noReturns }}</div>
            </CpPanelCard>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { cpApi } from '@legacy/api/cp'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'

definePageMeta({
  layout: 'cp',
  roles: ['admin', 'owner'],
})

const copy = useCpCopy({
  uz: {
    eyebrow: 'History & export',
    title: 'Smena tarixi',
    subtitle: "Yopilgan smenalarni tez tekshirish, solishtirish va eksport qilish uchun ixcham ekran.",
    today: 'Bugun',
    week: '7 kun',
    month: '30 kun',
    export: 'Excel yuklash',
    exporting: 'Yuklanmoqda...',
    refresh: 'Yangilash',
    filtersTitle: 'Filtrlar',
    filtersSubtitle: 'Davr va sahifa hajmini boshqaring.',
    reset: 'Tozalash',
    apply: 'Qo‘llash',
    from: 'Dan',
    to: 'Gacha',
    perPage: 'Sahifada',
    forbidden: 'Bu sahifani ko‘rish uchun ruxsat yetarli emas.',
    totalShifts: 'Smenalar',
    pageNetCash: 'Sahifa net cash',
    cashIncome: 'Naqd tushum',
    cardIncome: 'Karta tushum',
    expectedCash: 'Kutilgan kassa',
    averageClosing: 'O‘rtacha yopilish',
    reconcileCoverage: 'Moslik qamrovi',
    matched: 'Mos',
    unmatched: 'Mos emas',
    historyTitle: 'Yopilgan smenalar',
    historySubtitle: 'Har bir smenani audit ko‘zi bilan ko‘ring.',
    details: 'Tafsilot',
    loading: 'Yuklanmoqda...',
    noRows: 'Tanlangan davrda smena topilmadi.',
    prev: 'Oldingi',
    next: 'Keyingi',
    insightsTitle: 'Tez xulosa',
    insightsSubtitle: 'Smena holatini birdan o‘qing.',
    bestShift: 'Eng yaxshi smena',
    worstShift: 'Eng past smena',
    notAvailable: 'Maʼlumot yo‘q',
    integrityTitle: 'Sverka nazorati',
    integritySubtitle: 'Kamomad va ortiqcha bo‘yicha snapshot.',
    overage: 'Ortiqcha',
    shortage: 'Kamomad',
    returns: 'Qaytarishlar',
    closingCash: 'Yopilish kassasi',
    detailEyebrow: 'Audit',
    detailTitle: 'Smena tafsiloti',
    status: 'Holat',
    auditTitle: 'Moliyaviy yadrosi',
    auditSubtitle: 'Asosiy kassaviy ko‘rsatkichlar.',
    forensicsTitle: 'Forensik xulosa',
    forensicsSubtitle: 'Risk va signal nuqtalari.',
    transactionsTitle: 'Tranzaksiyalar',
    transactionsSubtitle: 'So‘nggi operatsiyalar.',
    expensePeaksTitle: 'Xarajat cho‘qqilari',
    expensePeaksSubtitle: 'Kategoriya bo‘yicha bosim.',
    returnPeaksTitle: 'Qaytarish bosimi',
    returnPeaksSubtitle: 'Method kesimida qaytarishlar.',
    noTransactions: 'Tranzaksiya topilmadi.',
    noExpenses: 'Xarajat topilmadi.',
    noReturns: 'Qaytarish topilmadi.',
    operations: 'operatsiya',
    other: 'Boshqa',
    statusMatched: 'Mos',
    statusCarried: 'Keyingi smenaga o‘tgan',
    statusPartial: 'Qisman yopilgan',
    statusOverage: 'Ortiqcha',
    statusShortage: 'Kamomad',
    cash: 'Naqd',
    card: 'Karta',
    balance: 'Balans',
    txTopup: 'Top-up',
    txPackage: 'Paket',
    txSubscription: 'Obuna',
    txOther: 'Boshqa',
    openingCash: 'Boshlang‘ich naqd',
    expenses: 'Xarajatlar',
  },
  ru: {
    eyebrow: 'History & export',
    title: 'История смен',
    subtitle: 'Компактный экран для быстрой проверки, сверки и экспорта закрытых смен.',
    today: 'Сегодня',
    week: '7 дней',
    month: '30 дней',
    export: 'Скачать Excel',
    exporting: 'Загрузка...',
    refresh: 'Обновить',
    filtersTitle: 'Фильтры',
    filtersSubtitle: 'Управляйте периодом и размером страницы.',
    reset: 'Сброс',
    apply: 'Применить',
    from: 'От',
    to: 'До',
    perPage: 'На странице',
    forbidden: 'Недостаточно прав для просмотра истории смен.',
    totalShifts: 'Смены',
    pageNetCash: 'Net cash страницы',
    cashIncome: 'Наличный приход',
    cardIncome: 'Карточный приход',
    expectedCash: 'Ожидаемая касса',
    averageClosing: 'Среднее закрытие',
    reconcileCoverage: 'Покрытие сверки',
    matched: 'Сошлось',
    unmatched: 'Не сошлось',
    historyTitle: 'Закрытые смены',
    historySubtitle: 'Смотрите каждую смену как короткий аудит.',
    details: 'Детали',
    loading: 'Загрузка...',
    noRows: 'За выбранный период смены не найдены.',
    prev: 'Назад',
    next: 'Далее',
    insightsTitle: 'Быстрые выводы',
    insightsSubtitle: 'Короткий срез по текущей выборке.',
    bestShift: 'Лучшая смена',
    worstShift: 'Худшая смена',
    notAvailable: 'Нет данных',
    integrityTitle: 'Контроль сверки',
    integritySubtitle: 'Снимок по расхождениям и возвратам.',
    overage: 'Излишек',
    shortage: 'Недостача',
    returns: 'Возвраты',
    closingCash: 'Касса закрытия',
    detailEyebrow: 'Аудит',
    detailTitle: 'Детали смены',
    status: 'Статус',
    auditTitle: 'Финансовое ядро',
    auditSubtitle: 'Ключевые кассовые метрики.',
    forensicsTitle: 'Форензика',
    forensicsSubtitle: 'Сигналы и риск-точки.',
    transactionsTitle: 'Транзакции',
    transactionsSubtitle: 'Последние операции смены.',
    expensePeaksTitle: 'Пики расходов',
    expensePeaksSubtitle: 'Давление по категориям.',
    returnPeaksTitle: 'Пики возвратов',
    returnPeaksSubtitle: 'Возвраты по методам оплаты.',
    noTransactions: 'Транзакции не найдены.',
    noExpenses: 'Расходы не найдены.',
    noReturns: 'Возвраты не найдены.',
    operations: 'операций',
    other: 'Другое',
    statusMatched: 'Сошлось',
    statusCarried: 'Перенесено дальше',
    statusPartial: 'Частично закрыто',
    statusOverage: 'Излишек',
    statusShortage: 'Недостача',
    cash: 'Наличные',
    card: 'Карта',
    balance: 'Баланс',
    txTopup: 'Пополнение',
    txPackage: 'Пакет',
    txSubscription: 'Подписка',
    txOther: 'Другое',
    openingCash: 'Стартовая наличность',
    expenses: 'Расходы',
  },
  en: {
    eyebrow: 'History & export',
    title: 'Shift history',
    subtitle: 'A compact screen for checking, reconciling, and exporting closed shifts.',
    today: 'Today',
    week: '7 days',
    month: '30 days',
    export: 'Export Excel',
    exporting: 'Loading...',
    refresh: 'Refresh',
    filtersTitle: 'Filters',
    filtersSubtitle: 'Manage the date range and page size.',
    reset: 'Reset',
    apply: 'Apply',
    from: 'From',
    to: 'To',
    perPage: 'Per page',
    forbidden: 'You do not have enough permission to view shift history.',
    totalShifts: 'Shifts',
    pageNetCash: 'Page net cash',
    cashIncome: 'Cash income',
    cardIncome: 'Card income',
    expectedCash: 'Expected cash',
    averageClosing: 'Average closing',
    reconcileCoverage: 'Reconcile coverage',
    matched: 'Matched',
    unmatched: 'Unmatched',
    historyTitle: 'Closed shifts',
    historySubtitle: 'Review each shift as a short audit card.',
    details: 'Details',
    loading: 'Loading...',
    noRows: 'No shifts were found for this range.',
    prev: 'Prev',
    next: 'Next',
    insightsTitle: 'Quick insights',
    insightsSubtitle: 'A fast read of the current slice.',
    bestShift: 'Best shift',
    worstShift: 'Worst shift',
    notAvailable: 'No data',
    integrityTitle: 'Reconcile control',
    integritySubtitle: 'Snapshot of differences and returns.',
    overage: 'Overage',
    shortage: 'Shortage',
    returns: 'Returns',
    closingCash: 'Closing cash',
    detailEyebrow: 'Audit',
    detailTitle: 'Shift detail',
    status: 'Status',
    auditTitle: 'Finance core',
    auditSubtitle: 'Primary cash metrics.',
    forensicsTitle: 'Forensics',
    forensicsSubtitle: 'Signals and risk points.',
    transactionsTitle: 'Transactions',
    transactionsSubtitle: 'Recent operations in the shift.',
    expensePeaksTitle: 'Expense peaks',
    expensePeaksSubtitle: 'Pressure by category.',
    returnPeaksTitle: 'Return peaks',
    returnPeaksSubtitle: 'Returns by payment method.',
    noTransactions: 'No transactions found.',
    noExpenses: 'No expenses found.',
    noReturns: 'No returns found.',
    operations: 'operations',
    other: 'Other',
    statusMatched: 'Matched',
    statusCarried: 'Carried',
    statusPartial: 'Partially closed',
    statusOverage: 'Overage',
    statusShortage: 'Shortage',
    cash: 'Cash',
    card: 'Card',
    balance: 'Balance',
    txTopup: 'Top-up',
    txPackage: 'Package',
    txSubscription: 'Subscription',
    txOther: 'Other',
    openingCash: 'Opening cash',
    expenses: 'Expenses',
  },
})

const { formatMoney, formatDateTime } = useCpFormatters()

const filters = reactive({ from: '', to: '', perPage: 10 })
const pagination = reactive({ page: 1, perPage: 10, total: 0 })
const loading = ref(false)
const exportLoading = ref(false)
const forbidden = ref(false)
const pageError = ref('')
const refreshedAt = ref(null)
const rows = ref([])

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
  shift: null,
  finance: {},
  transactions: [],
  returns: [],
  expenses: [],
  expensesByCategory: [],
})

const detailLoading = ref(false)
const detailError = ref('')

function toNum(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function money(value) {
  return formatMoney(toNum(value))
}

function dayString(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function setQuickRange(kind) {
  const end = new Date()
  const start = new Date(end)
  if (kind === 'week') start.setDate(start.getDate() - 6)
  if (kind === 'month') start.setDate(start.getDate() - 29)
  filters.from = dayString(start)
  filters.to = dayString(end)
  reload(1)
}

function resetFilters() {
  filters.from = ''
  filters.to = ''
  filters.perPage = 10
  reload(1)
}

function extractError(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function parseFilename(disposition) {
  if (!disposition) return ''
  const utf = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf?.[1]) return decodeURIComponent(utf[1])
  const plain = disposition.match(/filename="?([^"]+)"?/i)
  return plain?.[1] || ''
}

function normalizeFinance(raw = {}, fallback = {}) {
  const openingCash = toNum(raw.opening_cash ?? fallback.opening_cash)
  const cashIn = toNum(raw.cash_in ?? raw.cash_income ?? fallback.cash_in)
  const cardIn = toNum(raw.card_in ?? raw.card_income ?? fallback.card_in)
  const returnsCash = toNum(raw.returns_cash ?? fallback.returns_cash)
  const returnsCard = toNum(raw.returns_card ?? fallback.returns_card)
  const returnsBalance = toNum(raw.returns_balance ?? fallback.returns_balance)
  const returnsTotal = toNum(raw.returns_total ?? (returnsCash + returnsCard + returnsBalance))
  const expensesCash = toNum(raw.expenses_cash ?? raw.cash_out ?? fallback.expenses_cash)
  const closingCash = toNum(raw.closing_cash ?? raw.actual_cash ?? fallback.closing_cash)
  const expectedCash = toNum(raw.expected_cash ?? (openingCash + cashIn - returnsCash - expensesCash))
  const rawDiff = toNum(raw.raw_diff ?? raw.diff)
  const diff = rawDiff || toNum(closingCash - expectedCash)
  return {
    opening_cash: openingCash,
    cash_in: cashIn,
    card_in: cardIn,
    gross_in: toNum(raw.gross_in ?? (cashIn + cardIn)),
    returns_cash: returnsCash,
    returns_card: returnsCard,
    returns_balance: returnsBalance,
    returns_total: returnsTotal,
    expenses_cash: expensesCash,
    expected_cash: expectedCash,
    closing_cash: closingCash,
    raw_diff: rawDiff,
    diff,
    carry_to_next_opening: toNum(raw.carry_to_next_opening),
    shortage_carried_to_next: toNum(raw.shortage_carried_to_next),
    shortage_partially_carried_to_next: toNum(raw.shortage_partially_carried_to_next),
    shortage_unresolved: toNum(raw.shortage_unresolved),
    next_shift_id: raw.next_shift_id || null,
    net_cash: toNum(raw.net_cash ?? (cashIn - expensesCash - returnsCash)),
    tx_count: toNum(raw.tx_count ?? raw.transactions_count),
    returns_count: toNum(raw.returns_count),
    expenses_count: toNum(raw.expenses_count),
  }
}

function financeOf(row) {
  return normalizeFinance(row?.finance || {}, row || {})
}

const cashIn = (row) => financeOf(row).cash_in
const cardIn = (row) => financeOf(row).card_in
const expensesCash = (row) => financeOf(row).expenses_cash
const closingCash = (row) => financeOf(row).closing_cash
const diffValue = (row) => financeOf(row).diff
const netCash = (row) => financeOf(row).net_cash

function operatorName(operator) {
  if (!operator) return '-'
  return operator.name || operator.login || operator.username || `#${operator.id || '-'}`
}

function clientLabel(client) {
  if (!client) return '-'
  return client.login || client.phone || client.account_id || `#${client.id || client.client_id || '-'}`
}

function paymentLabel(value) {
  if (value === 'cash') return copy.value.cash
  if (value === 'card') return copy.value.card
  if (value === 'balance') return copy.value.balance
  return value || '-'
}

function txTypeLabel(value) {
  if (value === 'topup') return copy.value.txTopup
  if (value === 'package') return copy.value.txPackage
  if (value === 'subscription') return copy.value.txSubscription
  return copy.value.txOther
}

function reconcileStatus(row) {
  const explicit = row?.reconcile_status
  if (['matched', 'carried', 'partial', 'overage', 'shortage'].includes(explicit)) return explicit
  const finance = financeOf(row)
  if (finance.shortage_carried_to_next > 0) return 'carried'
  if (finance.shortage_partially_carried_to_next > 0) return 'partial'
  if (finance.diff === 0) return 'matched'
  if (finance.diff > 0) return 'overage'
  return 'shortage'
}

function statusLabel(status) {
  const map = {
    matched: copy.value.statusMatched,
    carried: copy.value.statusCarried,
    partial: copy.value.statusPartial,
    overage: copy.value.statusOverage,
    shortage: copy.value.statusShortage,
  }
  return map[status] || copy.value.statusMatched
}

function statusClass(status) {
  return `status-${status || 'matched'}`
}

function diffToneClass(value) {
  if (toNum(value) > 0) return 'good'
  if (toNum(value) < 0) return 'bad'
  return ''
}

function applySummary(raw = {}) {
  summary.shiftsCount = toNum(raw.shifts_count ?? raw.count)
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

const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || rows.value.length || 1) / (pagination.perPage || 1))))
const refreshedAtLabel = computed(() => refreshedAt.value ? formatDateTime(refreshedAt.value) : copy.value.notAvailable)
const selectedRangeLabel = computed(() => `${filters.from || '...'} - ${filters.to || '...'}`)
const pageNetCash = computed(() => rows.value.reduce((sum, row) => sum + netCash(row), 0))
const averageClosingCash = computed(() => summary.closingAvg || (rows.value.length ? rows.value.reduce((sum, row) => sum + closingCash(row), 0) / rows.value.length : 0))
const bestShift = computed(() => rows.value.slice().sort((a, b) => closingCash(b) - closingCash(a))[0] || null)
const worstShift = computed(() => rows.value.slice().sort((a, b) => closingCash(a) - closingCash(b))[0] || null)
const reconcileCoverage = computed(() => {
  const total = summary.reconciledCount + summary.unreconciledCount
  if (!total) return 0
  return Math.round((summary.reconciledCount / total) * 100)
})
const summaryNarrative = computed(() => {
  const lines = []
  if (bestShift.value) lines.push(`${copy.value.bestShift}: #${bestShift.value.id} · ${money(closingCash(bestShift.value))}`)
  if (worstShift.value) lines.push(`${copy.value.worstShift}: #${worstShift.value.id} · ${money(closingCash(worstShift.value))}`)
  lines.push(`${copy.value.returns}: ${money(summary.returnsTotal)}`)
  lines.push(`${copy.value.overage}: ${money(summary.diffOverageSum)} · ${copy.value.shortage}: ${money(summary.diffShortageSum)}`)
  return lines
})

const detailFinance = computed(() => normalizeFinance(detail.finance, detail.shift || {}))
const detailReconcileStatus = computed(() => reconcileStatus({ ...detail.shift, finance: detailFinance.value }))
const topExpensePeaks = computed(() => (detail.expensesByCategory || []).slice().sort((a, b) => toNum(b.amount) - toNum(a.amount)).slice(0, 5))
const topCashReturnPeaks = computed(() => {
  const grouped = new Map()
  ;(detail.returns || []).forEach((item) => {
    const key = item.payment_method || 'cash'
    const current = grouped.get(key) || { method: key, amount: 0, count: 0 }
    current.amount += toNum(item.amount)
    current.count += 1
    grouped.set(key, current)
  })
  return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount).slice(0, 5)
})
const forensicSummary = computed(() => {
  const finance = detailFinance.value
  const lines = []
  const absDiff = Math.abs(finance.diff)
  const expenseRatio = finance.cash_in ? Math.round((Math.abs(finance.expenses_cash) / finance.cash_in) * 100) : 0
  const returnRatio = finance.cash_in ? Math.round((Math.abs(finance.returns_cash) / finance.cash_in) * 100) : 0
  if (finance.shortage_carried_to_next > 0) lines.push(`${copy.value.shortage}: ${money(finance.shortage_carried_to_next)} -> next shift`)
  if (finance.shortage_partially_carried_to_next > 0) lines.push(`Partial carry: ${money(finance.shortage_partially_carried_to_next)}`)
  if (finance.diff < 0) lines.push(`${copy.value.shortage}: ${money(absDiff)}`)
  if (finance.diff > 0) lines.push(`${copy.value.overage}: ${money(absDiff)}`)
  if (expenseRatio >= 35) lines.push(`${copy.value.expenses}: ${expenseRatio}% of cash income`)
  if (returnRatio >= 20) lines.push(`${copy.value.returns}: ${returnRatio}% of cash income`)
  if (finance.tx_count >= 80) lines.push(`${finance.tx_count} high-volume operations in one shift`)
  if (!lines.length) lines.push('No abnormal signals detected for this shift.')
  return lines
})

async function reload(page = pagination.page) {
  loading.value = true
  pageError.value = ''
  forbidden.value = false
  try {
    const response = await cpApi.shiftHistory({
      page,
      per_page: filters.perPage,
      from: filters.from || undefined,
      to: filters.to || undefined,
    })
    const payload = response?.data?.data || response?.data || {}
    rows.value = payload.items || []
    pagination.page = toNum(payload.pagination?.page || page) || 1
    pagination.perPage = toNum(payload.pagination?.per_page || filters.perPage) || filters.perPage
    pagination.total = toNum(payload.pagination?.total || rows.value.length)
    applySummary(payload.summary || {})
    refreshedAt.value = new Date()
  } catch (error) {
    if (error?.response?.status === 403) forbidden.value = true
    pageError.value = extractError(error, 'Failed to load shift history.')
  } finally {
    loading.value = false
  }
}

async function openDetail(id) {
  detail.open = true
  detail.shift = rows.value.find((row) => row.id === id) || null
  detail.finance = {}
  detail.transactions = []
  detail.returns = []
  detail.expenses = []
  detail.expensesByCategory = []
  detailError.value = ''
  detailLoading.value = true
  try {
    const response = await cpApi.shiftHistoryDetail(id)
    const payload = response?.data?.data || response?.data || {}
    detail.shift = payload.shift || detail.shift
    detail.finance = payload.finance || {}
    detail.transactions = payload.transactions || []
    detail.returns = payload.returns || []
    detail.expenses = payload.expenses || []
    detail.expensesByCategory = payload.expenses_by_category || []
  } catch (error) {
    detailError.value = extractError(error, 'Failed to load shift detail.')
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detail.open = false
}

async function downloadExport() {
  exportLoading.value = true
  pageError.value = ''
  try {
    const params = {
      limit: 2000,
      from: filters.from || undefined,
      to: filters.to || undefined,
    }
    let response
    try {
      response = await cpApi.shiftHistoryExportXlsx(params)
    } catch {
      response = await cpApi.shiftHistoryExport(params)
    }
    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' })
    const filename = parseFilename(response.headers['content-disposition']) || `shift-history-${Date.now()}.xlsx`
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    pageError.value = extractError(error, 'Failed to export shift history.')
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  setQuickRange('month')
})
</script>

<style scoped>
.history-page {
  display: grid;
  gap: 20px;
}

.hero-toolbar {
  display: grid;
  grid-auto-flow: column;
  gap: 8px;
  align-items: center;
}

.meta-chip,
.mini-chip,
.page-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  font-size: 12px;
  color: var(--text-muted);
}

.filters-grid,
.stats-grid,
.history-layout,
.detail-sections {
  display: grid;
}

.filters-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.field-block {
  display: grid;
  gap: 8px;
}

.field-block > span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.field-shell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
}

.field-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font: inherit;
}

.select-field {
  appearance: none;
}

.stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.history-layout {
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 18px;
  align-items: start;
}

.shift-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.shift-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, var(--surface-soft), transparent), var(--surface);
}

.shift-card-head,
.shift-meta,
.shift-foot,
.foot-chips,
.pager {
  display: flex;
  align-items: center;
}

.shift-card-head,
.shift-foot,
.pager {
  justify-content: space-between;
}

.shift-label {
  margin: 0 0 6px;
  font-size: 11px;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.shift-card h3 {
  margin: 0;
  font-size: 20px;
}

.shift-meta,
.foot-chips {
  flex-wrap: wrap;
  gap: 8px;
}

.shift-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.metric-pair-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-pair-grid.single-column {
  grid-template-columns: 1fr;
}

.metric-pair {
  display: grid;
  gap: 6px;
  padding: 12px 13px;
  border-radius: 16px;
  background: var(--surface-soft);
  border: 1px solid var(--stroke);
}

.metric-pair span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.metric-pair strong {
  font-size: 18px;
}

.status-pill {
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.status-matched {
  border-color: rgba(52, 211, 153, 0.25);
}

.status-matched .status-pill {
  color: var(--success);
  border-color: rgba(52, 211, 153, 0.32);
}

.status-carried,
.status-partial {
  border-color: rgba(245, 158, 11, 0.25);
}

.status-carried .status-pill,
.status-partial .status-pill {
  color: var(--accent);
  border-color: rgba(245, 158, 11, 0.32);
}

.status-overage {
  border-color: rgba(79, 140, 255, 0.25);
}

.status-overage .status-pill {
  color: var(--brand-secondary);
  border-color: rgba(79, 140, 255, 0.32);
}

.status-shortage {
  border-color: rgba(251, 113, 133, 0.28);
}

.status-shortage .status-pill {
  color: var(--danger);
  border-color: rgba(251, 113, 133, 0.32);
}

.side-stack,
.insight-list,
.integrity-stack,
.ledger-list,
.signal-list,
.forensic-list {
  display: grid;
  gap: 12px;
}

.insight-card,
.detail-card,
.ledger-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.insight-card,
.detail-card {
  flex-direction: column;
  align-items: flex-start;
}

.insight-card span,
.detail-card span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.insight-card strong,
.detail-card strong {
  font-size: 22px;
}

.forensic-list p,
.signal-list li {
  margin: 0;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.integrity-bar {
  overflow: hidden;
  height: 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.integrity-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--brand-secondary), var(--brand));
}

.ledger-item p {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.pager {
  gap: 10px;
  margin-top: 18px;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  font: inherit;
}

.toolbar-btn-primary {
  border-color: rgba(79, 140, 255, 0.3);
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.22), rgba(79, 209, 197, 0.18));
}

.compact-btn {
  min-height: 38px;
  padding: 0 12px;
  font-size: 13px;
}

.alert {
  margin: 0;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 13px;
}

.alert.err {
  border: 1px solid rgba(251, 113, 133, 0.28);
  background: rgba(251, 113, 133, 0.08);
  color: var(--danger);
}

.alert.warn {
  border: 1px solid rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.08);
  color: var(--accent);
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 180px;
  border-radius: 18px;
  border: 1px dashed var(--stroke);
  color: var(--text-muted);
}

.empty-state.compact {
  min-height: 110px;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(3, 10, 20, 0.48);
  backdrop-filter: blur(12px);
}

.dialog {
  width: min(980px, 100%);
  max-height: calc(100vh - 44px);
  overflow: auto;
  border-radius: 26px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  box-shadow: var(--shadow-panel);
}

.dialog-wide {
  width: min(1120px, 100%);
}

.dialog-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 22px 18px;
  border-bottom: 1px solid var(--stroke);
}

.dialog-head h3 {
  margin: 8px 0 0;
  font-size: 28px;
}

.dialog-head p {
  margin: 10px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.dialog-eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--brand);
}

.dialog-close {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
}

.detail-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 20px 22px 0;
}

.detail-grid .detail-card {
  min-width: 180px;
  flex: 1 1 0;
}

.detail-sections {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 20px 22px 0;
}

.good {
  color: var(--success);
}

.bad {
  color: var(--danger);
}

@media (max-width: 1100px) {
  .history-layout,
  .detail-sections,
  .stats-grid,
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .hero-toolbar {
    grid-auto-flow: row;
  }
}

@media (max-width: 720px) {
  .shift-grid,
  .metric-pair-grid {
    grid-template-columns: 1fr;
  }

  .shift-card-head,
  .shift-foot,
  .ledger-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
