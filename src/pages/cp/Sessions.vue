<!-- src/pages/cp/Sessions.vue -->
<template>
  <div class="cp-page">
    <!-- Header -->
    <div class="cp-head">
      <div>
        <div class="cp-title">Sessiyalar</div>
        <div class="cp-sub">Faol sessiyalar, tezkor amallar va zona bo'yicha nazorat.</div>
      </div>

      <div class="cp-head-actions">
        <div class="cp-pill">
          <span class="dot" :class="{ on: true }"></span>
          <span>Faol: {{ filteredSessions.length }}</span>
        </div>

        <button class="btn btn-ghost" @click="reload">
          Yangilash
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="cp-card cp-filters">
      <div class="field" style="padding-left: 10px">
        <div class="label">Qidiruv</div>
        <div class="input-wrap" style="padding-right: 40px">
          <span class="icon">⌕</span>
          <input
              v-model="q"
              class="input"
              placeholder="ПК, mijoz yoki zona bo'yicha qidiruv"
              @keydown.enter="reload"
          />
          <button v-if="q" class="xbtn" @click="q = ''">×</button>
        </div>
      </div>

      <div class="field">
        <div class="label">Zona</div>
        <select v-model="zone" class="select">
          <option value="">Barchasi</option>
          <option v-for="z in zones" :key="z" :value="z">{{ z }}</option>
        </select>
      </div>

      <div class="field">
        <div class="label">Holat</div>
        <select v-model="status" class="select">
          <option value="active">Faol</option>
          <option value="paused">Pauza</option>
          <option value="ended">Yakunlangan</option>
        </select>
      </div>

      <div class="field">
        <div class="label">Saralash</div>
        <select v-model="sortBy" class="select">
          <option value="endingSoon">Tez tugaydiganlar</option>
          <option value="pc">ПК</option>
          <option value="client">Mijoz</option>
          <option value="zone">Zona</option>
          <option value="startedAt">Boshlangan vaqti</option>
        </select>
      </div>
    </div>

    <!-- At-risk quick strip -->
    <div class="cp-alert" v-if="endingSoon.length">
      <div class="cp-alert-title">Tez tugaydi</div>
      <div class="cp-alert-items">
        <button
            v-for="s in endingSoon"
            :key="s.id"
            class="chip"
            @click="openActions(s)"
            title="Amallarni ochish"
        >
          <span class="chip-pc">{{ s.pcName }}</span>
          <span class="chip-sep">•</span>
          <span class="chip-min">{{ formatLeft(s.leftMinutes) }}</span>
        </button>
      </div>
    </div>

    <!-- Sessions list -->
    <div class="cp-card cp-table">
      <div class="cp-table-head">
        <div class="th">ПК</div>
        <div class="th">Mijoz</div>
        <div class="th">Zona</div>
        <div class="th right">Balans</div>
        <div class="th right">Qoldiq</div>
        <div class="th right">Amallar</div>
      </div>

      <div v-if="loading" class="cp-skeleton">
        <div v-for="i in 6" :key="i" class="sk-row"></div>
      </div>

      <div v-else-if="!filteredSessions.length" class="cp-empty">
        <div class="empty-title">Sessiyalar topilmadi</div>
        <div class="empty-sub">Filterlarni o'zgartiring yoki ro'yxatni yangilang.</div>
      </div>

      <div v-else class="cp-table-body">
        <div
            v-for="s in sortedSessions"
            :key="s.id"
            class="row"
            :class="{ warn: s.leftMinutes <= 10, paused: s.status === 'paused' }"
            @contextmenu.prevent="openContextMenu($event, s)"
        >
          <div class="td pc">
            <div class="pc-main">
              <span class="badge" :class="badgeClass(s)">{{ badgeText(s) }}</span>
              <span class="pc-name">{{ s.pcName }}</span>
            </div>
            <div class="pc-sub">
              <span class="muted">Start:</span> {{ formatTime(s.startedAt) }}
              <span class="muted sep">•</span>
              <span class="muted">Operator:</span> {{ s.operatorLogin }}
            </div>
          </div>

          <div class="td client">
            <div class="client-main">
              <span class="avatar">👤</span>
              <span class="client-login">{{ s.clientLogin }}</span>
              <span v-if="s.clientName" class="client-name">({{ s.clientName }})</span>
            </div>
            <div class="client-sub muted">
              {{ s.paymentHint }}
            </div>
          </div>

          <div class="td zone">
            <span class="zone-pill">{{ s.zone }}</span>
            <span v-if="s.packageName" class="pkg-pill" title="Paket">
              {{ s.packageName }}
            </span>
          </div>

          <div class="td right">
            <div class="money">{{ formatMoney(s.balance) }}</div>
            <div class="muted tiny">UZS</div>
          </div>

          <div class="td right">
            <div class="left" :class="{ red: s.leftMinutes <= 10 }">
              {{ formatLeft(s.leftMinutes) }}
            </div>
            <div class="muted tiny">
              {{ s.status === 'paused' ? 'pauzada' : "zona tarifi bo'yicha" }}
            </div>
          </div>

          <div class="td right actions">
            <button class="btn btn-mini btn-primary" @click.stop="onTopup(s)">
              + Balans
            </button>
            <button class="btn btn-mini" @click.stop="onPackage(s)">
              + Paket
            </button>
            <button class="btn btn-mini btn-danger" @click.stop="onStop(s)">
              Yakunlash
            </button>
          </div>
        </div>
      </div>

      <div class="cp-foot">
        <div class="muted tiny">
          Eslatma: ПК yoki qator ustida right-click qilib tezkor menyuni ochish mumkin.
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div v-if="cm.open" class="cm-backdrop" @click="cm.open=false"></div>
    <div
        v-if="cm.open"
        class="cm"
        :style="{ left: cm.x + 'px', top: cm.y + 'px' }"
    >
      <div class="cm-title">
        <div class="cm-pc">{{ cm.session?.pcName }}</div>
        <div class="cm-sub muted">{{ cm.session?.clientLogin }} • {{ cm.session?.zone }}</div>
      </div>

      <button class="cm-item" @click="onTopup(cm.session); closeCM()">Balans to'ldirish</button>
      <button class="cm-item" @click="onPackage(cm.session); closeCM()">Paket biriktirish</button>
      <div class="cm-sep"></div>
      <button class="cm-item danger" @click="onStop(cm.session); closeCM()">Sessiyani tugatish</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

