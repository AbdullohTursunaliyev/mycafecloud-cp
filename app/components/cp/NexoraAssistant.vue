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
              speaking: speakingAudio,
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

          <details class="nexora-prompt-drawer">
            <summary class="nexora-prompt-summary">
              <span>
                <Icon name="lucide:wand-sparkles" size="15" />
                <strong>{{ assistantUi.quickPromptsTitle }}</strong>
              </span>
              <small>{{ assistantUi.quickPromptsHint }}</small>
              <Icon class="nexora-prompt-chevron" name="lucide:chevron-down" size="16" />
            </summary>

            <div class="nexora-prompt-panel">
              <button
                v-for="suggestion in assistantUi.quickPrompts"
                :key="suggestion"
                class="nexora-chip"
                type="button"
                :disabled="voiceSending || loading.plan || loading.execute"
                @click="sendSuggestion(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </details>

          <div class="nexora-manual">
            <div class="nexora-manual-head">
              <span>{{ assistantUi.composerLabel }}</span>
              <small>{{ manualHint }}</small>
            </div>

            <div class="nexora-composer">
              <textarea
                ref="draftInput"
                v-model.trim="draft"
                class="nexora-input"
                :placeholder="assistantUi.placeholder"
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

                <div
                  v-if="item.role === 'assistant' && item.plan?.pending?.options?.length"
                  class="nexora-clarify-options"
                >
                  <button
                    v-for="option in item.plan.pending.options"
                    :key="`${item.id}-${option.message}`"
                    class="nexora-clarify-option"
                    type="button"
                    :disabled="voiceSending || loading.plan || loading.execute"
                    @click="sendSuggestion(option.message)"
                  >
                    {{ option.label || option.message }}
                  </button>
                </div>

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

                <div v-if="item.role === 'assistant' && item.plan && item.plan.report_file" class="nexora-downloads">
                  <button
                    class="nexora-download"
                    type="button"
                    :disabled="reportDownloading === item.plan.report_file.filename"
                    @click="downloadReportFile(item.plan.report_file)"
                  >
                    <Icon name="lucide:download" size="16" />
                    <span>
                      {{ reportDownloading === item.plan.report_file.filename ? ui.downloadingReport : ui.downloadReport }}
                    </span>
                  </button>
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
                <p class="nexora-text">{{ assistantUi.planning }}</p>
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
    quickPromptsTitle: 'Tayyor buyruqlar',
    quickPromptsHint: 'Kerak bo‘lsa oching',
    quickPrompts: [
      'Hozir zal holati qanday?',
      'Bugungi smena haqida ayt.',
      'Klub bo‘yicha umumiy holatni ayt.',
      'Joriy smena risklarini tekshir.',
      'Klub tushumini qanday oshirsak bo‘ladi?',
      'Mijoz segmentlarini ko‘rsat.',
      'Shell va PClar holatini tekshir.',
      'Autopilot nima tavsiya qiladi?',
      'Owner uchun eng muhim qarorlarni ayt.',
      'Bugungi tushum qancha?',
      'Klubni bir yillik hisobotini Excel qilib ber.',
      'Offline kompyuterlarni ko‘rsat.',
    ],
    operatorBadge: 'Operator',
    assistantBadge: 'Nexora',
    metricOnline: 'Online',
    metricActive: 'Sessiya',
    metricIdle: 'Bo‘sh',
    metricBooked: 'Bron',
    metricOffline: 'Offline',
    confirm: 'Tasdiqlash',
    cancel: 'Bekor qilish',
    cancelledPlan: 'Reja bekor qilindi. Hech qanday buyruq yuborilmadi.',
    executedPlan: 'Plan bajarildi.',
    executing: 'Yuborilmoqda...',
    planning: 'Nexora holatni tekshirib, amal rejasini tayyorlayapti...',
    composerLabel: 'Matn bilan yuborish',
    voiceHint: 'Logoga bosib audio yozing, Nexora uni aniq transcribe qilib o‘zi yuboradi.',
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
    statusThinkingText: 'Nexora siz aytgan vazifani tekshirib, bajarish rejasini tayyorlayapti.',
    statusSpeakingTitle: 'Nexora javob bermoqda',
    statusSpeakingText: 'Javob ekranda ham yozildi, hozir ovoz bilan ham aytilyapti.',
    statusDraftTitle: 'Buyruq ushlandi',
    statusDraftText: 'Matn to‘g‘ri bo‘lsa yuboring yoki yana logoga bosib qayta gapiring.',
    statusUnsupportedTitle: 'Matn rejimi',
    statusUnsupportedText: 'Bu brauzerda ovoz ishlamaydi, lekin matn orqali bemalol boshqarsa bo‘ladi.',
    languageLabel: 'Nutq tili',
    voiceGreeting: 'Salom, janob. Men Nexora AI man. Sizga qanday yordam bera olaman?',
    voicePlaybackError: 'Nexora ovozi hozir ishlamadi. OpenAI kaliti sozlanganini tekshiring.',
    downloadReport: 'Hisobotni yuklab olish',
    downloadingReport: 'Yuklanmoqda...',
    downloadError: 'Hisobotni yuklashda xatolik yuz berdi.',
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
    quickPromptsTitle: 'Готовые команды',
    quickPromptsHint: 'Откройте при необходимости',
    quickPrompts: [
      'Какая сейчас ситуация в зале?',
      'Расскажи про текущую смену.',
      'Дай общую сводку по клубу.',
      'Проверь риски текущей смены.',
      'Как увеличить выручку клуба?',
      'Покажи сегменты клиентов.',
      'Проверь состояние оболочки и компьютеров.',
      'Что рекомендует автопилот Nexora?',
      'Дай главные решения для владельца.',
      'Какая выручка сегодня?',
      'Подготовь годовой отчет клуба таблицей.',
      'Покажи офлайн компьютеры.',
    ],
    operatorBadge: 'Оператор',
    assistantBadge: 'Nexora',
    metricOnline: 'Онлайн',
    metricActive: 'Сессии',
    metricIdle: 'Свободно',
    metricBooked: 'Бронь',
    metricOffline: 'Офлайн',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
    cancelledPlan: 'План отменен. Команды не отправлены.',
    executedPlan: 'План выполнен.',
    executing: 'Отправка...',
    planning: 'Nexora проверяет состояние и готовит план действий...',
    composerLabel: 'Отправить текстом',
    voiceHint: 'Нажмите на логотип, продиктуйте команду, и Nexora сама распознает и отправит ее.',
    voiceListening: 'Слушаю...',
    voiceUnsupported: 'В этом браузере голосовой ввод не поддерживается.',
    voicePermissionDenied: 'Нет доступа к микрофону.',
    voiceError: 'Голосовой ввод не сработал. Продолжайте текстом.',
    placeholder: 'Например: выключи все включенные компьютеры без людей',
    send: 'Отправить',
    statusIdleTitle: 'Готов слушать',
    statusIdleText: 'Нажмите на логотип Nexora и скажите команду обычными словами.',
    statusListeningTitle: 'Идет прослушивание',
    statusListeningText: 'Говорите до конца команды. Когда закончите, нажмите на логотип еще раз, и Nexora сама остановит запись и отправит текст.',
    statusSendingTitle: 'Отправляю',
    statusSendingText: 'Nexora подготавливает запись и отправляет команду на сервер...',
    statusThinkingTitle: 'Идет анализ',
    statusThinkingText: 'Nexora проверяет задачу и готовит безопасный план выполнения.',
    statusSpeakingTitle: 'Nexora отвечает',
    statusSpeakingText: 'Ответ уже показан на экране, сейчас Nexora озвучивает его.',
    statusDraftTitle: 'Команда распознана',
    statusDraftText: 'Если текст верный, отправьте его или нажмите на логотип и продиктуйте заново.',
    statusUnsupportedTitle: 'Текстовый режим',
    statusUnsupportedText: 'Голос здесь недоступен, но вы можете управлять Nexora через текст.',
    languageLabel: 'Язык речи',
    voiceGreeting: 'Здравствуйте. Я Nexora. Чем могу помочь?',
    voicePlaybackError: 'Голос Nexora сейчас не сработал. Проверьте ключ OpenAI.',
    downloadReport: 'Скачать отчет',
    downloadingReport: 'Скачивание...',
    downloadError: 'Не удалось скачать отчет.',
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
    quickPromptsTitle: 'Ready commands',
    quickPromptsHint: 'Open only if needed',
    quickPrompts: [
      'What is the current hall status?',
      'Tell me about the current shift.',
      'Give me a full club overview.',
      'Check current shift risks.',
      'How can we increase club revenue?',
      'Show client segments.',
      'Check the shell client and computer status.',
      'What does Nexora Autopilot recommend?',
      'Give the main owner decisions.',
      'What is today revenue?',
      'Prepare the annual club report in Excel.',
      'Show offline computers.',
    ],
    operatorBadge: 'Operator',
    assistantBadge: 'Nexora',
    metricOnline: 'Online',
    metricActive: 'Sessions',
    metricIdle: 'Idle',
    metricBooked: 'Booked',
    metricOffline: 'Offline',
    confirm: 'Confirm',
    cancel: 'Cancel',
    cancelledPlan: 'Plan dismissed. No commands were sent.',
    executedPlan: 'Plan executed.',
    executing: 'Sending...',
    planning: 'Nexora is checking the hall and preparing the action plan...',
    composerLabel: 'Send with text',
    voiceHint: 'Press the logo, record your voice, and Nexora will transcribe and send it.',
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
    statusSpeakingTitle: 'Nexora is speaking',
    statusSpeakingText: 'The answer is already on screen, and Nexora is reading it aloud.',
    statusDraftTitle: 'Command captured',
    statusDraftText: 'If the text looks right, send it now or press the logo again to speak again.',
    statusUnsupportedTitle: 'Text mode',
    statusUnsupportedText: 'Voice is unavailable here, but Nexora can still be controlled with text.',
    languageLabel: 'Speech language',
    voiceGreeting: 'Hello, I am Nexora AI. How can I help you today?',
    voicePlaybackError: 'AI voice did not work. Please check the OpenAI API key.',
    downloadReport: 'Download report',
    downloadingReport: 'Downloading...',
    downloadError: 'Could not download the report.',
    genericError: 'There was an error while talking to Nexora.',
  },
}

