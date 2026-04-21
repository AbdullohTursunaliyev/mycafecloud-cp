<template>
  <teleport to="body">
    <transition name="mc-fade">
      <div v-if="open" class="dr-backdrop" @click.self="emitClose" />
    </transition>

    <transition name="mc-slide-right">
      <aside v-if="open" class="dr-shell" role="dialog" aria-modal="true">
        <div class="dr-head">
          <div>
            <div class="dr-kicker">SUBSCRIPTIONS</div>
            <div class="dr-title">Подписки клиента</div>
            <div class="dr-sub">Клиент: <b>{{ client?.login || '-' }}</b></div>
          </div>
          <button class="dr-x" type="button" @click="emitClose">×</button>
        </div>

        <div class="dr-body">
          <div class="row between toolbar">
            <div class="hint">Показываются активные и последние подписки. Таймер обновляется автоматически.</div>
            <button class="btn ghost small" :disabled="loading" @click="load">{{ loading ? 'Загрузка...' : 'Обновить' }}</button>
          </div>

          <div v-if="error" class="alert danger">{{ error }}</div>
          <div v-if="loading" class="empty">Загрузка...</div>

          <div v-else-if="!items.length" class="empty">
            Подписок нет.
          </div>

          <div v-else class="list">
            <div v-for="subscription in items" :key="subscription.id" class="sub-card">
              <div class="top">
                <div class="nm">
                  <div class="t">{{ subscription.plan?.name || 'Подписка' }}</div>
                  <div class="m muted">
                    Зона: <b>{{ subscription.zone?.name || '—' }}</b>
                    <span class="dot">•</span>
                    {{ subscription.plan?.duration_days || '?' }} дн.
                  </div>
                </div>

                <span class="pill" :class="pillClass(subscription)">
                  {{ statusText(subscription) }}
                </span>
              </div>

              <div class="grid">
                <div class="kv">
                  <div class="k">Начало</div>
                  <div class="v">{{ dt(subscription.starts_at) }}</div>
                </div>
                <div class="kv">
                  <div class="k">Окончание</div>
                  <div class="v">{{ dt(subscription.ends_at) }}</div>
                </div>
                <div class="kv">
                  <div class="k">Осталось</div>
                  <div class="v"><b>{{ leftText(subscription) }}</b></div>
                </div>
                <div class="kv">
                  <div class="k">Оплата</div>
                  <div class="v">{{ payText(subscription.payment_method) }} • {{ money(subscription.amount) }} UZS</div>
                </div>
              </div>

              <div class="actions">
                <button
                  class="btn danger small"
                  :disabled="!canCancel(subscription) || cancelingId === subscription.id"
                  @click="cancel(subscription)"
                >
                  {{ cancelingId === subscription.id ? '...' : 'Отменить' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="dr-foot">
          <button class="btn ghost" type="button" @click="emitClose">Закрыть</button>
        </div>
      </aside>
    </transition>
  </teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { cpApi } from '../../api/cp'
import { useCpAuthStore } from '../../stores/cpAuth'

const props = defineProps({
  open: { type: Boolean, default: false },
  client: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const auth = useCpAuthStore()
const canAdmin = computed(() => ['admin', 'owner'].includes(auth.operator?.role))

const loading = ref(false)
const error = ref('')
const items = ref([])
const cancelingId = ref(null)

let tickTimer = null
const tick = ref(0)

function emitClose() {
  emit('close')
}

function money(value) {
  return Number(value || 0).toLocaleString('ru-RU')
}

function dt(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('ru-RU')
}

function isActive(subscription) {
  if (!subscription) return false
  if (subscription.status !== 'active') return false
  if (!subscription.ends_at) return false
  return new Date(subscription.ends_at).getTime() > Date.now()
}

function leftText(subscription) {
  tick.value
  if (!subscription?.ends_at) return '—'
  const end = new Date(subscription.ends_at).getTime()
  const now = Date.now()
  const diff = end - now
  if (diff <= 0) return '0 мин.'
  const mins = Math.floor(diff / 60000)
  const days = Math.floor(mins / (60 * 24))
  const hours = Math.floor((mins - days * 60 * 24) / 60)
  const rest = mins - days * 60 * 24 - hours * 60
  if (days > 0) return `${days} дн. ${hours} ч.`
  if (hours > 0) return `${hours} ч. ${rest} мин.`
  return `${rest} мин.`
}

function statusText(subscription) {
  if (isActive(subscription)) return 'Активна'
  if (subscription.status === 'canceled') return 'Отменена'
  if (subscription.status === 'expired') return 'Истекла'
  return subscription.status || '—'
}

function pillClass(subscription) {
  if (isActive(subscription)) return 'ok'
  if (subscription.status === 'canceled') return 'danger'
  return 'muted'
}

function payText(method) {
  if (method === 'balance') return 'С баланса'
  if (method === 'cash') return 'Наличные'
  if (method === 'card') return 'Карта'
  return method || '—'
}

function canCancel(subscription) {
  return canAdmin.value && isActive(subscription)
}

async function load() {
  if (!props.client?.id) return
  loading.value = true
  error.value = ''
  try {
    const response = await cpApi.clientSubscriptions(props.client.id, { per_page: 50, page: 1 })
    const payload = response?.data?.data ?? response?.data ?? {}
    items.value = Array.isArray(payload?.data) ? payload.data : []
  } catch (e) {
    items.value = []
    error.value = e?.response?.data?.message || 'Не удалось загрузить подписки'
  } finally {
    loading.value = false
  }
}

async function cancel(subscription) {
  if (!props.client?.id || !subscription?.id || !canCancel(subscription)) return
  cancelingId.value = subscription.id
  try {
    await cpApi.clientSubscriptionCancel(props.client.id, subscription.id)
    await load()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Не удалось отменить подписку'
  } finally {
    cancelingId.value = null
  }
}

watch(
  () => props.open,
  async (value) => {
    if (!value) return
    await load()
  },
  { immediate: true }
)

onMounted(() => {
  tickTimer = setInterval(() => {
    tick.value++
  }, 1000)
})

onBeforeUnmount(() => {
  if (tickTimer) clearInterval(tickTimer)
})
</script>

<style scoped>
.dr-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(8px);
  z-index: 9998;
}

.dr-shell {
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
  color: var(--text);
  z-index: 9999;
}

.dr-head,
.dr-foot {
  padding: 20px;
}

.dr-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  border-bottom: 1px solid var(--stroke);
}

.dr-kicker {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand);
}

.dr-title {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 900;
}

.dr-sub {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.dr-x,
.btn {
  border: 1px solid var(--stroke);
  border-radius: 14px;
  font: inherit;
}

.dr-x {
  width: 42px;
  height: 42px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 24px;
}

.dr-body {
  flex: 1;
  overflow: auto;
  padding: 18px 20px 20px;
}

.row {
  display: flex;
  align-items: center;
}

.between {
  justify-content: space-between;
}

.toolbar {
  gap: 12px;
  margin-bottom: 12px;
}

.hint {
  font-size: 12px;
  color: var(--text-muted);
}

.btn {
  min-height: 42px;
  padding: 0 14px;
  background: var(--surface-soft);
  color: var(--text);
  font-weight: 700;
}

.btn.small {
  min-height: 38px;
  padding: 0 12px;
}

.btn.danger {
  background: color-mix(in srgb, var(--danger) 14%, var(--surface-soft));
  border-color: color-mix(in srgb, var(--danger) 34%, var(--stroke));
  color: var(--danger);
}

.btn:disabled {
  opacity: 0.55;
}

.alert {
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--stroke));
}

.alert.danger {
  background: color-mix(in srgb, var(--danger) 10%, var(--surface-soft));
  color: var(--danger);
}

.empty {
  margin-top: 10px;
  padding: 18px;
  border-radius: 18px;
  border: 1px dashed var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-card {
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  padding: 14px;
}

.top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.nm .t {
  font-weight: 900;
  font-size: 18px;
}

.nm .m {
  margin-top: 6px;
  font-size: 12px;
}

.muted {
  color: var(--text-muted);
}

.dot {
  margin: 0 6px;
}

.grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.kv {
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--bg-elevated);
  padding: 12px;
}

.k {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.v {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text);
  font-weight: 800;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 7px 11px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  font-size: 12px;
  font-weight: 800;
}

.pill.ok { background: color-mix(in srgb, var(--success) 14%, var(--surface-soft)); color: var(--success); }
.pill.muted { background: var(--surface-muted); color: var(--text-muted); }
.pill.danger { background: color-mix(in srgb, var(--danger) 12%, var(--surface-soft)); color: var(--danger); }

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.dr-foot {
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

@media (max-width: 720px) {
  .dr-shell {
    width: 100vw;
  }

  .toolbar,
  .top {
    flex-direction: column;
    align-items: stretch;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
