<template>
  <div v-if="open" class="mc-overlay" @mousedown.self="emitClose">
    <div class="mc-modal">
      <header class="mc-head">
        <div>
          <p class="mc-kicker">TRANSFER</p>
          <h2>Перевод между клиентами</h2>
          <p class="mc-sub">Отправитель: <strong>{{ client?.login || '-' }}</strong></p>
        </div>

        <button class="mc-icon-btn" type="button" @click="emitClose">
          <Icon name="lucide:x" size="18" />
        </button>
      </header>

      <section class="summary-row">
        <article class="summary-card">
          <div class="summary-label">
            <Icon name="lucide:wallet" size="15" />
            <span>Доступный баланс</span>
          </div>
          <strong>{{ money(availableBalance) }} UZS</strong>
        </article>

        <article class="summary-card">
          <div class="summary-label">
            <Icon name="lucide:user-round-search" size="15" />
            <span>Получатель</span>
          </div>
          <strong>{{ toClient?.login || 'Не выбран' }}</strong>
        </article>
      </section>

      <div class="content-grid">
        <section class="panel">
          <div class="panel-head">
            <h3>
              <Icon name="lucide:user-search" size="17" />
              <span>Получатель</span>
            </h3>
          </div>

          <label class="field">
            <span>Поиск по логину, телефону или ID</span>
            <div class="field-shell">
              <Icon name="lucide:search" size="16" />
              <input
                v-model.trim="query"
                class="field-input"
                type="text"
                placeholder="Начните вводить..."
              />
            </div>
          </label>

          <p v-if="searching" class="hint">
            <Icon name="lucide:loader-circle" size="15" />
            <span>Ищем клиента...</span>
          </p>

          <div v-else-if="filteredClients.length" class="result-list">
            <button
              v-for="item in filteredClients"
              :key="item.id"
              class="result-item"
              type="button"
              @click="selectReceiver(item)"
            >
              <div class="result-copy">
                <strong>{{ item.login || item.phone || (`#${item.id}`) }}</strong>
                <span>ID: {{ item.id }}</span>
              </div>
              <Icon name="lucide:arrow-right" size="15" />
            </button>
          </div>

          <p v-else-if="query" class="hint">
            <Icon name="lucide:inbox" size="15" />
            <span>Совпадения не найдены.</span>
          </p>

          <div v-if="toClient" class="picked-card">
            <div class="picked-copy">
              <span>Выбран получатель</span>
              <strong>{{ toClient.login || toClient.phone || (`#${toClient.id}`) }}</strong>
            </div>
            <button class="small-btn" type="button" @click="clearReceiver">
              <Icon name="lucide:rotate-ccw" size="14" />
              <span>Сменить</span>
            </button>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <h3>
              <Icon name="lucide:banknote-arrow-right" size="17" />
              <span>Сумма</span>
            </h3>
          </div>

          <label class="field">
            <span>Сумма перевода (UZS)</span>
            <div class="field-shell">
              <Icon name="lucide:banknote" size="16" />
              <input
                v-model="amountStr"
                class="field-input"
                inputmode="numeric"
                placeholder="0"
                @input="onAmountInput"
              />
            </div>
          </label>

          <div class="quick-grid">
            <button class="quick-chip" type="button" @click="setAmountByShare(0.25)">
              <Icon name="lucide:pie-chart" size="14" />
              <span>25%</span>
            </button>
            <button class="quick-chip" type="button" @click="setAmountByShare(0.5)">
              <Icon name="lucide:pie-chart" size="14" />
              <span>50%</span>
            </button>
            <button class="quick-chip" type="button" @click="setAmountByShare(1)">
              <Icon name="lucide:pie-chart" size="14" />
              <span>100%</span>
            </button>
          </div>

          <div class="totals">
            <div class="total-row">
              <span>Сумма</span>
              <strong>{{ money(amount || 0) }} UZS</strong>
            </div>
            <div class="total-row">
              <span>Остаток после перевода</span>
              <strong>{{ money(balanceAfterTransfer) }} UZS</strong>
            </div>
          </div>

          <p v-if="amountError" class="inline-error">
            <Icon name="lucide:triangle-alert" size="15" />
            <span>{{ amountError }}</span>
          </p>
          <p v-if="error" class="inline-error">
            <Icon name="lucide:circle-alert" size="15" />
            <span>{{ error }}</span>
          </p>
        </section>
      </div>

      <footer class="mc-foot">
        <p class="hint">
          <Icon name="lucide:shield-check" size="15" />
          <span>Перевод работает только из текущего баланса клиента.</span>
        </p>
        <div class="foot-actions">
          <button class="action-btn ghost" type="button" @click="emitClose">
            <Icon name="lucide:x" size="15" />
            <span>Отмена</span>
          </button>
          <button class="action-btn primary" :disabled="!canSubmit || submitting" type="button" @click="submit">
            <Icon :name="submitting ? 'lucide:loader-circle' : 'lucide:arrow-right-left'" size="15" />
            <span>{{ submitting ? 'Переводим...' : 'Перевести' }}</span>
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { cpApi } from '../../api/cp'

