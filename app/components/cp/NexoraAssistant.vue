<template>
  <div class="nexora-root">
    <button class="nexora-trigger" type="button" @click="openAssistant">
      <span class="nexora-trigger-orb">
        <Icon name="lucide:sparkles" size="16" />
      </span>
      <span class="nexora-trigger-copy">
        <strong>{{ ui.trigger }}</strong>
        <small>{{ ui.triggerHint }}</small>
      </span>
    </button>

    <Teleport to="body">
      <div v-if="open" class="nexora-overlay" @click.self="closeAssistant">
        <section class="nexora-modal">
          <button class="nexora-close" type="button" @click="closeAssistant">
            <Icon name="lucide:x" size="16" />
          </button>

          <div class="nexora-hero">
            <p class="nexora-kicker">{{ ui.kicker }}</p>
            <h3>{{ ui.title }}</h3>
            <span>{{ ui.subtitle }}</span>
          </div>

          <button
            class="nexora-core"
            :class="{
              listening: recognizing,
              busy: voiceSending || loading.plan || loading.execute,
              unsupported: !speechSupported,
            }"
            type="button"
            :disabled="voiceSending || loading.plan || loading.execute"
            @click="handleCoreAction"
          >
            <span class="nexora-core-ring ring-one" />
            <span class="nexora-core-ring ring-two" />
            <span class="nexora-core-glow" />
            <span class="nexora-voice-spectrum" aria-hidden="true">
              <span
                v-for="index in 24"
                :key="index"
                class="spectrum-spoke"
                :style="{
                  '--bar-angle': `${(index - 1) * 15}deg`,
                  '--bar-delay': `${(index - 1) * 0.05}s`,
                }"
              >
                <span class="spectrum-bar" />
              </span>
            </span>
            <img :src="assistantLogo" alt="Nexora AI logo" class="nexora-core-logo" />
          </button>

          <div class="nexora-status">
            <strong>{{ statusTitle }}</strong>
            <p>{{ statusText }}</p>
            <div v-if="voiceSending" class="nexora-inline-loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div v-if="draft" class="nexora-draft-chip">
              <Icon name="lucide:message-square-text" size="14" />
              <span>{{ draft }}</span>
            </div>
          </div>

          <div class="nexora-language-row">
            <span class="nexora-language-label">{{ ui.languageLabel }}</span>
            <div class="nexora-language-switch">
              <button
                v-for="option in speechLocaleOptions"
                :key="option.value"
                class="nexora-language-chip"
                :class="{ active: speechLocale === option.value }"
                type="button"
                :disabled="recognizing || voiceSending || loading.plan || loading.execute"
                @click="speechLocale = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <section v-if="loading.overview || watchSummary || watchAlerts.length || watchActions.length" class="nexora-watch-shell">
            <div class="nexora-watch-head">
              <div>
                <p class="nexora-section-kicker">{{ ui.watchKicker }}</p>
                <h4>{{ watchSummary?.title || ui.watchLoadingTitle }}</h4>
                <p>{{ watchSummary?.text || ui.watchLoadingText }}</p>
              </div>
              <span v-if="loading.overview" class="nexora-watch-badge">{{ ui.refreshing }}</span>
            </div>

            <div v-if="watchMetrics" class="nexora-watch-metrics">
              <div class="watch-metric">
                <span>{{ ui.metricOnline }}</span>
                <strong>{{ watchMetrics.online_pcs }}</strong>
              </div>
              <div class="watch-metric">
                <span>{{ ui.metricActive }}</span>
                <strong>{{ watchMetrics.active_sessions }}</strong>
              </div>
              <div class="watch-metric">
                <span>{{ ui.metricIdle }}</span>
                <strong>{{ watchMetrics.idle_online_pcs }}</strong>
              </div>
              <div class="watch-metric">
                <span>{{ ui.metricOffline }}</span>
                <strong>{{ watchMetrics.offline_pcs }}</strong>
              </div>
            </div>

            <div v-if="watchAlerts.length" class="nexora-watch-grid">
              <article
                v-for="alert in watchAlerts"
                :key="alert.id"
                class="nexora-watch-card"
                :class="`severity-${alert.severity || 'info'}`"
              >
                <div class="nexora-watch-card-top">
                  <span class="nexora-watch-tag">{{ ui.watchAlertLabel }}</span>
                  <strong>{{ alert.title }}</strong>
                </div>
                <p>{{ alert.body }}</p>
                <button
                  class="nexora-watch-action"
                  type="button"
                  :disabled="voiceSending || loading.plan || loading.execute"
                  @click="sendSuggestion(alert.prompt)"
                >
                  {{ alert.action_label || ui.watchRun }}
                </button>
              </article>
            </div>

            <div v-if="watchActions.length" class="nexora-watch-actions">
              <button
                v-for="action in watchActions"
                :key="action.id"
                class="nexora-watch-pill"
                type="button"
                :disabled="voiceSending || loading.plan || loading.execute"
                @click="sendSuggestion(action.prompt)"
              >
                <strong>{{ action.label }}</strong>
                <span>{{ action.body }}</span>
              </button>
            </div>

            <div v-if="autopilot.can_manage" class="nexora-autopilot">
              <div class="nexora-autopilot-head">
                <div>
                  <p class="nexora-section-kicker">{{ ui.autopilotKicker }}</p>
                  <h4>{{ ui.autopilotTitle }}</h4>
                  <p>{{ ui.autopilotText }}</p>
                </div>
                <span v-if="loading.autopilot" class="nexora-watch-badge">{{ ui.autopilotSaving }}</span>
              </div>

              <div class="nexora-autopilot-grid">
                <button
                  v-for="rule in autopilotRules"
                  :key="rule.key"
                  class="nexora-rule"
                  :class="{ active: rule.enabled }"
                  type="button"
                  :disabled="loading.autopilot"
                  @click="toggleAutopilotRule(rule.key)"
                >
                  <span class="nexora-rule-toggle">
                    <span />
                  </span>
                  <strong>{{ rule.title }}</strong>
                  <small>{{ rule.body }}</small>
                </button>
              </div>
            </div>
          </section>

          <div class="nexora-chip-row">
            <button
              v-for="suggestion in ui.quickPrompts"
              :key="suggestion"
              class="nexora-chip"
              type="button"
              :disabled="voiceSending || loading.plan || loading.execute"
              @click="sendSuggestion(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>

          <div class="nexora-manual">
            <div class="nexora-manual-head">
              <span>{{ ui.composerLabel }}</span>
              <small>{{ manualHint }}</small>
            </div>

            <div class="nexora-composer">
              <textarea
                ref="draftInput"
                v-model.trim="draft"
                class="nexora-input"
                :placeholder="ui.placeholder"
                rows="2"
                @keydown.enter.exact.prevent="submitDraft"
              />

              <button
                class="nexora-send"
                type="button"
                :disabled="!draft || voiceSending || loading.plan || loading.execute"
                @click="submitDraft"
              >
                <Icon name="lucide:arrow-up" size="16" />
                <span>{{ ui.send }}</span>
              </button>
            </div>
          </div>

          <div class="nexora-results-shell">
            <div v-if="thread.length === 0" class="nexora-empty">
              <strong>{{ ui.introTitle }}</strong>
              <p>{{ ui.introText }}</p>
            </div>

            <div v-else ref="threadRef" class="nexora-thread">
              <article
                v-for="item in thread"
                :key="item.id"
                class="nexora-card"
                :class="item.role === 'user' ? 'is-user' : 'is-assistant'"
              >
                <div class="nexora-card-top">
                  <span class="nexora-role">{{ item.role === 'user' ? ui.operatorBadge : ui.assistantBadge }}</span>
                  <span v-if="item.plan && item.plan.action && item.role === 'assistant'" class="nexora-action-badge">
                    {{ item.plan.action_label }}
                  </span>
                </div>

                <p class="nexora-text">{{ item.text }}</p>

                <div v-if="item.plan && item.plan.metrics" class="nexora-metrics">
                  <div class="metric-pill">
                    <span>{{ ui.metricOnline }}</span>
                    <strong>{{ item.plan.metrics.online_pcs }}</strong>
                  </div>
                  <div class="metric-pill">
                    <span>{{ ui.metricActive }}</span>
                    <strong>{{ item.plan.metrics.active_sessions }}</strong>
                  </div>
                  <div class="metric-pill">
                    <span>{{ ui.metricIdle }}</span>
                    <strong>{{ item.plan.metrics.idle_online_pcs }}</strong>
                  </div>
                  <div class="metric-pill">
                    <span>{{ ui.metricBooked }}</span>
                    <strong>{{ item.plan.metrics.booked_pcs }}</strong>
                  </div>
                </div>

                <div v-if="item.plan && item.plan.targets && item.plan.targets.length" class="nexora-targets">
                  <div
                    v-for="target in item.plan.targets.slice(0, 8)"
                    :key="`${item.id}-${target.id}`"
                    class="target-pill"
                  >
                    <strong>{{ target.code }}</strong>
                    <span>{{ target.zone }}</span>
                  </div>
                </div>

                <div
                  v-if="item.role === 'assistant' && item.plan && item.plan.can_execute && item.plan.confirmation_required && item.planState === 'pending'"
                  class="nexora-confirm"
                >
                  <button
                    class="confirm-btn primary"
                    type="button"
                    :disabled="loading.execute && activePlanId === item.plan.plan_id"
                    @click="executePlan(item)"
                  >
                    <Icon name="lucide:shield-check" size="15" />
                    <span>{{ loading.execute && activePlanId === item.plan.plan_id ? ui.executing : ui.confirm }}</span>
                  </button>
                  <button class="confirm-btn muted" type="button" @click="dismissPlan(item)">
                    {{ ui.cancel }}
                  </button>
                </div>

                <div v-if="item.planState === 'cancelled'" class="nexora-state muted">{{ ui.cancelledPlan }}</div>
                <div v-else-if="item.planState === 'executed'" class="nexora-state success">{{ ui.executedPlan }}</div>

                <div v-if="item.suggestions && item.suggestions.length" class="nexora-chip-row compact">
                  <button
                    v-for="suggestion in item.suggestions"
                    :key="`${item.id}-${suggestion}`"
                    class="nexora-chip"
                    type="button"
                    :disabled="voiceSending || loading.plan || loading.execute"
                    @click="sendSuggestion(suggestion)"
                  >
                    {{ suggestion }}
                  </button>
                </div>
              </article>

              <article v-if="loading.plan" class="nexora-card is-assistant ghost">
                <div class="nexora-card-top">
                  <span class="nexora-role">{{ ui.assistantBadge }}</span>
                </div>
                <p class="nexora-text">{{ ui.planning }}</p>
              </article>
            </div>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useI18n } from '@legacy/i18n'

