<template>
  <div class="nexora-control-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <button class="icon-meta-btn" type="button" :disabled="loading" @click="loadAll">
          <Icon name="lucide:refresh-cw" size="16" />
        </button>
      </template>
    </CpPageHero>

    <div v-if="!canUseNexora" class="nexora-guard">
      <Icon name="lucide:lock-keyhole" size="22" />
      <div>
        <strong>{{ copy.noAccessTitle }}</strong>
        <p>{{ copy.noAccessSubtitle }}</p>
      </div>
    </div>

    <template v-else>
      <section class="nexora-top-grid">
        <article class="signal-card">
          <span>{{ copy.watchTitle }}</span>
          <strong>{{ overview?.summary?.text || copy.emptySummary }}</strong>
        </article>
        <article v-for="metric in metricCards" :key="metric.key" class="metric-card">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      </section>

      <section v-if="overview?.proactive_briefing" class="briefing-card">
        <div>
          <span>{{ copy.briefingEyebrow }}</span>
          <strong>{{ overview.proactive_briefing.title }}</strong>
          <p>{{ overview.proactive_briefing.summary }}</p>
        </div>
        <div class="briefing-priorities">
          <span v-for="item in overview.proactive_briefing.priorities || []" :key="item">
            <Icon name="lucide:sparkles" size="15" />
            {{ item }}
          </span>
        </div>
      </section>

      <section class="control-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          type="button"
          @click="activeTab = tab.key"
        >
          <Icon :name="tab.icon" size="17" />
          <span>{{ tab.label }}</span>
        </button>
      </section>

      <CpPanelCard v-if="activeTab === 'reports'" :title="copy.reportsTitle" :subtitle="copy.reportsSubtitle">
        <div class="panel-toolbar">
          <div class="pill-filters">
            <button
              v-for="option in reportFilters"
              :key="option.value"
              class="filter-pill"
              :class="{ active: reportFormat === option.value }"
              type="button"
              @click="reportFormat = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="state-box">{{ copy.loading }}</div>
        <div v-else-if="filteredReports.length === 0" class="state-box">{{ copy.emptyReports }}</div>
        <div v-else class="report-list">
          <article v-for="report in filteredReports" :key="report.id" class="report-row">
            <div>
              <span class="row-kicker">{{ (report.format || '').toUpperCase() || copy.report }}</span>
              <strong>{{ report.filename }}</strong>
              <p>{{ report.from }} - {{ report.to }} · {{ formatDate(report.created_at) }}</p>
            </div>
            <button class="download-btn" type="button" :disabled="!report.exists" @click="downloadReport(report)">
              <Icon name="lucide:download" size="16" />
              <span>{{ report.exists ? copy.download : copy.missingFile }}</span>
            </button>
          </article>
        </div>
      </CpPanelCard>

      <CpPanelCard v-else-if="activeTab === 'audit'" :title="copy.auditTitle" :subtitle="copy.auditSubtitle">
        <div class="panel-toolbar">
          <div class="pill-filters">
            <button
              v-for="option in auditFilters"
              :key="option.value"
              class="filter-pill"
              :class="{ active: auditKind === option.value }"
              type="button"
              @click="auditKind = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="state-box">{{ copy.loading }}</div>
        <div v-else-if="filteredAudit.length === 0" class="state-box">{{ copy.emptyAudit }}</div>
        <div v-else class="audit-list">
          <article v-for="event in filteredAudit" :key="event.id" class="audit-row" :class="auditTone(event)">
            <div class="audit-icon">
              <Icon :name="auditIcon(event)" size="18" />
            </div>
            <div>
              <strong>{{ eventTitle(event) }}</strong>
              <p>{{ actorLabel(event) }} · {{ formatDate(event.created_at) }}</p>
              <span v-if="event.payload?.reason" class="reason-text">{{ event.payload.reason }}</span>
            </div>
          </article>
        </div>
      </CpPanelCard>

      <CpPanelCard v-else-if="activeTab === 'notifications'" :title="copy.notificationsTitle" :subtitle="copy.notificationsSubtitle">
        <div v-if="loading" class="state-box">{{ copy.loading }}</div>
        <div v-else-if="notifications.length === 0" class="state-box">{{ copy.emptyNotifications }}</div>
        <div v-else class="notification-list">
          <article v-for="item in notifications" :key="item.id" class="notification-row" :class="`tone-${item.severity || 'info'}`">
            <div>
              <span class="row-kicker">{{ item.type }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.body }}</p>
            </div>
            <time>{{ formatDate(item.created_at) }}</time>
          </article>
        </div>
      </CpPanelCard>

      <CpPanelCard v-else :title="copy.rulesTitle" :subtitle="copy.rulesSubtitle">
        <div class="rules-grid">
          <label v-for="rule in rulesList" :key="rule.key" class="rule-card" :class="{ active: rules[rule.key] }">
            <span class="switch">
              <input v-model="rules[rule.key]" type="checkbox" />
              <i />
            </span>
            <span>
              <strong>{{ rule.label }}</strong>
              <p>{{ rule.body }}</p>
            </span>
          </label>
        </div>

        <div class="rules-footer">
          <span>{{ saveState }}</span>
          <button class="save-rules-btn" type="button" :disabled="savingRules" @click="saveRules">
            <Icon name="lucide:shield-check" size="16" />
            <span>{{ savingRules ? copy.saving : copy.saveRules }}</span>
          </button>
        </div>
      </CpPanelCard>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useI18n } from '@legacy/i18n'
