<template>
  <teleport to="body">
    <transition name="mc-fade">
      <div v-if="open" class="mc-dim" @click="emitClose" />
    </transition>

    <transition name="mc-slide-right">
      <aside v-if="open" class="mc-drawer" role="dialog" aria-modal="true">
        <div class="mc-drawer-head">
          <div>
            <div class="mc-kicker">HISTORY</div>
            <div class="mc-title">История баланса</div>
            <div class="mc-sub">Клиент: <b>{{ client?.login || '-' }}</b></div>
          </div>
          <button class="mc-x" type="button" @click="emitClose">×</button>
        </div>

        <div class="mc-drawer-body">
          <div class="mc-toolbar">
            <div class="mc-pill">
              <span>Записей</span>
              <b>{{ total }}</b>
            </div>

            <div class="mc-toolbar-actions">
              <label class="filter-input-wrap">
                <span class="filter-label">Дата</span>
                <div class="filter-input-box">
                  <Icon name="lucide:calendar-days" size="15" />
                  <input v-model="day" type="date" class="filter-input" />
                </div>
              </label>
              <button class="mc-btn ghost" :disabled="!day" @click="clearDate">
                <Icon name="lucide:rotate-ccw" size="15" />
                <span>Сбросить</span>
              </button>
              <button class="mc-btn primary" :disabled="loading" @click="load">
                <Icon name="lucide:refresh-cw" size="15" />
                <span>{{ loading ? 'Загрузка...' : 'Обновить' }}</span>
              </button>
            </div>
          </div>

          <div v-if="error" class="mc-error">
            {{ error }}
          </div>

          <div v-if="loading && rows.length === 0" class="mc-skeleton">
            <div class="mc-skel" v-for="i in 6" :key="i" />
          </div>

          <div v-else-if="rows.length === 0" class="mc-empty">
            История пока пуста.
          </div>

          <div v-else class="mc-list">
            <div v-for="r in rows" :key="r._key" class="mc-item">
              <div class="mc-item-top">
                <span class="mc-badge" :class="badgeClass(r)">
                  <Icon :name="labelIcon(r)" size="14" />
                  <span>{{ labelType(r) }}</span>
                </span>
                <span class="mc-amt" :class="{ plus: r.amount > 0 }">
                  {{ formatSigned(r.amount) }}
                </span>
              </div>

              <div class="mc-item-meta">
                <span class="meta-chip">
                  <Icon name="lucide:clock-3" size="13" />
                  <span>{{ formatDate(r.created_at) }}</span>
                </span>
                <span v-if="r.method" class="meta-chip">
                  <Icon :name="methodIcon(r.method)" size="13" />
                  <span>{{ methodLabel(r.method) }}</span>
                </span>
                <span v-if="r.operator" class="meta-chip">
                  <Icon name="lucide:user-round" size="13" />
                  <span>{{ r.operator }}</span>
                </span>
              </div>

              <div v-if="r.note" class="mc-note">
                <Icon name="lucide:file-text" size="14" />
                <span>{{ r.note }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mc-drawer-foot">
          <button class="mc-btn ghost" type="button" @click="emitClose">
            <Icon name="lucide:x" size="15" />
            <span>Закрыть</span>
          </button>
        </div>
      </aside>
    </transition>
  </teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { cpApi } from '../../api/cp'

const props = defineProps({
  open: { type: Boolean, default: false },
  client: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const loading = ref(false)
const error = ref('')
const rows = ref([])
const day = ref('')

const total = computed(() => rows.value.length)

function emitClose() {
  emit('close')
}

function normalize(raw) {
  const pageObj = raw?.data?.data ? raw.data : raw
  const arr = pageObj?.data?.data ?? pageObj?.data ?? raw?.data ?? []
  const list = Array.isArray(arr) ? arr : []

  return list.map((x, idx) => {
    const type = x.type ?? 'op'
    const method = x.payment_method ?? x.method ?? null
    let amount = Number(x.amount ?? x.sum ?? 0)
    const t = String(type).toLowerCase()
    const m = String(method || '').toLowerCase()
    const note = String(x.note ?? x.comment ?? '').toLowerCase()

    if ((t.includes('refund') || t.includes('return')) && m === 'balance') {
      amount = Math.abs(amount)
    } else if ((t.includes('package') || note.includes('package') || t.includes('subscription') || note.includes('subscription')) && m === 'balance') {
      amount = -Math.abs(amount)
    }

    return {
      _key: x.id ?? `${x.created_at ?? 't'}-${idx}`,
      type,
      amount,
      method,
      created_at: x.created_at ?? null,
      operator: x.operator_name ?? x.operator?.name ?? null,
      note: x.note ?? x.comment ?? null,
    }
  })
}

async function load() {
  if (!props.client?.id) return
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (day.value) params.date = day.value
    const res = await cpApi.clientHistory(props.client.id, params)
    rows.value = normalize(res?.data)
  } catch (e) {
    rows.value = []
    error.value = e?.response?.data?.message || e?.message || 'Не удалось загрузить историю'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (value) => {
    if (value) load()
  }
)

watch(day, () => {
  if (!props.open) return
  load()
})

function clearDate() {
  if (!day.value) return
  day.value = ''
}

function formatSigned(n) {
  const value = Number(n ?? 0)
  const text = `${new Intl.NumberFormat('ru-RU').format(Math.abs(value))} UZS`
  return value >= 0 ? `+ ${text}` : `- ${text}`
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('ru-RU')
}

function methodLabel(method) {
  if (method === 'cash') return 'Наличные'
  if (method === 'card') return 'Карта'
  if (method === 'balance') return 'С баланса'
  return method
}

function methodIcon(method) {
  if (method === 'cash') return 'lucide:wallet'
  if (method === 'card') return 'lucide:credit-card'
  if (method === 'balance') return 'lucide:wallet-cards'
  return 'lucide:circle-dollar-sign'
}

function labelType(row) {
  const type = String(row.type || '').toLowerCase()
  const note = String(row.note || '').toLowerCase()
  if (type.includes('refund') || type.includes('return')) return 'Возврат'
  if (type.includes('transfer')) return 'Перевод'
  if (type.includes('package') || type.includes('subscription') || note.includes('package') || note.includes('subscription')) return 'Пакет'
  if (type.includes('topup') || type.includes('deposit') || type.includes('pay')) return 'Пополнение'
  if (type.includes('bonus')) return 'Бонус'
  if (type.includes('charge') || type.includes('spend') || type.includes('session')) return 'Списание'
  return 'Операция'
}

function labelIcon(row) {
  const type = String(row.type || '').toLowerCase()
  const note = String(row.note || '').toLowerCase()
  if (type.includes('refund') || type.includes('return')) return 'lucide:undo-2'
  if (type.includes('transfer')) return 'lucide:arrow-right-left'
  if (type.includes('package') || type.includes('subscription') || note.includes('package') || note.includes('subscription')) return 'lucide:package'
  if (type.includes('topup') || type.includes('deposit') || type.includes('pay')) return 'lucide:plus-circle'
  if (type.includes('bonus')) return 'lucide:gift'
  if (type.includes('charge') || type.includes('spend') || type.includes('session')) return 'lucide:minus-circle'
  return 'lucide:circle-dot'
}

function badgeClass(row) {
  const type = String(row.type || '').toLowerCase()
  const note = String(row.note || '').toLowerCase()
  if (type.includes('refund') || type.includes('return')) return 'b-return'
  if (type.includes('transfer')) return 'b-transfer'
  if (type.includes('package') || type.includes('subscription') || note.includes('package') || note.includes('subscription')) return 'b-pack'
  if (type.includes('topup') || type.includes('deposit') || type.includes('pay')) return 'b-topup'
  if (type.includes('bonus')) return 'b-bonus'
  if (type.includes('charge') || type.includes('spend') || type.includes('session')) return 'b-spend'
  return 'b-op'
}
</script>

<style scoped>
.mc-dim {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(8px);
  z-index: 9998;
}

.mc-drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: min(540px, 94vw);
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  border-left: 1px solid var(--stroke);
  box-shadow: var(--shadow-panel);
  backdrop-filter: blur(18px);
  color: var(--text);
  z-index: 9999;
}

.mc-drawer-head,
.mc-drawer-foot {
  padding: 20px;
}

.mc-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--stroke);
}