const { locale } = useI18n()

const COPY = {
  uz: {
    trigger: 'Nexora AI',
    triggerHint: 'Ovozli yordamchi',
    kicker: 'Operator yordamchisi',
    title: 'Nexora AI',
    subtitle: 'Logoga bosing va buyruqni ayting. Nexora tushunadi, plan tuzadi va kerak bo‘lsa tasdiq so‘raydi.',
    introTitle: 'Nexora buyruq kutmoqda',
    introText: 'Markazdagi Nexora logotipiga bosing va gapiring yoki pastdagi maydonga yozing.',
    quickPrompts: [
      'Hozir zal holati qanday?',
      'Bugungi tushum qancha?',
      'Offline kompyuterlarni ko‘rsat.',
      'Barcha yoniq va odam yo‘q kompyuterlarni o‘chir.',
    ],
    operatorBadge: 'Operator',
    assistantBadge: 'Nexora',
    metricOnline: 'Online',
    metricActive: 'Sessiya',
    metricIdle: 'Bo‘sh',
    metricBooked: 'Bron',
    metricOffline: 'Offline',
    watchKicker: 'Nexora Watch',
    watchLoadingTitle: 'Holat yangilanmoqda',
    watchLoadingText: 'Nexora zal holatini yig‘ib, owner va operator uchun tavsiyalar tayyorlayapti.',
    watchAlertLabel: 'Ogohlantirish',
    watchRun: 'Ochish',
    refreshing: 'Yangilanmoqda...',
    autopilotKicker: 'Nazoratli autopilot',
    autopilotTitle: 'Nexora Autopilot',
    autopilotText: 'Bu yerda xavfsiz qoida va tavsiya rejimlarini boshqarasiz. Xavfli amallar baribir tasdiq bilan qoladi.',
    autopilotSaving: 'Saqlanmoqda...',
    autopilotRuleEnabledTitle: 'Autopilot faol',
    autopilotRuleEnabledBody: 'Nexora Watch doimiy ishlaydi va qoidalarni kuzatadi.',
    autopilotRuleLockTitle: 'Bo‘sh online PClarni auto-lock',
    autopilotRuleLockBody: 'Idle online PClar uchun xavfsiz lock commandini Nexora o‘zi yuboradi.',
    autopilotRuleSuggestIdleTitle: 'Idle shutdown tavsiyalari',
    autopilotRuleSuggestIdleBody: 'Bo‘sh va yoniq PClar ko‘payganda shutdown planini taklif qiladi.',
    autopilotRuleSuggestOfflineTitle: 'Offline watch tavsiyalari',
    autopilotRuleSuggestOfflineBody: 'Offline va uzilgan PClar bo‘yicha proaktiv ogohlantirish beradi.',
    confirm: 'Tasdiqlash',
    cancel: 'Bekor qilish',
    cancelledPlan: 'Plan bekor qilindi. Hech qanday command yuborilmadi.',
    executedPlan: 'Plan bajarildi.',
    executing: 'Yuborilmoqda...',
    planning: 'Nexora holatni tekshirib, action plan tayyorlayapti...',
    composerLabel: 'Matn bilan yuborish',
    voiceHint: 'Logoga bosib gapirishingiz mumkin.',
    voiceListening: 'Tinglayapman...',
    voiceUnsupported: 'Bu brauzer ovozli diktovni qo‘llamaydi.',
    voicePermissionDenied: 'Mikrofonga ruxsat berilmadi.',
    voiceError: 'Ovozli diktov ishlamadi. Matn bilan davom eting.',
    placeholder: 'Masalan: barcha yoniq va odam yo‘q kompyuterlarni o‘chir',
    send: 'Yuborish',
    statusIdleTitle: 'Gapirish uchun tayyor',
    statusIdleText: 'Nexora logotipiga bosing va buyruqni tabiiy tilda ayting.',
    statusListeningTitle: 'Eshitilyapti',
    statusListeningText: 'Buyruqni oxirigacha ayting. Tugatgach logoga yana bosing, Nexora yozuvni to‘xtatib o‘zi yuboradi.',
    statusSendingTitle: 'Yuborilmoqda',
    statusSendingText: 'Nexora yozuvni tayyorlab, buyruqni serverga yuboryapti...',
    statusThinkingTitle: 'Tahlil qilinyapti',
    statusThinkingText: 'Nexora siz aytgan vazifani tekshirib, bajarish planini tayyorlayapti.',
    statusDraftTitle: 'Buyruq ushlandi',
    statusDraftText: 'Matn to‘g‘ri bo‘lsa yuboring yoki yana logoga bosib qayta gapiring.',
    statusUnsupportedTitle: 'Matn rejimi',
    statusUnsupportedText: 'Bu brauzerda ovoz ishlamaydi, lekin matn orqali bemalol boshqarsa bo‘ladi.',
    languageLabel: 'Nutq tili',
    voiceGreeting: 'Salom, men Nexora AI man. Sizga qanday yordam bera olaman?',
    genericError: 'Nexora bilan gaplashishda xatolik yuz berdi.',
  },
  ru: {
    trigger: 'Nexora AI',
    triggerHint: 'Голосовой помощник',
    kicker: 'Помощник оператора',
    title: 'Nexora AI',
    subtitle: 'Нажмите на логотип и скажите команду. Nexora поймет, составит план и попросит подтверждение, если нужно.',
    introTitle: 'Nexora ждет команду',
    introText: 'Нажмите на логотип Nexora в центре и говорите или введите запрос вручную ниже.',
    quickPrompts: [
      'Какая сейчас ситуация в зале?',
      'Какая выручка сегодня?',
      'Покажи офлайн компьютеры.',
      'Выключи все включенные компьютеры без людей.',
    ],
    operatorBadge: 'Оператор',
    assistantBadge: 'Nexora',
    metricOnline: 'Онлайн',
    metricActive: 'Сессии',
    metricIdle: 'Свободно',
    metricBooked: 'Бронь',
    metricOffline: 'Офлайн',
    watchKicker: 'Nexora Watch',
    watchLoadingTitle: 'Обновляю состояние',
    watchLoadingText: 'Nexora собирает ситуацию по залу и готовит подсказки для owner и operator.',
    watchAlertLabel: 'Сигнал',
    watchRun: 'Открыть',
    refreshing: 'Обновляю...',
    autopilotKicker: 'Контролируемый autopilot',
    autopilotTitle: 'Nexora Autopilot',
    autopilotText: 'Здесь управляются безопасные правила и режим подсказок. Опасные действия все равно требуют подтверждения.',
    autopilotSaving: 'Сохраняю...',
    autopilotRuleEnabledTitle: 'Autopilot активен',
    autopilotRuleEnabledBody: 'Nexora Watch постоянно следит за клубом и запускает безопасные правила.',
    autopilotRuleLockTitle: 'Auto-lock пустых online ПК',
    autopilotRuleLockBody: 'Для свободных online ПК Nexora сама отправляет безопасную команду lock.',
    autopilotRuleSuggestIdleTitle: 'Подсказки для idle shutdown',
    autopilotRuleSuggestIdleBody: 'Когда пустых включенных ПК слишком много, Nexora предлагает plan на shutdown.',
    autopilotRuleSuggestOfflineTitle: 'Подсказки по offline ПК',
    autopilotRuleSuggestOfflineBody: 'Показывает proactive alerts по offline и stale машинам.',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
    cancelledPlan: 'План отменен. Команды не отправлены.',
    executedPlan: 'План выполнен.',
    executing: 'Отправка...',
    planning: 'Nexora проверяет состояние и готовит план действий...',
    composerLabel: 'Отправить текстом',
    voiceHint: 'Можно нажать на логотип и продиктовать команду.',
    voiceListening: 'Слушаю...',
    voiceUnsupported: 'В этом браузере голосовой ввод не поддерживается.',
    voicePermissionDenied: 'Нет доступа к микрофону.',
    voiceError: 'Голосовой ввод не сработал. Продолжайте текстом.',
    placeholder: 'Например: выключи все включенные компьютеры без людей',
    send: 'Отправить',
    statusIdleTitle: 'Готов слушать',
    statusIdleText: 'Нажмите на логотип Nexora и скажите команду естественным языком.',
    statusListeningTitle: 'Идет прослушивание',
    statusListeningText: 'Говорите до конца команды. Когда закончите, нажмите на логотип еще раз, и Nexora сама остановит запись и отправит текст.',
    statusSendingTitle: 'Отправляю',
    statusSendingText: 'Nexora подготавливает запись и отправляет команду на сервер...',
    statusThinkingTitle: 'Идет анализ',
    statusThinkingText: 'Nexora проверяет задачу и готовит безопасный план выполнения.',
    statusDraftTitle: 'Команда распознана',
    statusDraftText: 'Если текст верный, отправьте его или нажмите на логотип и продиктуйте заново.',
    statusUnsupportedTitle: 'Текстовый режим',
    statusUnsupportedText: 'Голос здесь недоступен, но вы можете управлять Nexora через текст.',
    languageLabel: 'Язык речи',
    voiceGreeting: 'Здравствуйте, я Nexora AI. Чем могу помочь?',
    genericError: 'Не удалось выполнить запрос к Nexora.',
  },
  en: {
    trigger: 'Nexora AI',
    triggerHint: 'Voice assistant',
    kicker: 'Operator assistant',
    title: 'Nexora AI',
    subtitle: 'Press the logo and speak. Nexora understands the request, prepares a plan, and asks for confirmation when needed.',
    introTitle: 'Nexora is ready',
    introText: 'Press the centered Nexora logo and speak, or type a command below.',
    quickPrompts: [
      'What is the current hall status?',
      'What is today revenue?',
      'Show offline computers.',
      'Shut down all powered-on PCs without active users.',
    ],
    operatorBadge: 'Operator',
    assistantBadge: 'Nexora',
    metricOnline: 'Online',
    metricActive: 'Sessions',
    metricIdle: 'Idle',
    metricBooked: 'Booked',
    metricOffline: 'Offline',
    watchKicker: 'Nexora Watch',
    watchLoadingTitle: 'Refreshing status',
    watchLoadingText: 'Nexora is gathering room signals and preparing suggestions for the owner and operator.',
    watchAlertLabel: 'Alert',
    watchRun: 'Open',
    refreshing: 'Refreshing...',
    autopilotKicker: 'Controlled autopilot',
    autopilotTitle: 'Nexora Autopilot',
    autopilotText: 'Manage safe rules and suggestion modes here. Risky actions still stay behind confirmation.',
    autopilotSaving: 'Saving...',
    autopilotRuleEnabledTitle: 'Autopilot enabled',
    autopilotRuleEnabledBody: 'Nexora Watch keeps observing the club and running safe rules.',
    autopilotRuleLockTitle: 'Auto-lock idle online PCs',
    autopilotRuleLockBody: 'Nexora can send a safe lock command for idle online PCs on its own.',
    autopilotRuleSuggestIdleTitle: 'Idle shutdown suggestions',
    autopilotRuleSuggestIdleBody: 'When too many powered-on PCs are idle, Nexora proposes a shutdown plan.',
    autopilotRuleSuggestOfflineTitle: 'Offline watch suggestions',
    autopilotRuleSuggestOfflineBody: 'Show proactive alerts for offline and stale machines.',
    confirm: 'Confirm',
    cancel: 'Cancel',
    cancelledPlan: 'Plan dismissed. No commands were sent.',
    executedPlan: 'Plan executed.',
    executing: 'Sending...',
    planning: 'Nexora is checking the hall and preparing the action plan...',
    composerLabel: 'Send with text',
    voiceHint: 'Press the logo to dictate a command.',
    voiceListening: 'Listening...',
    voiceUnsupported: 'Voice dictation is not supported in this browser.',
    voicePermissionDenied: 'Microphone permission was denied.',
    voiceError: 'Voice dictation failed. Continue with text.',
    placeholder: 'For example: shut down all powered-on PCs without active users',
    send: 'Send',
    statusIdleTitle: 'Ready to listen',
    statusIdleText: 'Press the Nexora logo and say your command naturally.',
    statusListeningTitle: 'Listening now',
    statusListeningText: 'Keep speaking until the command is complete. When you finish, press the logo again and Nexora will stop recording and send it automatically.',
    statusSendingTitle: 'Sending now',
    statusSendingText: 'Nexora is preparing the transcript and sending your command...',
    statusThinkingTitle: 'Analyzing request',
    statusThinkingText: 'Nexora is reviewing the request and preparing a safe execution plan.',
    statusDraftTitle: 'Command captured',
    statusDraftText: 'If the text looks right, send it now or press the logo again to speak again.',
    statusUnsupportedTitle: 'Text mode',
    statusUnsupportedText: 'Voice is unavailable here, but Nexora can still be controlled with text.',
    languageLabel: 'Speech language',
    voiceGreeting: 'Hello, I am Nexora AI. How can I help you today?',
    genericError: 'There was an error while talking to Nexora.',
  },
}

