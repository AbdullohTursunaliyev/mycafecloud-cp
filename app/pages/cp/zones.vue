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

    <div v-if="showAccessGuard" class="guard-card">
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

      <CpPanelCard :title="copy.filtersTitle" :subtitle="copy.filtersSubtitle">
        <div class="filter-toolbar">
          <label class="field filter-status-field">
            <span>{{ copy.statusLabel }}</span>
            <select v-model="filters.active">
              <option value="">{{ copy.statusAll }}</option>
              <option value="true">{{ copy.statusActive }}</option>
              <option value="false">{{ copy.statusInactive }}</option>
            </select>
          </label>

          <label class="field filter-search-field">
            <span>{{ copy.searchLabel }}</span>
            <input v-model.trim="filters.q" :placeholder="copy.searchPlaceholder" />
          </label>

          <div class="filters-actions">
            <button class="ghost-btn" type="button" @click="resetFilters">{{ copy.reset }}</button>
          </div>
        </div>
      </CpPanelCard>

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
              <button class="tiny-btn" type="button" @click="openWindows(zone)">{{ copy.pricingWindows }}</button>
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

        <div class="editor-grid zone-editor-grid">
          <label class="field">
            <span>{{ copy.fieldName }}</span>
            <input v-model.trim="form.name" :placeholder="copy.fieldNamePlaceholder" />
          </label>

          <label class="field">
            <span>{{ copy.fieldPrice }}</span>
            <input v-model.number="form.price_per_hour" type="number" min="0" :placeholder="copy.fieldPricePlaceholder" />
            <small>{{ copy.fieldPriceHint }}</small>
          </label>

          <label class="field field-state">
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

    <div v-if="windows.open" class="overlay" @click.self="closeWindows">
      <div class="modal-shell modal-shell-wide">
        <div class="modal-head">
          <div>
            <p class="modal-kicker">{{ copy.windowsKicker }}</p>
            <h3>{{ txt(copy.windowsTitle, { zone: windows.zoneName || copy.zoneFallbackName }) }}</h3>
            <span>{{ copy.windowsSubtitle }}</span>
          </div>
          <button class="icon-btn" type="button" @click="closeWindows">
            <Icon name="lucide:x" size="16" />
          </button>
        </div>

        <div class="window-toolbar">
          <div class="window-summary">
            <span class="hero-meta-badge">{{ copy.priceLabel }}: {{ money(windows.zonePrice) }} UZS</span>
            <span class="hero-meta-badge">{{ copy.updatedAt }}: {{ windows.updatedAt ? formatDateTime(windows.updatedAt) : '-' }}</span>
          </div>
          <button class="primary-btn" type="button" :disabled="windows.loading || windows.saving" @click="openCreateWindow">
            <Icon name="lucide:plus" size="15" />
            <span>{{ copy.windowAdd }}</span>
          </button>
        </div>

        <p v-if="windows.error" class="panel-error">{{ windows.error }}</p>

        <div v-if="windows.loading" class="state-box compact-state">{{ copy.windowsLoading }}</div>
        <div v-else-if="!windows.items.length" class="state-box compact-state">{{ copy.windowsEmpty }}</div>
        <div v-else class="windows-grid">
          <article v-for="item in windows.items" :key="item.id" class="window-card">
            <div class="zone-top">
              <div>
                <strong>{{ item.name || copy.windowCreate }}</strong>
                <small>ID #{{ item.id }}</small>
              </div>

              <span class="state-pill" :class="item.is_active ? 'ok' : 'muted'">
                {{ item.is_active ? copy.statusActive : copy.statusInactive }}
              </span>
            </div>

            <div class="window-detail">
              <span>{{ copy.windowTimeRange }}</span>
              <strong>{{ windowTimeLabel(item) }}</strong>
            </div>

            <div class="window-detail">
              <span>{{ copy.windowDaysLabel }}</span>
              <strong>{{ weekdaysLabel(item.weekdays) }}</strong>
            </div>

            <div class="window-detail">
              <span>{{ copy.windowDateRange }}</span>
              <strong>{{ dateRangeLabel(item.starts_on, item.ends_on) }}</strong>
            </div>

            <div class="window-detail">
              <span>{{ copy.windowPrice }}</span>
              <strong>{{ money(item.price_per_hour) }} UZS</strong>
            </div>

            <div class="zone-actions">
              <button class="tiny-btn" type="button" :disabled="windows.saving" @click="openEditWindow(item)">{{ copy.edit }}</button>
              <button class="tiny-btn" :class="item.is_active ? 'danger' : 'primary'" type="button" :disabled="windows.saving" @click="toggleWindow(item)">
                {{ item.is_active ? copy.disable : copy.enable }}
              </button>
              <button class="tiny-btn danger" type="button" :disabled="windows.saving" @click="deleteWindow(item)">{{ copy.windowDelete }}</button>
            </div>
          </article>
        </div>

        <div v-if="windowEditor.open" class="window-editor-card">
          <div class="modal-head window-editor-head">
            <div>
              <p class="modal-kicker">{{ copy.windowsKicker }}</p>
              <h3>{{ windowEditor.mode === 'create' ? copy.windowCreate : copy.windowEdit }}</h3>
              <span>{{ copy.windowFormSubtitle }}</span>
            </div>
            <button class="icon-btn" type="button" @click="closeWindowEditor">
              <Icon name="lucide:x" size="16" />
            </button>
          </div>

          <div class="editor-grid window-form-grid">
            <label class="field field-span-2">
              <span>{{ copy.windowName }}</span>
              <input v-model.trim="windowForm.name" :placeholder="copy.windowNamePlaceholder" />
              <small>{{ copy.windowNameHint }}</small>
            </label>

            <label class="field">
              <span>{{ copy.windowStartsAt }}</span>
              <input v-model="windowForm.starts_at" type="time" />
            </label>

            <label class="field">
              <span>{{ copy.windowEndsAt }}</span>
              <input v-model="windowForm.ends_at" type="time" />
            </label>

            <label class="field">
              <span>{{ copy.windowStartsOn }}</span>
              <input v-model="windowForm.starts_on" type="date" />
              <small>{{ copy.windowDateHint }}</small>
            </label>

            <label class="field">
              <span>{{ copy.windowEndsOn }}</span>
              <input v-model="windowForm.ends_on" type="date" />
              <small>{{ copy.windowDateHint }}</small>
            </label>

            <label class="field field-span-2">
              <span>{{ copy.windowWeekdays }}</span>
              <div class="weekday-row">
                <button
                  v-for="(label, index) in copy.weekdayLabels"
                  :key="label"
                  class="weekday-chip"
                  :class="{ active: windowForm.weekdays.includes(index + 1) }"
                  type="button"
                  @click="toggleWeekday(index + 1)"
                >
                  {{ label }}
                </button>
              </div>
              <small>{{ copy.windowWeekdaysHint }}</small>
              <small>{{ weekdaysLabel(windowForm.weekdays) || copy.windowAllDays }}</small>
            </label>

            <label class="field">
              <span>{{ copy.windowPrice }}</span>
              <input v-model.number="windowForm.price_per_hour" type="number" min="0" />
              <small>{{ copy.windowPriceHint }}</small>
            </label>

            <label class="field field-state">
              <span>{{ copy.windowState }}</span>
              <label class="check-line">
                <input v-model="windowForm.is_active" type="checkbox" />
                <span>{{ copy.windowStateActive }}</span>
              </label>
            </label>
          </div>

          <p v-if="windowEditor.error" class="panel-error">{{ windowEditor.error }}</p>

          <div class="modal-actions">
            <button class="ghost-btn" type="button" :disabled="windows.saving" @click="closeWindowEditor">{{ copy.cancel }}</button>
            <button class="primary-btn" type="button" :disabled="windows.saving" @click="saveWindow">
              {{ windows.saving ? copy.saving : copy.save }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpAuthStore } from '@legacy/stores/cpAuth'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'