const assistantLogo = '/brand/nexora-assistant-logo.png'

const open = ref(false)
const draft = ref('')
const thread = ref([])
const conversationId = ref('')
const threadRef = ref(null)
const draftInput = ref(null)
const loading = ref({
  plan: false,
  execute: false,
})
const activePlanId = ref('')
const reportDownloading = ref('')
const recognizing = ref(false)
const voiceError = ref('')
const voiceCaptured = ref(false)
const voiceSubmitOnStop = ref(false)
const voiceSending = ref(false)
const speechLocale = ref(resolveSpeechLocale(locale.value))
const speechLocaleOptions = computed(() => [
  { value: 'uz-UZ', label: 'UZ' },
  { value: 'ru-RU', label: 'RU' },
  { value: 'en-US', label: 'EN' },
])
const voiceLocaleCode = computed(() => localeCodeFromSpeech(speechLocale.value))
let voiceSubmitTimer = null
const speakingAudio = ref(false)
let activeAudio = null
let activeAudioUrl = ''
let audioRequestToken = 0
let activeAudioContext = null
let activeAudioSource = null
let mediaRecorder = null
let mediaStream = null
let recordedChunks = []

const ui = computed(() => COPY[locale.value] || COPY.uz)
const assistantUi = computed(() => COPY[voiceLocaleCode.value] || ui.value)

