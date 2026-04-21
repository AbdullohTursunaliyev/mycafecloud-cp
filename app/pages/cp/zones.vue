<template>
  <div class="zones-page">
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
        <CpStatCard compact tone="tone-blue" :label="copy.totalRows" :value="String(filteredItems.length)" :hint="copy.totalHint" />
        <CpStatCard compact tone="tone-green" :label="copy.activeRows" :value="String(activeCount)" :hint="copy.activeHint" />
        <CpStatCard compact tone="tone-amber" :label="copy.inactiveRows" :value="String(inactiveCount)" :hint="copy.inactiveHint" />
      </div>

      <div class="top-grid">
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
            <label class="field field-span-2">
              <span>{{ copy.searchLabel }}</span>
              <input v-model.trim="filters.q" :placeholder="copy.searchPlaceholder" />
            </label>
          </div>

          <div class="filters-actions">
            <button class="ghost-btn" type="button" @click="resetFilters">{{ copy.reset }}</button>
          </div>
        </CpPanelCard>

        <CpPanelCard :title="copy.logicTitle" :subtitle="copy.logicSubtitle">
          <div class="logic-list">
            <article class="logic-item">
              <Icon name="lucide:badge-dollar-sign" size="16" />
              <p>{{ copy.logicOne }}</p>
            </article>
            <article class="logic-item">
              <Icon name="lucide:monitor-up" size="16" />
              <p>{{ copy.logicTwo }}</p>
            </article>
            <article class="logic-item">
              <Icon name="lucide:clock-3" size="16" />
              <p>{{ copy.logicThree }}</p>
            </article>
          </div>
        </CpPanelCard>
      </div>

      <CpPanelCard :title="copy.listTitle" :subtitle="copy.listSubtitle">
        <div v-if="loading.list" class="state-box">
          <div class="skeleton-grid"><span v-for="i in 4" :key="i" class="skeleton-card" /></div>
        </div>
        <div v-else-if="!filteredItems.length" class="state-box">{{ copy.empty }}</div>
        <div v-else class="zones-grid">
          <article v-for="zone in filteredItems" :key="zone.id" class="zone-card">
            <div class="zone-top">
              <div class="zone-title">
                <div class="zone-icon">
                  <Icon name="lucide:map-pinned" size="16" />
                </div>
                <div>
                  <strong>{{ zone.name }}</strong>
                  <small>ID #{{ zone.id }}</small>
                </div>
              </div>

              <span class="state-pill" :class="zone.is_active ? 'ok' : 'muted'">
                {{ zone.is_active ? copy.statusActive : copy.statusInactive }}
              </span>
            </div>

            <div class="zone-price">
              <span>{{ copy.priceLabel }}</span>
              <strong>{{ money(zone.price_per_hour) }} UZS</strong>
            </div>

            <div class="zone-note">
              <Icon name="lucide:circle-dollar-sign" size="14" />
              <span>{{ copy.priceHint }}</span>
            </div>

            <div class="zone-actions">
              <button class="tiny-btn" type="button" @click="openEdit(zone)">{{ copy.edit }}</button>
              <button class="tiny-btn" :class="zone.is_active ? 'danger' : 'primary'" type="button" @click="toggleZone(zone)">
                {{ zone.is_active ? copy.disable : copy.enable }}
              </button>
            </div>
          </article>
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
          <label class="field">
            <span>{{ copy.fieldName }}</span>
            <input v-model.trim="form.name" :placeholder="copy.fieldNamePlaceholder" />
          </label>

          <label class="field">
            <span>{{ copy.fieldPrice }}</span>
            <input v-model.number="form.price_per_hour" type="number" min="0" :placeholder="copy.fieldPricePlaceholder" />
            <small>{{ copy.fieldPriceHint }}</small>
          </label>

          <label class="field field-span-2">
            <span>{{ copy.fieldState }}</span>
            <label class="check-line">
              <input v-model="form.is_active" type="checkbox" />
              <span>{{ copy.fieldStateActive }}</span>
            </label>
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
})

