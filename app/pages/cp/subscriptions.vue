<template>
  <div class="subscriptions-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="hero-meta-badge">{{ copy.updatedAt }}: {{ updatedAtLabel }}</span>
      </template>
      <template #actions>
        <div class="hero-tools">
          <button class="ghost-btn" type="button" :disabled="loading.list" @click="reload">
            <Icon name="lucide:refresh-cw" size="15" />
            <span>{{ loading.list ? copy.refreshing : copy.refresh }}</span>
          </button>
          <button class="primary-btn" type="button" @click="openCreate">
            <Icon name="lucide:plus" size="15" />
            <span>{{ copy.add }}</span>
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard compact tone="tone-blue" :label="copy.totalRows" :value="String(filteredItems.length)" :hint="copy.totalHint" />
      <CpStatCard compact tone="tone-green" :label="copy.activeRows" :value="String(activeCount)" :hint="copy.activeHint" />
      <CpStatCard compact tone="tone-amber" :label="copy.inactiveRows" :value="String(inactiveCount)" :hint="copy.inactiveHint" />
      <CpStatCard compact tone="tone-pink" :label="copy.avgPrice" :value="`${money(avgPrice)} UZS`" :hint="copy.avgPriceHint" />
    </div>

    <CpPanelCard :title="copy.filtersTitle" :subtitle="copy.filtersSubtitle">
      <div class="filter-grid">
        <label class="field">
          <span>{{ copy.statusLabel }}</span>
          <select v-model="filters.active">
            <option value="">{{ copy.statusAll }}</option>
            <option value="true">{{ copy.statusActive }}</option>
            <option value="false">{{ copy.statusInactive }}</option>
          </select>
        </label>

        <label class="field">
          <span>{{ copy.zoneLabel }}</span>
          <select v-model="filters.zone_id">
            <option value="">{{ copy.zoneAll }}</option>
            <option v-for="zone in zones" :key="zone.id" :value="String(zone.id)">{{ zone.name }}</option>
          </select>
        </label>

        <label class="field field-span-2">
          <span>{{ copy.searchLabel }}</span>
          <input v-model.trim="filters.q" :placeholder="copy.searchPlaceholder" />
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
        <button class="ghost-btn" type="button" @click="resetFilters">{{ copy.reset }}</button>
        <button class="primary-btn" type="button" :disabled="loading.list" @click="applyFilters">{{ copy.apply }}</button>
      </div>
    </CpPanelCard>

    <CpPanelCard :title="copy.listTitle" :subtitle="copy.listSubtitle">
      <div v-if="loading.list" class="state-box">
        <div class="skeleton-grid"><span v-for="i in 4" :key="i" class="skeleton-card" /></div>
      </div>
      <div v-else-if="!filteredItems.length" class="state-box">{{ copy.empty }}</div>
      <div v-else class="subscriptions-grid">
        <article v-for="item in filteredItems" :key="item.id" class="subscription-card">
          <div class="subscription-top">
            <div class="subscription-title">
              <div class="subscription-icon">
                <Icon name="lucide:badge-check" size="16" />
              </div>
              <div>
                <strong>{{ item.name }}</strong>
                <small>ID #{{ item.id }} <span v-if="item.created_at">• {{ formatDT(item.created_at) }}</span></small>
              </div>
            </div>

            <div class="subscription-pills">
              <span class="state-pill muted">{{ zoneName(item) }}</span>
              <span class="state-pill" :class="item.is_active ? 'ok' : 'muted'">
                {{ item.is_active ? copy.statusActive : copy.statusInactive }}
              </span>
            </div>
          </div>

          <div class="subscription-metrics">
            <div class="metric-card">
              <span>{{ copy.durationLabel }}</span>
              <strong>{{ safeInt(item.duration_days) }} {{ dayText(item.duration_days) }}</strong>
            </div>
            <div class="metric-card">
              <span>{{ copy.priceLabel }}</span>
              <strong>{{ money(item.price) }} UZS</strong>
            </div>
            <div class="metric-card">
              <span>{{ copy.dailyRate }}</span>
              <strong>{{ money(dailyRate(item)) }} UZS</strong>
            </div>
          </div>

          <div class="subscription-note">
            <Icon name="lucide:calendar-range" size="14" />
            <span>{{ copy.termHint }}: {{ safeInt(item.duration_days) }} {{ dayText(item.duration_days) }}</span>
          </div>

          <div class="subscription-actions">
            <button class="tiny-btn" type="button" @click="openEdit(item)">{{ copy.edit }}</button>
            <button class="tiny-btn" :class="item.is_active ? 'danger' : 'primary'" type="button" @click="togglePlan(item)">
              {{ item.is_active ? copy.disable : copy.enable }}
            </button>
          </div>
        </article>
      </div>

      <div class="pager-wrap" v-if="pages > 1">
        <div class="pager">
          <button class="pager-btn" :disabled="loading.list || page <= 1" @click="goto(page - 1)">{{ copy.prev }}</button>
          <span class="pager-chip">{{ copy.page }} {{ page }}/{{ pages }}</span>
          <button class="pager-btn" :disabled="loading.list || page >= pages" @click="goto(page + 1)">{{ copy.next }}</button>
        </div>
      </div>
    </CpPanelCard>

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
          <div class="editor-card">
            <label class="field">
              <span>{{ copy.fieldName }}</span>
              <input v-model.trim="form.name" :placeholder="copy.fieldNamePlaceholder" />
            </label>

            <label class="field">
              <span>{{ copy.zoneLabel }}</span>
              <select v-model.number="form.zone_id">
                <option value="0" disabled>{{ copy.zonePick }}</option>
                <option v-for="zone in zones" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
              </select>
            </label>

            <div class="split-fields">
              <label class="field">
                <span>{{ copy.fieldDuration }}</span>
                <input v-model.number="form.duration_days" type="number" min="1" />
                <div class="chip-row">
                  <button v-for="value in [7, 14, 30, 60, 90]" :key="value" class="mini-chip" type="button" @click="setDuration(value)">
                    {{ value }} {{ copy.daysShort }}
                  </button>
                </div>
              </label>

              <label class="field">
                <span>{{ copy.fieldPrice }}</span>
                <input v-model.number="form.price" type="number" min="0" />
                <div class="chip-row">
                  <button v-for="value in [50000, 100000, 300000, 1000000]" :key="value" class="mini-chip" type="button" @click="addPrice(value)">
                    + {{ money(value) }}
                  </button>
                </div>
              </label>
            </div>

            <label class="field">
              <span>{{ copy.fieldState }}</span>
              <label class="check-line">
                <input v-model="form.is_active" type="checkbox" />
                <span>{{ copy.fieldStateActive }}</span>
              </label>
            </label>
          </div>

          <div class="editor-card preview-card">
            <div class="preview-head">
              <strong>{{ copy.previewTitle }}</strong>
              <small>{{ copy.previewSubtitle }}</small>
            </div>

            <div class="preview-rows">
              <div class="preview-row">
                <span>{{ copy.fieldName }}</span>
                <strong>{{ form.name || '—' }}</strong>
              </div>
              <div class="preview-row">
                <span>{{ copy.zoneLabel }}</span>
                <strong>{{ currentZoneName }}</strong>
              </div>
              <div class="preview-row">
                <span>{{ copy.fieldDuration }}</span>
                <strong>{{ safeInt(form.duration_days) }} {{ dayText(form.duration_days) }}</strong>
              </div>
              <div class="preview-row">
                <span>{{ copy.priceLabel }}</span>
                <strong>{{ money(form.price) }} UZS</strong>
              </div>
              <div class="preview-row">
                <span>{{ copy.dailyRate }}</span>
                <strong>{{ money(currentDailyRate) }} UZS</strong>
              </div>
              <div class="preview-row">
                <span>{{ copy.fieldState }}</span>
                <strong>{{ form.is_active ? copy.statusActive : copy.statusInactive }}</strong>
              </div>
            </div>
          </div>
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
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'