const assistantLogo = '/brand/nexora-assistant-logo.png'

function defaultAutopilotState() {
  return {
    enabled: false,
    auto_lock_idle_online: false,
    suggest_idle_shutdown: true,
    suggest_offline_watch: true,
    can_manage: false,
  }
}

const open = ref(false)
const draft = ref('')
const thread = ref([])
const watchData = ref(null)
const autopilot = ref(defaultAutopilotState())
const threadRef = ref(null)
const draftInput = ref(null)
const loading = ref({
  plan: false,
  execute: false,
  overview: false,
  autopilot: false,
})
const activePlanId = ref('')
const recognizing = ref(false)
const voiceError = ref('')
const recognitionRef = ref(null)
const voiceCaptured = ref(false)
const voiceShouldContinue = ref(false)
const voiceSubmitOnStop = ref(false)
const voiceSending = ref(false)
const speechLocale = ref(resolveSpeechLocale(locale.value))
const speechLocaleOptions = computed(() => [
  { value: 'uz-UZ', label: 'UZ' },
  { value: 'ru-RU', label: 'RU' },
  { value: 'en-US', label: 'EN' },
])
let speechFinalTranscript = ''
let recognitionRestartTimer = null
let voiceSubmitTimer = null
const speakingAudio = ref(false)
let activeAudio = null
let activeAudioUrl = ''
let audioRequestToken = 0