const speechSupported = computed(() => {
  if (!import.meta.client) return false
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  )
})

const statusTitle = computed(() => {
  if (voiceSending.value) return assistantUi.value.statusSendingTitle
  if (loading.value.plan || loading.value.execute) return assistantUi.value.statusThinkingTitle
  if (speakingAudio.value) return assistantUi.value.statusSpeakingTitle
  if (recognizing.value) return assistantUi.value.statusListeningTitle
  if (!speechSupported.value) return assistantUi.value.statusUnsupportedTitle
  if (draft.value) return assistantUi.value.statusDraftTitle
  return assistantUi.value.statusIdleTitle
})

const statusText = computed(() => {
  if (voiceSending.value) return assistantUi.value.statusSendingText
  if (loading.value.plan || loading.value.execute) return assistantUi.value.statusThinkingText
  if (speakingAudio.value) return assistantUi.value.statusSpeakingText
  if (recognizing.value) return assistantUi.value.statusListeningText
  if (voiceError.value) return voiceError.value
  if (!speechSupported.value) return assistantUi.value.statusUnsupportedText
  if (draft.value) return assistantUi.value.statusDraftText
  return assistantUi.value.statusIdleText
})

const manualHint = computed(() => {
  if (voiceSending.value) return assistantUi.value.executing
  if (voiceError.value) return voiceError.value
  if (recognizing.value) return assistantUi.value.voiceListening
  if (!speechSupported.value) return assistantUi.value.voiceUnsupported
  return assistantUi.value.voiceHint
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
  },
)

