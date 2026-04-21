<template>
  <div class="pcs-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="meta-chip">{{ copy.visible }}: {{ filteredPcs.length }}</span>
        <span class="meta-chip">{{ zone === 'all' ? copy.allZones : zone }}</span>
      </template>

      <template #actions>
        <div class="hero-tools">
          <input v-model="search" class="search-input" :placeholder="copy.searchPlaceholder" />
          <select v-model="zone" class="select-input">
            <option value="all">{{ copy.allZones }}</option>
            <option v-for="item in zoneOptions" :key="item" :value="item">{{ item }}</option>
          </select>
          <select v-model="status" class="select-input">
            <option value="all">{{ copy.allStatuses }}</option>
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <button class="primary-btn" :disabled="loading" @click="refreshAll">
            {{ loading ? copy.refreshing : copy.refresh }}
          </button>
          <button v-if="canManagePcs" class="primary-btn" :disabled="create.loading" @click="openCreate">
            {{ copy.add }}
          </button>
        </div>
      </template>
    </CpPageHero>

    <AddPcModal
      v-model="create.open"
      :zones="zones"
      :loading="create.loading"
      :error="create.err"
      :initial="{ zone_id: zones[0]?.id ?? null }"
      @submit="createSaveFromModal"
    />

    <div class="stats-grid">
      <CpStatCard :label="copy.total" :value="String(pcs.length)" :hint="`Online ${onlineCount} · Busy ${busyCount}`" tone="tone-blue" />
      <CpStatCard :label="copy.reserved" :value="String(reservedCount)" :hint="`Offline ${offlineCount} · Locked ${lockedCount}`" tone="tone-amber" />
      <CpStatCard :label="copy.visible" :value="String(filteredPcs.length)" :hint="zone === 'all' ? copy.allZones : zone" tone="tone-green" />
    </div>

    <div class="zone-stack">
      <CpPanelCard
        v-for="group in groupedPcs"
        :key="group.zone"
        :title="group.zone"
        :subtitle="`${group.items.length} ta PC`"
      >
        <div class="pc-grid">
          <article v-for="pc in group.items" :key="pc.id" class="pc-card" :class="`tone-${pc.status}`">
            <div class="pc-top">
              <div>
                <h3>{{ pc.code || pc.name || `PC #${pc.id}` }}</h3>
                <p>{{ pc.ip_address || copy.noIp }}</p>
              </div>
              <span class="status-badge">{{ statusLabel(pc.status) }}</span>
            </div>

            <div class="pc-meta">
              <div>
                <span>{{ copy.client }}</span>
                <strong>{{ pc.active_session?.client?.login || pc.active_session?.client?.phone || copy.noClient }}</strong>
              </div>
              <div>
                <span>{{ copy.tariff }}</span>
                <strong>{{ pc.active_session?.tariff?.name || copy.noTariff }}</strong>
              </div>
              <div>
                <span>{{ copy.balance }}</span>
                <strong>{{ formatMoney(pc.client_balance) }} UZS</strong>
              </div>
              <div>
                <span>{{ copy.lastSeen }}</span>
                <strong>{{ pc.last_seen_at ? formatDateTime(pc.last_seen_at) : copy.noLastSeen }}</strong>
              </div>
            </div>

            <div class="pc-actions">
              <NuxtLink class="ghost-btn" to="/cp/layout">{{ copy.layout }}</NuxtLink>
              <button class="ghost-btn" @click="sendCommand(pc, 'LOCK')">{{ copy.lock }}</button>
              <button class="ghost-btn" @click="sendCommand(pc, 'REBOOT')">{{ copy.reboot }}</button>
              <button class="ghost-btn" @click="sendCommand(pc, 'SHUTDOWN')">{{ copy.shutdown }}</button>
            </div>
          </article>
        </div>
      </CpPanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { cpApi } from '@legacy/api/cp'