const ui = computed(() => COPY[locale.value] || COPY.uz)
const watchSummary = computed(() => watchData.value?.summary || null)
const watchMetrics = computed(() => watchData.value?.metrics || null)
const watchAlerts = computed(() => Array.isArray(watchData.value?.alerts) ? watchData.value.alerts : [])
const watchActions = computed(() => Array.isArray(watchData.value?.suggested_actions) ? watchData.value.suggested_actions : [])
const autopilotRules = computed(() => [
  {
    key: 'enabled',
    enabled: Boolean(autopilot.value.enabled),
    title: ui.value.autopilotRuleEnabledTitle,
    body: ui.value.autopilotRuleEnabledBody,
  },
  {
    key: 'auto_lock_idle_online',
    enabled: Boolean(autopilot.value.auto_lock_idle_online),
    title: ui.value.autopilotRuleLockTitle,
    body: ui.value.autopilotRuleLockBody,
  },
  {
    key: 'suggest_idle_shutdown',
    enabled: Boolean(autopilot.value.suggest_idle_shutdown),
    title: ui.value.autopilotRuleSuggestIdleTitle,
    body: ui.value.autopilotRuleSuggestIdleBody,
  },
  {
    key: 'suggest_offline_watch',
    enabled: Boolean(autopilot.value.suggest_offline_watch),
    title: ui.value.autopilotRuleSuggestOfflineTitle,
    body: ui.value.autopilotRuleSuggestOfflineBody,
  },
])

