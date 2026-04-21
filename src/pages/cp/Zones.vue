<template>
  <div class="cp-page">
    <!-- Guard -->
    <div v-if="!canAccess" class="glass card">
      <div class="cp-title">Zonalar</div>
      <div class="cp-sub">Bo'lim faqat admin yoki owner uchun ochiq.</div>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="cp-head glass">
        <div>
          <div class="cp-title">Zonalar</div>
          <div class="cp-sub">Zal zonalari va soatbay tariflarini boshqaring.</div>
        </div>

        <div class="cp-head-actions">
          <button class="btn ghost" :disabled="loading" @click="reload">Yangilash</button>
          <button class="btn primary" :disabled="loading" @click="openCreate">+ Zona qo'shish</button>
        </div>
      </div>

      <!-- Top: filter + stats -->
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
              <input class="input" v-model.trim="filters.q" placeholder="Zona nomi..." />
            </div>

            <button class="btn ghost" :disabled="loading" @click="applyFilters">Qo'llash</button>
          </div>

          <div class="mini-stats">
            <div class="mini">
              <div class="k">Jami</div>
              <div class="v">{{ items.length }}</div>
            </div>
            <div class="mini">
              <div class="k">Faol</div>
              <div class="v">{{ activeCount }}</div>
            </div>
            <div class="mini">
              <div class="k">O'chirilgan</div>
              <div class="v">{{ items.length - activeCount }}</div>
            </div>
          </div>
        </div>

        <div class="glass card">
          <div class="card-h">Qanday ishlaydi</div>
          <div class="info-box">
            <div class="info-title">Tarif logikasi</div>
            <div class="info-text">
              1) Har bir zona uchun <b>UZS/soat</b> narx belgilanadi.<br />
              2) Kompyuterlar keyin shu zonaga (zone_id) biriktiriladi.<br />
              3) Sessiya narxi kompyuter biriktirilgan zonadan olinadi.
            </div>
          </div>
          <div class="hint" style="margin-top:10px">
            Tavsiya: 2-3 ta aniq zona yarating, masalan VIP, Standart va Console.
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="glass card">
        <div class="row between">
          <div>
            <div class="card-h">Zonalar ro'yxati</div>
            <div class="hint">Narx 1 soat uchun UZS ko'rinishida saqlanadi.</div>
          </div>
        </div>

        <div class="tbl" v-if="filteredItems.length">
          <div class="tbl-head">
            <div>Zona</div>
            <div class="center">Narx / soat</div>
            <div class="center">Holat</div>
            <div class="right">Amallar</div>
          </div>

          <div v-for="z in filteredItems" :key="z.id" class="tbl-row">
            <div class="name">
              <div class="nm">{{ z.name }}</div>
              <div class="sm muted">ID: #{{ z.id }}</div>
            </div>

            <div class="center">
              <span class="pill muted">{{ money(z.price_per_hour) }} UZS</span>
            </div>

            <div class="center">
              <span class="pill" :class="z.is_active ? 'ok' : 'muted'">
                {{ z.is_active ? 'Faol' : "O'chirilgan" }}
              </span>
            </div>

            <div class="right actions">
              <button class="btn ghost" :disabled="loading" @click="openEdit(z)">Tahrirlash</button>
              <button
                  class="btn"
                  :class="z.is_active ? 'danger' : 'primary'"
                  :disabled="loading"
                  @click="toggle(z)"
              >
                {{ z.is_active ? "O'chirish" : 'Yoqish' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty">
          Hozircha zona yo'q. Yangi zona qo'shing.
        </div>
      </div>

      <!-- Modal -->
      <div v-if="modal.open" class="overlay" @click.self="closeModal">
        <div class="modal glass">
          <div class="modal-h">
            <div>
              <div class="modal-title">{{ modal.mode === 'create' ? "Yangi zona" : "Zonani tahrirlash" }}</div>
              <div class="modal-sub">Zona nomi va 1 soatlik tarifni kiriting.</div>
            </div>
            <button class="icon-btn" @click="closeModal">×</button>
          </div>

          <div class="field">
            <div class="label">Zona nomi</div>
            <input class="input" v-model.trim="form.name" placeholder="Masalan: VIP" />
          </div>

          <div class="field">
            <div class="label">1 soat narxi (UZS)</div>
            <input class="input" type="number" min="0" v-model.number="form.price_per_hour" placeholder="0" />
            <div class="help">Masalan: 15000 = 15 000 UZS / soat</div>
          </div>

          <div class="row gap-sm" style="margin-top:10px">
            <label class="check">
              <input type="checkbox" v-model="form.is_active" />
              <span>Faol</span>
            </label>
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

const filters = reactive({
  active: '',
  q: '',
})

const activeCount = computed(() => items.value.filter(x => !!x.is_active).length)

const filteredItems = computed(() => {
  let list = items.value.slice()

  // active filter
  if (filters.active !== '') {
    const need = filters.active === 'true'
    list = list.filter(x => !!x.is_active === need)
  }

  // search
  const q = (filters.q || '').toLowerCase()
  if (q) list = list.filter(x => String(x.name || '').toLowerCase().includes(q))

  // sort: active first, then name
  list.sort((a, b) => {
    const aa = a.is_active ? 0 : 1
    const bb = b.is_active ? 0 : 1
    if (aa !== bb) return aa - bb
    return String(a.name || '').localeCompare(String(b.name || ''), 'ru')
  })

  return list
})

const modal = reactive({
  open: false,
  mode: 'create', // create | edit
  id: null,
  error: '',
})

const form = reactive({
  name: '',
  price_per_hour: 0,
  is_active: true,
})

function resetForm() {
  form.name = ''
  form.price_per_hour = 0
  form.is_active = true
}

function fillForm(z) {
  form.name = z?.name ?? ''
  form.price_per_hour = Number(z?.price_per_hour ?? 0)
  form.is_active = !!z?.is_active
}

function openCreate() {
  modal.error = ''
  modal.mode = 'create'
  modal.id = null
  resetForm()
  modal.open = true
}

function openEdit(z) {
  modal.error = ''
  modal.mode = 'edit'
  modal.id = z.id
  fillForm(z)
  modal.open = true
}

function closeModal() {
  modal.open = false
  modal.error = ''
}

function applyFilters() {
  // filtrlar computed orqali ishlaydi, reload shart emas
  // lekin xohlasang serverdan qayta olib kelish uchun:
  // reload()
}

function money(v) {
  return new Intl.NumberFormat('ru-RU').format(Number(v || 0))
}

async function reload() {
  if (!canAccess.value) return
  loading.value = true
  try {
    const params = {}
    if (filters.active !== '') params.active = filters.active

    const r = await cpApi.zoneList(params)
    const payload = r?.data?.data ?? r?.data ?? []
    items.value = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : [])
  } catch (e) {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function save() {
  modal.error = ''

  if (!form.name || form.name.length < 2) {
    modal.error = "Zona nomi kamida 2 ta belgidan iborat bo'lishi kerak."
    return
  }
  const pph = Number(form.price_per_hour || 0)
  if (!Number.isFinite(pph) || pph < 0) {
    modal.error = "Narx 0 yoki undan katta son bo'lishi kerak."
    return
  }

  loading.value = true
  try {
    const payload = {
      name: form.name,
      price_per_hour: pph,
      is_active: !!form.is_active,
    }

    if (modal.mode === 'create') {
      await cpApi.zoneCreate(payload)
    } else {
      await cpApi.zoneUpdate(modal.id, payload)
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

async function toggle(z) {
  loading.value = true
  try {
    await cpApi.zoneToggle(z.id)
    await reload()
  } finally {
    loading.value = false
  }
}

onMounted(() => reload())
</script>

<style scoped>
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

.btn{ height:34px; padding:0 12px; border-radius:12px; font-size:12px; font-weight:900; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.9); cursor:pointer; }
.btn:disabled{ opacity:0.6; cursor:not-allowed; }
.btn.ghost{ background:rgba(255,255,255,0.04); }
.btn.primary{ background:rgba(55,140,255,0.35); border-color:rgba(55,140,255,0.35); }
.btn.danger{ background:rgba(255,75,75,0.25); border-color:rgba(255,75,75,0.35); }

.pill{ padding:6px 10px; border-radius:999px; font-size:12px; font-weight:800; border:1px solid rgba(255,255,255,0.10); }
.pill.ok{ background:rgba(14,180,126,0.16); color:rgba(175,255,230,0.9); border-color:rgba(14,180,126,0.25); }
.pill.muted{ background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.75); }

.hint{ font-size:12px; color:rgba(255,255,255,0.55); }

.info-box{ margin-top:10px; padding:12px; border-radius:12px; border:1px solid rgba(88,160,255,0.20); background:rgba(40,110,220,0.12); }
.info-title{ font-weight:900; font-size:12px; color:rgba(255,255,255,0.9); }
.info-text{ margin-top:6px; font-size:12px; color:rgba(255,255,255,0.7); }

.filters{
  display:grid;
  grid-template-columns: 180px 1fr auto;
  gap:12px;
  align-items:end;
}
@media (max-width: 900px){
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
.help{ margin-top:6px; font-size:11px; color:rgba(255,255,255,0.55); }

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
  grid-template-columns: 1.2fr 180px 160px 280px;
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

.overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.55); backdrop-filter:blur(6px); display:grid; place-items:center; z-index:50; padding:16px; }
.modal{ width:min(560px,95vw); padding:14px; }
.modal-h{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:12px; }
.modal-title{ font-size:14px; font-weight:900; color:rgba(255,255,255,0.92); }
.modal-sub{ margin-top:4px; font-size:12px; color:rgba(255,255,255,0.55); }
.icon-btn{ width:34px; height:34px; border-radius:12px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9); cursor:pointer; }

.alert{ margin-top:10px; padding:10px 12px; border-radius:12px; font-size:12px; border:1px solid rgba(255,255,255,0.10); }
.alert.danger{ border-color:rgba(255,75,75,0.35); background:rgba(255,75,75,0.12); color:rgba(255,255,255,0.9); }

.modal-actions{ display:flex; justify-content:flex-end; gap:10px; margin-top:14px; }

.check{
  display:flex; align-items:center; gap:10px;
  font-size:12px; color: rgba(255,255,255,0.85); font-weight:900;
}
.check input{ width:16px; height:16px; }
</style>

