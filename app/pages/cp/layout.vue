<template>
  <div class="layout-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="meta-chip">{{ copy.updatedAt }}: {{ refreshedAtLabel }}</span>
      </template>
      <template #actions>
        <div class="hero-actions">
          <label class="switch-chip">
            <input v-model="autoRefresh" type="checkbox" />
            <span>{{ copy.autoRefresh }}</span>
          </label>
          <button class="primary-btn" :disabled="loading || saving" @click="reload">
            {{ loading ? copy.refreshing : copy.refresh }}
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard :label="copy.totalPcs" :value="String(pcs.length)" :hint="`${freePcs.length} ${copy.freeNow.toLowerCase()}`" tone="tone-blue" />
      <CpStatCard :label="copy.activeNow" :value="String(counts.busy)" :hint="`${counts.online} ${copy.statuses.online}`" tone="tone-green" />
      <CpStatCard :label="copy.reservedNow" :value="String(counts.reserved)" :hint="`${counts.locked} ${copy.statuses.locked}`" tone="tone-amber" />
      <CpStatCard :label="copy.freeNow" :value="String(freePcs.length)" :hint="`${counts.offline} ${copy.statuses.offline}`" tone="tone-rose" />
    </div>

    <p v-if="pageError" class="alert err">{{ pageError }}</p>

    <div class="workspace-grid">
      <CpPanelCard :title="copy.legendTitle" :subtitle="copy.legendSubtitle" class="side-panel">
        <div class="legend-list">
          <article v-for="item in legendItems" :key="item.key" class="legend-card" :class="item.tone">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>

        <div class="section-block">
          <h3>{{ copy.freeTrayTitle }}</h3>
          <p>{{ copy.freeTrayHint }}</p>
          <div
            class="tray-dropzone"
            :class="{ active: trayDragOver }"
            @dragover="onTrayDragOver"
            @dragleave="onTrayDragLeave"
            @drop="onTrayDrop"
          >
            <button
              v-for="pc in freePcs"
              :key="pc.id"
              class="tray-chip"
              draggable="true"
              @dragstart="onTrayDragStart(pc, $event)"
              @dragend="onDragEnd"
            >
              <strong>{{ pc.code }}</strong>
              <span>{{ statusLabel(pc.status) }}</span>
            </button>
            <div v-if="!freePcs.length" class="empty-mini">{{ copy.trayEmpty }}</div>
          </div>
        </div>
      </CpPanelCard>

      <section class="board-shell">
        <header class="board-head">
          <p>{{ copy.hallTitle }}</p>
          <span>{{ displayGrid.rows }} x {{ displayGrid.cols }}</span>
        </header>

        <div ref="gridRef" class="board-canvas">
          <div class="hall-grid" :style="{ '--cols': displayGrid.cols }">
            <article
              v-for="cell in gridCells"
              :key="cell.key"
              class="hall-cell"
              :class="cellClass(cell)"
              :style="cellStyle(cell)"
              :draggable="Boolean(cell.pc)"
              @click="onCellClick(cell)"
              @dragstart="onDragStart(cell, $event)"
              @dragend="onDragEnd"
              @dragover="onDragOver(cell, $event)"
              @dragleave="onDragLeave(cell)"
              @drop="onDrop(cell, $event)"
            >
              <div class="cell-top">
                <span class="cell-label">{{ cell.top || `${cell.row}.${cell.col}` }}</span>
                <span class="status-pill mini" :class="`tone-${cell.status}`">{{ statusLabel(cell.status) }}</span>
              </div>
              <div class="cell-main">
                <strong>{{ cell.pc?.code || cell.base?.label || '-' }}</strong>
                <span>{{ cell.bottom }}</span>
                <small v-if="sessionClientLabel(cell.pc)">{{ sessionClientLabel(cell.pc) }}</small>
              </div>
            </article>
          </div>
        </div>
      </section>

      <CpPanelCard :title="copy.detailsTitle" :subtitle="copy.detailsSubtitle" class="detail-panel">
        <template v-if="selectedPc">
          <div class="detail-grid">
            <div class="detail-card">
              <span>{{ copy.selectedCell }}</span>
              <strong>{{ selectedCellLabel }}</strong>
            </div>
            <div class="detail-card">
              <span>{{ copy.selectedStatus }}</span>
              <strong>{{ statusLabel(selectedPc.status) }}</strong>
            </div>
            <div class="detail-card">
              <span>{{ copy.sessionClient }}</span>
              <strong>{{ sessionClientLabel(selectedPc) || copy.noClient }}</strong>
            </div>
            <div class="detail-card">
              <span>{{ copy.balance }}</span>
              <strong>{{ formatMoney(selectedPc.client_balance) }} UZS</strong>
            </div>
          </div>

          <div class="detail-actions">
            <button class="ghost-btn" :disabled="saving || !selectedCell?.base" @click="detachSelectedPc">{{ copy.detach }}</button>
            <button class="ghost-btn danger" :disabled="!selectedPc.active_session" @click="stopSessionForPc(selectedPc)">{{ copy.stopSession }}</button>
            <button class="ghost-btn" @click="sendPcAction(selectedPc, 'REBOOT')">{{ copy.reboot }}</button>
            <button class="ghost-btn danger" @click="sendPcAction(selectedPc, 'SHUTDOWN')">{{ copy.shutdown }}</button>
          </div>

          <div class="detail-list">
            <div class="info-row"><span>{{ copy.tariff }}</span><strong>{{ selectedPc.active_session?.tariff?.name || copy.noTariff }}</strong></div>
            <div class="info-row"><span>{{ copy.network }}</span><strong>{{ selectedPc.ip || copy.noIp }}</strong></div>
            <div class="info-row"><span>{{ copy.cpu }}</span><strong>{{ selectedHardware.cpu }}</strong></div>
            <div class="info-row"><span>{{ copy.ram }}</span><strong>{{ selectedHardware.ram }}</strong></div>
            <div class="info-row"><span>{{ copy.gpu }}</span><strong>{{ selectedHardware.gpu }}</strong></div>
            <div class="info-row"><span>{{ copy.notes }}</span><strong>{{ selectedNote }}</strong></div>
          </div>
        </template>
        <div v-else class="empty-state">{{ copy.noSelection }}</div>
      </CpPanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'
