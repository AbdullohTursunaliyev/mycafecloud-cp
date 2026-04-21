<template>
  <div class="packages-page">
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
          <select v-model="filters.zone">
            <option value="">{{ copy.zoneAll }}</option>
            <option v-for="zone in zones" :key="zone.id || zone.name" :value="zone.name">{{ zone.name }}</option>
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
      <div v-else class="packages-grid">
        <article v-for="item in filteredItems" :key="item.id" class="package-card">
          <div class="package-top">
            <div class="package-title">
              <div class="package-icon">
                <Icon name="lucide:package-2" size="16" />
              </div>
              <div>
                <strong>{{ item.name }}</strong>
                <small>ID #{{ item.id }} <span v-if="item.created_at">• {{ formatDT(item.created_at) }}</span></small>
              </div>
            </div>

            <span class="state-pill" :class="item.is_active ? 'ok' : 'muted'">
              {{ item.is_active ? copy.statusActive : copy.statusInactive }}
            </span>
          </div>

          <div class="package-metrics">
            <div class="metric-card">
              <span>{{ copy.durationLabel }}</span>
              <strong>{{ safeInt(item.duration_min) }} {{ copy.minutes }}</strong>
            </div>
            <div class="metric-card">
              <span>{{ copy.zoneLabel }}</span>
              <strong>{{ item.zone || '—' }}</strong>
            </div>
            <div class="metric-card">
              <span>{{ copy.priceLabel }}</span>
              <strong>{{ money(item.price) }} UZS</strong>
            </div>
          </div>

          <div class="package-note">
            <Icon name="lucide:gauge" size="14" />
            <span>{{ copy.hourlyRate }}: {{ money(hourlyRate(item)) }} UZS</span>
          </div>

          <div class="package-actions">
            <button class="tiny-btn" type="button" @click="openEdit(item)">{{ copy.edit }}</button>
            <button class="tiny-btn" :class="item.is_active ? 'danger' : 'primary'" type="button" @click="togglePackage(item)">
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
              <select v-model="form.zone">
                <option value="" disabled>{{ copy.zonePick }}</option>
                <option v-for="zone in zones" :key="zone.id || zone.name" :value="zone.name">{{ zone.name }}</option>
              </select>
            </label>

            <label class="field">
              <span>{{ copy.fieldDuration }}</span>
              <input v-model.number="form.duration_min" type="number" min="1" />
              <div class="chip-row">
                <button v-for="value in [30,60,90,120,180,240]" :key="value" class="mini-chip" type="button" @click="setDuration(value)">{{ value }}</button>
              </div>
            </label>

            <label class="field">
              <span>{{ copy.fieldPrice }}</span>
              <input v-model.number="form.price" type="number" min="0" />
              <div class="chip-row">
                <button v-for="value in [5000,10000,20000,50000]" :key="value" class="mini-chip" type="button" @click="addPrice(value)">
                  + {{ money(value) }}
                </button>
              </div>
            </label>

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
                <strong>{{ form.zone || '—' }}</strong>
              </div>
              <div class="preview-row">
                <span>{{ copy.fieldDuration }}</span>
                <strong>{{ safeInt(form.duration_min) }} {{ copy.minutes }}</strong>
              </div>
              <div class="preview-row">
                <span>{{ copy.hoursLabel }}</span>
                <strong>{{ hoursText }}</strong>
              </div>
              <div class="preview-row">
                <span>{{ copy.priceLabel }}</span>
                <strong>{{ money(form.price) }} UZS</strong>
              </div>
              <div class="preview-row">
                <span>{{ copy.hourlyRate }}</span>
                <strong>{{ money(currentHourlyRate) }} UZS</strong>
              </div>
              <div class="preview-row">
                <span>{{ copy.minuteRate }}</span>
                <strong>{{ money(currentPerMinute) }} UZS</strong>
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

