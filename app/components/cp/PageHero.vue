<template>
  <section class="page-hero">
    <div class="hero-copy">
      <h1>{{ title }}</h1>
      <div v-if="$slots.meta" class="hero-meta">
        <slot name="meta" />
      </div>
    </div>

    <div v-if="$slots.actions" class="hero-actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.page-hero {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: end;
  padding: 26px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--stroke);
  background:
    radial-gradient(440px 220px at 0% 0%, rgba(79, 140, 255, 0.18), transparent 55%),
    radial-gradient(420px 240px at 100% 100%, rgba(79, 209, 197, 0.14), transparent 55%),
    linear-gradient(180deg, var(--surface-strong), var(--surface));
  box-shadow: var(--shadow-panel);
}

.page-hero::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--stroke-strong), transparent);
}

.hero-copy {
  min-width: 0;
}

.page-hero h1 {
  margin: 0;
  font-size: clamp(2rem, 2.3vw, 2.8rem);
  line-height: 0.98;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

@media (max-width: 960px) {
  .page-hero {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .hero-actions {
    width: 100%;
    align-items: stretch;
  }
}
</style>