const speechSupported = computed(() => {
  if (!import.meta.client) return false
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
})

const statusTitle = computed(() => {
  if (voiceSending.value) return ui.value.statusSendingTitle
  if (loading.value.plan || loading.value.execute) return ui.value.statusThinkingTitle
  if (recognizing.value) return ui.value.statusListeningTitle
  if (!speechSupported.value) return ui.value.statusUnsupportedTitle
  if (draft.value) return ui.value.statusDraftTitle
  return ui.value.statusIdleTitle
})

const statusText = computed(() => {
  if (voiceSending.value) return ui.value.statusSendingText
  if (loading.value.plan || loading.value.execute) return ui.value.statusThinkingText
  if (recognizing.value) return ui.value.statusListeningText
  if (voiceError.value) return voiceError.value
  if (!speechSupported.value) return ui.value.statusUnsupportedText
  if (draft.value) return ui.value.statusDraftText
  return ui.value.statusIdleText
})

const manualHint = computed(() => {
  if (voiceSending.value) return ui.value.executing
  if (voiceError.value) return voiceError.value
  if (recognizing.value) return ui.value.voiceListening
  if (!speechSupported.value) return ui.value.voiceUnsupported
  return ui.value.voiceHint
})

watch(
  () => open.value,
  (value) => {
    if (value && thread.value.length === 0) {
      resetThread()
    }
  },
)

watch(
  () => thread.value.length,
  async () => {
    await nextTick()
    scrollThread()
  },
)

watch(
  () => locale.value,
  (value) => {
    speechLocale.value = resolveSpeechLocale(value)
    if (open.value) {
      void loadOverview()
    }
  },
)

function openAssistant() {
  open.value = true
  voiceError.value = ''
  voiceSending.value = false
  if (thread.value.length === 0) resetThread()
  void loadOverview()
  void playAssistantVoice(ui.value.voiceGreeting)
}

function closeAssistant() {
  open.value = false
  clearVoiceSubmitDelay()
  voiceSending.value = false
  stopPlayback()
  stopRecognition(true)
}

function resetThread() {
  thread.value = []
}

function syncOverview(payload) {
  watchData.value = payload || null
  autopilot.value = {
    ...defaultAutopilotState(),
    ...(payload?.autopilot || {}),
  }
}

async function loadOverview() {
  if (!open.value) return

  loading.value.overview = true
  try {
    const { data } = await cpApi.nexoraOverview({ locale: locale.value })
    syncOverview(data?.data || null)
  } catch {
    watchData.value = null
  } finally {
    loading.value.overview = false
  }
}

async function toggleAutopilotRule(key) {
  if (!autopilot.value.can_manage || loading.value.autopilot) return

  const next = {
    enabled: Boolean(autopilot.value.enabled),
    auto_lock_idle_online: Boolean(autopilot.value.auto_lock_idle_online),
    suggest_idle_shutdown: Boolean(autopilot.value.suggest_idle_shutdown),
    suggest_offline_watch: Boolean(autopilot.value.suggest_offline_watch),
    [key]: !Boolean(autopilot.value[key]),
  }

  loading.value.autopilot = true

  try {
    const { data } = await cpApi.nexoraAutopilot({
      ...next,
      locale: locale.value,
    })

    const payload = data?.data || {}
    autopilot.value = {
      ...autopilot.value,
      ...(payload.autopilot || {}),
      can_manage: true,
    }

    const assistantMessage = String(payload.assistant_message || ui.value.genericError)
    thread.value.push(createMessage('assistant', assistantMessage))
    void playAssistantVoice(assistantMessage)
    await loadOverview()
  } catch (error) {
    const messageText = extractError(error)
    thread.value.push(createMessage('assistant', messageText))
    void playAssistantVoice(messageText)
  } finally {
    loading.value.autopilot = false
  }
}

function createMessage(role, text, extra = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    ...extra,
  }
}

function focusComposer() {
  nextTick(() => {
    draftInput.value?.focus?.()
  })
}

function handleCoreAction() {
  if (!speechSupported.value) {
    focusComposer()
    return
  }

  toggleVoice()
}

function sendSuggestion(text) {
  stopPlayback()
  draft.value = text
  submitDraft()
}

function clearVoiceSubmitDelay() {
  if (voiceSubmitTimer) {
    clearTimeout(voiceSubmitTimer)
    voiceSubmitTimer = null
  }
}

function scheduleVoiceSubmit() {
  if (voiceSending.value || loading.value.plan || loading.value.execute) return
  if (String(draft.value || '').trim() === '') return

  clearVoiceSubmitDelay()
  voiceSending.value = true
  voiceSubmitTimer = setTimeout(() => {
    voiceSubmitTimer = null
    voiceSending.value = false
    submitDraft()
  }, 400)
}

async function submitDraft() {
  const message = String(draft.value || '').trim()
  if (!message || voiceSending.value || loading.value.plan || loading.value.execute) return

  clearVoiceSubmitDelay()
  stopPlayback()
  stopRecognition(true)
  voiceError.value = ''
  voiceSending.value = false

  thread.value.push(createMessage('user', message))
  draft.value = ''
  loading.value.plan = true

  try {
    const { data } = await cpApi.nexoraPlan({
      message,
      locale: locale.value,
    })

    const plan = data?.data || {}

    const assistantMessage = String(plan.assistant_message || ui.value.genericError)

    thread.value.push(
      createMessage('assistant', String(plan.assistant_message || ui.value.genericError), {
        plan,
        planState: plan.confirmation_required ? 'pending' : 'done',
        suggestions: Array.isArray(plan.suggestions) ? plan.suggestions : [],
      }),
    )
    void playAssistantVoice(assistantMessage)
  } catch (error) {
    const messageText = extractError(error)
    thread.value.push(createMessage('assistant', messageText))
    void playAssistantVoice(messageText)
  } finally {
    loading.value.plan = false
    void loadOverview()
  }
}

