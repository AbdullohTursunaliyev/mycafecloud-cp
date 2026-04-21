<template>
  <div class="settings-page">
    <CpPageHero eyebrow="Club profile" title="Settings" subtitle="Klub sozlamalari, media va installer konfiguratsiyasini alohida bo‘limlar bilan boshqaring.">
      <template #meta>
        <span class="hero-meta-badge">
          <Icon name="lucide:clock-3" size="14" />
          Yangilandi: {{ updatedAtLabel }}
        </span>
        <span class="hero-meta-badge">
          <Icon name="lucide:badge-check" size="14" />
          Tayyor bo‘limlar: {{ readySections }}/7
        </span>
      </template>

      <template #actions>
        <button class="ghost-btn" type="button" :disabled="loading" @click="loadSettings">
          <Icon name="lucide:refresh-cw" size="15" />
          <span>{{ loading ? 'Yuklanmoqda...' : 'Qayta yuklash' }}</span>
        </button>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard compact tone="tone-blue" label="Club" :value="clubReady ? 'Tayyor' : 'Bo‘sh'" :hint="form.clubName || 'Klub nomi yo‘q'" />
      <CpStatCard compact tone="tone-green" label="Media" :value="mediaReady ? 'Tayyor' : 'Bo‘sh'" :hint="promoPreviewType ? 'Preview tayyor' : 'Promo yo‘q'" />
      <CpStatCard compact tone="tone-amber" label="Installers" :value="String(installersReadyCount)" hint="Client / Agent / Shell" />
      <CpStatCard compact tone="tone-rose" label="Auto shift" :value="form.autoShiftEnabled ? String(form.autoShiftSlots.length) : '0'" :hint="form.autoShiftEnabled ? 'Jadval yoqilgan' : 'O‘chiq'" />
    </div>

    <div class="tab-strip">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <Icon :name="tab.icon" size="16" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <p v-if="error" class="panel-error">{{ error }}</p>
    <p v-if="message" class="panel-ok">{{ message }}</p>

    <template v-if="activeTab === 'club'">
      <div class="content-grid">
        <CpPanelCard title="Club" subtitle="Klub nomi va logo">
          <div class="form-grid">
            <label class="field field-span-2">
              <span>Klub nomi</span>
              <input v-model.trim="form.clubName" placeholder="Masalan: CyberArena Chilonzor" />
            </label>
          </div>
        </CpPanelCard>

        <CpPanelCard title="Logo" subtitle="Klub kartasi va login ekrani uchun">
          <div class="logo-layout">
            <div class="logo-preview">
              <img v-if="form.clubLogo" :src="form.clubLogo" alt="club logo" />
              <div v-else class="empty-preview">
                <Icon name="lucide:image-off" size="18" />
                <span>Logo yo‘q</span>
              </div>
            </div>

            <div class="stack-col">
              <label class="field">
                <span>Logo yuklash</span>
                <input ref="logoInput" class="file-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" @change="onLogoSelected" />
              </label>
              <button class="ghost-btn" type="button" @click="clearLogo">
                <Icon name="lucide:trash-2" size="14" />
                <span>Logoni olib tashlash</span>
              </button>
            </div>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'media'">
      <div class="content-grid">
        <CpPanelCard title="Media" subtitle="Login sahifa promo videosi">
          <div class="form-grid">
            <label class="field field-span-2">
              <span>Promo video URL</span>
              <input v-model.trim="form.promoVideoUrl" placeholder="https://cdn.domain.com/promo.mp4" />
            </label>
            <label class="field field-span-2">
              <span>Promo fayl yuklash (MP4/WebM/GIF)</span>
              <input ref="promoFileInput" class="file-input" type="file" accept="video/mp4,video/webm,image/gif" @change="onPromoFileSelected" />
            </label>
          </div>

          <div class="inline-actions">
            <button class="primary-btn" type="button" :disabled="promoUploading || !promoFile" @click="uploadPromoFile">
              <Icon name="lucide:upload" size="14" />
              <span>{{ promoUploading ? 'Yuklanmoqda...' : 'Promo yuklash' }}</span>
            </button>
            <span v-if="promoFileName" class="helper-chip">{{ promoFileName }}</span>
          </div>
        </CpPanelCard>

        <CpPanelCard title="Preview" subtitle="Video yoki YouTube preview">
          <div class="video-shell">
            <img v-if="promoPreviewType === 'gif'" :src="promoPreviewUrl" alt="promo preview" />
            <video v-else-if="promoPreviewType === 'video'" :src="promoPreviewUrl" muted autoplay loop playsinline></video>
            <iframe v-else-if="promoPreviewType === 'youtube'" :src="promoPreviewUrl" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
            <div v-else class="empty-preview wide">
              <Icon name="lucide:monitor-play" size="20" />
              <span>Preview mavjud emas</span>
            </div>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'installers'">
      <div class="content-grid">
        <CpPanelCard title="Client + Agent" subtitle="One-liner install uchun URL va args">
          <div class="form-grid">
            <label class="field field-span-2">
              <span>Client installer URL</span>
              <input v-model.trim="form.clientInstallerUrl" placeholder="https://cdn.domain.com/client-setup.exe" />
            </label>
            <label class="field field-span-2">
              <span>Client fayl yuklash (EXE/MSI/ZIP)</span>
              <input ref="clientFileInput" class="file-input" type="file" accept=".exe,.msi,.zip" @change="onClientFileSelected" />
            </label>
            <div class="inline-actions field-span-2">
              <button class="primary-btn" type="button" :disabled="clientUploading || !clientFile" @click="uploadClientFile">
                <Icon name="lucide:upload" size="14" />
                <span>{{ clientUploading ? 'Yuklanmoqda...' : 'Client yuklash' }}</span>
              </button>
              <span v-if="clientFileName" class="helper-chip">{{ clientFileName }}</span>
            </div>
            <label class="field field-span-2">
              <span>Client install args</span>
              <input v-model.trim="form.clientInstallArgs" placeholder='--install SERVER_URL="{SERVER}" PAIR_CODE="{PAIR_CODE}"' />
            </label>

            <label class="field field-span-2">
              <span>Agent installer URL</span>
              <input v-model.trim="form.agentInstallerUrl" placeholder="https://cdn.domain.com/agent-setup.exe" />
            </label>
            <label class="field field-span-2">
              <span>Agent fayl yuklash (EXE/MSI/ZIP)</span>
              <input ref="agentFileInput" class="file-input" type="file" accept=".exe,.msi,.zip" @change="onAgentFileSelected" />
            </label>
            <div class="inline-actions field-span-2">
              <button class="primary-btn" type="button" :disabled="agentUploading || !agentFile" @click="uploadAgentFile">
                <Icon name="lucide:upload" size="14" />
                <span>{{ agentUploading ? 'Yuklanmoqda...' : 'Agent yuklash' }}</span>
              </button>
              <span v-if="agentFileName" class="helper-chip">{{ agentFileName }}</span>
            </div>
            <label class="field">
              <span>Agent install args</span>
              <input v-model.trim="form.agentInstallArgs" placeholder='/quiet SERVER_URL="{SERVER}" PAIR_CODE="{PAIR_CODE}"' />
            </label>
            <label class="field">
              <span>Agent SHA256</span>
              <input v-model.trim="form.agentHash" readonly />
            </label>
          </div>
        </CpPanelCard>

        <CpPanelCard title="Shell installer" subtitle="Shell URL, upload va hash">
          <div class="form-grid">
            <label class="field field-span-2">
              <span>Shell installer URL</span>
              <input v-model.trim="form.shellInstallerUrl" placeholder="https://cdn.domain.com/shell-setup.exe" />
            </label>
            <label class="field field-span-2">
              <span>Shell fayl yuklash (EXE/MSI/ZIP)</span>
              <input ref="shellFileInput" class="file-input" type="file" accept=".exe,.msi,.zip" @change="onShellFileSelected" />
            </label>
            <div class="inline-actions field-span-2">
              <button class="primary-btn" type="button" :disabled="shellUploading || !shellFile" @click="uploadShellFile">
                <Icon name="lucide:upload" size="14" />
                <span>{{ shellUploading ? 'Yuklanmoqda...' : 'Shell yuklash' }}</span>
              </button>
              <span v-if="shellFileName" class="helper-chip">{{ shellFileName }}</span>
            </div>
            <label class="field">
              <span>Shell install args</span>
              <input v-model.trim="form.shellInstallArgs" placeholder='/quiet SERVER_URL="{SERVER}"' />
            </label>
            <label class="field">
              <span>Shell SHA256</span>
              <input v-model.trim="form.shellHash" readonly />
            </label>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'shell'">
      <div class="content-grid">
        <CpPanelCard title="Shell autostart" subtitle="Windows start bo‘lganda ochiladi">
          <label class="check-line">
            <input v-model="form.shellAutostartEnabled" type="checkbox" />
            <span>Autostart yoqilgan</span>
          </label>

          <div class="form-grid">
            <label class="field field-span-2">
              <span>Shell EXE path</span>
              <input v-model.trim="form.shellAutostartPath" placeholder="C:\Program Files\NexoraCloud\NexoraCloud.exe" />
            </label>
            <label class="field">
              <span>Shell args</span>
              <input v-model.trim="form.shellAutostartArgs" placeholder="--kiosk" />
            </label>
            <label class="field">
              <span>Scope</span>
              <select v-model="form.shellAutostartScope">
                <option value="machine">Machine (HKLM)</option>
                <option value="user">User (HKCU)</option>
              </select>
            </label>
          </div>
        </CpPanelCard>

        <CpPanelCard title="Kiosk mode" subtitle="Explorer o‘rniga shell ishlatish">
          <label class="check-line danger">
            <input v-model="form.shellReplaceEnabled" type="checkbox" />
            <span>Explorer o‘rniga shell</span>
          </label>

          <div class="form-grid">
            <label class="field field-span-2">
              <span>Shell EXE path</span>
              <input v-model.trim="form.shellReplacePath" placeholder="C:\Program Files\NexoraCloud\NexoraCloud.exe" />
            </label>
            <label class="field field-span-2">
              <span>Shell args</span>
              <input v-model.trim="form.shellReplaceArgs" placeholder="--kiosk" />
            </label>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'location'">
      <div class="content-grid">
        <CpPanelCard title="Location" subtitle="Manzil va xarita preview">
          <div class="form-grid">
            <label class="field field-span-2">
              <span>Manzil</span>
              <input v-model.trim="form.address" placeholder="Toshkent, Chilonzor..." />
            </label>
            <label class="field">
              <span>Latitude</span>
              <input v-model.trim="form.lat" placeholder="41.2995" />
            </label>
            <label class="field">
              <span>Longitude</span>
              <input v-model.trim="form.lng" placeholder="69.2401" />
            </label>
          </div>

          <div class="inline-actions">
            <button class="ghost-btn" type="button" @click="useMyLocation">
              <Icon name="lucide:locate-fixed" size="14" />
              <span>Mening lokatsiyam</span>
            </button>
            <a v-if="mapExternalUrl" class="ghost-btn" :href="mapExternalUrl" target="_blank" rel="noopener">
              <Icon name="lucide:map-pinned" size="14" />
              <span>Xaritada ochish</span>
            </a>
          </div>
        </CpPanelCard>

        <CpPanelCard title="Map preview" subtitle="Koordinatalar asosida">
          <div v-if="mapEmbedUrl" class="map-shell">
            <iframe :src="mapEmbedUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
          <div v-else class="empty-preview wide">
            <Icon name="lucide:map-off" size="18" />
            <span>Map preview uchun lat/lng kiriting</span>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'telegram'">
      <CpPanelCard title="Telegram" subtitle="Smena xabarlari va bot konfiguratsiyasi">
        <div class="form-grid">
          <label class="field field-span-2">
            <span>Telegram bot token</span>
            <input v-model.trim="form.telegramBotToken" type="password" placeholder="123456:ABC-DEF..." />
          </label>
          <label class="field">
            <span>Telegram user</span>
            <input v-model.trim="form.telegramUser" placeholder="@club_owner yoki 123456789" />
          </label>
          <label class="field">
            <span>Telegram chat_id</span>
            <input v-model.trim="form.telegramChatId" placeholder="-1001234567890" />
          </label>
        </div>

        <label class="check-line">
          <input v-model="form.telegramShiftNotifications" type="checkbox" />
          <span>Smena xabarlarini yuborish</span>
        </label>
      </CpPanelCard>
    </template>

    <template v-else-if="activeTab === 'automation'">
      <CpPanelCard title="Auto shift" subtitle="Avtomatik smena jadvali va opening cash">
        <div class="form-grid">
          <label class="check-line field-span-2">
            <input v-model="form.autoShiftEnabled" type="checkbox" @change="onAutoShiftEnabledChange" />
            <span>Auto smena yoqilgan</span>
          </label>
          <label class="field">
            <span>Smena soni (24 soat)</span>
            <input v-model.number="autoShiftDraftCount" type="number" min="1" max="6" @input="applyAutoShiftCount" />
          </label>
          <label class="field">
            <span>Opening cash</span>
            <input v-model.number="form.autoShiftOpeningCash" type="number" min="0" />
          </label>
        </div>

        <div class="slot-list">
          <article v-for="(slot, idx) in form.autoShiftSlots" :key="`slot-${idx}`" class="slot-card">
            <div class="slot-top">
              <strong>Smena {{ idx + 1 }}</strong>
              <button class="icon-btn soft" type="button" :disabled="form.autoShiftSlots.length <= 1" @click="removeAutoShiftSlot(idx)">
                <Icon name="lucide:trash-2" size="14" />
              </button>
            </div>
            <div class="form-grid">
              <label class="field">
                <span>Nomi</span>
                <input v-model.trim="slot.label" :placeholder="`Smena ${idx + 1}`" />
              </label>
              <label class="field">
                <span>Boshlanish</span>
                <input v-model="slot.start" type="time" />
              </label>
              <label class="field">
                <span>Tugash</span>
                <input v-model="slot.end" type="time" />
              </label>
            </div>
          </article>
        </div>

        <div class="inline-actions">
          <button class="ghost-btn" type="button" :disabled="form.autoShiftSlots.length >= 6" @click="addAutoShiftSlot">
            <Icon name="lucide:plus" size="14" />
            <span>Smena qo‘shish</span>
          </button>
        </div>
      </CpPanelCard>
    </template>

    <div class="sticky-actions">
      <button class="primary-btn save-btn" type="button" :disabled="saving" @click="saveSettings">
        <Icon name="lucide:save" size="15" />
        <span>{{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpFormatters } from '../../../composables/useCpFormatters'

definePageMeta({
  layout: 'cp',
  roles: ['admin', 'owner'],
})

const { formatDateTime } = useCpFormatters()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')
const updatedAt = ref(new Date().toISOString())
const activeTab = ref('club')

const tabs = [
  { key: 'club', icon: 'lucide:badge-info', label: 'Club' },
  { key: 'media', icon: 'lucide:monitor-play', label: 'Media' },
  { key: 'installers', icon: 'lucide:download', label: 'Installers' },
  { key: 'shell', icon: 'lucide:monitor-cog', label: 'Shell' },
  { key: 'location', icon: 'lucide:map-pinned', label: 'Location' },
  { key: 'telegram', icon: 'lucide:send', label: 'Telegram' },
  { key: 'automation', icon: 'lucide:clock-3', label: 'Auto shift' },
]

const logoInput = ref(null)
const promoFileInput = ref(null)
const agentFileInput = ref(null)
const clientFileInput = ref(null)
const shellFileInput = ref(null)

const promoFile = ref(null)
const agentFile = ref(null)
const clientFile = ref(null)
const shellFile = ref(null)

const promoUploading = ref(false)
const agentUploading = ref(false)
const clientUploading = ref(false)
const shellUploading = ref(false)
const autoShiftDraftCount = ref(2)

const form = reactive({
  clubName: '',
  clubLogo: '',
  promoVideoUrl: '',
  agentInstallerUrl: '',
  agentInstallArgs: '',
  clientInstallerUrl: '',
  clientInstallArgs: '',
  shellInstallerUrl: '',
  shellInstallArgs: '',
  agentHash: '',
  shellHash: '',
  address: '',
  lat: '',
  lng: '',
  telegramUser: '',
  telegramChatId: '',
  telegramBotToken: '',
  telegramShiftNotifications: true,
  autoShiftEnabled: false,
  autoShiftSlots: [],
  autoShiftOpeningCash: 0,
  shellAutostartEnabled: true,
  shellAutostartPath: '',
  shellAutostartArgs: '',
  shellAutostartScope: 'machine',
  shellReplaceEnabled: false,
  shellReplacePath: '',
  shellReplaceArgs: '',
})

const updatedAtLabel = computed(() => formatDateTime(updatedAt.value))
const promoFileName = computed(() => promoFile.value?.name || '')
const agentFileName = computed(() => agentFile.value?.name || '')
const clientFileName = computed(() => clientFile.value?.name || '')
const shellFileName = computed(() => shellFile.value?.name || '')
const clubReady = computed(() => !!form.clubName.trim() || !!form.clubLogo)
const mediaReady = computed(() => !!form.promoVideoUrl.trim())
const installersReadyCount = computed(() => [form.clientInstallerUrl, form.agentInstallerUrl, form.shellInstallerUrl].filter((item) => String(item || '').trim()).length)
const readySections = computed(() => [
  clubReady.value,
  mediaReady.value,
  installersReadyCount.value > 0,
  !!form.shellAutostartPath.trim() || !!form.shellReplacePath.trim(),
  !!form.address.trim() || (validNumber(form.lat) !== null && validNumber(form.lng) !== null),
  !!form.telegramBotToken.trim() || !!form.telegramUser.trim() || !!form.telegramChatId.trim(),
  form.autoShiftEnabled ? normalizeSlots(form.autoShiftSlots).length > 0 : false,
].filter(Boolean).length)

function getYoutubeId(raw) {
  try {
    const url = new URL(String(raw || '').trim())
    const host = (url.hostname || '').toLowerCase()
    if (host.includes('youtu.be')) return url.pathname.replace('/', '').trim()
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com') || host.includes('m.youtube.com')) {
      const v = url.searchParams.get('v')
      if (v) return v
      const parts = url.pathname.split('/').filter(Boolean)
      const idx = parts.indexOf('embed')
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
    }
  } catch (_) {}
  const match = String(raw || '').match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{6,})/)
  return match ? match[1] : ''
}

