<template>
  <div v-if="open" class="mc-overlay" @mousedown.self="emitClose">
    <div class="mc-modal">
      <header class="mc-head">
        <div class="mc-head-copy">
          <p class="mc-kicker">TOPUP</p>
          <h2>Пополнение баланса</h2>
          <p class="mc-sub">Клиент: <strong>{{ client?.login || '-' }}</strong></p>
        </div>

        <button class="mc-icon-btn" type="button" @click="emitClose">
          <Icon name="lucide:x" size="18" />
        </button>
      </header>

      <section class="mc-summary-strip">
        <article class="summary-card">
          <div class="summary-label">
            <Icon name="lucide:wallet" size="15" />
            <span>Текущий баланс</span>
          </div>
          <strong>{{ formatUzs(client?.balance ?? 0) }}</strong>
        </article>

        <article class="summary-card">
          <div class="summary-label">
            <Icon name="lucide:circle-dollar-sign" size="15" />
            <span>Пополнение</span>
          </div>
          <strong>{{ formatUzs(amount) }}</strong>
        </article>

        <article class="summary-card">
          <div class="summary-label">
            <Icon name="lucide:sparkles" size="15" />
            <span>Бонус</span>
          </div>
          <strong>{{ formatUzs(totalBonus) }}</strong>
        </article>
      </section>

      <section class="promo-banner" :class="{ muted: !promoActive }">
        <template v-if="promoActive">
          <div class="promo-copy">
            <div class="promo-title">
              <Icon name="lucide:badge-percent" size="16" />
              <strong>Активна акция: {{ promo.name }}</strong>
            </div>
            <p>Автобонус: +{{ formatUzs(promoBonus) }}</p>
          </div>
          <span class="promo-chip">
            <Icon name="lucide:wallet" size="13" />
            <span>cash</span>
          </span>
        </template>

        <template v-else-if="promoLoading">
          <div class="promo-copy">
            <div class="promo-title">
              <Icon name="lucide:loader-circle" size="16" />
              <strong>Проверяем доступную акцию</strong>
            </div>
            <p>Обновляем условия для текущего способа оплаты.</p>
          </div>
        </template>

        <template v-else-if="method === 'card'">
          <div class="promo-copy">
            <div class="promo-title">
              <Icon name="lucide:credit-card" size="16" />
              <strong>Для карты автобонус не применяется</strong>
            </div>
            <p>Акции на автодобавление бонуса работают только для наличных.</p>
          </div>
        </template>

        <template v-else>
          <div class="promo-copy">
            <div class="promo-title">
              <Icon name="lucide:badge-help" size="16" />
              <strong>Активной акции сейчас нет</strong>
            </div>
            <p>Обычное пополнение без автоматического бонуса.</p>
          </div>
        </template>
      </section>

      <div class="mc-grid">
        <section class="mc-panel">
          <div class="panel-head">
            <div>
              <h3>
                <Icon name="lucide:banknote-arrow-up" size="17" />
                <span>Сумма</span>
              </h3>
              <p>Введите сумму вручную и при необходимости добавьте бонус.</p>
            </div>
          </div>

          <label class="field">
            <span>Сумма пополнения (UZS)</span>
            <div class="field-shell large">
              <Icon name="lucide:banknote" size="18" />
              <input
                ref="amountInput"
                v-model="amountStr"
                class="field-input field-input-lg"
                inputmode="numeric"
                placeholder="Введите сумму"
                @input="onAmountInput"
              />
            </div>
          </label>

          <label v-if="canManualBonus" class="field">
            <span>Доп. бонус</span>
            <div class="field-shell">
              <Icon name="lucide:gift" size="16" />
              <input
                v-model="manualBonusStr"
                class="field-input"
                inputmode="numeric"
                placeholder="0"
                @input="onManualBonusInput"
              />
            </div>
            <small>Этот бонус добавится отдельно к бонус-счету клиента.</small>
          </label>

          <p v-if="promoError" class="inline-error">
            <Icon name="lucide:triangle-alert" size="15" />
            <span>{{ promoError }}</span>
          </p>
        </section>

        <section class="mc-panel">
          <div class="panel-head">
            <div>
              <h3>
                <Icon name="lucide:credit-card" size="17" />
                <span>Оплата</span>
              </h3>
              <p>Выберите способ оплаты и сразу проверьте итог.</p>
            </div>
          </div>

          <div class="method-switch">
            <button class="method-btn" :class="{ active: method === 'cash' }" type="button" @click="method = 'cash'">
              <div class="method-icon"><Icon name="lucide:wallet" size="16" /></div>
              <div class="method-copy">
                <strong>Наличные</strong>
                <span>Через кассу</span>
              </div>
            </button>

            <button class="method-btn" :class="{ active: method === 'card' }" type="button" @click="method = 'card'">
              <div class="method-icon"><Icon name="lucide:credit-card" size="16" /></div>
              <div class="method-copy">
                <strong>Карта</strong>
                <span>Безналичная оплата</span>
              </div>
            </button>
          </div>

          <div class="totals">
            <div class="total-row">
              <span>На баланс</span>
              <strong>{{ formatUzs(amount) }}</strong>
            </div>
            <div class="total-row">
              <span>На бонус-счет</span>
              <strong>{{ formatUzs(totalBonus) }}</strong>
            </div>
            <div class="total-method">
              <Icon :name="method === 'cash' ? 'lucide:wallet' : 'lucide:credit-card'" size="15" />
              <span>{{ method === 'cash' ? 'Наличные' : 'Карта' }}</span>
            </div>
          </div>

          <div class="note-list">
            <div v-if="promoBonus > 0" class="note-pill success">
              <Icon name="lucide:sparkles" size="13" />
              <span>Акция добавит +{{ formatUzs(promoBonus) }}</span>
            </div>
            <div v-if="manualBonus > 0" class="note-pill">
              <Icon name="lucide:gift" size="13" />
              <span>Ручной бонус: +{{ formatUzs(manualBonus) }}</span>
            </div>
            <div v-if="promoLoading" class="note-pill muted">
              <Icon name="lucide:loader-circle" size="13" />
              <span>Проверяем акцию...</span>
            </div>
            <div v-if="!promoBonus && !manualBonus && !promoLoading" class="note-pill muted ghost-fill">
              <Icon name="lucide:minus" size="13" />
              <span>Дополнительных бонусов сейчас нет</span>
            </div>
          </div>
        </section>
      </div>

      <footer class="mc-foot">
        <p v-if="error" class="inline-error">
          <Icon name="lucide:triangle-alert" size="15" />
          <span>{{ error }}</span>
        </p>

        <div class="foot-actions">
          <button class="action-btn ghost" type="button" @click="emitClose">
            <Icon name="lucide:x" size="15" />
            <span>Отмена</span>
          </button>
          <button class="action-btn primary" :disabled="submitting || amount <= 0" type="button" @click="submit">
            <Icon name="lucide:check" size="15" />
            <span>{{ submitting ? 'Сохранение...' : 'Применить' }}</span>
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { cpApi } from '../../api/cp'
import { hasRole, useCpAuthStore } from '../../stores/cpAuth'