.mc-kicker {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand);
}

.mc-title {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 900;
}

.mc-sub {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

.mc-x,
.mc-btn,
.filter-input-box {
  border: 1px solid var(--stroke);
  border-radius: 14px;
  font: inherit;
}

.mc-x {
  width: 42px;
  height: 42px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 24px;
}

.mc-drawer-body {
  flex: 1;
  overflow: auto;
  padding: 18px 20px;
}

.mc-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.mc-toolbar-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.mc-pill {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--bg-elevated);
  min-width: 96px;
}

.mc-pill span {
  font-size: 12px;
  color: var(--text-muted);
}

.mc-pill b {
  font-size: 24px;
  line-height: 1;
  color: var(--text);
}

.filter-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  color: var(--text-muted);
}

.filter-input-box {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.filter-input {
  width: 100%;
  min-height: 40px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font: inherit;
}

.mc-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  background: var(--surface-soft);
  color: var(--text);
  font-weight: 700;
}

.mc-btn.primary {
  background: linear-gradient(135deg, var(--brand-secondary), color-mix(in srgb, var(--brand-secondary) 72%, var(--brand) 28%));
  border-color: color-mix(in srgb, var(--brand-secondary) 45%, var(--stroke));
  color: #fff;
}

.mc-btn:disabled {
  opacity: 0.6;
}