const packagesPageCopy = {
  uz: {
    headTitle: 'Paketlar',
    eyebrow: 'Commercial setup',
    title: 'Paketlar',
    subtitle: "Zona bo'yicha vaqt paketlarini boshqaring.",
    updatedAt: 'Yangilandi',
    refresh: 'Yangilash',
    refreshing: 'Yuklanmoqda...',
    add: "Paket qo'shish",
    totalRows: 'Jami',
    totalHint: "Ko'rinayotgan paketlar",
    activeRows: 'Faol',
    activeHint: 'Sotuvdagi paketlar',
    inactiveRows: "O'chirilgan",
    inactiveHint: "To'xtatilgan paketlar",
    filtersTitle: 'Filtrlar',
    filtersSubtitle: 'Holat, zona va nom bo‘yicha saralang.',
    statusLabel: 'Holat',
    statusAll: 'Barchasi',
    statusActive: 'Faol',
    statusInactive: "O'chirilgan",
    zoneLabel: 'Zona',
    zoneAll: 'Barcha zonalar',
    searchLabel: 'Qidiruv',
    searchPlaceholder: "Paket nomi bo'yicha qidiring...",
    perPageLabel: "Ko'rsatish",
    reset: 'Tozalash',
    apply: "Qo'llash",
    listTitle: "Paketlar ro'yxati",
    listSubtitle: "Zona, davomiylik va narx bir joyda.",
    empty: "Hozircha paketlar yo'q.",
    durationLabel: 'Davomiylik',
    minutes: 'min',
    priceLabel: 'Narx',
    hourlyRate: '1 soat narxi',
    minuteRate: '1 daqiqa narxi',
    edit: 'Tahrirlash',
    disable: "O'chirish",
    enable: 'Yoqish',
    page: 'Sahifa',
    prev: 'Oldingi',
    next: 'Keyingi',
    modalKicker: 'Package editor',
    modalCreate: 'Yangi paket',
    modalEdit: 'Paketni tahrirlash',
    modalSubtitle: 'Nom, zona, davomiylik va narxni kiriting.',
    fieldName: 'Paket nomi',
    fieldNamePlaceholder: 'Masalan: 3 soat VIP',
    zonePick: 'Zona tanlang',
    fieldDuration: 'Davomiylik (daqiqa)',
    fieldPrice: 'Narx (UZS)',
    fieldState: 'Holat',
    fieldStateActive: 'Faol',
    previewTitle: "Oldindan ko'rish",
    previewSubtitle: 'Operator uchun tez hisob-kitob.',
    hoursLabel: 'Soat',
    cancel: 'Bekor qilish',
    saving: 'Saqlanmoqda...',
    create: 'Yaratish',
    save: 'Saqlash',
    nameError: "Paket nomi kamida 2 belgidan iborat bo'lishi kerak.",
    zoneError: 'Zona tanlanishi kerak.',
    durationError: "Davomiylik 1 yoki undan katta bo'lishi kerak.",
    priceError: "Narx 0 yoki undan katta bo'lishi kerak.",
  },
  ru: {
    headTitle: 'Пакеты',
    eyebrow: 'Commercial setup',
    title: 'Пакеты',
    subtitle: 'Управляйте временными пакетами по зонам.',
    updatedAt: 'Обновлено',
    refresh: 'Обновить',
    refreshing: 'Загрузка...',
    add: 'Добавить пакет',
    totalRows: 'Всего',
    totalHint: 'Показанные пакеты',
    activeRows: 'Активные',
    activeHint: 'Пакеты в продаже',
    inactiveRows: 'Отключенные',
    inactiveHint: 'Остановленные пакеты',
    filtersTitle: 'Фильтры',
    filtersSubtitle: 'Сортируйте по статусу, зоне и названию.',
    statusLabel: 'Статус',
    statusAll: 'Все',
    statusActive: 'Активен',
    statusInactive: 'Отключен',
    zoneLabel: 'Зона',
    zoneAll: 'Все зоны',
    searchLabel: 'Поиск',
    searchPlaceholder: 'Найдите пакет по названию...',
    perPageLabel: 'Показывать',
    reset: 'Сбросить',
    apply: 'Применить',
    listTitle: 'Список пакетов',
    listSubtitle: 'Зона, длительность и цена в одном месте.',
    empty: 'Пакеты пока не созданы.',
    durationLabel: 'Длительность',
    minutes: 'мин',
    priceLabel: 'Цена',
    hourlyRate: 'Цена за час',
    minuteRate: 'Цена за минуту',
    edit: 'Изменить',
    disable: 'Отключить',
    enable: 'Включить',
    page: 'Страница',
    prev: 'Назад',
    next: 'Далее',
    modalKicker: 'Package editor',
    modalCreate: 'Новый пакет',
    modalEdit: 'Редактирование пакета',
    modalSubtitle: 'Введите название, зону, длительность и цену.',
    fieldName: 'Название пакета',
    fieldNamePlaceholder: 'Например: 3 часа VIP',
    zonePick: 'Выберите зону',
    fieldDuration: 'Длительность (минуты)',
    fieldPrice: 'Цена (UZS)',
    fieldState: 'Состояние',
    fieldStateActive: 'Активен',
    previewTitle: 'Предпросмотр',
    previewSubtitle: 'Быстрый расчет для оператора.',
    hoursLabel: 'Часы',
    cancel: 'Отмена',
    saving: 'Сохранение...',
    create: 'Создать',
    save: 'Сохранить',
    nameError: 'Название пакета должно быть не короче 2 символов.',
    zoneError: 'Нужно выбрать зону.',
    durationError: 'Длительность должна быть 1 или больше.',
    priceError: 'Цена должна быть 0 или больше.',
  },
  en: {
    headTitle: 'Packages',
    eyebrow: 'Commercial setup',
    title: 'Packages',
    subtitle: 'Manage time packages by zone.',
    updatedAt: 'Updated',
    refresh: 'Refresh',
    refreshing: 'Loading...',
    add: 'Add package',
    totalRows: 'Total',
    totalHint: 'Visible packages',
    activeRows: 'Active',
    activeHint: 'Packages on sale',
    inactiveRows: 'Disabled',
    inactiveHint: 'Stopped packages',
    filtersTitle: 'Filters',
    filtersSubtitle: 'Sort by state, zone, and package name.',
    statusLabel: 'Status',
    statusAll: 'All',
    statusActive: 'Active',
    statusInactive: 'Disabled',
    zoneLabel: 'Zone',
    zoneAll: 'All zones',
    searchLabel: 'Search',
    searchPlaceholder: 'Find a package by name...',
    perPageLabel: 'Per page',
    reset: 'Reset',
    apply: 'Apply',
    listTitle: 'Package list',
    listSubtitle: 'Zone, duration, and price in one place.',
    empty: 'No packages yet.',
    durationLabel: 'Duration',
    minutes: 'min',
    priceLabel: 'Price',
    hourlyRate: 'Hourly rate',
    minuteRate: 'Per minute',
    edit: 'Edit',
    disable: 'Disable',
    enable: 'Enable',
    page: 'Page',
    prev: 'Prev',
    next: 'Next',
    modalKicker: 'Package editor',
    modalCreate: 'New package',
    modalEdit: 'Edit package',
    modalSubtitle: 'Enter title, zone, duration, and price.',
    fieldName: 'Package name',
    fieldNamePlaceholder: 'For example: 3 hours VIP',
    zonePick: 'Choose zone',
    fieldDuration: 'Duration (minutes)',
    fieldPrice: 'Price (UZS)',
    fieldState: 'State',
    fieldStateActive: 'Active',
    previewTitle: 'Preview',
    previewSubtitle: 'Quick calculation for the operator.',
    hoursLabel: 'Hours',
    cancel: 'Cancel',
    saving: 'Saving...',
    create: 'Create',
    save: 'Save',
    nameError: 'Package name should be at least 2 characters long.',
    zoneError: 'Zone must be selected.',
    durationError: 'Duration should be at least 1.',
    priceError: 'Price should be 0 or greater.',
  },
}

