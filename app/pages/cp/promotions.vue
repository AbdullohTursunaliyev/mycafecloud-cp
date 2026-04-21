<template>
  <div class="promotions-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="hero-meta-badge">{{ copy.updatedAt }}: {{ updatedAtLabel }}</span>
        <span class="hero-meta-badge">{{ copy.totalRows }}: {{ total }}</span>
      </template>
      <template #actions>
        <div class="hero-tools">
          <button class="ghost-btn" type="button" :disabled="loading.list" @click="reload">
            <Icon name="lucide:refresh-cw" size="15" />
            <span>{{ loading.list ? copy.refreshing : copy.refresh }}</span>
          </button>
          <button class="primary-btn" type="button" :disabled="!canAccess" @click="openCreate">
            <Icon name="lucide:plus" size="15" />
            <span>{{ copy.add }}</span>
          </button>
        </div>
      </template>
    </CpPageHero>

    <div v-if="!canAccess" class="guard-card">
      <Icon name="lucide:shield-off" size="18" />
      <div>
        <strong>{{ copy.noAccessTitle }}</strong>
        <p>{{ copy.noAccessSubtitle }}</p>
      </div>
    </div>

    <template v-else>
      <div class="stats-grid">
        <CpStatCard compact tone="tone-blue" :label="copy.totalRows" :value="String(total)" :hint="`${copy.page} ${page}/${pages}`" />
        <CpStatCard compact tone="tone-green" :label="copy.activeRows" :value="String(activeCount)" :hint="copy.activeHint" />
        <CpStatCard compact tone="tone-amber" :label="copy.inactiveRows" :value="String(inactiveCount)" :hint="copy.inactiveHint" />
      </div>

      <div class="top-grid">
        <CpPanelCard :title="copy.filtersTitle" :subtitle="copy.filtersSubtitle">
          <div class="filter-grid">
            <label class="field field-span-2">
              <span>{{ copy.searchLabel }}</span>
              <input v-model.trim="filters.q" :placeholder="copy.searchPlaceholder" @keydown.enter="applyFilters" />
            </label>
            <label class="field">
              <span>{{ copy.statusLabel }}</span>
              <select v-model="filters.active">
                <option value="">{{ copy.statusAll }}</option>
                <option value="true">{{ copy.statusActive }}</option>
                <option value="false">{{ copy.statusInactive }}</option>
              </select>
            </label>
            <label class="field">
              <span>{{ copy.perPageLabel }}</span>
              <select v-model.number="filters.per_page">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
            </label>
          </div>

          <div class="filters-actions">
            <button class="ghost-btn" type="button" :disabled="loading.list" @click="resetFilters">{{ copy.reset }}</button>
            <button class="primary-btn" type="button" :disabled="loading.list" @click="applyFilters">{{ copy.apply }}</button>
          </div>
        </CpPanelCard>

        <CpPanelCard :title="copy.rulesTitle" :subtitle="copy.rulesSubtitle">
          <div class="rule-stack">
            <article class="rule-card">
              <div class="rule-icon">
                <Icon name="lucide:badge-percent" size="16" />
              </div>
              <div>
                <strong>{{ copy.rulePrimaryTitle }}</strong>
                <p>{{ copy.rulePrimaryBody }}</p>
              </div>
            </article>
            <article class="rule-card">
              <div class="rule-icon tone-soft">
                <Icon name="lucide:calendar-range" size="16" />
              </div>
              <div>
                <strong>{{ copy.ruleSecondaryTitle }}</strong>
                <p>{{ copy.ruleSecondaryBody }}</p>
              </div>
            </article>
          </div>
        </CpPanelCard>
      </div>

      <CpPanelCard :title="copy.listTitle" :subtitle="copy.listSubtitle">
        <div v-if="loading.list" class="state-box">
          <div class="skeleton-grid"><span v-for="i in 4" :key="i" class="skeleton-card" /></div>
        </div>
        <div v-else-if="!filteredItems.length" class="state-box">{{ copy.empty }}</div>
        <div v-else class="promo-list">
          <article v-for="promo in filteredItems" :key="promo.id" class="promo-card">
            <div class="promo-top">
              <div class="promo-title-wrap">
                <div class="promo-icon">
                  <Icon name="lucide:sparkles" size="16" />
                </div>
                <div>
                  <strong>{{ promo.name }}</strong>
                  <small>{{ copy.typeLabel }}: {{ normalizeType(promo.type) }}</small>
                </div>
              </div>

              <div class="promo-badges">
                <span class="mini-pill">{{ copy.priorityLabel }} {{ promo.priority ?? 100 }}</span>
                <span class="mini-pill" :class="promo.is_active ? 'ok' : 'muted'">
                  {{ promo.is_active ? copy.statusActive : copy.statusInactive }}
                </span>
              </div>
            </div>

            <div class="promo-grid">
              <div class="promo-cell">
                <span>{{ copy.periodLabel }}</span>
                <strong>{{ formatPeriod(promo) }}</strong>
              </div>
              <div class="promo-cell">
                <span>{{ copy.scheduleLabel }}</span>
                <strong>{{ formatSchedule(promo) }}</strong>
              </div>
              <div class="promo-cell">
                <span>{{ copy.paymentLabel }}</span>
                <strong>{{ promo.applies_payment_method || 'cash' }}</strong>
              </div>
            </div>

            <div class="promo-actions">
              <button class="tiny-btn" type="button" @click="openEdit(promo)">{{ copy.edit }}</button>
              <button class="tiny-btn" :class="promo.is_active ? 'danger' : 'primary'" type="button" @click="togglePromo(promo)">
                {{ promo.is_active ? copy.disable : copy.enable }}
              </button>
            </div>
          </article>
        </div>

        <div class="list-toolbar bottom">
          <div class="pager">
            <button class="pager-btn" :disabled="loading.list || page <= 1" @click="goto(page - 1)">{{ copy.prev }}</button>
            <span class="pager-chip">{{ copy.page }} {{ page }}/{{ pages }}</span>
            <button class="pager-btn" :disabled="loading.list || page >= pages" @click="goto(page + 1)">{{ copy.next }}</button>
          </div>
        </div>
      </CpPanelCard>
    </template>

    <div v-if="modal.open" class="overlay" @click.self="closeModal">
      <div class="modal-shell">
        <div class="modal-head">
          <div>
            <p class="modal-kicker">{{ copy.modalKicker }}</p>
            <h3>{{ modal.mode === 'create' ? copy.modalCreate : copy.modalEdit }}</h3>
            <span>{{ copy.modalSubtitle }}</span>
          </div>
          <button class="icon-btn" type="button" @click="closeModal">
            <Icon name="lucide:x" size="16" />
          </button>
        </div>

        <div class="editor-grid">
          <label class="field field-span-2">
            <span>{{ copy.fieldName }}</span>
            <input v-model.trim="form.name" :placeholder="copy.fieldNamePlaceholder" />
          </label>

          <label class="field">
            <span>{{ copy.fieldType }}</span>
            <input :value="copy.fieldTypeFixed" disabled />
          </label>

          <label class="field">
            <span>{{ copy.fieldPayment }}</span>
            <input :value="copy.fieldPaymentFixed" disabled />
          </label>

          <label class="field">
            <span>{{ copy.fieldPriority }}</span>
            <input v-model.number="form.priority" type="number" min="0" />
          </label>

          <label class="field field-check">
            <span>{{ copy.fieldState }}</span>
            <label class="check-line">
              <input v-model="form.is_active" type="checkbox" />
              <span>{{ copy.fieldStateActive }}</span>
            </label>
          </label>

          <div class="field field-span-2">
            <span>{{ copy.fieldDays }}</span>
            <div class="days">
              <button
                v-for="day in days"
                :key="day.v"
                class="day-btn"
                :class="{ active: form.days_of_week.includes(day.v) }"
                type="button"
                @click="toggleDay(day.v)"
              >
                {{ day.t }}
              </button>
            </div>
            <small>{{ copy.fieldDaysHint }}</small>
          </div>

          <label class="field">
            <span>{{ copy.fieldTimeFrom }}</span>
            <input v-model="form.time_from" type="time" />
          </label>

          <label class="field">
            <span>{{ copy.fieldTimeTo }}</span>
            <input v-model="form.time_to" type="time" />
          </label>

          <label class="field">
            <span>{{ copy.fieldStarts }}</span>
            <input v-model="form.starts_at" type="date" />
          </label>

          <label class="field">
            <span>{{ copy.fieldEnds }}</span>
            <input v-model="form.ends_at" type="date" />
          </label>
        </div>

        <p v-if="modal.error" class="panel-error">{{ modal.error }}</p>

        <div class="modal-actions">
          <button class="ghost-btn" type="button" :disabled="loading.save" @click="closeModal">{{ copy.cancel }}</button>
          <button class="primary-btn" type="button" :disabled="loading.save" @click="save">
            {{ loading.save ? copy.saving : modal.mode === 'create' ? copy.create : copy.save }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpAuthStore } from '@legacy/stores/cpAuth'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'