function openAssistant() {
  open.value = true
  voiceError.value = ''
  voiceSending.value = false
  unlockAudioPlayback()
  if (thread.value.length === 0) resetThread()
  void playAssistantVoice(assistantUi.value.voiceGreeting)
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
  conversationId.value = ''
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
    const payload = {
      message,
      locale: voiceLocaleCode.value,
    }
    if (conversationId.value) {
      payload.conversation_id = conversationId.value
    }

    const { data } = await cpApi.nexoraPlan(payload)

    const plan = data?.data || {}
    if (plan.conversation_id) {
      conversationId.value = String(plan.conversation_id)
    }

    const assistantMessage = String(plan.assistant_message || assistantUi.value.genericError)
    const assistantVoiceText = String(plan.voice_text || assistantMessage)

    thread.value.push(
      createMessage('assistant', assistantMessage, {
        plan,
        planState: plan.confirmation_required ? 'pending' : 'done',
        suggestions: Array.isArray(plan.suggestions) ? plan.suggestions : [],
      }),
    )
    void playAssistantVoice(assistantVoiceText)
  } catch (error) {
    const messageText = extractError(error)
    thread.value.push(createMessage('assistant', messageText))
    void playAssistantVoice(messageText)
  } finally {
    loading.value.plan = false
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
      approval_token: item.plan.approval?.token || item.plan.approval_token || '',
      locale: voiceLocaleCode.value,
    })

    item.planState = 'executed'

    const result = data?.data || {}
    const assistantMessage = String(result.assistant_message || assistantUi.value.genericError)
    const assistantVoiceText = String(result.voice_text || assistantMessage)
    thread.value.push(createMessage('assistant', assistantMessage))
    void playAssistantVoice(assistantVoiceText)
  } catch (error) {
    const messageText = extractError(error)
    thread.value.push(createMessage('assistant', messageText))
    void playAssistantVoice(messageText)
  } finally {
    loading.value.execute = false
    activePlanId.value = ''
  }
}

function dismissPlan(item) {
  if (!item) return
  item.planState = 'cancelled'
}

