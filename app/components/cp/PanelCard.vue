<template>
  <section class="panel-card">
    <header v-if="title || subtitle || $slots.actions" class="panel-head">
      <div class="panel-copy">
        <h2 v-if="title">{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="panel-actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="panel-body">
      <slot />
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.panel-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  background:
    linear-gradient(180deg, var(--surface-strong), var(--surface)),
    var(--surface);
  box-shadow: var(--shadow-panel);
}

.panel-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-secondary), var(--brand), transparent 80%);
  opacity: 0.8;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  padding: 22px 22px 0;
}

.panel-copy h2 {
  margin: 0;
  font-size: 19px;
  line-height: 1.1;
}

.panel-copy p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-muted);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-body {
  padding: 22px;
}
</style>