definePageMeta({
  layout: 'cp',
  roles: ['admin', 'owner'],
})

const promotionsPageCopy = {
  uz: {
    headTitle: 'Aksiyalar',
    eyebrow: 'Marketing',
    title: 'Aksiyalar',
    subtitle: "Bonus va top-up promo qoidalarini boshqaring.",
    updatedAt: 'Yangilandi',
    totalRows: 'Jami',
    activeRows: 'Faol',
    inactiveRows: "O'chirilgan",
    activeHint: 'Ishlayotgan promo qoidalar',
    inactiveHint: "To'xtatilgan qoidalar",
    refresh: 'Yangilash',
    refreshing: 'Yuklanmoqda...',
    add: "Aksiya qo'shish",
    noAccessTitle: "Bu bo'lim yopiq",
    noAccessSubtitle: 'Aksiyalarni faqat owner yoki admin boshqaradi.',
    filtersTitle: 'Filtrlar',
    filtersSubtitle: "Holat, nom va sahifa hajmi bo'yicha saralang.",
    searchLabel: 'Qidiruv',
    searchPlaceholder: "Aksiya nomi bo'yicha qidiring...",
    statusLabel: 'Holat',
    statusAll: 'Barchasi',
    statusActive: 'Faol',
    statusInactive: "O'chirilgan",
    perPageLabel: "Ko'rsatish",
    reset: 'Tozalash',
    apply: "Qo'llash",
    rulesTitle: 'Promo logikasi',
    rulesSubtitle: 'Operatorga tushunarli qisqa eslatma.',
    rulePrimaryTitle: '2x top-up qoidasi',
    rulePrimaryBody: "Aksiya faol va vaqt oralig'iga mos bo'lsa, naqd top-up uchun bonus miqdori amount ga teng bo'ladi.",
    ruleSecondaryTitle: 'Kun va vaqt boshqaruvi',
    ruleSecondaryBody: "Hafta kunlari, kunlik vaqt oralig'i va umumiy davr bo'yicha promo cheklanadi.",
    listTitle: "Aksiyalar ro'yxati",
    listSubtitle: "Har bir qoida uchun jadval, davr va holat ko'rinadi.",
    page: 'Sahifa',
    prev: 'Oldingi',
    next: 'Keyingi',
    empty: "Hozircha aksiya yo'q.",
    typeLabel: 'Turi',
    priorityLabel: 'Prioritet',
    periodLabel: 'Davr',
    scheduleLabel: 'Jadval',
    paymentLabel: "To'lov",
    edit: 'Tahrirlash',
    disable: "O'chirish",
    enable: 'Yoqish',
    modalKicker: 'Promotion editor',
    modalCreate: 'Yangi aksiya',
    modalEdit: 'Aksiyani tahrirlash',
    modalSubtitle: 'Nom, jadval va faollik holatini sozlang.',
    fieldName: 'Aksiya nomi',
    fieldNamePlaceholder: 'Masalan: Juma 2x',
    fieldType: 'Turi',
    fieldTypeFixed: '2x top-up',
    fieldPayment: "To'lov turi",
    fieldPaymentFixed: 'Naqd (cash)',
    fieldPriority: 'Prioritet',
    fieldState: 'Holat',
    fieldStateActive: 'Faol',
    fieldDays: 'Hafta kunlari',
    fieldDaysHint: "Bo'sh qoldirilsa har kuni ishlaydi.",
    everyDay: 'Har kuni',
    fieldTimeFrom: 'Vaqt dan',
    fieldTimeTo: 'Vaqt gacha',
    fieldStarts: 'Boshlanish sanasi',
    fieldEnds: 'Tugash sanasi',
    cancel: 'Bekor qilish',
    saving: 'Saqlanmoqda...',
    create: 'Yaratish',
    save: 'Saqlash',
    nameError: "Aksiya nomi kamida 3 belgidan iborat bo'lsin.",
  },
  ru: {
    headTitle: 'Акции',
    eyebrow: 'Marketing',
    title: 'Акции',
    subtitle: 'Управляйте бонусами и правилами промо для пополнения.',
    updatedAt: 'Обновлено',
    totalRows: 'Всего',
    activeRows: 'Активные',
    inactiveRows: 'Отключенные',
    activeHint: 'Работающие правила',
    inactiveHint: 'Остановленные правила',
    refresh: 'Обновить',
    refreshing: 'Загрузка...',
    add: 'Добавить акцию',
    noAccessTitle: 'Раздел закрыт',
    noAccessSubtitle: 'Акции может менять только owner или admin.',
    filtersTitle: 'Фильтры',
    filtersSubtitle: 'Отфильтруйте по названию, статусу и размеру страницы.',
    searchLabel: 'Поиск',
    searchPlaceholder: 'Найдите акцию по названию...',
    statusLabel: 'Статус',
    statusAll: 'Все',
    statusActive: 'Активна',
    statusInactive: 'Отключена',
    perPageLabel: 'Показывать',
    reset: 'Сбросить',
    apply: 'Применить',
    rulesTitle: 'Логика промо',
    rulesSubtitle: 'Короткое объяснение для оператора.',
    rulePrimaryTitle: 'Правило 2x top-up',
    rulePrimaryBody: 'Если акция активна и попадает в расписание, для наличного пополнения бонус равен сумме пополнения.',
    ruleSecondaryTitle: 'Дни и время',
    ruleSecondaryBody: 'Акция ограничивается днями недели, временным окном и общим диапазоном дат.',
    listTitle: 'Список акций',
    listSubtitle: 'Смотрите расписание, период и состояние каждой акции.',
    page: 'Страница',
    prev: 'Назад',
    next: 'Далее',
    empty: 'Акции пока не созданы.',
    typeLabel: 'Тип',
    priorityLabel: 'Приоритет',
    periodLabel: 'Период',
    scheduleLabel: 'Расписание',
    paymentLabel: 'Оплата',
    edit: 'Изменить',
    disable: 'Отключить',
    enable: 'Включить',
    modalKicker: 'Promotion editor',
    modalCreate: 'Новая акция',
    modalEdit: 'Редактирование акции',
    modalSubtitle: 'Настройте название, расписание и активность.',
    fieldName: 'Название акции',
    fieldNamePlaceholder: 'Например: Пятница 2x',
    fieldType: 'Тип',
    fieldTypeFixed: '2x top-up',
    fieldPayment: 'Тип оплаты',
    fieldPaymentFixed: 'Наличные (cash)',
    fieldPriority: 'Приоритет',
    fieldState: 'Состояние',
    fieldStateActive: 'Активна',
    fieldDays: 'Дни недели',
    fieldDaysHint: 'Если пусто, акция работает каждый день.',
    everyDay: 'Каждый день',
    fieldTimeFrom: 'Время с',
    fieldTimeTo: 'Время до',
    fieldStarts: 'Дата начала',
    fieldEnds: 'Дата окончания',
    cancel: 'Отмена',
    saving: 'Сохранение...',
    create: 'Создать',
    save: 'Сохранить',
    nameError: 'Название акции должно быть не короче 3 символов.',
  },
  en: {
    headTitle: 'Promotions',
    eyebrow: 'Marketing',
    title: 'Promotions',
    subtitle: 'Control bonus rules and top-up promo windows.',
    updatedAt: 'Updated',
    totalRows: 'Total',
    activeRows: 'Active',
    inactiveRows: 'Disabled',
    activeHint: 'Running rules',
    inactiveHint: 'Stopped rules',
    refresh: 'Refresh',
    refreshing: 'Loading...',
    add: 'Add promotion',
    noAccessTitle: 'Access restricted',
    noAccessSubtitle: 'Only owner or admin can manage promotions.',
    filtersTitle: 'Filters',
    filtersSubtitle: 'Filter by name, state, and page size.',
    searchLabel: 'Search',
    searchPlaceholder: 'Find a promotion by name...',
    statusLabel: 'Status',
    statusAll: 'All',
    statusActive: 'Active',
    statusInactive: 'Disabled',
    perPageLabel: 'Per page',
    reset: 'Reset',
    apply: 'Apply',
    rulesTitle: 'Promo logic',
    rulesSubtitle: 'Short helper notes for operators.',
    rulePrimaryTitle: '2x top-up rule',
    rulePrimaryBody: 'When the rule is active and matches the schedule, cash top-up gets a bonus equal to the top-up amount.',
    ruleSecondaryTitle: 'Day and time windows',
    ruleSecondaryBody: 'Each promotion can be limited by week days, daily time range, and full date range.',
    listTitle: 'Promotion list',
    listSubtitle: 'Schedule, period, state, and actions in one list.',
    page: 'Page',
    prev: 'Prev',
    next: 'Next',
    empty: 'No promotions yet.',
    typeLabel: 'Type',
    priorityLabel: 'Priority',
    periodLabel: 'Period',
    scheduleLabel: 'Schedule',
    paymentLabel: 'Payment',
    edit: 'Edit',
    disable: 'Disable',
    enable: 'Enable',
    modalKicker: 'Promotion editor',
    modalCreate: 'New promotion',
    modalEdit: 'Edit promotion',
    modalSubtitle: 'Set up title, schedule, and active state.',
    fieldName: 'Promotion name',
    fieldNamePlaceholder: 'For example: Friday 2x',
    fieldType: 'Type',
    fieldTypeFixed: '2x top-up',
    fieldPayment: 'Payment type',
    fieldPaymentFixed: 'Cash',
    fieldPriority: 'Priority',
    fieldState: 'State',
    fieldStateActive: 'Active',
    fieldDays: 'Week days',
    fieldDaysHint: 'Leave empty to run every day.',
    everyDay: 'Every day',
    fieldTimeFrom: 'Time from',
    fieldTimeTo: 'Time to',
    fieldStarts: 'Start date',
    fieldEnds: 'End date',
    cancel: 'Cancel',
    saving: 'Saving...',
    create: 'Create',
    save: 'Save',
    nameError: 'Promotion name should be at least 3 characters long.',
  },
}

