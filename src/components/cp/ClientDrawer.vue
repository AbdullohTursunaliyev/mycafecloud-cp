<template>
  <el-drawer v-model="open" size="520px" :with-header="false" class="mc-drawer">
    <div class="drawer-head">
      <div>
        <div class="h1">Mijoz kartasi</div>
        <div class="muted" style="margin-top:6px">{{ client?.login || '—' }}</div>
      </div>
      <div style="text-align:right">
        <div class="muted" style="font-size:12px">Joriy balans</div>
        <div style="font-weight:950;font-size:18px">{{ money(client?.balance) }}</div>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="card-flat" style="padding:12px">
      <div class="row" style="justify-content:space-between">
        <div>
          <div class="muted">Ism</div>
          <div style="font-weight:900;margin-top:6px">{{ client?.name || '—' }}</div>
        </div>
        <el-button type="primary" round @click="$emit('topup')">Balans to'ldirish</el-button>
      </div>
    </div>

    <div class="spacer"></div>

      <div class="card-flat" style="padding:12px">
      <div class="row" style="justify-content:space-between;align-items:center">
        <div class="h2">Tarix</div>
        <el-button @click="$emit('reload')">Yangilash</el-button>
      </div>

      <div style="margin-top:10px">
        <el-empty v-if="!history?.length" description="Hozircha operatsiyalar yo'q" />
        <div v-else class="hist">
          <div v-for="h in history" :key="h.id" class="hist-row">
            <div>
              <div style="font-weight:900">{{ h.type || 'Operatsiya' }}</div>
              <div class="muted" style="font-size:12px;margin-top:4px">{{ h.created_at || '' }}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:950">{{ money(h.amount || 0) }}</div>
              <div class="muted" style="font-size:12px;margin-top:4px">{{ h.note || '' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  client: Object,
  history: Array,
})
const emit = defineEmits(['update:modelValue','topup','reload'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const money = (v) => Number(v || 0).toLocaleString('ru-RU') + ' UZS'
</script>

<style scoped>
:deep(.mc-drawer .el-drawer){
  background: rgba(8,12,22,.94);
  border-left: 1px solid rgba(255,255,255,.10);
}
.drawer-head{
  padding:14px;
  border-bottom:1px solid rgba(255,255,255,.08);
  background: rgba(2,6,23,.25);
  display:flex;
  justify-content:space-between;
  gap:12px;
}
.hist{display:flex;flex-direction:column;gap:10px;margin-top:10px}
.hist-row{
  padding:10px 12px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(15,23,42,.55);
  display:flex;
  justify-content:space-between;
  gap:12px;
}
</style>

