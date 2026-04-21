<template>
  <div class="cp-page">
    <!-- Header -->
    <div class="cp-head glass">
      <div>
        <div class="cp-title">Paketlar</div>
        <div class="cp-sub">Zona bo'yicha vaqt paketlarini yarating va narxlarini boshqaring.</div>
      </div>

      <div class="cp-head-actions">
        <button class="btn ghost" :disabled="loading" @click="reload">Yangilash</button>
        <button class="btn primary" :disabled="loading" @click="openCreate">+ Paket qo'shish</button>
      </div>
    </div>

    <!-- Filters + stats -->
    <div class="glass card">
      <div class="card-h">Filtrlar</div>
      <div class="hint">Holat, zona va nom bo'yicha filtrlash.</div>

      <div class="filters">
        <div class="field">
          <div class="label">Holat</div>
          <select class="input" v-model="filters.active">
            <option value="">Barchasi</option>
            <option value="true">Faol</option>
            <option value="false">O'chirilgan</option>
          </select>
        </div>

        <div class="field">
          <div class="label">Zona</div>
          <select class="input" v-model="filters.zone">
            <option value="">Barcha zonalar</option>
            <option v-for="z in zones" :key="z.id || z.name" :value="z.name">
              {{ z.name }}
            </option>
          </select>
        </div>

        <div class="field">
          <div class="label">Qidiruv</div>
          <input class="input" v-model.trim="filters.q" placeholder="Paket nomi..." @keydown.enter="applyFilters" />
        </div>

        <div class="field small">
          <div class="label">Ko'rsatish</div>
          <select class="input" v-model.number="filters.per_page">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>

        <button class="btn ghost" :disabled="loading" @click="resetFilters">Tozalash</button>
        <button class="btn primary" :disabled="loading" @click="applyFilters">Qo'llash</button>
      </div>

      <div class="mini-stats">
        <div class="mini">
          <div class="k">Jami</div>
          <div class="v">{{ total }}</div>
        </div>
        <div class="mini">
          <div class="k">Faol</div>
          <div class="v">{{ activeCount }}</div>
        </div>
        <div class="mini">
          <div class="k">O'chirilgan</div>
          <div class="v">{{ Math.max(0, total - activeCount) }}</div>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="glass card">
      <div class="row between">
        <div>
          <div class="card-h">Paketlar ro'yxati</div>
          <div class="hint">Har bir paketda zona, davomiylik va narx saqlanadi.</div>
        </div>

        <div class="pager" v-if="pages > 1">
          <button class="btn ghost" :disabled="loading || page<=1" @click="goto(page-1)">←</button>
          <div class="pill muted">{{ page }} / {{ pages }}</div>
          <button class="btn ghost" :disabled="loading || page>=pages" @click="goto(page+1)">→</button>
        </div>
      </div>

      <div class="tbl" v-if="items.length">
        <div class="tbl-head">
          <div>Paket</div>
          <div>Zona</div>
          <div class="center">Daqiqa</div>
          <div class="right">Narx</div>
          <div class="center">Holat</div>
          <div class="right">Amallar</div>
        </div>

        <div v-for="p in filteredItems" :key="p.id" class="tbl-row">
          <div class="name">
            <div class="nm">{{ p.name }}</div>
            <div class="sm muted">
              ID: #{{ p.id }}
              <span v-if="p.created_at"> • Yaratilgan: {{ formatDT(p.created_at) }}</span>
            </div>
          </div>

          <div class="muted">{{ p.zone || '—' }}</div>

          <div class="center">
            <span class="pill muted">{{ Number(p.duration_min || 0) }}</span>
          </div>

          <div class="right">
            <b>{{ money(p.price) }}</b> <span class="muted">UZS</span>
          </div>

          <div class="center">
            <span class="pill" :class="p.is_active ? 'ok' : 'muted'">
                {{ p.is_active ? 'Faol' : "O'chirilgan" }}
            </span>
          </div>

          <div class="right actions">
            <button class="btn ghost" :disabled="loading" @click="openEdit(p)">Tahrirlash</button>
            <button
                class="btn"
                :class="p.is_active ? 'danger' : 'primary'"
                :disabled="loading"
                @click="toggle(p)"
            >
              {{ p.is_active ? "O'chirish" : 'Yoqish' }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty">
          Hozircha paketlar yo'q. Yangi paket qo'shing.
      </div>
    </div>

    <!-- Modal create/edit (UX: chap input + o'ng hisob-kitob) -->
    <div v-if="modal.open" class="overlay" @click.self="closeModal">
      <div class="mc-modal glass">
        <div class="mc-head">
          <div>
            <div class="mc-title">{{ modal.mode === 'create' ? "Yangi paket" : "Paketni tahrirlash" }}</div>
            <div class="mc-sub">Nom, zona, davomiylik va narxni kiriting.</div>
          </div>
          <button class="mc-x" @click="closeModal">×</button>
        </div>

        <div class="mc-grid">
          <!-- LEFT: inputs -->
          <div class="mc-card">
            <div class="mc-card-title">Asosiy ma'lumotlar</div>

            <div class="field">
              <div class="label">Paket nomi</div>
              <input class="mc-input" v-model.trim="form.name" placeholder="Masalan: 3 soat VIP" />
            </div>

            <div class="field" style="margin-top:10px">
              <div class="label">Zona</div>
              <select class="mc-input" v-model="form.zone">
                <option value="" disabled>Zona tanlang</option>
                <option v-for="z in zones" :key="z.id || z.name" :value="z.name">
                  {{ z.name }}
                </option>
              </select>
            </div>

            <div class="field" style="margin-top:10px">
              <div class="label">Davomiylik (daqiqa)</div>
              <input class="mc-input" type="number" min="1" v-model.number="form.duration_min" />
              <div class="mc-chips">
                <button class="mc-chip" type="button" @click="setDuration(30)">30</button>
                <button class="mc-chip" type="button" @click="setDuration(60)">60</button>
                <button class="mc-chip" type="button" @click="setDuration(90)">90</button>
                <button class="mc-chip" type="button" @click="setDuration(120)">120</button>
                <button class="mc-chip" type="button" @click="setDuration(180)">180</button>
                <button class="mc-chip" type="button" @click="setDuration(240)">240</button>
              </div>
              <div class="mc-hint">Tez tanlash uchun ommabop qiymatlar.</div>
            </div>

            <div class="field" style="margin-top:10px">
              <div class="label">Narx (UZS)</div>
              <input class="mc-input" type="number" min="0" v-model.number="form.price" />
              <div class="mc-chips">
                <button class="mc-chip" type="button" @click="addPrice(5000)">+ 5 000</button>
                <button class="mc-chip" type="button" @click="addPrice(10000)">+ 10 000</button>
                <button class="mc-chip" type="button" @click="addPrice(20000)">+ 20 000</button>
                <button class="mc-chip" type="button" @click="addPrice(50000)">+ 50 000</button>
              </div>
              <div class="mc-hint">Chip orqali narxga tez qo'shish mumkin.</div>
            </div>

            <label class="mc-check" style="margin-top:10px">
              <input type="checkbox" v-model="form.is_active" />
              <span>Faol</span>
            </label>
          </div>

          <!-- RIGHT: preview/analytics -->
          <div class="mc-card">
            <div class="mc-card-title">Oldindan ko'rish</div>

            <div class="mc-summary">
              <div class="mc-summary-row">
                <div class="muted">Paket</div>
                <div><b>{{ form.name || '—' }}</b></div>
              </div>

              <div class="mc-summary-row">
                <div class="muted">Zona</div>
                <div><b>{{ form.zone || '—' }}</b></div>
              </div>

              <div class="mc-divider"></div>

              <div class="mc-summary-row">
                <div class="muted">Daqiqa</div>
                <div><b>{{ safeInt(form.duration_min) }}</b></div>
              </div>

              <div class="mc-summary-row">
                <div class="muted">Soat</div>
                <div><b>{{ hoursText }}</b></div>
              </div>

              <div class="mc-divider"></div>

              <div class="mc-summary-row">
                <div class="muted">Narx</div>
                <div><b>{{ money(form.price) }}</b> <span class="muted">UZS</span></div>
              </div>

              <div class="mc-summary-row">
                <div class="muted">1 soat narxi</div>
                <div><b>{{ money(perHour) }}</b> <span class="muted">UZS</span></div>
              </div>

              <div class="mc-summary-row">
                <div class="muted">1 daqiqa narxi</div>
                <div><b>{{ money(perMin) }}</b> <span class="muted">UZS</span></div>
              </div>

              <div class="mc-hint" style="margin-top:10px">
                Bu hisob operatorga tez baholash uchun ko'rsatiladi.
              </div>
            </div>

            <div v-if="modal.error" class="mc-error">{{ modal.error }}</div>

            <div class="mc-actions">
              <button class="mc-btn ghost" :disabled="loading" @click="closeModal">Bekor qilish</button>
              <button class="mc-btn primary" :disabled="loading" @click="save">
                {{ modal.mode === 'create' ? 'Yaratish' : 'Saqlash' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { cpApi } from '../../api/cp'

const loading = ref(false)

const items = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)

const zones = ref([])

const filters = reactive({
  active: '',
  zone: '',
  q: '',
  per_page: 20,
})

const pages = computed(() => {
  const p = Math.ceil((total.value || 0) / (perPage.value || 1))
  return p || 1
})

const activeCount = computed(() => items.value.filter(x => !!x.is_active).length)

const filteredItems = computed(() => {
  const q = (filters.q || '').toLowerCase()
  if (!q) return items.value
  return items.value.filter(x => (x.name || '').toLowerCase().includes(q))
})

const modal = reactive({
  open: false,
  mode: 'create', // create | edit
  id: null,
  error: '',
})

const form = reactive({
  name: '',
  duration_min: 60,
  price: 0,
  zone: '',
  is_active: true,
})

function safeInt(v) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

function money(v) {
  const n = Number(v || 0)
  return new Intl.NumberFormat('ru-RU').format(n)
}

function formatDT(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return String(dt)
  return d.toLocaleString('ru-RU', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

/* Preview computations */
const hours = computed(() => {
  const m = safeInt(form.duration_min)
  return m > 0 ? m / 60 : 0
})
const hoursText = computed(() => {
  const h = hours.value
  if (!h) return '—'
  // 1.5 kabi chiqishi mumkin
  return String(Math.round(h * 100) / 100)
})
const perHour = computed(() => {
  const h = hours.value
  const price = Number(form.price || 0)
  if (!h || h <= 0) return 0
  return Math.round(price / h)
})
const perMin = computed(() => {
  const m = safeInt(form.duration_min)
  const price = Number(form.price || 0)
  if (!m || m <= 0) return 0
  return Math.round(price / m)
})

/* Chips helpers */
function setDuration(m) {
  form.duration_min = Number(m || 0)
}
function addPrice(v) {
  form.price = Number(form.price || 0) + Number(v || 0)
}

function resetForm() {
  form.name = ''
  form.duration_min = 60
  form.price = 0
  form.zone = zones.value?.[0]?.name || ''
  form.is_active = true
}

function fillForm(p) {
  form.name = p?.name || ''
  form.duration_min = Number(p?.duration_min || 60)
  form.price = Number(p?.price || 0)
  form.zone = p?.zone || ''
  form.is_active = !!p?.is_active
}

function openCreate() {
  modal.error = ''
  modal.mode = 'create'
  modal.id = null
  resetForm()
  modal.open = true
}

function openEdit(p) {
  modal.error = ''
  modal.mode = 'edit'
  modal.id = p.id
  fillForm(p)
  modal.open = true
}

function closeModal() {
  modal.open = false
  modal.error = ''
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

function goto(p) {
  page.value = Math.max(1, Math.min(p, pages.value))
  reload()
}

/* Robust payload unpacker */
function unpackListPayload(respData) {
  const payload = respData?.data ?? respData ?? null

  if (Array.isArray(payload)) {
    return { list: payload, total: payload.length }
  }
  if (Array.isArray(payload?.data?.data)) {
    return { list: payload.data.data, total: Number(payload?.data?.total ?? payload?.total ?? payload.data.data.length) }
  }
  if (Array.isArray(payload?.data)) {
    return { list: payload.data, total: Number(payload?.total ?? payload?.meta?.total ?? payload.data.length) }
  }
  return { list: [], total: 0 }
}

async function fetchZonesSafe() {
  try {
    const r = await cpApi.zonesList()
    const payload = r?.data?.data ?? r?.data ?? null
    const list =
        Array.isArray(payload?.data) ? payload.data :
            (Array.isArray(payload) ? payload :
                (Array.isArray(payload?.data?.data) ? payload.data.data : []))
    zones.value = Array.isArray(list) ? list : []
  } catch (_) {
    zones.value = []
  }
}

async function reload() {
  loading.value = true
  try {
    perPage.value = Number(filters.per_page || 20)

    const params = { page: page.value, per_page: perPage.value }
    // MUHIM: bo'sh qiymatlarni yubormaymiz!
    if (filters.active !== '') params.active = filters.active
    if (filters.zone) params.zone = filters.zone
    if (filters.q) params.q = filters.q

    const r = await cpApi.packagesList(params)
    const { list, total: t } = unpackListPayload(r?.data)

    items.value = list
    total.value = t
  } catch (_) {
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function buildPayload() {
  return {
    name: form.name,
    duration_min: Number(form.duration_min || 0),
    price: Number(form.price || 0),
    zone: form.zone,
    is_active: !!form.is_active,
  }
}

async function save() {
  modal.error = ''

  if (!form.name || form.name.length < 2) {
    modal.error = "Paket nomi kamida 2 ta belgidan iborat bo'lishi kerak."
    return
  }
  if (!form.zone) {
    modal.error = 'Zona tanlang.'
    return
  }
  if (Number(form.duration_min || 0) <= 0) {
    modal.error = "Davomiylik 0 dan katta bo'lishi kerak."
    return
  }

  loading.value = true
  try {
    const payload = buildPayload()

    if (modal.mode === 'create') {
      await cpApi.packagesCreate(payload)
    } else {
      await cpApi.packagesUpdate(modal.id, payload)
    }

    closeModal()
    await reload()
  } catch (e) {
    const msg = e?.response?.data?.message
    const errors = e?.response?.data?.errors
    modal.error = msg || (errors ? Object.values(errors).flat().join(' ') : "Saqlashda xatolik yuz berdi.")
  } finally {
    loading.value = false
  }
}

async function toggle(p) {
  loading.value = true
  try {
    await cpApi.packagesToggle(p.id)
    await reload()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchZonesSafe()
  if (!form.zone && zones.value.length) form.zone = zones.value[0].name
  await reload()
})

watch(zones, () => {
  if (modal.open && !form.zone && zones.value.length) {
    form.zone = zones.value[0]?.name || ''
  }
})
</script>

<style scoped>
.cp-page { display:flex; flex-direction:column; gap:14px; }
.glass { border-radius:16px; border:1px solid rgba(255,255,255,0.08); background:rgba(8,14,26,0.45); box-shadow:0 10px 30px rgba(0,0,0,0.25); backdrop-filter:blur(14px); }
.cp-head { padding:18px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.cp-title { font-weight:700; font-size:18px; color:rgba(255,255,255,0.92); }
.cp-sub { margin-top:4px; font-size:12px; color:rgba(255,255,255,0.55); }
.cp-head-actions { display:flex; gap:10px; }

.card { padding:14px 14px 12px; }
.card-h { font-size:12px; color:rgba(255,255,255,0.6); margin-bottom:8px; }

.row{ display:flex; align-items:center; }
.between{ justify-content:space-between; }

.btn{ height:34px; padding:0 12px; border-radius:12px; font-size:12px; font-weight:900; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.9); cursor:pointer; }
.btn:disabled{ opacity:0.6; cursor:not-allowed; }
.btn.ghost{ background:rgba(255,255,255,0.04); }
.btn.primary{ background:rgba(55,140,255,0.35); border-color:rgba(55,140,255,0.35); }
.btn.danger{ background:rgba(255,75,75,0.25); border-color:rgba(255,75,75,0.35); }

.pill{ padding:6px 10px; border-radius:999px; font-size:12px; font-weight:800; border:1px solid rgba(255,255,255,0.10); }
.pill.ok{ background:rgba(14,180,126,0.16); color:rgba(175,255,230,0.9); border-color:rgba(14,180,126,0.25); }
.pill.muted{ background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.75); }

.hint{ font-size:12px; color:rgba(255,255,255,0.55); }
.muted{ color:rgba(255,255,255,0.55); }

.filters{
  display:grid;
  grid-template-columns: 160px 220px 1fr 120px auto auto;
  gap:12px;
  align-items:end;
}
@media (max-width: 1100px){
  .filters{ grid-template-columns: 1fr; }
}
.field.small{ width: 140px; }
.label{ margin-bottom:6px; font-size:12px; color:rgba(255,255,255,0.7); font-weight:900; }
.input{
  width:100%;
  height:42px;
  border-radius:12px;
  padding:0 12px;
  outline:none;
  border:1px solid rgba(255,255,255,0.10);
  background:rgba(0,0,0,0.18);
  color:rgba(255,255,255,0.92);
  font-weight:800;
}

.mini-stats{
  margin-top:12px;
  display:grid;
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap:10px;
}
.mini{
  border-radius:12px;
  border:1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.14);
  padding:10px 12px;
}
.mini .k{ font-size:12px; color:rgba(255,255,255,0.55); font-weight:900; }
.mini .v{ margin-top:4px; font-size:16px; color:rgba(255,255,255,0.92); font-weight:900; }

.tbl{ margin-top:10px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); overflow:hidden; }
.tbl-head,.tbl-row{
  display:grid;
  grid-template-columns: 1.4fr 1fr 120px 160px 130px 260px;
  gap:10px;
  padding:10px 12px;
  font-size:12px;
  align-items:center;
}
@media (max-width: 1100px){
  .tbl-head,.tbl-row{ grid-template-columns: 1fr; }
}
.tbl-head{ background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.7); font-weight:900; }
.tbl-row{ border-top:1px solid rgba(255,255,255,0.06); color:rgba(255,255,255,0.86); }

.name .nm{ font-weight:900; color:rgba(255,255,255,0.92); }
.name .sm{ margin-top:4px; font-size:12px; }
.center{ text-align:center; }
.right{ text-align:right; }
.actions{ display:flex; justify-content:flex-end; gap:10px; }
@media (max-width: 1100px){
  .actions{ justify-content:flex-start; flex-wrap:wrap; }
  .right,.center{ text-align:left; }
}

.empty{ margin-top:10px; padding:16px; border-radius:12px; border:1px dashed rgba(255,255,255,0.10); color:rgba(255,255,255,0.6); font-size:12px; }
.pager{ display:flex; align-items:center; gap:10px; }

.overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.55); backdrop-filter:blur(6px); display:grid; place-items:center; z-index:50; padding:16px; }

/* Modal UX (topup-style) */
.mc-modal{ width:min(980px, 96vw); padding:18px; border-radius:18px; }
.mc-head{
  display:flex; justify-content:space-between; align-items:flex-start;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.mc-title{ font-size: 18px; font-weight: 800; color: rgba(255,255,255,.92); }
.mc-sub{ margin-top: 4px; font-size: 12px; color: rgba(255,255,255,.55); }
.mc-x{
  width:36px; height:36px;
  border-radius: 10px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.85);
  cursor:pointer;
}

.mc-grid{
  margin-top: 14px;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 900px){
  .mc-grid{ grid-template-columns: 1fr; }
}
.mc-card{
  border-radius: 16px;
  padding: 14px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  overflow:hidden;
}
.mc-card-title{ font-size: 12px; opacity: .8; margin-bottom: 10px; font-weight: 900; }

.mc-input{
  width:100%;
  border-radius: 14px;
  padding: 12px 14px;
  outline:none;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.20);
  color: rgba(255,255,255,.92);
  font-size: 14px;
  box-sizing: border-box;
}

.mc-chips{ margin-top: 10px; display:flex; gap:8px; flex-wrap:wrap; }
.mc-chip{
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.88);
  cursor:pointer;
  font-weight: 900;
  font-size: 12px;
}
.mc-hint{ margin-top: 8px; font-size: 12px; opacity: .6; }

.mc-check{
  display:flex; align-items:center; gap:10px;
  font-size:12px; font-weight:900;
  color: rgba(255,255,255,.85);
}
.mc-check input{ width:16px; height:16px; }

.mc-summary{
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.07);
}
.mc-summary-row{
  display:flex; align-items:center; justify-content:space-between;
  gap:12px;
  padding: 6px 0;
}
.mc-divider{
  height:1px;
  background: rgba(255,255,255,.06);
  margin: 8px 0;
}

.mc-actions{
  margin-top: 12px;
  display:flex;
  justify-content:flex-end;
  gap: 10px;
}
.mc-btn{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  cursor:pointer;
  font-weight: 900;
  font-size: 12px;
}
.mc-btn.ghost{
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.85);
}
.mc-btn.primary{
  background: rgba(59,130,246,.95);
  border-color: rgba(59,130,246,.95);
  color: #07101f;
}
.mc-btn:disabled{ opacity:.55; cursor:not-allowed; }

.mc-error{
  margin-top: 10px;
  font-size: 12px;
  color: rgba(239,68,68,.95);
}
</style>