const copy = useCpCopy(promotionsPageCopy)

useHead({
  title: computed(() => `${copy.value.headTitle} - NEXORA CLOUD CP`),
})

const auth = useCpAuthStore()
const { formatDateTime } = useCpFormatters()

const canAccess = computed(() => {
  const role = auth.operator?.role
  return role === 'admin' || role === 'owner'
})

const loading = reactive({
  list: false,
  save: false,
  toggle: false,
})

const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const updatedAt = ref<string | null>(null)

const filters = reactive({
  active: '',
  q: '',
  per_page: 20,
})

const modal = reactive({
  open: false,
  mode: 'create' as 'create' | 'edit',
  id: null as number | null,
  error: '',
})

const form = reactive({
  name: '',
  type: 'double_topup',
  applies_payment_method: 'cash',
  is_active: true,
  priority: 100,
  days_of_week: [] as number[],
  time_from: '',
  time_to: '',
  starts_at: '',
  ends_at: '',
})

const days = [
  { v: 1, t: 'Du' },
  { v: 2, t: 'Se' },
  { v: 3, t: 'Cho' },
  { v: 4, t: 'Pa' },
  { v: 5, t: 'Ju' },
  { v: 6, t: 'Sha' },
  { v: 0, t: 'Yak' },
]

const pages = computed(() => Math.max(1, Math.ceil((total.value || 0) / (perPage.value || 1))))
const activeCount = computed(() => items.value.filter((item) => !!item.is_active).length)
const inactiveCount = computed(() => Math.max(0, total.value - activeCount.value))
const updatedAtLabel = computed(() => (updatedAt.value ? formatDateTime(updatedAt.value) : '-'))
const filteredItems = computed(() => {
  const q = filters.q.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((item) => String(item.name || '').toLowerCase().includes(q))
})