definePageMeta({
  layout: 'cp',
})

const subscriptionsPageCopy = {
  uz: {
    headTitle: 'Obunalar',
    eyebrow: 'Recurring plans',
    title: 'Obunalar',
    subtitle: "Mijozlar uchun obuna tariflarini soddaroq boshqaring.",
    updatedAt: 'Yangilandi',
    refresh: 'Yangilash',
    refreshing: 'Yuklanmoqda...',
    add: "Tarif qo'shish",
    totalRows: 'Jami',
    totalHint: "Ko'rinayotgan tariflar",
    activeRows: 'Faol',
    activeHint: 'Sotuvdagi obunalar',
    inactiveRows: "O'chirilgan",
    inactiveHint: "To'xtatilgan tariflar",
    avgPrice: "O'rtacha narx",
    avgPriceHint: 'Ko‘rinayotgan kartalar',
    filtersTitle: 'Filtrlar',
    filtersSubtitle: 'Nom, zona va holat bo‘yicha tez toping.',
    statusLabel: 'Holat',
    statusAll: 'Barchasi',
    statusActive: 'Faol',
    statusInactive: "O'chirilgan",
    zoneLabel: 'Zona',
    zoneAll: 'Barcha zonalar',
    searchLabel: 'Qidiruv',
    searchPlaceholder: 'Tarif nomi bo‘yicha qidiring...',
    perPageLabel: "Ko'rsatish",
    reset: 'Tozalash',
    apply: "Qo'llash",
    listTitle: "Obuna tariflari",
    listSubtitle: 'Davomiylik va narx bo‘yicha compact kartalar.',
    empty: "Hozircha obuna tarifi yo'q.",
    durationLabel: 'Muddat',
    priceLabel: 'Narx',
    dailyRate: '1 kun narxi',
    termHint: 'Obuna muddati',
    edit: 'Tahrirlash',
    disable: "O'chirish",
    enable: 'Yoqish',
    prev: 'Oldingi',
    next: 'Keyingi',
    page: 'Sahifa',
    modalKicker: 'Recurring plan',
    modalCreate: 'Yangi obuna tarifi',
    modalEdit: 'Tarifni tahrirlash',
    modalSubtitle: 'Nom, zona, kunlar va narxni kiriting.',
    fieldName: 'Tarif nomi',
    fieldNamePlaceholder: 'Masalan: VIP 1 oy',
    zonePick: 'Zonani tanlang',
    fieldDuration: 'Davomiylik (kun)',
    fieldPrice: 'Narx (UZS)',
    fieldState: 'Holat',
    fieldStateActive: 'Faol holatda saqlash',
    previewTitle: 'Tarif preview',
    previewSubtitle: 'Mijozga ko‘rinadigan qisqa ko‘rinish.',
    cancel: 'Bekor qilish',
    create: 'Yaratish',
    save: 'Saqlash',
    saving: 'Saqlanmoqda...',
    daysShort: 'kun',
  },
  ru: {
    headTitle: 'Подписки',
    eyebrow: 'Recurring plans',
    title: 'Подписки',
    subtitle: 'Управляйте тарифами подписок в более понятном виде.',
    updatedAt: 'Обновлено',
    refresh: 'Обновить',
    refreshing: 'Загрузка...',
    add: 'Добавить тариф',
    totalRows: 'Всего',
    totalHint: 'Видимые тарифы',
    activeRows: 'Активные',
    activeHint: 'Доступны к продаже',
    inactiveRows: 'Отключены',
    inactiveHint: 'Скрытые тарифы',
    avgPrice: 'Средняя цена',
    avgPriceHint: 'По текущей выдаче',
    filtersTitle: 'Фильтры',
    filtersSubtitle: 'Поиск по названию, зоне и статусу.',
    statusLabel: 'Статус',
    statusAll: 'Все',
    statusActive: 'Активна',
    statusInactive: 'Отключена',
    zoneLabel: 'Зона',
    zoneAll: 'Все зоны',
    searchLabel: 'Поиск',
    searchPlaceholder: 'Поиск по названию тарифа...',
    perPageLabel: 'Показывать',
    reset: 'Сбросить',
    apply: 'Применить',
    listTitle: 'Тарифы подписок',
    listSubtitle: 'Список тарифов по длительности и цене.',
    empty: 'Тарифов подписок пока нет.',
    durationLabel: 'Длительность',
    priceLabel: 'Цена',
    dailyRate: 'Цена за день',
    termHint: 'Срок подписки',
    edit: 'Изменить',
    disable: 'Отключить',
    enable: 'Включить',
    prev: 'Назад',
    next: 'Далее',
    page: 'Страница',
    modalKicker: 'Recurring plan',
    modalCreate: 'Новый тариф',
    modalEdit: 'Редактирование тарифа',
    modalSubtitle: 'Укажите название, зону, срок и цену.',
    fieldName: 'Название тарифа',
    fieldNamePlaceholder: 'Например: VIP 1 месяц',
    zonePick: 'Выберите зону',
    fieldDuration: 'Длительность (дни)',
    fieldPrice: 'Цена (UZS)',
    fieldState: 'Статус',
    fieldStateActive: 'Сохранить как активный',
    previewTitle: 'Превью тарифа',
    previewSubtitle: 'Как план выглядит для оператора.',
    cancel: 'Отмена',
    create: 'Создать',
    save: 'Сохранить',
    saving: 'Сохранение...',
    daysShort: 'дн',
  },
  en: {
    headTitle: 'Subscriptions',
    eyebrow: 'Recurring plans',
    title: 'Subscriptions',
    subtitle: 'Manage subscription plans in a cleaner operator flow.',
    updatedAt: 'Updated',
    refresh: 'Refresh',
    refreshing: 'Loading...',
    add: 'Add plan',
    totalRows: 'Total',
    totalHint: 'Visible plans',
    activeRows: 'Active',
    activeHint: 'Available for sale',
    inactiveRows: 'Disabled',
    inactiveHint: 'Hidden plans',
    avgPrice: 'Average price',
    avgPriceHint: 'Current page',
    filtersTitle: 'Filters',
    filtersSubtitle: 'Find by name, zone and state.',
    statusLabel: 'State',
    statusAll: 'All',
    statusActive: 'Active',
    statusInactive: 'Disabled',
    zoneLabel: 'Zone',
    zoneAll: 'All zones',
    searchLabel: 'Search',
    searchPlaceholder: 'Search by plan name...',
    perPageLabel: 'Per page',
    reset: 'Reset',
    apply: 'Apply',
    listTitle: 'Subscription plans',
    listSubtitle: 'Compact cards for duration, zone and price.',
    empty: 'No subscription plans yet.',
    durationLabel: 'Duration',
    priceLabel: 'Price',
    dailyRate: 'Per day',
    termHint: 'Subscription term',
    edit: 'Edit',
    disable: 'Disable',
    enable: 'Enable',
    prev: 'Previous',
    next: 'Next',
    page: 'Page',
    modalKicker: 'Recurring plan',
    modalCreate: 'New plan',
    modalEdit: 'Edit plan',
    modalSubtitle: 'Enter plan name, zone, days and price.',
    fieldName: 'Plan name',
    fieldNamePlaceholder: 'Example: VIP 1 month',
    zonePick: 'Pick zone',
    fieldDuration: 'Duration (days)',
    fieldPrice: 'Price (UZS)',
    fieldState: 'State',
    fieldStateActive: 'Save as active',
    previewTitle: 'Plan preview',
    previewSubtitle: 'Short operator-side summary.',
    cancel: 'Cancel',
    create: 'Create',
    save: 'Save',
    saving: 'Saving...',
    daysShort: 'd',
  },
}