async function downloadReportFile(file) {
  const filename = String(file?.filename || '').trim()
  if (!filename || reportDownloading.value) return

  reportDownloading.value = filename

  try {
    const response = await cpApi.nexoraDownloadReport(filename)
    const blob = response?.data instanceof Blob
      ? response.data
      : new Blob([response?.data], {
          type: file?.content_type || response?.headers?.['content-type'] || 'application/octet-stream',
        })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch {
    const messageText = assistantUi.value.downloadError
    thread.value.push(createMessage('assistant', messageText))
    void playAssistantVoice(messageText)
  } finally {
    reportDownloading.value = ''
  }
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

  return assistantUi.value.genericError
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
  if (mediaRecorder || voiceSending.value || loading.value.plan || loading.value.execute) return
  stopPlayback()
  beginRecognition(true)
}

async function playAssistantVoice(text) {
  const content = String(text || '').trim()
  if (!import.meta.client || !open.value || content === '') return

  stopPlayback()
  const requestToken = ++audioRequestToken

  try {
    const response = await cpApi.nexoraSpeak({
      text: content,
      locale: voiceLocaleCode.value,
    })

    if (requestToken !== audioRequestToken || !open.value) {
      return
    }

    const blob = response?.data instanceof Blob
      ? response.data
      : new Blob([response?.data], {
          type: response?.headers?.['content-type'] || 'audio/mpeg',
        })

    const playedWithWebAudio = await playBlobWithWebAudio(blob, requestToken)
    if (playedWithWebAudio) {
      return
    }

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
    voiceError.value = assistantUi.value.voicePlaybackError
  }
}

function stopPlayback() {
  audioRequestToken += 1

  if (activeAudioSource) {
    try {
      activeAudioSource.stop()
    } catch {
      // Ignore already-stopped WebAudio sources.
    }
    activeAudioSource.onended = null
    activeAudioSource = null
  }

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

function unlockAudioPlayback() {
  if (!import.meta.client || typeof window === 'undefined') return
  if (activeAudioContext) {
    if (activeAudioContext.state === 'suspended') {
      activeAudioContext.resume().catch(() => {})
    }
    return
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return

  activeAudioContext = new AudioContextCtor()
  if (activeAudioContext.state === 'suspended') {
    activeAudioContext.resume().catch(() => {})
  }
}

async function playBlobWithWebAudio(blob, requestToken) {
  if (!import.meta.client || !blob?.size) return false

  unlockAudioPlayback()
  if (!activeAudioContext) return false

  try {
    if (activeAudioContext.state === 'suspended') {
      await activeAudioContext.resume()
    }

    const buffer = await blob.arrayBuffer()
    const audioBuffer = await activeAudioContext.decodeAudioData(buffer)

    if (requestToken !== audioRequestToken || !open.value) {
      return true
    }

    const source = activeAudioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(activeAudioContext.destination)
    source.onended = () => {
      if (activeAudioSource === source) {
        activeAudioSource = null
        speakingAudio.value = false
      }
    }

    activeAudioSource = source
    speakingAudio.value = true
    source.start(0)

    return true
  } catch {
    return false
  }
}

async function beginRecognition(resetDraft = false) {
  if (!import.meta.client || !speechSupported.value) return

  voiceError.value = ''
  voiceSubmitOnStop.value = false
  voiceSending.value = false
  if (resetDraft) {
    voiceCaptured.value = false
    draft.value = ''
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    const mimeType = resolveRecorderMimeType()
    mediaRecorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream)
    recordedChunks = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) {
        recordedChunks.push(event.data)
        voiceCaptured.value = true
      }
    }

    mediaRecorder.onerror = () => {
      voiceError.value = assistantUi.value.voiceError
      voiceSending.value = false
      recognizing.value = false
      voiceSubmitOnStop.value = false
      stopMediaStream()
    }

    mediaRecorder.onstop = async () => {
      const shouldSubmit = Boolean(voiceSubmitOnStop.value)
      const chunks = [...recordedChunks]
      const recorderType = mediaRecorder?.mimeType || mimeType || 'audio/webm'

      mediaRecorder = null
      recordedChunks = []
      recognizing.value = false
      voiceSubmitOnStop.value = false
      stopMediaStream()

      if (!shouldSubmit || !open.value || chunks.length === 0) {
        return
      }

      const blob = new Blob(chunks, { type: recorderType })
      await transcribeAndSubmit(blob, recorderType)
    }

    mediaRecorder.start()
    recognizing.value = true
  } catch {
    voiceError.value = assistantUi.value.voicePermissionDenied
    voiceSending.value = false
    recognizing.value = false
    voiceSubmitOnStop.value = false
    stopMediaStream()
  }
}

function stopRecognition(userInitiated = false, options = {}) {
  voiceSubmitOnStop.value = Boolean(options.submitOnStop)
  if (!voiceSubmitOnStop.value) {
    clearVoiceSubmitDelay()
    voiceSending.value = false
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    return
  }

  mediaRecorder = null
  recordedChunks = []
  recognizing.value = false
  stopMediaStream()
}

