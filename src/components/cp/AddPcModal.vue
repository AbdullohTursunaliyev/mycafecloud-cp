<template>
  <div v-if="modelValue" class="m-overlay" @mousedown.self="close">
    <div class="m-card" @mousedown.stop>
      <!-- Header -->
      <div class="m-head">
        <div>
          <div class="m-title">Добавить ПК</div>
          <div class="m-sub muted">Код, зона и IP (необязательно).</div>
        </div>
        <button class="m-x" @click="close">×</button>
      </div>

      <div class="m-divider"></div>

      <!-- Body -->
      <div class="m-body">
        <div class="m-grid">
          <!-- Left -->
          <div class="m-panel m-form">
            <div class="pc-hero">
              <div class="pc-sheen"></div>
              <div class="pc-frame">
                <svg viewBox="0 0 64 64" aria-hidden="true">
                  <defs>
                    <linearGradient id="pcg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stop-color="rgba(99,162,255,0.95)"/>
                      <stop offset="1" stop-color="rgba(99,102,241,0.85)"/>
                    </linearGradient>
                  </defs>
                  <rect x="6" y="10" width="34" height="22" rx="4" fill="none" stroke="url(#pcg)" stroke-width="3"/>
                  <rect x="10" y="14" width="26" height="14" rx="3" fill="rgba(99,162,255,0.10)"/>
                  <path d="M16 36h14" stroke="url(#pcg)" stroke-width="3" stroke-linecap="round"/>
                  <path d="M23 32v6" stroke="url(#pcg)" stroke-width="3" stroke-linecap="round"/>
                  <rect x="42" y="12" width="16" height="36" rx="3" fill="none" stroke="url(#pcg)" stroke-width="3"/>
                  <rect x="45" y="16" width="10" height="12" rx="2" fill="rgba(99,162,255,0.10)"/>
                  <circle cx="50" cy="33" r="2.2" fill="url(#pcg)"/>
                </svg>
              </div>
              <div class="pc-meta">
                <div class="pc-title">PC</div>
                <div class="pc-sub muted">Luxury terminal</div>
              </div>
            </div>

            <div class="m-panel-title muted">Данные ПК</div>

            <div class="m-field">
              <div class="m-label">Код ПК</div>
              <el-input v-model="form.code" placeholder="Например: VIP01" />
            </div>

            <div class="m-field">
              <div class="m-label">Зона</div>

              <!-- вњ… MUHIM: teleported=false -> dropdown modal ichida chiqadi -->
              <el-select
                  v-model="form.zone_id"
                  placeholder="Выберите зону"
                  style="width:100%"
                  :teleported="false"
              >
                <el-option
                    v-for="z in zones"
                    :key="z.id"
                    :label="zoneOptionLabel(z)"
                    :value="z.id"
                />
              </el-select>

              <div class="m-hint muted" v-if="zones?.length">
                {{ zones.length }} зон доступно
              </div>

              <div class="m-price muted" v-if="zonePricePerHour">
                Тариф зоны: <b>{{ formatUZS(zonePricePerHour) }}</b> / час
              </div>
            </div>

            <div class="m-field">
              <div class="m-label">IP (необязательно)</div>
              <el-input v-model="form.ip_address" placeholder="192.168.0.11" />
            </div>

            <div v-if="error" class="m-alert">
              {{ error }}
            </div>
          </div>

          <!-- Right -->
          <div class="m-panel">
            <div class="m-panel-title muted">Предпросмотр</div>

            <div class="m-preview">
              <div class="m-preview-head">
                <div class="m-preview-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="4" width="11" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M6 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M9 12v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <rect x="16" y="5" width="4.5" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div>
                  <div class="m-preview-title">Live preview</div>
                  <div class="m-preview-sub muted">Realtime PC snapshot</div>
                </div>
              </div>

              <div class="m-rows">
                <div class="m-row">
                  <div class="muted">Код</div>
                  <div class="m-val">{{ form.code || '—' }}</div>
                </div>
                <div class="m-row">
                  <div class="muted">Зона</div>
                  <div class="m-val">
                    {{ zoneName || '—' }}
                    <span v-if="zonePricePerHour" class="m-mini muted">
                      • {{ formatUZS(zonePricePerHour) }}/час
                    </span>
                  </div>
                </div>
                <div class="m-row">
                  <div class="muted">IP</div>
                  <div class="m-val">{{ form.ip_address || '—' }}</div>
                </div>
                <div class="m-row">
                  <div class="muted">Статус</div>
                  <div class="m-badge">offline</div>
                </div>
              </div>
            </div>

            <div class="m-note muted">
              После добавления ПК появится в зале. Дальше можно запускать сессию и команды.
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="m-foot">
        <el-button @click="close">Отмена</el-button>
        <el-button type="primary" :loading="loading" @click="submit">
          Сохранить
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  zones: { type: Array, default: () => [] }, // [{id,name,price_per_hour}]
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  initial: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const form = reactive({
  code: '',
  zone_id: null,
  ip_address: '',
})