function resetForm() {
  form.name = ''
  form.type = 'double_topup'
  form.applies_payment_method = 'cash'
  form.is_active = true
  form.priority = 100
  form.days_of_week = []
  form.time_from = ''
  form.time_to = ''
  form.starts_at = ''
  form.ends_at = ''
}

function fillForm(item: any) {
  form.name = item?.name ?? ''
  form.type = item?.type ?? 'double_topup'
  form.applies_payment_method = item?.applies_payment_method ?? 'cash'
  form.is_active = !!item?.is_active
  form.priority = Number(item?.priority ?? 100)
  form.days_of_week = Array.isArray(item?.days_of_week) ? [...item.days_of_week] : []
  form.time_from = item?.time_from ?? ''
  form.time_to = item?.time_to ?? ''
  form.starts_at = item?.starts_at ?? ''
  form.ends_at = item?.ends_at ?? ''
}

function openCreate() {
  resetForm()
  modal.open = true
  modal.mode = 'create'
  modal.id = null
  modal.error = ''
}

function openEdit(item: any) {
  fillForm(item)
  modal.open = true
  modal.mode = 'edit'
  modal.id = Number(item.id)
  modal.error = ''
}

function closeModal() {
  modal.open = false
  modal.error = ''
}

function resetFilters() {
  filters.active = ''
  filters.q = ''
  filters.per_page = 20
  page.value = 1
  reload()
}