const promoPreviewType = computed(() => {
  const url = String(form.promoVideoUrl || '').trim()
  if (!url) return ''
  if (/(\.gif)(\?|#|$)/i.test(url) || url.toLowerCase().startsWith('data:image/gif')) return 'gif'
  if (/(\.mp4|\.webm)(\?|#|$)/i.test(url)) return 'video'
  if (getYoutubeId(url)) return 'youtube'
  return ''
})

const promoPreviewUrl = computed(() => {
  const url = String(form.promoVideoUrl || '').trim()
  if (!url) return ''
  if (promoPreviewType.value === 'youtube') {
    const id = getYoutubeId(url)
    if (!id) return ''
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1`
  }
  return url
})

const mapExternalUrl = computed(() => {
  const lat = validNumber(form.lat)
  const lng = validNumber(form.lng)
  if (lat === null || lng === null) return ''
  return `https://www.google.com/maps?q=${lat},${lng}`
})

const mapEmbedUrl = computed(() => {
  const lat = validNumber(form.lat)
  const lng = validNumber(form.lng)
  if (lat === null || lng === null) return ''
  return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
})

function normalizeLogoSrc(raw) {
  if (typeof raw !== 'string') return ''
  let value = raw.trim()
  if (!value) return ''
  try {
    const decoded = decodeURIComponent(value)
    if (decoded) value = decoded
  } catch (_) {}
  value = value.replace(/^[\"']+|[\"']+$/g, '').trim()
  if (!value) return ''
  const lower = value.toLowerCase()
  if (lower.startsWith('data:image/')) return value
  if (lower.startsWith('http://') || lower.startsWith('https://') || value.startsWith('/')) return value
  return ''
}

function parseSettings(items) {
  const out = {}
  for (const row of Array.isArray(items) ? items : []) {
    if (row && typeof row.key === 'string') out[row.key] = row.value
  }
  return out
}

function validNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function cloneSlots(slots) {
  return (Array.isArray(slots) ? slots : []).map((slot, idx) => ({
    label: String(slot?.label || `Smena ${idx + 1}`),
    start: String(slot?.start || ''),
    end: String(slot?.end || ''),
  }))
}

function normalizeSlots(raw) {
  const list = Array.isArray(raw) ? raw : []
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i] || {}
    const start = String(item.start || item.from || '').slice(0, 5)
    const end = String(item.end || item.to || '').slice(0, 5)
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) continue
    out.push({ label: String(item.label || `Smena ${i + 1}`), start, end })
  }
  return out
}

function createDefaultSlot(index) {
  if (index === 0) return { label: 'Kunduzgi', start: '09:00', end: '21:00' }
  if (index === 1) return { label: 'Tungi', start: '21:00', end: '09:00' }
  return { label: `Smena ${index + 1}`, start: '00:00', end: '08:00' }
}

function applyAutoShiftCount() {
  const next = Math.max(1, Math.min(6, Number(autoShiftDraftCount.value || 1)))
  autoShiftDraftCount.value = next
  const current = cloneSlots(form.autoShiftSlots)
  while (current.length < next) current.push(createDefaultSlot(current.length))
  if (current.length > next) current.length = next
  form.autoShiftSlots = current
}

function onAutoShiftEnabledChange() {
  if (form.autoShiftEnabled && !form.autoShiftSlots.length) applyAutoShiftCount()
}

function addAutoShiftSlot() {
  if (form.autoShiftSlots.length >= 6) return
  form.autoShiftSlots.push(createDefaultSlot(form.autoShiftSlots.length))
  autoShiftDraftCount.value = form.autoShiftSlots.length
}

function removeAutoShiftSlot(index) {
  if (form.autoShiftSlots.length <= 1) return
  form.autoShiftSlots.splice(index, 1)
  autoShiftDraftCount.value = form.autoShiftSlots.length
}

async function loadSettings() {
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const { data } = await cpApi.settingsList()
    const map = parseSettings(data?.data || [])
    form.clubName = typeof map.club_name === 'string' ? map.club_name : ''
    form.clubLogo = normalizeLogoSrc(map.club_logo)
    form.promoVideoUrl = typeof map.promo_video_url === 'string' ? map.promo_video_url : ''
    form.agentInstallerUrl = typeof map.deploy_agent_download_url === 'string' ? map.deploy_agent_download_url : ''
    form.agentInstallArgs = typeof map.deploy_agent_install_args === 'string' ? map.deploy_agent_install_args : ''
    form.clientInstallerUrl = typeof map.deploy_client_download_url === 'string' ? map.deploy_client_download_url : ''
    form.clientInstallArgs = typeof map.deploy_client_install_args === 'string' ? map.deploy_client_install_args : ''
    form.shellInstallerUrl = typeof map.deploy_shell_download_url === 'string' ? map.deploy_shell_download_url : ''
    form.shellInstallArgs = typeof map.deploy_shell_install_args === 'string' ? map.deploy_shell_install_args : ''
    form.agentHash = typeof map.deploy_agent_sha256 === 'string' ? map.deploy_agent_sha256 : ''
    form.shellHash = typeof map.deploy_shell_sha256 === 'string' ? map.deploy_shell_sha256 : ''
    form.shellAutostartEnabled = !!map.shell_autostart_enabled
    form.shellAutostartPath = typeof map.shell_autostart_path === 'string' ? map.shell_autostart_path : ''
    form.shellAutostartArgs = typeof map.shell_autostart_args === 'string' ? map.shell_autostart_args : ''
    form.shellAutostartScope = typeof map.shell_autostart_scope === 'string' ? map.shell_autostart_scope : 'machine'
    form.shellReplaceEnabled = !!map.shell_replace_explorer_enabled
    form.shellReplacePath = typeof map.shell_replace_explorer_path === 'string' ? map.shell_replace_explorer_path : ''
    form.shellReplaceArgs = typeof map.shell_replace_explorer_args === 'string' ? map.shell_replace_explorer_args : ''
    const loc = map.club_location && typeof map.club_location === 'object' ? map.club_location : {}
    form.address = typeof loc.address === 'string' ? loc.address : ''
    form.lat = loc.lat == null ? '' : String(loc.lat)
    form.lng = loc.lng == null ? '' : String(loc.lng)
    form.telegramUser = typeof map.telegram_user === 'string' ? map.telegram_user : ''
    form.telegramChatId = typeof map.telegram_chat_id === 'string' ? map.telegram_chat_id : ''
    form.telegramBotToken = typeof map.telegram_bot_token === 'string' ? map.telegram_bot_token : ''
    form.telegramShiftNotifications = map.telegram_shift_notifications === undefined ? true : !!map.telegram_shift_notifications
    form.autoShiftEnabled = map.auto_shift_enabled === undefined ? false : !!map.auto_shift_enabled
    form.autoShiftSlots = normalizeSlots(map.auto_shift_slots)
    form.autoShiftOpeningCash = Math.max(0, Number(map.auto_shift_opening_cash || 0))
    autoShiftDraftCount.value = form.autoShiftSlots.length || 2
    updatedAt.value = new Date().toISOString()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Settings yuklanmadi'
  } finally {
    loading.value = false
  }
}

function onLogoSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  if (file.size > 1024 * 1024) {
    error.value = "Logo 1MB dan katta bo'lmasin"
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.clubLogo = normalizeLogoSrc(String(reader.result || ''))
    error.value = ''
  }
  reader.readAsDataURL(file)
}

function clearLogo() {
  form.clubLogo = ''
  if (logoInput.value) logoInput.value.value = ''
}

function onPromoFileSelected(event) {
  promoFile.value = event?.target?.files?.[0] || null
}

async function uploadPromoFile() {
  if (!promoFile.value) return
  promoUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const formData = new FormData()
    formData.append('file', promoFile.value)
    const { data } = await cpApi.promoVideoUpload(formData)
    if (data?.url) form.promoVideoUrl = data.url
    promoFile.value = null
    if (promoFileInput.value) promoFileInput.value.value = ''
    message.value = 'Promo video yuklandi'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Promo yuklanmadi'
  } finally {
    promoUploading.value = false
  }
}

function onAgentFileSelected(event) {
  agentFile.value = event?.target?.files?.[0] || null
}

async function uploadAgentFile() {
  if (!agentFile.value) return
  agentUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const formData = new FormData()
    formData.append('file', agentFile.value)
    const { data } = await cpApi.agentInstallerUpload(formData)
    if (data?.url) form.agentInstallerUrl = data.url
    if (data?.sha256) form.agentHash = data.sha256
    agentFile.value = null
    if (agentFileInput.value) agentFileInput.value.value = ''
    message.value = 'Agent installer yuklandi'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Agent installer yuklanmadi'
  } finally {
    agentUploading.value = false
  }
}