import { useCpAuthStore } from '@legacy/stores/cpAuth'

definePageMeta({ layout: 'cp', roles: ['owner'] })

const COPY = {
  uz: {
    eyebrow: 'NEXORA CONTROL',
    title: 'AI boshqaruv markazi',
    subtitle: 'Hisobotlar, audit, ogohlantirishlar va xavfsiz autopilot qoidalari bir joyda.',
    noAccessTitle: 'Nexora AI Pro tarifda ishlaydi',
    noAccessSubtitle: 'Bu sahifa uchun nexora_ai funksiyasi kerak.',
    watchTitle: 'Nexora Watch',
    briefingEyebrow: 'Proaktiv xulosa',
    emptySummary: 'Watch signali yuklanmoqda.',
    online: 'Online',
    idle: 'Bo‘sh online',
    offline: 'Offline',
    sessions: 'Sessiya',
    reports: 'Hisobotlar',
    audit: 'Audit',
    notifications: 'Signallar',
    rules: 'Qoidalar',
    reportsTitle: 'Report center',
    reportsSubtitle: 'Nexora yaratgan PDF va Excel hisobotlarini shu yerdan yuklab oling.',
    auditTitle: 'Audit log',
    auditSubtitle: 'Kim so‘radi, nima bajarildi va qaysi buyruq denied bo‘lganini ko‘ring.',
    notificationsTitle: 'Nexora signallari',
    notificationsSubtitle: 'Watch va Autopilot ownerga yuborgan muhim ogohlantirishlar.',
    rulesTitle: 'Autopilot rules',
    rulesSubtitle: 'Watch fon rejimida ishlaydi. Bu yerda faqat xavfsiz qoidalarni boshqarasiz.',
    all: 'Hammasi',
    denied: 'Denied',
    executed: 'Bajarilgan',
    report: 'Hisobot',
    autopilot: 'Autopilot',
    download: 'Yuklab olish',
    missingFile: 'Fayl yo‘q',
    loading: 'Yuklanmoqda...',
    emptyReports: 'Hali hisobot yaratilmagan.',
    emptyAudit: 'Audit log hozircha bo‘sh.',
    emptyNotifications: 'Hozircha signal yo‘q.',
    actorFallback: 'Nexora',
    saveRules: 'Qoidalarni saqlash',
    saving: 'Saqlanmoqda...',
    saved: 'Saqlangan',
    notSaved: 'O‘zgarish bor',
    saveError: 'Saqlashda xatolik',
    rulesCopy: {
      enabled: ['Autopilot faol', 'Nexora Watch signallarni fon rejimida kuzatadi.'],
      auto_lock_idle_online: ['Bo‘sh online PClarni auto-lock', 'Tasdiqlangan xavfsiz qoida bo‘yicha idle PClarni lock qiladi.'],
      suggest_idle_shutdown: ['Idle shutdown tavsiyasi', 'Bo‘sh PClar ko‘payganda o‘chirish planini taklif qiladi.'],
      suggest_offline_watch: ['Offline watch', 'Uzilib qolgan PClar bo‘yicha ownerga signal beradi.'],
      notify_low_load: ['Past yuklama signali', 'Zalda bandlik past bo‘lsa Nexora holatni ko‘taradi.'],
      notify_shift_risk: ['Smena risk signali', 'Smena bo‘yicha o‘rta yoki yuqori risk ko‘rinsa ogohlantiradi.'],
    },
  },
  ru: {
    eyebrow: 'NEXORA CONTROL',
    title: 'AI центр управления',
    subtitle: 'Отчеты, аудит, сигналы и безопасные правила autopilot в одном месте.',
    noAccessTitle: 'Nexora AI доступна в Pro тарифе',
    noAccessSubtitle: 'Для этой страницы нужна функция nexora_ai.',
    watchTitle: 'Nexora Watch',
    briefingEyebrow: 'Проактивная сводка',
    emptySummary: 'Watch сигнал загружается.',
    online: 'Онлайн',
    idle: 'Свободные',
    offline: 'Офлайн',
    sessions: 'Сессии',
    reports: 'Отчеты',
    audit: 'Аудит',
    notifications: 'Сигналы',
    rules: 'Правила',
    reportsTitle: 'Report center',
    reportsSubtitle: 'Скачивайте PDF и Excel отчеты, созданные Nexora.',
    auditTitle: 'Audit log',
    auditSubtitle: 'Кто запросил, что выполнено и какие команды были denied.',
    notificationsTitle: 'Сигналы Nexora',
    notificationsSubtitle: 'Важные уведомления Watch и Autopilot для owner.',
    rulesTitle: 'Autopilot rules',
    rulesSubtitle: 'Watch работает в фоне. Здесь управляются только безопасные правила.',
    all: 'Все',
    denied: 'Denied',
    executed: 'Выполнено',
    report: 'Отчет',
    autopilot: 'Autopilot',
    download: 'Скачать',
    missingFile: 'Нет файла',
    loading: 'Загрузка...',
    emptyReports: 'Отчеты еще не созданы.',
    emptyAudit: 'Audit log пока пуст.',
    emptyNotifications: 'Сигналов пока нет.',
    actorFallback: 'Nexora',
    saveRules: 'Сохранить правила',
    saving: 'Сохраняется...',
    saved: 'Сохранено',
    notSaved: 'Есть изменения',
    saveError: 'Ошибка сохранения',
    rulesCopy: {
      enabled: ['Autopilot включен', 'Nexora Watch отслеживает сигналы в фоне.'],
      auto_lock_idle_online: ['Auto-lock свободных ПК', 'Блокирует idle онлайн ПК по безопасному правилу.'],
      suggest_idle_shutdown: ['Совет по idle shutdown', 'Предлагает план выключения, когда свободных ПК много.'],
      suggest_offline_watch: ['Offline watch', 'Отправляет owner сигнал по отключенным ПК.'],
      notify_low_load: ['Сигнал низкой загрузки', 'Поднимает ситуацию, если зал загружен слабо.'],
      notify_shift_risk: ['Сигнал риска смены', 'Предупреждает при среднем или высоком риске смены.'],
    },
  },
  en: {
    eyebrow: 'NEXORA CONTROL',
    title: 'AI control center',
    subtitle: 'Reports, audit, notifications, and safe autopilot rules in one place.',
    noAccessTitle: 'Nexora AI is available on Pro',
    noAccessSubtitle: 'This page requires the nexora_ai feature.',
    watchTitle: 'Nexora Watch',
    briefingEyebrow: 'Proactive brief',
    emptySummary: 'Loading Watch signal.',
    online: 'Online',
    idle: 'Idle online',
    offline: 'Offline',
    sessions: 'Sessions',
    reports: 'Reports',
    audit: 'Audit',
    notifications: 'Signals',
    rules: 'Rules',
    reportsTitle: 'Report center',
    reportsSubtitle: 'Download PDF and Excel reports generated by Nexora.',
    auditTitle: 'Audit log',
    auditSubtitle: 'See who asked, what was executed, and what was denied.',
    notificationsTitle: 'Nexora signals',
    notificationsSubtitle: 'Important Watch and Autopilot alerts sent to the owner.',
    rulesTitle: 'Autopilot rules',
    rulesSubtitle: 'Watch runs in the background. This controls only safe rules.',
    all: 'All',
    denied: 'Denied',
    executed: 'Executed',
    report: 'Report',
    autopilot: 'Autopilot',
    download: 'Download',
    missingFile: 'Missing',
    loading: 'Loading...',
    emptyReports: 'No reports generated yet.',
    emptyAudit: 'Audit log is empty.',
    emptyNotifications: 'No signals yet.',
    actorFallback: 'Nexora',
    saveRules: 'Save rules',
    saving: 'Saving...',
    saved: 'Saved',
    notSaved: 'Unsaved changes',
    saveError: 'Save failed',
    rulesCopy: {
      enabled: ['Autopilot enabled', 'Nexora Watch monitors signals in the background.'],
      auto_lock_idle_online: ['Auto-lock idle online PCs', 'Locks idle online PCs under an approved safe rule.'],
      suggest_idle_shutdown: ['Idle shutdown suggestion', 'Suggests a shutdown plan when idle PCs grow.'],
      suggest_offline_watch: ['Offline watch', 'Alerts the owner about disconnected PCs.'],
      notify_low_load: ['Low load signal', 'Raises a signal when hall utilization is low.'],
      notify_shift_risk: ['Shift risk signal', 'Warns when current shift risk is medium or high.'],
    },
  },
}