// ✅ HOZIRCHA MOCK. Keyin API ulaymiz.
  // Keyin API ulansa cpApi.get('/sessions/active') ishlatiladi.

const loading = ref(false)
const q = ref('')
const zone = ref('')
const status = ref('active')
const sortBy = ref('endingSoon')

const sessions = ref([
  {
    id: 101,
    status: 'active',
    pcName: 'VIP01',
    zone: 'VIP',
    ip: '192.168.0.11',
    clientLogin: '9444948609',
    clientName: '',
    operatorLogin: 'owner_arena',
    startedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    leftMinutes: 12,
    balance: 15000,
    packageName: '',
    paymentHint: "Akkaunt • qarzdorliksiz",
  },
  {
    id: 102,
    status: 'active',
    pcName: 'A21',
    zone: 'A-ZONE',
    ip: '192.168.0.21',
    clientLogin: '506773367',
    clientName: '',
    operatorLogin: 'operator_01',
    startedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    leftMinutes: 73,
    balance: 50000,
    packageName: 'Night Pack',
    paymentHint: "Akkaunt • paket zona bilan bog'langan",
  },
  {
    id: 103,
    status: 'paused',
    pcName: 'A22',
    zone: 'A-ZONE',
    ip: '192.168.0.22',
    clientLogin: '7711223344',
    clientName: '',
    operatorLogin: 'operator_01',
    startedAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    leftMinutes: 120,
    balance: 20000,
    packageName: '',
    paymentHint: 'Pauza • kutish rejimi',
  },
])

const zones = computed(() => {
  const set = new Set(sessions.value.map(s => s.zone))
  return Array.from(set).sort()
})

const filteredSessions = computed(() => {
  const qq = q.value.trim().toLowerCase()
  return sessions.value.filter(s => {
    if (status.value && s.status !== status.value) return false
    if (zone.value && s.zone !== zone.value) return false
    if (!qq) return true
    return (
        s.pcName.toLowerCase().includes(qq) ||
        s.zone.toLowerCase().includes(qq) ||
        s.clientLogin.toLowerCase().includes(qq) ||
        (s.clientName || '').toLowerCase().includes(qq)
    )
  })
})

const sortedSessions = computed(() => {
  const list = [...filteredSessions.value]
  const by = sortBy.value
  list.sort((a, b) => {
    if (by === 'endingSoon') return a.leftMinutes - b.leftMinutes
    if (by === 'pc') return a.pcName.localeCompare(b.pcName)
    if (by === 'client') return a.clientLogin.localeCompare(b.clientLogin)
    if (by === 'zone') return a.zone.localeCompare(b.zone)
    if (by === 'startedAt') return new Date(a.startedAt) - new Date(b.startedAt)
    return 0
  })
  return list
})

const endingSoon = computed(() =>
    filteredSessions.value
        .filter(s => s.status === 'active' && s.leftMinutes <= 15)
        .sort((a, b) => a.leftMinutes - b.leftMinutes)
        .slice(0, 6)
)