function onClientFileSelected(event) {
  clientFile.value = event?.target?.files?.[0] || null
}

async function uploadClientFile() {
  if (!clientFile.value) return
  clientUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const formData = new FormData()
    formData.append('file', clientFile.value)
    const { data } = await cpApi.clientInstallerUpload(formData)
    if (data?.url) form.clientInstallerUrl = data.url
    clientFile.value = null
    if (clientFileInput.value) clientFileInput.value.value = ''
    message.value = 'Client installer yuklandi'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Client installer yuklanmadi'
  } finally {
    clientUploading.value = false
  }
}

function onShellFileSelected(event) {
  shellFile.value = event?.target?.files?.[0] || null
}

async function uploadShellFile() {
  if (!shellFile.value) return
  shellUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const formData = new FormData()
    formData.append('file', shellFile.value)
    const { data } = await cpApi.shellInstallerUpload(formData)
    if (data?.url) form.shellInstallerUrl = data.url
    if (data?.sha256) form.shellHash = data.sha256
    shellFile.value = null
    if (shellFileInput.value) shellFileInput.value.value = ''
    message.value = 'Shell installer yuklandi'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Shell installer yuklanmadi'
  } finally {
    shellUploading.value = false
  }
}

function useMyLocation() {
  error.value = ''
  message.value = ''
  if (!process.client || !navigator?.geolocation) {
    error.value = 'Brauzer geolokatsiyani qo‘llamaydi'
    return
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.lat = String(position.coords.latitude)
      form.lng = String(position.coords.longitude)
      message.value = 'Lokatsiya olindi'
    },
    () => {
      error.value = 'Lokatsiyani olib bo‘lmadi'
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

async function saveSettings() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const payload = {
      settings: {
        club_name: form.clubName.trim(),
        club_logo: form.clubLogo || '',
        promo_video_url: form.promoVideoUrl.trim(),
        deploy_agent_download_url: form.agentInstallerUrl.trim(),
        deploy_agent_install_args: form.agentInstallArgs.trim(),
        deploy_client_download_url: form.clientInstallerUrl.trim(),
        deploy_client_install_args: form.clientInstallArgs.trim(),
        deploy_shell_download_url: form.shellInstallerUrl.trim(),
        deploy_shell_install_args: form.shellInstallArgs.trim(),
        deploy_agent_sha256: form.agentHash.trim(),
        deploy_shell_sha256: form.shellHash.trim(),
        shell_autostart_enabled: !!form.shellAutostartEnabled,
        shell_autostart_path: form.shellAutostartPath.trim(),
        shell_autostart_args: form.shellAutostartArgs.trim(),
        shell_autostart_scope: form.shellAutostartScope,
        shell_replace_explorer_enabled: !!form.shellReplaceEnabled,
        shell_replace_explorer_path: form.shellReplacePath.trim(),
        shell_replace_explorer_args: form.shellReplaceArgs.trim(),
        club_location: {
          address: form.address.trim(),
          lat: validNumber(form.lat),
          lng: validNumber(form.lng),
        },
        telegram_user: form.telegramUser.trim(),
        telegram_chat_id: form.telegramChatId.trim(),
        telegram_bot_token: form.telegramBotToken.trim(),
        telegram_shift_notifications: !!form.telegramShiftNotifications,
        auto_shift_enabled: !!form.autoShiftEnabled,
        auto_shift_slots: normalizeSlots(form.autoShiftSlots),
        auto_shift_opening_cash: Math.max(0, Number(form.autoShiftOpeningCash || 0)),
      },
    }
    await cpApi.settingsUpdate(payload)
    updatedAt.value = new Date().toISOString()
    message.value = 'Settings saqlandi'
    if (process.client) {
      window.dispatchEvent(new CustomEvent('cp-club-settings-updated', {
        detail: {
          club_name: form.clubName,
          club_logo: form.clubLogo,
        },
      }))
    }
  } catch (e) {
    error.value = e?.response?.data?.message || 'Settings saqlanmadi'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  if (!form.autoShiftSlots.length) applyAutoShiftCount()
})
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.tab-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--stroke);
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 96%, transparent), color-mix(in srgb, var(--surface) 100%, transparent));
}