.mc-error {
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--stroke));
  background: color-mix(in srgb, var(--danger) 10%, var(--surface-soft));
  color: var(--danger);
}

.mc-empty {
  padding: 20px;
  border-radius: 18px;
  border: 1px dashed var(--stroke);
  color: var(--text-muted);
  background: var(--surface-soft);
}

.mc-list,
.mc-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mc-item,
.mc-skel {
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.mc-item {
  padding: 14px;
}

.mc-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mc-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  font-size: 12px;
  font-weight: 800;
}

.b-topup { background: color-mix(in srgb, var(--brand-secondary) 14%, var(--surface-soft)); color: var(--brand-secondary); }
.b-bonus { background: color-mix(in srgb, var(--success) 16%, var(--surface-soft)); color: var(--success); }
.b-spend { background: color-mix(in srgb, var(--danger) 12%, var(--surface-soft)); color: var(--danger); }
.b-return { background: color-mix(in srgb, var(--accent) 14%, var(--surface-soft)); color: var(--accent); }
.b-pack { background: color-mix(in srgb, var(--brand) 16%, var(--surface-soft)); color: var(--brand); }
.b-transfer { background: color-mix(in srgb, #8b5cf6 16%, var(--surface-soft)); color: #8b5cf6; }
.b-op { background: var(--surface-muted); color: var(--text-muted); }

.mc-amt {
  font-size: 16px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--text);
}

.mc-amt.plus {
  color: var(--success);
}

.mc-item-meta {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: 12px;
}

.mc-note {
  margin-top: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.45;
}

.mc-skel {
  height: 96px;
  background: linear-gradient(90deg, var(--surface-soft), var(--surface-muted), var(--surface-soft));
  background-size: 200% 100%;
  animation: skeleton 1.2s linear infinite;
}

.mc-drawer-foot {
  border-top: 1px solid var(--stroke);
  display: flex;
  justify-content: flex-end;
}

.mc-fade-enter-active,
.mc-fade-leave-active {
  transition: opacity 0.18s ease;
}

.mc-fade-enter-from,
.mc-fade-leave-to {
  opacity: 0;
}

.mc-slide-right-enter-active,
.mc-slide-right-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.mc-slide-right-enter-from,
.mc-slide-right-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

@keyframes skeleton {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

@media (max-width: 640px) {
  .mc-drawer {
    width: 100vw;
  }

  .mc-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .mc-toolbar-actions {
    justify-content: stretch;
  }

  .filter-input-wrap,
  .mc-btn {
    width: 100%;
  }

  .mc-item-top {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