const copy = useCpCopy(subscriptionsPageCopy)
const { formatMoney, formatDateTime } = useCpFormatters()

const loading = reactive({
  list: false,
  save: false,
})

const items = ref<any[]>([])
const zones = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const updatedAt = ref<Date | null>(null)

const filters = reactive({
  q: '',
  zone_id: '',
  active: '',
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
  zone_id: 0,
  duration_days: 30,
  price: 0,
  is_active: true,
})

const pages = computed(() => Math.max(1, Math.ceil((total.value || 0) / (filters.per_page || 1))))
const filteredItems = computed(() => (Array.isArray(items.value) ? items.value : []))
const activeCount = computed(() => filteredItems.value.filter(item => item?.is_active).length)
const inactiveCount = computed(() => Math.max(0, filteredItems.value.length - activeCount.value))
const avgPrice = computed(() => {
  if (!filteredItems.value.length) return 0
  const sum = filteredItems.value.reduce((acc, item) => acc + safeInt(item?.price), 0)
  return Math.round(sum / filteredItems.value.length)
})
const updatedAtLabel = computed(() => (updatedAt.value ? formatDT(updatedAt.value) : '—'))
const currentZoneName = computed(() => {
  const zone = zones.value.find(item => Number(item.id) === Number(form.zone_id))
  return zone?.name || '—'
})
const currentDailyRate = computed(() => {
  const days = Math.max(1, safeInt(form.duration_days))
  return Math.round(safeInt(form.price) / days)
})

