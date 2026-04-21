<template>
  <div class="cp-page">
    <!-- Guard -->
    <div v-if="!canAccess" class="glass card">
      <div class="cp-title">Obuna tariflari</div>
      <div class="cp-sub">Bo'lim faqat admin yoki owner uchun ochiq.</div>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="cp-head glass">
        <div>
          <div class="cp-title">Obuna tariflari</div>
          <div class="cp-sub">Zona bo'yicha obuna tariflarini boshqaring.</div>
        </div>

        <div class="cp-head-actions">
          <button class="btn ghost" :disabled="loading" @click="reload">Yangilash</button>
          <button class="btn primary" :disabled="loading" @click="openCreate">Tarif qo'shish</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="glass card">
        <div class="row between">
          <div>
            <div class="card-h">Filtrlar</div>
            <div class="hint">Nom, zona va holat bo'yicha qidiring.</div>
          </div>
        </div>

        <div class="filters">
          <div class="field">
            <div class="label">Qidiruv</div>
            <input class="input" v-model.trim="filters.q" placeholder=": VIP" @keydown.enter="applyFilters" />
          </div>

          <div class="field">
            <div class="label">Zona</div>
            <select class="input" v-model="filters.zone_id">
              <option value="">Barcha zonalar</option>
              <option v-for="z in zones" :key="z.id" :value="String(z.id)">{{ z.name }}</option>
            </select>
          </div>

          <div class="field">
            <div class="label">Holat</div>
            <select class="input" v-model="filters.active">
              <option value="">Barchasi</option>
              <option value="true">Faol</option>
              <option value="false">O'chirilgan</option>
            </select>
          </div>

          <div class="field">
            <div class="label">Ko'rsatish</div>
            <select class="input" v-model.number="filters.per_page">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>

          <button class="btn ghost" :disabled="loading" @click="applyFilters">Qo'llash</button>
        </div>
      </div>

      <!-- Table -->
      <div class="glass card">
        <div class="row between">
          <div>
            <div class="card-h">Tariflar ro'yxati</div>
            <div class="hint">Zona, davomiylik va narx asosida obunalarni boshqaring.</div>
          </div>

          <div class="pager" v-if="pages > 1">
            <button class="btn ghost" :disabled="loading || page<=1" @click="goto(page-1)">←</button>
            <div class="pill muted">{{ page }} / {{ pages }}</div>
            <button class="btn ghost" :disabled="loading || page>=pages" @click="goto(page+1)">→</button>
          </div>
        </div>

        <div v-if="items.length" class="tbl">
          <div class="tbl-head">
            <div>Tarif</div>
            <div>Zona</div>
            <div class="center">Davomiylik</div>
            <div class="right">Narx</div>
            <div class="center">Holat</div>
            <div class="right">Amallar</div>
          </div>

          <div v-for="p in items" :key="p.id" class="tbl-row">
            <div class="name">
              <div class="nm">{{ p.name }}</div>
              <div class="sm muted">ID: {{ p.id }}</div>
            </div>

            <div class="muted">{{ p.zone?.name || findZoneName(p.zone_id) }}</div>

            <div class="center">
              <span class="pill muted">{{ p.duration_days }} kun</span>
            </div>

            <div class="right">
              <span class="pill muted">{{ money(p.price) }} UZS</span>
            </div>

            <div class="center">
              <span class="pill" :class="p.is_active ? 'ok' : 'muted'">
                {{ p.is_active ? 'Faol' : "O'chirilgan" }}
              </span>
            </div>

            <div class="right actions">
              <button class="btn ghost" :disabled="loading" @click="openEdit(p)">Tahrirlash</button>
              <button class="btn" :class="p.is_active ? 'danger' : 'primary'" :disabled="loading" @click="toggle(p)">
                {{ p.is_active ? "O'chirish" : 'Yoqish' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty">
          Hozircha obuna tarifi yo'q. Yangi tarif qo'shing.
        </div>
      </div>

      <!-- Modal -->
      <div v-if="modal.open" class="overlay" @click.self="closeModal">
        <div class="modal glass modal-wide">
          <div class="modal-h">
            <div>
              <div class="modal-title">{{ modal.mode === 'create' ? "Yangi tarif" : "Tarifni tahrirlash" }}</div>
              <div class="modal-sub">Nom, zona, davomiylik va narxni kiriting.</div>
            </div>
            <button class="icon-btn" @click="closeModal">×</button>
          </div>

          <div class="form-grid">
            <div class="block">
              <div class="block-h">Asosiy ma'lumotlar</div>

              <div class="field">
                <div class="label">Tarif nomi</div>
                <input class="input" v-model.trim="form.name" placeholder="Masalan: VIP 1 oy" />
              </div>

              <div class="field">
                <div class="label">Zona</div>
                <select class="input" v-model.number="form.zone_id">
                  <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.name }}</option>
                </select>
              </div>

              <div class="row gap">
                <div class="field">
                  <div class="label">Davomiylik (kun)</div>
                  <input class="input" type="number" min="1" max="3650" v-model.number="form.duration_days" />
                </div>

                <div class="field">
                  <div class="label">Narx (UZS)</div>
                  <input class="input" type="number" min="0" v-model.number="form.price" />
                </div>
              </div>

              <label class="check" style="margin-top:10px">
                <input type="checkbox" v-model="form.is_active" />
                  <span>Faol</span>
              </label>
            </div>

            <div class="block">
              <div class="block-h">Izoh</div>
              <div class="info-box">
                <div class="info-title">Qanday ishlaydi</div>
                <div class="info-text">
                  Mijoz tanlangan zona uchun N kunlik obunani sotib oladi.
                  Faol obuna tugamaguncha shu zonaga yana boshqa obuna berilmaydi.
                </div>
              </div>

              <div class="hint" style="margin-top:10px">
                Misol: VIP zona -> "VIP 1 oy" (30 kun).
              </div>
            </div>
          </div>

          <div v-if="modal.error" class="alert danger">{{ modal.error }}</div>

          <div class="modal-actions">
            <button class="btn ghost" :disabled="loading" @click="closeModal">Bekor qilish</button>
            <button class="btn primary" :disabled="loading" @click="save">
              {{ modal.mode === 'create' ? 'Yaratish' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import {computed, onMounted, reactive, ref} from 'vue'
import {cpApi} from '../../api/cp'
import {useCpAuthStore} from '../../stores/cpAuth'

const auth = useCpAuthStore()
const canAccess = computed(() => {
  const r = auth.operator?.role
  return r === 'admin' || r === 'owner'
})

const loading = ref(false)

const items = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)

const zones = ref([])

const filters = reactive({
  q: '',
  zone_id: '',
  active: '',
  per_page: 20,
})

const pages = computed(() => {
  const p = Math.ceil((total.value || 0) / (perPage.value || 1))
  return p || 1
})

const modal = reactive({
  open: false,
  mode: 'create',
  id: null,
  error: '',
})

const form = reactive({
  name: '',
  zone_id: 0,
  duration_days: 30,
  price: 0,
  is_active: true,
})

function money(v) {
  const n = Number(v || 0)
  return new Intl.NumberFormat('ru-RU').format(n)
}

function findZoneName(zoneId) {
  const z = zones.value.find(x => Number(x.id) === Number(zoneId))
  return z ? z.name : '—'
}

async function loadZones() {
  // Sizda zones API bor. Agar nomi boshqacha bo'lsa shu yerda moslashtiriladi.
  // Endpoint bo'lmasa ham sahifa yiqilmasligi uchun ehtiyotkor yozilgan.
  try {
    if (!cpApi?.zonesList()) return
    const r = await cpApi.zonesList({ per_page: 200, page: 1, active: 1 })
    zones.value = r?.data?.data ?? r?.data ?? {}
    if (!form.zone_id && zones.value.length) form.zone_id = zones.value[0].id
  } catch {
    zones.value = zones.value || []
  }
}

async function reload() {
  if (!canAccess.value) return
  loading.value = true
  try {
    perPage.value = Number(filters.per_page || 20)

    const params = { page: page.value, per_page: perPage.value }
    if (filters.q) params.q = filters.q
    if (filters.zone_id !== '') params.zone_id = filters.zone_id
    if (filters.active !== '') params.active = filters.active

    const r = await cpApi.subscriptionPlanList(params)
    const payload = r?.data?.data ?? r?.data ?? {}
    const list = Array.isArray(payload?.data) ? payload.data : []
    items.value = list
    total.value = Number(payload?.total ?? list.length ?? 0)
  } catch {
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  reload()
}

function goto(p) {
  page.value = Math.max(1, Math.min(p, pages.value))
  reload()
}

function openCreate() {
  modal.error = ''
  modal.open = true
  modal.mode = 'create'
  modal.id = null

  form.name = ''
  form.duration_days = 30
  form.price = 0
  form.is_active = true
  if (zones.value.length) form.zone_id = zones.value[0].id
}

function openEdit(p) {
  modal.error = ''
  modal.open = true
  modal.mode = 'edit'
  modal.id = p.id

  form.name = p?.name || ''
  form.zone_id = Number(p?.zone_id || p?.zone?.id || form.zone_id || 0)
  form.duration_days = Number(p?.duration_days || 30)
  form.price = Number(p?.price || 0)
  form.is_active = !!p?.is_active
}

function closeModal() {
  modal.open = false
  modal.error = ''
}

async function save() {
  modal.error = ''
  if (!form.name || form.name.length < 3) {
    modal.error = "Tarif nomi kamida 3 ta belgidan iborat bo'lishi kerak."
    return
  }
  if (!form.zone_id) {
    modal.error = 'Zona tanlang.'
    return
  }

  loading.value = true
  try {
    const payload = {
      name: form.name,
      zone_id: Number(form.zone_id),
      duration_days: Number(form.duration_days),
      price: Number(form.price),
      is_active: !!form.is_active,
    }

    if (modal.mode === 'create') {
      await cpApi.subscriptionPlanCreate(payload)
    } else {
      await cpApi.subscriptionPlanUpdate(modal.id, payload)
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
    await cpApi.subscriptionPlanToggle(p.id)
    await reload()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadZones()
  await reload()
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
.gap{ gap:12px; }

.btn{ height:34px; padding:0 12px; border-radius:12px; font-size:12px; font-weight:900; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.9); cursor:pointer; }
.btn:disabled{ opacity:0.6; cursor:not-allowed; }
.btn.ghost{ background:rgba(255,255,255,0.04); }
.btn.primary{ background:rgba(55,140,255,0.35); border-color:rgba(55,140,255,0.35); }
.btn.danger{ background:rgba(255,75,75,0.25); border-color:rgba(255,75,75,0.35); }

.filters{
  display:grid;
  grid-template-columns: 1fr 220px 180px 140px auto;
  gap:12px;
  align-items:end;
}
@media (max-width: 1000px){
  .filters{ grid-template-columns: 1fr; }
}

.field{ margin:0; }
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

.hint{ font-size:12px; color:rgba(255,255,255,0.55); }

.tbl{ margin-top:10px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); overflow:hidden; }
.tbl-head,.tbl-row{
  display:grid;
  grid-template-columns: 1.2fr 1fr 140px 200px 140px 280px;
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
.pill{ padding:6px 10px; border-radius:999px; font-size:12px; font-weight:800; border:1px solid rgba(255,255,255,0.10); }
.pill.ok{ background:rgba(14,180,126,0.16); color:rgba(175,255,230,0.9); border-color:rgba(14,180,126,0.25); }
.pill.muted{ background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.75); }

.overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.55); backdrop-filter:blur(6px); display:grid; place-items:center; z-index:50; padding:16px; }
.modal{ width:min(560px,95vw); padding:14px; }
.modal-wide{ width:min(980px,96vw); }
.modal-h{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:12px; }
.modal-title{ font-size:14px; font-weight:900; color:rgba(255,255,255,0.92); }
.modal-sub{ margin-top:4px; font-size:12px; color:rgba(255,255,255,0.55); }
.icon-btn{ width:34px; height:34px; border-radius:12px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9); cursor:pointer; }

.form-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
@media (max-width: 980px){ .form-grid{ grid-template-columns: 1fr; } }
.block{ border-radius:14px; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.12); padding:12px; }
.block-h{ font-size:12px; color:rgba(255,255,255,0.75); font-weight:900; margin-bottom:10px; }

.info-box{ margin-top:10px; padding:12px; border-radius:12px; border:1px solid rgba(88,160,255,0.20); background:rgba(40,110,220,0.12); }
.info-title{ font-weight:900; font-size:12px; color:rgba(255,255,255,0.9); }
.info-text{ margin-top:6px; font-size:12px; color:rgba(255,255,255,0.7); }

.check{ display:flex; align-items:center; gap:10px; font-size:12px; color:rgba(255,255,255,0.85); font-weight:900; }
.check input{ width:16px; height:16px; }

.alert{ margin-top:10px; padding:10px 12px; border-radius:12px; font-size:12px; border:1px solid rgba(255,255,255,0.10); }
.alert.danger{ border-color:rgba(255,75,75,0.35); background:rgba(255,75,75,0.12); color:rgba(255,255,255,0.9); }

.modal-actions{ display:flex; justify-content:flex-end; gap:10px; margin-top:14px; }
</style>

