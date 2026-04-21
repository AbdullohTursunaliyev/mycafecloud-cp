<!-- src/pages/cp/Promotions.vue -->
<template>
  <div class="cp-page">
    <!-- Guard -->
    <div v-if="!canAccess" class="glass card">
      <div class="cp-title">Aksiyalar</div>
      <div class="cp-sub">Bo'lim faqat admin yoki owner uchun ochiq.</div>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="cp-head glass">
        <div>
          <div class="cp-title">Aksiyalar</div>
          <div class="cp-sub">
            Top-up aksiyalarini boshqarish. Hozir 2x turi ishlaydi: <b>bonus = summa</b>.
          </div>
        </div>

        <div class="cp-head-actions">
          <button class="btn ghost" :disabled="loading" @click="reload">Yangilash</button>
          <button class="btn primary" :disabled="loading" @click="openCreate">Aksiya qo'shish</button>
        </div>
      </div>

      <!-- Filters + quick stats -->
      <div class="grid top-grid">
        <div class="glass card">
          <div class="card-h">Filtrlar</div>

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
              <div class="label">Qidiruv</div>
              <input class="input" v-model.trim="filters.q" placeholder="Aksiya nomi..." />
            </div>

            <div class="field">
              <div class="label">Ko'rsatish</div>
              <select class="input" v-model.number="filters.per_page">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
            </div>

            <button class="btn ghost" :disabled="loading" @click="applyFilters">Qo'llash</button>
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
              <div class="v">{{ total - activeCount }}</div>
            </div>
          </div>
        </div>

        <div class="glass card">
          <div class="card-h">Qanday ishlaydi</div>
          <div class="info-box">
            <div class="info-title">2x aksiya (naqd)</div>
            <div class="info-text">
              Agar aksiya faol bo'lsa va vaqt oralig'iga tushsa, naqd top-up
              vaqtida <b>bonus = amount</b> avtomatik qo'llanadi.
              Karta to'lovlari bu aksiya ichiga kirmaydi.
            </div>
          </div>
          <div class="hint" style="margin-top:10px">
            Muhim: aksiyalarni faqat admin yoki owner boshqaradi.
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="glass card">
        <div class="row between">
          <div>
            <div class="card-h">Aksiyalar ro'yxati</div>
            <div class="hint">Jadval, prioritet va holatni boshqaring.</div>
          </div>

          <div class="pager" v-if="pages > 1">
            <button class="btn ghost" :disabled="loading || page<=1" @click="goto(page-1)">←</button>
            <div class="pill muted">{{ page }} / {{ pages }}</div>
            <button class="btn ghost" :disabled="loading || page>=pages" @click="goto(page+1)">→</button>
          </div>
        </div>

        <div class="tbl" v-if="items.length">
          <div class="tbl-head">
            <div>Aksiya</div>
            <div>Jadval</div>
            <div class="center">To'lov turi</div>
            <div class="center">Prioritet</div>
            <div class="center">Holat</div>
            <div class="right">Amallar</div>
          </div>

          <div v-for="p in filteredItems" :key="p.id" class="tbl-row">
            <div class="name">
              <div class="nm">{{ p.name }}</div>
              <div class="sm muted">
                Turi: {{ normalizeType(p.type) }}
                <span v-if="p.starts_at || p.ends_at"> • Davr: {{ formatPeriod(p) }}</span>
              </div>
            </div>

            <div class="muted">
              {{ formatSchedule(p) }}
            </div>

            <div class="center">
              <span class="tag">{{ p.applies_payment_method || 'cash' }}</span>
            </div>

            <div class="center">
              <span class="pill muted">{{ p.priority ?? 100 }}</span>
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
          Hozircha aksiya yo'q. Yangi aksiya qo'shing.
        </div>
      </div>

      <!-- Modal -->
      <div v-if="modal.open" class="overlay" @click.self="closeModal">
        <div class="modal glass modal-wide">
          <div class="modal-h">
            <div>
              <div class="modal-title">{{ modal.mode === 'create' ? "Yangi aksiya" : "Aksiyani tahrirlash" }}</div>
              <div class="modal-sub">Nom, jadval va faol holatini sozlang.</div>
            </div>
            <button class="icon-btn" @click="closeModal">×</button>
          </div>

          <div class="form-grid">
            <div class="block">
              <div class="block-h">Asosiy sozlamalar</div>

              <div class="field">
                <div class="label">Aksiya nomi</div>
                <input class="input" v-model.trim="form.name" placeholder="Masalan: Juma 2x" />
              </div>

              <div class="field">
                <div class="label">Turi</div>
                <select class="input" v-model="form.type" disabled>
                  <option value="double_topup">2x (bonus = )</option>
                </select>
                <div class="help">    2x.</div>
              </div>

              <div class="field">
                <div class="label">To'lov turi</div>
                <select class="input" v-model="form.applies_payment_method" disabled>
                  <option value="cash"> (cash)</option>
                </select>
                <div class="help">     .</div>
              </div>

              <div class="row gap-sm" style="margin-top:10px">
                <label class="check">
                  <input type="checkbox" v-model="form.is_active" />
                  <span>Faol</span>
                </label>

                <div style="flex:1"></div>

                <div class="field compact">
                  <div class="label">Prioritet</div>
                  <input class="input" type="number" min="0" v-model.number="form.priority" />
                </div>
              </div>
            </div>

            <div class="block">
              <div class="block-h">Jadval</div>

              <div class="field">
                <div class="label">Hafta kunlari</div>
                <div class="days">
                  <button
                      v-for="d in days"
                      :key="d.v"
                      class="day"
                      :class="{ active: form.days_of_week.includes(d.v) }"
                      @click="toggleDay(d.v)"
                      type="button"
                  >
                    {{ d.t }}
                  </button>
                </div>
                <div class="help">Bo'sh qoldirilsa har kuni ishlaydi.</div>
              </div>

              <div class="row gap">
                <div class="field">
                  <div class="label">Vaqt dan</div>
                  <input class="input" type="time" v-model="form.time_from" />
                </div>
                <div class="field">
                  <div class="label">Vaqt gacha</div>
                  <input class="input" type="time" v-model="form.time_to" />
                </div>
              </div>
              <div class="help">Vaqt oralig'i 00:00-23:59 ko'rinishida olinadi.</div>

              <div class="row gap" style="margin-top:10px">
                <div class="field">
                  <div class="label">Boshlanish sanasi</div>
                  <input class="input" type="date" v-model="form.starts_at" />
                </div>
                <div class="field">
                  <div class="label">Tugash sanasi</div>
                  <input class="input" type="date" v-model="form.ends_at" />
                </div>
              </div>
              <div class="help">Sanalar bo'sh bo'lsa, cheklanmagan davr ishlaydi.</div>
            </div>
          </div>

          <div v-if="modal.error" class="alert danger">
            {{ modal.error }}
          </div>

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
import { computed, onMounted, reactive, ref } from 'vue'
import { cpApi } from '../../api/cp'
import { useCpAuthStore } from '../../stores/cpAuth'

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