const zonesPageCopy = {
  uz: {
    headTitle: 'Zonalar',
    eyebrow: 'Pricing map',
    title: 'Zonalar',
    subtitle: 'Zona va tarif strukturasi boshqaruvini soddalashtiring.',
    updatedAt: 'Yangilandi',
    refresh: 'Yangilash',
    refreshing: 'Yuklanmoqda...',
    add: "Zona qo'shish",
    noAccessTitle: "Bu bo'lim yopiq",
    noAccessSubtitle: 'Zonalarni faqat owner yoki admin boshqaradi.',
    totalRows: 'Jami',
    totalHint: 'Ko‘rinayotgan zonalar',
    activeRows: 'Faol',
    activeHint: 'Ishlayotgan tariflar',
    inactiveRows: "O'chirilgan",
    inactiveHint: "To'xtatilgan tariflar",
    filtersTitle: 'Filtrlar',
    filtersSubtitle: 'Holat va nom bo‘yicha saralang.',
    statusLabel: 'Holat',
    statusAll: 'Barchasi',
    statusActive: 'Faol',
    statusInactive: "O'chirilgan",
    searchLabel: 'Qidiruv',
    searchPlaceholder: "Zona nomi bo'yicha qidiring...",
    reset: 'Tozalash',
    logicTitle: 'Tarif logikasi',
    logicSubtitle: 'Operatorga qisqa eslatma.',
    logicOne: 'Har bir zona uchun UZS/soat tarifi belgilanadi.',
    logicTwo: 'Kompyuterlar keyin shu zonaga biriktiriladi.',
    logicThree: 'Sessiya narxi kompyuter zonasidan olinadi.',
    listTitle: "Zonalar ro'yxati",
    listSubtitle: "Har bir zona uchun narx va holat ko'rinadi.",
    empty: "Hozircha zona yo'q.",
    priceLabel: '1 soat narxi',
    priceHint: 'Sessiya billingida shu tarif ishlatiladi.',
    edit: 'Tahrirlash',
    disable: "O'chirish",
    enable: 'Yoqish',
    modalKicker: 'Pricing editor',
    modalCreate: 'Yangi zona',
    modalEdit: 'Zonani tahrirlash',
    modalSubtitle: 'Zona nomi va 1 soatlik tarifni kiriting.',
    fieldName: 'Zona nomi',
    fieldNamePlaceholder: 'Masalan: VIP',
    fieldPrice: '1 soat narxi (UZS)',
    fieldPricePlaceholder: '0',
    fieldPriceHint: 'Masalan: 15000 = 15 000 UZS / soat',
    fieldState: 'Holat',
    fieldStateActive: 'Faol',
    cancel: 'Bekor qilish',
    saving: 'Saqlanmoqda...',
    create: 'Yaratish',
    save: 'Saqlash',
    nameError: "Zona nomi kamida 2 belgidan iborat bo'lishi kerak.",
    priceError: "Narx 0 yoki undan katta son bo'lishi kerak.",
  },
  ru: {
    headTitle: 'Зоны',
    eyebrow: 'Pricing map',
    title: 'Зоны',
    subtitle: 'Управляйте зоной и тарифной структурой в понятном виде.',
    updatedAt: 'Обновлено',
    refresh: 'Обновить',
    refreshing: 'Загрузка...',
    add: 'Добавить зону',
    noAccessTitle: 'Раздел закрыт',
    noAccessSubtitle: 'Зоны может менять только owner или admin.',
    totalRows: 'Всего',
    totalHint: 'Показанные зоны',
    activeRows: 'Активные',
    activeHint: 'Работающие тарифы',
    inactiveRows: 'Отключенные',
    inactiveHint: 'Остановленные тарифы',
    filtersTitle: 'Фильтры',
    filtersSubtitle: 'Отсортируйте по статусу и названию.',
    statusLabel: 'Статус',
    statusAll: 'Все',
    statusActive: 'Активна',
    statusInactive: 'Отключена',
    searchLabel: 'Поиск',
    searchPlaceholder: 'Найдите зону по названию...',
    reset: 'Сбросить',
    logicTitle: 'Логика тарифа',
    logicSubtitle: 'Короткая памятка оператору.',
    logicOne: 'Для каждой зоны задается цена UZS/час.',
    logicTwo: 'Потом ПК привязываются к этой зоне.',
    logicThree: 'Цена сессии берется из зоны компьютера.',
    listTitle: 'Список зон',
    listSubtitle: 'Цена и состояние каждой зоны в одном списке.',
    empty: 'Зоны пока не созданы.',
    priceLabel: 'Цена за час',
    priceHint: 'Этот тариф участвует в биллинге сессий.',
    edit: 'Изменить',
    disable: 'Отключить',
    enable: 'Включить',
    modalKicker: 'Pricing editor',
    modalCreate: 'Новая зона',
    modalEdit: 'Редактирование зоны',
    modalSubtitle: 'Укажите название зоны и цену за 1 час.',
    fieldName: 'Название зоны',
    fieldNamePlaceholder: 'Например: VIP',
    fieldPrice: 'Цена за 1 час (UZS)',
    fieldPricePlaceholder: '0',
    fieldPriceHint: 'Например: 15000 = 15 000 UZS / час',
    fieldState: 'Состояние',
    fieldStateActive: 'Активна',
    cancel: 'Отмена',
    saving: 'Сохранение...',
    create: 'Создать',
    save: 'Сохранить',
    nameError: 'Название зоны должно быть не короче 2 символов.',
    priceError: 'Цена должна быть числом 0 или больше.',
  },
  en: {
    headTitle: 'Zones',
    eyebrow: 'Pricing map',
    title: 'Zones',
    subtitle: 'Manage hall zones and hourly tariffs in a clear layout.',
    updatedAt: 'Updated',
    refresh: 'Refresh',
    refreshing: 'Loading...',
    add: 'Add zone',
    noAccessTitle: 'Access restricted',
    noAccessSubtitle: 'Only owner or admin can manage zones.',
    totalRows: 'Total',
    totalHint: 'Visible zones',
    activeRows: 'Active',
    activeHint: 'Running tariffs',
    inactiveRows: 'Disabled',
    inactiveHint: 'Stopped tariffs',
    filtersTitle: 'Filters',
    filtersSubtitle: 'Sort by name and active state.',
    statusLabel: 'Status',
    statusAll: 'All',
    statusActive: 'Active',
    statusInactive: 'Disabled',
    searchLabel: 'Search',
    searchPlaceholder: 'Find a zone by name...',
    reset: 'Reset',
    logicTitle: 'Tariff logic',
    logicSubtitle: 'Short note for the operator.',
    logicOne: 'Every zone has its own UZS/hour tariff.',
    logicTwo: 'PCs are assigned to a chosen zone.',
    logicThree: 'Session billing reads the tariff from the PC zone.',
    listTitle: 'Zone list',
    listSubtitle: 'Price and state for each zone in one place.',
    empty: 'No zones yet.',
    priceLabel: 'Price per hour',
    priceHint: 'This tariff is used in session billing.',
    edit: 'Edit',
    disable: 'Disable',
    enable: 'Enable',
    modalKicker: 'Pricing editor',
    modalCreate: 'New zone',
    modalEdit: 'Edit zone',
    modalSubtitle: 'Set the zone title and hourly price.',
    fieldName: 'Zone name',
    fieldNamePlaceholder: 'For example: VIP',
    fieldPrice: 'Hourly price (UZS)',
    fieldPricePlaceholder: '0',
    fieldPriceHint: 'Example: 15000 = 15 000 UZS / hour',
    fieldState: 'State',
    fieldStateActive: 'Active',
    cancel: 'Cancel',
    saving: 'Saving...',
    create: 'Create',
    save: 'Save',
    nameError: 'Zone name should be at least 2 characters long.',
    priceError: 'Price should be 0 or greater.',
  },
}