function safeInt(value: unknown) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

function money(value: unknown) {
  return formatMoney(safeInt(value), { currency: '' }).trim()
}

function formatDT(value: unknown) {
  return formatDateTime(value, { withSeconds: false })
}

function dayText(value: unknown) {
  const days = safeInt(value)
  if (copy.value.daysShort === 'дн') return days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'
  if (copy.value.daysShort === 'd') return days === 1 ? 'day' : 'days'
  return 'kun'
}

function dailyRate(item: any) {
  const days = Math.max(1, safeInt(item?.duration_days))
  return Math.round(safeInt(item?.price) / days)
}

function zoneName(item: any) {
  const zoneId = item?.zone_id ?? item?.zone?.id
  const direct = item?.zone?.name
  if (direct) return direct
  const zone = zones.value.find(entry => Number(entry.id) === Number(zoneId))
  return zone?.name || '—'
}

function resetForm() {
  form.name = ''
  form.zone_id = safeInt(zones.value[0]?.id)
  form.duration_days = 30
  form.price = 0
  form.is_active = true
}

function openCreate() {
  resetForm()
  modal.open = true
  modal.mode = 'create'
  modal.id = null
  modal.error = ''
}

function openEdit(item: any) {
  form.name = item?.name || ''
  form.zone_id = safeInt(item?.zone_id ?? item?.zone?.id ?? zones.value[0]?.id)
  form.duration_days = safeInt(item?.duration_days)
  form.price = safeInt(item?.price)
  form.is_active = !!item?.is_active
  modal.open = true
  modal.mode = 'edit'
  modal.id = safeInt(item?.id)
  modal.error = ''
}