const copy = useCpCopy(packagesPageCopy)

useHead({
  title: computed(() => `${copy.value.headTitle} - NEXORA CLOUD CP`),
})

const { formatMoney, formatDateTime } = useCpFormatters()

const loading = reactive({
  list: false,
  save: false,
})

const items = ref<any[]>([])
const zones = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const updatedAt = ref<string | null>(null)

const filters = reactive({
  active: '',
  zone: '',
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
  duration_min: 60,
  price: 0,
  zone: '',
  is_active: true,
})

const pages = computed(() => Math.max(1, Math.ceil((total.value || 0) / (perPage.value || 1))))
const activeCount = computed(() => items.value.filter((item) => !!item.is_active).length)
const inactiveCount = computed(() => Math.max(0, total.value - activeCount.value))
const updatedAtLabel = computed(() => (updatedAt.value ? formatDateTime(updatedAt.value) : '-'))
const filteredItems = computed(() => {
  let list = items.value.slice()
  if (filters.active !== '') {
    const active = filters.active === 'true'
    list = list.filter((item) => !!item.is_active === active)
  }
  if (filters.zone) {
    list = list.filter((item) => String(item.zone || '') === filters.zone)
  }
  const q = filters.q.trim().toLowerCase()
  if (q) list = list.filter((item) => String(item.name || '').toLowerCase().includes(q))
  return list
})

const hoursText = computed(() => {
  const hours = safeInt(form.duration_min) / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
})
const currentHourlyRate = computed(() => hourlyRate(form))
const currentPerMinute = computed(() => {
  const duration = Math.max(1, safeInt(form.duration_min))
  return Number(form.price || 0) / duration
})

function safeInt(value: any) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

function money(value: any) {
  return formatMoney(Number(value || 0))
}

function formatDT(value: any) {
  return value ? formatDateTime(value) : '—'
}

function hourlyRate(item: any) {
  const duration = Math.max(1, safeInt(item.duration_min))
  return (Number(item.price || 0) / duration) * 60
}

function setDuration(value: number) {
  form.duration_min = value
}

function addPrice(value: number) {
  form.price = Number(form.price || 0) + value
}