definePageMeta({
  layout: 'cp',
  roles: ['admin', 'owner'],
})

const zonesPageCopy = {
  uz: {
    headTitle: 'Zonalar',
    eyebrow: 'Tarif xaritasi',
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
    pricingWindows: 'Tarif oynalari',
    modalKicker: 'Tarif tahriri',
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
    requestError: "So'rov bajarilmadi.",
    windowsKicker: 'Dinamik tarif',
    windowsTitle: '{zone} uchun tarif oynalari',
    windowsSubtitle: 'Kun va vaqt bo‘yicha maxsus tariflarni boshqaring.',
    windowsEmpty: 'Bu zona uchun hali tarif oynasi yo‘q.',
    windowsLoading: 'Tarif oynalari yuklanmoqda...',
    windowAdd: 'Oyna qo‘shish',
    windowCreate: 'Yangi tarif oynasi',
    windowEdit: 'Tarif oynasini tahrirlash',
    windowFormSubtitle: 'Boshlanish/tugash vaqti, kunlar va alohida narxni kiriting.',
    windowName: 'Oyna nomi',
    windowNamePlaceholder: 'Masalan: Pik 18-23',
    windowNameHint: 'Ixtiyoriy. Operatorga bu qoida qachon ishlashini tushuntiradi.',
    windowStartsAt: 'Boshlanish vaqti',
    windowEndsAt: 'Tugash vaqti',
    windowStartsOn: 'Boshlanish sanasi',
    windowEndsOn: 'Tugash sanasi',
    windowDateRange: 'Amal qilish muddati',
    windowDateHint: 'Bo‘sh qoldirilsa, muddat cheklanmaydi.',
    windowWeekdays: 'Kunlar',
    windowWeekdaysHint: 'Hech narsa tanlanmasa, har kuni ishlaydi.',
    windowAllDays: 'Har kuni',
    windowAlwaysDate: 'Doimiy',
    windowPrice: 'Oyna narxi (UZS/soat)',
    windowPriceHint: 'Baza zona narxi o‘rniga shu narx ishlaydi.',
    windowState: 'Oyna holati',
    windowStateActive: 'Faol',
    windowTimeRange: 'Vaqt oralig‘i',
    windowDaysLabel: 'Ishlaydigan kunlar',
    windowDelete: "O'chirish",
    windowDeleteConfirm: '"{name}" tarif oynasi o‘chirilsinmi?',
    windowCreated: 'Tarif oynasi yaratildi.',
    windowUpdated: 'Tarif oynasi saqlandi.',
    windowDeleted: 'Tarif oynasi o‘chirildi.',
    windowNameError: "Oyna nomi kamida 2 belgidan iborat bo'lishi kerak.",
    windowTimeError: 'Boshlanish va tugash vaqti to‘g‘ri kiritilishi kerak.',
    windowDateError: 'Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas.',
    windowPriceError: "Oyna narxi 0 yoki undan katta son bo'lishi kerak.",
    zoneFallbackName: 'Zona',
    weekdayLabels: ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'],
  },
  ru: {
    headTitle: 'Зоны',
    eyebrow: 'Карта тарифов',
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
    pricingWindows: 'Тарифные окна',
    modalKicker: 'Редактор тарифа',
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
    requestError: 'Запрос не выполнен.',
    windowsKicker: 'Динамический тариф',
    windowsTitle: 'Тарифные окна для {zone}',
    windowsSubtitle: 'Управляйте специальными тарифами по дням и времени.',
    windowsEmpty: 'Для этой зоны пока нет тарифных окон.',
    windowsLoading: 'Загружаем тарифные окна...',
    windowAdd: 'Добавить окно',
    windowCreate: 'Новое тарифное окно',
    windowEdit: 'Редактирование тарифного окна',
    windowFormSubtitle: 'Укажите время начала/окончания, дни недели и отдельную цену.',
    windowName: 'Название окна',
    windowNamePlaceholder: 'Например: Пик 18-23',
    windowNameHint: 'Необязательно. Помогает оператору понять правило.',
    windowStartsAt: 'Время начала',
    windowEndsAt: 'Время окончания',
    windowStartsOn: 'Дата начала',
    windowEndsOn: 'Дата окончания',
    windowDateRange: 'Срок действия',
    windowDateHint: 'Если оставить пустым, срок не ограничен.',
    windowWeekdays: 'Дни недели',
    windowWeekdaysHint: 'Если ничего не выбрано, правило работает каждый день.',
    windowAllDays: 'Каждый день',
    windowAlwaysDate: 'Без ограничения',
    windowPrice: 'Цена окна (UZS/час)',
    windowPriceHint: 'Эта цена заменяет базовый тариф зоны.',
    windowState: 'Состояние окна',
    windowStateActive: 'Активна',
    windowTimeRange: 'Интервал времени',
    windowDaysLabel: 'Дни работы',
    windowDelete: 'Удалить',
    windowDeleteConfirm: 'Удалить тарифное окно "{name}"?',
    windowCreated: 'Тарифное окно создано.',
    windowUpdated: 'Тарифное окно сохранено.',
    windowDeleted: 'Тарифное окно удалено.',
    windowNameError: 'Название окна должно быть не короче 2 символов.',
    windowTimeError: 'Нужно корректно указать время начала и окончания.',
    windowDateError: 'Дата окончания не может быть раньше даты начала.',
    windowPriceError: 'Цена окна должна быть числом 0 или больше.',
    zoneFallbackName: 'Зона',
    weekdayLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  },
  en: {
    headTitle: 'Zones',
    eyebrow: 'Tariff map',
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
    pricingWindows: 'Pricing windows',
    modalKicker: 'Tariff editor',
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
    requestError: 'Request failed.',
    windowsKicker: 'Dynamic pricing',
    windowsTitle: 'Pricing windows for {zone}',
    windowsSubtitle: 'Manage day/time-specific tariff overrides.',
    windowsEmpty: 'No pricing windows for this zone yet.',
    windowsLoading: 'Loading pricing windows...',
    windowAdd: 'Add window',
    windowCreate: 'New window',
    windowEdit: 'Edit window',
    windowFormSubtitle: 'Set start/end time, weekdays, and an override price.',
    windowName: 'Window name',
    windowNamePlaceholder: 'Example: Peak 18-23',
    windowNameHint: 'Optional. Helps operators understand the rule.',
    windowStartsAt: 'Start time',
    windowEndsAt: 'End time',
    windowStartsOn: 'Start date',
    windowEndsOn: 'End date',
    windowDateRange: 'Validity period',
    windowDateHint: 'Leave empty if this tariff should stay open-ended.',
    windowWeekdays: 'Weekdays',
    windowWeekdaysHint: 'If nothing is selected, the rule runs every day.',
    windowAllDays: 'Every day',
    windowAlwaysDate: 'Always active',
    windowPrice: 'Window price (UZS/hour)',
    windowPriceHint: 'This price overrides the base zone tariff.',
    windowState: 'Window state',
    windowStateActive: 'Active',
    windowTimeRange: 'Time range',
    windowDaysLabel: 'Running days',
    windowDelete: 'Delete',
    windowDeleteConfirm: 'Delete window "{name}"?',
    windowCreated: 'Pricing window created.',
    windowUpdated: 'Pricing window saved.',
    windowDeleted: 'Pricing window deleted.',
    windowNameError: 'Window name should be at least 2 characters long.',
    windowTimeError: 'Start and end time must be valid.',
    windowDateError: 'End date cannot be earlier than start date.',
    windowPriceError: 'Window price should be 0 or greater.',
    zoneFallbackName: 'Zone',
    weekdayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
}

const copy = useCpCopy(zonesPageCopy)

useHead({
  title: computed(() => `${copy.value.headTitle} - NEXORA CLOUD CP`),
})

const auth = useCpAuthStore()
const { formatMoney, formatDate, formatDateTime } = useCpFormatters()

function txt(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`))
}

function errorText(error: any, fallback: string) {
  const message = error?.response?.data?.message
  const errors = error?.response?.data?.errors
  if (message) return message
  if (errors && typeof errors === 'object') return Object.values(errors).flat().join(' ')
  return fallback
}

const canAccess = computed(() => {
  const role = auth.operator?.role
  return role === 'admin' || role === 'owner'
})

const showAccessGuard = computed(() => Boolean(auth.operator) && !canAccess.value)

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

const windows = reactive({
  open: false,
  zoneId: null as number | null,
  zoneName: '',
  zonePrice: 0,
  loading: false,
  saving: false,
  error: '',
  updatedAt: null as string | null,
  items: [] as any[],
})

const windowEditor = reactive({
  open: false,
  mode: 'create' as 'create' | 'edit',
  id: null as number | null,
  error: '',
})

const windowForm = reactive({
  name: '',
  starts_at: '18:00',
  ends_at: '23:00',
  starts_on: '',
  ends_on: '',
  weekdays: [] as number[],
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

function normalizeTimeInput(value: any) {
  const raw = String(value || '').trim()
  if (!raw) return '--:--'
  return raw.slice(0, 5)
}

function weekdaysLabel(days: any) {
  const normalized = Array.isArray(days)
    ? days.map((day) => Number(day)).filter((day) => day >= 1 && day <= 7).sort((a, b) => a - b)
    : []

  if (!normalized.length) return copy.value.windowAllDays
  return normalized.map((day) => copy.value.weekdayLabels?.[day - 1] || String(day)).join(', ')
}

function windowTimeLabel(item: any) {
  return `${normalizeTimeInput(item?.starts_at)} - ${normalizeTimeInput(item?.ends_at)}`
}

function dateRangeLabel(startsOn: string | null | undefined, endsOn: string | null | undefined) {
  const start = startsOn ? formatDate(startsOn) : ''
  const end = endsOn ? formatDate(endsOn) : ''

  if (start && end) return `${start} - ${end}`
  if (start) return `${start} ->`
  if (end) return `-> ${end}`
  return copy.value.windowAlwaysDate
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

function resetWindowForm(defaultPrice = windows.zonePrice || 0) {
  windowForm.name = ''
  windowForm.starts_at = '18:00'
  windowForm.ends_at = '23:00'
  windowForm.starts_on = ''
  windowForm.ends_on = ''
  windowForm.weekdays = []
  windowForm.price_per_hour = Number(defaultPrice || 0)
  windowForm.is_active = true
}

function fillForm(item: any) {
  form.name = item?.name ?? ''
  form.price_per_hour = Number(item?.price_per_hour ?? 0)
  form.is_active = !!item?.is_active
}

function fillWindowForm(item: any) {
  windowForm.name = item?.name ?? ''
  windowForm.starts_at = normalizeTimeInput(item?.starts_at)
  windowForm.ends_at = normalizeTimeInput(item?.ends_at)
  windowForm.starts_on = String(item?.starts_on || '')
  windowForm.ends_on = String(item?.ends_on || '')
  windowForm.weekdays = Array.isArray(item?.weekdays)
    ? item.weekdays.map((day: any) => Number(day)).filter((day: number) => day >= 1 && day <= 7)
    : []
  windowForm.price_per_hour = Number(item?.price_per_hour ?? windows.zonePrice ?? 0)
  windowForm.is_active = !!item?.is_active
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

function closeWindowEditor() {
  windowEditor.open = false
  windowEditor.error = ''
}

function closeWindows() {
  windows.open = false
  windows.zoneId = null
  windows.zoneName = ''
  windows.zonePrice = 0
  windows.error = ''
  windows.updatedAt = null
  windows.items = []
  closeWindowEditor()
}

function openCreateWindow() {
  resetWindowForm()
  windowEditor.mode = 'create'
  windowEditor.id = null
  windowEditor.error = ''
  windowEditor.open = true
}

function openEditWindow(item: any) {
  fillWindowForm(item)
  windowEditor.mode = 'edit'
  windowEditor.id = Number(item.id)
  windowEditor.error = ''
  windowEditor.open = true
}

function toggleWeekday(day: number) {
  if (windowForm.weekdays.includes(day)) {
    windowForm.weekdays = windowForm.weekdays.filter((item) => item !== day)
    return
  }

  windowForm.weekdays = [...windowForm.weekdays, day].sort((a, b) => a - b)
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

async function reloadWindows() {
  if (!windows.zoneId) return

  windows.loading = true
  windows.error = ''
  try {
    const response = await cpApi.zonePricingWindows(windows.zoneId)
    const payload = response?.data?.data ?? response?.data ?? []
    windows.items = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
    windows.updatedAt = new Date().toISOString()
  } catch (error: any) {
    windows.items = []
    windows.error = errorText(error, copy.value.requestError)
  } finally {
    windows.loading = false
  }
}

async function openWindows(zone: any) {
  windows.zoneId = Number(zone.id)
  windows.zoneName = String(zone.name || `#${zone.id}`)
  windows.zonePrice = Number(zone.price_per_hour || 0)
  windows.error = ''
  windows.open = true
  closeWindowEditor()
  await reloadWindows()
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
    modal.error = errorText(error, copy.value.requestError)
  } finally {
    loading.save = false
  }
}

