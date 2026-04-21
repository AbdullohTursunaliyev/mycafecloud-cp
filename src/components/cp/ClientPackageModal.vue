<template>
  <div v-if="open" class="mc-modal-overlay" @mousedown.self="emitClose">
    <div class="mc-modal">
      <div class="mc-head">
        <div>
          <div class="mc-kicker">PACKAGE</div>
          <div class="mc-title">Добавить пакет</div>
          <div class="mc-sub">Клиент: <b>{{ client?.login || '-' }}</b></div>
        </div>
        <button class="mc-x" type="button" @click="emitClose">×</button>
      </div>

      <div class="mc-balance">
        <div class="mc-balance-copy">
          <span class="balance-label">
            <Icon name="lucide:wallet" size="14" />
            <span>Баланс клиента</span>
          </span>
          <strong class="balance-strong">{{ formatUzs(client?.balance ?? 0) }}</strong>
        </div>
        <div v-if="selectedPackage" class="mc-balance-copy align-end">
          <span class="balance-label">
            <Icon name="lucide:package-check" size="14" />
            <span>Выбранный пакет</span>
          </span>
          <strong class="balance-strong">{{ selectedPackage.name }}</strong>
        </div>
      </div>

      <div class="mc-grid">
        <section class="mc-card">
          <div class="row between">
            <div class="mc-card-title with-icon">
              <Icon name="lucide:package-search" size="15" />
              <span>Выбор пакета</span>
            </div>
            <button class="mc-btn ghost small" :disabled="loading" @click="load">
              <Icon name="lucide:refresh-cw" size="14" />
              <span>{{ loading ? 'Загрузка...' : 'Обновить' }}</span>
            </button>
          </div>

          <div v-if="loadError" class="mc-error">{{ loadError }}</div>

          <div v-if="!loading && !packages.length" class="empty">
            Пакетов пока нет. Сначала создайте пакет в разделе «Пакеты».
          </div>

          <div v-if="packages.length" class="pk-list">
            <button
              v-for="item in packages"
              :key="item.id"
              class="pk-item"
              :class="{ active: selectedPackage && selectedPackage.id === item.id }"
              type="button"
              @click="select(item)"
            >
              <div class="pk-top">
                <div>
                  <div class="pk-name">{{ item.name }}</div>
                  <div class="pk-meta">
                    <span class="meta-chip">
                      <Icon name="lucide:map-pinned" size="13" />
                      <span>{{ item.zone || 'Без зоны' }}</span>
                    </span>
                    <span class="meta-chip">
                      <Icon name="lucide:timer-reset" size="13" />
                      <span>{{ item.duration_min }} мин</span>
                    </span>
                    <span class="meta-chip">
                      <Icon name="lucide:gauge" size="13" />
                      <span>{{ perHourText(item) }}</span>
                    </span>
                  </div>
                </div>

                <div class="pk-price">{{ formatUzs(item.price) }}</div>
              </div>
            </button>
          </div>
        </section>

        <section class="mc-card">
          <div class="mc-card-title with-icon">
            <Icon name="lucide:banknote" size="15" />
            <span>Оплата</span>
          </div>

          <div class="mc-seg">
            <button class="mc-seg-btn" :class="{ active: payMethod === 'balance' }" type="button" @click="payMethod = 'balance'">
              <div class="seg-icon"><Icon name="lucide:wallet-cards" size="16" /></div>
              <div class="seg-copy">
                <strong>С баланса</strong>
                <span>Списание у клиента</span>
              </div>
            </button>

            <button class="mc-seg-btn" :class="{ active: payMethod === 'cash' }" type="button" @click="payMethod = 'cash'">
              <div class="seg-icon"><Icon name="lucide:wallet" size="16" /></div>
              <div class="seg-copy">
                <strong>Наличные</strong>
                <span>Через кассу</span>
              </div>
            </button>

            <button class="mc-seg-btn" :class="{ active: payMethod === 'card' }" type="button" @click="payMethod = 'card'">
              <div class="seg-icon"><Icon name="lucide:credit-card" size="16" /></div>
              <div class="seg-copy">
                <strong>Карта</strong>
                <span>Безналичная оплата</span>
              </div>
            </button>
          </div>

          <div class="mc-summary">
            <div class="summary-row">
              <span class="summary-label">К оплате</span>
              <strong class="summary-value">{{ formatUzs(price) }}</strong>
            </div>

            <div class="summary-method">
              <Icon :name="methodIcon" size="15" />
              <span>{{ methodLabel }}</span>
            </div>

            <p class="hint">
              {{ payMethod === 'balance'
                ? 'Сумма будет списана с баланса клиента.'
                : 'Сумма попадет в текущую смену как оплата через кассу.' }}
            </p>
          </div>

          <div v-if="payMethod === 'balance' && !canPayFromBalance" class="alert danger">
            <Icon name="lucide:triangle-alert" size="15" />
            <span>Недостаточно средств на балансе клиента.</span>
          </div>

          <div v-if="submitError" class="alert danger">
            <Icon name="lucide:circle-alert" size="15" />
            <span>{{ submitError }}</span>
          </div>
        </section>
      </div>

      <div class="mc-actions">
        <button class="mc-btn ghost" type="button" @click="emitClose">
          <Icon name="lucide:x" size="15" />
          <span>Отмена</span>
        </button>
        <button class="mc-btn primary" type="button" :disabled="submitting || !selectedPackage || !canSubmit" @click="submit">
          <Icon name="lucide:check" size="15" />
          <span>{{ submitting ? 'Сохранение...' : 'Применить' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { cpApi } from '../../api/cp'

const props = defineProps({
  open: { type: Boolean, default: false },
  client: { type: Object, default: null },
})

const emit = defineEmits(['close', 'done'])

const loading = ref(false)
const submitting = ref(false)
const loadError = ref('')
const submitError = ref('')

const packages = ref([])
const selectedPackage = ref(null)
const payMethod = ref('balance')

function formatUzs(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} UZS`
}

function perHourText(item) {
  const price = Number(item?.price || 0)
  const mins = Number(item?.duration_min || 0)
  if (!mins || mins <= 0) return '—'
  const perHour = Math.round((price / mins) * 60)
  return `${perHour.toLocaleString('ru-RU')} UZS/час`
}

function emitClose() {
  emit('close')
}

function select(item) {
  selectedPackage.value = item
  submitError.value = ''
}

const price = computed(() => Number(selectedPackage.value?.price || 0))
const clientBalance = computed(() => Number(props.client?.balance || 0))
const canPayFromBalance = computed(() => clientBalance.value >= price.value)

const canSubmit = computed(() => {
  if (!selectedPackage.value) return false
  if (payMethod.value === 'balance') return canPayFromBalance.value
  return true
})

const methodLabel = computed(() => {
  if (payMethod.value === 'balance') return 'С баланса клиента'
  if (payMethod.value === 'cash') return 'Наличные'
  if (payMethod.value === 'card') return 'Карта'
  return payMethod.value
})

const methodIcon = computed(() => {
  if (payMethod.value === 'balance') return 'lucide:wallet-cards'
  if (payMethod.value === 'cash') return 'lucide:wallet'
  if (payMethod.value === 'card') return 'lucide:credit-card'
  return 'lucide:circle-dollar-sign'
})

function getPackagesApiFn() {
  return cpApi.packages || cpApi.packageList || cpApi.packagesList || null
}

let loadSeq = 0
async function load() {
  if (!props.open) return

  const fn = getPackagesApiFn()
  if (!fn) {
    loadError.value = 'Не найден метод загрузки пакетов в api/cp.js'
    packages.value = []
    return
  }

  const seq = ++loadSeq
  loading.value = true
  loadError.value = ''

  try {
    const response = await fn({ active: 1, per_page: 200, page: 1 })
    const raw = response?.data?.data ?? response?.data ?? {}
    const list =
      Array.isArray(raw?.data) ? raw.data :
      Array.isArray(raw) ? raw :
      Array.isArray(raw?.data?.data) ? raw.data.data :
      []

    if (seq !== loadSeq) return
    packages.value = Array.isArray(list) ? list : []
  } catch (e) {
    if (seq !== loadSeq) return
    packages.value = []
    loadError.value = e?.response?.data?.message || e?.message || 'Не удалось загрузить пакеты'
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    loadError.value = ''
    submitError.value = ''
    selectedPackage.value = null
    payMethod.value = 'balance'
    await nextTick()
    await load()
  },
  { immediate: true }
)

async function submit() {
  if (!props.client?.id || !selectedPackage.value?.id) return

  submitError.value = ''
  submitting.value = true

  try {
    const payload = {
      package_id: selectedPackage.value.id,
      payment_method: payMethod.value,
    }

    const response = await cpApi.attachClientPackage(props.client.id, payload)
    const data = response?.data?.data ?? response?.data ?? null

    emit('done', data)
    emitClose()
  } catch (e) {
    submitError.value = e?.response?.data?.message || e?.message || 'Ошибка добавления пакета'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.mc-modal,
.mc-card,
.mc-grid,
.mc-balance {
  box-sizing: border-box;
}

.mc-grid > * {
  min-width: 0;
}

.row {
  display: flex;
  align-items: center;
}

.between {
  justify-content: space-between;
}

.mc-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 9999;
}

.mc-modal {
  width: min(1040px, 100%);
  border-radius: 24px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  box-shadow: var(--shadow-panel);
  padding: 20px;
  color: var(--text);
}

.mc-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 14px;
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
  font-size: 28px;
  font-weight: 900;
}

.mc-sub {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

.mc-x,
.mc-btn,
.mc-seg-btn {
  border: 1px solid var(--stroke);
  border-radius: 14px;
  font: inherit;
}

.mc-x {
  width: 40px;
  height: 40px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 24px;
}

.mc-balance {
  margin-top: 16px;
  border-radius: 18px;
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--stroke);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
}

.mc-balance-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mc-balance-copy.align-end {
  text-align: right;
}

.balance-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.balance-strong {
  font-size: 22px;
  line-height: 1.1;
  color: var(--text);
}

.mc-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;
}

.mc-card {
  border-radius: 20px;
  padding: 16px;
  background: var(--surface-soft);
  border: 1px solid var(--stroke);
  overflow: hidden;
}

.mc-card-title {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.with-icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.mc-seg {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mc-seg-btn {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-height: 68px;
  padding: 12px 14px;
  background: var(--bg-elevated);
  color: var(--text);
  font-weight: 700;
  text-align: left;
}

.mc-seg-btn.active {
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 16%, var(--surface-soft)), color-mix(in srgb, var(--brand) 18%, var(--surface-soft)));
  border-color: color-mix(in srgb, var(--brand-secondary) 40%, var(--stroke));
}

.seg-icon {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--brand-secondary) 8%, var(--surface-soft));
  color: var(--brand-secondary);
}

.seg-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.seg-copy strong {
  font-size: 16px;
  color: var(--text);
}

.seg-copy span {
  font-size: 12px;
  color: var(--text-muted);
}

.mc-summary {
  margin-top: 16px;
  border-radius: 18px;
  padding: 14px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--stroke);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.summary-label {
  font-size: 12px;
  color: var(--text-muted);
}

.summary-value {
  font-size: 24px;
  color: var(--text);
}

.summary-method {
  margin-top: 12px;
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

.hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.mc-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.mc-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  background: var(--surface-soft);
  color: var(--text);
  font-weight: 800;
}

.mc-btn.ghost {
  background: var(--surface-soft);
}

.mc-btn.primary {
  background: linear-gradient(135deg, var(--brand-secondary), color-mix(in srgb, var(--brand-secondary) 72%, var(--brand) 28%));
  border-color: color-mix(in srgb, var(--brand-secondary) 45%, var(--stroke));
  color: #fff;
}

.mc-btn.small {
  min-height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  font-size: 12px;
}

.mc-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.mc-error {
  margin-top: 10px;
  font-size: 12px;
  color: var(--danger);
}

.alert {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 12px;
  border: 1px solid color-mix(in srgb, var(--danger) 28%, var(--stroke));
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.alert.danger {
  background: color-mix(in srgb, var(--danger) 10%, var(--surface-soft));
  color: var(--danger);
}

.empty {
  padding: 14px;
  border-radius: 14px;
  border: 1px dashed var(--stroke);
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: 12px;
}

.pk-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.pk-item {
  text-align: left;
  border-radius: 16px;
  padding: 14px;
  border: 1px solid var(--stroke);
  background: var(--bg-elevated);
  color: var(--text);
}

.pk-item.active {
  border-color: color-mix(in srgb, var(--brand-secondary) 46%, var(--stroke));
  background: color-mix(in srgb, var(--brand-secondary) 10%, var(--bg-elevated));
}

.pk-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.pk-name {
  font-weight: 900;
  font-size: 18px;
}

.pk-price {
  font-weight: 900;
  font-size: 18px;
  white-space: nowrap;
  color: var(--text);
}

.pk-meta {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
}

@media (max-width: 980px) {
  .mc-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .mc-modal-overlay {
    padding: 14px;
  }

  .mc-modal {
    padding: 16px;
  }

  .mc-balance,
  .summary-row,
  .mc-actions,
  .pk-top {
    flex-direction: column;
    align-items: stretch;
  }

  .mc-balance-copy.align-end {
    text-align: left;
  }

  .mc-btn,
  .mc-seg-btn {
    width: 100%;
  }
}
</style>