async function transcribeAndSubmit(blob, mimeType) {
  if (!blob?.size || voiceSending.value || loading.value.plan || loading.value.execute) return

  voiceSending.value = true
  voiceError.value = ''

  try {
    const extension = audioExtensionForMime(mimeType)
    const formData = new FormData()
    formData.append('locale', voiceLocaleCode.value)
    formData.append('audio', new File([blob], `nexora-command-${Date.now()}.${extension}`, { type: mimeType || 'audio/webm' }))

    const { data } = await cpApi.nexoraTranscribe(formData)
    const text = String(data?.data?.text || '').trim()

    if (!text) {
      voiceError.value = assistantUi.value.voiceError
      return
    }

    draft.value = text
    voiceCaptured.value = true
    voiceSending.value = false
    await nextTick()
    await submitDraft()
  } catch (error) {
    voiceError.value = extractError(error)
  } finally {
    voiceSending.value = false
  }
}

function resolveRecorderMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  if (typeof MediaRecorder === 'undefined') return ''
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function audioExtensionForMime(type) {
  if (String(type || '').includes('mp4')) return 'm4a'
  if (String(type || '').includes('ogg')) return 'ogg'
  if (String(type || '').includes('mpeg')) return 'mp3'
  if (String(type || '').includes('wav')) return 'wav'
  return 'webm'
}

function stopMediaStream() {
  if (!mediaStream) return
  mediaStream.getTracks().forEach((track) => track.stop())
  mediaStream = null
}

function resolveSpeechLocale(code) {
  if (code === 'ru') return 'ru-RU'
  if (code === 'en') return 'en-US'
  return 'uz-UZ'
}

function localeCodeFromSpeech(code) {
  if (String(code || '').startsWith('ru')) return 'ru'
  if (String(code || '').startsWith('en')) return 'en'
  return 'uz'
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

.nexora-core.speaking .ring-one,
.nexora-core.speaking .ring-two {
  border-color: rgba(142, 255, 203, 0.32);
  animation: nexoraPulse 1.9s ease-in-out infinite;
}

.nexora-core.speaking .nexora-core-glow {
  background:
    radial-gradient(circle at center, rgba(142, 255, 203, 0.22) 0%, rgba(55, 232, 255, 0.1) 46%, transparent 74%),
    radial-gradient(circle at top, rgba(255, 255, 255, 0.1), transparent 56%);
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

.nexora-chip-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.nexora-chip-row.compact {
  justify-content: flex-start;
}

.nexora-prompt-drawer {
  border: 1px solid rgba(55, 232, 255, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.025);
  overflow: hidden;
}

.nexora-prompt-summary {
  min-height: 46px;
  padding: 0 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  cursor: pointer;
  color: var(--text);
  user-select: none;
}

.nexora-prompt-summary::-webkit-details-marker {
  display: none;
}

.nexora-prompt-summary span {
  min-width: 0;
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.nexora-prompt-summary strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nexora-prompt-summary small {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.nexora-prompt-chevron {
  color: var(--text-muted);
  transition: transform 0.2s ease, color 0.2s ease;
}

.nexora-prompt-drawer[open] .nexora-prompt-chevron {
  color: #7ee8ff;
  transform: rotate(180deg);
}

.nexora-prompt-panel {
  max-height: 150px;
  padding: 0 12px 12px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
  overflow: auto;
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

.nexora-clarify-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nexora-clarify-option {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(142, 255, 203, 0.2);
  background:
    radial-gradient(100% 160% at 0% 0%, rgba(142, 255, 203, 0.16), transparent 58%),
    rgba(55, 232, 255, 0.07);
  color: var(--text);
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.14);
}

.nexora-clarify-option:disabled {
  cursor: wait;
  opacity: 0.62;
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

.nexora-downloads {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.nexora-download {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 16px;
  border: 1px solid rgba(94, 234, 212, 0.32);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(94, 234, 212, 0.2), rgba(55, 232, 255, 0.12));
  color: var(--text);
  font-weight: 900;
}

.nexora-download:disabled {
  cursor: wait;
  opacity: 0.7;
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

  .nexora-composer,
  .nexora-manual-head,
  .nexora-confirm,
  .nexora-metrics {
    grid-template-columns: minmax(0, 1fr);
    display: grid;
  }

  .nexora-prompt-summary {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .nexora-prompt-summary small {
    display: none;
  }

  .nexora-send {
    width: 100%;
  }

  .nexora-thread {
    max-height: 260px;
  }
}
</style>