function windowPayload() {
  return {
    name: windowForm.name.trim() ? windowForm.name.trim() : null,
    starts_at: windowForm.starts_at,
    ends_at: windowForm.ends_at,
    starts_on: windowForm.starts_on || null,
    ends_on: windowForm.ends_on || null,
    weekdays: [...windowForm.weekdays],
    price_per_hour: Number(windowForm.price_per_hour || 0),
    is_active: !!windowForm.is_active,
  }
}

function validateWindow() {
  windowEditor.error = ''

  if (windowForm.name.trim() && windowForm.name.trim().length < 2) {
    windowEditor.error = copy.value.windowNameError
    return false
  }
  if (!windowForm.starts_at || !windowForm.ends_at) {
    windowEditor.error = copy.value.windowTimeError
    return false
  }
  if (windowForm.starts_on && windowForm.ends_on && windowForm.starts_on > windowForm.ends_on) {
    windowEditor.error = copy.value.windowDateError
    return false
  }

  const pph = Number(windowForm.price_per_hour || 0)
  if (!Number.isFinite(pph) || pph < 0) {
    windowEditor.error = copy.value.windowPriceError
    return false
  }

  return true
}

async function saveWindow() {
  if (!windows.zoneId || !validateWindow()) return

  windows.saving = true
  try {
    if (windowEditor.mode === 'create') {
      await cpApi.zonePricingWindowCreate(windows.zoneId, windowPayload())
      ElMessage.success(copy.value.windowCreated)
    } else if (windowEditor.id) {
      await cpApi.zonePricingWindowUpdate(windows.zoneId, windowEditor.id, windowPayload())
      ElMessage.success(copy.value.windowUpdated)
    }

    closeWindowEditor()
    await reloadWindows()
  } catch (error: any) {
    windowEditor.error = errorText(error, copy.value.requestError)
  } finally {
    windows.saving = false
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

async function toggleWindow(item: any) {
  if (!windows.zoneId) return

  windows.saving = true
  windows.error = ''
  try {
    await cpApi.zonePricingWindowToggle(windows.zoneId, item.id)
    await reloadWindows()
  } catch (error: any) {
    windows.error = errorText(error, copy.value.requestError)
  } finally {
    windows.saving = false
  }
}

async function deleteWindow(item: any) {
  if (!windows.zoneId) return

  try {
    await ElMessageBox.confirm(
      txt(copy.value.windowDeleteConfirm, { name: item.name || `#${item.id}` }),
      copy.value.windowDelete,
      {
        type: 'warning',
        confirmButtonText: copy.value.windowDelete,
        cancelButtonText: copy.value.cancel,
      },
    )
  } catch {
    return
  }

  windows.saving = true
  windows.error = ''
  try {
    await cpApi.zonePricingWindowDelete(windows.zoneId, item.id)
    if (windowEditor.id === Number(item.id)) closeWindowEditor()
    ElMessage.success(copy.value.windowDeleted)
    await reloadWindows()
  } catch (error: any) {
    windows.error = errorText(error, copy.value.requestError)
  } finally {
    windows.saving = false
  }
}

async function ensureInitialLoad() {
  if (!canAccess.value || loading.list || items.value.length) return
  await reload()
}

watch(canAccess, (allowed) => {
  if (allowed) {
    void ensureInitialLoad()
  }
})

onMounted(() => {
  void ensureInitialLoad()
})
</script>

<style scoped>
.zones-page,
.stats-grid,
.hero-tools,
.zones-grid,
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

.filter-toolbar {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) max-content;
  align-items: end;
  gap: 14px;
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

.field > input,
.field > select {
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

.zone-editor-grid,
.window-form-grid {
  align-items: start;
}

.field-state {
  align-self: end;
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
  align-self: end;
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

.hero-meta-badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--stroke);
  border-radius: 999px;
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

.modal-shell-wide {
  width: min(980px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
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
  justify-content: space-between;
  gap: 14px;
  width: min(280px, 100%);
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.check-line input[type='checkbox'] {
  width: 20px;
  height: 20px;
  min-height: 20px;
  margin: 0;
  padding: 0;
  flex: 0 0 auto;
  accent-color: color-mix(in srgb, var(--accent) 68%, white);
}

.check-line input[type='checkbox']:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 48%, white);
  outline-offset: 2px;
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

.window-toolbar,
.window-summary,
.weekday-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.window-toolbar {
  align-items: center;
  justify-content: space-between;
}

.compact-state {
  min-height: 120px;
}

.windows-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.window-card,
.window-editor-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--stroke);
  border-radius: 22px;
  background: var(--surface-soft);
}

.window-card small {
  color: var(--text-muted);
  font-size: 12px;
}

.window-detail {
  display: grid;
  gap: 6px;
}

.window-detail span {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.window-detail strong {
  color: var(--text);
  font-size: 15px;
  line-height: 1.3;
}

.window-editor-head h3 {
  font-size: 24px;
}

.weekday-chip {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.weekday-chip.active {
  border-color: color-mix(in srgb, var(--accent) 34%, var(--stroke));
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
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
  .stats-grid,
  .zones-grid,
  .windows-grid,
  .editor-grid,
  .filter-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .field-span-2 {
    grid-column: span 1;
  }
}

@media (max-width: 720px) {
  .hero-tools,
  .window-toolbar,
  .window-summary,
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