async function executePlan(item) {
  if (!item?.plan?.plan_id || loading.value.execute) return

  loading.value.execute = true
  activePlanId.value = item.plan.plan_id

  try {
    const { data } = await cpApi.nexoraExecute({
      plan_id: item.plan.plan_id,
      confirmed: true,
      locale: locale.value,
    })

    item.planState = 'executed'

    const result = data?.data || {}
    const assistantMessage = String(result.assistant_message || ui.value.genericError)
    thread.value.push(createMessage('assistant', assistantMessage))
    void playAssistantVoice(assistantMessage)
  } catch (error) {
    const messageText = extractError(error)
    thread.value.push(createMessage('assistant', messageText))
    void playAssistantVoice(messageText)
  } finally {
    loading.value.execute = false
    activePlanId.value = ''
    void loadOverview()
  }
}

function dismissPlan(item) {
  if (!item) return
  item.planState = 'cancelled'
}

function extractError(error) {
  const direct = error?.response?.data?.message
  if (typeof direct === 'string' && direct.trim() !== '') return direct

  const errors = error?.response?.data?.errors
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors)[0]
    if (Array.isArray(first) && typeof first[0] === 'string') {
      return first[0]
    }
  }

  return ui.value.genericError
}

function toggleVoice() {
  if (!speechSupported.value) return
  if (recognizing.value) {
    stopRecognition(true, { submitOnStop: true })
    return
  }

  startRecognition()
}

function startRecognition() {
  stopPlayback()
  beginRecognition(true)
}

async function playAssistantVoice(text) {
  const content = String(text || '').trim()
  if (!import.meta.client || !open.value || content === '') return

  const requestToken = ++audioRequestToken
  stopPlayback()

  try {
    const response = await cpApi.nexoraSpeak({
      text: content,
      locale: locale.value,
    })

    if (requestToken !== audioRequestToken || !open.value) {
      return
    }

    const blob = response?.data instanceof Blob
      ? response.data
      : new Blob([response?.data], {
          type: response?.headers?.['content-type'] || 'audio/mpeg',
        })

    activeAudioUrl = URL.createObjectURL(blob)
    activeAudio = new Audio(activeAudioUrl)
    speakingAudio.value = true

    activeAudio.onended = () => {
      stopPlayback()
    }

    activeAudio.onerror = () => {
      stopPlayback()
    }

    await activeAudio.play()
  } catch {
    stopPlayback()
  }
}

function stopPlayback() {
  audioRequestToken += 1

  if (activeAudio) {
    try {
      activeAudio.pause()
      activeAudio.currentTime = 0
    } catch {
      // Ignore playback stop issues.
    }
    activeAudio.onended = null
    activeAudio.onerror = null
    activeAudio = null
  }

  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl)
    activeAudioUrl = ''
  }

  speakingAudio.value = false
}

function beginRecognition(resetDraft = false) {
  if (!import.meta.client || !speechSupported.value) return

  clearRecognitionRestart()
  voiceError.value = ''
  voiceSubmitOnStop.value = false
  voiceSending.value = false
  voiceShouldContinue.value = true
  if (resetDraft) {
    voiceCaptured.value = false
    draft.value = ''
    speechFinalTranscript = ''
  }

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Recognition) return

  const recognition = new Recognition()
  recognition.lang = speechLocale.value
  recognition.interimResults = true
  recognition.continuous = true
  recognition.maxAlternatives = 1

  recognition.onstart = () => {
    recognizing.value = true
  }

  recognition.onresult = (event) => {
    let finalChunk = ''
    let interimChunk = ''

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const piece = `${event.results[index][0]?.transcript || ''} `.trim()
      if (!piece) continue
      if (event.results[index].isFinal) {
        finalChunk += `${piece} `
      } else {
        interimChunk += `${piece} `
      }
    }

    if (finalChunk) {
      speechFinalTranscript = `${speechFinalTranscript} ${finalChunk}`.trim()
    }

    draft.value = `${speechFinalTranscript} ${interimChunk}`.trim()
    voiceCaptured.value = draft.value.length > 0
  }

  recognition.onerror = (event) => {
    if (event?.error === 'aborted' || event?.error === 'no-speech') {
      return
    }

    voiceShouldContinue.value = false
    voiceSubmitOnStop.value = false
    voiceSending.value = false
    if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
      voiceError.value = ui.value.voicePermissionDenied
    } else {
      voiceError.value = ui.value.voiceError
    }
  }

  recognition.onend = () => {
    recognizing.value = false
    recognitionRef.value = null

    const shouldSubmit =
      voiceSubmitOnStop.value &&
      open.value &&
      !loading.value.plan &&
      !loading.value.execute &&
      String(draft.value || '').trim() !== ''

    voiceSubmitOnStop.value = false

    if (voiceShouldContinue.value && open.value && !loading.value.plan && !loading.value.execute) {
      recognitionRestartTimer = setTimeout(() => {
        beginRecognition(false)
      }, 120)
      return
    }

    if (shouldSubmit) {
      scheduleVoiceSubmit()
    }
  }

  recognitionRef.value = recognition
  recognition.start()
}

function clearRecognitionRestart() {
  if (recognitionRestartTimer) {
    clearTimeout(recognitionRestartTimer)
    recognitionRestartTimer = null
  }
}

function stopRecognition(userInitiated = false, options = {}) {
  if (userInitiated) {
    voiceShouldContinue.value = false
  }
  voiceSubmitOnStop.value = Boolean(options.submitOnStop)
  clearRecognitionRestart()
  if (!voiceSubmitOnStop.value) {
    clearVoiceSubmitDelay()
    voiceSending.value = false
  }
  if (recognitionRef.value) {
    recognitionRef.value.stop()
    recognitionRef.value = null
  }
  recognizing.value = false
}

function resolveSpeechLocale(code) {
  if (code === 'ru') return 'ru-RU'
  if (code === 'en') return 'en-US'
  return 'uz-UZ'
}

function scrollThread() {
  const element = threadRef.value
  if (!element) return
  element.scrollTop = element.scrollHeight
}

onBeforeUnmount(() => {
  clearVoiceSubmitDelay()
  voiceSending.value = false
  stopPlayback()
  stopRecognition(true)
})
</script>