function closeModal() {
  modal.open = false
  modal.error = ''
}

function setDuration(value: number) {
  form.duration_days = value
}

function addPrice(value: number) {
  form.price = safeInt(form.price) + value
}

async function loadZones() {
  const response = await cpApi.zonesList({ active: true, per_page: 200, page: 1 })
  const payload = response?.data?.data ?? response?.data ?? {}
  zones.value = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
  if (!form.zone_id && zones.value.length) form.zone_id = safeInt(zones.value[0]?.id)
}

async function loadList() {
  loading.list = true
  try {
    const response = await cpApi.subscriptionPlanList({
      page: page.value,
      per_page: filters.per_page,
      q: filters.q || undefined,
      zone_id: filters.zone_id || undefined,
      active: filters.active || undefined,
    })
    const payload = response?.data?.data ?? response?.data ?? {}
    const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
    items.value = list
    total.value = safeInt(payload?.total ?? list.length)
    updatedAt.value = new Date()
  } catch {
    items.value = []
    total.value = 0
  } finally {
    loading.list = false
  }
}

async function reload() {
  await Promise.all([loadZones(), loadList()])
}

function applyFilters() {
  page.value = 1
  loadList()
}

function resetFilters() {
  filters.q = ''
  filters.zone_id = ''
  filters.active = ''
  filters.per_page = 20
  page.value = 1
  loadList()
}

function goto(nextPage: number) {
  page.value = nextPage
  loadList()
}

async function save() {
  modal.error = ''
  if (!form.name.trim()) {
    modal.error = copy.value.fieldName
    return
  }
  if (!form.zone_id) {
    modal.error = copy.value.zonePick
    return
  }
  loading.save = true
  try {
    const payload = {
      name: form.name.trim(),
      zone_id: safeInt(form.zone_id),
      duration_days: Math.max(1, safeInt(form.duration_days)),
      price: Math.max(0, safeInt(form.price)),
      is_active: !!form.is_active,
    }

    if (modal.mode === 'create') await cpApi.subscriptionPlanCreate(payload)
    else if (modal.id) await cpApi.subscriptionPlanUpdate(modal.id, payload)

    closeModal()
    await loadList()
  } catch (error: any) {
    modal.error = error?.response?.data?.message || error?.message || 'Failed'
  } finally {
    loading.save = false
  }
}

async function togglePlan(item: any) {
  await cpApi.subscriptionPlanToggle(item.id)
  await loadList()
}

useHead(() => ({
  title: `${copy.value.headTitle} - NEXORA CLOUD`,
}))

await Promise.all([loadZones(), loadList()])
</script>

<style scoped>
.subscriptions-page {
  display: grid;
  gap: 18px;
}

