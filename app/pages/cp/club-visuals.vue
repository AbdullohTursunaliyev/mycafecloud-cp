<template>
  <div class="club-visuals-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="hero-meta-badge">{{ copy.updatedAt }}: {{ updatedAtLabel }}</span>
      </template>
      <template #actions>
        <div class="hero-tools">
          <button class="ghost-btn" type="button" :disabled="loading.list" @click="reload">
            <Icon name="lucide:refresh-cw" size="15" />
            <span>{{ loading.list ? copy.refreshing : copy.refresh }}</span>
          </button>
          <button class="primary-btn" type="button" :disabled="!canAccess" @click="openCreate">
            <Icon name="lucide:plus" size="15" />
            <span>{{ copy.add }}</span>
          </button>
        </div>
      </template>
    </CpPageHero>

    <div v-if="showAccessGuard" class="guard-card">
      <Icon name="lucide:shield-off" size="18" />
      <div>
        <strong>{{ copy.noAccessTitle }}</strong>
        <p>{{ copy.noAccessSubtitle }}</p>
      </div>
    </div>

    <template v-else>
      <CpPanelCard :title="copy.filtersTitle" :subtitle="copy.filtersSubtitle">
        <div class="filter-toolbar compact-filter-toolbar">
          <label class="field filter-status-field">
            <span>{{ copy.statusLabel }}</span>
            <select v-model="filters.active">
              <option value="">{{ copy.statusAll }}</option>
              <option value="true">{{ copy.statusActive }}</option>
              <option value="false">{{ copy.statusInactive }}</option>
            </select>
          </label>

          <label class="field filter-search-field">
            <span>{{ copy.searchLabel }}</span>
            <input v-model.trim="filters.q" :placeholder="copy.searchPlaceholder" />
          </label>

          <div class="filters-actions">
            <button class="ghost-btn" type="button" @click="resetFilters">{{ copy.reset }}</button>
          </div>
        </div>
      </CpPanelCard>

      <CpPanelCard :title="copy.listTitle" :subtitle="copy.listSubtitle">
        <div v-if="loading.list" class="state-box">
          <div class="skeleton-grid"><span v-for="i in 4" :key="i" class="skeleton-card" /></div>
        </div>
        <div v-else-if="!filteredItems.length" class="state-box">{{ copy.empty }}</div>
        <div v-else class="visuals-grid">
          <article
            v-for="item in filteredItems"
            :key="item.id"
            class="visual-card"
          >
            <div class="visual-media" :style="visualCardStyle(item)">
              <div class="visual-media-overlay">
                <span class="state-pill" :class="item.is_active ? 'ok' : 'muted'">
                  {{ item.is_active ? copy.statusActive : copy.statusInactive }}
                </span>
                <span class="visual-id">#{{ item.id }}</span>
              </div>
            </div>

            <div class="visual-body">
              <strong class="visual-name">{{ item.name }}</strong>

              <p class="visual-summary">{{ item.headline || item.subheadline || excerpt(item.prompt_text || item.description_text) }}</p>
            </div>

            <div class="visual-actions" @click.stop>
              <button class="tiny-btn" type="button" @click="openEdit(item)">{{ copy.edit }}</button>
              <button class="tiny-btn" :class="item.is_active ? 'danger' : 'primary'" type="button" @click="toggleVisual(item)">
                {{ item.is_active ? copy.disable : copy.enable }}
              </button>
              <button class="tiny-btn danger" type="button" @click="deleteVisual(item)">{{ copy.delete }}</button>
            </div>
          </article>
        </div>
      </CpPanelCard>
    </template>

    <div v-if="modal.open" class="overlay" @click.self="closeModal">
      <div class="modal-shell modal-shell-wide">
        <div class="modal-head">
          <div>
            <p class="modal-kicker">{{ copy.modalKicker }}</p>
            <h3>{{ modal.mode === 'create' ? copy.modalCreate : copy.modalEdit }}</h3>
            <span>{{ copy.modalSubtitle }}</span>
          </div>
          <button class="icon-btn" type="button" @click="closeModal">
            <Icon name="lucide:x" size="16" />
          </button>
        </div>

        <div class="studio-steps">
          <span class="step-pill" :class="{ active: modalStage === 'brief' || modalStage === 'processing' }">1. {{ copy.stepBrief }}</span>
          <span class="step-pill" :class="{ active: modalStage === 'result' }">2. {{ copy.stepDraft }}</span>
        </div>

        <div class="editor-layout compact-layout">
          <div class="editor-main compact-main">
            <template v-if="modalStage === 'brief'">
              <div class="compact-stack">
                <label class="field">
                  <span>{{ copy.fieldName }}</span>
                  <input v-model.trim="form.name" :placeholder="copy.fieldNamePlaceholder" />
                </label>

                <div class="brief-composer compact-brief">
                  <div class="brief-composer-head compact-head">
                    <div>
                      <span class="section-kicker">{{ copy.briefSourceTitle }}</span>
                      <strong>{{ copy.briefSourceSubtitle }}</strong>
                      <small>{{ copy.briefSourceHint }}</small>
                    </div>

                    <div class="brief-mode-switch">
                      <button
                        class="mode-chip"
                        :class="{ active: aiInputMode === 'text' }"
                        type="button"
                        @click="aiInputMode = 'text'"
                      >
                        <Icon name="lucide:pen-square" size="14" />
                        <span>{{ copy.briefModeText }}</span>
                      </button>
                      <button
                        class="mode-chip"
                        :class="{ active: aiInputMode === 'audio' }"
                        type="button"
                        @click="aiInputMode = 'audio'"
                      >
                        <Icon name="lucide:mic-2" size="14" />
                        <span>{{ copy.briefModeAudio }}</span>
                      </button>
                    </div>
                  </div>

                  <div v-if="aiInputMode === 'text'" class="composer-card">
                    <div class="composer-note">
                      <Icon name="lucide:sparkles" size="16" />
                      <span>{{ copy.textComposerExample }}</span>
                    </div>

                    <label class="field">
                      <span>{{ copy.promptLabel }}</span>
                      <textarea v-model.trim="form.prompt_text" :placeholder="copy.promptPlaceholder" rows="8"></textarea>
                      <small>{{ copy.promptHint }}</small>
                    </label>
                  </div>

                  <div v-else class="voice-composer">
                    <div class="recorder-shell" :class="{ recording: recorder.recording, ready: !!form.audio_url }">
                      <div class="recorder-main">
                        <button
                          class="recorder-orb"
                          :class="{ recording: recorder.recording }"
                          type="button"
                          :disabled="uploading.audio || loading.ai || loading.save || !recorderSupported"
                          @click="toggleRecording"
                        >
                          <Icon :name="recorder.recording ? 'lucide:square' : 'lucide:mic'" size="18" />
                        </button>

                        <div class="recorder-copy">
                          <span>{{ copy.voiceTitle }}</span>
                          <strong>{{ formattedRecordingTime }}</strong>
                          <small>{{ recorderStatusText }}</small>
                        </div>
                      </div>

                      <div class="recorder-bars" :class="{ active: recorder.recording }" aria-hidden="true">
                        <span v-for="i in 16" :key="i" />
                      </div>

                      <div class="recorder-actions-row">
                        <button
                          class="ghost-btn"
                          type="button"
                          :disabled="uploading.audio || loading.ai || loading.save || !recorderSupported"
                          @click="toggleRecording"
                        >
                          <Icon :name="recorder.recording ? 'lucide:square' : 'lucide:mic'" size="14" />
                          <span>{{ recorder.recording ? copy.voiceStop : copy.voiceStart }}</span>
                        </button>

                        <button class="ghost-btn" type="button" :disabled="uploading.audio || loading.ai || loading.save" @click="triggerAudioPicker">
                          <Icon name="lucide:paperclip" size="14" />
                          <span>{{ copy.voiceChooseFile }}</span>
                        </button>

                        <button
                          class="ghost-btn"
                          type="button"
                          :disabled="uploading.audio || loading.ai || loading.save || (!audioFile && !currentAudioPreviewUrl && !form.audio_url)"
                          @click="clearAudioBrief"
                        >
                          <Icon name="lucide:rotate-ccw" size="14" />
                          <span>{{ copy.voiceReset }}</span>
                        </button>
                      </div>

                      <input
                        ref="audioInput"
                        class="sr-only-input"
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm"
                        @change="onAudioSelected"
                      />

                      <div class="recorder-meta">
                        <span class="flag-pill" :class="{ ready: !!form.audio_url }">
                          {{ uploading.audio ? copy.voiceUploading : form.audio_url ? copy.voiceReady : recorder.recording ? copy.voiceRecording : audioFile ? copy.voiceRecorded : copy.voiceIdle }}
                        </span>
                        <span class="flag-pill">{{ copy.voiceHint }}</span>
                      </div>

                      <audio v-if="currentAudioPreviewUrl" class="audio-player" :src="currentAudioPreviewUrl" controls preload="none"></audio>

                      <p v-if="recorderError" class="panel-error">{{ recorderError }}</p>
                      <p v-else-if="!recorderSupported" class="panel-error">{{ copy.voiceNotSupported }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="modalStage === 'processing'">
              <div class="generation-state">
                <div class="generation-spinner" />
                <span class="section-kicker">{{ copy.generatingKicker }}</span>
                <strong>{{ copy.generatingTitle }}</strong>
                <p>{{ copy.generatingDescription }}</p>
                <div class="generation-chips">
                  <span class="flag-pill">{{ form.name || copy.previewDraft }}</span>
                  <span class="flag-pill">{{ aiInputMode === 'audio' ? copy.briefModeAudio : copy.briefModeText }}</span>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="draft-result">
                <div class="draft-result-head">
                  <span class="section-kicker">{{ copy.resultKicker }}</span>
                  <strong>{{ form.headline || form.name || copy.previewDraft }}</strong>
                  <p>{{ form.subheadline || form.description_text || copy.resultDescription }}</p>
                </div>

                <div class="draft-placeholder">
                  <Icon name="lucide:image-plus" size="24" />
                  <strong>{{ copy.resultImageTitle }}</strong>
                  <p>{{ copy.resultImageHint }}</p>
                </div>

                <div v-if="aiTranscript" class="transcript-box compact-transcript">
                  <label class="field">
                    <span>{{ copy.transcriptLabel }}</span>
                    <textarea :value="aiTranscript" rows="5" readonly></textarea>
                    <small>{{ copy.transcriptHint }}</small>
                  </label>
                </div>
              </div>
            </template>

            <p v-if="modal.error" class="panel-error">{{ modal.error }}</p>
          </div>
        </div>

        <div class="modal-actions">
          <button class="ghost-btn" type="button" :disabled="loading.save || loading.ai" @click="closeModal">{{ copy.cancel }}</button>
          <button
            v-if="modalStage === 'result'"
            class="ghost-btn"
            type="button"
            :disabled="loading.save || loading.ai"
            @click="modalStage = 'brief'"
          >
            <Icon name="lucide:arrow-left" size="14" />
            <span>{{ copy.backToBrief }}</span>
          </button>
          <button v-if="modalStage === 'brief'" class="primary-btn" type="button" :disabled="loading.save || loading.ai" @click="generateDraft">
            <Icon name="lucide:sparkles" size="14" />
            <span>{{ copy.generateDraft }}</span>
          </button>
          <button v-else-if="modalStage === 'result'" class="primary-btn" type="button" :disabled="loading.save || loading.ai" @click="save">
            {{ loading.save ? copy.saving : modal.mode === 'create' ? copy.create : copy.save }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpAuthStore } from '@legacy/stores/cpAuth'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'

definePageMeta({
  layout: 'cp',
  roles: ['admin', 'owner'],
})

const clubVisualsCopy = {
  uz: {
    headTitle: 'Klub vizuallari',
    eyebrow: 'Vizual studiya',
    title: 'Klub vizuallari',
    subtitle: 'Matn yoki ovozli tavsif orqali klub vizuallari uchun qoralama tayyorlang.',
    updatedAt: 'Yangilandi',
    refresh: 'Yangilash',
    refreshing: 'Yuklanmoqda...',
    add: 'Vizual qo‘shish',
    noAccessTitle: 'Bu bo‘lim yopiq',
    noAccessSubtitle: 'Klub vizuallari faqat Pro tarifda owner yoki admin uchun ochiladi.',
    totalRows: 'Jami',
    totalHint: 'Ko‘rinib turgan vizuallar',
    activeRows: 'Faol',
    activeHint: 'Hozir faol vizuallar',
    imageRows: 'Rasmli',
    imageHint: 'Yuklangan rasm mavjud',
    audioRows: 'Audio',
    audioHint: 'Ovozli izoh yoki audio tavsif mavjud',
    filtersTitle: 'Filtrlar',
    filtersSubtitle: 'Holat va nom bo‘yicha kerakli vizualni toping.',
    statusLabel: 'Holat',
    statusAll: 'Barchasi',
    statusActive: 'Faol',
    statusInactive: 'O‘chiq',
    searchLabel: 'Qidiruv',
    searchPlaceholder: 'Vizual nomi bo‘yicha qidiring...',
    screenModeLabel: 'Ekran turi',
    screenModeAll: 'Hammasi',
    reset: 'Tozalash',
    previewTitle: 'Jonli ko‘rinish',
    previewSubtitle: 'Tanlangan vizual shu yerda qanday ko‘rinishini tekshiring.',
    previewFallback: 'Klubning katta ekrani uchun mo‘ljallangan vizual.',
    previewDraft: 'Yangi vizual',
    emptyPreview: 'Ko‘rish uchun vizual tanlanmagan.',
    listTitle: 'Vizuallar kutubxonasi',
    listSubtitle: 'AI tavsif asosida tayyorlangan vizuallar ro‘yxati.',
    empty: 'Hozircha klub vizuallari qo‘shilmagan.',
    edit: 'Tahrirlash',
    enable: 'Yoqish',
    disable: 'O‘chirish',
    delete: 'O‘chirish',
    deleteConfirm: '"{name}" vizuali o‘chirilsinmi?',
    imageStatusLabel: 'Rasm holati',
    imageReady: 'Rasm tayyor',
    imageMissing: 'Rasm yo‘q',
    audioReady: 'Audio tayyor',
    audioMissing: 'Audio yo‘q',
    displayModeLabel: 'Yaratish usuli',
    displayModes: {
      upload: 'Tayyor rasm',
      layout: 'Joylashuv asosida',
      hybrid: 'Aralash',
    },
    screenModes: {
      card: 'Klub kartasi',
      poster: 'Poster',
      tv: 'Katta ekran',
    },
    modalKicker: 'Klub vizual studiyasi',
    modalCreate: 'Yangi vizual',
    modalEdit: 'Vizualni tahrirlash',
    modalSubtitle: 'Avval tavsif bering, keyin qoralama natijani saqlang.',
    fieldName: 'Vizual nomi',
    fieldNamePlaceholder: 'Masalan: Asosiy zal posteri',
    fieldHeadline: 'Asosiy sarlavha',
    fieldHeadlinePlaceholder: 'Masalan: A-ZONE ARENA',
    fieldSubheadline: 'Ikkinchi qator',
    fieldSubheadlinePlaceholder: 'Masalan: Premium kibersport klubi',
    fieldSort: 'Tartib',
    accentColorLabel: 'Aksent rang',
    accentColorPlaceholder: '#62E6FF',
    stateLabel: 'Holat',
    stateActive: 'Faol',
    descriptionLabel: 'Qisqa tavsif',
    descriptionPlaceholder: 'Bu vizual qayerda ishlatiladi va qanday taassurot berishi kerak?',
    promptLabel: 'Xona tavsifi / matnli izoh',
    promptPlaceholder: 'Masalan: kirishda kassir, o‘ng tomonda VIP qator, markazda asosiy PC zonasi...',
    promptHint: 'Keyin AI generatsiya qo‘shilsa, aynan shu tavsif asosiy prompt bo‘lib xizmat qiladi.',
    briefSourceTitle: 'AI tavsifi',
    briefSourceSubtitle: 'Qoralamani matn yoki ovoz orqali tayyorlang.',
    briefSourceHint: 'Operator uchun eng qulay usulni tanlang, qolgan qismini sistema to‘ldiradi.',
    stepBrief: 'Tavsif',
    stepDraft: 'Qoralama',
    briefModeText: 'Matn',
    briefModeAudio: 'Ovoz',
    textComposerExample: 'Masalan: kirishda neon resepsion, o‘ngda VIP, markazda asosiy zal, asosiy rang cyan.',
    voiceTitle: 'Ovoz yozuvi',
    voiceHint: 'Yozuv to‘xtashi bilan audio avtomatik yuklanadi.',
    voiceIdle: 'Ovozli tavsif kutilmoqda',
    voiceRecording: 'Yozuv ketmoqda',
    voiceRecorded: 'Audio tayyor',
    voiceUploading: 'Audio yuklanmoqda',
    voiceReady: 'Audio ulandi',
    voiceNotSupported: 'Bu brauzer ovoz yozishni qo‘llamaydi. Fayl tanlashdan foydalaning.',
    voicePermissionDenied: 'Mikrofon ruxsati berilmadi yoki qurilma topilmadi.',
    voiceStart: 'Yozishni boshlash',
    voiceStop: 'Yozishni to‘xtatish',
    voiceChooseFile: 'Audio fayl tanlash',
    voiceReset: 'Tozalash',
    voiceRetryUpload: 'Qayta yuklash',
    briefRequired: 'AI qoralama uchun matn yoki audio tavsif kerak.',
    backToBrief: 'Tavsifga qaytish',
    generatingKicker: 'AI ishlayapti',
    generatingTitle: 'Vizual tayyorlanmoqda',
    generatingDescription: 'Tavsif tahlil qilinyapti. Hozir keyingi bosqich uchun qoralama tayyor bo‘ladi.',
    resultKicker: 'Qoralama tayyor',
    resultDescription: 'Keyingi bosqichda shu qoralama asosida rasm yoki yakuniy vizual ko‘rsatiladi.',
    resultImageTitle: 'Rasm keyingi bosqichda chiqadi',
    resultImageHint: 'Audio yoki matnli tavsif qayta ishlanib bo‘lgach, shu bosqichda vizual natija taqdim qilinadi.',
    audioSummaryLabel: 'Audio tavsif',
    audioSummaryHint: 'Shu audio AI qoralama yaratish uchun ishlatiladi va operator uchun saqlanadi.',
    layoutSpecLabel: 'Joylashuv JSON',
    layoutSpecPlaceholder: '{"zones":[{"name":"VIP","x":12,"y":2}]}',
    visualSpecLabel: 'Vizual JSON',
    visualSpecPlaceholder: '{"theme":"cyber","camera":"wide"}',
    imageUploadLabel: 'Rasm yuklash',
    uploadImage: 'Rasm yuklash',
    imageUrlPlaceholder: 'Rasm havolasi yoki yuklash natijasi',
    audioUploadLabel: 'Audio tavsif yuklash',
    uploadAudio: 'Audio yuklash',
    audioUrlPlaceholder: 'Audio havola yoki yuklash natijasi',
    uploading: 'Yuklanmoqda...',
    cancel: 'Bekor qilish',
    create: 'Yaratish',
    save: 'Saqlash',
    saving: 'Saqlanmoqda...',
    requestError: 'So‘rov bajarilmadi.',
    nameError: 'Vizual nomi kamida 2 ta belgidan iborat bo‘lishi kerak.',
    jsonError: 'JSON maydonida xato bor. Formatni tekshiring.',
    created: 'Klub vizuali yaratildi.',
    updated: 'Klub vizuali saqlandi.',
    deleted: 'Klub vizuali o‘chirildi.',
    toggled: 'Klub vizuali holati yangilandi.',
    uploadedImage: 'Rasm yuklandi.',
    uploadedAudio: 'Audio yuklandi.',
    generateDraft: 'AI qoralama yaratish',
    generating: 'AI ishlayapti...',
    transcriptLabel: 'Audio matni',
    transcriptHint: 'AI audio tavsifdan tushungan matn.',
    draftReady: 'AI qoralama tayyor.',
  },
  ru: {
    headTitle: 'Визуалы клуба',
    eyebrow: 'Визуальная студия',
    title: 'Визуалы клуба',
    subtitle: 'Готовьте черновики клубных визуалов через текстовое или голосовое описание.',
    updatedAt: 'Обновлено',
    refresh: 'Обновить',
    refreshing: 'Загрузка...',
    add: 'Добавить визуал',
    noAccessTitle: 'Раздел закрыт',
    noAccessSubtitle: 'Визуалы клуба доступны только на тарифе Pro для owner или admin.',
    totalRows: 'Всего',
    totalHint: 'Видимые визуалы',
    activeRows: 'Активные',
    activeHint: 'Сейчас активные визуалы',
    imageRows: 'С изображением',
    imageHint: 'Есть загруженное изображение',
    audioRows: 'С аудио',
    audioHint: 'Есть голосовая заметка или аудиоописание',
    filtersTitle: 'Фильтры',
    filtersSubtitle: 'Быстро находите нужный визуал по статусу и названию.',
    statusLabel: 'Статус',
    statusAll: 'Все',
    statusActive: 'Активно',
    statusInactive: 'Выключено',
    searchLabel: 'Поиск',
    searchPlaceholder: 'Ищите по названию визуала...',
    screenModeLabel: 'Тип экрана',
    screenModeAll: 'Все',
    reset: 'Сбросить',
    previewTitle: 'Живой просмотр',
    previewSubtitle: 'Проверьте, как будет выглядеть выбранный визуал.',
    previewFallback: 'Визуал для большого экрана клуба.',
    previewDraft: 'Новый визуал',
    emptyPreview: 'Для просмотра визуал не выбран.',
    listTitle: 'Библиотека визуалов',
    listSubtitle: 'Список визуалов, подготовленных на основе AI-описания.',
    empty: 'Пока нет визуалов клуба.',
    edit: 'Изменить',
    enable: 'Включить',
    disable: 'Отключить',
    delete: 'Удалить',
    deleteConfirm: 'Удалить визуал "{name}"?',
    imageStatusLabel: 'Состояние изображения',
    imageReady: 'Изображение готово',
    imageMissing: 'Изображения нет',
    audioReady: 'Аудио готово',
    audioMissing: 'Аудио нет',
    displayModeLabel: 'Способ создания',
    displayModes: {
      upload: 'Готовое изображение',
      layout: 'На основе схемы',
      hybrid: 'Смешанный',
    },
    screenModes: {
      card: 'Клубная карта',
      poster: 'Постер',
      tv: 'Большой экран',
    },
    modalKicker: 'Студия визуалов клуба',
    modalCreate: 'Новый визуал',
    modalEdit: 'Редактирование визуала',
    modalSubtitle: 'Сначала дайте описание, затем сохраните готовый черновик.',
    fieldName: 'Название визуала',
    fieldNamePlaceholder: 'Например: Постер главного зала',
    fieldHeadline: 'Главный заголовок',
    fieldHeadlinePlaceholder: 'Например: A-ZONE ARENA',
    fieldSubheadline: 'Вторая строка',
    fieldSubheadlinePlaceholder: 'Например: Премиальный киберспортивный клуб',
    fieldSort: 'Порядок',
    accentColorLabel: 'Акцентный цвет',
    accentColorPlaceholder: '#62E6FF',
    stateLabel: 'Состояние',
    stateActive: 'Активно',
    descriptionLabel: 'Короткое описание',
    descriptionPlaceholder: 'Где используется этот визуал и какое настроение он должен передавать?',
    promptLabel: 'Описание помещения / текстовое описание',
    promptPlaceholder: 'Например: касса у входа, справа VIP ряд, в центре основная PC-зона...',
    promptHint: 'Если позже добавим AI-генерацию, именно это описание станет базовым запросом.',
    briefSourceTitle: 'AI-описание',
    briefSourceSubtitle: 'Подготовьте черновик через текст или голос.',
    briefSourceHint: 'Выберите удобный способ для оператора, остальное система соберет сама.',
    stepBrief: 'Описание',
    stepDraft: 'Черновик',
    briefModeText: 'Текст',
    briefModeAudio: 'Голос',
    textComposerExample: 'Например: неоновая стойка у входа, справа VIP, в центре основной зал, акцентный цвет циан.',
    voiceTitle: 'Голосовая запись',
    voiceHint: 'После остановки запись автоматически загрузится.',
    voiceIdle: 'Ожидается голосовое описание',
    voiceRecording: 'Идет запись',
    voiceRecorded: 'Аудио готово',
    voiceUploading: 'Загружаем аудио',
    voiceReady: 'Аудио подключено',
    voiceNotSupported: 'Этот браузер не поддерживает запись голоса. Используйте выбор файла.',
    voicePermissionDenied: 'Нет доступа к микрофону или устройство не найдено.',
    voiceStart: 'Начать запись',
    voiceStop: 'Остановить запись',
    voiceChooseFile: 'Выбрать аудиофайл',
    voiceReset: 'Сбросить',
    voiceRetryUpload: 'Повторить загрузку',
    briefRequired: 'Для AI-черновика нужно текстовое или аудиоописание.',
    backToBrief: 'Вернуться к описанию',
    generatingKicker: 'AI работает',
    generatingTitle: 'Визуал готовится',
    generatingDescription: 'Описание анализируется. На следующем шаге появится черновик.',
    resultKicker: 'Черновик готов',
    resultDescription: 'На следующем этапе на основе этого черновика будет показано изображение или финальный визуал.',
    resultImageTitle: 'Изображение появится на следующем этапе',
    resultImageHint: 'После обработки текста или аудио здесь появится визуальный результат.',
    audioSummaryLabel: 'Аудиоописание',
    audioSummaryHint: 'Это аудио будет использовано для создания AI-черновика и сохранится для оператора.',
    layoutSpecLabel: 'JSON схемы',
    layoutSpecPlaceholder: '{"zones":[{"name":"VIP","x":12,"y":2}]}',
    visualSpecLabel: 'JSON визуала',
    visualSpecPlaceholder: '{"theme":"cyber","camera":"wide"}',
    imageUploadLabel: 'Загрузить изображение',
    uploadImage: 'Загрузить изображение',
    imageUrlPlaceholder: 'Ссылка на изображение или результат загрузки',
    audioUploadLabel: 'Загрузить аудиоописание',
    uploadAudio: 'Загрузить аудио',
    audioUrlPlaceholder: 'Ссылка на аудио или результат загрузки',
    uploading: 'Загрузка...',
    cancel: 'Отмена',
    create: 'Создать',
    save: 'Сохранить',
    saving: 'Сохранение...',
    requestError: 'Запрос не выполнен.',
    nameError: 'Название визуала должно содержать минимум 2 символа.',
    jsonError: 'В JSON-поле есть ошибка. Проверьте формат.',
    created: 'Визуал клуба создан.',
    updated: 'Визуал клуба сохранён.',
    deleted: 'Визуал клуба удалён.',
    toggled: 'Состояние визуала клуба обновлено.',
    uploadedImage: 'Изображение загружено.',
    uploadedAudio: 'Аудио загружено.',
    generateDraft: 'Создать AI-черновик',
    generating: 'AI работает...',
    transcriptLabel: 'Текст из аудио',
    transcriptHint: 'Текст, который AI распознал из аудиоописания.',
    draftReady: 'AI-черновик готов.',
  },
  en: {
    headTitle: 'Club visuals',
    eyebrow: 'Visual studio',
    title: 'Club visuals',
    subtitle: 'Prepare club visual drafts from text or voice briefs.',
    updatedAt: 'Updated',
    refresh: 'Refresh',
    refreshing: 'Loading...',
    add: 'Add visual',
    noAccessTitle: 'Access restricted',
    noAccessSubtitle: 'Club visuals are available only on the Pro plan for owner or admin.',
    totalRows: 'Total',
    totalHint: 'Visible visual cards',
    activeRows: 'Active',
    activeHint: 'Currently enabled visual cards',
    imageRows: 'With image',
    imageHint: 'Has uploaded artwork',
    audioRows: 'With audio',
    audioHint: 'Has a voice note or audio brief',
    filtersTitle: 'Filters',
    filtersSubtitle: 'Find the draft you need by state and name.',
    statusLabel: 'State',
    statusAll: 'All',
    statusActive: 'Active',
    statusInactive: 'Disabled',
    searchLabel: 'Search',
    searchPlaceholder: 'Search by visual name...',
    screenModeLabel: 'Screen target',
    screenModeAll: 'All',
    reset: 'Reset',
    previewTitle: 'Live preview',
    previewSubtitle: 'Check how the selected visual card will look before publishing it.',
    previewFallback: 'A club visual designed for large display surfaces.',
    previewDraft: 'New visual',
    emptyPreview: 'No visual selected for preview.',
    listTitle: 'Visual library',
    listSubtitle: 'AI-assisted visual drafts prepared from operator briefs.',
    empty: 'No club visuals yet.',
    edit: 'Edit',
    enable: 'Enable',
    disable: 'Disable',
    delete: 'Delete',
    deleteConfirm: 'Delete visual card "{name}"?',
    imageStatusLabel: 'Image state',
    imageReady: 'Image ready',
    imageMissing: 'No image',
    audioReady: 'Audio ready',
    audioMissing: 'No audio',
    displayModeLabel: 'Render mode',
    displayModes: {
      upload: 'Uploaded art',
      layout: 'Layout-driven',
      hybrid: 'Hybrid',
    },
    screenModes: {
      card: 'Club card',
      poster: 'Poster',
      tv: 'Big screen',
    },
    modalKicker: 'Club visual studio',
    modalCreate: 'New visual',
    modalEdit: 'Edit visual',
    modalSubtitle: 'Start with a brief, then save the generated draft.',
    fieldName: 'Visual name',
    fieldNamePlaceholder: 'For example: Main hall poster',
    fieldHeadline: 'Headline',
    fieldHeadlinePlaceholder: 'For example: A-ZONE ARENA',
    fieldSubheadline: 'Subheadline',
    fieldSubheadlinePlaceholder: 'For example: Premium esports club',
    fieldSort: 'Sort order',
    accentColorLabel: 'Accent color',
    accentColorPlaceholder: '#62E6FF',
    stateLabel: 'State',
    stateActive: 'Active',
    descriptionLabel: 'Short description',
    descriptionPlaceholder: 'Where is this visual used and what should it feel like?',
    promptLabel: 'Room brief / text description',
    promptPlaceholder: 'For example: cashier near the entrance, VIP row on the right, main PC zone in the center...',
    promptHint: 'If we add AI generation later, this brief becomes the base prompt.',
    briefSourceTitle: 'AI brief',
    briefSourceSubtitle: 'Prepare the draft from text or voice.',
    briefSourceHint: 'Choose the easier input for the operator and let the system fill the rest.',
    stepBrief: 'Brief',
    stepDraft: 'Draft',
    briefModeText: 'Text',
    briefModeAudio: 'Voice',
    textComposerExample: 'For example: neon reception near the entrance, VIP row on the right, main hall in center, cyan accent.',
    voiceTitle: 'Voice recorder',
    voiceHint: 'After you stop recording, the audio uploads automatically.',
    voiceIdle: 'Waiting for a voice brief',
    voiceRecording: 'Recording now',
    voiceRecorded: 'Audio captured',
    voiceUploading: 'Uploading audio',
    voiceReady: 'Audio attached',
    voiceNotSupported: 'This browser does not support voice recording. Use file upload instead.',
    voicePermissionDenied: 'Microphone permission was denied or no device was found.',
    voiceStart: 'Start recording',
    voiceStop: 'Stop recording',
    voiceChooseFile: 'Choose audio file',
    voiceReset: 'Reset',
    voiceRetryUpload: 'Retry upload',
    briefRequired: 'A text or audio brief is required for AI draft generation.',
    backToBrief: 'Back to brief',
    generatingKicker: 'AI is working',
    generatingTitle: 'Preparing the visual',
    generatingDescription: 'The brief is being analyzed now. The next stage will open with the generated draft.',
    resultKicker: 'Draft ready',
    resultDescription: 'The next stage will present the image or final visual based on this draft.',
    resultImageTitle: 'The image will appear in the next stage',
    resultImageHint: 'Once the audio or text brief is processed, this stage will show the visual result.',
    audioSummaryLabel: 'Audio brief',
    audioSummaryHint: 'This audio will be used for AI draft generation and remain available in preview.',
    layoutSpecLabel: 'Layout spec JSON',
    layoutSpecPlaceholder: '{"zones":[{"name":"VIP","x":12,"y":2}]}',
    visualSpecLabel: 'Visual spec JSON',
    visualSpecPlaceholder: '{"theme":"cyber","camera":"wide"}',
    imageUploadLabel: 'Upload image',
    uploadImage: 'Upload image',
    imageUrlPlaceholder: 'Image URL or upload result',
    audioUploadLabel: 'Upload audio brief',
    uploadAudio: 'Upload audio',
    audioUrlPlaceholder: 'Audio URL or upload result',
    uploading: 'Uploading...',
    cancel: 'Cancel',
    create: 'Create',
    save: 'Save',
    saving: 'Saving...',
    requestError: 'Request failed.',
    nameError: 'Visual name must be at least 2 characters long.',
    jsonError: 'One of the JSON fields is invalid. Please check the format.',
    created: 'Club visual created.',
    updated: 'Club visual saved.',
    deleted: 'Club visual deleted.',
    toggled: 'Club visual state updated.',
    uploadedImage: 'Image uploaded.',
    uploadedAudio: 'Audio uploaded.',
    generateDraft: 'Generate AI draft',
    generating: 'Generating...',
    transcriptLabel: 'Audio transcript',
    transcriptHint: 'The text AI understood from the audio brief.',
    draftReady: 'AI draft is ready.',
  },
}

const copy = useCpCopy(clubVisualsCopy)

useHead({
  title: computed(() => `${copy.value.headTitle} - NEXORA CLOUD CP`),
})

const auth = useCpAuthStore()
const { formatDateTime } = useCpFormatters()

function txt(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`))
}

function errorText(error: any, fallback: string) {
  const message = error?.response?.data?.message
  const errors = error?.response?.data?.errors
  if (message) return message
  if (errors && typeof errors === 'object') return Object.values(errors).flat().join(' ')
  return fallback
}

const canAccess = computed(() => {
  const role = auth.operator?.role
  return (role === 'admin' || role === 'owner') && auth.hasFeature('ai_generation')
})

const showAccessGuard = computed(() => Boolean(auth.operator) && !canAccess.value)

const loading = reactive({
  list: false,
  save: false,
  ai: false,
})

const uploading = reactive({
  audio: false,
})

const items = ref<any[]>([])
const updatedAt = ref<string | null>(null)

const filters = reactive({
  active: '',
  q: '',
})

const modal = reactive({
  open: false,
  mode: 'create' as 'create' | 'edit',
  id: null as number | null,
  error: '',
})
const modalStage = ref<'brief' | 'processing' | 'result'>('brief')

const form = reactive({
  name: '',
  headline: '',
  subheadline: '',
  description_text: '',
  prompt_text: '',
  display_mode: 'upload',
  screen_mode: 'poster',
  accent_color: '#62E6FF',
  image_url: '',
  audio_url: '',
  layout_spec_text: '',
  visual_spec_text: '',
  sort_order: 0,
  is_active: true,
})

const aiInputMode = ref<'text' | 'audio'>('text')
const audioInput = ref<HTMLInputElement | null>(null)
const audioFile = ref<File | null>(null)
const aiTranscript = ref('')
const recorderSupported = ref(false)
const recorderError = ref('')
const recordingSeconds = ref(0)
const localAudioPreviewUrl = ref('')
const recorder = reactive({
  recording: false,
  status: 'idle' as 'idle' | 'recording' | 'recorded' | 'uploading' | 'ready',
})

let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let recordingTimer: ReturnType<typeof setInterval> | null = null
let recordedChunks: BlobPart[] = []

const updatedAtLabel = computed(() => (updatedAt.value ? formatDateTime(updatedAt.value) : '-'))
const currentAudioPreviewUrl = computed(() => String(form.audio_url || localAudioPreviewUrl.value || '').trim())
const formattedRecordingTime = computed(() => {
  const total = Math.max(0, recordingSeconds.value)
  const minutes = String(Math.floor(total / 60)).padStart(2, '0')
  const seconds = String(total % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})
const recorderStatusText = computed(() => {
  if (uploading.audio) return copy.value.voiceUploading
  if (form.audio_url) return copy.value.voiceReady
  if (recorder.recording) return copy.value.voiceRecording
  if (audioFile.value) return copy.value.voiceRecorded
  return copy.value.voiceIdle
})

const filteredItems = computed(() => {
  let list = items.value.slice()
  if (filters.active !== '') {
    const active = filters.active === 'true'
    list = list.filter((item) => !!item.is_active === active)
  }
  const q = filters.q.trim().toLowerCase()
  if (q) {
    list = list.filter((item) =>
      [item.name, item.headline, item.subheadline]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }

  return list
})

function excerpt(value: string | null | undefined) {
  const text = String(value || '').trim()
  if (!text) return copy.value.previewFallback
  return text.length > 92 ? `${text.slice(0, 89)}...` : text
}

function visualCardStyle(item: any) {
  const accent = String(item?.accent_color || '#62E6FF')
  const imageUrl = String(item?.image_url || '').trim()
  const backgroundImage = imageUrl
    ? `linear-gradient(180deg, rgba(4,10,18,0.14) 0%, rgba(4,10,18,0.82) 100%), url("${imageUrl}")`
    : `radial-gradient(circle at 18% 20%, ${accent}44 0%, transparent 34%), linear-gradient(135deg, rgba(5,14,25,0.98) 0%, rgba(9,26,40,0.98) 100%)`

  return {
    backgroundImage,
    borderColor: `${accent}55`,
    boxShadow: `inset 0 0 0 1px ${accent}18`,
  }
}

function resetFilters() {
  filters.active = ''
  filters.q = ''
}

function resetForm() {
  abortRecording()
  form.name = ''
  form.headline = ''
  form.subheadline = ''
  form.description_text = ''
  form.prompt_text = ''
  form.display_mode = 'upload'
  form.screen_mode = 'poster'
  form.accent_color = '#62E6FF'
  form.image_url = ''
  form.audio_url = ''
  form.layout_spec_text = ''
  form.visual_spec_text = ''
  form.sort_order = 0
  form.is_active = true
  form.display_mode = 'hybrid'
  form.screen_mode = 'poster'
  audioFile.value = null
  aiTranscript.value = ''
  aiInputMode.value = 'text'
  modalStage.value = 'brief'
  recorderError.value = ''
  recorder.status = 'idle'
  recordingSeconds.value = 0
  clearLocalAudioPreview()
  if (audioInput.value) audioInput.value.value = ''
}

function fillForm(item: any) {
  abortRecording()
  form.name = item?.name ?? ''
  form.headline = item?.headline ?? ''
  form.subheadline = item?.subheadline ?? ''
  form.description_text = item?.description_text ?? ''
  form.prompt_text = item?.prompt_text ?? ''
  form.display_mode = item?.display_mode ?? 'upload'
  form.screen_mode = item?.screen_mode ?? 'poster'
  form.accent_color = item?.accent_color || '#62E6FF'
  form.image_url = item?.image_url ?? ''
  form.audio_url = item?.audio_url ?? ''
  form.layout_spec_text = item?.layout_spec ? JSON.stringify(item.layout_spec, null, 2) : ''
  form.visual_spec_text = item?.visual_spec ? JSON.stringify(item.visual_spec, null, 2) : ''
  form.sort_order = Number(item?.sort_order ?? 0)
  form.is_active = !!item?.is_active
  audioFile.value = null
  aiTranscript.value = ''
  aiInputMode.value = item?.audio_url && !item?.prompt_text ? 'audio' : 'text'
  modalStage.value = item?.headline || item?.description_text ? 'result' : 'brief'
  recorderError.value = ''
  recorder.status = form.audio_url ? 'ready' : 'idle'
  recordingSeconds.value = 0
  clearLocalAudioPreview()
  if (audioInput.value) audioInput.value.value = ''
}

function openCreate() {
  resetForm()
  modal.mode = 'create'
  modal.id = null
  modal.error = ''
  modal.open = true
}

function openEdit(item: any) {
  fillForm(item)
  modal.mode = 'edit'
  modal.id = Number(item.id)
  modal.error = ''
  modal.open = true
}

function closeModal() {
  abortRecording()
  modal.open = false
  modal.error = ''
  modalStage.value = 'brief'
}

async function reload() {
  if (!canAccess.value) return
  loading.list = true
  try {
    const response = await cpApi.clubVisuals()
    const payload = response?.data?.data ?? response?.data ?? []
    items.value = Array.isArray(payload) ? payload : []
    updatedAt.value = new Date().toISOString()
  } catch {
    items.value = []
  } finally {
    loading.list = false
  }
}

function parseJsonField(value: string) {
  const text = String(value || '').trim()
  if (!text) return null
  return JSON.parse(text)
}

function buildPayload() {
  return {
    name: form.name.trim(),
    headline: form.headline.trim() || null,
    subheadline: form.subheadline.trim() || null,
    description_text: form.description_text.trim() || null,
    prompt_text: form.prompt_text.trim() || null,
    display_mode: form.display_mode,
    screen_mode: form.screen_mode,
    accent_color: form.accent_color.trim() || null,
    image_url: form.image_url.trim() || null,
    audio_url: form.audio_url.trim() || null,
    layout_spec: parseJsonField(form.layout_spec_text),
    visual_spec: parseJsonField(form.visual_spec_text),
    sort_order: Number(form.sort_order || 0),
    is_active: !!form.is_active,
  }
}

async function save() {
  modal.error = ''
  if (!form.name || form.name.trim().length < 2) {
    modal.error = copy.value.nameError
    return
  }

  let payload: any
  try {
    payload = buildPayload()
  } catch {
    modal.error = copy.value.jsonError
    return
  }

  loading.save = true
  try {
    if (modal.mode === 'create') {
      await cpApi.clubVisualCreate(payload)
      ElMessage.success(copy.value.created)
    } else if (modal.id) {
      await cpApi.clubVisualUpdate(modal.id, payload)
      ElMessage.success(copy.value.updated)
    }
    closeModal()
    await reload()
  } catch (error: any) {
    modal.error = errorText(error, copy.value.requestError)
  } finally {
    loading.save = false
  }
}

async function generateDraft() {
  modal.error = ''

  if ((aiInputMode.value === 'text' && !form.prompt_text.trim()) || (aiInputMode.value === 'audio' && !form.audio_url.trim())) {
    modal.error = copy.value.briefRequired
    return
  }

  let layoutSpec = null
  try {
    layoutSpec = parseJsonField(form.layout_spec_text)
  } catch {
    modal.error = copy.value.jsonError
    return
  }

  loading.ai = true
  modalStage.value = 'processing'
  try {
    const promptText = aiInputMode.value === 'text' ? form.prompt_text.trim() || null : null
    const audioUrl = aiInputMode.value === 'audio' ? form.audio_url.trim() || null : null

    const payload = {
      prompt_text: promptText,
      audio_url: audioUrl,
      display_mode: form.display_mode,
      screen_mode: form.screen_mode,
      accent_color: form.accent_color.trim() || null,
      layout_spec: layoutSpec,
    }

    const response = await cpApi.clubVisualGenerateDraft(payload)
    const draft = response?.data?.data ?? response?.data ?? {}

    if (draft.headline) form.headline = String(draft.headline)
    if (draft.subheadline) form.subheadline = String(draft.subheadline)
    if (draft.description_text) form.description_text = String(draft.description_text)
    if (draft.accent_color) form.accent_color = String(draft.accent_color)
    if (draft.layout_spec) form.layout_spec_text = JSON.stringify(draft.layout_spec, null, 2)
    if (draft.visual_spec) form.visual_spec_text = JSON.stringify(draft.visual_spec, null, 2)
    if (draft.transcript_text) aiTranscript.value = String(draft.transcript_text)

    modalStage.value = 'result'
    ElMessage.success(copy.value.draftReady)
  } catch (error: any) {
    modalStage.value = 'brief'
    modal.error = errorText(error, copy.value.requestError)
  } finally {
    loading.ai = false
  }
}

async function toggleVisual(item: any) {
  try {
    await cpApi.clubVisualToggle(item.id)
    ElMessage.success(copy.value.toggled)
    await reload()
  } catch (error: any) {
    ElMessage.error(errorText(error, copy.value.requestError))
  }
}

async function deleteVisual(item: any) {
  try {
    await ElMessageBox.confirm(txt(copy.value.deleteConfirm, { name: item.name }), copy.value.delete, {
      confirmButtonText: copy.value.delete,
      cancelButtonText: copy.value.cancel,
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await cpApi.clubVisualDelete(item.id)
    ElMessage.success(copy.value.deleted)
    await reload()
  } catch (error: any) {
    ElMessage.error(errorText(error, copy.value.requestError))
  }
}

function onAudioSelected(event: Event) {
  const target = event?.target as HTMLInputElement | null
  const file = target?.files?.[0] || null
  if (!file) return

  abortRecording()
  clearAudioBrief(false)
  audioFile.value = file
  localAudioPreviewUrl.value = URL.createObjectURL(file)
  recorder.status = 'recorded'
  void uploadAudio(file)
}

async function uploadAudio(file: File | null = audioFile.value) {
  if (!file) return
  uploading.audio = true
  modal.error = ''
  recorderError.value = ''
  recorder.status = 'uploading'
  try {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await cpApi.clubVisualAudioUpload(formData)
    if (data?.url) form.audio_url = data.url
    audioFile.value = file
    if (audioInput.value) audioInput.value.value = ''
    ElMessage.success(copy.value.uploadedAudio)
  } catch (error: any) {
    modal.error = errorText(error, copy.value.requestError)
    recorder.status = audioFile.value ? 'recorded' : 'idle'
  } finally {
    if (form.audio_url) recorder.status = 'ready'
    uploading.audio = false
  }
}

function resolveRecorderMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  if (typeof MediaRecorder === 'undefined') return ''
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function audioExtensionForMime(type: string) {
  if (type.includes('mp4')) return 'm4a'
  if (type.includes('ogg')) return 'ogg'
  return 'webm'
}

function stopRecordingTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
}

function clearLocalAudioPreview() {
  if (localAudioPreviewUrl.value && localAudioPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(localAudioPreviewUrl.value)
  }
  localAudioPreviewUrl.value = ''
}

function releaseMediaStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }
}

function abortRecording() {
  stopRecordingTimer()
  recordedChunks = []
  if (mediaRecorder) {
    mediaRecorder.ondataavailable = null
    mediaRecorder.onstop = null
    mediaRecorder.onerror = null
    if (mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop()
      } catch {}
    }
    mediaRecorder = null
  }
  releaseMediaStream()
  if (recorder.recording) recorder.status = 'idle'
  recorder.recording = false
  recordingSeconds.value = 0
}

function clearAudioBrief(resetInput = true) {
  abortRecording()
  form.audio_url = ''
  audioFile.value = null
  aiTranscript.value = ''
  recorderError.value = ''
  recorder.status = 'idle'
  recordingSeconds.value = 0
  clearLocalAudioPreview()
  if (resetInput && audioInput.value) audioInput.value.value = ''
}

function triggerAudioPicker() {
  audioInput.value?.click()
}

async function startRecording() {
  if (!recorderSupported.value || uploading.audio || loading.ai || loading.save) return

  clearAudioBrief()
  recorderError.value = ''

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = resolveRecorderMimeType()
    mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream)
    recordedChunks = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) recordedChunks.push(event.data)
    }

    mediaRecorder.onerror = () => {
      recorderError.value = copy.value.voicePermissionDenied
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: mediaRecorder?.mimeType || mimeType || 'audio/webm' })
      const extension = audioExtensionForMime(blob.type || mimeType || 'audio/webm')

      recorder.recording = false
      stopRecordingTimer()
      releaseMediaStream()
      mediaRecorder = null

      if (!blob.size) {
        recorder.status = 'idle'
        return
      }

      clearLocalAudioPreview()
      localAudioPreviewUrl.value = URL.createObjectURL(blob)
      const file = new File([blob], `club-visual-brief-${Date.now()}.${extension}`, { type: blob.type || mimeType || 'audio/webm' })
      audioFile.value = file
      recorder.status = 'recorded'
      await uploadAudio(file)
    }

    mediaRecorder.start()
    recorder.recording = true
    recorder.status = 'recording'
    recordingSeconds.value = 0
    recordingTimer = setInterval(() => {
      recordingSeconds.value += 1
    }, 1000)
  } catch {
    recorderError.value = copy.value.voicePermissionDenied
    recorder.recording = false
    recorder.status = 'idle'
    stopRecordingTimer()
    releaseMediaStream()
    mediaRecorder = null
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  mediaRecorder.stop()
}

function toggleRecording() {
  if (recorder.recording) {
    stopRecording()
  } else {
    void startRecording()
  }
}

watch(
  () => canAccess.value,
  (allowed) => {
    if (allowed) reload()
  },
  { immediate: true },
)

onMounted(() => {
  recorderSupported.value =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
})

onBeforeUnmount(() => {
  abortRecording()
  clearLocalAudioPreview()
})
</script>

<style scoped>
.club-visuals-page,
.stats-grid,
.top-grid,
.hero-tools,
.visuals-grid,
.editor-grid,
.editor-layout {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.top-grid {
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
}

.hero-tools {
  grid-template-columns: repeat(2, max-content);
  align-items: center;
  gap: 10px;
}

.guard-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid var(--stroke);
  border-radius: 22px;
  background: var(--surface);
}

.guard-card p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.filter-toolbar {
  display: grid;
  grid-template-columns: 220px 220px minmax(0, 1fr) max-content;
  align-items: end;
  gap: 14px;
}

.compact-filter-toolbar {
  grid-template-columns: 220px minmax(0, 1fr) max-content;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field > input,
.field > select,
.field > textarea {
  min-height: 44px;
  width: 100%;
  padding: 0 14px;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  outline: 0;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 14px;
}

.field > textarea {
  min-height: 110px;
  padding: 12px 14px;
  resize: vertical;
}

.field small {
  color: var(--text-muted);
  font-size: 12px;
}

.section-kicker {
  display: inline-flex;
  margin-bottom: 6px;
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.filters-actions,
.modal-head,
.modal-actions,
.visual-title-row,
.visual-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filters-actions {
  justify-content: flex-end;
  align-self: end;
}

.preview-shell,
.asset-preview,
.visual-media {
  position: relative;
  min-height: 230px;
  border: 1px solid var(--stroke);
  border-radius: 24px;
  background-color: #06111d;
  background-position: center;
  background-size: cover;
  overflow: hidden;
}

.preview-overlay,
.asset-preview-overlay,
.visual-media-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.preview-overlay,
.asset-preview-overlay {
  padding: 24px;
  background: linear-gradient(180deg, rgba(5, 12, 21, 0.08) 0%, rgba(5, 12, 21, 0.88) 100%);
}

.preview-overlay h3,
.asset-preview-overlay h4 {
  margin: 0;
  color: #f4fbff;
  font-size: 30px;
  line-height: 1.02;
  max-width: 520px;
}

.preview-overlay p,
.asset-preview-overlay p {
  margin: 10px 0 0;
  max-width: 520px;
  color: rgba(244, 251, 255, 0.82);
  font-size: 14px;
  line-height: 1.5;
}

.preview-kicker {
  display: inline-flex;
  width: fit-content;
  min-height: 30px;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(98, 230, 255, 0.14);
  color: #abf2ff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.preview-tags,
.preview-meta,
.visual-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preview-tag,
.mode-pill,
.flag-pill,
.hero-meta-badge,
.state-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.mode-pill {
  background: var(--surface-soft);
}

.flag-pill.ready,
.state-pill.ok {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, var(--stroke));
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
}

.preview-meta {
  margin-top: 14px;
  flex-direction: column;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 38px;
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 13px;
}

.meta-row strong {
  color: var(--text);
}

.audio-player {
  width: 100%;
  margin-top: 8px;
}

.state-box {
  min-height: 180px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--stroke);
  border-radius: 20px;
  color: var(--text-muted);
  font-size: 14px;
}

.skeleton-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.skeleton-card {
  display: block;
  min-height: 220px;
  border-radius: 20px;
  background: linear-gradient(120deg, color-mix(in srgb, var(--surface-soft) 86%, transparent), color-mix(in srgb, var(--surface) 88%, transparent), color-mix(in srgb, var(--surface-soft) 86%, transparent));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.visuals-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.visual-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--stroke);
  border-radius: 22px;
  background: var(--surface-soft);
  transition: transform 140ms ease, border-color 140ms ease;
}

.visual-card:hover {
  border-color: color-mix(in srgb, var(--accent) 30%, var(--stroke));
  transform: translateY(-1px);
}

.visual-media {
  min-height: 170px;
}

.visual-media-overlay {
  padding: 12px;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(5, 12, 21, 0.18) 0%, rgba(5, 12, 21, 0.74) 100%);
}

.visual-id {
  align-self: flex-end;
  color: rgba(244, 251, 255, 0.78);
  font-size: 12px;
  font-weight: 700;
}

.visual-body {
  display: grid;
  gap: 12px;
}

.visual-name {
  color: var(--text);
  font-size: 16px;
}

.visual-title-row strong {
  display: block;
  color: var(--text);
  font-size: 16px;
}

.visual-title-row small {
  color: var(--text-muted);
  font-size: 12px;
}

.visual-summary {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
  background: color-mix(in srgb, var(--ink) 34%, transparent);
  backdrop-filter: blur(10px);
}

.modal-shell {
  width: min(1120px, 100%);
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid var(--stroke);
  border-radius: 28px;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

.modal-shell-wide {
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.modal-head {
  align-items: flex-start;
}

.modal-kicker {
  margin: 0 0 6px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.modal-head h3 {
  margin: 0;
  color: var(--text);
  font-size: 30px;
  line-height: 1.05;
}

.modal-head span {
  color: var(--text-muted);
  font-size: 13px;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--surface-soft);
  color: var(--text);
}

.editor-layout {
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  align-items: start;
}

.editor-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-span-2 {
  grid-column: span 2;
}

.studio-steps,
.compact-stack,
.generation-state,
.generation-chips,
.draft-result {
  display: grid;
  gap: 16px;
}

.studio-steps {
  grid-template-columns: repeat(2, max-content);
  gap: 10px;
}

.step-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
}

.step-pill.active {
  border-color: color-mix(in srgb, var(--accent) 28%, var(--stroke));
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  color: var(--text);
}

.compact-layout,
.compact-main,
.compact-stack {
  min-height: 0;
}

.compact-layout {
  grid-template-columns: minmax(0, 1fr);
}

.compact-main {
  width: min(760px, 100%);
}

.brief-composer,
.composer-card,
.voice-composer,
.asset-summary-card {
  display: grid;
  gap: 14px;
}

.brief-composer {
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--stroke));
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 36%),
    var(--surface-soft);
}

.compact-brief {
  width: 100%;
}

.brief-composer-head,
.brief-mode-switch,
.recorder-main,
.recorder-actions-row,
.asset-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.brief-composer-head {
  align-items: flex-start;
}

.brief-composer-head strong,
.asset-summary-row strong {
  display: block;
  color: var(--text);
  font-size: 16px;
}

.brief-composer-head small,
.asset-summary-card p,
.composer-note span {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.brief-mode-switch {
  padding: 4px;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 78%, transparent);
}

.mode-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, transform 140ms ease;
}

.mode-chip.active {
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  color: var(--text);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 26%, var(--stroke));
}

.composer-card {
  padding: 16px;
  border: 1px solid var(--stroke);
  border-radius: 20px;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
}

.composer-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px dashed color-mix(in srgb, var(--accent) 24%, var(--stroke));
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 7%, var(--surface));
}

.voice-composer {
  min-height: 0;
}

.generation-state,
.draft-result {
  padding: 26px;
  border: 1px solid var(--stroke);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 34%),
    var(--surface-soft);
}

.generation-state {
  justify-items: start;
}

.generation-state strong,
.draft-result-head strong,
.draft-placeholder strong {
  color: var(--text);
  font-size: 28px;
  line-height: 1.08;
}

.generation-state p,
.draft-result-head p,
.draft-placeholder p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
}

.generation-spinner {
  width: 54px;
  height: 54px;
  border: 3px solid color-mix(in srgb, var(--accent) 18%, var(--stroke));
  border-top-color: color-mix(in srgb, var(--accent) 72%, white);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.generation-chips {
  grid-template-columns: repeat(auto-fit, minmax(120px, max-content));
}

.draft-result-head {
  display: grid;
  gap: 8px;
}

.draft-placeholder {
  display: grid;
  gap: 12px;
  justify-items: start;
  padding: 18px;
  border: 1px dashed color-mix(in srgb, var(--accent) 24%, var(--stroke));
  border-radius: 20px;
  background: color-mix(in srgb, var(--surface) 84%, transparent);
}

.compact-transcript {
  padding: 0;
}

.recorder-shell {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--stroke);
  border-radius: 22px;
  background:
    radial-gradient(circle at top left, rgba(98, 230, 255, 0.08) 0%, transparent 34%),
    linear-gradient(135deg, rgba(8, 19, 31, 0.94) 0%, rgba(9, 21, 33, 0.96) 100%);
}

.recorder-shell.recording {
  border-color: color-mix(in srgb, var(--danger) 34%, var(--stroke));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--danger) 14%, transparent);
}

.recorder-shell.ready {
  border-color: color-mix(in srgb, var(--success) 28%, var(--stroke));
}

.recorder-orb {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--stroke));
  border-radius: 20px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.14) 0%, transparent 58%),
    color-mix(in srgb, var(--accent) 16%, var(--surface));
  color: #f5fdff;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease;
}

.recorder-orb.recording {
  border-color: color-mix(in srgb, var(--danger) 44%, var(--stroke));
  background:
    radial-gradient(circle at center, rgba(255, 99, 132, 0.22) 0%, transparent 62%),
    color-mix(in srgb, var(--danger) 16%, var(--surface));
  animation: pulse-record 1.15s ease-in-out infinite;
}

.recorder-copy {
  display: grid;
  gap: 4px;
}

.recorder-copy span {
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.recorder-copy strong {
  color: #f4fbff;
  font-size: 30px;
  line-height: 1;
}

.recorder-copy small {
  color: rgba(244, 251, 255, 0.74);
  font-size: 13px;
}

.recorder-bars {
  display: grid;
  grid-template-columns: repeat(16, minmax(0, 1fr));
  align-items: end;
  gap: 6px;
  min-height: 42px;
}

.recorder-bars span {
  display: block;
  min-height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 24%, var(--surface));
  opacity: 0.54;
  transform-origin: bottom;
}

.recorder-bars.active span {
  animation: wave 1s ease-in-out infinite;
}

.recorder-bars span:nth-child(2n) { animation-delay: 0.08s; }
.recorder-bars span:nth-child(3n) { animation-delay: 0.14s; }
.recorder-bars span:nth-child(4n) { animation-delay: 0.22s; }

.asset-summary-card {
  padding: 14px;
  border: 1px solid var(--stroke);
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
}

.asset-summary-card p {
  margin: 0;
}

.field-state {
  align-self: end;
}

.field-accent .color-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 10px;
}

.color-input {
  min-height: 44px;
  padding: 4px;
}

.check-line {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: min(280px, 100%);
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.check-line input[type='checkbox'] {
  width: 20px;
  height: 20px;
  min-height: 20px;
  margin: 0;
  padding: 0;
  flex: 0 0 auto;
  accent-color: color-mix(in srgb, var(--accent) 68%, white);
}

.panel-error {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--danger) 28%, var(--stroke));
  border-radius: 16px;
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  color: var(--danger);
  font-size: 13px;
}

.asset-card,
.asset-stack {
  display: grid;
  gap: 14px;
}

.asset-card {
  padding: 18px;
  border: 1px solid var(--stroke);
  border-radius: 22px;
  background: var(--surface-soft);
}

.asset-url {
  min-height: 44px;
  width: 100%;
  padding: 0 14px;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  outline: 0;
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
}

.file-input {
  min-height: 44px;
  padding: 10px 12px;
}

.sr-only-input {
  display: none;
}

.empty-preview {
  min-height: 230px;
  display: grid;
  place-items: center;
  gap: 10px;
  border: 1px dashed var(--stroke);
  border-radius: 24px;
  color: var(--text-muted);
  background: var(--surface-soft);
}

.ghost-btn,
.primary-btn,
.tiny-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.primary-btn,
.tiny-btn.primary {
  border-color: color-mix(in srgb, var(--accent) 34%, var(--stroke));
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.tiny-btn.danger {
  border-color: color-mix(in srgb, var(--danger) 34%, var(--stroke));
  background: color-mix(in srgb, var(--danger) 10%, var(--surface));
  color: var(--danger);
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@keyframes wave {
  0%, 100% {
    transform: scaleY(0.5);
    opacity: 0.35;
  }
  50% {
    transform: scaleY(1.45);
    opacity: 1;
  }
}

@keyframes pulse-record {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.04);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1280px) {
  .top-grid,
  .editor-layout,
  .visuals-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1180px) {
  .stats-grid,
  .filter-toolbar,
  .editor-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .field-span-2 {
    grid-column: span 1;
  }
}

@media (max-width: 720px) {
  .hero-tools,
  .filters-actions,
  .modal-actions,
  .visual-title-row,
  .visual-actions,
  .studio-steps,
  .brief-composer-head,
  .brief-mode-switch,
  .recorder-main,
  .recorder-actions-row,
  .asset-summary-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .skeleton-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .mode-chip,
  .recorder-orb {
    width: 100%;
  }
}
</style>