function resetFilters() {
  filters.active = ''
  filters.zone = ''
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

function resetForm() {
  form.name = ''
  form.duration_min = 60
  form.price = 0
  form.zone = ''
  form.is_active = true
}

function fillForm(item: any) {
  form.name = item?.name ?? ''
  form.duration_min = safeInt(item?.duration_min)
  form.price = Number(item?.price ?? 0)
  form.zone = item?.zone ?? ''
  form.is_active = !!item?.is_active
}

function openCreate() {
  resetForm()
  modal.mode = 'create'
  modal.id = null
  modal.error = ''
  modal.open = true
}

function openEdit(item: any) {
  fillForm(item)
  modal.mode = 'edit'
  modal.id = Number(item.id)
  modal.error = ''
  modal.open = true
}

function closeModal() {
  modal.open = false
  modal.error = ''
}

async function loadZones() {
  try {
    const response = await cpApi.zonesList({})
    const payload = response?.data?.data ?? response?.data ?? []
    zones.value = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
  } catch {
    zones.value = []
  }
}

async function reload() {
  loading.list = true
  try {
    perPage.value = Number(filters.per_page || 20)
    const params: Record<string, any> = {
      page: page.value,
      per_page: perPage.value,
    }
    if (filters.active !== '') params.active = filters.active
    if (filters.zone) params.zone = filters.zone
    if (filters.q) params.q = filters.q

    const response = await cpApi.packagesList(params)
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
  if (!form.name || form.name.trim().length < 2) {
    modal.error = copy.value.nameError
    return
  }
  if (!form.zone) {
    modal.error = copy.value.zoneError
    return
  }
  if (safeInt(form.duration_min) < 1) {
    modal.error = copy.value.durationError
    return
  }
  if (Number(form.price || 0) < 0) {
    modal.error = copy.value.priceError
    return
  }

  loading.save = true
  try {
    const payload = {
      name: form.name,
      duration_min: safeInt(form.duration_min),
      price: Number(form.price || 0),
      zone: form.zone,
      is_active: !!form.is_active,
    }

    if (modal.mode === 'create') await cpApi.packagesCreate(payload)
    else if (modal.id) await cpApi.packagesUpdate(modal.id, payload)

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

async function togglePackage(item: any) {
  loading.list = true
  try {
    await cpApi.packagesToggle(item.id)
    await reload()
  } finally {
    loading.list = false
  }
}

loadZones()
reload()
</script>

<style scoped>
.packages-page,
.stats-grid,
.hero-tools,
.filter-grid,
.packages-grid,
.editor-grid {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.hero-tools {
  grid-template-columns: repeat(2, max-content);
  align-items: center;
  gap: 10px;
}

.filter-grid {
  grid-template-columns: 220px 220px minmax(0, 1fr) 140px;
}

.field-span-2 {
  grid-column: span 2;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
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

.filters-actions,
.package-top,
.package-actions,
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
}

.packages-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.package-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--stroke);
  border-radius: 20px;
  background: var(--surface-soft);
}

.package-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.package-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
}

.package-title strong {
  display: block;
  font-size: 15px;
}

.package-title small {
  color: var(--text-muted);
  font-size: 12px;
}

.state-pill,
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

.state-pill.ok {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, var(--stroke));
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
}

.package-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  background: var(--surface);
}

.metric-card span {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.metric-card strong {
  color: var(--text);
  font-size: 14px;
}

.package-note {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
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
  min-height: 190px;
  border-radius: 20px;
  background: linear-gradient(120deg, color-mix(in srgb, var(--surface-soft) 86%, transparent), color-mix(in srgb, var(--surface) 88%, transparent), color-mix(in srgb, var(--surface-soft) 86%, transparent));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.pager-wrap {
  margin-top: 14px;
  display: flex;
  justify-content: center;
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
  width: min(880px, 100%);
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
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.9fr);
}

.editor-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--stroke);
  border-radius: 20px;
  background: var(--surface-soft);
}

.preview-card {
  align-content: start;
}

.preview-head strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text);
  font-size: 15px;
}

.preview-head small {
  color: var(--text-muted);
  font-size: 12px;
}

.preview-rows {
  display: grid;
  gap: 10px;
}

.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--surface);
}

.preview-row span {
  color: var(--text-muted);
  font-size: 12px;
}

.preview-row strong {
  color: var(--text);
  font-size: 13px;
  text-align: right;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mini-chip {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.check-line {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
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
  .stats-grid,
  .filter-grid,
  .packages-grid,
  .package-metrics,
  .editor-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .field-span-2 {
    grid-column: span 1;
  }
}

@media (max-width: 720px) {
  .hero-tools,
  .filters-actions,
  .package-top,
  .package-actions,
  .modal-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .skeleton-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
