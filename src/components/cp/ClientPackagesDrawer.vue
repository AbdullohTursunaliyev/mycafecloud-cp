<template>
  <teleport to="body">
    <transition name="mc-fade">
      <div v-if="open" class="dr-overlay" @click.self="emitClose" />
    </transition>

    <transition name="mc-slide-right">
      <aside v-if="open" class="dr-shell" role="dialog" aria-modal="true">
        <div class="dr-head">
          <div>
            <div class="dr-kicker">PACKAGES</div>
            <div class="dr-title">Пакеты клиента</div>
            <div class="dr-sub">Клиент: <b>{{ client?.login || '-' }}</b></div>
          </div>
          <div class="dr-actions">
            <button class="btn ghost" :disabled="loading" @click="load">{{ loading ? 'Загрузка...' : 'Обновить' }}</button>
            <button class="icon" type="button" @click="emitClose">×</button>
          </div>
        </div>

        <div class="dr-body">
          <div v-if="error" class="alert danger">{{ error }}</div>

          <div v-if="!loading && !items.length" class="empty">
            У клиента пока нет пакетов.
          </div>

          <div v-if="items.length" class="list">
            <article v-for="item in items" :key="item.id" class="item">
              <div class="top">
                <div>
                  <div class="name">{{ item.package?.name || `Пакет #${item.package_id}` }}</div>
                  <div class="meta">
                    <span class="tag">{{ item.package?.zone || 'Без зоны' }}</span>
                    <span>{{ item.package?.duration_min ?? '—' }} мин</span>
                    <span>{{ money(item.package?.price || 0) }}</span>
                  </div>
                </div>
                <div class="pill" :class="statusClass(item.status)">{{ statusText(item.status) }}</div>
              </div>

              <div class="grid">
                <div class="box">
                  <div class="k">Осталось</div>
                  <div class="v">{{ item.remaining_min }} мин</div>
                </div>
                <div class="box">
                  <div class="k">Истекает</div>
                  <div class="v">{{ dt(item.expires_at) }}</div>
                </div>
                <div class="box">
                  <div class="k">Добавлен</div>
                  <div class="v">{{ dt(item.created_at) }}</div>
                </div>
              </div>
            </article>
          </div>

          <div v-if="loading" class="loading">Загрузка...</div>
        </div>
      </aside>
    </transition>
  </teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { cpApi } from '../../api/cp'

const props = defineProps({
  open: { type: Boolean, default: false },
  client: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const loading = ref(false)
const error = ref('')
const items = ref([])

function emitClose() {
  emit('close')
}

async function load() {
  if (!props.client?.id) return
  loading.value = true
  error.value = ''
  try {
    const response = await cpApi.clientPackages(props.client.id)
    const list = response?.data?.data ?? response?.data ?? []
    items.value = Array.isArray(list) ? list : []
  } catch (e) {
    items.value = []
    error.value = e?.response?.data?.message || 'Не удалось загрузить пакеты клиента'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  async (value) => {
    if (!value) return
    await nextTick()
    load()
  }
)

function money(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} UZS`
}

function dt(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU')
  } catch {
    return String(value)
  }
}

function statusText(status) {
  if (status === 'active') return 'Активен'
  if (status === 'expired') return 'Истек'
  if (status === 'used') return 'Использован'
  return status || '—'
}

function statusClass(status) {
  if (status === 'active') return 'ok'
  if (status === 'expired') return 'danger'
  return 'muted'
}
</script>

<style scoped>
.dr-overlay {
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
  height: 100vh;
  width: min(540px, 94vw);
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

.dr-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.icon,
.btn {
  border: 1px solid var(--stroke);
  border-radius: 14px;
  font: inherit;
}

.icon {
  width: 42px;
  height: 42px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 24px;
}

.btn {
  min-height: 42px;
  padding: 0 14px;
  background: var(--surface-soft);
  color: var(--text);
  font-weight: 700;
}

.dr-body {
  flex: 1;
  overflow: auto;
  padding: 18px 20px 20px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  padding: 14px;
}

.top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.name {
  font-size: 18px;
  font-weight: 900;
}

.meta {
  margin-top: 8px;
  display: flex;
  gap: 8px 12px;
  flex-wrap: wrap;
  color: var(--text-muted);
  font-size: 12px;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--bg-elevated);
  font-weight: 700;
}

.grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.box {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--bg-elevated);
}

.k {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.v {
  margin-top: 8px;
  font-weight: 800;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 7px 11px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  font-size: 12px;
  font-weight: 800;
}

.pill.ok { background: color-mix(in srgb, var(--success) 14%, var(--surface-soft)); color: var(--success); }
.pill.danger { background: color-mix(in srgb, var(--danger) 12%, var(--surface-soft)); color: var(--danger); }
.pill.muted { background: var(--surface-muted); color: var(--text-muted); }

.alert {
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--stroke));
  background: color-mix(in srgb, var(--danger) 10%, var(--surface-soft));
  color: var(--danger);
}

.empty,
.loading {
  padding: 18px;
  border-radius: 18px;
  border: 1px dashed var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
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

@media (max-width: 720px) {
  .dr-shell {
    width: 100vw;
  }

  .dr-actions,
  .top {
    flex-direction: column;
    align-items: stretch;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