watch(
    () => props.modelValue,
    (open) => {
      if (!open) return
      form.code = props.initial?.code || ''
      form.zone_id = props.initial?.zone_id ?? (props.zones?.[0]?.id ?? null)
      form.ip_address = props.initial?.ip_address || ''
    }
)

const zoneObj = computed(() => props.zones?.find(x => x.id === form.zone_id) || null)
const zoneName = computed(() => zoneObj.value?.name || '')
const zonePricePerHour = computed(() => Number(zoneObj.value?.price_per_hour || 0) || null)

const close = () => emit('update:modelValue', false)

const submit = () => {
  emit('submit', {
    code: form.code?.trim(),
    zone_id: form.zone_id,
    ip_address: form.ip_address?.trim() || null,
  })
}

const formatUZS = (n) => {
  try { return Number(n).toLocaleString('ru-RU') + ' UZS' } catch (_) { return String(n) }
}
const zoneOptionLabel = (z) => {
  const p = Number(z?.price_per_hour || 0)
  if (!p) return z?.name || '—'
  return `${z.name} • ${formatUZS(p)}/час`
}
</script>

<style scoped>
.m-overlay{
  position:fixed; inset:0; z-index:6000;
  background: rgba(0,0,0,.62);
  display:flex; align-items:center; justify-content:center;
  padding:20px;
}

/* overflow visible */
.m-card{
  width:min(980px, 96vw);
  border-radius:22px;
  border:1px solid rgba(255,255,255,.08);
  background: rgba(10, 18, 35, .92);
  box-shadow: 0 40px 120px rgba(0,0,0,.70);
  overflow: visible;
  position:relative;
}
.m-card:before{
  content:"";
  position:absolute;
  inset:-1px;
  border-radius:22px;
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(99,162,255,0.22), transparent 60%),
    radial-gradient(90% 90% at 100% 0%, rgba(124,58,237,0.18), transparent 55%);
  opacity:.7;
  pointer-events:none;
}

.m-head{display:flex; align-items:flex-start; justify-content:space-between; padding:18px 18px 12px; gap:14px;}
.m-title{font-size:18px;font-weight:900;letter-spacing:.2px}
.m-sub{margin-top:4px}
.m-x{
  width:36px;height:36px;border-radius:12px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color: var(--text); cursor:pointer; font-size:22px; line-height:32px;
}
.m-x:hover{background: rgba(255,255,255,.07)}
.m-divider{height:1px;background: rgba(255,255,255,.06)}

.m-body{padding:16px 18px 6px}
.m-grid{display:grid; grid-template-columns: 1.1fr .9fr; gap:14px;}

.m-panel{
  border-radius:18px;
  border:1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.03);
  padding:14px;
  overflow: visible; /* keep dropdown visible */
}
.m-form{position:relative}
.pc-hero{
  position:relative;
  border-radius:16px;
  border:1px solid rgba(255,255,255,0.10);
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(99,162,255,0.18), transparent 55%),
    linear-gradient(180deg, rgba(8,14,28,0.85), rgba(6,10,22,0.85));
  padding:14px;
  margin-bottom:12px;
  overflow:hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}
.pc-hero:after{
  content:"";
  position:absolute;left:12px;right:12px;bottom:8px;height:2px;border-radius:999px;
  background: linear-gradient(90deg, transparent, rgba(99,162,255,0.75), transparent);
  opacity:.7;
}
.pc-sheen{
  position:absolute;inset:-40% -20% auto auto;width:160px;height:160px;border-radius:50%;
  background: radial-gradient(circle, rgba(99,162,255,0.22), transparent 60%);
  filter: blur(1px);
}
.pc-frame{
  width:64px;height:64px;border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  border:1px solid rgba(255,255,255,0.12);
  background: rgba(5,10,20,0.55);
}
.pc-frame svg{width:40px;height:40px}
.pc-meta{margin-top:10px}
.pc-title{font-weight:900;letter-spacing:.3px}
.pc-sub{font-size:12px;margin-top:2px}

