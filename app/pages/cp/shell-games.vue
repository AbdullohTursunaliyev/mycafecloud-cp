<template>
  <div class="shell-games-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="hero-meta-badge">{{ copy.updatedAt }}: {{ updatedAtLabel }}</span>
        <span class="hero-meta-badge">{{ copy.totalGames }}: {{ games.length }}</span>
      </template>
      <template #actions>
        <div class="hero-tools">
          <button class="ghost-btn" type="button" :disabled="loading.list" @click="refreshAll">
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

    <CpPanelCard :title="copy.filtersTitle" :subtitle="copy.filtersSubtitle">
      <div class="filter-grid">
        <label class="field field-span-2">
          <span>{{ copy.filterSearch }}</span>
          <input v-model.trim="filters.q" :placeholder="copy.filterSearchPlaceholder" @keydown.enter="applyFilters" />
        </label>
        <label class="field">
          <span>{{ copy.filterCategory }}</span>
          <select v-model="filters.category" @change="applyFilters">
            <option value="">{{ copy.statusAll }}</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ copy.filterLauncher }}</span>
          <select v-model="filters.launcher" @change="applyFilters">
            <option value="">{{ copy.statusAll }}</option>
            <option v-for="launcher in launchers" :key="launcher" :value="launcher">{{ launcher }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ copy.filterStatus }}</span>
          <select v-model="filters.status">
            <option value="all">{{ copy.statusAll }}</option>
            <option value="active">{{ copy.statusActive }}</option>
            <option value="inactive">{{ copy.statusInactive }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ copy.filterPc }}</span>
          <select v-model="filters.pc_id" @change="applyFilters">
            <option value="">{{ copy.noPc }}</option>
            <option v-for="pc in pcs" :key="pc.id" :value="String(pc.id)">{{ pc.code }} ({{ pc.zone || '-' }})</option>
          </select>
        </label>
      </div>

      <div class="filters-actions">
        <button class="ghost-btn" type="button" @click="resetFilters">{{ copy.reset }}</button>
        <button class="primary-btn" type="button" :disabled="loading.list" @click="applyFilters">{{ copy.apply }}</button>
      </div>

      <div class="stats-grid">
        <CpStatCard compact tone="tone-blue" :label="copy.totalGames" :value="String(games.length)" :hint="copy.totalHint" />
        <CpStatCard compact tone="tone-green" :label="copy.activeGames" :value="String(activeCount)" :hint="copy.activeHint" />
        <CpStatCard compact tone="tone-amber" :label="copy.installedGames" :value="String(installedCount)" :hint="selectedPcLabel" />
      </div>
    </CpPanelCard>

    <CpPanelCard :title="copy.listTitle" :subtitle="copy.listSubtitle">
      <div v-if="loading.list" class="state-box">
        <div class="skeleton-grid"><span v-for="i in 6" :key="i" class="skeleton-card" /></div>
      </div>
      <div v-else-if="!filteredGames.length" class="state-box">{{ copy.empty }}</div>
      <div v-else class="table-shell">
        <table class="games-table">
          <thead>
            <tr>
              <th>{{ copy.game }}</th>
              <th>{{ copy.category }}</th>
              <th>{{ copy.launcher }}</th>
              <th>{{ copy.launchCommand }}</th>
              <th>{{ copy.state }}</th>
              <th>{{ copy.sort }}</th>
              <th class="right">{{ copy.actions }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="game in filteredGames" :key="game.id">
              <td>
                <div class="game-title">
                  <Icon name="lucide:gamepad-2" size="15" />
                  <div>
                    <strong>{{ game.title }}</strong>
                    <small>{{ game.slug }}</small>
                  </div>
                </div>
              </td>
              <td>{{ game.category || '-' }}</td>
              <td>{{ game.launcher || '-' }}</td>
              <td class="mono cmd">{{ game.launch_command || '-' }}</td>
              <td>
                <div class="state-col">
                  <span class="pill" :class="game.is_active ? 'ok' : 'muted'">
                    {{ game.is_active ? copy.active : copy.inactive }}
                  </span>
                  <span v-if="filters.pc_id" class="pill" :class="installClass(game.install?.is_installed)">
                    {{ installText(game.install?.is_installed) }}
                  </span>
                </div>
              </td>
              <td>{{ game.sort_order }}</td>
              <td class="right">
                <div class="row-actions">
                  <button class="tiny-btn" type="button" @click="openEdit(game)">{{ copy.edit }}</button>
                  <button class="tiny-btn" type="button" :disabled="!filters.pc_id" @click="openPcState(game)">{{ copy.setPcState }}</button>
                  <button class="tiny-btn" :class="game.is_active ? 'danger' : 'primary'" type="button" @click="toggleGame(game)">
                    {{ game.is_active ? copy.disable : copy.enable }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CpPanelCard>

    <div v-if="editor.open" class="overlay" @click.self="closeEditor">
      <div class="modal-shell">
        <div class="modal-head">
          <div>
            <p class="modal-kicker">{{ copy.editorKicker }}</p>
            <h3>{{ editor.mode === 'create' ? copy.modalCreate : copy.modalEdit }}</h3>
          </div>
          <button class="icon-btn" type="button" @click="closeEditor">
            <Icon name="lucide:x" size="16" />
          </button>
        </div>

        <div class="editor-grid">
          <label class="field">
            <span>{{ copy.fieldSlug }}</span>
            <input v-model.trim="editor.form.slug" />
          </label>
          <label class="field">
            <span>{{ copy.fieldTitle }}</span>
            <input v-model.trim="editor.form.title" />
          </label>
          <label class="field">
            <span>{{ copy.fieldSort }}</span>
            <input v-model.number="editor.form.sort_order" type="number" min="0" />
          </label>
          <label class="field">
            <span>{{ copy.fieldCategory }}</span>
            <input v-model.trim="editor.form.category" />
          </label>
          <label class="field">
            <span>{{ copy.fieldLauncher }}</span>
            <input v-model.trim="editor.form.launcher" />
          </label>
          <label class="field">
            <span>{{ copy.fieldLauncherIcon }}</span>
            <input v-model.trim="editor.form.launcher_icon" />
          </label>
          <label class="field field-span-2">
            <span>{{ copy.fieldNote }}</span>
            <input v-model.trim="editor.form.note" />
          </label>
          <div class="preset-card field-span-2">
            <div class="preset-head">
              <strong>{{ copy.launchPresetTitle }}</strong>
              <small>{{ copy.launchPresetHint }}</small>
            </div>
            <div class="preset-grid">
              <select v-model="editor.form.launch_mode">
                <option value="steam">{{ copy.launchPresetSteam }}</option>
                <option value="riot">{{ copy.launchPresetRiot }}</option>
                <option value="epic">{{ copy.launchPresetEpic }}</option>
                <option value="custom">{{ copy.launchPresetCustom }}</option>
              </select>
              <input v-model.trim="editor.form.launch_target" :placeholder="copy.launchTargetPlaceholder" />
              <button class="ghost-btn" type="button" @click="generateLaunchCommand">{{ copy.generateCommand }}</button>
            </div>
          </div>
          <label class="field field-span-2">
            <span>{{ copy.fieldLaunchCommand }}</span>
            <input v-model.trim="editor.form.launch_command" class="mono" />
          </label>
          <label class="field field-span-2">
            <span>{{ copy.fieldLaunchArgs }}</span>
            <input v-model.trim="editor.form.launch_args" class="mono" />
          </label>
          <label class="field field-span-2">
            <span>{{ copy.fieldImage }}</span>
            <input v-model.trim="editor.form.image_url" />
          </label>
          <label class="field field-span-2">
            <span>{{ copy.fieldHero }}</span>
            <input v-model.trim="editor.form.hero_url" />
          </label>
          <label class="field field-span-2">
            <span>{{ copy.fieldTrailer }}</span>
            <input v-model.trim="editor.form.trailer_url" />
          </label>
          <label class="field field-span-2">
            <span>{{ copy.fieldWebsite }}</span>
            <input v-model.trim="editor.form.website_url" />
          </label>
          <label class="field field-span-2">
            <span>{{ copy.fieldHelp }}</span>
            <textarea v-model.trim="editor.form.help_text" rows="4"></textarea>
          </label>
          <label class="check-line field-span-2">
            <input v-model="editor.form.is_active" type="checkbox" />
            <span>{{ copy.fieldActive }}</span>
          </label>
        </div>

        <p v-if="editor.error" class="panel-error">{{ editor.error }}</p>

        <div class="modal-actions">
          <button class="ghost-btn" type="button" @click="closeEditor">{{ copy.cancel }}</button>
          <button class="primary-btn" type="button" :disabled="loading.save" @click="saveGame">{{ copy.save }}</button>
        </div>
      </div>
    </div>

    <div v-if="pcState.open" class="overlay" @click.self="closePcState">
      <div class="modal-shell small">
        <div class="modal-head">
          <div>
            <p class="modal-kicker">{{ copy.pcStateKicker }}</p>
            <h3>{{ copy.pcStateTitle }}</h3>
          </div>
          <button class="icon-btn" type="button" @click="closePcState">
            <Icon name="lucide:x" size="16" />
          </button>
        </div>

        <div class="pc-state-summary">
          <div class="meta-box">
            <span>{{ copy.filterPc }}</span>
            <strong>{{ selectedPcLabel }}</strong>
          </div>
          <div class="meta-box">
            <span>{{ copy.game }}</span>
            <strong>{{ pcState.game_title }}</strong>
          </div>
        </div>

        <div class="editor-grid one-col">
          <label class="field">
            <span>{{ copy.fieldInstalled }}</span>
            <select v-model="pcState.is_installed">
              <option :value="true">{{ copy.yes }}</option>
              <option :value="false">{{ copy.no }}</option>
            </select>
          </label>
          <label class="field">
            <span>{{ copy.fieldVersion }}</span>
            <input v-model.trim="pcState.version" />
          </label>
          <label class="field">
            <span>{{ copy.fieldError }}</span>
            <input v-model.trim="pcState.last_error" />
          </label>
        </div>

        <p v-if="pcState.error" class="panel-error">{{ pcState.error }}</p>

        <div class="modal-actions">
          <button class="ghost-btn" type="button" @click="closePcState">{{ copy.cancel }}</button>
          <button class="primary-btn" type="button" :disabled="loading.pcState" @click="savePcState">{{ copy.save }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { cpApi } from '@legacy/api/cp'
import { useCpCopy } from '../../../composables/useCpCopy'

definePageMeta({
  layout: 'cp',
})

const messages = {
  uz: {
    eyebrow: 'SHELL CATALOG',
    title: 'Shell o‘yinlar katalogi',
    subtitle: 'Kartalar, trailer va launch command bilan shell uchun o‘yin ro‘yxatini boshqaring.',
    updatedAt: 'Yangilandi',
    totalGames: 'Jami o‘yinlar',
    refreshing: 'Yangilanmoqda',
    refresh: 'Yangilash',
    add: 'O‘yin qo‘shish',
    filtersTitle: 'Filtrlar',
    filtersSubtitle: 'Qidiruv, kategoriya va PC install holati bo‘yicha ko‘ring.',
    filterSearch: 'Qidiruv',
    filterSearchPlaceholder: 'Nomi yoki slug bo‘yicha qidiring',
    filterCategory: 'Kategoriya',
    filterLauncher: 'Launcher',
    filterStatus: 'Status',
    filterPc: 'PC',
    statusAll: 'Hammasi',
    statusActive: 'Faol',
    statusInactive: 'Nofaol',
    noPc: 'PC tanlanmagan',
    reset: 'Tozalash',
    apply: 'Qo‘llash',
    totalHint: 'Katalogdagi yozuvlar',
    activeGames: 'Faol o‘yinlar',
    activeHint: 'Shell ichida ko‘rinadi',
    installedGames: 'Tanlangan PC da',
    listTitle: 'O‘yinlar ro‘yxati',
    listSubtitle: 'Compact jadval va tezkor actionlar.',
    game: 'O‘yin',
    category: 'Kategoriya',
    launcher: 'Launcher',
    launchCommand: 'Launch command',
    state: 'Holat',
    sort: 'Sort',
    actions: 'Amallar',
    active: 'Faol',
    inactive: 'O‘chirilgan',
    installed: 'O‘rnatilgan',
    notInstalled: 'O‘rnatilmagan',
    unknownInstall: 'Noaniq',
    edit: 'Tahrirlash',
    setPcState: 'PC holati',
    disable: 'O‘chirish',
    enable: 'Yoqish',
    empty: 'O‘yinlar topilmadi.',
    editorKicker: 'GAME EDITOR',
    modalCreate: 'Yangi o‘yin',
    modalEdit: 'O‘yinni tahrirlash',
    fieldSlug: 'Slug',
    fieldTitle: 'Nomi',
    fieldSort: 'Sort order',
    fieldCategory: 'Kategoriya',
    fieldLauncher: 'Launcher',
    fieldLauncherIcon: 'Launcher ikonka',
    fieldNote: 'Qisqa izoh',
    launchPresetTitle: 'Launch yordamchisi',
    launchPresetHint: 'Steam, Riot yoki Epic uchun commandni tez yig‘ing.',
    launchPresetSteam: 'Steam',
    launchPresetRiot: 'Riot',
    launchPresetEpic: 'Epic',
    launchPresetCustom: 'Custom',
    launchTargetPlaceholder: 'App id yoki target',
    generateCommand: 'Command yaratish',
    fieldLaunchCommand: 'Launch command',
    fieldLaunchArgs: 'Launch args',
    fieldImage: 'Image URL',
    fieldHero: 'Hero URL',
    fieldTrailer: 'Trailer URL',
    fieldWebsite: 'Website URL',
    fieldHelp: 'Help text',
    fieldActive: 'Faol holatda qoldirish',
    cancel: 'Bekor qilish',
    save: 'Saqlash',
    pcStateKicker: 'PC INSTALL STATE',
    pcStateTitle: 'PC holatini sozlash',
    fieldInstalled: 'O‘rnatilganmi',
    fieldVersion: 'Versiya',
    fieldError: 'Oxirgi xato',
    yes: 'Ha',
    no: 'Yo‘q',
    errLoad: 'Maʼlumotlarni yuklab bo‘lmadi',
    errSave: 'Saqlashda xato',
    errPcState: 'PC holati saqlanmadi',
    okSaved: 'O‘yin saqlandi',
    okToggled: 'Holat yangilandi',
    okPcState: 'PC holati saqlandi',
    selectPcFirst: 'Avval PC ni tanlang',
  },
  ru: {
    eyebrow: 'SHELL CATALOG',
    title: 'Каталог игр Shell',
    subtitle: 'Управляйте списком игр для Shell: карточки, трейлеры и launch command.',
    updatedAt: 'Обновлено',
    totalGames: 'Всего игр',
    refreshing: 'Обновление',
    refresh: 'Обновить',
    add: 'Добавить игру',
    filtersTitle: 'Фильтры',
    filtersSubtitle: 'Поиск, категория и состояние установки по ПК.',
    filterSearch: 'Поиск',
    filterSearchPlaceholder: 'Название или slug',
    filterCategory: 'Категория',
    filterLauncher: 'Лаунчер',
    filterStatus: 'Статус',
    filterPc: 'ПК',
    statusAll: 'Все',
    statusActive: 'Активные',
    statusInactive: 'Неактивные',
    noPc: 'ПК не выбран',
    reset: 'Сброс',
    apply: 'Применить',
    totalHint: 'Записи каталога',
    activeGames: 'Активные игры',
    activeHint: 'Показываются в Shell',
    installedGames: 'На выбранном ПК',
    listTitle: 'Список игр',
    listSubtitle: 'Компактная таблица и быстрые действия.',
    game: 'Игра',
    category: 'Категория',
    launcher: 'Лаунчер',
    launchCommand: 'Launch command',
    state: 'Статус',
    sort: 'Сорт',
    actions: 'Действия',
    active: 'Активна',
    inactive: 'Отключена',
    installed: 'Установлена',
    notInstalled: 'Не установлена',
    unknownInstall: 'Неизвестно',
    edit: 'Изменить',
    setPcState: 'Состояние ПК',
    disable: 'Отключить',
    enable: 'Включить',
    empty: 'Игры не найдены.',
    editorKicker: 'GAME EDITOR',
    modalCreate: 'Новая игра',
    modalEdit: 'Редактирование игры',
    fieldSlug: 'Slug',
    fieldTitle: 'Название',
    fieldSort: 'Sort order',
    fieldCategory: 'Категория',
    fieldLauncher: 'Лаунчер',
    fieldLauncherIcon: 'Иконка лаунчера',
    fieldNote: 'Короткая заметка',
    launchPresetTitle: 'Помощник launch',
    launchPresetHint: 'Быстро собирает command для Steam, Riot и Epic.',
    launchPresetSteam: 'Steam',
    launchPresetRiot: 'Riot',
    launchPresetEpic: 'Epic',
    launchPresetCustom: 'Custom',
    launchTargetPlaceholder: 'App id или target',
    generateCommand: 'Сгенерировать',
    fieldLaunchCommand: 'Launch command',
    fieldLaunchArgs: 'Launch args',
    fieldImage: 'Image URL',
    fieldHero: 'Hero URL',
    fieldTrailer: 'Trailer URL',
    fieldWebsite: 'Website URL',
    fieldHelp: 'Help text',
    fieldActive: 'Оставить активной',
    cancel: 'Отмена',
    save: 'Сохранить',
    pcStateKicker: 'PC INSTALL STATE',
    pcStateTitle: 'Состояние установки на ПК',
    fieldInstalled: 'Установлена',
    fieldVersion: 'Версия',
    fieldError: 'Последняя ошибка',
    yes: 'Да',
    no: 'Нет',
    errLoad: 'Не удалось загрузить данные',
    errSave: 'Не удалось сохранить',
    errPcState: 'Не удалось сохранить состояние ПК',
    okSaved: 'Игра сохранена',
    okToggled: 'Статус обновлен',
    okPcState: 'Состояние ПК сохранено',
    selectPcFirst: 'Сначала выберите ПК',
  },
  en: {
    eyebrow: 'SHELL CATALOG',
    title: 'Shell games catalog',
    subtitle: 'Manage Shell game cards, trailers and launch commands in a cleaner Nuxt workspace.',
    updatedAt: 'Updated',
    totalGames: 'Total games',
    refreshing: 'Refreshing',
    refresh: 'Refresh',
    add: 'Add game',
    filtersTitle: 'Filters',
    filtersSubtitle: 'Search, category and install state by PC.',
    filterSearch: 'Search',
    filterSearchPlaceholder: 'Search by title or slug',
    filterCategory: 'Category',
    filterLauncher: 'Launcher',
    filterStatus: 'Status',
    filterPc: 'PC',
    statusAll: 'All',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    noPc: 'No PC selected',
    reset: 'Reset',
    apply: 'Apply',
    totalHint: 'Catalog entries',
    activeGames: 'Active games',
    activeHint: 'Visible in Shell',
    installedGames: 'Installed on PC',
    listTitle: 'Games list',
    listSubtitle: 'Compact table with quick actions.',
    game: 'Game',
    category: 'Category',
    launcher: 'Launcher',
    launchCommand: 'Launch command',
    state: 'State',
    sort: 'Sort',
    actions: 'Actions',
    active: 'Active',
    inactive: 'Disabled',
    installed: 'Installed',
    notInstalled: 'Not installed',
    unknownInstall: 'Unknown',
    edit: 'Edit',
    setPcState: 'PC state',
    disable: 'Disable',
    enable: 'Enable',
    empty: 'No games found.',
    editorKicker: 'GAME EDITOR',
    modalCreate: 'Create game',
    modalEdit: 'Edit game',
    fieldSlug: 'Slug',
    fieldTitle: 'Title',
    fieldSort: 'Sort order',
    fieldCategory: 'Category',
    fieldLauncher: 'Launcher',
    fieldLauncherIcon: 'Launcher icon',
    fieldNote: 'Short note',
    launchPresetTitle: 'Launch helper',
    launchPresetHint: 'Generate command for Steam, Riot or Epic quickly.',
    launchPresetSteam: 'Steam',
    launchPresetRiot: 'Riot',
    launchPresetEpic: 'Epic',
    launchPresetCustom: 'Custom',
    launchTargetPlaceholder: 'App id or target',
    generateCommand: 'Generate command',
    fieldLaunchCommand: 'Launch command',
    fieldLaunchArgs: 'Launch args',
    fieldImage: 'Image URL',
    fieldHero: 'Hero URL',
    fieldTrailer: 'Trailer URL',
    fieldWebsite: 'Website URL',
    fieldHelp: 'Help text',
    fieldActive: 'Keep active',
    cancel: 'Cancel',
    save: 'Save',
    pcStateKicker: 'PC INSTALL STATE',
    pcStateTitle: 'Set PC install state',
    fieldInstalled: 'Installed',
    fieldVersion: 'Version',
    fieldError: 'Last error',
    yes: 'Yes',
    no: 'No',
    errLoad: 'Failed to load data',
    errSave: 'Failed to save game',
    errPcState: 'Failed to save PC state',
    okSaved: 'Game saved',
    okToggled: 'State updated',
    okPcState: 'PC state saved',
    selectPcFirst: 'Select a PC first',
  },
}

const copy = useCpCopy(messages)

useHead({
  title: computed(() => `${copy.value.title} - NEXORA CLOUD CP`),
})

const loading = reactive({ list: false, pcs: false, save: false, pcState: false })
const filters = reactive({ q: '', category: '', launcher: '', status: 'all', pc_id: '' })
const games = ref<any[]>([])
const pcs = ref<any[]>([])
const updatedAt = ref<string | null>(null)

const editor = reactive({
  open: false,
  mode: 'create',
  id: null as number | null,
  error: '',
  form: defaultGameForm(),
})

const pcState = reactive({
  open: false,
  game_id: null as number | null,
  game_title: '',
  is_installed: true,
  version: '',
  last_error: '',
  error: '',
})

function defaultGameForm() {
  return {
    slug: '',
    title: '',
    sort_order: 0,
    category: '',
    launcher: '',
    launcher_icon: '',
    note: '',
    image_url: '',
    hero_url: '',
    trailer_url: '',
    website_url: '',
    help_text: '',
    launch_command: '',
    launch_args: '',
    is_active: true,
    launch_mode: 'steam',
    launch_target: '',
  }
}

function cleanOptional(value: unknown) {
  const text = String(value || '').trim()
  return text || null
}

function pickRows(response: any) {
  if (Array.isArray(response?.data?.data?.data)) return response.data.data.data
  if (Array.isArray(response?.data?.data)) return response.data.data
  if (Array.isArray(response?.data)) return response.data
  return []
}

function mapApiError(error: any, fallback: string) {
  const first = error?.response?.data?.errors ? Object.values(error.response.data.errors).flat()[0] : null
  return String(first || error?.response?.data?.message || copy.value[fallback as keyof typeof copy.value] || copy.value.errSave)
}

function normalizeGame(row: any) {
  return {
    id: Number(row?.id || 0),
    slug: String(row?.slug || ''),
    title: String(row?.title || ''),
    sort_order: Number(row?.sort_order || 0),
    category: String(row?.category || ''),
    launcher: String(row?.launcher || ''),
    launcher_icon: String(row?.launcher_icon || ''),
    note: String(row?.note || ''),
    image_url: String(row?.image_url || ''),
    hero_url: String(row?.hero_url || ''),
    trailer_url: String(row?.trailer_url || ''),
    website_url: String(row?.website_url || ''),
    help_text: String(row?.help_text || ''),
    launch_command: String(row?.launch_command || ''),
    launch_args: String(row?.launch_args || ''),
    is_active: !!row?.is_active,
    install: {
      is_installed: row?.install?.is_installed ?? null,
      version: String(row?.install?.version || ''),
      last_error: String(row?.install?.last_error || ''),
    },
  }
}

const PRESET_STEAM_APP_BY_SLUG: Record<string, string> = { dota2: '570', cs2: '730', pubg: '578080', gta5: '271590' }
const PRESET_RIOT_BY_SLUG: Record<string, string> = { valorant: 'valorant', lol: 'league_of_legends', leagueoflegends: 'league_of_legends' }
const PRESET_EPIC_BY_SLUG: Record<string, string> = { fortnite: 'Fortnite' }

const categories = computed(() => [...new Set(games.value.map((item) => item.category).filter(Boolean))].sort())
const launchers = computed(() => [...new Set(games.value.map((item) => item.launcher).filter(Boolean))].sort())
const filteredGames = computed(() => {
  const q = filters.q.trim().toLowerCase()
  return games.value.filter((game) => {
    if (filters.category && game.category !== filters.category) return false
    if (filters.launcher && game.launcher !== filters.launcher) return false
    if (filters.status === 'active' && !game.is_active) return false
    if (filters.status === 'inactive' && game.is_active) return false
    if (!q) return true
    return `${game.title} ${game.slug} ${game.category} ${game.launcher}`.toLowerCase().includes(q)
  })
})
const activeCount = computed(() => games.value.filter((item) => item.is_active).length)
const installedCount = computed(() => (!filters.pc_id ? 0 : games.value.filter((item) => item.install?.is_installed === true).length))
const selectedPcLabel = computed(() => {
  const id = Number(filters.pc_id || 0)
  const row = pcs.value.find((pc) => Number(pc.id) === id)
  return row ? `${row.code} (${row.zone || '-'})` : copy.value.noPc
})
const updatedAtLabel = computed(() => (!updatedAt.value ? '-' : new Date(updatedAt.value).toLocaleString()))

function installText(installed: boolean | null) {
  if (installed === true) return copy.value.installed
  if (installed === false) return copy.value.notInstalled
  return copy.value.unknownInstall
}

function installClass(installed: boolean | null) {
  if (installed === true) return 'ok'
  if (installed === false) return 'danger'
  return 'muted'
}

function resetFilters() {
  filters.q = ''
  filters.category = ''
  filters.launcher = ''
  filters.status = 'all'
  filters.pc_id = ''
  loadGames()
}

function applyFilters() {
  loadGames()
}

async function loadPcs() {
  loading.pcs = true
  try {
    const response = await cpApi.pcs({ per_page: 500 })
    pcs.value = pickRows(response).map((row: any) => ({
      id: Number(row?.id || 0),
      code: String(row?.code || row?.name || ''),
      zone: String(row?.zone || row?.zone_name || ''),
    })).filter((row: any) => row.id > 0)
  } catch {
    pcs.value = []
  } finally {
    loading.pcs = false
  }
}

async function loadGames() {
  loading.list = true
  try {
    const params: Record<string, any> = {}
    if (filters.pc_id) params.pc_id = Number(filters.pc_id)
    const response = await cpApi.shellGamesList(params)
    games.value = pickRows(response).map(normalizeGame)
    updatedAt.value = new Date().toISOString()
  } catch {
    ElMessage.error(copy.value.errLoad)
    games.value = []
  } finally {
    loading.list = false
  }
}

async function refreshAll() {
  await Promise.all([loadPcs(), loadGames()])
}

function openCreate() {
  editor.mode = 'create'
  editor.id = null
  editor.error = ''
  editor.form = defaultGameForm()
  editor.open = true
}

function suggestLaunchMode(launcher: string, command: string) {
  const l = String(launcher || '').toLowerCase()
  const c = String(command || '').toLowerCase()
  if (l.includes('steam') || c.startsWith('steam://')) return 'steam'
  if (l.includes('riot') || c.startsWith('riotclient://')) return 'riot'
  if (l.includes('epic') || c.startsWith('com.epicgames.launcher://')) return 'epic'
  return 'custom'
}

function suggestLaunchTarget(game: any) {
  const slug = String(game?.slug || '').toLowerCase()
  const mode = suggestLaunchMode(game?.launcher, game?.launch_command)
  if (mode === 'steam') return PRESET_STEAM_APP_BY_SLUG[slug] || String(game?.launch_command || '').match(/rungameid\/(\d+)/i)?.[1] || ''
  if (mode === 'riot') return PRESET_RIOT_BY_SLUG[slug] || String(game?.launch_command || '').match(/product=([^&]+)/i)?.[1] || ''
  if (mode === 'epic') return PRESET_EPIC_BY_SLUG[slug] || String(game?.launch_command || '').match(/apps\/([^?]+)/i)?.[1] || ''
  return ''
}

function openEdit(game: any) {
  editor.mode = 'edit'
  editor.id = game.id
  editor.error = ''
  editor.form = {
    slug: game.slug,
    title: game.title,
    sort_order: Number(game.sort_order || 0),
    category: game.category,
    launcher: game.launcher,
    launcher_icon: game.launcher_icon,
    note: game.note,
    image_url: game.image_url,
    hero_url: game.hero_url,
    trailer_url: game.trailer_url,
    website_url: game.website_url,
    help_text: game.help_text,
    launch_command: game.launch_command,
    launch_args: game.launch_args,
    is_active: !!game.is_active,
    launch_mode: suggestLaunchMode(game.launcher, game.launch_command),
    launch_target: suggestLaunchTarget(game),
  }
  editor.open = true
}

function closeEditor() {
  editor.open = false
  editor.error = ''
}

function buildPresetLaunchCommand(mode: string, rawTarget: string, rawSlug: string, rawLauncher: string) {
  const target = String(rawTarget || '').trim()
  const slug = String(rawSlug || '').trim().toLowerCase()
  const launcher = String(rawLauncher || '').trim().toLowerCase()
  const resolvedMode = String(mode || '').trim().toLowerCase() || (launcher.includes('steam') ? 'steam' : launcher.includes('riot') ? 'riot' : launcher.includes('epic') ? 'epic' : 'custom')
  if (resolvedMode === 'steam') {
    const appId = target || PRESET_STEAM_APP_BY_SLUG[slug] || ''
    return appId ? `steam://rungameid/${appId}` : null
  }
  if (resolvedMode === 'riot') {
    const product = target || PRESET_RIOT_BY_SLUG[slug] || ''
    return product ? `riotclient://launch?product=${product}&patchline=live` : null
  }
  if (resolvedMode === 'epic') {
    const appName = target || PRESET_EPIC_BY_SLUG[slug] || ''
    return appName ? `com.epicgames.launcher://apps/${appName}?action=launch&silent=true` : null
  }
  return null
}

function generateLaunchCommand() {
  const generated = buildPresetLaunchCommand(editor.form.launch_mode, editor.form.launch_target, editor.form.slug, editor.form.launcher)
  if (generated) editor.form.launch_command = generated
}

function editorPayload() {
  const autoCommand = buildPresetLaunchCommand(editor.form.launch_mode, editor.form.launch_target, editor.form.slug, editor.form.launcher)
  return {
    slug: String(editor.form.slug || '').trim(),
    title: String(editor.form.title || '').trim(),
    sort_order: Number(editor.form.sort_order || 0),
    category: cleanOptional(editor.form.category),
    launcher: cleanOptional(editor.form.launcher),
    launcher_icon: cleanOptional(editor.form.launcher_icon),
    note: cleanOptional(editor.form.note),
    image_url: cleanOptional(editor.form.image_url),
    hero_url: cleanOptional(editor.form.hero_url),
    trailer_url: cleanOptional(editor.form.trailer_url),
    website_url: cleanOptional(editor.form.website_url),
    help_text: cleanOptional(editor.form.help_text),
    launch_command: cleanOptional(editor.form.launch_command) || autoCommand,
    launch_args: cleanOptional(editor.form.launch_args),
    is_active: !!editor.form.is_active,
  }
}

async function saveGame() {
  editor.error = ''
  const payload = editorPayload()
  if (!payload.slug || !payload.title) {
    editor.error = copy.value.errSave
    return
  }
  loading.save = true
  try {
    if (editor.mode === 'create') await cpApi.shellGameCreate(payload)
    else await cpApi.shellGameUpdate(editor.id, payload)
    ElMessage.success(copy.value.okSaved)
    closeEditor()
    await loadGames()
  } catch (error) {
    editor.error = mapApiError(error, 'errSave')
  } finally {
    loading.save = false
  }
}

async function toggleGame(game: any) {
  try {
    await cpApi.shellGameToggle(game.id)
    ElMessage.success(copy.value.okToggled)
    await loadGames()
  } catch {
    ElMessage.error(copy.value.errSave)
  }
}

function openPcState(game: any) {
  if (!filters.pc_id) {
    ElMessage.warning(copy.value.selectPcFirst)
    return
  }
  pcState.open = true
  pcState.game_id = game.id
  pcState.game_title = game.title
  pcState.error = ''
  pcState.is_installed = game.install?.is_installed === true
  pcState.version = String(game.install?.version || '')
  pcState.last_error = String(game.install?.last_error || '')
}

function closePcState() {
  pcState.open = false
  pcState.error = ''
}

async function savePcState() {
  pcState.error = ''
  const pcId = Number(filters.pc_id || 0)
  if (!pcId || !pcState.game_id) {
    pcState.error = copy.value.selectPcFirst
    return
  }
  loading.pcState = true
  try {
    await cpApi.shellGameSetPcState(pcId, pcState.game_id, {
      is_installed: !!pcState.is_installed,
      version: cleanOptional(pcState.version),
      last_error: cleanOptional(pcState.last_error),
    })
    ElMessage.success(copy.value.okPcState)
    closePcState()
    await loadGames()
  } catch (error) {
    pcState.error = mapApiError(error, 'errPcState')
  } finally {
    loading.pcState = false
  }
}

onMounted(refreshAll)
</script>

<style scoped>
.shell-games-page,
.filter-grid,
.stats-grid,
.hero-tools,
.filters-actions,
.row-actions,
.editor-grid,
.pc-state-summary {
  display: grid;
  gap: 16px;
}

.hero-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.filter-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 8px;
}

.field-span-2 {
  grid-column: span 2;
}

.field span,
.modal-kicker {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.field input,
.field select,
.field textarea,
.preset-grid input,
.preset-grid select {
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  outline: 0;
  font-size: 13px;
}

.field textarea {
  min-height: 120px;
  padding: 14px;
  resize: vertical;
}

.filters-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.stats-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 16px;
  gap: 14px;
}

.table-shell {
  overflow: auto;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.games-table {
  width: 100%;
  border-collapse: collapse;
}

.games-table th,
.games-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--stroke);
  text-align: left;
  vertical-align: top;
  font-size: 13px;
}

.games-table th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.games-table tbody tr:last-child td {
  border-bottom: 0;
}

.right {
  text-align: right !important;
}

.game-title {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.game-title strong {
  display: block;
  font-size: 14px;
}

.game-title small {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.cmd {
  max-width: 280px;
  overflow-wrap: anywhere;
}

.state-col {
  display: grid;
  gap: 8px;
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.04);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

.pill.ok {
  border-color: rgba(52, 211, 153, 0.3);
  color: var(--success);
}

.pill.danger {
  border-color: rgba(251, 113, 133, 0.3);
  color: var(--danger);
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.ghost-btn,
.primary-btn,
.tiny-btn,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.primary-btn,
.tiny-btn.primary {
  border-color: rgba(79, 140, 255, 0.3);
  background: linear-gradient(180deg, rgba(79, 140, 255, 0.14), rgba(79, 209, 197, 0.08));
}

.tiny-btn {
  min-height: 32px;
  padding: 0 12px;
}

.tiny-btn.danger {
  border-color: rgba(251, 113, 133, 0.3);
  color: var(--danger);
}

.state-box {
  display: grid;
  place-items: center;
  min-height: 160px;
  border-radius: 18px;
  border: 1px dashed var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
}

.skeleton-grid {
  display: grid;
  gap: 12px;
  width: 100%;
}

.skeleton-card {
  height: 54px;
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04));
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
  background: rgba(3, 7, 18, 0.56);
  backdrop-filter: blur(8px);
  overflow: auto;
}

.modal-shell {
  width: min(980px, 100%);
  display: grid;
  gap: 18px;
  padding: 20px;
  border-radius: 24px;
  border: 1px solid var(--stroke);
  background: var(--surface-strong);
  box-shadow: var(--shadow-panel);
}

.modal-shell.small {
  width: min(560px, 100%);
}

.modal-head,
.preset-head,
.modal-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.modal-head h3 {
  margin: 4px 0 0;
  font-size: 28px;
  line-height: 1;
}

.editor-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.editor-grid.one-col {
  grid-template-columns: 1fr;
}

.preset-card,
.meta-box {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.preset-head {
  flex-direction: column;
  align-items: flex-start;
}

.preset-head small {
  color: var(--text-muted);
}

.preset-grid {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) auto;
  gap: 10px;
}

.check-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  font-size: 13px;
}

.pc-state-summary {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.meta-box span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.meta-box strong {
  font-size: 14px;
}

.panel-error {
  margin: 0;
  font-size: 12px;
  color: var(--danger);
}

@media (max-width: 1100px) {
  .filter-grid,
  .stats-grid,
  .editor-grid,
  .pc-state-summary {
    grid-template-columns: 1fr 1fr;
  }

  .field-span-2 {
    grid-column: span 2;
  }
}

@media (max-width: 860px) {
  .filter-grid,
  .stats-grid,
  .editor-grid,
  .pc-state-summary,
  .preset-grid {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: span 1;
  }

  .hero-tools,
  .filters-actions,
  .modal-actions {
    flex-wrap: wrap;
    justify-content: stretch;
  }
}
</style>