const { locale } = useI18n()
const auth = useCpAuthStore()

const overview = ref(null)
const reports = ref([])
const audit = ref([])
const notifications = ref([])
const loading = ref(false)
const savingRules = ref(false)
const saveState = ref('')
const activeTab = ref('reports')
const reportFormat = ref('all')
const auditKind = ref('all')

const rules = reactive({
  enabled: false,
  auto_lock_idle_online: false,
  suggest_idle_shutdown: true,
  suggest_offline_watch: true,
  notify_low_load: true,
  notify_shift_risk: true,
})

const copy = computed(() => COPY[locale.value] || COPY.uz)
const canUseNexora = computed(() => auth.hasFeature('nexora_ai'))

const tabs = computed(() => [
  { key: 'reports', label: copy.value.reports, icon: 'lucide:file-down' },
  { key: 'audit', label: copy.value.audit, icon: 'lucide:shield-check' },
  { key: 'notifications', label: copy.value.notifications, icon: 'lucide:bell-ring' },
  { key: 'rules', label: copy.value.rules, icon: 'lucide:sliders-horizontal' },
])

const reportFilters = computed(() => [
  { value: 'all', label: copy.value.all },
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'Excel' },
])

const auditFilters = computed(() => [
  { value: 'all', label: copy.value.all },
  { value: 'denied', label: copy.value.denied },
  { value: 'executed', label: copy.value.executed },
  { value: 'report', label: copy.value.report },
  { value: 'autopilot', label: copy.value.autopilot },
])

