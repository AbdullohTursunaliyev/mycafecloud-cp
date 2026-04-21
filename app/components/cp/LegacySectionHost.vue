<template>
  <div class="legacy-shell">
    <PageHero :eyebrow="eyebrow" :title="title" :subtitle="subtitle" />

    <section class="legacy-frame">
      <Suspense>
        <component :is="component" />
        <template #fallback>
          <div class="legacy-loading">Sahifa yuklanmoqda...</div>
        </template>
      </Suspense>
    </section>
  </div>
</template>

<script setup>
import PageHero from './PageHero.vue'

defineProps({
  component: { type: [Object, Function], required: true },
  eyebrow: { type: String, default: 'Control section' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.legacy-shell {
  display: grid;
  gap: 18px;
}

.legacy-frame {
  padding: 18px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--stroke);
  background:
    linear-gradient(180deg, var(--surface-strong), var(--surface)),
    var(--surface);
  box-shadow: var(--shadow-panel);
}

.legacy-loading {
  padding: 28px;
  border-radius: var(--radius-md);
  border: 1px dashed var(--stroke-strong);
  text-align: center;
  color: var(--text-muted);
}

.legacy-shell :deep(.page),
.legacy-shell :deep(.cp-page),
.legacy-shell :deep(.reports-page),
.legacy-shell :deep(.op-dashboard) {
  padding: 0 !important;
  display: grid;
  gap: 16px;
}

.legacy-shell :deep(.toolbar),
.legacy-shell :deep(.cp-head),
.legacy-shell :deep(.top),
.legacy-shell :deep(.hero),
.legacy-shell :deep(.cp-card),
.legacy-shell :deep(.panel),
.legacy-shell :deep(.actions),
.legacy-shell :deep(.card-flat),
.legacy-shell :deep(.glass) {
  border-radius: var(--radius-md) !important;
  border-color: var(--stroke) !important;
  background: var(--surface) !important;
  box-shadow: none !important;
}

.legacy-shell :deep(.table),
.legacy-shell :deep(.table-wrap),
.legacy-shell :deep(.mc-modal),
.legacy-shell :deep(.drawer),
.legacy-shell :deep(.mc-drawer) {
  border-radius: var(--radius-md) !important;
  border-color: var(--stroke) !important;
}

.legacy-shell :deep(.btn),
.legacy-shell :deep(button),
.legacy-shell :deep(.mc-btn),
.legacy-shell :deep(.mc-seg-btn),
.legacy-shell :deep(.mc-chip) {
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.legacy-shell :deep(.btn:hover),
.legacy-shell :deep(button:hover),
.legacy-shell :deep(.mc-btn:hover),
.legacy-shell :deep(.mc-seg-btn:hover),
.legacy-shell :deep(.mc-chip:hover) {
  transform: translateY(-1px);
}

.legacy-shell :deep(.thead),
.legacy-shell :deep(.table thead),
.legacy-shell :deep(.tableTop) {
  position: sticky;
  top: 0;
  z-index: 2;
  backdrop-filter: blur(10px);
}

.legacy-shell :deep(input),
.legacy-shell :deep(select),
.legacy-shell :deep(textarea) {
  min-height: 38px;
}
</style>
