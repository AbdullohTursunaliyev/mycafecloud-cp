<template>
  <div class="hall-shell" :class="{ 'panel-collapsed': !leftPanelOpen }">
    <aside class="left" :class="{ collapsed: !leftPanelOpen }">
      <div class="left-head">
        <button class="info-dot" type="button" @click="leftPanelOpen = !leftPanelOpen">!</button>
      </div>
      <div v-show="leftPanelOpen" class="left-body">
      <div class="left-card">
        <div class="left-title"><span class="legend-icon power dim"></span>O'chirilgan</div>
        <div class="left-count">{{ counts.offline }}</div>
      </div>

      <div class="left-card active">
        <div class="left-title"><span class="legend-icon power on"></span>Yoqilgan</div>
        <div class="left-count">{{ counts.on }}</div>
      </div>

      <div class="left-card">
        <div class="left-title"><span class="legend-icon frame"></span>Faol seans</div>
        <div class="left-count">{{ counts.busy }}</div>
      </div>

      <div class="left-card">
        <div class="left-title"><span class="legend-icon calendar"></span>Band qilingan</div>
        <div class="left-count">{{ counts.reserved }}</div>
      </div>

      <div class="left-section">Xizmat ko'rsatish</div>
      <div class="left-item"><span class="dot warn"></span> Xizmat ko'rsatilmoqda <span class="pill">{{ counts.maintenance }}</span></div>
      <div class="left-item"><span class="dot warn"></span> Konfiguratsiya o'zgartirildi <span class="pill">0</span></div>

      <div class="left-section">E'tibor talab etiladi</div>
      <div class="left-item"><span class="dot danger"></span> Yuqori kirish huquqi <span class="pill">0</span></div>
      <div class="left-item"><span class="dot danger"></span> Aloqa yo'q <span class="pill">{{ counts.offline }}</span></div>
      <div class="left-item"><span class="dot danger"></span> Shell o'chirilgan <span class="pill">{{ counts.offline }}</span></div>
      <div class="left-item"><span class="dot danger"></span> Bloklangan <span class="pill">{{ counts.locked }}</span></div>
      </div>
    </aside>

    <main class="center">
      <div class="grid-wrap">
        <div
          class="grid"
          ref="gridRef"
          :style="{ '--cols': displayGrid.cols }"
        >
          <div
            v-for="cell in gridCells"
            :key="cell.key"
            class="cell"
            :class="cellClass(cell)"
            :style="cellStyle(cell)"
            :draggable="!!cell.pc"
            @click="onCellClick(cell)"
            @dragstart="onDragStart(cell, $event)"
            @dragend="onDragEnd"
            @dragover="onDragOver(cell, $event)"
            @dragleave="onDragLeave(cell)"
            @drop="onDrop(cell, $event)"
            @contextmenu.prevent="onCellContextMenu(cell, $event)"
            @mouseenter="onCellHover(cell, $event)"
            @mouseleave.passive="onCellLeave"
          >
          <div class="cell-top">
            <span class="cell-id">{{ cell.top }}</span>
            <button v-if="cell.status === 'offline'" class="cell-offline-btn" aria-label="Turn on">
              <span class="power-icon"></span>
            </button>
            <span v-else-if="cell.icon" class="cell-icon" :class="cell.icon"></span>
          </div>
          <div v-if="cell.bottom" class="cell-main" :class="{ muted: cell.status === 'inactive' }">
            {{ cell.bottom }}
          </div>
          <button
            v-if="cell.pc && sessionClientLabel(cell.pc)"
            class="cell-client"
            type="button"
            @click.stop="openClientInfo(cell.pc)"
          >
            {{ sessionClientLabel(cell.pc) }}
          </button>
        </div>

          <div v-if="tooltip.open" class="tooltip" :style="tooltipStyle">
            <div class="tooltip-title">
              <span class="chip green"></span>
              Faol seans
              <span class="timer">{{ tooltipTimer }}</span>
            </div>
            <div class="tooltip-row">
              <span class="mini-icon clock"></span>
              {{ tooltipTariff }}
              <span class="muted">{{ tooltipTimeRange }}</span>
            </div>
            <div class="tooltip-row">
              <span class="mini-icon user"></span>
              {{ tooltipClient }}
              <span class="muted">{{ tooltipPhone }}</span>
            </div>
            <div class="tooltip-row">
              <span class="mini-icon lock"></span>
              {{ tooltipBooking }}
              <span class="muted">{{ tooltipPc }}</span>
            </div>
            <div class="tooltip-footer">
              Umumiy zal, {{ tooltipPc }}
            </div>
          </div>
        </div>

        <div
          v-if="freePcs.length"
          class="pc-tray"
          :class="{ 'tray-over': trayDragOver }"
          @dragover="onTrayDragOver"
          @dragleave="onTrayDragLeave"
          @drop="onTrayDrop"
        >
          <div class="tray-title">Bo'sh PC'lar</div>
          <div class="tray-list">
            <div
              v-for="p in freePcs"
              :key="p.id"
              class="tray-pc"
              draggable="true"
              @dragstart="onTrayDragStart(p, $event)"
              @dragend="onDragEnd"
            >
              <div class="tray-code">{{ p.code }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <aside v-if="rightPanelOpen && selectedPc" class="right">
      <div class="right-head">
        <div class="right-title">{{ selectedPc?.code || "PK-" }}</div>
        <div class="right-badge" :class="statusBadgeClass">{{ statusLabel }}</div>
        <button class="close" @click="closeRightPanel">×</button>
      </div>

      <div class="right-section">
        <div class="right-label">Katak</div>
        <div class="right-value">{{ selectedCellLabel }}</div>
      </div>

      <div v-if="selectedPc?.active_session" class="right-section">
        <div class="right-label">Faol seans klienti</div>
        <button class="session-client-btn" type="button" @click="openClientInfo(selectedPc)">
          {{ sessionClientLabel(selectedPc) || "Klient ma'lumoti" }}
        </button>
      </div>

      <div class="right-section">
        <div class="right-label">PC boshqaruvi</div>
        <div class="assign-row">
          <button class="ghost" :disabled="!selectedPc" @click="detachSelectedPc">Ajratish</button>
        </div>
      </div>

      <div class="right-section">
        <div class="right-label">Protsessor</div>
        <div class="right-value">{{ selectedHardware.cpu }}</div>
      </div>
      <div class="right-section">
        <div class="right-label">Tezkor xotira</div>
        <div class="right-value">{{ selectedHardware.ram }}</div>
      </div>
      <div class="right-section">
        <div class="right-label">Videokarta</div>
        <div class="right-value">{{ selectedHardware.gpu }}</div>
      </div>

      <div class="right-section">
        <div class="right-label">Disklar</div>
        <div class="disk">
          <div class="disk-label">C:</div>
          <div class="bar orange"><span :style="{ width: selectedHardware.diskCPercent }"></span></div>
          <div class="disk-sub">{{ selectedHardware.diskCText }}</div>
        </div>
        <div class="disk">
          <div class="disk-label">D:</div>
          <div class="bar blue"><span :style="{ width: selectedHardware.diskDPercent }"></span></div>
          <div class="disk-sub">{{ selectedHardware.diskDText }}</div>
        </div>
      </div>

      <div class="right-section">
        <div class="right-label">Tarmoq</div>
        <div class="right-value">{{ selectedHardware.ip }}</div>
        <div class="right-sub">{{ selectedHardware.mac }}</div>
      </div>

      <div class="right-section">
        <div class="right-label">Kompyuterga izoh:</div>
        <div class="right-note">
          {{ selectedNote }}
        </div>
      </div>
    </aside>

    <div
      v-if="contextMenu.open && contextMenu.pc"
      class="context-menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
    >
      <div class="context-title">{{ contextMenu.pc.code }}</div>
      <button
        v-if="contextMenu.pc?.active_session?.id"
        class="context-item danger"
        type="button"
        @click="runPcAction('stop_session')"
      >
        Sessiyani tugatish
      </button>
      <button class="context-item" type="button" @click="runPcAction('reboot')">
        Qayta yuklash
      </button>
      <button class="context-item danger" type="button" @click="runPcAction('shutdown')">
        O'chirish
      </button>
    </div>

    <div v-if="clientInfo.open" class="client-modal-backdrop" @click="closeClientInfo">
      <div class="client-modal" @click.stop>
        <div class="client-modal-head">
          <div class="client-modal-title">Seans klienti</div>
          <button class="close" type="button" @click="closeClientInfo">×</button>
        </div>

        <div class="client-modal-row">
          <span class="k">PC:</span>
          <span class="v">{{ clientInfo.pc?.code || "-" }}</span>
        </div>
        <div class="client-modal-row">
          <span class="k">Login:</span>
          <span class="v">{{ clientInfo.client?.login || "-" }}</span>
        </div>
        <div class="client-modal-row">
          <span class="k">Telefon:</span>
          <span class="v">{{ clientInfo.client?.phone || "-" }}</span>
        </div>
        <div class="client-modal-row">
          <span class="k">Account ID:</span>
          <span class="v">{{ clientInfo.client?.account_id || "-" }}</span>
        </div>
        <div class="client-modal-row">
          <span class="k">Balans:</span>
          <span class="v">{{ clientInfo.client?.balance ?? "-" }}</span>
        </div>
        <div class="client-modal-row">
          <span class="k">Seans boshlangan:</span>
          <span class="v">{{ formatDateTime(clientInfo.session?.started_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import { ElMessage } from "element-plus"
import { cpApi } from "../../api/cp"

const gridRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const leftPanelOpen = ref(false)

const grid = reactive({ rows: 6, cols: 12 })
const displayGrid = computed(() => ({
  rows: Math.max(grid.rows, 8),
  cols: Math.max(grid.cols, 17),
}))
const cells = ref([])
const pcs = ref([])

const selectedKey = ref(null)
const rightPanelOpen = ref(false)
const tooltip = reactive({ open: false, x: 0, y: 0, cell: null })
const clientInfo = reactive({ open: false, pc: null, session: null, client: null })
const contextMenu = reactive({ open: false, x: 0, y: 0, cell: null, pc: null })
const nowTick = ref(Date.now())

const dragPc = reactive({ active: false, pcId: null, from: null })
const dragOverKey = ref(null)
const trayDragOver = ref(false)
let pollTimer = null
let clockTimer = null

const pickRows = (resp) => {
  const d = resp?.data
  if (Array.isArray(d?.data)) return d.data
  if (Array.isArray(d?.data?.data)) return d.data.data
  if (Array.isArray(d?.data?.items)) return d.data.items
  if (Array.isArray(d)) return d
  if (Array.isArray(d?.items)) return d.items
  if (Array.isArray(d?.result)) return d.result
  return []
}

function normalizePcStatus(rawStatus, hasSession) {
  if (hasSession) return "busy"
  const raw = String(rawStatus || "offline").toLowerCase()
  if (raw === "offline") return "offline"
  return "online"
}

function mergeActiveSession(fromSessions, fromPcs) {
  const a = fromSessions || {}
  const b = fromPcs || {}
  const clientA = a.client || {}
  const clientB = b.client || {}
  const resolvedSecondsLeft = Number(a.seconds_left ?? b.seconds_left ?? 0)
  const snapshotAtMs = Number(a.snapshot_at_ms ?? b.snapshot_at_ms ?? Date.now())
  return {
    id: a.id ?? b.id ?? null,
    started_at: a.started_at ?? b.started_at ?? null,
    tariff: a.tariff ?? b.tariff ?? null,
    seconds_left: Number.isFinite(resolvedSecondsLeft) ? resolvedSecondsLeft : 0,
    rate_per_hour: a.rate_per_hour ?? b.rate_per_hour ?? null,
    from: a.from ?? b.from ?? "balance",
    snapshot_at_ms: Number.isFinite(snapshotAtMs) ? snapshotAtMs : Date.now(),
    client: {
      id: clientA.id ?? clientB.id ?? null,
      login: clientA.login ?? clientB.login ?? null,
      phone: clientA.phone ?? clientB.phone ?? null,
      account_id: clientA.account_id ?? clientB.account_id ?? null,
      balance: clientA.balance ?? clientB.balance ?? null,
      bonus: clientA.bonus ?? clientB.bonus ?? null,
    },
  }
}

const pcById = computed(() => {
  const map = new Map()
  for (const p of pcs.value) map.set(p.id, p)
  return map
})

const cellsMap = computed(() => {
  const map = new Map()
  for (const c of cells.value) map.set(`${c.row}:${c.col}`, c)
  return map
})

const assignedPcIds = computed(() => {
  const set = new Set()
  for (const c of cells.value) {
    if (c.pc_id) set.add(c.pc_id)
  }
  return set
})

const freePcs = computed(() => pcs.value.filter(p => !assignedPcIds.value.has(p.id)))

const gridCells = computed(() => {
  const arr = []
  for (let r = 1; r <= displayGrid.value.rows; r += 1) {
    for (let c = 1; c <= displayGrid.value.cols; c += 1) {
      const base = cellsMap.value.get(`${r}:${c}`)
      const pc = base?.pc_id ? (pcById.value.get(base.pc_id) || base?.pc || null) : null
      const active = base ? (base.is_active ?? true) : true
      const status = !active ? "inactive" : (pc?.status || "empty")
      const top = base?.label || pc?.code || ""
      const bottom = cellBottom(status, pc)
      const icon = cellIcon(status)
      const variant = cellVariant(status)

      arr.push({
        key: `${r}-${c}`,
        row: r,
        col: c,
        top,
        bottom,
        status,
        variant,
        icon,
        pc,
        base,
      })
    }
  }
  return arr
})

const counts = computed(() => {
  const out = { offline: 0, online: 0, busy: 0, reserved: 0, locked: 0, maintenance: 0 }
  for (const p of pcs.value) {
    const raw = String(p.raw_status || "offline")
    if (raw === "offline") out.offline += 1
    else out.online += 1

    if (raw === "reserved") out.reserved += 1
    if (raw === "locked") out.locked += 1
    if (raw === "maintenance") out.maintenance += 1

    if (p.active_session) out.busy += 1
  }
  const on = out.online
  return { ...out, on }
})

const selectedCell = computed(() => gridCells.value.find(c => c.key === selectedKey.value) || null)
const selectedPc = computed(() => selectedCell.value?.pc || null)

const selectedCellLabel = computed(() => {
  const c = selectedCell.value
  if (!c) return "-"
  return `${c.row}.${c.col}`
})

const statusLabel = computed(() => {
  const s = selectedPc.value?.status || "offline"
  if (s === "busy") return "Band"
  if (s === "online") return "Faol"
  if (s === "reserved") return "Band qilingan"
  if (s === "locked") return "Bloklangan"
  if (s === "maintenance") return "Xizmat"
  return "O'chirilgan"
})

const statusBadgeClass = computed(() => {
  const s = selectedPc.value?.status || "offline"
  return `badge-${s}`
})

const selectedNote = computed(() => selectedCell.value?.base?.notes || "-")

const tooltipStyle = computed(() => ({
  left: `${tooltip.x}px`,
  top: `${tooltip.y}px`,
}))

const tooltipTimer = computed(() => {
  if (!tooltip.cell?.pc) return "-"
  const secs = sessionLeftSeconds(tooltip.cell.pc)
  if (!secs) return "-"
  return formatTimer(secs)
})

const tooltipTariff = computed(() => tooltip.cell?.pc?.active_session?.tariff?.name || "2 soat (Kunduzgi)")
const tooltipTimeRange = computed(() => {
  const started = tooltip.cell?.pc?.active_session?.started_at
  if (!started) return "14:00 -> 16:00"
  const s = new Date(started)
  const e = sessionEndDate(tooltip.cell?.pc)
  return `${pad2(s.getHours())}:${pad2(s.getMinutes())} -> ${e ? pad2(e.getHours()) + ":" + pad2(e.getMinutes()) : "-"}`
})
const tooltipClient = computed(() => tooltip.cell?.pc?.active_session?.client?.login || "Mr. Mime")
const tooltipPhone = computed(() => tooltip.cell?.pc?.active_session?.client?.phone || "+7 (123) 123 45-67")
const tooltipBooking = computed(() => tooltip.cell?.pc?.status === "reserved" ? "Band qilingan" : "22:30 dan band qilingan")
const tooltipPc = computed(() => tooltip.cell?.pc?.code || "PK-10")

const selectedTelemetry = computed(() => {
  const t = selectedPc.value?.telemetry
  return (t && typeof t === "object") ? t : {}
})

const selectedHardware = computed(() => {
  const t = selectedTelemetry.value || {}
  const diskC = getDiskByName(t.disks, "C")
  const diskD = getDiskByName(t.disks, "D")

  const ramMb = Number(t.ram_total_mb)
  const ramText = Number.isFinite(ramMb) && ramMb > 0
    ? `${(ramMb / 1024).toFixed(1)} GB`
    : "-"

  return {
    cpu: t.cpu_name || "-",
    ram: ramText,
    gpu: t.gpu_name || "-",
    diskCPercent: `${normalizePercent(diskC?.used_percent)}%`,
    diskDPercent: `${normalizePercent(diskD?.used_percent)}%`,
    diskCText: diskFreeText(diskC),
    diskDText: diskFreeText(diskD),
    ip: t.ip_address || selectedPc.value?.ip || "-",
    mac: t.mac_address || "-",
  }
})

function pad2(n) { return String(n).padStart(2, "0") }

function formatGb(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return "-"
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function normalizePercent(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function getDiskByName(disks, letter) {
  if (!Array.isArray(disks)) return null
  const target = String(letter || "").toUpperCase()
  return disks.find(d => String(d?.name || "").toUpperCase().startsWith(target)) || null
}

function diskFreeText(disk) {
  if (!disk) return "-"
  const total = Number(disk.total_gb)
  const free = Number(disk.free_gb)
  if (!Number.isFinite(total) || !Number.isFinite(free) || total <= 0) return "-"
  return `${formatGb(total)} GB dan ${formatGb(free)} GB bo'sh`
}

function sessionLeftSeconds(pc) {
  const s = pc?.active_session
  if (!s) return 0

  const base = Number(s.seconds_left ?? 0)
  const snapshot = Number(s.snapshot_at_ms ?? Date.now())
  if (!Number.isFinite(base) || base <= 0) return 0

  const elapsed = Math.max(0, Math.floor((nowTick.value - snapshot) / 1000))
  return Math.max(0, base - elapsed)
}

function sessionEndDate(pc) {
  const secs = sessionLeftSeconds(pc)
  if (!secs) return null
  return new Date(nowTick.value + secs * 1000)
}

function formatTimer(secs) {
  const h = pad2(Math.floor(secs / 3600))
  const m = pad2(Math.floor((secs % 3600) / 60))
  const s = pad2(secs % 60)
  return `${h}:${m}:${s}`
}

function formatDateTime(v) {
  if (!v) return "-"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString()
}

function sessionClientLabel(pc) {
  const c = pc?.active_session?.client
  if (!c) return ""
  return c.login || c.phone || c.account_id || `#${c.id || ""}`
}

function formatEndTime(pc) {
  const end = sessionEndDate(pc)
  if (!end) return ""
  return `${pad2(end.getHours())}:${pad2(end.getMinutes())} gacha`
}

function cellBottom(status, pc) {
  if (status === "inactive") return ""
  if (status === "busy") return formatEndTime(pc) || "Band"
  if (status === "reserved") return formatEndTime(pc) || "Band qilingan"
  if (status === "locked") return "16:00 gacha"
  if (status === "maintenance") return ""
  if (status === "offline") return ""
  return ""
}

function cellVariant(status) {
  if (status === "busy") return "green"
  if (status === "online") return "blue"
  if (status === "locked") return "red"
  if (status === "reserved") return "purple"
  if (status === "maintenance") return "amber"
  if (status === "offline") return "offline"
  return "empty"
}

function cellIcon(status) {
  if (status === "locked") return "alert"
  if (status === "reserved") return "calendar"
  if (status === "maintenance") return "lock"
  if (status === "busy") return ""
  return ""
}

function cellStyle(cell) {
  return {
    gridColumn: `${cell.col} / span 1`,
    gridRow: `${cell.row} / span 1`,
  }
}

function cellClass(cell) {
  return {
    [cell.variant]: true,
    selected: selectedKey.value === cell.key,
    "drag-over": dragOverKey.value === cell.key,
  }
}

function onCellClick(cell) {
  closeContextMenu()
  if (cell?.pc) {
    selectedKey.value = cell.key
    rightPanelOpen.value = true
    return
  }
  selectedKey.value = null
  rightPanelOpen.value = false
}

function closeRightPanel() {
  rightPanelOpen.value = false
  selectedKey.value = null
}

function onCellContextMenu(cell, ev) {
  if (!cell?.pc) {
    closeContextMenu()
    return
  }

  selectedKey.value = cell.key
  rightPanelOpen.value = true

  const menuW = 220
  const menuH = 160
  const pad = 10
  contextMenu.open = true
  contextMenu.x = Math.min(ev.clientX, window.innerWidth - menuW - pad)
  contextMenu.y = Math.min(ev.clientY, window.innerHeight - menuH - pad)
  contextMenu.cell = cell
  contextMenu.pc = cell.pc
}

function closeContextMenu() {
  contextMenu.open = false
  contextMenu.cell = null
  contextMenu.pc = null
}

function onGlobalContextMenu(ev) {
  const target = ev?.target
  if (target?.closest?.(".cell") || target?.closest?.(".context-menu")) return
  if (contextMenu.open) closeContextMenu()
}

async function runPcAction(action) {
  const pc = contextMenu.pc
  if (!pc) return

  try {
    if (action === "stop_session") {
      const sessionId = pc?.active_session?.id
      if (!sessionId) {
        ElMessage.warning("Bu PKda faol sessiya yo'q")
        return
      }
      await cpApi.stopSession(sessionId)
      ElMessage.success("Sessiya yakunlandi")
    } else if (action === "reboot") {
      await cpApi.sendPcCommand(pc.id, { type: "REBOOT" })
      ElMessage.success("Qayta yuklash buyrug'i yuborildi")
    } else if (action === "shutdown") {
      await cpApi.sendPcCommand(pc.id, { type: "SHUTDOWN" })
      ElMessage.success("O'chirish buyrug'i yuborildi")
    }

    closeContextMenu()
    await reload()
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || "Amalni bajarib bo'lmadi")
  }
}

function openClientInfo(pc) {
  const s = pc?.active_session
  if (!s?.client) return
  clientInfo.pc = pc
  clientInfo.session = s
  clientInfo.client = s.client
  clientInfo.open = true
}

function closeClientInfo() {
  clientInfo.open = false
  clientInfo.pc = null
  clientInfo.session = null
  clientInfo.client = null
}

function onDragStart(cell, ev) {
  if (!cell?.pc) return
  closeContextMenu()
  dragPc.active = true
  dragPc.pcId = cell.pc.id
  dragPc.from = { row: cell.row, col: cell.col }
  ev.dataTransfer.effectAllowed = "move"
}

function onTrayDragStart(pc, ev) {
  closeContextMenu()
  dragPc.active = true
  dragPc.pcId = pc.id
  dragPc.from = null
  ev.dataTransfer.effectAllowed = "move"
}

function onDragEnd() {
  dragPc.active = false
  dragPc.pcId = null
  dragPc.from = null
  dragOverKey.value = null
  trayDragOver.value = false
}

function onDragOver(cell, ev) {
  if (!dragPc.active) return
  ev.preventDefault()
  dragOverKey.value = cell.key
}

function onDragLeave(cell) {
  if (dragOverKey.value === cell.key) dragOverKey.value = null
}

async function onDrop(cell, ev) {
  if (!dragPc.active || !dragPc.pcId) return
  ev.preventDefault()
  if (cell.base?.pc_id === dragPc.pcId) return
  const item = { row: cell.row, col: cell.col, pc_id: dragPc.pcId, is_active: true }
  await applyBatch([item])
}

function onTrayDragOver(ev) {
  if (!dragPc.active) return
  ev.preventDefault()
  trayDragOver.value = true
}

function onTrayDragLeave() {
  trayDragOver.value = false
}

async function onTrayDrop(ev) {
  if (!dragPc.active || !dragPc.pcId) return
  ev.preventDefault()
  trayDragOver.value = false
  if (!dragPc.from) return
  await applyBatch([{ row: dragPc.from.row, col: dragPc.from.col, pc_id: null }])
}

function onCellHover(cell, ev) {
  if (!cell?.pc?.active_session) { tooltip.open = false; return }
  const rect = gridRef.value?.getBoundingClientRect()
  if (!rect) return
  tooltip.x = ev.clientX - rect.left + 16
  tooltip.y = ev.clientY - rect.top + 16
  tooltip.cell = cell
  tooltip.open = true
}

function onCellLeave() {
  tooltip.open = false
}

async function applyBatch(items) {
  if (saving.value) return
  closeContextMenu()
  saving.value = true
  try {
    await cpApi.layoutCellsBatch({ items })
    await reload()
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || "Saqlashda xatolik")
  } finally {
    saving.value = false
  }
}

async function detachSelectedPc() {
  const cell = selectedCell.value
  if (!cell?.base) return
  await applyBatch([{ row: cell.row, col: cell.col, pc_id: null }])
}

async function reload() {
  if (loading.value) return
  loading.value = true
  try {
    const [layoutSettled, pcsSettled, sessionsSettled] = await Promise.allSettled([
      cpApi.layout(),
      cpApi.pcs({ per_page: 500 }),
      cpApi.activeSessions(),
    ])
    if (layoutSettled.status !== "fulfilled") throw layoutSettled.reason
    if (pcsSettled.status !== "fulfilled") throw pcsSettled.reason

    const layoutRes = layoutSettled.value
    const pcsRes = pcsSettled.value
    const sessionsRes = sessionsSettled.status === "fulfilled" ? sessionsSettled.value : null

    const gridData = layoutRes?.data?.grid || {}
    grid.rows = Number(gridData.rows || 6)
    grid.cols = Number(gridData.cols || 12)

    const rawCells = Array.isArray(layoutRes?.data?.data) ? layoutRes.data.data : []
    cells.value = rawCells.map(c => ({
      id: c.id,
      row: Number(c.row || 0),
      col: Number(c.col || 0),
      pc_id: c.pc_id ? Number(c.pc_id) : null,
      is_active: c.is_active ?? true,
      label: c.label || "",
      notes: c.notes || "",
      pc: c.pc || null,
    }))

    const activeByPcId = new Map()
    const fetchedAtMs = Date.now()
    for (const s of pickRows(sessionsRes)) {
      const pcId = Number(s?.pc?.id || s?.pc_id || 0)
      if (!pcId) continue
      activeByPcId.set(pcId, {
        id: s?.id ?? null,
        started_at: s?.started_at ?? null,
        tariff: s?.tariff ?? null,
        client: s?.client ?? null,
        seconds_left: Number(s?.seconds_left ?? 0),
        rate_per_hour: s?.rate_per_hour ?? null,
        from: s?.from ?? "balance",
        snapshot_at_ms: fetchedAtMs,
      })
    }

    pcs.value = pickRows(pcsRes).map(p => ({
      id: p.id ?? p._id,
      code: p.code || p.name,
      raw_status: String(p.status || "offline").toLowerCase(),
      status: normalizePcStatus(p.status, !!(activeByPcId.get(Number(p.id ?? p._id)) || p.active_session)),
      zone_price_per_hour: p.zone_price_per_hour,
      client_balance: p.client_balance ?? p?.active_session?.client?.balance ?? null,
      active_session: (activeByPcId.get(Number(p.id ?? p._id)) || p.active_session)
        ? mergeActiveSession(activeByPcId.get(Number(p.id ?? p._id)), p.active_session)
        : null,
      ip: p.ip_address || p.ip,
      telemetry: p.telemetry || null,
    }))

    if (selectedKey.value) {
      const selectedStillHasPc = cells.value.some(c => `${c.row}-${c.col}` === selectedKey.value && !!c.pc_id)
      if (!selectedStillHasPc) closeRightPanel()
    }

    if (contextMenu.open) {
      const pcId = Number(contextMenu.pc?.id || 0)
      if (!pcId || !pcs.value.some(p => Number(p.id) === pcId)) {
        closeContextMenu()
      }
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || "Failed to load layout")
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  reload()
  window.addEventListener("click", closeContextMenu)
  window.addEventListener("contextmenu", onGlobalContextMenu)

  clockTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)

  pollTimer = setInterval(() => {
    reload()
  }, 3000)
})

onBeforeUnmount(() => {
  window.removeEventListener("click", closeContextMenu)
  window.removeEventListener("contextmenu", onGlobalContextMenu)
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }
})
</script>

<style scoped>
.hall-shell{
  position: relative;
  min-height: calc(100vh - 120px);
  border: 1px solid rgba(255,255,255,.05);
  border-radius: 16px;
  overflow: hidden;
  background: radial-gradient(1200px 600px at 80% -20%, rgba(34,197,94,.05), transparent 60%), #060d18;
}
.hall-shell.panel-collapsed .center{padding-top: 62px}
.hall-shell.panel-collapsed .left.collapsed{top:10px;left:10px}

.left{
  position: absolute;
  left: 18px;
  top: 18px;
  z-index: 20;
  width: 232px;
  max-height: calc(100% - 36px);
  height: fit-content;
  background: rgba(18,27,42,.94);
  border: 1px solid rgba(255,255,255,.05);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  box-shadow: 0 14px 36px rgba(0,0,0,.35);
  transition: width .2s ease, height .2s ease, padding .2s ease;
}

.left.collapsed{
  width: 34px;
  height: 34px;
  bottom: auto;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
}
.left.collapsed .left-head{margin-bottom:0}

.left-head{
  display:flex;
  justify-content:flex-start;
  margin-bottom: 2px;
}

.left-body{
  display:flex;
  flex-direction:column;
  gap: 8px;
  padding-bottom: 2px;
}

.info-dot{
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #2c7efc;
  color: white;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 18px;
  font-weight:800;
  border: none;
  cursor: pointer;
  line-height: 1;
}

.left-card{
  padding: 11px 12px;
  background: rgba(12,22,38,.65);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  color: #cbd5e1;
  font-size: 12px;
}
.left-card.active{border-color: rgba(16,185,129,.8); box-shadow: inset 0 0 0 1px rgba(16,185,129,.2)}
.left-title{display:flex;align-items:center;gap:8px;font-weight:700}
.left-count{opacity:.8}

.legend-icon{
  width: 14px;
  height: 14px;
  border-radius: 4px;
  display: inline-block;
  position: relative;
  flex: 0 0 14px;
}
.legend-icon.frame{
  border: 2px solid #3b82f6;
  background: rgba(59,130,246,.12);
}
.legend-icon.calendar{
  border: 2px solid #3b82f6;
  border-radius: 4px;
}
.legend-icon.calendar::before{
  content:"";
  position:absolute;
  left: 2px;
  right: 2px;
  top: 2px;
  height: 2px;
  background:#3b82f6;
}
.legend-icon.power{
  width: 14px;
  height: 14px;
  border: 2px solid #64748b;
  border-top-color: transparent;
  border-radius: 999px;
}
.legend-icon.power::before{
  content:"";
  position:absolute;
  left:50%;
  top:-4px;
  transform:translateX(-50%);
  width:2px;
  height:6px;
  background:#64748b;
  border-radius: 2px;
}
.legend-icon.power.on{
  border-color:#22c55e;
  border-top-color: transparent;
}
.legend-icon.power.on::before{background:#22c55e}

.left-section{
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid rgba(148,163,184,.25);
  font-size: 12px;
  color:#9aa4b2;
  opacity:.7;
}
.left-item{
  display:flex;
  align-items:center;
  gap:8px;
  font-size:12px;
  color:#dbe7ff;
}
.left-item .pill{
  margin-left:auto;
  min-width:20px;
  height:20px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background:rgba(30,41,59,.9);
  border-radius:999px;
  font-size:11px;
  color:#cbd5e1;
}

.dot{width:11px;height:11px;border-radius:999px;background:#64748b}
.dot.warn{background:#f59e0b}
.dot.danger{background:#ff4d58}

.center{
  min-height: inherit;
  background: linear-gradient(180deg, rgba(9,14,24,.92), rgba(6,12,22,.95));
  border-radius: 16px;
  padding: 34px 24px 18px;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.grid-wrap{
  display:flex;
  flex-direction:column;
  gap: 12px;
  width: 100%;
  padding: 2px;
}

.grid{
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  grid-auto-rows: 62px;
  grid-auto-flow: row;
  row-gap: 22px;
  column-gap: 4px;
  position: relative;
  width: 100%;
  align-content: start;
}

.cell{
  border-radius: 8px;
  border: 1px solid rgba(28,49,78,.72);
  background: linear-gradient(180deg, #071427, #061120);
  color: #dbe8ff;
  padding: 6px 7px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  font-size:12px;
  position: relative;
  z-index: 1;
  cursor: pointer;
  min-height: 62px;
  box-shadow: inset 0 0 0 1px rgba(9,20,38,.2);
}

.cell.selected{outline:2px solid rgba(59,130,246,.6)}
.cell.drag-over{outline:2px dashed rgba(56,189,248,.8); outline-offset: -2px}

.cell-top{display:flex;align-items:center;justify-content:space-between;gap:6px}
.cell-id{font-weight:700;color:#8499b8;font-size:12px;line-height:1}
.cell-main{font-weight:700;color:currentColor;font-size:12px}
.cell-main.muted{color:rgba(148,163,184,.35)}
.cell-client{
  margin-top: 4px;
  align-self: flex-start;
  max-width: 100%;
  border: 1px solid rgba(59,130,246,.35);
  background: rgba(59,130,246,.16);
  color: #dbe8ff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  line-height: 1.3;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-client:hover{background: rgba(59,130,246,.24)}

.cell.empty{}
.cell.inactive{background:rgba(15,23,42,.4)}
.cell.offline{background:rgba(23,34,48,.85); border-color:rgba(71,85,105,.6); color:#d1d5db;}

.cell.blue{border-color:#1e8fff; box-shadow:0 0 0 1px rgba(30,143,255,.25) inset}
.cell.red{border-color:#ef4444; color:#ef4444; background:rgba(50,18,24,.45)}
.cell.green{border-color:#19c56f; color:#19c56f; background:rgba(16,56,44,.4)}
.cell.cyan{border-color:#22d3ee; color:#22d3ee}
.cell.purple{border-color:#a855f7; color:#a78bfa; background:rgba(40,26,62,.35)}
.cell.amber{border-color:#f97316; color:#fb923c; background:rgba(67,36,22,.45)}

.cell-icon{width:14px;height:14px;border-radius:4px;background:rgba(255,255,255,.08);display:inline-block}
.cell-icon.alert{background:#ef4444}
.cell-icon.calendar{background:#22c55e}
.cell-icon.clock{background:#3b82f6}
.cell-icon.lock{background:#f59e0b}
.cell-icon.x{background:#ef4444}

.cell-offline-btn{
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: rgba(51,65,85,.75);
  border: 1px solid rgba(100,116,139,.85);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  box-shadow: none;
}

.cell-offline-btn:hover{
  background: rgba(71,85,105,.9);
}

.power-icon{
  width: 9px;
  height: 9px;
  border: 1px solid #9ca3af;
  border-top-color: transparent;
  border-radius: 999px;
  position: relative;
  box-sizing: border-box;
}
.power-icon::after{
  content: "";
  position: absolute;
  left: 50%;
  top: -5px;
  transform: translateX(-50%);
  width: 1px;
  height: 6px;
  background: #9ca3af;
  border-radius: 2px;
}

.tooltip{
  position:absolute;
  width: 260px;
  background: rgba(15,23,42,.95);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,.4);
  z-index: 10;
}

.tooltip-title{display:flex;align-items:center;gap:8px;font-weight:900}
.tooltip .timer{margin-left:auto;font-size:11px;color:#94a3b8}
.tooltip-row{margin-top:10px;display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1}
.tooltip-row .muted{margin-left:auto;color:#94a3b8;font-size:11px}
.tooltip-footer{margin-top:12px;font-size:12px;color:#94a3b8}

.chip{width:12px;height:12px;border-radius:3px;background:#22c55e}

.mini-icon{width:14px;height:14px;border-radius:4px;background:rgba(255,255,255,.1)}
.mini-icon.clock{background:#94a3b8}
.mini-icon.user{background:#3b82f6}
.mini-icon.lock{background:#f59e0b}

.context-menu{
  position: fixed;
  z-index: 45;
  width: 210px;
  border-radius: 12px;
  border: 1px solid rgba(148,163,184,.3);
  background: rgba(11,18,32,.98);
  box-shadow: 0 18px 40px rgba(0,0,0,.45);
  padding: 8px;
}
.context-title{
  font-size: 12px;
  font-weight: 800;
  color: #cbd5e1;
  padding: 7px 8px 8px;
  border-bottom: 1px solid rgba(148,163,184,.22);
  margin-bottom: 4px;
}
.context-item{
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  color: #dbe8ff;
  border-radius: 9px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
}
.context-item:hover{
  border-color: rgba(148,163,184,.3);
  background: rgba(51,65,85,.28);
}
.context-item.danger{
  color: #fecaca;
}

.pc-tray{
  order: -1;
  background: rgba(13,19,29,.8);
  border: 1px solid rgba(255,255,255,.05);
  border-radius: 12px;
  padding: 10px;
  width: 100%;
}

.pc-tray.tray-over{
  border-color: rgba(148,163,184,.6);
  box-shadow: 0 0 0 1px rgba(148,163,184,.35), 0 12px 24px rgba(0,0,0,.25);
}

.tray-title{
  font-size:12px;
  color:#9aa4b2;
  margin-bottom:8px;
}

.tray-list{
  display:flex;
  flex-wrap:wrap;
  gap: 10px;
}

.tray-pc{
  width: 80px;
  height: 80px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(180deg, #0f172a, #0b1220);
  display:flex;
  align-items:center;
  justify-content:center;
  color:#cbd5e1;
  font-size:12px;
  font-weight:800;
  cursor: grab;
}

.tray-pc:active{cursor:grabbing}

.tray-empty{
  color:#64748b;
  font-size:12px;
  padding: 6px 4px;
}

.right{
  position: absolute;
  right: 18px;
  top: 18px;
  z-index: 20;
  width: 300px;
  max-height: calc(100% - 36px);
  height: fit-content;
  background: rgba(21,30,44,.94);
  border: 1px solid rgba(255,255,255,.05);
  border-radius: 14px;
  padding: 16px;
  display:flex;
  flex-direction:column;
  gap: 12px;
  overflow: auto;
  box-shadow: 0 18px 42px rgba(0,0,0,.4);
}

.right-head{display:flex;align-items:center;gap:8px}
.right-title{font-weight:900;font-size:26px}
.right-badge{background:#1e293b;color:#93c5fd;border:1px solid rgba(59,130,246,.4);padding:2px 8px;border-radius:999px;font-size:11px}
.right-badge.badge-busy{background:#1b2b1f;color:#86efac;border-color:rgba(34,197,94,.45)}
.right-badge.badge-online{background:#1e293b;color:#93c5fd;border-color:rgba(59,130,246,.45)}
.right-badge.badge-locked{background:#2a1b1b;color:#fecaca;border-color:rgba(239,68,68,.45)}
.right-badge.badge-reserved{background:#241b2f;color:#e9d5ff;border-color:rgba(168,85,247,.45)}
.right-badge.badge-maintenance{background:#2a2216;color:#fde68a;border-color:rgba(245,158,11,.45)}
.right-badge.badge-offline{background:#1f2937;color:#94a3b8;border-color:rgba(100,116,139,.45)}

.close{margin-left:auto;background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer}

.right-section{display:flex;flex-direction:column;gap:6px}
.right-label{font-size:12px;color:#94a3b8}
.right-value{font-size:14px;color:#e2e8f0}
.right-sub{font-size:12px;color:#94a3b8}
.session-client-btn{
  border: 1px solid rgba(16,185,129,.4);
  background: rgba(16,185,129,.14);
  color: #bbf7d0;
  border-radius: 10px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  font-weight: 700;
}
.session-client-btn:hover{background: rgba(16,185,129,.22)}

.assign-row{display:flex;align-items:center;gap:8px}

.ghost{
  background: transparent;
  border:1px solid rgba(255,255,255,.12);
  color:#cbd5e1;
  padding:6px 10px;
  border-radius:8px;
  font-size:11px;
  cursor:pointer;
}
.ghost:disabled{opacity:.4;cursor:default}

.disk{margin-top:8px}
.disk-label{font-size:12px;color:#cbd5e1}
.bar{height:12px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}
.bar span{display:block;height:100%;border-radius:999px}
.bar.orange span{background:#fb923c}
.bar.blue span{background:#3b82f6}
.disk-sub{font-size:11px;color:#94a3b8;margin-top:4px}

.right-note{font-size:12px;color:#cbd5e1;line-height:1.4}

.client-modal-backdrop{
  position: absolute;
  inset: 0;
  z-index: 35;
  background: rgba(2,6,23,.58);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.client-modal{
  width: min(460px, 100%);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(15,23,42,.96);
  box-shadow: 0 20px 40px rgba(0,0,0,.45);
  padding: 14px;
}
.client-modal-head{
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.client-modal-title{
  font-size: 18px;
  font-weight: 900;
}
.client-modal-row{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid rgba(255,255,255,.06);
}
.client-modal-row .k{
  color: #94a3b8;
  font-size: 12px;
}
.client-modal-row .v{
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 700;
  text-align: right;
}

@media (max-width: 1200px){
  .hall-shell{
    border: none;
    background: transparent;
    overflow: visible;
  }
  .left,
  .right{
    position: static;
    width: auto;
    margin-bottom: 10px;
    max-height: none;
  }
  .center{
    min-height: auto;
    padding: 12px;
  }
  .grid{
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  }
}
</style>