.tab-btn,
.ghost-btn,
.primary-btn,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color .18s ease, transform .18s ease, background .18s ease;
}

.tab-btn.active,
.primary-btn {
  border-color: color-mix(in srgb, var(--brand-secondary) 36%, var(--stroke));
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 14%, var(--surface-soft)), color-mix(in srgb, var(--brand) 14%, var(--surface)));
}

.ghost-btn:hover,
.primary-btn:hover,
.tab-btn:hover,
.icon-btn:hover {
  transform: translateY(-1px);
  border-color: var(--stroke-strong);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field,
.check-line {
  display: grid;
  gap: 8px;
}

.field-span-2 {
  grid-column: span 2;
}

.field span,
.slot-top strong {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.field input,
.field select,
.field textarea,
.file-input {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 14px;
  outline: none;
}

.field textarea {
  min-height: 132px;
  padding: 14px;
  resize: vertical;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: color-mix(in srgb, var(--brand-secondary) 38%, var(--stroke));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-secondary) 14%, transparent);
}

.logo-layout {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.logo-preview,
.video-shell,
.map-shell,
.slot-card,
.empty-preview,
.panel-error,
.panel-ok {
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  border-radius: 18px;
}

.logo-preview {
  width: 132px;
  height: 132px;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-preview {
  min-height: 132px;
  display: grid;
  place-items: center;
  gap: 6px;
  color: var(--text-muted);
}

.empty-preview.wide {
  min-height: 240px;
}

.stack-col {
  display: grid;
  gap: 12px;
}

.inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 14px;
}

.helper-chip,
.hero-meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.video-shell,
.map-shell {
  min-height: 280px;
  overflow: hidden;
}

.video-shell img,
.video-shell video,
.video-shell iframe,
.map-shell iframe {
  width: 100%;
  height: 100%;
  min-height: 280px;
  object-fit: cover;
  border: 0;
}

.check-line {
  grid-auto-flow: column;
  justify-content: start;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--surface-soft);
}

