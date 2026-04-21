<template>
  <el-dialog
      v-model="open"
      width="560px"
      :title="null"
      :show-close="true"
      class="mc-glass-dialog"
      modal-class="mc-glass-overlay"
      align-center
  >
    <!-- Header -->
    <div class="mc-hdr">
        <div class="mc-row">
          <div>
          <div class="mc-title">Balansni to'ldirish</div>
          <div class="mc-sub">
            ПК: <span class="mc-pill">{{ pc?.name || '' }}</span>
            <span class="mc-muted">•</span>
            Zona: <span class="mc-pill ghost">{{ pc?.zone || '' }}</span>
          </div>
        </div>

        <div style="text-align:right; min-width: 170px;">
          <div class="mc-muted" style="font-size:12px;">Joriy balans</div>
          <div class="mc-balance">{{ money(pc?.client_balance) }}</div>
        </div>
      </div>
    </div>

    <!-- Client -->
    <div class="mc-card">
      <div class="mc-row">
        <div style="min-width: 240px;">
          <div class="mc-muted" style="font-size:12px;">Mijoz</div>
          <div class="mc-client">
            <div class="mc-avatar">👤</div>
            <div class="mc-client-name">{{ pc?.client || '—' }}</div>
          </div>
        </div>

        <div style="text-align:right; min-width: 220px;">
          <div class="mc-muted" style="font-size:12px;">Taxminiy vaqt</div>
          <div style="margin-top:8px; font-weight:950; color: rgba(255,255,255,.92);">
            {{ predictedTime }}
            <span class="mc-muted" style="font-weight:700; font-size:12px;">zona tarifi bo'yicha</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Amount -->
    <div class="mc-card">
      <div class="mc-muted" style="font-size:12px;">To'ldirish summasi</div>

      <div class="mc-amount-row">
        <button class="mc-step" @click="step(-5000)">−</button>

        <div class="mc-amount-box">
          <el-input
              v-model="amountText"
              inputmode="numeric"
              placeholder="0"
              size="large"
              class="mc-amount-input"
              @input="onAmountInput"
              @blur="normalizeAmount"
          >
            <template #suffix>
              <span style="color: rgba(255,255,255,.60); font-weight:800; font-size:12px;">UZS</span>
            </template>
          </el-input>

          <div class="mc-muted" style="font-size:12px; margin-top:6px;">
            Yangi summa darhol balansga qo'shiladi.
          </div>
        </div>

        <button class="mc-step" @click="step(5000)">+</button>
      </div>

      <div class="mc-chips">
        <button class="mc-chip" @click="quick(5000)">+ 5 000</button>
        <button class="mc-chip" @click="quick(10000)">+ 10 000</button>
        <button class="mc-chip" @click="quick(20000)">+ 20 000</button>
        <button class="mc-chip" @click="quick(50000)">+ 50 000</button>
      </div>

      <div class="mc-muted" style="font-size:11px; margin-top:10px;">
        * Yakuniy balans = joriy balans + kiritilgan summa.
      </div>
    </div>

    <template #footer>
      <div class="mc-footer">
        <el-button @click="open=false">Bekor qilish</el-button>
        <el-button type="primary" :disabled="amount<=0" @click="submit">Tasdiqlash</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  pc: Object,
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const amount = ref(15000)

watch(open, (v) => {
  if (v) amount.value = 15000
  syncTextFromAmount()
})

const step = (delta) => {
  amount.value = Math.max(0, Number(amount.value || 0) + delta)
  syncTextFromAmount()
}

const quick = (n) => {
  amount.value = Number(amount.value || 0) + n
  syncTextFromAmount()
}
const submit = () => {
  emit('confirm', { amount: Number(amount.value) })
  open.value = false
}

const money = (v) => Number(v || 0).toLocaleString('ru-RU') + ' UZS'

const predictedTime = computed(() => {
  const bal = Number(props.pc?.client_balance || 0) + Number(amount.value || 0)
  const pph = Number(props.pc?.zone_price_per_hour || 0)
  if (!pph) return '—'
  const sec = Math.floor((bal / pph) * 3600)
  const h = String(Math.floor(sec / 3600)).padStart(2, '0')
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
  return `${h}:${m}`
})

const amountText = ref('15000')

const formatNumber = (n) => Number(n || 0).toLocaleString('ru-RU')
const parseNumber = (s) => Number(String(s || '').replace(/[^\d]/g, '') || 0)

const syncTextFromAmount = () => {
  amountText.value = formatNumber(amount.value)
}

const onAmountInput = (val) => {
  // faqat raqam qolsin
  const n = parseNumber(val)
  amount.value = n
  amountText.value = formatNumber(n)
}

const normalizeAmount = () => {
  // blur bo'lganda qiymatni qayta formatlaydi
  const n = Math.max(0, parseNumber(amountText.value))
  amount.value = n
  amountText.value = formatNumber(n)
}
</script>