import { cpNativePageCopy } from '../../constants/cp-native-copy'

definePageMeta({ layout: 'cp' })

const copy = useCpCopy(cpNativePageCopy.layout)
useHead({ title: computed(() => `${copy.value.headTitle} · NEXORA CLOUD CP`) })

const { formatMoney, formatDateTime } = useCpFormatters()
const gridRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const saving = ref(false)
const autoRefresh = ref(true)
const pageError = ref('')
const refreshedAt = ref<string | null>(null)
const nowTick = ref(Date.now())
const grid = reactive({ rows: 6, cols: 12 })
const cells = ref<any[]>([])
const pcs = ref<any[]>([])
const selectedKey = ref<string | null>(null)
const dragPc = reactive({ active: false, pcId: null as number | null, from: null as { row: number; col: number } | null })
const dragOverKey = ref<string | null>(null)
const trayDragOver = ref(false)
let pollTimer: number | null = null
let clockTimer: number | null = null

function txt(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`))
}
function pickRows(resp: any) {
  const data = resp?.data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.data)) return data.data.data
  return []
}
function normalizePcStatus(rawStatus: any, hasSession: boolean) {
  if (hasSession) return 'busy'
  const raw = String(rawStatus || 'offline').toLowerCase()
  if (['offline', 'reserved', 'locked', 'maintenance', 'online'].includes(raw)) return raw
  return 'online'
}
function mergeActiveSession(fromSessions: any, fromPcs: any) {
  const a = fromSessions || {}
  const b = fromPcs || {}
  return {
    id: a.id ?? b.id ?? null,
    started_at: a.started_at ?? b.started_at ?? null,
    tariff: a.tariff ?? b.tariff ?? null,
    seconds_left: Number(a.seconds_left ?? b.seconds_left ?? 0),
    snapshot_at_ms: Number(a.snapshot_at_ms ?? b.snapshot_at_ms ?? Date.now()),
    client: a.client ?? b.client ?? null,
  }
}
function mergePcRecord(primary: any, fallback: any) {
  const a = primary || {}
  const b = fallback || {}
  const activeSession = a.active_session || b.active_session || null
  const rawStatus = a.status ?? b.status ?? a.raw_status ?? b.raw_status ?? 'offline'
  return {
    ...b,
    ...a,
    status: normalizePcStatus(rawStatus, Boolean(activeSession)),
    active_session: activeSession ? mergeActiveSession(a.active_session, b.active_session) : null,
    code: a.code || b.code || a.name || b.name || '',
    ip: a.ip || a.ip_address || b.ip || b.ip_address || '',
    telemetry: a.telemetry || b.telemetry || null,
    client_balance: a.client_balance ?? b.client_balance ?? a?.active_session?.client?.balance ?? b?.active_session?.client?.balance ?? 0,
  }
}
function pad2(value: number) {
  return String(value).padStart(2, '0')
}
function sessionLeftSeconds(pc: any) {
  const session = pc?.active_session
  if (!session) return 0
  const base = Number(session.seconds_left ?? 0)
  const snapshot = Number(session.snapshot_at_ms ?? Date.now())
  const elapsed = Math.max(0, Math.floor((nowTick.value - snapshot) / 1000))
  return Math.max(0, base - elapsed)
}
function formatEndTime(pc: any) {
  const secs = sessionLeftSeconds(pc)
  if (!secs) return ''
  const end = new Date(nowTick.value + secs * 1000)
  return `${pad2(end.getHours())}:${pad2(end.getMinutes())}`
}
function statusLabel(status: string) {
  return copy.value.statuses[status as keyof typeof copy.value.statuses] || status
}
function sessionClientLabel(pc: any) {
  const client = pc?.active_session?.client
  if (!client) return ''
  return client.login || client.phone || client.account_id || `#${client.id || ''}`
}
function cellBottom(status: string, pc: any) {
  if (status === 'busy') return txt(copy.value.sessionUntil, { time: formatEndTime(pc) || '--:--' })
  if (status === 'reserved') return txt(copy.value.reservedUntil, { time: formatEndTime(pc) || '--:--' })
  return statusLabel(status)
}
function cellVariant(status: string) {
  if (status === 'busy') return 'busy'
  if (status === 'online') return 'online'
  if (status === 'reserved') return 'reserved'
  if (status === 'locked') return 'locked'
  if (status === 'maintenance') return 'maintenance'
  if (status === 'offline') return 'offline'
  return 'empty'
}

