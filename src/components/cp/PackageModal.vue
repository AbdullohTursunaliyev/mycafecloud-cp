<template>
  <el-dialog
      v-model="open"
      width="720px"
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
          <div class="mc-title">Paket biriktirish</div>
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

    <!-- Filters -->
    <div class="mc-card">
      <div class="pkg-toolbar">
        <el-input
            v-model="q"
            class="pkg-search"
            placeholder="Paket nomi bo'yicha qidiruv"
            clearable
        />
        <el-select v-model="zone" placeholder="Zona" style="width: 180px">
          <el-option label="Barchasi" value="all" />
          <el-option label="VIP" value="VIP" />
          <el-option label="A-ZONE" value="A-ZONE" />
          <el-option label="B-ZONE" value="B-ZONE" />
        </el-select>
        <el-button @click="mockReload">Yangilash</el-button>
      </div>

      <!-- Grid -->
      <div class="pkg-grid">
        <div
            v-for="p in filtered"
            :key="p.id"
            class="pkg-card"
            :class="{ active: selected?.id === p.id }"
            @click="select(p)"
        >
          <div class="pkg-check">✓</div>

          <div class="pkg-top">
            <div>
              <div class="pkg-name">{{ p.name }}</div>
              <div class="pkg-desc">{{ p.description }}</div>
            </div>

            <div class="pkg-price">
              {{ money(p.price) }}
              <div class="mc-muted" style="font-size:12px; font-weight:700; margin-top:2px;">
                {{ p.hours }} soat
              </div>
            </div>
          </div>

          <div class="pkg-meta">
            <span class="pkg-tag zone">{{ p.zone }}</span>
            <span class="pkg-tag good">Faol</span>
            <span class="pkg-tag">{{ p.type }}</span>
          </div>
        </div>
      </div>

      <div class="pkg-summary">
        <div>
          <div class="mc-muted" style="font-size:12px;">Tanlangan paket</div>
          <div v-if="selected">
            <strong>{{ selected.name }}</strong>
            <span class="mc-muted"> • {{ selected.hours }} soat • {{ selected.zone }}</span>
          </div>
          <div v-else class="mc-muted">Hali paket tanlanmagan</div>
        </div>

        <div style="text-align:right;">
          <div class="mc-muted" style="font-size:12px;">Narx</div>
          <div style="font-weight:950; color: rgba(255,255,255,.92);">
            {{ selected ? money(selected.price) : '—' }}
          </div>
        </div>
      </div>

      <div class="mc-muted" style="font-size:11px; margin-top:10px;">
        * Paket tanlangandan keyin u sessiyaga biriktiriladi.
      </div>
    </div>

    <template #footer>
      <div class="mc-footer">
        <el-button @click="open=false">Bekor qilish</el-button>
        <el-button type="primary" :disabled="!selected" @click="submit">Biriktirish</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  pc: Object,
  // keyinchalik API bilan keladi, hozir mock:
  packages: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const q = ref('')
const zone = ref('all')
const selected = ref(null)

watch(open, (v) => {
  if (v) {
    q.value = ''
    zone.value = props.pc?.zone || 'all'
    selected.value = null
  }
})

const basePackages = computed(() => {
  return props.packages?.length ? props.packages : []
})

const filtered = computed(() => {
  const text = q.value.trim().toLowerCase()
  return basePackages.value
      .filter(p => zone.value === 'all' ? true : p.zone === zone.value)
      .filter(p => text ? (p.name.toLowerCase().includes(text) || p.description.toLowerCase().includes(text)) : true)
})

const select = (p) => {
  selected.value = p
}

const submit = () => {
  emit('confirm', { package: selected.value })
  open.value = false
}

const money = (v) => Number(v || 0).toLocaleString('ru-RU') + ' UZS'

// faqat UI uchun
const mockReload = () => {}
</script>