const filters = reactive({
  active: '',
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

const days = [
  { v: 1, t: 'Du' },
  { v: 2, t: 'Se' },
  { v: 3, t: 'Cho' },
  { v: 4, t: 'Pa' },
  { v: 5, t: 'Ju' },
  { v: 6, t: 'Sha' },
  { v: 0, t: 'Yak' },
]

const modal = reactive({
  open: false,
  mode: 'create', // create | edit
  id: null,
  error: '',
})

const form = reactive({
  name: '',
  type: 'double_topup',
  applies_payment_method: 'cash',
  is_active: true,
  priority: 100,
  days_of_week: [],
  time_from: '',
  time_to: '',
  starts_at: '',
  ends_at: '',
})

function resetForm() {
  form.name = ''
  form.type = 'double_topup'
  form.applies_payment_method = 'cash'
  form.is_active = true
  form.priority = 100
  form.days_of_week = []
  form.time_from = ''
  form.time_to = ''
  form.starts_at = ''
  form.ends_at = ''
}

function fillForm(p) {
  form.name = p?.name ?? ''
  form.type = p?.type ?? 'double_topup'
  form.applies_payment_method = p?.applies_payment_method ?? 'cash'
  form.is_active = !!p?.is_active
  form.priority = Number(p?.priority ?? 100)
  form.days_of_week = Array.isArray(p?.days_of_week) ? [...p.days_of_week] : []
  form.time_from = p?.time_from ?? ''
  form.time_to = p?.time_to ?? ''
  form.starts_at = p?.starts_at ?? ''
  form.ends_at = p?.ends_at ?? ''
}

function toggleDay(v) {
  const idx = form.days_of_week.indexOf(v)
  if (idx >= 0) form.days_of_week.splice(idx, 1)
  else form.days_of_week.push(v)
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

function normalizeType(t) {
  if (t === 'double_topup') return '2x'
  return t || '—'
}

function formatPeriod(p) {
  const a = p.starts_at ? String(p.starts_at) : ''
  const b = p.ends_at ? String(p.ends_at) : ''
  if (a && b) return `${a} — ${b}`
  if (a) return `dan ${a}`
  if (b) return `gacha ${b}`
  return '—'
}

function mapDow(v) {
  const m = { 1:'Du',2:'Se',3:'Cho',4:'Pa',5:'Ju',6:'Sha',0:'Yak' }
  return m[v] ?? String(v)
}

function formatSchedule(p) {
  const dow = Array.isArray(p.days_of_week) ? p.days_of_week : []
  const daysText = dow.length ? dow.map(mapDow).join(', ') : 'Har kuni'
  const tf = p.time_from || '00:00'
  const tt = p.time_to || '23:59'
  return `${daysText} • ${tf}-${tt}`
}

function applyFilters() {
  page.value = 1
  reload()
}

function goto(p) {
  page.value = Math.max(1, Math.min(p, pages.value))
  reload()
}

function buildPayload() {
  return {
    name: form.name,
    type: 'double_topup',
    applies_payment_method: 'cash',
    is_active: !!form.is_active,
    priority: Number(form.priority ?? 100),
    days_of_week: form.days_of_week.length ? form.days_of_week.slice().sort() : [],
    time_from: form.time_from || null,
    time_to: form.time_to || null,
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
  }
}

/**
 * ✅ FIX: parsingni soddalashtirdim va `??` + `||` aralashmasini yo'q qildim.
 * Bu Vite/Vue compiler xatosini 100% yo'q qiladi.
 */
async function reload() {
  if (!canAccess.value) return
  loading.value = true
  try {
    perPage.value = Number(filters.per_page || 20)

    const params = {
      page: page.value,
      per_page: perPage.value,
    }
    if (filters.active !== '') params.active = filters.active

    const r = await cpApi.promotionList(params)

    // payloadni normalizatsiya qilamiz:
    // 1) { data: { data: [], total, ... } } (Laravel paginate)
    // 2) { data: [] } (oddiy)
    // 3) { data: { items: [] } } (ba'zi formatlar)
    const raw = r?.data ?? {}
    const root = Object.prototype.hasOwnProperty.call(raw, 'data') ? (raw.data ?? raw) : raw

    // paginate object bo'lishi mumkin
    // pag.data -> list
    const pag = root

    let list = []
    if (Array.isArray(pag?.data)) list = pag.data
    else if (Array.isArray(pag?.data?.data)) list = pag.data.data
    else if (Array.isArray(pag?.items)) list = pag.items
    else if (Array.isArray(pag?.data?.items)) list = pag.data.items

    items.value = list

    // total
    const t =
        (pag?.total ?? pag?.meta?.total ?? pag?.data?.total ?? pag?.data?.meta?.total)

    total.value = Number(t != null ? t : items.value.length)
  } catch (e) {
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function save() {
  modal.error = ''
  if (!form.name || form.name.length < 3) {
    modal.error = '    3 .'
    return
  }

  loading.value = true
  try {
    const payload = buildPayload()

    if (modal.mode === 'create') {
      await cpApi.promotionCreate(payload)
    } else {
      await cpApi.promotionUpdate(modal.id, payload)
    }

    closeModal()
    await reload()
  } catch (e) {
    const msg = e?.response?.data?.message
    const errors = e?.response?.data?.errors
    modal.error = msg || (errors ? Object.values(errors).flat().join(' ') : ' ')
  } finally {
    loading.value = false
  }
}

async function toggle(p) {
  loading.value = true
  try {
    await cpApi.promotionToggle(p.id)
    await reload()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  reload()
})
</script>

<style scoped>
/* Siz bergan style 100% o'z holicha */
.cp-page { display:flex; flex-direction:column; gap:14px; }
.glass { border-radius:16px; border:1px solid rgba(255,255,255,0.08); background:rgba(8,14,26,0.45); box-shadow:0 10px 30px rgba(0,0,0,0.25); backdrop-filter:blur(14px); }
.cp-head { padding:18px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.cp-title { font-weight:700; font-size:18px; color:rgba(255,255,255,0.92); }
.cp-sub { margin-top:4px; font-size:12px; color:rgba(255,255,255,0.55); }
.cp-head-actions { display:flex; gap:10px; }

.grid { display:grid; gap:14px; }
.top-grid { grid-template-columns: 1.2fr 0.8fr; }
@media (max-width: 1100px){ .top-grid{ grid-template-columns: 1fr; } }

.card { padding:14px 14px 12px; }
.card-h { font-size:12px; color:rgba(255,255,255,0.6); margin-bottom:8px; }

.row{ display:flex; align-items:center; }
.between{ justify-content:space-between; }
.gap-sm{ gap:8px; }
.gap{ gap:12px; }

.btn{ height:34px; padding:0 12px; border-radius:12px; font-size:12px; font-weight:900; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.9); cursor:pointer; }
.btn:disabled{ opacity:0.6; cursor:not-allowed; }
.btn.ghost{ background:rgba(255,255,255,0.04); }
.btn.primary{ background:rgba(55,140,255,0.35); border-color:rgba(55,140,255,0.35); }
.btn.danger{ background:rgba(255,75,75,0.25); border-color:rgba(255,75,75,0.35); }

.pill{ padding:6px 10px; border-radius:999px; font-size:12px; font-weight:800; border:1px solid rgba(255,255,255,0.10); }
.pill.ok{ background:rgba(14,180,126,0.16); color:rgba(175,255,230,0.9); border-color:rgba(14,180,126,0.25); }
.pill.muted{ background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.75); }
.tag{ display:inline-flex; padding:4px 8px; border-radius:999px; border:1px solid rgba(255,255,255,0.10); background:rgba(0,0,0,0.16); font-weight:900; }

.hint{ font-size:12px; color:rgba(255,255,255,0.55); }

.info-box{ margin-top:10px; padding:12px; border-radius:12px; border:1px solid rgba(88,160,255,0.20); background:rgba(40,110,220,0.12); }
.info-title{ font-weight:900; font-size:12px; color:rgba(255,255,255,0.9); }
.info-text{ margin-top:6px; font-size:12px; color:rgba(255,255,255,0.7); }

.filters{
  display:grid;
  grid-template-columns: 160px 1fr 120px auto;
  gap:12px;
  align-items:end;
}
@media (max-width: 900px){
  .filters{ grid-template-columns: 1fr; }
}

.field{ margin:0; }
.label{ margin-bottom:6px; font-size:12px; color:rgba(255,255,255,0.7); font-weight:900; }
.field.compact{ width: 160px; }

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
  grid-template-columns: 1.2fr 1fr 120px 110px 130px 260px;
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
.modal{ width:min(560px,95vw); padding:14px; }
.modal-wide{ width:min(980px,96vw); }
.modal-h{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:12px; }
.modal-title{ font-size:14px; font-weight:900; color:rgba(255,255,255,0.92); }
.modal-sub{ margin-top:4px; font-size:12px; color:rgba(255,255,255,0.55); }
.icon-btn{ width:34px; height:34px; border-radius:12px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9); cursor:pointer; }

.form-grid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:14px;
}
@media (max-width: 980px){
  .form-grid{ grid-template-columns: 1fr; }
}
.block{
  border-radius:14px;
  border:1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.12);
  padding:12px;
}
.block-h{
  font-size:12px;
  color:rgba(255,255,255,0.75);
  font-weight:900;
  margin-bottom:10px;
}

.days{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.day{
  height:34px;
  padding:0 12px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.8);
  font-weight:900;
  cursor:pointer;
}
.day.active{
  background: rgba(55,140,255,0.28);
  border-color: rgba(55,140,255,0.35);
  color: rgba(255,255,255,0.92);
}

.help{ margin-top:6px; font-size:11px; color:rgba(255,255,255,0.55); }

.check{
  display:flex;
  align-items:center;
  gap:10px;
  font-size:12px;
  color: rgba(255,255,255,0.85);
  font-weight:900;
}
.check input{ width:16px; height:16px; }

.alert{ margin-top:10px; padding:10px 12px; border-radius:12px; font-size:12px; border:1px solid rgba(255,255,255,0.10); }
.alert.danger{ border-color:rgba(255,75,75,0.35); background:rgba(255,75,75,0.12); color:rgba(255,255,255,0.9); }

.modal-actions{ display:flex; justify-content:flex-end; gap:10px; margin-top:14px; }
</style>