<style scoped>
.nexora-root {
  display: contents;
}

.nexora-trigger {
  height: 48px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px 0 8px;
  border-radius: 14px;
  border: 1px solid rgba(55, 232, 255, 0.24);
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(55, 232, 255, 0.16), transparent 52%),
    linear-gradient(180deg, rgba(18, 31, 44, 0.96), rgba(11, 21, 30, 0.92));
  color: var(--text);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.2);
}

.nexora-trigger-orb {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  color: #05212b;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(95, 229, 255, 0.92));
}

.nexora-trigger-copy {
  display: grid;
  gap: 2px;
  text-align: left;
}

.nexora-trigger-copy strong {
  font-size: 13px;
  line-height: 1;
}

.nexora-trigger-copy small {
  font-size: 11px;
  line-height: 1;
  color: var(--text-muted);
}

.nexora-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at center, rgba(55, 232, 255, 0.12), transparent 42%),
    rgba(4, 10, 16, 0.68);
  backdrop-filter: blur(16px);
}

.nexora-modal {
  position: relative;
  width: min(920px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  display: grid;
  gap: 22px;
  padding: 28px;
  border-radius: 32px;
  border: 1px solid rgba(55, 232, 255, 0.16);
  background:
    radial-gradient(circle at top, rgba(55, 232, 255, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(8, 16, 24, 0.98), rgba(6, 12, 19, 0.98));
  box-shadow: 0 34px 120px rgba(0, 0, 0, 0.42);
}

.nexora-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}

.nexora-hero {
  display: grid;
  gap: 8px;
  justify-items: center;
  text-align: center;
  padding-top: 6px;
}

.nexora-kicker {
  margin: 0;
  color: #85f6ff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.nexora-hero h3 {
  margin: 0;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 0.96;
}

.nexora-hero span {
  max-width: 640px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.65;
}

.nexora-core {
  position: relative;
  width: 224px;
  height: 224px;
  justify-self: center;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  transition: transform 160ms ease;
}

.nexora-core:hover {
  transform: translateY(-2px) scale(1.01);
}

.nexora-core:disabled {
  cursor: wait;
}

.nexora-core-ring,
.nexora-core-glow,
.nexora-voice-spectrum {
  position: absolute;
  inset: 0;
  border-radius: 999px;
}

.nexora-core-ring {
  border: 1px solid rgba(55, 232, 255, 0.18);
}

.nexora-core .ring-one {
  inset: 8px;
  border-width: 2px;
}

.nexora-core .ring-two {
  inset: 26px;
  border-color: rgba(255, 255, 255, 0.14);
}

.nexora-core-glow {
  inset: 20px;
  background:
    radial-gradient(circle at center, rgba(55, 232, 255, 0.24) 0%, rgba(55, 232, 255, 0.08) 42%, transparent 72%),
    radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 56%);
  filter: blur(10px);
}

.nexora-voice-spectrum {
  inset: 6px;
  pointer-events: none;
}

.spectrum-spoke {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  transform: rotate(var(--bar-angle));
}

.spectrum-bar {
  width: 4px;
  height: 18px;
  margin-top: 6px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(196, 251, 255, 0.94), rgba(55, 232, 255, 0.18));
  box-shadow: 0 0 12px rgba(55, 232, 255, 0.18);
  opacity: 0.08;
  transform: scaleY(0.42);
  transform-origin: center bottom;
}

.nexora-core-logo {
  position: relative;
  z-index: 1;
  width: 148px;
  height: 148px;
  object-fit: contain;
  filter: drop-shadow(0 18px 34px rgba(20, 236, 255, 0.22));
}

.nexora-core.listening .ring-one,
.nexora-core.listening .ring-two {
  animation: nexoraPulse 1.5s ease-in-out infinite;
}

.nexora-core.listening .spectrum-bar {
  animation: nexoraSpectrum 1.1s ease-in-out infinite;
  animation-delay: var(--bar-delay);
}

.nexora-core.listening .nexora-core-glow {
  animation: nexoraGlow 1.5s ease-in-out infinite;
}

.nexora-core.busy .nexora-core-logo {
  animation: nexoraFloat 1.8s ease-in-out infinite;
}

.nexora-core.busy .spectrum-bar {
  opacity: 0.18;
  animation: nexoraSpectrum 1.6s ease-in-out infinite;
  animation-delay: var(--bar-delay);
}

.nexora-core.unsupported {
  opacity: 0.8;
}

.nexora-status {
  display: grid;
  gap: 8px;
  justify-items: center;
  text-align: center;
}

.nexora-status strong {
  font-size: 22px;
}

.nexora-status p {
  max-width: 620px;
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
}

.nexora-inline-loader {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.nexora-inline-loader span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(98, 230, 255, 0.92);
  box-shadow: 0 0 16px rgba(98, 230, 255, 0.38);
  animation: nexoraLoaderDot 0.72s ease-in-out infinite;
}

.nexora-inline-loader span:nth-child(2) {
  animation-delay: 0.12s;
}

.nexora-inline-loader span:nth-child(3) {
  animation-delay: 0.24s;
}

.nexora-draft-chip {
  max-width: min(720px, 100%);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 18px;
  border: 1px solid rgba(55, 232, 255, 0.14);
  background: rgba(55, 232, 255, 0.08);
  color: var(--text);
  font-size: 13px;
}

.nexora-language-row {
  display: grid;
  gap: 10px;
  justify-items: center;
}