const props = defineProps({
  open: { type: Boolean, default: false },
  client: { type: Object, default: null },
})

const emit = defineEmits(['close', 'done'])

const query = ref('')
const toClient = ref(null)
const amountStr = ref('')
const error = ref('')
const submitting = ref(false)
const searching = ref(false)
const searchResults = ref([])
let searchTimer = null

const availableBalance = computed(() => Number(props.client?.balance || 0))
const amount = computed(() => toNumber(amountStr.value))
const balanceAfterTransfer = computed(() => Math.max(availableBalance.value - amount.value, 0))

const filteredClients = computed(() => {
  if (!query.value) return []
  return searchResults.value
    .filter((client) => client && Number(client.id) !== Number(props.client?.id))
    .slice(0, 8)
})

const amountError = computed(() => {
  if (amount.value <= 0 && amountStr.value) return 'Введите корректную сумму'
  if (amount.value > availableBalance.value) return 'Сумма больше доступного баланса'
  return ''
})

const canSubmit = computed(() => {
  return !!toClient.value && amount.value > 0 && amount.value <= availableBalance.value && !amountError.value
})

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

function selectReceiver(client) {
  toClient.value = client
  query.value = ''
}

function clearReceiver() {
  toClient.value = null
}

function setAmountByShare(share) {
  amountStr.value = formatInputNumber(Math.floor(availableBalance.value * share))
}

function money(value) {
  return Number(value || 0).toLocaleString('ru-RU')
}

async function submit() {
  if (!props.client?.id || !toClient.value || !canSubmit.value) return
  submitting.value = true
  error.value = ''

  try {
    const payload = {
      to_client_id: toClient.value.id,
      amount: amount.value,
    }
    const response = await cpApi.clientTransfer(props.client.id, payload)
    emit('done', response?.data?.data ?? response?.data ?? null)
    emitClose()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Перевод не выполнен'
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    query.value = ''
    toClient.value = null
    amountStr.value = ''
    error.value = ''
    searchResults.value = []
  },
)

watch(query, () => {
  if (!props.open) return
  clearTimeout(searchTimer)
  if (!query.value) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const response = await cpApi.clients({ search: query.value, page: 1 })
      const payload = response?.data?.data ?? response?.data ?? {}
      searchResults.value = Array.isArray(payload?.data) ? payload.data : []
    } catch {
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 220)
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
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
  width: min(920px, 100%);
  border-radius: 24px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  color: var(--text);
  box-shadow: var(--shadow-panel);
}

.mc-head,
.mc-foot {
  padding: 20px;
}

.mc-head {
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

.mc-sub,
.hint {
  color: var(--text-muted);
  font-size: 13px;
}

.mc-icon-btn,
.quick-chip,
.small-btn,
.action-btn,
.result-item {
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

.summary-row,
.content-grid {
  padding: 18px 20px 0;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-card,
.panel,
.picked-card {
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
  font-size: 20px;
  color: var(--text);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.panel {
  padding: 18px;
}

.panel-head h3,
.panel h3 {
  margin: 0 0 14px;
  font-size: 18px;
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
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

.result-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  max-height: 260px;
  overflow: auto;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-elevated);
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.result-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-item span {
  color: var(--text-muted);
  font-size: 12px;
}

.picked-card {
  margin-top: 14px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.picked-copy span {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
}

.picked-copy strong {
  display: block;
  margin-top: 6px;
}

.quick-grid {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.quick-chip,
.small-btn,
.action-btn {
  min-height: 42px;
  padding: 0 14px;
  background: var(--surface-soft);
  color: var(--text);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
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

.inline-error {
  margin: 14px 0 0;
  color: var(--danger);
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

.action-btn.primary {
  background: linear-gradient(135deg, var(--brand-secondary), color-mix(in srgb, var(--brand-secondary) 72%, var(--brand) 28%));
  color: #fff;
  border-color: color-mix(in srgb, var(--brand-secondary) 45%, var(--stroke));
}

.action-btn.ghost {
  background: var(--surface-soft);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 860px) {
  .summary-row,
  .content-grid {
    grid-template-columns: 1fr;
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