.hero-tools,
.filters-actions,
.modal-actions,
.subscription-actions,
.chip-row,
.pager {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.stats-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.filter-grid,
.editor-grid,
.split-fields,
.subscriptions-grid {
  display: grid;
  gap: 14px;
}

.filter-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.field-span-2 {
  grid-column: span 2;
}

.field,
.editor-card {
  display: grid;
  gap: 8px;
}

.field span,
.modal-kicker {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field input,
.field select {
  width: 100%;
  min-height: 44px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  padding: 0 14px;
  font: inherit;
  font-size: 14px;
  outline: 0;
}

.subscriptions-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.subscription-card,
.editor-card {
  border: 1px solid var(--stroke);
  border-radius: 20px;
  background: var(--surface-soft);
  padding: 18px;
  box-shadow: var(--shadow-panel);
}

.subscription-top,
.subscription-title,
.subscription-pills,
.subscription-note,
.preview-head,
.preview-row {
  display: flex;
  align-items: center;
}

.subscription-top,
.preview-head {
  justify-content: space-between;
  gap: 14px;
}

.subscription-title,
.subscription-pills,
.subscription-note {
  gap: 10px;
}

.subscription-title strong,
.preview-row strong {
  display: block;
  font-size: 17px;
  color: var(--text);
}

.subscription-title small,
.preview-head small,
.subscription-note span,
.preview-row span {
  color: var(--text-muted);
  font-size: 12px;
}

.subscription-icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
}

.subscription-metrics {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 16px;
}

.metric-card {
  border: 1px solid var(--stroke);
  background: var(--surface);
  border-radius: 18px;
  padding: 14px;
  display: grid;
  gap: 6px;
}

.metric-card span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.metric-card strong {
  font-size: 15px;
  color: var(--text);
}

.subscription-note {
  margin-top: 14px;
  color: var(--text-muted);
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface);
}

.subscription-actions {
  margin-top: 16px;
}

.state-pill,
.mini-chip,
.pager-chip,
.hero-meta-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  padding: 8px 12px;
}

.state-pill.ok {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, var(--stroke));
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
}

.tiny-btn,
.ghost-btn,
.primary-btn,
.pager-btn,
.icon-btn {
  border-radius: 16px;
  border: 1px solid var(--stroke);
  min-height: 40px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font: inherit;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.ghost-btn,
.pager-btn,
.tiny-btn,
.icon-btn {
  background: var(--surface-soft);
  color: var(--text);
}

.primary-btn,
.tiny-btn.primary {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 34%, var(--stroke));
  color: var(--text);
}

.tiny-btn.danger {
  background: color-mix(in srgb, var(--danger) 10%, var(--surface));
  border-color: color-mix(in srgb, var(--danger) 35%, var(--stroke));
  color: var(--danger);
}

.tiny-btn {
  min-height: 34px;
  font-size: 13px;
  padding-inline: 12px;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.skeleton-card {
  height: 162px;
  border-radius: 22px;
  background: linear-gradient(90deg, var(--cp-surface-soft), color-mix(in srgb, var(--cp-surface-soft) 70%, white), var(--cp-surface-soft));
  background-size: 220% 100%;
  animation: pulse 1.1s linear infinite;
}

.state-box {
  border: 1px dashed var(--stroke);
  border-radius: 22px;
  padding: 24px;
  color: var(--text-muted);
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(9, 14, 25, 0.58);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 60;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.modal-shell {
  width: min(940px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  border-radius: 28px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  padding: 22px;
  display: grid;
  gap: 18px;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.modal-head h3 {
  margin: 6px 0 4px;
  font-size: 28px;
  color: var(--text);
}

.modal-head span {
  color: var(--text-muted);
  font-size: 13px;
}

.editor-grid {
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
}

.split-fields {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.check-line {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--cp-text);
}

.mini-chip {
  min-height: 30px;
  padding: 0 10px;
  cursor: pointer;
}

.preview-card {
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.preview-rows {
  display: grid;
  gap: 12px;
}

.preview-row {
  justify-content: space-between;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--stroke);
}

.preview-row:last-child {
  border-bottom: 0;
}

.panel-error {
  margin: 0;
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--danger) 28%, var(--stroke));
  border-radius: 16px;
  padding: 12px 14px;
}

.pager-wrap {
  margin-top: 18px;
  display: flex;
  justify-content: center;
}

@keyframes pulse {
  to {
    background-position: -220% 0;
  }
}

@media (max-width: 1100px) {
  .stats-grid,
  .filter-grid,
  .subscriptions-grid,
  .editor-grid,
  .split-fields,
  .subscription-metrics,
  .skeleton-grid {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: span 1;
  }
}
</style>