const copy = useCpCopy(zonesPageCopy)

useHead({
  title: computed(() => `${copy.value.headTitle} - NEXORA CLOUD CP`),
})

const auth = useCpAuthStore()
const { formatMoney, formatDateTime } = useCpFormatters()

const canAccess = computed(() => {
  const role = auth.operator?.role
  return role === 'admin' || role === 'owner'
})

const loading = reactive({
  list: false,
  save: false,
})

const items = ref<any[]>([])
const updatedAt = ref<string | null>(null)

const filters = reactive({
  active: '',
  q: '',
})

const modal = reactive({
  open: false,
  mode: 'create' as 'create' | 'edit',
  id: null as number | null,
  error: '',
})

const form = reactive({
  name: '',
  price_per_hour: 0,
  is_active: true,
})

const updatedAtLabel = computed(() => (updatedAt.value ? formatDateTime(updatedAt.value) : '-'))
const activeCount = computed(() => items.value.filter((item) => !!item.is_active).length)
const inactiveCount = computed(() => Math.max(0, items.value.length - activeCount.value))
const filteredItems = computed(() => {
  let list = items.value.slice()
  if (filters.active !== '') {
    const active = filters.active === 'true'
    list = list.filter((item) => !!item.is_active === active)
  }
  const q = filters.q.trim().toLowerCase()
  if (q) list = list.filter((item) => String(item.name || '').toLowerCase().includes(q))
  return list.sort((a, b) => {
    const aa = a.is_active ? 0 : 1
    const bb = b.is_active ? 0 : 1
    if (aa !== bb) return aa - bb
    return String(a.name || '').localeCompare(String(b.name || ''), 'ru')
  })
})