const displayGrid = computed(() => ({ rows: Math.max(grid.rows, 8), cols: Math.max(grid.cols, 17) }))
const pcById = computed(() => new Map(pcs.value.map((pc) => [Number(pc.id), pc])))
const cellsMap = computed(() => new Map(cells.value.map((cell) => [`${cell.row}:${cell.col}`, cell])))
const assignedPcIds = computed(() => new Set(cells.value.filter((cell) => cell.pc_id).map((cell) => Number(cell.pc_id))))
const freePcs = computed(() => pcs.value.filter((pc) => !assignedPcIds.value.has(Number(pc.id))))
const zoneCount = computed(() => new Set(pcs.value.map((pc) => pc.zone || 'default')).size)
const counts = computed(() => {
  const out = { online: 0, busy: 0, reserved: 0, offline: 0, locked: 0, maintenance: 0 }
  for (const pc of pcs.value) {
    const status = String(pc.status || 'offline')
    if (status in out) out[status as keyof typeof out] += 1
  }
  return out
})
const legendItems = computed(() => [
  { key: 'online', label: copy.value.statuses.online, value: counts.value.online, tone: 'tone-online' },
  { key: 'busy', label: copy.value.statuses.busy, value: counts.value.busy, tone: 'tone-busy' },
  { key: 'reserved', label: copy.value.statuses.reserved, value: counts.value.reserved, tone: 'tone-reserved' },
  { key: 'offline', label: copy.value.statuses.offline, value: counts.value.offline, tone: 'tone-offline' },
])
const gridCells = computed(() => {
  const list: any[] = []
  for (let row = 1; row <= displayGrid.value.rows; row += 1) {
    for (let col = 1; col <= displayGrid.value.cols; col += 1) {
      const base = cellsMap.value.get(`${row}:${col}`)
      const mappedPc = base?.pc_id ? pcById.value.get(Number(base.pc_id)) || null : null
      const basePc = base?.pc || null
      const pc = mappedPc || basePc ? mergePcRecord(mappedPc, basePc) : null
      const status = pc?.status || 'empty'
      list.push({ key: `${row}-${col}`, row, col, top: base?.label || pc?.code || '', bottom: cellBottom(status, pc), status, variant: cellVariant(status), pc, base })
    }
  }
  return list
})
const selectedCell = computed(() => gridCells.value.find((cell) => cell.key === selectedKey.value) || null)
const selectedPc = computed(() => selectedCell.value?.pc || null)
const selectedCellLabel = computed(() => (selectedCell.value ? `${selectedCell.value.row}.${selectedCell.value.col}` : '-'))
const selectedNote = computed(() => selectedCell.value?.base?.notes || copy.value.noNotes)
const selectedHardware = computed(() => {
  const telemetry = selectedPc.value?.telemetry || {}
  const ramMb = Number(telemetry.ram_total_mb || 0)
  return {
    cpu: telemetry.cpu_name || copy.value.noHardware,
    ram: ramMb > 0 ? `${(ramMb / 1024).toFixed(1)} GB` : copy.value.noHardware,
    gpu: telemetry.gpu_name || copy.value.noHardware,
  }
})
const refreshedAtLabel = computed(() => (refreshedAt.value ? formatDateTime(refreshedAt.value) : '-'))