function applyFilters() {
  page.value = 1
  reload()
}

function goto(nextPage: number) {
  page.value = Math.max(1, Math.min(nextPage, pages.value))
  reload()
}

function toggleDay(value: number) {
  const index = form.days_of_week.indexOf(value)
  if (index >= 0) form.days_of_week.splice(index, 1)
  else form.days_of_week.push(value)
}

function normalizeType(type: string) {
  return type === 'double_topup' ? '2x' : type || '-'
}

function formatPeriod(item: any) {
  const start = item?.starts_at ? String(item.starts_at) : ''
  const end = item?.ends_at ? String(item.ends_at) : ''
  if (start && end) return `${start} — ${end}`
  if (start) return `${copy.value.fieldStarts}: ${start}`
  if (end) return `${copy.value.fieldEnds}: ${end}`
  return '—'
}

function mapDow(value: number) {
  const labels: Record<number, string> = { 1: 'Du', 2: 'Se', 3: 'Cho', 4: 'Pa', 5: 'Ju', 6: 'Sha', 0: 'Yak' }
  return labels[value] ?? String(value)
}

function formatSchedule(item: any) {
  const dow = Array.isArray(item?.days_of_week) ? item.days_of_week : []
  const daysText = dow.length ? dow.map(mapDow).join(', ') : copy.value.everyDay
  const from = item?.time_from || '00:00'
  const to = item?.time_to || '23:59'
  return `${daysText} • ${from}-${to}`
}