const metricCards = computed(() => {
  const metrics = overview.value?.metrics || {}
  return [
    { key: 'online', label: copy.value.online, value: metrics.online_pcs ?? 0 },
    { key: 'idle', label: copy.value.idle, value: metrics.idle_online_pcs ?? 0 },
    { key: 'offline', label: copy.value.offline, value: metrics.offline_pcs ?? 0 },
    { key: 'sessions', label: copy.value.sessions, value: metrics.active_sessions ?? 0 },
  ]
})

const filteredReports = computed(() => {
  if (reportFormat.value === 'all') return reports.value
  return reports.value.filter((report) => String(report.format || '').toLowerCase() === reportFormat.value)
})

const filteredAudit = computed(() => {
  if (auditKind.value === 'all') return audit.value
  return audit.value.filter((event) => {
    const type = String(event.type || '')
    if (auditKind.value === 'denied') return type.includes('denied')
    if (auditKind.value === 'executed') return type.includes('executed')
    if (auditKind.value === 'report') return type.includes('report')
    if (auditKind.value === 'autopilot') return type.includes('autopilot')
    return true
  })
})

const rulesList = computed(() =>
  Object.entries(copy.value.rulesCopy).map(([key, [label, body]]) => ({ key, label, body })),
)

watch(locale, () => {
  loadOverview()
})

onMounted(loadAll)

async function loadAll() {
  if (!canUseNexora.value) return
  loading.value = true
  try {
    await Promise.all([loadOverview(), loadReports(), loadAudit(), loadNotifications()])
  } finally {
    loading.value = false
  }
}

async function loadOverview() {
  if (!canUseNexora.value) return
  const { data } = await cpApi.nexoraOverview({ locale: locale.value })
  overview.value = data?.data || null
  Object.assign(rules, normalizeRules(overview.value?.autopilot || {}))
  saveState.value = copy.value.saved
}

async function loadReports() {
  const { data } = await cpApi.nexoraReportCenter({ limit: 80 })
  reports.value = Array.isArray(data?.data) ? data.data : []
}