.nexora-language-label {
  color: var(--text-faint);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.nexora-language-switch {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.nexora-language-chip {
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.nexora-language-chip.active {
  border-color: rgba(55, 232, 255, 0.26);
  background: rgba(55, 232, 255, 0.1);
  color: var(--text);
}

.nexora-watch-shell {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 26px;
  border: 1px solid rgba(55, 232, 255, 0.12);
  background:
    radial-gradient(circle at top, rgba(55, 232, 255, 0.08), transparent 52%),
    rgba(255, 255, 255, 0.03);
}

.nexora-watch-head,
.nexora-autopilot-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.nexora-watch-head h4,
.nexora-autopilot-head h4 {
  margin: 0;
  font-size: 20px;
}

.nexora-watch-head p,
.nexora-autopilot-head p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.nexora-section-kicker {
  margin: 0 0 6px;
  color: #8af7ff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.nexora-watch-badge {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(55, 232, 255, 0.16);
  background: rgba(55, 232, 255, 0.08);
  color: var(--text);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nexora-watch-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.watch-metric {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.watch-metric span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.watch-metric strong {
  font-size: 22px;
}

.nexora-watch-grid,
.nexora-autopilot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.nexora-watch-card,
.nexora-rule {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  text-align: left;
}

.nexora-watch-card.severity-warning {
  border-color: rgba(255, 189, 89, 0.2);
  background: rgba(255, 189, 89, 0.06);
}

.nexora-watch-card.severity-critical {
  border-color: rgba(255, 115, 115, 0.22);
  background: rgba(255, 115, 115, 0.06);
}

.nexora-watch-card-top {
  display: grid;
  gap: 6px;
}

.nexora-watch-tag {
  justify-self: flex-start;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-faint);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.nexora-watch-card strong,
.nexora-rule strong {
  font-size: 15px;
}

.nexora-watch-card p,
.nexora-rule small {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.nexora-watch-action {
  justify-self: flex-start;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(55, 232, 255, 0.16);
  background: rgba(55, 232, 255, 0.1);
  color: var(--text);
  font-size: 12px;
  font-weight: 800;
}

.nexora-watch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.nexora-watch-pill {
  min-width: min(100%, 220px);
  flex: 1 1 200px;
  display: grid;
  gap: 4px;
  padding: 13px 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  text-align: left;
}

.nexora-watch-pill strong {
  font-size: 13px;
}

.nexora-watch-pill span {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.nexora-autopilot {
  display: grid;
  gap: 12px;
  padding-top: 4px;
}

.nexora-rule {
  position: relative;
  padding-left: 62px;
}

.nexora-rule-toggle {
  position: absolute;
  top: 14px;
  left: 14px;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: background 160ms ease;
}

.nexora-rule-toggle span {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  transition: transform 160ms ease;
}

.nexora-rule.active {
  border-color: rgba(55, 232, 255, 0.18);
  background: rgba(55, 232, 255, 0.08);
}

.nexora-rule.active .nexora-rule-toggle {
  background: rgba(55, 232, 255, 0.28);
}

.nexora-rule.active .nexora-rule-toggle span {
  transform: translateX(14px);
}

.nexora-chip-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.nexora-chip-row.compact {
  justify-content: flex-start;
}

.nexora-chip {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(55, 232, 255, 0.14);
  background: rgba(55, 232, 255, 0.06);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
}

.nexora-manual {
  display: grid;
  gap: 10px;
}

.nexora-manual-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.nexora-manual-head span {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.nexora-manual-head small {
  color: var(--text-muted);
  font-size: 12px;
}

.nexora-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(18, 28, 38, 0.96), rgba(10, 17, 25, 0.96));
}

.nexora-input {
  min-height: 74px;
  resize: none;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--text);
}

.nexora-input:focus {
  outline: none;
}

.nexora-send {
  min-width: 112px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(95, 229, 255, 0.92));
  color: #052029;
  font-size: 13px;
  font-weight: 800;
}

.nexora-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nexora-results-shell {
  min-height: 0;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}

.nexora-empty {
  min-height: 180px;
  display: grid;
  place-items: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.nexora-empty strong {
  font-size: 18px;
}

.nexora-empty p {
  max-width: 540px;
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
}

.nexora-thread {
  max-height: 320px;
  overflow-y: auto;
  display: grid;
  gap: 12px;
  padding: 14px;
}

.nexora-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.nexora-card.is-user {
  background: linear-gradient(180deg, rgba(55, 232, 255, 0.14), rgba(55, 232, 255, 0.06));
  border-color: rgba(55, 232, 255, 0.2);
}

.nexora-card.ghost {
  opacity: 0.78;
}

.nexora-card-top {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.nexora-role,
.nexora-action-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nexora-role {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
}

.nexora-action-badge {
  background: rgba(55, 232, 255, 0.12);
  color: var(--brand);
}

.nexora-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text);
}

.nexora-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-pill {
  display: grid;
  gap: 3px;
  padding: 11px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.metric-pill span {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.metric-pill strong {
  font-size: 18px;
}

.nexora-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.target-pill {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.target-pill strong {
  font-size: 13px;
}

.target-pill span {
  font-size: 11px;
  color: var(--text-muted);
}

.nexora-confirm {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.confirm-btn {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-weight: 800;
}

.confirm-btn.primary {
  color: #052029;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(95, 229, 255, 0.92));
}

.confirm-btn.muted {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
}

.nexora-state {
  font-size: 12px;
  font-weight: 700;
}

.nexora-state.success {
  color: #5eead4;
}

.nexora-state.muted {
  color: var(--text-muted);
}

@keyframes nexoraPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.58;
  }
  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}

@keyframes nexoraGlow {
  0%,
  100% {
    transform: scale(0.98);
    opacity: 0.72;
  }
  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes nexoraFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes nexoraSpectrum {
  0%,
  100% {
    opacity: 0.14;
    transform: scaleY(0.38);
  }
  25% {
    opacity: 0.4;
    transform: scaleY(0.7);
  }
  55% {
    opacity: 1;
    transform: scaleY(1.55);
  }
  80% {
    opacity: 0.46;
    transform: scaleY(0.86);
  }
}

@keyframes nexoraLoaderDot {
  0%,
  100% {
    opacity: 0.36;
    transform: translateY(0) scale(0.92);
  }
  50% {
    opacity: 1;
    transform: translateY(-3px) scale(1);
  }
}

@media (max-width: 900px) {
  .nexora-modal {
    padding: 22px;
  }

  .nexora-thread {
    max-height: 280px;
  }
}

@media (max-width: 720px) {
  .nexora-overlay {
    padding: 12px;
  }

  .nexora-modal {
    max-height: calc(100vh - 24px);
    padding: 18px;
    border-radius: 24px;
  }

  .nexora-trigger-copy small {
    display: none;
  }

  .nexora-core {
    width: 188px;
    height: 188px;
  }

  .nexora-core-logo {
    width: 124px;
    height: 124px;
  }

  .nexora-watch-head,
  .nexora-autopilot-head {
    display: grid;
  }

  .nexora-composer,
  .nexora-manual-head,
  .nexora-confirm,
  .nexora-metrics,
  .nexora-watch-metrics,
  .nexora-watch-grid,
  .nexora-autopilot-grid {
    grid-template-columns: minmax(0, 1fr);
    display: grid;
  }

  .nexora-rule {
    padding-left: 58px;
  }

  .nexora-send {
    width: 100%;
  }

  .nexora-thread {
    max-height: 260px;
  }
}
</style>
