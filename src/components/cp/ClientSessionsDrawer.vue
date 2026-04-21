<template>
  <teleport to="body">
    <transition name="mc-fade">
      <div v-if="open" class="dr-backdrop" @click.self="emitClose" />
    </transition>

    <transition name="mc-slide-right">
      <aside v-if="open" class="dr-shell" role="dialog" aria-modal="true">
        <div class="dr-head">
          <div>
            <div class="dr-kicker">SESSIONS</div>
            <div class="dr-title">Сессии клиента</div>
            <div class="dr-sub">Клиент: <b>{{ client?.login || '-' }}</b></div>
          </div>
          <button class="dr-icon" type="button" @click="emitClose">×</button>
        </div>

        <div class="dr-body">
          <div class="toolbar">
            <label class="filter-wrap">
              <span class="filter-label">Дата</span>
              <input v-model="day" type="date" class="filter-input" />
            </label>
            <button class="btn ghost" :disabled="!day" @click="clearDate">Сбросить</button>
          </div>

          <div class="summary-card">
            <span>Страница</span>
            <strong>{{ page }}</strong>
          </div>

          <div class="sessions-scroll">
            <div v-if="loading" class="empty-box">Загрузка сессий...</div>
            <div v-else-if="!rows.length" class="empty-box">Сессии не найдены.</div>

            <div v-else class="sessions-list">
              <div v-for="s in rows" :key="s.id" class="session-row">
                <div class="row-main">
                  <div class="row-title">
                    <span class="pc-pill">{{ s.pc?.code || '-' }}</span>
                    <span class="row-status">{{ s.status || '—' }}</span>
                  </div>
                  <div class="row-sub">
                    <span>Старт: {{ formatDT(s.started_at) }}</span>
                    <span v-if="s.ended_at">Финиш: {{ formatDT(s.ended_at) }}</span>
                  </div>
                </div>

                <div class="row-meta">
                  <div class="money">{{ formatMoney(s.price_total || 0) }} UZS</div>
                  <div class="muted tiny">{{ s.tariff?.name || s.pc?.zone || 'Без тарифа' }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="pager">
            <button class="btn ghost small" :disabled="page <= 1 || loading" @click="load(page - 1)">Назад</button>
            <span class="page-text">Страница <b>{{ page }}</b></span>
            <button class="btn primary small" :disabled="!hasMore || loading" @click="load(page + 1)">Далее</button>
          </div>
        </div>
      </aside>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { cpApi } from '../../api/cp'

const props = defineProps({
  open: { type: Boolean, default: false },
  client: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const loading = ref(false)
const rows = ref([])
const page = ref(1)
const hasMore = ref(false)
const day = ref('')

function emitClose() {
  emit('close')
}

function clearDate() {
  if (!day.value) return
  day.value = ''
}

async function load(nextPage = 1) {
  if (!props.client?.id) return
  loading.value = true
  try {
    const params = { page: nextPage }
    if (day.value) params.date = day.value
    const response = await cpApi.clientSessions(props.client.id, params)
    const data = response?.data?.data ?? response?.data ?? {}
    const list = Array.isArray(data?.data) ? data.data : []
    rows.value = list
    page.value = data?.current_page ?? nextPage
    hasMore.value = (data?.current_page ?? nextPage) < (data?.last_page ?? nextPage)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (value) => {
    if (!value) return
    page.value = 1
    load(1)
  }
)

watch(
  () => props.client?.id,
  () => {
    if (!props.open) return
    page.value = 1
    load(1)
  }
)

watch(day, () => {
  if (!props.open) return
  page.value = 1
  load(1)
})

function formatMoney(value) {
  return Number(value || 0).toLocaleString('ru-RU')
}

function formatDT(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU')
  } catch {
    return String(value)
  }
}
</script>

<style scoped>
.dr-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(8px);
  z-index: 9998;
}

.dr-shell {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(500px, 94vw);
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  border-left: 1px solid var(--stroke);
  box-shadow: var(--shadow-panel);
  color: var(--text);
  z-index: 9999;
}

.dr-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid var(--stroke);
}

.dr-kicker {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand);
}

.dr-title {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 900;
}

.dr-sub {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.dr-icon,
.btn,
.filter-input {
  border: 1px solid var(--stroke);
  border-radius: 14px;
  font: inherit;
}

.dr-icon {
  width: 42px;
  height: 42px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 24px;
}

.dr-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px 20px;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.filter-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.filter-label {
  font-size: 12px;
  color: var(--text-muted);
}

.filter-input {
  min-height: 42px;
  padding: 0 12px;
  background: var(--bg-elevated);
  color: var(--text);
}

.btn {
  min-height: 42px;
  padding: 0 14px;
  background: var(--surface-soft);
  color: var(--text);
  font-weight: 700;
}

.btn.small {
  min-height: 38px;
  padding: 0 12px;
}

.btn.primary {
  background: linear-gradient(135deg, var(--brand-secondary), color-mix(in srgb, var(--brand-secondary) 72%, var(--brand) 28%));
  border-color: color-mix(in srgb, var(--brand-secondary) 45%, var(--stroke));
  color: #fff;
}

.summary-card {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  align-self: flex-start;
}

.summary-card span {
  font-size: 12px;
  color: var(--text-muted);
}

.summary-card strong {
  font-size: 18px;
}

.sessions-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.row-title {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.pc-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-secondary) 30%, var(--stroke));
  background: color-mix(in srgb, var(--brand-secondary) 10%, var(--surface-soft));
  color: var(--brand-secondary);
  font-size: 12px;
  font-weight: 800;
}

.row-status,
.row-sub,
.muted {
  color: var(--text-muted);
}

.row-sub {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  font-size: 12px;
}

.row-meta {
  text-align: right;
}

.money {
  font-weight: 900;
  font-size: 18px;
}

.tiny {
  margin-top: 6px;
  font-size: 12px;
}

.empty-box {
  padding: 18px;
  border-radius: 18px;
  border: 1px dashed var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
}

.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.page-text {
  color: var(--text-muted);
  font-size: 13px;
}

.mc-fade-enter-active,
.mc-fade-leave-active {
  transition: opacity 0.18s ease;
}

.mc-fade-enter-from,
.mc-fade-leave-to {
  opacity: 0;
}

.mc-slide-right-enter-active,
.mc-slide-right-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.mc-slide-right-enter-from,
.mc-slide-right-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

@media (max-width: 640px) {
  .dr-shell {
    width: 100vw;
  }

  .toolbar,
  .session-row,
  .pager {
    flex-direction: column;
    align-items: stretch;
  }

  .row-meta {
    text-align: left;
  }
}
</style>