const props = defineProps({
  open: { type: Boolean, default: false },
  client: { type: Object, default: null },
})

const emit = defineEmits(['close', 'done'])

const auth = useCpAuthStore()
const amountInput = ref(null)

const method = ref('cash')
const amountStr = ref('')
const manualBonusStr = ref('')
const submitting = ref(false)
const error = ref('')
const promoLoading = ref(false)
const promo = ref(null)
const promoError = ref('')

const canManualBonus = computed(() => hasRole(auth.operator, ['admin', 'owner']))
const amount = computed(() => toNumber(amountStr.value))
const manualBonus = computed(() => (canManualBonus.value ? toNumber(manualBonusStr.value) : 0))
const promoActive = computed(() => method.value === 'cash' && !!promo.value)
const promoBonus = computed(() => {
  if (!promo.value) return 0
  if (method.value !== 'cash') return 0
  if (promo.value?.type !== 'double_topup') return 0
  return amount.value > 0 ? amount.value : 0
})
const totalBonus = computed(() => promoBonus.value + manualBonus.value)

function emitClose() {
  emit('close')
}

function extractDigits(value) {
  return String(value ?? '').replace(/[^\d]/g, '')
}

function toNumber(value) {
  const parsed = Number(extractDigits(value))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatInputNumber(value) {
  const digits = extractDigits(value)
  if (!digits) return ''
  return Number(digits).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')
}

function onAmountInput() {
  amountStr.value = formatInputNumber(amountStr.value)
}

function onManualBonusInput() {
  manualBonusStr.value = formatInputNumber(manualBonusStr.value)
}

function formatUzs(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} UZS`
}

async function focusAmount() {
  await nextTick()
  amountInput.value?.focus?.()
}

async function fetchPromo() {
  if (method.value !== 'cash') {
    promoLoading.value = false
    promoError.value = ''
    return
  }

  promoError.value = ''
  promoLoading.value = true
  try {
    const response = await cpApi.promotionActiveForTopup({ payment_method: method.value })
    promo.value = response?.data?.data ?? null
  } catch (e) {
    promo.value = null
    promoError.value = e?.response?.data?.message || 'Не удалось проверить акцию.'
  } finally {
    promoLoading.value = false
  }
}

async function resetState() {
  method.value = 'cash'
  amountStr.value = ''
  manualBonusStr.value = ''
  error.value = ''
  promo.value = null
  promoError.value = ''
  await fetchPromo()
  await focusAmount()
}

onMounted(async () => {
  if (props.open) {
    await resetState()
  }
})

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    await resetState()
  },
  { immediate: true },
)

watch(
  () => method.value,
  async () => {
    if (!props.open) return
    await fetchPromo()
  },
)

async function submit() {
  if (!props.client?.id) return
  error.value = ''
  submitting.value = true

  try {
    const payload = {
      amount: amount.value,
      payment_method: method.value,
      bonus_amount: canManualBonus.value ? manualBonus.value : 0,
    }

    if (!payload.bonus_amount) delete payload.bonus_amount

    const response = await cpApi.topupClient(props.client.id, payload)
    const data = response?.data?.data?.data ?? response?.data?.data ?? response?.data ?? {}

    emit('done', {
      id: props.client.id,
      balance: data?.balance ?? data?.client?.balance ?? null,
      bonus: data?.bonus ?? data?.client?.bonus ?? null,
      lifetime_topup: data?.lifetime_topup ?? data?.client?.lifetime_topup ?? null,
      tier_id: data?.tier_id ?? data?.client?.tier_id ?? null,
    })
    emitClose()
  } catch (e) {
    const message = e?.response?.data?.message
    const errors = e?.response?.data?.errors
    const firstError = errors && typeof errors === 'object' ? Object.values(errors).flat().find(Boolean) : ''
    error.value = firstError || message || 'Ошибка пополнения'
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  promo.value = null
})
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
  width: min(960px, 100%);
  border-radius: 24px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  box-shadow: var(--shadow-panel);
  color: var(--text);
  overflow: hidden;
}

.mc-head,
.mc-foot {
  padding: 20px;
}

.mc-head {
  display: flex;
  align-items: flex-start;
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
  font-size: 30px;
  line-height: 1;
  color: var(--text);
}

.mc-sub {
  margin: 10px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.mc-icon-btn,
.method-btn,
.action-btn {
  border: 1px solid var(--stroke);
  border-radius: 14px;
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

.mc-summary-strip,
.mc-grid {
  padding: 18px 20px 0;
}

.mc-summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card,
.mc-panel,
.promo-banner {
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  border-radius: 20px;
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

.promo-banner {
  margin: 18px 20px 0;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 84px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-secondary) 14%, var(--surface-soft)),
    color-mix(in srgb, var(--success) 12%, var(--surface-soft))
  );
}

.promo-banner.muted {
  background: var(--surface-soft);
}

.promo-copy {
  min-width: 0;
}

.promo-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text);
}

.promo-banner p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.promo-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  font-size: 12px;
  text-transform: uppercase;
  background: var(--bg-elevated);
  color: var(--text);
  flex-shrink: 0;
}

.mc-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 16px;
}

.mc-panel {
  padding: 18px;
}

.panel-head h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.panel-head p {
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.field span,
.field small {
  color: var(--text-muted);
  font-size: 12px;
}

.field-shell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.field-input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  outline: none;
}

.field-input-lg {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

.method-btn:hover,
.action-btn:hover {
  border-color: color-mix(in srgb, var(--brand-secondary) 45%, var(--stroke));
}

.method-switch {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.method-btn {
  min-height: 64px;
  padding: 12px 14px;
  background: var(--bg-elevated);
  color: var(--text);
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  text-align: left;
  cursor: pointer;
}

.method-btn.active {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-secondary) 16%, var(--surface-soft)),
    color-mix(in srgb, var(--brand) 18%, var(--surface-soft))
  );
  border-color: color-mix(in srgb, var(--brand-secondary) 40%, var(--stroke));
}

.method-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-grid;
  place-items: center;
  background: color-mix(in srgb, var(--brand-secondary) 10%, var(--surface-soft));
  color: var(--brand-secondary);
}

.method-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.method-copy strong {
  font-size: 16px;
  color: var(--text);
}

.method-copy span {
  font-size: 12px;
  color: var(--text-muted);
}

.totals {
  display: grid;
  gap: 10px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--stroke);
}

.total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.total-row span {
  color: var(--text-muted);
  font-size: 13px;
}

.total-row strong {
  font-size: 20px;
  color: var(--text);
}

.total-method {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
}

.note-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  min-height: 38px;
  align-items: flex-start;
}

.note-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 999px;
  background: var(--surface-soft);
  border: 1px solid var(--stroke);
  font-size: 12px;
  color: var(--text-muted);
}

.note-pill.success {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, var(--stroke));
  background: color-mix(in srgb, var(--success) 10%, var(--surface-soft));
}

.note-pill.muted {
  color: var(--text-muted);
}

.note-pill.ghost-fill {
  width: 100%;
  justify-content: center;
}

.mc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid var(--stroke);
}

.foot-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.action-btn {
  min-height: 44px;
  padding: 0 16px;
  background: var(--surface-soft);
  color: var(--text);
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--brand-secondary), color-mix(in srgb, var(--brand-secondary) 72%, var(--brand) 28%));
  border-color: color-mix(in srgb, var(--brand-secondary) 45%, var(--stroke));
  color: #fff;
}

.action-btn.ghost {
  background: var(--surface-soft);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.inline-error {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 860px) {
  .mc-overlay {
    padding: 16px;
  }

  .mc-summary-strip,
  .mc-grid {
    grid-template-columns: 1fr;
  }

  .mc-head h2 {
    font-size: 24px;
  }

  .mc-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .foot-actions {
    width: 100%;
    margin-left: 0;
  }

  .action-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