function buildPayload() {
  return {
    name: form.name,
    type: 'double_topup',
    applies_payment_method: 'cash',
    is_active: !!form.is_active,
    priority: Number(form.priority ?? 100),
    days_of_week: form.days_of_week.length ? [...form.days_of_week].sort() : [],
    time_from: form.time_from || null,
    time_to: form.time_to || null,
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
  }
}

async function reload() {
  if (!canAccess.value) return
  loading.list = true
  try {
    perPage.value = Number(filters.per_page || 20)
    const params: Record<string, any> = {
      page: page.value,
      per_page: perPage.value,
    }
    if (filters.active !== '') params.active = filters.active
    if (filters.q) params.q = filters.q

    const response = await cpApi.promotionList(params)
    const raw = response?.data ?? {}
    const root = Object.prototype.hasOwnProperty.call(raw, 'data') ? (raw.data ?? raw) : raw
    const pag = root

    let list: any[] = []
    if (Array.isArray(pag?.data)) list = pag.data
    else if (Array.isArray(pag?.data?.data)) list = pag.data.data
    else if (Array.isArray(pag?.items)) list = pag.items
    else if (Array.isArray(pag?.data?.items)) list = pag.data.items

    items.value = list
    total.value = Number(pag?.total ?? pag?.meta?.total ?? pag?.data?.total ?? list.length)
    updatedAt.value = new Date().toISOString()
  } catch {
    items.value = []
    total.value = 0
  } finally {
    loading.list = false
  }
}

async function save() {
  modal.error = ''
  if (!form.name || form.name.trim().length < 3) {
    modal.error = copy.value.nameError
    return
  }

  loading.save = true
  try {
    const payload = buildPayload()
    if (modal.mode === 'create') await cpApi.promotionCreate(payload)
    else if (modal.id) await cpApi.promotionUpdate(modal.id, payload)
    closeModal()
    await reload()
  } catch (error: any) {
    const message = error?.response?.data?.message
    const errors = error?.response?.data?.errors
    modal.error = message || (errors ? Object.values(errors).flat().join(' ') : 'Request failed')
  } finally {
    loading.save = false
  }
}

async function togglePromo(item: any) {
  loading.toggle = true
  try {
    await cpApi.promotionToggle(item.id)
    await reload()
  } finally {
    loading.toggle = false
  }
}

reload()
</script>