async function loadAudit() {
  const { data } = await cpApi.nexoraAudit({ limit: 80 })
  audit.value = Array.isArray(data?.data) ? data.data : []
}

async function loadNotifications() {
  const { data } = await cpApi.nexoraNotifications({ limit: 40 })
  notifications.value = Array.isArray(data?.data) ? data.data : []
}

function normalizeRules(source) {
  return {
    enabled: Boolean(source.enabled),
    auto_lock_idle_online: Boolean(source.auto_lock_idle_online),
    suggest_idle_shutdown: source.suggest_idle_shutdown !== false,
    suggest_offline_watch: source.suggest_offline_watch !== false,
    notify_low_load: source.notify_low_load !== false,
    notify_shift_risk: source.notify_shift_risk !== false,
  }
}

async function saveRules() {
  savingRules.value = true
  saveState.value = copy.value.saving
  try {
    const { data } = await cpApi.nexoraAutopilot({ ...rules, locale: locale.value })
    Object.assign(rules, normalizeRules(data?.data?.autopilot || rules))
    saveState.value = copy.value.saved
    await loadAudit()
  } catch {
    saveState.value = copy.value.saveError
  } finally {
    savingRules.value = false
  }
}

async function downloadReport(report) {
  if (!report?.filename) return
  const response = await cpApi.nexoraDownloadReport(report.filename)
  const blob = new Blob([response.data], {
    type: response.headers?.['content-type'] || 'application/octet-stream',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = report.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function formatDate(value) {
  if (!value) return '-'
  try {
    return new Intl.DateTimeFormat(locale.value === 'uz' ? 'uz-UZ' : locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function actorLabel(event) {
  const actor = event?.actor || {}
  return actor.name || actor.login || copy.value.actorFallback
}

function eventTitle(event) {
  const type = String(event?.type || '')
  if (type.includes('denied')) return `${copy.value.denied}: ${event?.payload?.action || '-'}`
  if (type.includes('plan_resolved')) return `${copy.value.audit}: ${event?.payload?.action || '-'}`
  if (type.includes('report')) return `${copy.value.report}: ${(event?.payload?.format || '').toUpperCase()}`
  if (type.includes('autopilot')) return copy.value.autopilot
  if (type.includes('executed')) return copy.value.executed
  return type || copy.value.audit
}

function auditTone(event) {
  const type = String(event?.type || '')
  if (type.includes('denied')) return 'danger'
  if (type.includes('executed')) return 'success'
  if (type.includes('autopilot')) return 'accent'
  return 'neutral'
}

function auditIcon(event) {
  const tone = auditTone(event)
  if (tone === 'danger') return 'lucide:shield-x'
  if (tone === 'success') return 'lucide:check-circle-2'
  if (tone === 'accent') return 'lucide:bot'
  return 'lucide:activity'
}
</script>

<style scoped>
.nexora-control-page {
  display: grid;
  gap: 22px;
}

.icon-meta-btn,
.tab-btn,
.filter-pill,
.download-btn,
.save-rules-btn {
  border: 1px solid rgba(98, 230, 255, 0.3);
  background: rgba(9, 25, 34, 0.72);
  color: #f4fbff;
  cursor: pointer;
}

.icon-meta-btn {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 18px;
}

.nexora-guard,
.signal-card,
.metric-card,
.briefing-card,
.report-row,
.audit-row,
.notification-row,
.rule-card {
  border: 1px solid rgba(98, 230, 255, 0.2);
  background:
    radial-gradient(circle at 20% 0%, rgba(98, 230, 255, 0.11), transparent 36%),
    linear-gradient(145deg, rgba(18, 39, 50, 0.9), rgba(7, 15, 22, 0.92));
  box-shadow: 0 22px 55px rgba(0, 0, 0, 0.24);
}

.nexora-guard {
  display: flex;
  gap: 16px;
  align-items: center;
  border-radius: 28px;
  padding: 24px;
}

.nexora-guard p,
.signal-card span,
.metric-card span,
.report-row p,
.audit-row p,
.notification-row p,
.rule-card p,
.reason-text,
.rules-footer span {
  color: rgba(218, 231, 241, 0.68);
}

.nexora-top-grid {
  display: grid;
  grid-template-columns: minmax(280px, 1.6fr) repeat(4, minmax(120px, 1fr));
  gap: 14px;
}

.signal-card,
.metric-card {
  border-radius: 28px;
  padding: 22px;
}

.briefing-card {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);
  gap: 18px;
  align-items: stretch;
  border-radius: 30px;
  padding: 24px;
}

.briefing-card span:first-child {
  display: block;
  color: #7de8ff;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.briefing-card strong {
  display: block;
  margin-top: 8px;
  font-size: clamp(28px, 3vw, 44px);
  line-height: 1.02;
}

.briefing-card p {
  max-width: 900px;
  margin: 12px 0 0;
  color: rgba(218, 231, 241, 0.72);
  font-size: 18px;
  line-height: 1.5;
}

.briefing-priorities {
  display: grid;
  gap: 10px;
}

.briefing-priorities span {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(126, 236, 183, 0.24);
  border-radius: 18px;
  padding: 12px 14px;
  background: rgba(126, 236, 183, 0.08);
  color: rgba(244, 251, 255, 0.9);
  font-weight: 800;
}

.signal-card {
  min-height: 156px;
}

.signal-card strong {
  display: block;
  margin-top: 18px;
  max-width: 760px;
  font-size: clamp(24px, 3vw, 42px);
  line-height: 1.06;
}

.metric-card {
  display: flex;
  min-height: 156px;
  flex-direction: column;
  justify-content: space-between;
}

.metric-card strong {
  font-size: 44px;
  line-height: 1;
}

.signal-card span,
.metric-card span,
.row-kicker {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.control-tabs,
.panel-toolbar,
.pill-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.tab-btn,
.filter-pill {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  border-radius: 999px;
  padding: 12px 18px;
  font-weight: 900;
}

.tab-btn.active,
.filter-pill.active {
  border-color: rgba(125, 232, 255, 0.78);
  background: linear-gradient(135deg, rgba(126, 230, 255, 0.24), rgba(130, 236, 183, 0.18));
}

.report-list,
.audit-list,
.notification-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.report-row,
.notification-row {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  border-radius: 24px;
  padding: 18px;
}

.report-row strong,
.notification-row strong,
.audit-row strong {
  display: block;
  margin: 7px 0;
  font-size: 20px;
}

.download-btn,
.save-rules-btn {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  padding: 13px 18px;
  font-weight: 900;
  white-space: nowrap;
}

.download-btn:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.audit-row {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 14px;
  border-radius: 24px;
  padding: 18px;
}

.audit-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 18px;
  background: rgba(98, 230, 255, 0.11);
}

.audit-row.danger .audit-icon {
  color: #ff8c9a;
}

.audit-row.success .audit-icon {
  color: #94f0b8;
}

.audit-row.accent .audit-icon {
  color: #79e8ff;
}

.reason-text {
  display: block;
  margin-top: 8px;
}

.notification-row time {
  color: rgba(218, 231, 241, 0.58);
  font-size: 13px;
  white-space: nowrap;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.rule-card {
  display: grid;
  grid-template-columns: 68px 1fr;
  gap: 14px;
  align-items: start;
  border-radius: 26px;
  padding: 20px;
}

.rule-card.active {
  border-color: rgba(126, 236, 183, 0.6);
}

.switch {
  position: relative;
  display: inline-flex;
}

.switch input {
  position: absolute;
  opacity: 0;
}

.switch i {
  width: 58px;
  height: 34px;
  border: 1px solid rgba(220, 239, 248, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  transition: 0.18s ease;
}

.switch i::after {
  position: absolute;
  top: 5px;
  left: 5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f4fbff;
  content: "";
  transition: 0.18s ease;
}

.switch input:checked + i {
  border-color: rgba(126, 236, 183, 0.62);
  background: linear-gradient(135deg, rgba(126, 236, 183, 0.56), rgba(98, 230, 255, 0.48));
}

.switch input:checked + i::after {
  transform: translateX(24px);
}

.rules-footer {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  margin-top: 18px;
}

.state-box {
  display: grid;
  min-height: 180px;
  place-items: center;
  border: 1px dashed rgba(98, 230, 255, 0.22);
  border-radius: 24px;
  color: rgba(218, 231, 241, 0.65);
}

@media (max-width: 1180px) {
  .nexora-top-grid,
  .briefing-card,
  .rules-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .signal-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .nexora-top-grid,
  .briefing-card,
  .rules-grid {
    grid-template-columns: 1fr;
  }

  .report-row,
  .notification-row,
  .rules-footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