.check-line input {
  width: 16px;
  height: 16px;
}

.check-line.danger {
  border-color: color-mix(in srgb, var(--danger) 30%, var(--stroke));
}

.slot-list {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.slot-card {
  padding: 14px;
}

.slot-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.icon-btn {
  min-width: 42px;
  width: 42px;
  padding: 0;
}

.icon-btn.soft {
  background: color-mix(in srgb, var(--danger) 8%, var(--surface-soft));
  border-color: color-mix(in srgb, var(--danger) 24%, var(--stroke));
}

.sticky-actions {
  position: sticky;
  bottom: 18px;
  display: flex;
  justify-content: flex-end;
  z-index: 4;
}

.save-btn {
  min-width: 170px;
  box-shadow: 0 18px 30px rgba(9, 20, 40, 0.14);
}

.panel-error,
.panel-ok {
  padding: 13px 16px;
  font-size: 13px;
  font-weight: 700;
}

.panel-error {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 28%, var(--stroke));
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
}

.panel-ok {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 24%, var(--stroke));
  background: color-mix(in srgb, var(--success) 8%, var(--surface));
}

@media (max-width: 1180px) {
  .stats-grid,
  .content-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .stats-grid,
  .content-grid,
  .form-grid,
  .logo-layout {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: span 1;
  }

  .logo-preview {
    width: 100%;
    max-width: 180px;
  }
}
</style>