<style scoped>
.promotions-page,
.stats-grid,
.top-grid,
.hero-tools,
.filter-grid,
.promo-list,
.editor-grid,
.days {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.top-grid {
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
}

.hero-tools {
  grid-template-columns: repeat(2, max-content);
  align-items: center;
  gap: 10px;
}

.guard-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid var(--stroke);
  border-radius: 22px;
  background: var(--surface);
  color: var(--text);
}

.guard-card p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.filter-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.field-span-2 {
  grid-column: span 2;
}

.field,
.promo-cell {
  display: grid;
  gap: 8px;
}

.field span,
.promo-cell span {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field input,
.field select {
  min-height: 44px;
  width: 100%;
  padding: 0 14px;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  outline: 0;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 14px;
}

.field input:disabled {
  opacity: 1;
  color: var(--text);
}

.filters-actions,
.list-toolbar,
.promo-top,
.promo-actions,
.modal-head,
.modal-actions,
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filters-actions {
  justify-content: flex-end;
  margin-top: 4px;
}

.rule-stack {
  display: grid;
  gap: 12px;
}

.rule-card {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--stroke);
  border-radius: 18px;
  background: var(--surface-soft);
}

.rule-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
}

.rule-icon.tone-soft {
  background: color-mix(in srgb, var(--accent-soft) 18%, var(--surface));
}

.rule-card strong {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
}

.rule-card p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.promo-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.promo-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--stroke);
  border-radius: 18px;
  background: var(--surface-soft);
}

.promo-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.promo-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
}

.promo-title-wrap strong {
  display: block;
  font-size: 15px;
}

.promo-title-wrap small {
  color: var(--text-muted);
  font-size: 12px;
}

.promo-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-pill,
.pager-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.mini-pill.ok {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, var(--stroke));
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
}

.promo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.promo-cell strong {
  font-size: 13px;
  line-height: 1.5;
}

.promo-actions {
  justify-content: flex-end;
}

.list-toolbar.bottom {
  margin-top: 14px;
  padding-top: 2px;
  justify-content: center;
}

.state-box {
  min-height: 180px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--stroke);
  border-radius: 20px;
  color: var(--text-muted);
  font-size: 14px;
}

.skeleton-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.skeleton-card {
  display: block;
  min-height: 170px;
  border-radius: 20px;
  background: linear-gradient(120deg, color-mix(in srgb, var(--surface-soft) 86%, transparent), color-mix(in srgb, var(--surface) 88%, transparent), color-mix(in srgb, var(--surface-soft) 86%, transparent));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
  background: color-mix(in srgb, var(--ink) 34%, transparent);
  backdrop-filter: blur(10px);
}

.modal-shell {
  width: min(760px, 100%);
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid var(--stroke);
  border-radius: 28px;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

.modal-head {
  align-items: flex-start;
}

.modal-kicker {
  margin: 0 0 6px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.modal-head h3 {
  margin: 0;
  color: var(--text);
  font-size: 30px;
  line-height: 1.05;
}

.modal-head span {
  color: var(--text-muted);
  font-size: 13px;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--surface-soft);
  color: var(--text);
}

.editor-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-check {
  align-content: start;
}

.check-line {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 14px;
}

.days {
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.day-btn {
  min-height: 42px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
}

.day-btn.active {
  border-color: color-mix(in srgb, var(--accent) 34%, var(--stroke));
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
}

.field small {
  color: var(--text-muted);
  font-size: 12px;
}

.panel-error {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--danger) 28%, var(--stroke));
  border-radius: 16px;
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  color: var(--danger);
  font-size: 13px;
}

.ghost-btn,
.primary-btn,
.tiny-btn,
.pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.primary-btn,
.tiny-btn.primary {
  border-color: color-mix(in srgb, var(--accent) 34%, var(--stroke));
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.tiny-btn.danger {
  border-color: color-mix(in srgb, var(--danger) 34%, var(--stroke));
  background: color-mix(in srgb, var(--danger) 10%, var(--surface));
  color: var(--danger);
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (max-width: 1180px) {
  .top-grid,
  .filter-grid,
  .promo-grid,
  .editor-grid,
  .stats-grid,
  .promo-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .field-span-2 {
    grid-column: span 1;
  }

  .days {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .hero-tools,
  .modal-actions,
  .promo-top,
  .promo-actions,
  .filters-actions {
    grid-template-columns: minmax(0, 1fr);
    display: grid;
  }

  .days {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .skeleton-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