function cellStyle(cell: any) {
  return { gridColumn: `${cell.col} / span 1`, gridRow: `${cell.row} / span 1` }
}
function cellClass(cell: any) {
  return { [`tone-${cell.variant}`]: true, selected: selectedKey.value === cell.key, 'drag-over': dragOverKey.value === cell.key }
}
function onCellClick(cell: any) {
  selectedKey.value = cell?.pc ? cell.key : null
}
function onDragStart(cell: any, event: DragEvent) {
  if (!cell?.pc) return
  dragPc.active = true
  dragPc.pcId = Number(cell.pc.id)
  dragPc.from = { row: cell.row, col: cell.col }
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function onTrayDragStart(pc: any, event: DragEvent) {
  dragPc.active = true
  dragPc.pcId = Number(pc.id)
  dragPc.from = null
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function onDragEnd() {
  dragPc.active = false
  dragPc.pcId = null
  dragPc.from = null
  dragOverKey.value = null
  trayDragOver.value = false
}
function onDragOver(cell: any, event: DragEvent) {
  if (!dragPc.active) return
  event.preventDefault()
  dragOverKey.value = cell.key
}
function onDragLeave(cell: any) {
  if (dragOverKey.value === cell.key) dragOverKey.value = null
}
async function onDrop(cell: any, event: DragEvent) {
  if (!dragPc.active || !dragPc.pcId) return
  event.preventDefault()
  await applyBatch([{ row: cell.row, col: cell.col, pc_id: dragPc.pcId, is_active: true }])
}
function onTrayDragOver(event: DragEvent) {
  if (!dragPc.active) return
  event.preventDefault()
  trayDragOver.value = true
}
function onTrayDragLeave() {
  trayDragOver.value = false
}
async function onTrayDrop(event: DragEvent) {
  if (!dragPc.active || !dragPc.pcId || !dragPc.from) return
  event.preventDefault()
  trayDragOver.value = false
  await applyBatch([{ row: dragPc.from.row, col: dragPc.from.col, pc_id: null }])
}
async function applyBatch(items: Array<Record<string, any>>) {
  if (saving.value) return
  saving.value = true
  try {
    await cpApi.layoutCellsBatch({ items })
    await reload()
  } catch (cause: any) {
    ElMessage.error(cause?.response?.data?.message || copy.value.saveError)
  } finally {
    saving.value = false
  }
}
async function detachSelectedPc() {
  const cell = selectedCell.value
  if (!cell?.base || !selectedPc.value) return
  try {
    await ElMessageBox.confirm(txt(copy.value.detachConfirm, { pc: selectedPc.value.code || 'PC' }), copy.value.confirmTitle, { type: 'warning', confirmButtonText: copy.value.confirmYes, cancelButtonText: copy.value.confirmNo })
  } catch {
    return
  }
  await applyBatch([{ row: cell.row, col: cell.col, pc_id: null }])
  ElMessage.success(copy.value.detached)
}
async function stopSessionForPc(pc: any) {
  const sessionId = pc?.active_session?.id
  if (!sessionId) return
  try {
    await ElMessageBox.confirm(txt(copy.value.stopConfirm, { pc: pc.code || 'PC' }), copy.value.confirmTitle, { type: 'warning', confirmButtonText: copy.value.confirmYes, cancelButtonText: copy.value.confirmNo })
  } catch {
    return
  }
  await cpApi.stopSession(sessionId)
  ElMessage.success(copy.value.sessionStopped)
  await reload()
}
async function sendPcAction(pc: any, type: 'REBOOT' | 'SHUTDOWN') {
  const confirmText = type === 'REBOOT' ? copy.value.rebootConfirm : copy.value.shutdownConfirm
  try {
    await ElMessageBox.confirm(txt(confirmText, { pc: pc.code || 'PC' }), copy.value.confirmTitle, { type: 'warning', confirmButtonText: copy.value.confirmYes, cancelButtonText: copy.value.confirmNo })
  } catch {
    return
  }
  await cpApi.sendPcCommand(pc.id, { type })
  ElMessage.success(txt(copy.value.commandSent, { type }))
  await reload()
}
async function reload() {
  if (loading.value) return
  loading.value = true
  pageError.value = ''
  try {
    const [layoutSettled, pcsSettled, sessionsSettled] = await Promise.allSettled([cpApi.layout(), cpApi.pcs({ per_page: 500 }), cpApi.activeSessions()])
    if (layoutSettled.status !== 'fulfilled') throw layoutSettled.reason
    if (pcsSettled.status !== 'fulfilled') throw pcsSettled.reason
    const gridData = layoutSettled.value?.data?.grid || {}
    grid.rows = Number(gridData.rows || 6)
    grid.cols = Number(gridData.cols || 12)
    const rawCells = Array.isArray(layoutSettled.value?.data?.data) ? layoutSettled.value.data.data : []
    cells.value = rawCells.map((cell: any) => ({ id: cell.id, row: Number(cell.row || 0), col: Number(cell.col || 0), pc_id: cell.pc_id ? Number(cell.pc_id) : null, label: cell.label || '', notes: cell.notes || '', pc: cell.pc || null }))
    const activeByPcId = new Map<number, any>()
    const fetchedAtMs = Date.now()
    for (const session of pickRows(sessionsSettled.status === 'fulfilled' ? sessionsSettled.value : null)) {
      const pcId = Number(session?.pc?.id || session?.pc_id || 0)
      if (pcId) activeByPcId.set(pcId, { id: session.id, started_at: session.started_at, tariff: session.tariff, client: session.client, seconds_left: Number(session.seconds_left ?? 0), snapshot_at_ms: fetchedAtMs })
    }
    pcs.value = pickRows(pcsSettled.value).map((pc: any) => {
      const id = Number(pc.id ?? pc._id)
      const activeSession = activeByPcId.get(id) || pc.active_session || null
      return { id, code: pc.code || pc.name || `PC #${id}`, status: normalizePcStatus(pc.status, Boolean(activeSession)), zone: pc.zone || '', ip: pc.ip_address || pc.ip || '', client_balance: pc.client_balance ?? pc?.active_session?.client?.balance ?? 0, active_session: activeSession ? mergeActiveSession(activeSession, pc.active_session) : null, telemetry: pc.telemetry || null }
    })
    refreshedAt.value = new Date().toISOString()
  } catch (cause: any) {
    pageError.value = cause?.response?.data?.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  reload()
  clockTimer = window.setInterval(() => { nowTick.value = Date.now() }, 1000)
  pollTimer = window.setInterval(() => { if (autoRefresh.value && !loading.value && !saving.value) reload() }, 5000)
})
onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer)
  if (clockTimer) window.clearInterval(clockTimer)
})
</script>

