<template>
  <div v-if="open" class="mc-overlay" @mousedown.self="emitClose">
    <div class="mc-modal">
      <header class="mc-head">
        <div>
          <p class="mc-kicker">RETURN</p>
          <h2>Возврат операции</h2>
          <p class="mc-sub">Клиент: <strong>{{ client?.login || '-' }}</strong></p>
        </div>

        <button class="mc-icon-btn" type="button" @click="emitClose">
          <Icon name="lucide:x" size="18" />
        </button>
      </header>

      <section class="note-banner">
        <Icon name="lucide:shield-alert" size="16" />
        <span>Возврат доступен только по операциям текущей смены и в допустимое время.</span>
      </section>

      <section class="summary-row">
        <article class="summary-card">
          <div class="summary-label">
            <Icon name="lucide:wallet" size="15" />
            <span>Пополнения</span>
          </div>
          <strong>{{ data.topups.length }}</strong>
        </article>

        <article class="summary-card">
          <div class="summary-label">
            <Icon name="lucide:package" size="15" />
            <span>Пакеты</span>
          </div>
          <strong>{{ data.packages.length }}</strong>
        </article>
      </section>

      <div class="tab-row">
        <button class="tab-btn" :class="{ active: tab === 'topup' }" type="button" @click="tab = 'topup'">
          <Icon name="lucide:wallet" size="15" />
          <span>Пополнения</span>
        </button>
        <button class="tab-btn" :class="{ active: tab === 'package' }" type="button" @click="tab = 'package'">
          <Icon name="lucide:package" size="15" />
          <span>Пакеты</span>
        </button>
      </div>

      <section class="list-shell">
        <p v-if="loading" class="hint">
          <Icon name="lucide:loader-circle" size="15" />
          <span>Загрузка...</span>
        </p>

        <p v-else-if="!items.length" class="hint">
          <Icon name="lucide:inbox" size="15" />
          <span>Подходящих операций нет.</span>
        </p>

        <div v-else class="row-list">
          <article v-for="item in items" :key="item.id" class="return-row" :class="{ disabled: !item.eligible }">
            <div class="row-main">
              <div class="row-top">
                <span class="type-pill">
                  <Icon :name="tab === 'topup' ? 'lucide:wallet' : 'lucide:package'" size="13" />
                  <span>{{ tab === 'topup' ? 'Пополнение' : 'Пакет' }}</span>
                </span>

                <strong>{{ money(item.amount) }} UZS</strong>

                <span v-if="tab === 'topup' && item.bonus_amount > 0" class="bonus-pill">
                  <Icon name="lucide:sparkles" size="13" />
                  <span>+{{ money(item.bonus_amount) }} bonus</span>
                </span>
              </div>

              <div class="row-meta">
                <span>
                  <Icon name="lucide:credit-card" size="13" />
                  <span>{{ paymentLabel(item.payment_method) }}</span>
                </span>
                <span>
                  <Icon name="lucide:calendar-clock" size="13" />
                  <span>{{ formatDT(item.created_at) }}</span>
                </span>
              </div>

              <p v-if="!item.eligible && item.reason" class="reason-text">
                <Icon name="lucide:circle-alert" size="14" />
                <span>{{ item.reason }}</span>
              </p>
            </div>

            <button
              class="action-btn"
              :class="item.eligible ? 'primary' : 'ghost'"
              type="button"
              :disabled="!item.eligible || readOnly || submittingId === item.id"
              @click="doReturn(item)"
            >
              <Icon :name="submittingId === item.id ? 'lucide:loader-circle' : 'lucide:rotate-ccw'" size="15" />
              <span>{{ submittingId === item.id ? 'Обработка...' : 'Сделать возврат' }}</span>
            </button>
          </article>
        </div>
      </section>

      <p v-if="error" class="inline-error">
        <Icon name="lucide:triangle-alert" size="15" />
        <span>{{ error }}</span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { cpApi } from '../../api/cp'

const props = defineProps({
  open: { type: Boolean, default: false },
  client: { type: Object, default: null },
})

const emit = defineEmits(['close', 'done'])

const readOnly = computed(() => false)
const tab = ref('topup')
const loading = ref(false)
const error = ref('')
const data = ref({ topups: [], packages: [] })
const submittingId = ref(null)

const items = computed(() => (tab.value === 'topup' ? data.value.topups || [] : data.value.packages || []))

function emitClose() {
  emit('close')
}

function money(value) {
  return Number(value || 0).toLocaleString('ru-RU')
}

function formatDT(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('ru-RU')
  } catch {
    return String(value)
  }
}

function paymentLabel(value) {
  if (!value) return '-'
  if (value === 'cash') return 'Наличные'
  if (value === 'card') return 'Карта'
  if (value === 'balance') return 'С баланса'
  return value
}