import AddPcModal from '@legacy/components/cp/AddPcModal.vue'
import { hasRole, useCpAuthStore } from '@legacy/stores/cpAuth'
import { useCpFormatters } from '../../../composables/useCpFormatters'
import { useCpCopy } from '../../../composables/useCpCopy'
import { cpNativePageCopy } from '../../constants/cp-native-copy'

definePageMeta({
  layout: 'cp',
})

const copy = useCpCopy(cpNativePageCopy.pcs)
const auth = useCpAuthStore()

useHead({
  title: computed(() => `${copy.value.headTitle} · NEXORA CLOUD CP`),
})

const { formatMoney, formatDateTime } = useCpFormatters()

function txt(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`))
}

const loading = ref(false)
const pcs = ref<any[]>([])
const zones = ref<any[]>([])
const search = ref('')
const zone = ref('all')
const status = ref('all')
const create = reactive({
  open: false,
  loading: false,
  err: '',
})

let refreshTimer: number | null = null

const canManagePcs = computed(() => hasRole(auth.operator, ['admin', 'owner']))

const statusOptions = computed(() => [
  { value: 'online', label: copy.value.statuses.online },
  { value: 'busy', label: copy.value.statuses.busy },
  { value: 'reserved', label: copy.value.statuses.reserved },
  { value: 'offline', label: copy.value.statuses.offline },
  { value: 'locked', label: copy.value.statuses.locked },
])

const zoneOptions = computed(() => zones.value.map((item) => item.name).filter(Boolean))
const filteredPcs = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return pcs.value.filter((pc) => {
    const matchesZone = zone.value === 'all' ? true : (pc.zone || copy.value.noZone) === zone.value
    const matchesStatus = status.value === 'all' ? true : pc.status === status.value
    const matchesSearch = !needle
      ? true
      : [pc.code, pc.name, pc.ip_address, pc.active_session?.client?.login]
          .filter(Boolean)
          .some((item) => String(item).toLowerCase().includes(needle))
    return matchesZone && matchesStatus && matchesSearch
  })
})

const groupedPcs = computed(() => {
  const bucket = new Map<string, any[]>()
  for (const pc of filteredPcs.value) {
    const key = pc.zone || copy.value.noZone
    if (!bucket.has(key)) bucket.set(key, [])
    bucket.get(key)?.push(pc)
  }
  return Array.from(bucket.entries()).map(([zoneName, items]) => ({ zone: zoneName, items }))
})

const onlineCount = computed(() => pcs.value.filter((item) => item.status === 'online').length)
const busyCount = computed(() => pcs.value.filter((item) => item.status === 'busy').length)
const reservedCount = computed(() => pcs.value.filter((item) => item.status === 'reserved').length)
const offlineCount = computed(() => pcs.value.filter((item) => item.status === 'offline').length)
const lockedCount = computed(() => pcs.value.filter((item) => item.status === 'locked').length)

function statusLabel(value: string) {
  return copy.value.statuses[value as keyof typeof copy.value.statuses] || value
}

function pickRows(resp: any) {
  const data = resp?.data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.data)) return data.data.data
  return []
}

async function refreshAll() {
  loading.value = true
  try {
    const [pcsResp, zonesResp] = await Promise.all([
      cpApi.pcs({}).catch(() => ({ data: { data: [] } })),
      (cpApi.zoneList || cpApi.zonesList)({ per_page: 200 }).catch(() => ({ data: { data: [] } })),
    ])
    pcs.value = Array.isArray(pcsResp?.data?.data) ? pcsResp.data.data : []
    zones.value = pickRows(zonesResp).map((item: any) => ({
      id: item.id,
      name: item.name || item.title,
    }))
  } finally {
    loading.value = false
  }
}

async function openCreate() {
  create.err = ''
  if (!zones.value.length) {
    await refreshAll()
  }
  create.open = true
}

async function createSaveFromModal(payload: { code?: string; zone_id?: string | number | null; ip_address?: string | null }) {
  const code = String(payload?.code || '').trim()
  const zoneId = Number(payload?.zone_id || 0)

  create.err = ''
  if (!code) {
    create.err = copy.value.codeRequired
    return
  }
  if (!zoneId) {
    create.err = copy.value.zoneRequired
    return
  }

  create.loading = true
  try {
    await cpApi.createPc({
      code,
      zone_id: zoneId,
      ip_address: payload?.ip_address || null,
      status: 'offline',
    })
    ElMessage.success(copy.value.created)
    create.open = false
    await refreshAll()
  } catch (error: any) {
    create.err = error?.response?.data?.message || copy.value.createError
  } finally {
    create.loading = false
  }
}

async function sendCommand(pc: any, type: string) {
  try {
    await ElMessageBox.confirm(txt(copy.value.sendCommandConfirm, { pc: pc.code || pc.name, type }), copy.value.confirmTitle, {
      type: 'warning',
      confirmButtonText: copy.value.confirmYes,
      cancelButtonText: copy.value.confirmNo,
    })
  } catch {
    return
  }

  await cpApi.sendPcCommand(pc.id, { type })
  ElMessage.success(txt(copy.value.commandSent, { type }))
}

onMounted(async () => {
  await refreshAll()
  refreshTimer = window.setInterval(refreshAll, 15000)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<style scoped>
.pcs-page { display:grid; gap:16px; }
.hero-tools { display:grid; grid-template-columns:minmax(220px,1.4fr) repeat(2,minmax(150px,1fr)) repeat(2,max-content); gap:10px; width:min(100%, 1120px); }
.meta-chip,
.search-input,
.select-input,
.primary-btn,
.ghost-btn { border-radius:14px; border:1px solid var(--stroke); background:var(--surface-soft); color:var(--text); }
.meta-chip { display:inline-flex; align-items:center; min-height:32px; padding:0 12px; border-radius:999px; font-size:12px; color:var(--text-muted); }
.search-input,.select-input,.primary-btn,.ghost-btn { height:44px; padding:0 14px; }
.primary-btn { background:linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 72%, white), color-mix(in srgb, var(--brand) 64%, transparent)); border-color:color-mix(in srgb, var(--brand-secondary) 24%, var(--stroke)); color:#08111e; font-weight:800; }
.stats-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
.zone-stack { display:grid; gap:16px; }
.pc-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
.pc-card { padding:16px; border-radius:18px; border:1px solid var(--stroke); background:var(--surface-soft); display:grid; gap:14px; }
.pc-card h3 { margin:0; font-size:18px; }
.pc-card p { margin:6px 0 0; font-size:12px; color:var(--text-muted); }
.pc-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.status-badge { padding:6px 10px; border-radius:999px; border:1px solid var(--stroke); background:var(--surface-muted); font-size:11px; text-transform:uppercase; }
.pc-meta { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.pc-meta div { padding:12px; border-radius:14px; background:var(--surface-muted); }
.pc-meta span { display:block; font-size:11px; color:var(--text-faint); text-transform:uppercase; }
.pc-meta strong { display:block; margin-top:8px; font-size:14px; }
.pc-actions { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
.ghost-btn { display:inline-flex; align-items:center; justify-content:center; text-decoration:none; cursor:pointer; }
.tone-busy { border-color:color-mix(in srgb, var(--accent) 30%, var(--stroke)); }
.tone-online { border-color:color-mix(in srgb, var(--success) 30%, var(--stroke)); }
.tone-reserved { border-color:color-mix(in srgb, var(--brand-secondary) 30%, var(--stroke)); }
.tone-offline,.tone-locked { border-color:color-mix(in srgb, var(--text-faint) 30%, var(--stroke)); }
@media (max-width:1200px) { .hero-tools,.pc-grid,.stats-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:760px) { .hero-tools,.pc-grid,.stats-grid,.pc-meta,.pc-actions { grid-template-columns:1fr; } }
</style>
