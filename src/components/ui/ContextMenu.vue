<template>
  <teleport to="body">
    <div v-if="open" class="cm-backdrop" @mousedown="close"></div>

    <div
        v-if="open"
        class="cm"
        :style="{ left: x + 'px', top: y + 'px' }"
        @mousedown.stop
    >
      <div v-if="title" class="cm-title">{{ title }}</div>

      <button
          v-for="(item, i) in items"
          :key="i"
          class="cm-item"
          :class="{ danger: item.danger, disabled: item.disabled }"
          :disabled="item.disabled"
          @click="onClick(item)"
      >
        <span class="cm-label">{{ item.label }}</span>
        <span v-if="item.hint" class="cm-hint">{{ item.hint }}</span>
      </button>
    </div>
  </teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: Boolean,
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  title: { type: String, default: '' },
  items: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'select'])

function close() {
  emit('close')
}

function onClick(item) {
  if (item.disabled) return
  emit('select', item)
  close()
}

function esc(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', esc))
onBeforeUnmount(() => window.removeEventListener('keydown', esc))
</script>

<style scoped>
.cm-backdrop{
  position:fixed; inset:0;
  background: transparent;
  z-index: 9998;
}
.cm{
  position:fixed;
  z-index: 9999;
  min-width: 260px;
  border-radius: 14px;
  padding: 8px;
  background: rgba(12,18,30,.92);
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: 0 18px 60px rgba(0,0,0,.55);
  backdrop-filter: blur(14px);
}
.cm-title{
  padding: 10px 10px 8px;
  font-weight: 700;
  font-size: 13px;
  color: rgba(255,255,255,.82);
  border-bottom: 1px solid rgba(255,255,255,.06);
  margin-bottom: 6px;
}
.cm-item{
  width:100%;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 10px;
  border-radius: 12px;
  background: transparent;
  border: 0;
  cursor:pointer;
  color: rgba(255,255,255,.9);
}
.cm-item:hover{ background: rgba(255,255,255,.06); }
.cm-item.danger{ color: rgba(255,120,120,.95); }
.cm-item.disabled{ opacity:.45; cursor:not-allowed; }
.cm-hint{ font-size: 12px; color: rgba(255,255,255,.55); }
</style>

