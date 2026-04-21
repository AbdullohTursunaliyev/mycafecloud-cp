<template>
  <div class="shell-games-page">
    <section class="toolbar card-flat">
      <div>
        <div class="h1">{{ t('shellGames.title') }}</div>
        <div class="muted sub">{{ t('shellGames.subtitle') }}</div>
      </div>

      <div class="toolbar-actions">
        <button class="btn ghost" :disabled="loading.list" @click="refreshAll">
          {{ t('shellGames.refresh') }}
        </button>
        <button class="btn primary" @click="openCreate">
          + {{ t('shellGames.add') }}
        </button>
      </div>
    </section>

    <section class="card-flat filters">
      <div class="card-head">{{ t('shellGames.filtersTitle') }}</div>

      <div class="filters-grid">
        <label class="field field-span-2">
          <span>{{ t('shellGames.filterSearch') }}</span>
          <input
            v-model.trim="filters.q"
            class="input"
            :placeholder="t('shellGames.filterSearchPlaceholder')"
            @keydown.enter="applyFilters"
          />
        </label>

        <label class="field">
          <span>{{ t('shellGames.filterCategory') }}</span>
          <select v-model="filters.category" class="input" @change="applyFilters">
            <option value="">{{ t('shellGames.statusAll') }}</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </label>

        <label class="field">
          <span>{{ t('shellGames.filterLauncher') }}</span>
          <select v-model="filters.launcher" class="input" @change="applyFilters">
            <option value="">{{ t('shellGames.statusAll') }}</option>
            <option v-for="launcher in launchers" :key="launcher" :value="launcher">{{ launcher }}</option>
          </select>
        </label>

        <label class="field">
          <span>{{ t('shellGames.filterStatus') }}</span>
          <select v-model="filters.status" class="input">
            <option value="all">{{ t('shellGames.statusAll') }}</option>
            <option value="active">{{ t('shellGames.statusActive') }}</option>
            <option value="inactive">{{ t('shellGames.statusInactive') }}</option>
          </select>
        </label>

        <label class="field">
          <span>{{ t('shellGames.filterPc') }}</span>
          <select v-model="filters.pc_id" class="input" @change="applyFilters">
            <option value="">{{ t('shellGames.noPc') }}</option>
            <option v-for="pc in pcs" :key="pc.id" :value="String(pc.id)">
              {{ pc.code }} ({{ pc.zone || '-' }})
            </option>
          </select>
        </label>

        <div class="filters-actions">
          <button class="btn ghost" @click="resetFilters">{{ t('shellGames.reset') }}</button>
          <button class="btn primary" :disabled="loading.list" @click="applyFilters">{{ t('shellGames.apply') }}</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat">
          <div class="muted">{{ t('shellGames.statsTotal') }}</div>
          <div class="stat-value">{{ games.length }}</div>
        </div>
        <div class="stat">
          <div class="muted">{{ t('shellGames.statsActive') }}</div>
          <div class="stat-value">{{ activeCount }}</div>
        </div>
        <div class="stat">
          <div class="muted">{{ t('shellGames.statsInstalled') }}</div>
          <div class="stat-value">{{ installedCount }}</div>
        </div>
      </div>
    </section>

    <section class="card-flat list-card">
      <div class="list-head">
        <div class="card-head">{{ t('shellGames.listTitle') }}</div>
      </div>

      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('shellGames.game') }}</th>
              <th>{{ t('shellGames.category') }}</th>
              <th>{{ t('shellGames.launcher') }}</th>
              <th>{{ t('shellGames.launchCommand') }}</th>
              <th>{{ t('shellGames.state') }}</th>
              <th>{{ t('shellGames.sort') }}</th>
              <th class="right">{{ t('shellGames.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredGames.length">
              <td colspan="7" class="empty-cell">{{ t('shellGames.empty') }}</td>
            </tr>
            <tr v-for="game in filteredGames" :key="game.id">
              <td>
                <div class="nm">{{ game.title }}</div>
                <div class="muted sm">{{ game.slug }}</div>
              </td>
              <td>{{ game.category || '-' }}</td>
              <td>{{ game.launcher || '-' }}</td>
              <td class="mono cmd">{{ game.launch_command || '-' }}</td>
              <td>
                <div class="state-col">
                  <span class="pill" :class="game.is_active ? 'ok' : 'muted'">
                    {{ game.is_active ? t('shellGames.active') : t('shellGames.inactive') }}
                  </span>
                  <span
                    v-if="filters.pc_id"
                    class="pill"
                    :class="installClass(game.install?.is_installed)"
                  >
                    {{ installText(game.install?.is_installed) }}
                  </span>
                </div>
              </td>
              <td>{{ game.sort_order }}</td>
              <td class="right actions">
                <button class="btn ghost sm" @click="openEdit(game)">{{ t('shellGames.edit') }}</button>
                <button class="btn ghost sm" :disabled="!filters.pc_id" @click="openPcState(game)">
                  {{ t('shellGames.setPcState') }}
                </button>
                <button class="btn sm" :class="game.is_active ? 'danger' : 'primary'" @click="toggleGame(game)">
                  {{ game.is_active ? t('shellGames.disable') : t('shellGames.enable') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="editor.open" class="overlay" @click.self="closeEditor">
      <div class="modal card-flat">
        <div class="modal-head">
          <div class="h2">
            {{ editor.mode === 'create' ? t('shellGames.modalCreate') : t('shellGames.modalEdit') }}
          </div>
          <button class="x" @click="closeEditor">x</button>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>{{ t('shellGames.fieldSlug') }}</span>
            <input v-model.trim="editor.form.slug" class="input" />
          </label>
          <label class="field">
            <span>{{ t('shellGames.fieldTitle') }}</span>
            <input v-model.trim="editor.form.title" class="input" />
          </label>
          <label class="field">
            <span>{{ t('shellGames.fieldSort') }}</span>
            <input v-model.number="editor.form.sort_order" class="input" type="number" min="0" />
          </label>
          <label class="field">
            <span>{{ t('shellGames.fieldCategory') }}</span>
            <input v-model.trim="editor.form.category" class="input" />
          </label>
          <label class="field">
            <span>{{ t('shellGames.fieldAge') }}</span>
            <input v-model.trim="editor.form.age_rating" class="input" />
          </label>
          <label class="field">
            <span>{{ t('shellGames.fieldBadge') }}</span>
            <input v-model.trim="editor.form.badge" class="input" />
          </label>
          <label class="field field-span-2">
            <span>{{ t('shellGames.fieldNote') }}</span>
            <input v-model.trim="editor.form.note" class="input" />
          </label>
          <label class="field">
            <span>{{ t('shellGames.fieldLauncher') }}</span>
            <input v-model.trim="editor.form.launcher" class="input" />
          </label>
          <label class="field">
            <span>{{ t('shellGames.fieldLauncherIcon') }}</span>
            <input v-model.trim="editor.form.launcher_icon" class="input" />
          </label>
          <div class="field field-span-2 launch-helper">
            <span>{{ t('shellGames.launchPresetTitle') }}</span>
            <div class="launch-row">
              <select v-model="editor.form.launch_mode" class="input">
                <option value="steam">{{ t('shellGames.launchPresetSteam') }}</option>
                <option value="riot">{{ t('shellGames.launchPresetRiot') }}</option>
                <option value="epic">{{ t('shellGames.launchPresetEpic') }}</option>
                <option value="custom">{{ t('shellGames.launchPresetCustom') }}</option>
              </select>
              <input
                v-model.trim="editor.form.launch_target"
                class="input"
                :placeholder="t('shellGames.launchTargetPlaceholder')"
              />
              <button class="btn ghost" type="button" @click="generateLaunchCommand">
                {{ t('shellGames.generateCommand') }}
              </button>
            </div>
            <div class="muted sm">{{ t('shellGames.launchPresetHint') }}</div>
          </div>
          <label class="field field-span-2">
            <span>{{ t('shellGames.fieldImage') }}</span>
            <input v-model.trim="editor.form.image_url" class="input" />
          </label>
          <label class="field field-span-2">
            <span>{{ t('shellGames.fieldHero') }}</span>
            <input v-model.trim="editor.form.hero_url" class="input" />
          </label>
          <label class="field field-span-2">
            <span>{{ t('shellGames.fieldTrailer') }}</span>
            <input v-model.trim="editor.form.trailer_url" class="input" />
          </label>
          <label class="field field-span-2">
            <span>{{ t('shellGames.fieldWebsite') }}</span>
            <input v-model.trim="editor.form.website_url" class="input" />
          </label>
          <label class="field field-span-2">
            <span>{{ t('shellGames.fieldHelp') }}</span>
            <textarea v-model.trim="editor.form.help_text" class="input area"></textarea>
          </label>
          <label class="field field-span-2">
            <span>{{ t('shellGames.fieldLaunchCommand') }}</span>
            <input v-model.trim="editor.form.launch_command" class="input mono" />
          </label>
          <label class="field field-span-2">
            <span>{{ t('shellGames.fieldLaunchArgs') }}</span>
            <input v-model.trim="editor.form.launch_args" class="input mono" />
          </label>
          <label class="field field-span-2">
            <span>{{ t('shellGames.fieldWorkingDir') }}</span>
            <input v-model.trim="editor.form.working_dir" class="input mono" />
          </label>
          <label class="field check field-span-2">
            <input v-model="editor.form.is_active" type="checkbox" />
            <span>{{ t('shellGames.fieldActive') }}</span>
          </label>
        </div>

        <p v-if="editor.error" class="err">{{ editor.error }}</p>

        <div class="modal-actions">
          <button class="btn ghost" @click="closeEditor">{{ t('shellGames.cancel') }}</button>
          <button class="btn primary" :disabled="loading.save" @click="saveGame">{{ t('shellGames.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="pcState.open" class="overlay" @click.self="closePcState">
      <div class="modal card-flat small">
        <div class="modal-head">
          <div>
            <div class="h2">{{ t('shellGames.pcStateTitle') }}</div>
            <div class="muted sm">{{ t('shellGames.pcStateSubtitle') }}</div>
          </div>
          <button class="x" @click="closePcState">x</button>
        </div>

        <div class="field">
          <span>{{ t('shellGames.filterPc') }}</span>
          <div class="chip">{{ selectedPcLabel }}</div>
        </div>
        <div class="field">
          <span>{{ t('shellGames.game') }}</span>
          <div class="chip">{{ pcState.game_title }}</div>
        </div>
        <label class="field">
          <span>{{ t('shellGames.fieldInstalled') }}</span>
          <select v-model="pcState.is_installed" class="input">
            <option :value="true">{{ t('shellGames.yes') }}</option>
            <option :value="false">{{ t('shellGames.no') }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('shellGames.fieldVersion') }}</span>
          <input v-model.trim="pcState.version" class="input" />
        </label>
        <label class="field">
          <span>{{ t('shellGames.fieldError') }}</span>
          <input v-model.trim="pcState.last_error" class="input" />
        </label>

        <p v-if="pcState.error" class="err">{{ pcState.error }}</p>

        <div class="modal-actions">
          <button class="btn ghost" @click="closePcState">{{ t('shellGames.cancel') }}</button>
          <button class="btn primary" :disabled="loading.pcState" @click="savePcState">{{ t('shellGames.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { cpApi } from '../../api/cp'
import { useI18n } from '../../i18n'

const { t } = useI18n()

const loading = reactive({
  list: false,
  pcs: false,
  save: false,
  pcState: false,
})

const filters = reactive({
  q: '',
  category: '',
  launcher: '',
  status: 'all',
  pc_id: '',
})

const games = ref([])
const pcs = ref([])

const editor = reactive({
  open: false,
  mode: 'create',
  id: null,
  error: '',
  form: defaultGameForm(),
})

const pcState = reactive({
  open: false,
  game_id: null,
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
    age_rating: '',
    badge: '',
    note: '',
    launcher: '',
    launcher_icon: '',
    image_url: '',
    hero_url: '',
    trailer_url: '',
    website_url: '',
    help_text: '',
    launch_command: '',
    launch_args: '',
    working_dir: '',
    is_active: true,
    launch_mode: 'steam',
    launch_target: '',
  }
}

function normalizeGame(row) {
  return {
    id: Number(row?.id || 0),
    slug: String(row?.slug || ''),
    title: String(row?.title || ''),
    sort_order: Number(row?.sort_order || 0),
    category: String(row?.category || ''),
    age_rating: String(row?.age_rating || ''),
    badge: String(row?.badge || ''),
    note: String(row?.note || ''),
    launcher: String(row?.launcher || ''),
    launcher_icon: String(row?.launcher_icon || ''),
    image_url: String(row?.image_url || ''),
    hero_url: String(row?.hero_url || ''),
    trailer_url: String(row?.trailer_url || ''),
    website_url: String(row?.website_url || ''),
    help_text: String(row?.help_text || ''),
    launch_command: String(row?.launch_command || ''),
    launch_args: String(row?.launch_args || ''),
    working_dir: String(row?.working_dir || ''),
    is_active: !!row?.is_active,
    install: {
      is_installed: row?.install?.is_installed ?? null,
      version: String(row?.install?.version || ''),
      last_error: String(row?.install?.last_error || ''),
    },
  }
}

const PRESET_STEAM_APP_BY_SLUG = {
  dota2: '570',
  cs2: '730',
  pubg: '578080',
  gta5: '271590',
}

const PRESET_RIOT_BY_SLUG = {
  valorant: 'valorant',
  lol: 'league_of_legends',
  leagueoflegends: 'league_of_legends',
}

const PRESET_EPIC_BY_SLUG = {
  fortnite: 'Fortnite',
}

function cleanOptional(value) {
  const raw = String(value ?? '').trim()
  return raw.length ? raw : null
}

function mapApiError(error, fallbackKey) {
  const msg = error?.response?.data?.message
  const errs = error?.response?.data?.errors
  if (msg) return msg
  if (errs) {
    const first = Object.values(errs).flat()[0]
    if (first) return String(first)
  }
  return t(fallbackKey)
}

function pickRows(response) {
  const data = response?.data
  if (Array.isArray(data?.data?.data)) return data.data.data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data
  return []
}

const categories = computed(() => {
  const set = new Set()
  for (const g of games.value) {
    if (g.category) set.add(g.category)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const launchers = computed(() => {
  const set = new Set()
  for (const g of games.value) {
    if (g.launcher) set.add(g.launcher)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const filteredGames = computed(() => {
  const q = String(filters.q || '').trim().toLowerCase()
  return games.value.filter((g) => {
    if (filters.status === 'active' && !g.is_active) return false
    if (filters.status === 'inactive' && g.is_active) return false
    if (filters.category && g.category !== filters.category) return false
    if (filters.launcher && g.launcher !== filters.launcher) return false
    if (!q) return true

    const hay = `${g.title} ${g.slug} ${g.category} ${g.launcher}`.toLowerCase()
    return hay.includes(q)
  })
})

const activeCount = computed(() => games.value.filter((g) => g.is_active).length)
const installedCount = computed(() => {
  if (!filters.pc_id) return 0
  return games.value.filter((g) => g.install?.is_installed === true).length
})

const selectedPcLabel = computed(() => {
  const id = Number(filters.pc_id || 0)
  if (!id) return t('shellGames.noPc')
  const row = pcs.value.find((p) => Number(p.id) === id)
  if (!row) return t('shellGames.noPc')
  return `${row.code} (${row.zone || '-'})`
})

function installText(installed) {
  if (installed === true) return t('shellGames.installed')
  if (installed === false) return t('shellGames.notInstalled')
  return t('shellGames.unknownInstall')
}

function installClass(installed) {
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
    const rows = pickRows(response)
    pcs.value = rows
      .map((row) => ({
        id: Number(row?.id || 0),
        code: String(row?.code || row?.name || ''),
        zone: String(row?.zone || row?.zone_name || ''),
      }))
      .filter((row) => row.id > 0)
  } catch (_) {
    pcs.value = []
  } finally {
    loading.pcs = false
  }
}

async function loadGames() {
  loading.list = true
  try {
    const params = {}
    if (filters.pc_id) params.pc_id = Number(filters.pc_id)
    const response = await cpApi.shellGamesList(params)
    const rows = Array.isArray(response?.data?.data) ? response.data.data : []
    games.value = rows.map(normalizeGame)
  } catch (_) {
    ElMessage.error(t('shellGames.errLoad'))
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

function openEdit(game) {
  editor.mode = 'edit'
  editor.id = game.id
  editor.error = ''
  editor.form = {
    slug: game.slug,
    title: game.title,
    sort_order: Number(game.sort_order || 0),
    category: game.category,
    age_rating: game.age_rating,
    badge: game.badge,
    note: game.note,
    launcher: game.launcher,
    launcher_icon: game.launcher_icon,
    image_url: game.image_url,
    hero_url: game.hero_url,
    trailer_url: game.trailer_url,
    website_url: game.website_url,
    help_text: game.help_text,
    launch_command: game.launch_command,
    launch_args: game.launch_args,
    working_dir: game.working_dir,
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

function editorPayload() {
  const autoCommand = buildPresetLaunchCommand(
    editor.form.launch_mode,
    editor.form.launch_target,
    editor.form.slug,
    editor.form.launcher
  )

  const command = cleanOptional(editor.form.launch_command) || autoCommand

  return {
    slug: String(editor.form.slug || '').trim(),
    title: String(editor.form.title || '').trim(),
    sort_order: Number(editor.form.sort_order || 0),
    category: cleanOptional(editor.form.category),
    age_rating: cleanOptional(editor.form.age_rating),
    badge: cleanOptional(editor.form.badge),
    note: cleanOptional(editor.form.note),
    launcher: cleanOptional(editor.form.launcher),
    launcher_icon: cleanOptional(editor.form.launcher_icon),
    image_url: cleanOptional(editor.form.image_url),
    hero_url: cleanOptional(editor.form.hero_url),
    trailer_url: cleanOptional(editor.form.trailer_url),
    website_url: cleanOptional(editor.form.website_url),
    help_text: cleanOptional(editor.form.help_text),
    launch_command: command,
    launch_args: cleanOptional(editor.form.launch_args),
    working_dir: cleanOptional(editor.form.working_dir),
    is_active: !!editor.form.is_active,
  }
}

function suggestLaunchMode(launcher, command) {
  const l = String(launcher || '').toLowerCase()
  const c = String(command || '').toLowerCase()
  if (l.includes('steam') || c.startsWith('steam://')) return 'steam'
  if (l.includes('riot') || c.startsWith('riotclient://')) return 'riot'
  if (l.includes('epic') || c.startsWith('com.epicgames.launcher://')) return 'epic'
  return 'custom'
}

function suggestLaunchTarget(game) {
  const slug = String(game?.slug || '').toLowerCase()
  const mode = suggestLaunchMode(game?.launcher, game?.launch_command)
  if (mode === 'steam') {
    const fromMap = PRESET_STEAM_APP_BY_SLUG[slug]
    if (fromMap) return fromMap
    const fromCmd = String(game?.launch_command || '').match(/rungameid\/(\d+)/i)
    return fromCmd?.[1] || ''
  }
  if (mode === 'riot') {
    const fromMap = PRESET_RIOT_BY_SLUG[slug]
    if (fromMap) return fromMap
    const fromCmd = String(game?.launch_command || '').match(/product=([^&]+)/i)
    return fromCmd?.[1] || ''
  }
  if (mode === 'epic') {
    const fromMap = PRESET_EPIC_BY_SLUG[slug]
    if (fromMap) return fromMap
    const fromCmd = String(game?.launch_command || '').match(/apps\/([^?]+)/i)
    return fromCmd?.[1] || ''
  }
  return ''
}

function buildPresetLaunchCommand(mode, rawTarget, rawSlug, rawLauncher) {
  const target = String(rawTarget || '').trim()
  const slug = String(rawSlug || '').trim().toLowerCase()
  const launcher = String(rawLauncher || '').trim().toLowerCase()
  const normalizedMode = String(mode || '').trim().toLowerCase()

  const resolvedMode = normalizedMode || (launcher.includes('steam')
    ? 'steam'
    : launcher.includes('riot')
      ? 'riot'
      : launcher.includes('epic')
        ? 'epic'
        : 'custom')

  if (resolvedMode === 'steam') {
    const appId = target || PRESET_STEAM_APP_BY_SLUG[slug] || ''
    if (!appId) return null
    return `steam://rungameid/${appId}`
  }

  if (resolvedMode === 'riot') {
    const product = target || PRESET_RIOT_BY_SLUG[slug] || ''
    if (!product) return null
    return `riotclient://launch?product=${product}&patchline=live`
  }

  if (resolvedMode === 'epic') {
    const appName = target || PRESET_EPIC_BY_SLUG[slug] || ''
    if (!appName) return null
    return `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`
  }

  return null
}

function generateLaunchCommand() {
  const generated = buildPresetLaunchCommand(
    editor.form.launch_mode,
    editor.form.launch_target,
    editor.form.slug,
    editor.form.launcher
  )
  if (!generated) return
  editor.form.launch_command = generated
}

async function saveGame() {
  editor.error = ''
  const payload = editorPayload()

  if (!payload.slug || !payload.title) {
    editor.error = t('shellGames.errSave')
    return
  }

  loading.save = true
  try {
    if (editor.mode === 'create') {
      await cpApi.shellGameCreate(payload)
    } else {
      await cpApi.shellGameUpdate(editor.id, payload)
    }
    ElMessage.success(t('shellGames.okSaved'))
    closeEditor()
    await loadGames()
  } catch (error) {
    editor.error = mapApiError(error, 'shellGames.errSave')
  } finally {
    loading.save = false
  }
}

async function toggleGame(game) {
  try {
    await cpApi.shellGameToggle(game.id)
    ElMessage.success(t('shellGames.okToggled'))
    await loadGames()
  } catch (_) {
    ElMessage.error(t('shellGames.errSave'))
  }
}

function openPcState(game) {
  if (!filters.pc_id) {
    ElMessage.warning(t('shellGames.selectPcFirst'))
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
    pcState.error = t('shellGames.selectPcFirst')
    return
  }

  loading.pcState = true
  try {
    await cpApi.shellGameSetPcState(pcId, pcState.game_id, {
      is_installed: !!pcState.is_installed,
      version: cleanOptional(pcState.version),
      last_error: cleanOptional(pcState.last_error),
    })
    ElMessage.success(t('shellGames.okPcState'))
    closePcState()
    await loadGames()
  } catch (error) {
    pcState.error = mapApiError(error, 'shellGames.errPcState')
  } finally {
    loading.pcState = false
  }
}

onMounted(refreshAll)
</script>

<style scoped>
.shell-games-page {
  display: grid;
  gap: 14px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
}

.sub {
  margin-top: 4px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.filters {
  padding: 14px;
}

.card-head {
  font-size: 13px;
  font-weight: 700;
  opacity: 0.9;
}

.filters-grid {
  margin-top: 10px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 12px;
  opacity: 0.75;
}

.field-span-2 {
  grid-column: span 2;
}

.input {
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(2, 6, 23, 0.35);
  color: var(--text);
  padding: 0 10px;
}

.input.area {
  min-height: 90px;
  height: auto;
  padding: 10px;
  resize: vertical;
}

.mono {
  font-family: ui-monospace, Consolas, monospace;
}

.filters-actions {
  display: flex;
  align-items: end;
  gap: 8px;
}

.stats-grid {
  margin-top: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stat {
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: rgba(2, 6, 23, 0.2);
  padding: 10px 12px;
}

.stat-value {
  margin-top: 4px;
  font-size: 22px;
  font-weight: 900;
}

.list-card {
  padding: 14px;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.table-wrap {
  margin-top: 10px;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  overflow: auto;
  background: rgba(2, 6, 23, 0.2);
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.tbl th,
.tbl td {
  padding: 10px;
  border-bottom: 1px solid var(--stroke);
  white-space: nowrap;
  text-align: left;
  vertical-align: top;
}

.tbl th {
  opacity: 0.75;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.02);
}

.tbl tbody tr:last-child td {
  border-bottom: none;
}

.tbl .right {
  text-align: right;
}

.nm {
  font-size: 13px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
}

.sm {
  margin-top: 4px;
  font-size: 11px;
}

.cmd {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.state-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
}

.pill.ok {
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.14);
}

.pill.muted {
  opacity: 0.8;
}

.pill.danger {
  border-color: rgba(239, 68, 68, 0.45);
  background: rgba(239, 68, 68, 0.14);
}

.actions {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn {
  height: 36px;
  border-radius: 10px;
  padding: 0 12px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.btn.sm {
  height: 30px;
  padding: 0 10px;
  font-size: 11px;
}

.btn.primary {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.2);
}

.btn.danger {
  border-color: rgba(239, 68, 68, 0.45);
  background: rgba(239, 68, 68, 0.16);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-cell {
  text-align: center;
  opacity: 0.7;
  padding: 18px;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  z-index: 60;
  padding: 16px;
  overflow-y: auto;
}

.modal {
  width: min(1100px, 96vw);
  border-radius: 16px;
  padding: 14px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  margin: 0 auto;
}

.modal.small {
  width: min(540px, 96vw);
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--stroke);
}

.h2 {
  font-size: 18px;
  font-weight: 800;
}

.x {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  cursor: pointer;
}

.form-grid {
  margin-top: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field.check {
  display: flex;
  align-items: center;
  gap: 8px;
}

.launch-helper {
  padding: 10px;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.22);
}

.launch-row {
  display: grid;
  grid-template-columns: 180px 1fr auto;
  gap: 8px;
  align-items: center;
}

.chip {
  border: 1px solid var(--stroke);
  border-radius: 10px;
  padding: 10px;
  background: rgba(2, 6, 23, 0.35);
  font-size: 12px;
}

.err {
  margin-top: 10px;
  color: rgba(248, 113, 113, 0.95);
  font-size: 12px;
}

.modal-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1200px) {
  .filters-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters-actions {
    grid-column: span 2;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: span 1;
  }

  .launch-row {
    grid-template-columns: 1fr;
  }
}
</style>