function badgeText(s) {
  if (s.status === 'paused') return 'Pauza'
  if (s.leftMinutes <= 10) return 'Tez'
  return 'Faol'
}
function badgeClass(s) {
  if (s.status === 'paused') return 'b-paused'
  if (s.leftMinutes <= 10) return 'b-warn'
  return 'b-ok'
}
function formatMoney(v) {
  try {
    return new Intl.NumberFormat('ru-RU').format(Number(v || 0))
  } catch {
    return String(v || 0)
  }
}
function formatLeft(min) {
  const m = Math.max(0, Number(min || 0))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h} soat ${mm} min`
}
function formatTime(iso) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

async function reload() {
  // MOCK: keyin API ga ulanadi
  loading.value = true
  try {
    await new Promise(r => setTimeout(r, 350))
    // TODO(API): sessions.value = (await cpApi.activeSessions()).data
  } finally {
    loading.value = false
  }
}

function openActions(s) {
  // "Soon ending" chip bosilganda
  // keyin drawer ochamiz (Topup yoki actions)
  onTopup(s)
}

// TODO: bularni keyin real komponentlarga ulaymiz (TopupModal/PackageModal)
function onTopup(s) {
  console.log('TOPUP', s)
  // emit yoki store orqali Topup modal ochish
}
function onPackage(s) {
  console.log('PACKAGE', s)
}
function onStop(s) {
  console.log('STOP', s)
}

onMounted(() => {
  reload()
})

/** Context Menu */
const cm = reactive({ open: false, x: 0, y: 0, session: null })

function openContextMenu(e, s) {
  cm.open = true
  cm.session = s
  // viewportdan chiqib ketmasin
  const pad = 8
  const maxX = window.innerWidth - 260 - pad
  const maxY = window.innerHeight - 220 - pad
  cm.x = Math.min(e.clientX, maxX)
  cm.y = Math.min(e.clientY, maxY)
}
function closeCM() {
  cm.open = false
  cm.session = null
}
</script>

<style scoped>
/* Minimal: cp-glass.css bilan uyg'un stillar */
.cp-page { padding: 18px; }

.cp-head{
  display:flex; align-items:flex-start; justify-content:space-between;
  gap:16px; margin-bottom:14px;
}
.cp-title{ font-weight:800; font-size:22px; letter-spacing:.2px; }
.cp-sub{ opacity:.75; margin-top:4px; font-size:13px; }

.cp-head-actions{ display:flex; align-items:center; gap:10px; }

.cp-pill{
  display:flex; gap:8px; align-items:center;
  padding:8px 12px; border-radius:999px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  backdrop-filter: blur(10px);
  font-size:13px;
}
.dot{ width:8px; height:8px; border-radius:50%; background: rgba(255,255,255,.25); }
.dot.on{ background: #2bd576; box-shadow: 0 0 0 4px rgba(43,213,118,.12); }

.cp-card{
  border-radius:16px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.08);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 60px rgba(0,0,0,.35);
}

.cp-filters{
  display:grid;
  grid-template-columns: 1.4fr .8fr .8fr .9fr;
  gap:12px;
  padding:14px;
  margin-bottom:12px;
}
.field .label{ font-size:12px; opacity:.75; margin-bottom:6px; }
.input-wrap{
  position:relative;
}
.icon{
  position:absolute; left:10px; top:50%; transform:translateY(-50%);
  opacity:.55;
}
.xbtn{
  position:absolute; right:8px; top:50%; transform:translateY(-50%);
  width:26px; height:26px; border-radius:10px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
  color:#fff; cursor:pointer;
}
.input, .select{
  width:100%;
  padding:11px 12px;
  padding-left:32px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
  color:#fff;
  outline:none;
}
.select{ padding-left:12px; }
.input:focus, .select:focus{
  border-color: rgba(90,175,255,.45);
  box-shadow: 0 0 0 4px rgba(90,175,255,.10);
}

.cp-alert{
  padding:12px 14px;
  border-radius:16px;
  background: rgba(255,255,255,.03);
  border: 1px dashed rgba(255,255,255,.14);
  margin-bottom:12px;
}
.cp-alert-title{ font-weight:700; margin-bottom:8px; opacity:.9; }
.cp-alert-items{ display:flex; flex-wrap:wrap; gap:8px; }

.chip{
  display:inline-flex; align-items:center; gap:8px;
  padding:8px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
  color:#fff; cursor:pointer;
}
.chip:hover{ border-color: rgba(90,175,255,.35); }
.chip-pc{ font-weight:700; }
.chip-sep{ opacity:.5; }
.chip-min{ opacity:.85; }

.cp-table{ padding:14px; }
.cp-table-head{
  display:grid;
  grid-template-columns: 2.2fr 1.6fr .9fr .9fr .9fr 1.2fr;
  gap:10px;
  padding:10px 12px;
  border-radius:12px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.07);
}
.th{ font-size:12px; opacity:.7; text-transform:uppercase; letter-spacing:.08em; }
.right{ text-align:right; }

.cp-table-body{ margin-top:10px; display:flex; flex-direction:column; gap:10px; }

.row{
  display:grid;
  grid-template-columns: 2.2fr 1.6fr .9fr .9fr .9fr 1.2fr;
  gap:10px;
  padding:12px 12px;
  border-radius:14px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.14);
}
.row:hover{ border-color: rgba(90,175,255,.22); }
.row.warn{ border-color: rgba(255,184,72,.24); box-shadow: 0 0 0 3px rgba(255,184,72,.06) inset; }
.row.paused{ opacity:.85; }

.td{ display:flex; flex-direction:column; justify-content:center; min-width:0; }
.td.actions{ align-items:flex-end; gap:8px; flex-direction:row; justify-content:flex-end; flex-wrap:wrap; }
.pc-main{ display:flex; align-items:center; gap:10px; min-width:0; }
.pc-name{ font-weight:800; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pc-sub{ font-size:12px; margin-top:6px; opacity:.75; }
.sep{ margin:0 6px; }

.badge{
  font-size:11px; font-weight:800;
  padding:6px 10px; border-radius:999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
}
.b-ok{ border-color: rgba(43,213,118,.25); }
.b-warn{ border-color: rgba(255,184,72,.25); }
.b-paused{ border-color: rgba(160,170,190,.25); }

.client-main{ display:flex; align-items:center; gap:10px; min-width:0; }
.avatar{
  width:28px; height:28px;
  display:grid; place-items:center;
  border-radius:10px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
}
.client-login{ font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.client-name{ opacity:.75; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.client-sub{ font-size:12px; margin-top:6px; }

.zone-pill{
  display:inline-flex; align-self:flex-start;
  padding:7px 10px; border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  font-weight:700; font-size:12px;
}
.pkg-pill{
  margin-top:8px;
  display:inline-flex; align-self:flex-start;
  padding:7px 10px; border-radius:999px;
  border:1px solid rgba(90,175,255,.25);
  background: rgba(90,175,255,.10);
  font-weight:800; font-size:12px;
}

.money{ font-weight:900; font-size:15px; }
.left{ font-weight:900; font-size:15px; }
.left.red{ color: #ffb848; }
.tiny{ font-size:12px; opacity:.7; }
.muted{ opacity:.7; }

.btn{
  padding:10px 12px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color:#fff;
  cursor:pointer;
}
.btn:hover{ border-color: rgba(90,175,255,.22); }
.btn-ghost{ background: rgba(0,0,0,.10); }
.btn-mini{ padding:8px 10px; border-radius:11px; font-size:12px; font-weight:800; }
.btn-primary{
  border-color: rgba(90,175,255,.35);
  background: rgba(90,175,255,.16);
}
.btn-danger{
  border-color: rgba(255,92,92,.25);
  background: rgba(255,92,92,.10);
}

.cp-skeleton{ display:flex; flex-direction:column; gap:10px; margin-top:12px; }
.sk-row{
  height:68px; border-radius:14px;
  background: rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.06);
  animation: pulse 1.2s infinite ease-in-out;
}
@keyframes pulse{
  0%,100%{ opacity:.6 }
  50%{ opacity:1 }
}

.cp-empty{
  padding:30px 10px;
  text-align:center;
  opacity:.85;
}
.empty-title{ font-weight:900; font-size:16px; }
.empty-sub{ margin-top:6px; font-size:13px; opacity:.7; }

.cp-foot{
  margin-top:12px;
  padding-top:10px;
  border-top: 1px solid rgba(255,255,255,.06);
}

/* Context menu */
.cm-backdrop{
  position:fixed; inset:0;
  background: transparent;
  z-index: 90;
}
.cm{
  position:fixed;
  width:260px;
  z-index: 91;
  border-radius:14px;
  background: rgba(10,16,26,.92);
  border: 1px solid rgba(255,255,255,.10);
  box-shadow: 0 22px 70px rgba(0,0,0,.55);
  backdrop-filter: blur(16px);
  overflow:hidden;
}
.cm-title{
  padding:12px 12px 10px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.cm-pc{ font-weight:900; }
.cm-sub{ font-size:12px; margin-top:4px; }
.cm-item{
  width:100%;
  text-align:left;
  padding:10px 12px;
  background: transparent;
  border:0;
  color:#fff;
  cursor:pointer;
}
.cm-item:hover{ background: rgba(255,255,255,.06); }
.cm-item.danger:hover{ background: rgba(255,92,92,.10); }
.cm-sep{ height:1px; background: rgba(255,255,255,.06); }
</style>