<style scoped>
.layout-page {
  display:grid;
  gap:16px;
  --board-shell-bg:
    radial-gradient(900px 300px at 50% -10%, color-mix(in srgb, var(--brand-secondary) 14%, transparent), transparent 55%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 92%, var(--bg)), color-mix(in srgb, var(--surface) 88%, var(--bg-alt)));
  --board-shell-border: color-mix(in srgb, var(--brand-secondary) 18%, var(--stroke));
  --board-cell-bg: linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 88%, var(--bg)), color-mix(in srgb, var(--surface) 82%, var(--bg-alt)));
  --board-cell-border: color-mix(in srgb, var(--stroke-strong) 78%, transparent);
  --board-cell-text: var(--text);
  --board-cell-muted: var(--text-muted);
  --board-pill-bg: color-mix(in srgb, var(--surface-soft) 92%, transparent);
  --board-pill-border: color-mix(in srgb, var(--stroke) 92%, transparent);
}
.hero-actions { display:flex; flex-wrap:wrap; gap:10px; justify-content:flex-end; }
.meta-chip,.switch-chip,.primary-btn,.ghost-btn,.tray-chip,.cell-client { border:1px solid var(--stroke); background:var(--surface-soft); color:var(--text); }
.meta-chip,.switch-chip { display:inline-flex; align-items:center; gap:8px; min-height:32px; padding:0 12px; border-radius:999px; font-size:12px; color:var(--text-muted); }
.switch-chip input { margin:0; }
.primary-btn,.ghost-btn { min-height:40px; padding:0 14px; border-radius:12px; font-weight:700; }
.primary-btn { background:linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 72%, white), color-mix(in srgb, var(--brand) 64%, transparent)); border-color:color-mix(in srgb, var(--brand-secondary) 24%, var(--stroke)); color:#08111e; }
.ghost-btn.danger { border-color:color-mix(in srgb, var(--danger) 30%, var(--stroke)); background:color-mix(in srgb, var(--danger) 12%, transparent); }
.stats-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }
.workspace-grid { display:grid; grid-template-columns:300px minmax(0,1fr) 320px; gap:16px; align-items:start; }
.side-panel,.detail-panel { position:sticky; top:14px; }
.legend-list,.detail-grid,.detail-list { display:grid; gap:12px; }
.legend-card,.detail-card,.info-row,.empty-mini,.empty-state { border-radius:16px; border:1px solid var(--stroke); background:var(--surface-soft); }
.legend-card,.detail-card,.info-row { padding:14px; }
.legend-card { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.legend-card span,.detail-card span,.info-row span,.board-head p { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--text-faint); }
.legend-card strong,.detail-card strong,.info-row strong { display:block; margin-top:8px; font-size:18px; }
.tone-online { border-color:color-mix(in srgb, var(--brand-secondary) 28%, var(--stroke)); }
.tone-busy { border-color:color-mix(in srgb, var(--success) 28%, var(--stroke)); }
.tone-reserved { border-color:color-mix(in srgb, var(--accent) 28%, var(--stroke)); }
.tone-offline,.tone-locked { border-color:color-mix(in srgb, var(--danger) 22%, var(--stroke)); }
.section-block { display:grid; gap:10px; margin-top:18px; }
.section-block h3 { margin:0; font-size:16px; }
.section-block p { margin:0; font-size:13px; color:var(--text-muted); }
.tray-dropzone { display:grid; gap:10px; border-radius:18px; border:1px dashed var(--stroke); background:var(--surface-soft); padding:12px; }
.tray-dropzone.active { border-color:color-mix(in srgb, var(--brand-secondary) 36%, var(--stroke)); }
.tray-chip { display:flex; align-items:center; justify-content:space-between; min-height:42px; padding:0 12px; border-radius:12px; cursor:grab; }
.tray-chip span { font-size:12px; color:var(--text-muted); }
.empty-mini,.empty-state { padding:18px 14px; color:var(--text-muted); text-align:center; }
.board-shell { border-radius:var(--radius-md); border:1px solid var(--stroke); background:linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 94%, transparent), color-mix(in srgb, var(--surface) 94%, transparent)); box-shadow:var(--shadow-panel); overflow:hidden; }
.board-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:18px 20px 0; }
.board-head span { font-size:12px; color:var(--text-muted); }
.board-canvas { overflow:auto; margin:20px; border-radius:24px; border:1px solid var(--board-shell-border); background:var(--board-shell-bg); padding:18px; }
.hall-grid { display:grid; grid-template-columns:repeat(var(--cols), minmax(78px,1fr)); grid-auto-rows:88px; gap:8px; min-width:max-content; }
.hall-cell { display:flex; flex-direction:column; justify-content:space-between; min-height:88px; padding:10px; border-radius:16px; border:1px solid var(--board-cell-border); background:var(--board-cell-bg); color:var(--board-cell-text); cursor:pointer; transition:transform .16s ease, border-color .16s ease, background .16s ease, color .16s ease; }
.hall-cell:hover { transform:translateY(-1px); }
.hall-cell.selected { outline:2px solid color-mix(in srgb, var(--brand-secondary) 55%, white); outline-offset:-1px; }
.hall-cell.drag-over { outline:2px dashed color-mix(in srgb, var(--brand) 65%, white); outline-offset:-2px; }
.hall-cell.tone-busy { border-color:color-mix(in srgb, var(--danger) 72%, var(--board-cell-border)); background:linear-gradient(180deg, color-mix(in srgb, var(--danger) 34%, var(--board-cell-bg)), color-mix(in srgb, var(--danger) 18%, var(--board-cell-bg))); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--danger) 22%, transparent); }
.hall-cell.tone-online { border-color:color-mix(in srgb, var(--success) 72%, var(--board-cell-border)); background:linear-gradient(180deg, color-mix(in srgb, var(--success) 32%, var(--board-cell-bg)), color-mix(in srgb, var(--success) 16%, var(--board-cell-bg))); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--success) 20%, transparent); }
.hall-cell.tone-reserved { border-color:color-mix(in srgb, var(--accent) 72%, var(--board-cell-border)); background:linear-gradient(180deg, color-mix(in srgb, var(--accent) 34%, var(--board-cell-bg)), color-mix(in srgb, var(--accent) 18%, var(--board-cell-bg))); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent); }
.hall-cell.tone-locked { border-color:color-mix(in srgb, var(--danger) 52%, var(--board-cell-border)); background:linear-gradient(180deg, color-mix(in srgb, var(--danger) 24%, var(--board-cell-bg)), color-mix(in srgb, var(--danger) 12%, var(--board-cell-bg))); }
.hall-cell.tone-maintenance { border-color:color-mix(in srgb, #8b5cf6 48%, var(--board-cell-border)); background:linear-gradient(180deg, color-mix(in srgb, #8b5cf6 24%, var(--board-cell-bg)), color-mix(in srgb, #8b5cf6 12%, var(--board-cell-bg))); }
.hall-cell.tone-offline { border-color:color-mix(in srgb, #64748b 62%, var(--board-cell-border)); background:linear-gradient(180deg, color-mix(in srgb, #64748b 30%, var(--board-cell-bg)), color-mix(in srgb, #64748b 16%, var(--board-cell-bg))); box-shadow:inset 0 0 0 1px color-mix(in srgb, #64748b 16%, transparent); color:var(--board-cell-muted); }
.cell-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.cell-label { font-size:11px; color:var(--board-cell-muted); }
.status-pill { display:inline-flex; align-items:center; min-height:30px; padding:0 10px; border-radius:999px; border:1px solid var(--board-pill-border); background:var(--board-pill-bg); font-size:11px; }
.status-pill.mini { min-height:24px; padding:0 8px; }
.status-pill.tone-busy { border-color:color-mix(in srgb, var(--danger) 65%, var(--board-pill-border)); background:color-mix(in srgb, var(--danger) 14%, var(--board-pill-bg)); color:color-mix(in srgb, var(--danger) 78%, var(--board-cell-text)); }
.status-pill.tone-online { border-color:color-mix(in srgb, var(--success) 65%, var(--board-pill-border)); background:color-mix(in srgb, var(--success) 14%, var(--board-pill-bg)); color:color-mix(in srgb, var(--success) 78%, var(--board-cell-text)); }
.status-pill.tone-reserved { border-color:color-mix(in srgb, var(--accent) 65%, var(--board-pill-border)); background:color-mix(in srgb, var(--accent) 14%, var(--board-pill-bg)); color:color-mix(in srgb, var(--accent) 78%, var(--board-cell-text)); }
.status-pill.tone-offline { border-color:color-mix(in srgb, #64748b 60%, var(--board-pill-border)); background:color-mix(in srgb, #64748b 12%, var(--board-pill-bg)); color:color-mix(in srgb, #64748b 88%, var(--board-cell-text)); }
.cell-main strong,.cell-main span,.cell-main small { display:block; }
.cell-main strong { font-size:13px; }
.cell-main span,.cell-main small { margin-top:6px; font-size:11px; color:var(--board-cell-muted); }
.detail-actions { display:flex; flex-wrap:wrap; gap:10px; margin:16px 0; }
.alert { padding:12px 14px; border-radius:16px; }
.err { border:1px solid color-mix(in srgb, var(--danger) 30%, var(--stroke)); background:color-mix(in srgb, var(--danger) 12%, transparent); color:var(--danger); }
@media (max-width:1480px) { .workspace-grid { grid-template-columns:280px minmax(0,1fr); } .detail-panel { grid-column:1 / -1; position:static; } }
@media (max-width:1180px) { .stats-grid,.workspace-grid { grid-template-columns:1fr; } .side-panel,.detail-panel { position:static; } }
@media (max-width:760px) { .detail-grid { grid-template-columns:1fr; } .hero-actions,.detail-actions { justify-content:stretch; } .hero-actions > *,.detail-actions > * { width:100%; } .board-head { flex-direction:column; align-items:flex-start; } }
</style>