async function loadOptions() {
  if (!props.client?.id) return
  loading.value = true
  error.value = ''

  try {
    const response = await cpApi.clientReturnsOptions(props.client.id)
    const payload = response?.data?.data ?? response?.data ?? {}
    const normalized = payload?.data && payload.topups == null && payload.packages == null ? payload.data : payload
    const rawTopups = normalized.topups ?? []
    const rawPackages = normalized.packages ?? []

    data.value = {
      topups: Array.isArray(rawTopups) ? rawTopups : Object.values(rawTopups || {}),
      packages: Array.isArray(rawPackages) ? rawPackages : Object.values(rawPackages || {}),
    }
  } catch (e) {
    error.value = e?.response?.data?.message || 'Не удалось загрузить операции'
  } finally {
    loading.value = false
  }
}

async function doReturn(item) {
  if (!props.client?.id) return

  submittingId.value = item.id
  error.value = ''

  try {
    await cpApi.clientReturn(props.client.id, {
      type: tab.value,
      source_id: item.id,
    })
    await loadOptions()
    emit('done', { type: tab.value, id: item.id })
  } catch (e) {
    error.value = e?.response?.data?.message || 'Возврат не выполнен'
  } finally {
    submittingId.value = null
  }
}

watch(
  [() => props.open, () => props.client?.id],
  ([isOpen]) => {
    if (!isOpen) return
    tab.value = 'topup'
    loadOptions()
  },
  { immediate: true },
)
</script>

<style scoped>
.mc-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(10px);
}

.mc-modal {
  width: min(920px, 100%);
  border-radius: 24px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  color: var(--text);
  box-shadow: var(--shadow-panel);
  padding: 20px;
}

.mc-head {
  padding-bottom: 14px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--stroke);
}

.mc-kicker {
  margin: 0 0 10px;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand);
}

.mc-head h2 {
  margin: 0;
  font-size: 28px;
  color: var(--text);
}

.mc-sub {
  margin: 10px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.mc-icon-btn,
.tab-btn,
.action-btn {
  border-radius: 14px;
  border: 1px solid var(--stroke);
  font: inherit;
}

.mc-icon-btn {
  width: 40px;
  height: 40px;
  display: inline-grid;
  place-items: center;
  background: var(--surface-soft);
  color: var(--text);
}

.note-banner,
.summary-row,
.tab-row,
.list-shell,
.inline-error {
  margin-top: 18px;
}

.note-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--bg-elevated);
  font-size: 13px;
  color: var(--text-muted);
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-card,
.list-shell,
.return-row {
  border-radius: 20px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.summary-card {
  padding: 14px 16px;
}

.summary-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 12px;
}

.summary-card strong {
  display: block;
  margin-top: 10px;
  font-size: 22px;
  color: var(--text);
}

.tab-row {
  display: flex;
  gap: 10px;
}

.tab-btn {
  min-height: 42px;
  padding: 0 16px;
  background: var(--surface-soft);
  color: var(--text);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.tab-btn.active {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-secondary) 16%, var(--surface-soft)),
    color-mix(in srgb, var(--brand) 18%, var(--surface-soft))
  );
  border-color: color-mix(in srgb, var(--brand-secondary) 40%, var(--stroke));
}

.list-shell {
  padding: 16px;
}

.hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.row-list {
  display: grid;
  gap: 10px;
}

.return-row {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.return-row.disabled {
  opacity: 0.72;
}

.row-main {
  min-width: 0;
  flex: 1;
}

.row-top,
.row-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.row-top strong {
  font-size: 18px;
  color: var(--text);
}

.row-meta {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 12px;
}

.row-meta span,
.reason-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.type-pill,
.bonus-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid var(--stroke);
  background: var(--bg-elevated);
}

.bonus-pill {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, var(--stroke));
  background: color-mix(in srgb, var(--success) 10%, var(--bg-elevated));
}

.reason-text {
  margin: 10px 0 0;
  color: var(--danger);
  font-size: 12px;
}

.action-btn {
  min-height: 44px;
  padding: 0 14px;
  background: var(--surface-soft);
  color: var(--text);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--brand-secondary), color-mix(in srgb, var(--brand-secondary) 72%, var(--brand) 28%));
  border-color: color-mix(in srgb, var(--brand-secondary) 45%, var(--stroke));
  color: #fff;
}

.action-btn.ghost {
  background: var(--bg-elevated);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.inline-error {
  color: var(--danger);
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 760px) {
  .summary-row {
    grid-template-columns: 1fr;
  }

  .tab-row {
    flex-direction: column;
  }

  .return-row {
    flex-direction: column;
    align-items: stretch;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
