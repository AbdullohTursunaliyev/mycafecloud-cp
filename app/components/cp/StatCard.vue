<template>
  <article class="stat-card" :class="[tone, { 'is-compact': compact }]">
    <div class="stat-top">
      <div>
        <span class="stat-label">{{ label }}</span>
      </div>
      <span v-if="chip" class="stat-chip">{{ chip }}</span>
    </div>
    <div class="stat-value">{{ value }}</div>
    <p v-if="hint" class="stat-hint">{{ hint }}</p>
  </article>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  hint: { type: String, default: '' },
  chip: { type: String, default: '' },
  tone: { type: String, default: 'tone-default' },
  compact: { type: Boolean, default: false },
})
</script>

<style scoped>
.stat-card {
  position: relative;
  overflow: hidden;
  min-height: 160px;
  padding: 18px;
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  background:
    radial-gradient(140% 120% at 100% 0%, rgba(79, 140, 255, 0.16), transparent 45%),
    linear-gradient(180deg, var(--surface-strong), var(--surface));
  box-shadow: var(--shadow-panel);
}

.stat-card::after {
  content: '';
  position: absolute;
  inset: auto auto 0 0;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  transform: translate(-35%, 35%);
}

.stat-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stat-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.stat-label::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.75;
}

.stat-chip {
  position: relative;
  z-index: 1;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.stat-value {
  position: relative;
  z-index: 1;
  margin-top: 20px;
  font-size: clamp(2rem, 2.3vw, 3rem);
  font-weight: 900;
  line-height: 0.95;
}

.stat-hint {
  position: relative;
  z-index: 1;
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-muted);
}

.is-compact {
  min-height: 132px;
  padding: 16px 18px;
}

.is-compact .stat-value {
  margin-top: 14px;
  font-size: clamp(1.55rem, 1.7vw, 2.5rem);
  line-height: 1.02;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.is-compact .stat-hint {
  margin-top: 10px;
  font-size: 12px;
}

.tone-green { border-color: rgba(52, 211, 153, 0.28); }
.tone-green .stat-label { color: var(--success); }
.tone-blue { border-color: rgba(79, 140, 255, 0.28); }
.tone-blue .stat-label { color: var(--brand-secondary); }
.tone-amber { border-color: rgba(245, 158, 11, 0.28); }
.tone-amber .stat-label { color: var(--accent); }
.tone-rose { border-color: rgba(251, 113, 133, 0.28); }
.tone-rose .stat-label { color: var(--danger); }
</style>