function money(value: any) {
  return formatMoney(Number(value || 0))
}

function resetFilters() {
  filters.active = ''
  filters.q = ''
}

function resetForm() {
  form.name = ''
  form.price_per_hour = 0
  form.is_active = true
}

function fillForm(item: any) {
  form.name = item?.name ?? ''
  form.price_per_hour = Number(item?.price_per_hour ?? 0)
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

async function reload() {
  if (!canAccess.value) return
  loading.list = true
  try {
    const params: Record<string, any> = {}
    if (filters.active !== '') params.active = filters.active
    const response = await cpApi.zoneList(params)
    const payload = response?.data?.data ?? response?.data ?? []
    items.value = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
    updatedAt.value = new Date().toISOString()
  } catch {
    items.value = []
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
  const pph = Number(form.price_per_hour || 0)
  if (!Number.isFinite(pph) || pph < 0) {
    modal.error = copy.value.priceError
    return
  }

  loading.save = true
  try {
    const payload = {
      name: form.name,
      price_per_hour: pph,
      is_active: !!form.is_active,
    }
    if (modal.mode === 'create') await cpApi.zoneCreate(payload)
    else if (modal.id) await cpApi.zoneUpdate(modal.id, payload)
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

async function toggleZone(item: any) {
  loading.list = true
  try {
    await cpApi.zoneToggle(item.id)
    await reload()
  } finally {
    loading.list = false
  }
}

reload()
</script>

<style scoped>
.zones-page,
.stats-grid,
.top-grid,
.hero-tools,
.filter-grid,
.logic-list,
.zones-grid,
.editor-grid {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.top-grid {
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr);
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
}

.guard-card p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.filter-grid {
  grid-template-columns: 220px minmax(0, 1fr);
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

.field small {
  color: var(--text-muted);
  font-size: 12px;
}

.filters-actions,
.zone-top,
.zone-actions,
.modal-head,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filters-actions {
  justify-content: flex-end;
}

.logic-list {
  gap: 12px;
}

.logic-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--stroke);
  border-radius: 18px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.logic-item p {
  margin: 0;
}

.zones-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.zone-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--stroke);
  border-radius: 20px;
  background: var(--surface-soft);
}

.zone-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zone-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
}

.zone-title strong {
  display: block;
  font-size: 15px;
}

.zone-title small {
  color: var(--text-muted);
  font-size: 12px;
}

.state-pill {
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

.zone-price {
  display: grid;
  gap: 6px;
}

.zone-price span {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.zone-price strong {
  color: var(--text);
  font-size: 24px;
  line-height: 1.1;
}

.zone-note {
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
  min-height: 180px;
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
  width: min(560px, 100%);
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
.tiny-btn {
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
  .stats-grid,
  .zones-grid,
  .editor-grid,
  .filter-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .field-span-2 {
    grid-column: span 1;
  }
}

@media (max-width: 720px) {
  .hero-tools,
  .modal-actions,
  .zone-top,
  .zone-actions,
  .filters-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .skeleton-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