.m-panel-title{font-weight:800;margin-bottom:10px}
.m-field{margin-top:12px}
.m-label{font-weight:800;margin-bottom:6px}
.m-hint{margin-top:6px;font-size:12px;opacity:.85}
.m-price{margin-top:8px;font-size:12px;opacity:.9}
.m-price b{font-weight:900}

/* Premium inputs */
.m-form :deep(.el-input__wrapper),
.m-form :deep(.el-select__wrapper){
  border-radius:12px;
  background: linear-gradient(180deg, rgba(10,16,30,0.9), rgba(8,12,24,0.9));
  border:1px solid rgba(255,255,255,0.12);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
}
.m-form :deep(.el-input__wrapper.is-focus),
.m-form :deep(.el-select__wrapper.is-focus){
  border-color: rgba(99,162,255,0.55);
  box-shadow:
    0 0 0 2px rgba(99,162,255,0.12),
    inset 0 1px 0 rgba(255,255,255,0.06);
}
.m-form :deep(.el-input__inner),
.m-form :deep(.el-select__placeholder){
  color: rgba(226,232,240,0.95);
}
.m-form :deep(.el-input__inner::placeholder){
  color: rgba(148,163,184,0.8);
}
.m-form :deep(.el-select__caret){
  color: rgba(148,163,184,0.9);
}

.m-preview{
  position:relative;
  border-radius:18px;
  border:1px solid rgba(255,255,255,.10);
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(99,162,255,0.12), transparent 55%),
    linear-gradient(180deg, rgba(8,13,26,0.75), rgba(6,10,20,0.85));
  padding:12px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 26px rgba(0,0,0,0.22);
  overflow:hidden;
}
.m-preview:after{
  content:"";
  position:absolute;left:12px;right:12px;bottom:8px;height:2px;border-radius:999px;
  background: linear-gradient(90deg, transparent, rgba(99,162,255,0.7), transparent);
  opacity:.65;
}
.m-preview-head{
  display:flex;align-items:center;gap:10px;margin-bottom:10px;position:relative;z-index:1;
}
.m-preview-icon{
  width:36px;height:36px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;
  border:1px solid rgba(255,255,255,0.12);
  background: rgba(5,10,20,0.55);
  color: rgba(190,216,255,0.95);
}
.m-preview-icon svg{width:20px;height:20px}
.m-preview-title{font-weight:900;letter-spacing:.2px}
.m-preview-sub{font-size:12px;margin-top:2px}
.m-rows{
  border-radius:14px;
  border:1px solid rgba(255,255,255,0.08);
  background: rgba(2,6,23,0.28);
  overflow:hidden;
  position:relative;
  z-index:1;
}
.m-row{
  display:flex;justify-content:space-between;gap:12px;padding:10px 10px;
}
.m-row + .m-row{border-top:1px solid rgba(255,255,255,.06)}
.m-val{font-weight:900}
.m-mini{margin-left:8px;font-weight:700;opacity:.85}

.m-badge{
  font-size:12px;
  padding:6px 10px;
  border-radius:999px;
  border:1px solid rgba(148,163,184,.35);
  background: linear-gradient(180deg, rgba(148,163,184,.18), rgba(148,163,184,.08));
  font-weight:800;
}
.m-note{margin-top:12px;font-size:12px;opacity:.85;line-height:1.4}

.m-alert{
  margin-top:12px;
  padding:10px 12px;
  border-radius:14px;
  border:1px solid rgba(239,68,68,.28);
  background: rgba(239,68,68,.10);
  font-weight:800;
}

.m-foot{display:flex; justify-content:flex-end; gap:10px; padding:12px 18px 16px;}

@media (max-width:900px){
  .m-grid{grid-template-columns:1fr}
  .m-card{width:min(720px, 96vw)}
}

/* dropdown stays inside modal */
:deep(.el-select__popper){
  z-index: 6500 !important;
}
</style>

