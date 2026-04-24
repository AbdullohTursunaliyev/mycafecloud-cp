<template>
  <div class="shell-banners-page">
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
            <Icon name="lucide:image-plus" size="15" />
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

          <label class="field filter-status-field">
            <span>{{ copy.targetLabel }}</span>
            <select v-model="filters.scope">
              <option value="">{{ copy.statusAll }}</option>
              <option value="all">{{ copy.targetAll }}</option>
              <option value="zones">{{ copy.targetZones }}</option>
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
        <div v-else class="banner-grid">
          <article
            v-for="item in filteredItems"
            :key="item.id"
            class="banner-card"
          >
            <div class="banner-preview" :style="bannerPreviewStyle(item)">
              <div class="banner-preview-top">
                <div class="banner-badges">
                  <span class="state-pill" :class="item.is_active ? 'ok' : 'muted'">
                    {{ item.is_active ? copy.statusActive : copy.statusInactive }}
                  </span>
                  <span class="banner-kind-pill" :class="bannerKindClass(item)">
                    {{ bannerKindLabel(item) }}
                  </span>
                </div>
                <span class="preview-scope">{{ scopeLabel(item.target_scope) }}</span>
              </div>

              <img v-if="item.logo_url" :src="item.logo_url" alt="" class="banner-logo" />
              <div class="banner-copy">
                <strong>{{ item.headline || item.name }}</strong>
                <p>{{ item.subheadline || item.body_text || item.prompt_text || copy.previewFallback }}</p>
              </div>
              <span v-if="item.cta_text" class="cta-pill">{{ item.cta_text }}</span>
            </div>

            <div class="banner-body">
              <div class="banner-body-top">
                <strong class="banner-name">{{ item.name }}</strong>
                <span class="banner-kind-inline" :class="bannerKindClass(item)">
                  {{ bannerKindLabel(item) }}
                </span>
              </div>

              <div class="banner-meta-pills">
                <span class="meta-pill">
                  <Icon name="lucide:monitor-play" size="13" />
                  <span>{{ targetSummary(item) }}</span>
                </span>
                <span class="meta-pill">
                  <Icon name="lucide:timer-reset" size="13" />
                  <span>{{ copy.durationLabel }}: {{ item.display_seconds }}s</span>
                </span>
              </div>

              <p class="banner-summary">{{ excerpt(item.body_text || item.prompt_text || item.subheadline) }}</p>
            </div>

            <div class="banner-actions">
              <button class="tiny-btn" type="button" @click="openEdit(item)">{{ copy.edit }}</button>
              <button class="tiny-btn" :class="item.is_active ? 'danger' : 'primary'" type="button" @click="toggleBanner(item)">
                {{ item.is_active ? copy.disable : copy.enable }}
              </button>
              <button class="tiny-btn danger" type="button" @click="deleteBanner(item)">{{ copy.delete }}</button>
            </div>
          </article>
        </div>
      </CpPanelCard>
    </template>

    <div v-if="modal.open" class="overlay" @click.self="closeModal">
      <div class="modal-shell modal-shell-wide shell-banner-modal">
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

        <div class="editor-main banner-editor-simple">
          <section class="editor-section">
            <div class="section-head">
              <span class="section-kicker">{{ copy.flowTitle }}</span>
              <strong>{{ copy.flowSubtitle }}</strong>
            </div>

            <div class="flow-switch-grid">
              <button
                v-if="canUseAiGeneration"
                class="flow-card"
                :class="{ active: modal.flow === 'ai' }"
                type="button"
                @click="modal.flow = 'ai'"
              >
                <span class="section-kicker">{{ copy.flowAiKicker }}</span>
                <strong>{{ copy.flowAiTitle }}</strong>
                <p>{{ copy.flowAiSubtitle }}</p>
              </button>

              <button
                class="flow-card"
                :class="{ active: modal.flow === 'upload' }"
                type="button"
                @click="modal.flow = 'upload'"
              >
                <span class="section-kicker">{{ copy.flowUploadKicker }}</span>
                <strong>{{ copy.flowUploadTitle }}</strong>
                <p>{{ copy.flowUploadSubtitle }}</p>
              </button>
            </div>
          </section>

          <section class="editor-section">
            <div class="section-head">
              <span class="section-kicker">{{ copy.basicTitle }}</span>
              <strong>{{ copy.basicSubtitle }}</strong>
            </div>

            <div class="field-grid two-col">
              <label class="field">
                <span>{{ copy.fieldName }}</span>
                <input v-model.trim="form.name" :placeholder="copy.fieldNamePlaceholder" />
              </label>

              <label class="field">
                <span>{{ copy.targetLabel }}</span>
                <select v-model="form.target_scope">
                  <option value="all">{{ copy.targetAll }}</option>
                  <option value="zones">{{ copy.targetZones }}</option>
                </select>
              </label>
            </div>

            <div v-if="form.target_scope === 'zones'" class="selector-block">
              <p class="selector-hint">{{ copy.targetZonesHint }}</p>
              <div class="selector-chips">
                <button
                  v-for="zone in zones"
                  :key="zone.id"
                  class="selector-chip"
                  :class="{ active: form.target_zone_ids.includes(zone.id) }"
                  type="button"
                  @click="toggleSelection(form.target_zone_ids, zone.id)"
                >
                  {{ zone.name }}
                </button>
              </div>
            </div>
          </section>

          <section v-if="canUseAiGeneration && modal.flow === 'ai'" class="editor-section">
            <div class="section-head">
              <span class="section-kicker">{{ copy.aiTitle }}</span>
              <strong>{{ copy.aiSubtitle }}</strong>
            </div>

            <div class="mode-switch">
              <button
                class="mode-chip"
                :class="{ active: modal.briefMode === 'text' }"
                type="button"
                @click="modal.briefMode = 'text'"
              >
                {{ copy.modeText }}
              </button>
              <button
                class="mode-chip"
                :class="{ active: modal.briefMode === 'audio' }"
                type="button"
                @click="modal.briefMode = 'audio'"
              >
                {{ copy.modeAudio }}
              </button>
            </div>

            <label v-if="modal.briefMode === 'text'" class="field">
              <span>{{ copy.briefLabel }}</span>
              <textarea v-model.trim="form.prompt_text" :placeholder="copy.briefPlaceholder" rows="5"></textarea>
              <small>{{ copy.briefHint }}</small>
            </label>

            <div v-else class="upload-tile">
              <div class="upload-tile-copy">
                <span class="section-kicker">{{ copy.audioLabel }}</span>
                <strong>{{ copy.audioTileTitle }}</strong>
                <p>{{ form.audio_url ? copy.audioReady : copy.audioTileHint }}</p>
              </div>
              <div class="asset-actions">
                <button class="ghost-btn" type="button" :disabled="uploading.audio || loading.save" @click="audioInput?.click()">
                  <Icon name="lucide:mic-2" size="14" />
                  <span>{{ uploading.audio ? copy.uploading : copy.audioUpload }}</span>
                </button>
                <button class="ghost-btn" type="button" :disabled="!form.audio_url || uploading.audio || loading.save" @click="clearAsset('audio')">
                  {{ copy.removeAsset }}
                </button>
              </div>
              <audio v-if="form.audio_url" class="audio-player" :src="form.audio_url" controls preload="none"></audio>
            </div>
          </section>

          <section v-else class="editor-section">
            <div class="section-head">
              <span class="section-kicker">{{ copy.uploadTitle }}</span>
              <strong>{{ copy.uploadSubtitle }}</strong>
            </div>

            <div class="upload-tile">
              <div class="upload-tile-copy">
                <span class="section-kicker">{{ copy.imageLabel }}</span>
                <strong>{{ copy.imageTileTitle }}</strong>
                <p>{{ form.image_url ? copy.imageReady : copy.imageTileHint }}</p>
              </div>
              <div class="asset-actions">
                <button class="ghost-btn" type="button" :disabled="uploading.image || loading.save" @click="imageInput?.click()">
                  <Icon name="lucide:image-plus" size="14" />
                  <span>{{ uploading.image ? copy.uploading : copy.imageUpload }}</span>
                </button>
                <button class="ghost-btn" type="button" :disabled="!form.image_url || uploading.image || loading.save" @click="clearAsset('image')">
                  {{ copy.removeAsset }}
                </button>
              </div>
            </div>
          </section>

          <section class="editor-section">
            <div class="section-head">
              <span class="section-kicker">{{ copy.assetsTitle }}</span>
              <strong>{{ copy.assetsSubtitle }}</strong>
            </div>

            <div class="upload-tile required">
              <div class="upload-tile-copy">
                <span class="section-kicker">{{ copy.logoLabel }}</span>
                <strong>{{ copy.logoRequired }}</strong>
                <p>{{ form.logo_url ? copy.logoReady : copy.logoHint }}</p>
              </div>
              <div class="asset-actions">
                <button class="ghost-btn" type="button" :disabled="uploading.logo || loading.save" @click="logoInput?.click()">
                  <Icon name="lucide:badge-percent" size="14" />
                  <span>{{ uploading.logo ? copy.uploading : copy.logoUpload }}</span>
                </button>
                <button class="ghost-btn" type="button" :disabled="!form.logo_url || uploading.logo || loading.save" @click="clearAsset('logo')">
                  {{ copy.removeAsset }}
                </button>
              </div>
            </div>

            <input ref="logoInputRef" class="sr-only-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" @change="onAssetSelected($event, 'logo')" />
            <input ref="imageInputRef" class="sr-only-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" @change="onAssetSelected($event, 'image')" />
            <input ref="audioInputRef" class="sr-only-input" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm" @change="onAssetSelected($event, 'audio')" />
          </section>

          <section class="editor-section">
            <div class="section-head">
              <span class="section-kicker">{{ copy.displayTitle }}</span>
              <strong>{{ copy.displaySubtitle }}</strong>
            </div>

            <div class="field-grid two-col">
              <label class="field">
                <span>{{ copy.durationLabel }}</span>
                <input v-model.number="form.display_seconds" type="number" min="3" max="60" />
              </label>
            </div>

            <label class="toggle-row">
              <span>{{ copy.activeLabel }}</span>
              <button
                class="toggle-chip"
                :class="{ active: form.is_active }"
                type="button"
                @click="form.is_active = !form.is_active"
              >
                {{ form.is_active ? copy.statusActive : copy.statusInactive }}
              </button>
            </label>
          </section>

          <p v-if="modal.error" class="panel-error">{{ modal.error }}</p>
        </div>

        <div class="modal-actions">
          <button class="ghost-btn" type="button" :disabled="loading.save" @click="closeModal">{{ copy.cancel }}</button>
          <button class="primary-btn" type="button" :disabled="loading.save" @click="save">
            {{ loading.save ? copy.saving : modal.mode === 'create' ? copy.create : copy.save }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpAuthStore } from '@legacy/stores/cpAuth'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'

definePageMeta({
  layout: 'cp',
  roles: ['admin', 'owner'],
})

const shellBannerCopy = {
  uz: {
    headTitle: 'Shell bannerlar',
    eyebrow: 'Shell banner studio',
    title: 'Shell bannerlar',
    subtitle: 'Kompyuterxona shell ekranlari uchun logo bilan bannerlar tayyorlang, zonalarga taqsimlang va jadvalga qo‘ying.',
    updatedAt: 'Yangilandi',
    refresh: 'Yangilash',
    refreshing: 'Yuklanmoqda...',
    add: 'Banner qo‘shish',
    noAccessTitle: 'Bu bo‘lim yopiq',
    noAccessSubtitle: 'Shell bannerlarni faqat owner yoki admin boshqaradi.',
    filtersTitle: 'Filtrlar',
    filtersSubtitle: 'Holat, joylashuv va nom bo‘yicha kerakli bannerni toping.',
    statusLabel: 'Holat',
    statusAll: 'Barchasi',
    statusActive: 'Faol',
    statusInactive: 'O‘chiq',
    targetLabel: 'Target',
    targetAll: 'Barcha shelllar',
    targetZones: 'Zona bo‘yicha',
    targetPcs: 'Aniq PC lar',
    searchLabel: 'Qidiruv',
    searchPlaceholder: 'Banner nomi bo‘yicha qidiring...',
    reset: 'Tozalash',
    listTitle: 'Banner kutubxonasi',
    listSubtitle: 'Shell manifestga chiqadigan tayyor bannerlar ro‘yxati.',
    empty: 'Hozircha shell bannerlar qo‘shilmagan.',
    edit: 'Tahrirlash',
    enable: 'Yoqish',
    disable: 'O‘chirish',
    delete: 'O‘chirish',
    deleteConfirm: '"{name}" bannerni o‘chirilsinmi?',
    modalKicker: 'Shell banner studio',
    modalCreate: 'Yangi banner',
    modalEdit: 'Bannerni tahrirlash',
    modalSubtitle: 'Logo majburiy. Banner target va schedule bo‘yicha shell ekranlariga tarqatiladi.',
    flowTitle: 'Yaratish yo‘li',
    flowSubtitle: 'Bannerni AI brief orqali yoki tayyor rasm bilan qo‘shing.',
    flowAiKicker: 'AI banner',
    flowAiTitle: 'AI orqali tayyorlash',
    flowAiSubtitle: 'Logo va brief berasiz, banner AI oqimi uchun tayyor draft bo‘ladi.',
    flowUploadKicker: 'Tayyor banner',
    flowUploadTitle: 'Mavjud banner yuklash',
    flowUploadSubtitle: 'Tayyor bannerni yuklaysiz va uni barcha shell yoki zonalarga biriktirasiz.',
    basicTitle: 'Asosiy sozlama',
    basicSubtitle: 'Nomi va qayerda ko‘rinishini tanlang.',
    fieldName: 'Banner nomi',
    fieldNamePlaceholder: 'Masalan: VIP turnir banneri',
    aiTitle: 'AI brief',
    aiSubtitle: 'AI uchun text yoki audio brief qoldiring.',
    modeText: 'Text',
    modeAudio: 'Audio',
    briefLabel: 'Text brief',
    briefPlaceholder: 'Masalan: neon uslub, markazda logo, chap tomonda turnir sarlavhasi, qoramtir fon...',
    briefHint: 'AI oqimi shu brief asosida banner draft tayyorlaydi.',
    uploadTitle: 'Banner rasmi',
    uploadSubtitle: 'Tayyor bannerni yuklang va shell ekranlarga yuboring.',
    assetsTitle: 'Brend aktivi',
    assetsSubtitle: 'Logo majburiy. U bannerda klub identikasini ko‘rsatadi.',
    logoLabel: 'Klub logosi',
    logoRequired: 'Majburiy',
    logoHint: 'Bannerda klub identikasi chiqishi uchun logo yuklanishi shart.',
    logoReady: 'Logo ulandi',
    logoUpload: 'Logo yuklash',
    imageLabel: 'Fon rasmi',
    imageTileTitle: 'Tayyor bannerni yuklash',
    imageTileHint: 'PNG, JPG yoki WEBP banner yuklang. Preview list ichida ko‘rinadi.',
    imageReady: 'Banner rasmi ulandi',
    imageUpload: 'Rasm yuklash',
    audioLabel: 'Audio brief',
    audioTileTitle: 'Audio brief yuklash',
    audioTileHint: 'Bannerni ovoz bilan tushuntiring, AI shu brief bilan ishlaydi.',
    audioReady: 'Audio ulandi',
    audioUpload: 'Audio yuklash',
    removeAsset: 'Tozalash',
    uploading: 'Yuklanmoqda...',
    targetZonesHint: 'Bannerni ko‘rsatish kerak bo‘lgan zonalarni belgilang.',
    unknownZone: 'Zona yo‘q',
    displayTitle: 'Ko‘rsatish',
    displaySubtitle: 'Banner lock holatida ko‘rinadi. Bu yerda faqat ko‘rsatish davomiyligini boshqaring.',
    durationLabel: 'Ko‘rsatish vaqti',
    activeLabel: 'Holat',
    previewFallback: 'Yangi shell banner',
    previewHint: 'Banner uchun qisqacha tavsif kiritilmagan.',
    kindAi: 'AI banner',
    kindUpload: 'Tayyor banner',
    cancel: 'Bekor qilish',
    create: 'Yaratish',
    save: 'Saqlash',
    saving: 'Saqlanmoqda...',
    requiredNameError: 'Banner nomini kiriting.',
    requiredLogoError: 'Banner uchun logo yuklash majburiy.',
    requiredImageError: 'Tayyor banner rejimida rasm yuklash majburiy.',
    requiredBriefError: 'AI banner uchun text brief kiriting.',
    requiredAudioError: 'AI banner uchun audio brief yuklang.',
    targetZoneError: 'Kamida bitta zona tanlang.',
    requestError: 'Banner bilan ishlashda xatolik yuz berdi.',
    created: 'Banner yaratildi.',
    updated: 'Banner yangilandi.',
    deleted: 'Banner o‘chirildi.',
    toggled: 'Banner holati yangilandi.',
    uploadedLogo: 'Logo yuklandi.',
    uploadedImage: 'Rasm yuklandi.',
    uploadedAudio: 'Audio yuklandi.',
  },
  ru: {
    headTitle: 'Баннеры shell',
    eyebrow: 'Shell banner studio',
    title: 'Баннеры shell',
    subtitle: 'Создавайте баннеры для экранов shell, добавляйте логотип клуба, назначайте по зонам и по расписанию.',
    updatedAt: 'Обновлено',
    refresh: 'Обновить',
    refreshing: 'Загрузка...',
    add: 'Добавить баннер',
    noAccessTitle: 'Раздел закрыт',
    noAccessSubtitle: 'Баннеры shell может настраивать только owner или admin.',
    filtersTitle: 'Фильтры',
    filtersSubtitle: 'Найдите нужный баннер по статусу, размещению и названию.',
    statusLabel: 'Статус',
    statusAll: 'Все',
    statusActive: 'Активно',
    statusInactive: 'Выключено',
    targetLabel: 'Target',
    targetAll: 'Все shell',
    targetZones: 'По зонам',
    targetPcs: 'По PC',
    searchLabel: 'Поиск',
    searchPlaceholder: 'Найдите баннер по названию...',
    reset: 'Сбросить',
    listTitle: 'Библиотека баннеров',
    listSubtitle: 'Готовые баннеры, которые попадают в shell manifest.',
    empty: 'Пока нет баннеров shell.',
    edit: 'Изменить',
    enable: 'Включить',
    disable: 'Отключить',
    delete: 'Удалить',
    deleteConfirm: 'Удалить баннер "{name}"?',
    modalKicker: 'Shell banner studio',
    modalCreate: 'Новый баннер',
    modalEdit: 'Редактировать баннер',
    modalSubtitle: 'Логотип обязателен. Баннер будет раздаваться по shell экранам по target и расписанию.',
    flowTitle: 'Способ создания',
    flowSubtitle: 'Добавьте баннер через AI brief или загрузите готовый баннер.',
    flowAiKicker: 'AI banner',
    flowAiTitle: 'Подготовить через AI',
    flowAiSubtitle: 'Вы даете логотип и brief, а система готовит AI draft баннера.',
    flowUploadKicker: 'Готовый баннер',
    flowUploadTitle: 'Загрузить существующий баннер',
    flowUploadSubtitle: 'Загрузите готовый баннер и назначьте его на все shell или на нужные зоны.',
    basicTitle: 'Основная настройка',
    basicSubtitle: 'Укажите название и место показа баннера.',
    fieldName: 'Название баннера',
    fieldNamePlaceholder: 'Например: VIP турнир',
    aiTitle: 'AI brief',
    aiSubtitle: 'Оставьте текстовый или голосовой brief для AI.',
    modeText: 'Текст',
    modeAudio: 'Аудио',
    briefLabel: 'Text brief',
    briefPlaceholder: 'Например: неоновый стиль, логотип по центру, слева турнирный заголовок, темный фон...',
    briefHint: 'AI поток будет использовать этот brief как основу для баннера.',
    uploadTitle: 'Изображение баннера',
    uploadSubtitle: 'Загрузите готовый баннер и отправьте его на shell экраны.',
    assetsTitle: 'Брендовый актив',
    assetsSubtitle: 'Логотип обязателен. Он нужен для клубной айдентики на баннере.',
    logoLabel: 'Логотип клуба',
    logoRequired: 'Обязательно',
    logoHint: 'Без логотипа баннер не сохраняется, потому что клубный бренд должен быть виден.',
    logoReady: 'Логотип подключен',
    logoUpload: 'Загрузить логотип',
    imageLabel: 'Фоновое изображение',
    imageTileTitle: 'Загрузить готовый баннер',
    imageTileHint: 'Загрузите PNG, JPG или WEBP. Превью увидите уже в списке баннеров.',
    imageReady: 'Изображение баннера подключено',
    imageUpload: 'Загрузить изображение',
    audioLabel: 'Audio brief',
    audioTileTitle: 'Загрузить audio brief',
    audioTileHint: 'Опишите баннер голосом, и AI сможет опираться на этот brief.',
    audioReady: 'Аудио подключено',
    audioUpload: 'Загрузить аудио',
    removeAsset: 'Очистить',
    uploading: 'Загрузка...',
    targetZonesHint: 'Отметьте зоны, где должен показываться баннер.',
    unknownZone: 'Без зоны',
    displayTitle: 'Показ',
    displaySubtitle: 'Баннер показывается в lock состоянии shell. Здесь управляется только длительность показа.',
    durationLabel: 'Показ',
    activeLabel: 'Состояние',
    previewFallback: 'Новый shell banner',
    previewHint: 'Для баннера пока нет краткого описания.',
    kindAi: 'AI баннер',
    kindUpload: 'Готовый баннер',
    cancel: 'Отмена',
    create: 'Создать',
    save: 'Сохранить',
    saving: 'Сохранение...',
    requiredNameError: 'Введите название баннера.',
    requiredLogoError: 'Для баннера обязательно нужен логотип.',
    requiredImageError: 'В режиме готового баннера нужно загрузить изображение.',
    requiredBriefError: 'Для AI баннера введите текстовый brief.',
    requiredAudioError: 'Для AI баннера загрузите audio brief.',
    targetZoneError: 'Выберите хотя бы одну зону.',
    requestError: 'Не удалось выполнить операцию с баннером.',
    created: 'Баннер создан.',
    updated: 'Баннер обновлен.',
    deleted: 'Баннер удален.',
    toggled: 'Состояние баннера обновлено.',
    uploadedLogo: 'Логотип загружен.',
    uploadedImage: 'Изображение загружено.',
    uploadedAudio: 'Аудио загружено.',
  },
  en: {
    headTitle: 'Shell banners',
    eyebrow: 'Shell banner studio',
    title: 'Shell banners',
    subtitle: 'Create banners for shell screens, require the club logo, assign by zone or PC, and run them on schedule.',
    updatedAt: 'Updated',
    refresh: 'Refresh',
    refreshing: 'Loading...',
    add: 'Add banner',
    noAccessTitle: 'This section is restricted',
    noAccessSubtitle: 'Only owner or admin can manage shell banners.',
    filtersTitle: 'Filters',
    filtersSubtitle: 'Find a banner by status, placement, or name.',
    statusLabel: 'Status',
    statusAll: 'All',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    targetLabel: 'Target',
    targetAll: 'All shells',
    targetZones: 'By zones',
    targetPcs: 'By PCs',
    searchLabel: 'Search',
    searchPlaceholder: 'Search by banner name...',
    reset: 'Reset',
    listTitle: 'Banner library',
    listSubtitle: 'Ready banners that are exposed to the shell manifest.',
    empty: 'No shell banners yet.',
    edit: 'Edit',
    enable: 'Enable',
    disable: 'Disable',
    delete: 'Delete',
    deleteConfirm: 'Delete banner "{name}"?',
    modalKicker: 'Shell banner studio',
    modalCreate: 'New banner',
    modalEdit: 'Edit banner',
    modalSubtitle: 'Logo is required. The banner will be delivered to shell screens by target and schedule.',
    flowTitle: 'Creation path',
    flowSubtitle: 'Add the banner through an AI brief or upload an existing banner.',
    flowAiKicker: 'AI banner',
    flowAiTitle: 'Prepare with AI',
    flowAiSubtitle: 'Provide the logo and a brief, then use it as the AI banner draft source.',
    flowUploadKicker: 'Existing banner',
    flowUploadTitle: 'Upload ready banner',
    flowUploadSubtitle: 'Upload an existing banner and assign it to all shells or selected zones.',
    basicTitle: 'Core setup',
    basicSubtitle: 'Set the banner name and where it should appear.',
    fieldName: 'Banner name',
    fieldNamePlaceholder: 'Example: VIP tournament banner',
    aiTitle: 'AI brief',
    aiSubtitle: 'Leave a text or audio brief for the AI flow.',
    modeText: 'Text',
    modeAudio: 'Audio',
    briefLabel: 'Text brief',
    briefPlaceholder: 'Example: neon style, centered logo, tournament headline on the left, dark background...',
    briefHint: 'The AI flow will use this brief as the banner source.',
    uploadTitle: 'Banner artwork',
    uploadSubtitle: 'Upload a ready-made banner and send it to shell screens.',
    assetsTitle: 'Brand asset',
    assetsSubtitle: 'Logo is required so the club branding is always visible.',
    logoLabel: 'Club logo',
    logoRequired: 'Required',
    logoHint: 'The logo is mandatory because the banner must reflect the club brand.',
    logoReady: 'Logo attached',
    logoUpload: 'Upload logo',
    imageLabel: 'Background image',
    imageTileTitle: 'Upload ready banner',
    imageTileHint: 'Upload a PNG, JPG, or WEBP banner. You can preview it in the list after saving.',
    imageReady: 'Banner image attached',
    imageUpload: 'Upload image',
    audioLabel: 'Audio brief',
    audioTileTitle: 'Upload audio brief',
    audioTileHint: 'Describe the banner by voice and let AI work from that brief.',
    audioReady: 'Audio attached',
    audioUpload: 'Upload audio',
    removeAsset: 'Clear',
    uploading: 'Uploading...',
    targetZonesHint: 'Select the zones where this banner should appear.',
    unknownZone: 'No zone',
    displayTitle: 'Display',
    displaySubtitle: 'The banner appears on the shell lock state. Only manage the display duration here.',
    durationLabel: 'Duration',
    activeLabel: 'State',
    previewFallback: 'New shell banner',
    previewHint: 'No short banner description yet.',
    kindAi: 'AI banner',
    kindUpload: 'Ready banner',
    cancel: 'Cancel',
    create: 'Create',
    save: 'Save',
    saving: 'Saving...',
    requiredNameError: 'Please enter a banner name.',
    requiredLogoError: 'A logo is required for the banner.',
    requiredImageError: 'Please upload a banner image in ready banner mode.',
    requiredBriefError: 'Please enter a text brief for the AI banner.',
    requiredAudioError: 'Please upload an audio brief for the AI banner.',
    targetZoneError: 'Select at least one zone.',
    requestError: 'Could not complete the banner request.',
    created: 'Banner created.',
    updated: 'Banner updated.',
    deleted: 'Banner deleted.',
    toggled: 'Banner state updated.',
    uploadedLogo: 'Logo uploaded.',
    uploadedImage: 'Image uploaded.',
    uploadedAudio: 'Audio uploaded.',
  },
}

const copy = useCpCopy(shellBannerCopy)

useHead({
  title: computed(() => `${copy.value.headTitle} - NEXORA CLOUD CP`),
})

const auth = useCpAuthStore()
const { formatDateTime } = useCpFormatters()

type BannerScope = 'all' | 'zones' | 'pcs'
type BannerFlow = 'ai' | 'upload'
type BriefMode = 'text' | 'audio'

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

function blankForm() {
  return {
    name: '',
    prompt_text: '',
    image_url: '',
    logo_url: '',
    audio_url: '',
    accent_color: '#62E6FF',
    target_scope: 'all' as BannerScope,
    target_zone_ids: [] as number[],
    display_seconds: 12,
    sort_order: 0,
    is_active: true,
  }
}

const canAccess = computed(() => {
  const role = auth.operator?.role
  return role === 'admin' || role === 'owner'
})
const canUseAiGeneration = computed(() => auth.hasFeature('ai_generation'))

const showAccessGuard = computed(() => Boolean(auth.operator) && !canAccess.value)

const loading = reactive({
  list: false,
  save: false,
})

const uploading = reactive({
  logo: false,
  image: false,
  audio: false,
})

const items = ref<any[]>([])
const zones = ref<any[]>([])
const updatedAt = ref<string | null>(null)

const filters = reactive({
  active: '',
  scope: '',
  q: '',
})

const modal = reactive({
  open: false,
  mode: 'create' as 'create' | 'edit',
  flow: 'upload' as BannerFlow,
  briefMode: 'text' as BriefMode,
  id: null as number | null,
  error: '',
})

const form = reactive(blankForm())

const logoInputRef = ref<HTMLInputElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const audioInputRef = ref<HTMLInputElement | null>(null)

const logoInput = computed(() => logoInputRef.value)
const imageInput = computed(() => imageInputRef.value)
const audioInput = computed(() => audioInputRef.value)

const updatedAtLabel = computed(() => (updatedAt.value ? formatDateTime(updatedAt.value) : '-'))

const filteredItems = computed(() => {
  let list = items.value.slice()

  if (filters.active !== '') {
    const active = filters.active === 'true'
    list = list.filter((item) => !!item.is_active === active)
  }

  if (filters.scope) {
    list = list.filter((item) => String(item.target_scope || '') === filters.scope)
  }

  const q = filters.q.trim().toLowerCase()
  if (q) {
    list = list.filter((item) =>
      [item.name, item.headline, item.subheadline, item.body_text, item.prompt_text]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }

  return list
})

watch(
  () => canAccess.value,
  (value) => {
    if (value) {
      void reload()
    }
  },
  { immediate: true },
)

function resetFilters() {
  filters.active = ''
  filters.scope = ''
  filters.q = ''
}

function resetForm() {
  Object.assign(form, blankForm())
  modal.error = ''
  if (logoInput.value) logoInput.value.value = ''
  if (imageInput.value) imageInput.value.value = ''
  if (audioInput.value) audioInput.value.value = ''
}

function openCreate() {
  resetForm()
  modal.mode = 'create'
  modal.flow = 'upload'
  modal.briefMode = 'text'
  modal.id = null
  modal.open = true
}

function openEdit(item: any) {
  resetForm()
  modal.mode = 'edit'
  modal.flow = canUseAiGeneration.value && !item?.image_url ? 'ai' : 'upload'
  modal.briefMode = canUseAiGeneration.value && item?.audio_url && !item?.prompt_text ? 'audio' : 'text'
  modal.id = Number(item.id)
  Object.assign(form, {
    name: item?.name ?? '',
    prompt_text: item?.prompt_text ?? '',
    image_url: item?.image_url ?? '',
    logo_url: item?.logo_url ?? '',
    audio_url: item?.audio_url ?? '',
    accent_color: item?.accent_color || '#62E6FF',
    target_scope: (item?.target_scope || 'all') as BannerScope,
    target_zone_ids: Array.isArray(item?.target_zone_ids) ? item.target_zone_ids.map((value: any) => Number(value)) : [],
    display_seconds: Number(item?.display_seconds ?? 12),
    sort_order: Number(item?.sort_order ?? 0),
    is_active: !!item?.is_active,
  })
  modal.error = ''
  modal.open = true
}

function closeModal() {
  modal.open = false
  modal.error = ''
}

async function reload() {
  if (!canAccess.value) return

  loading.list = true
  try {
    const [bannersResponse, zonesResponse] = await Promise.all([
      cpApi.shellBanners(),
      cpApi.zoneList(),
    ])

    items.value = Array.isArray(bannersResponse?.data?.data) ? bannersResponse.data.data : []
    zones.value = Array.isArray(zonesResponse?.data?.data) ? zonesResponse.data.data : []
    updatedAt.value = new Date().toISOString()
  } catch {
    items.value = []
    zones.value = []
  } finally {
    loading.list = false
  }
}

function buildPayload() {
  const isAiFlow = modal.flow === 'ai'
  const isAudioBrief = isAiFlow && modal.briefMode === 'audio'

  return {
    name: form.name.trim(),
    headline: null,
    subheadline: null,
    body_text: null,
    cta_text: null,
    prompt_text: isAiFlow && !isAudioBrief ? form.prompt_text.trim() || null : null,
    image_url: !isAiFlow ? form.image_url.trim() || null : null,
    logo_url: form.logo_url.trim() || null,
    audio_url: isAudioBrief ? form.audio_url.trim() || null : null,
    accent_color: form.accent_color.trim() || null,
    target_scope: form.target_scope === 'zones' ? 'zones' : 'all',
    target_zone_ids: form.target_scope === 'zones' ? form.target_zone_ids.slice() : [],
    target_pc_ids: [],
    starts_at: null,
    ends_at: null,
    display_seconds: Number(form.display_seconds || 12),
    sort_order: Number(form.sort_order || 0),
    is_active: !!form.is_active,
  }
}

async function save() {
  modal.error = ''

  if (!form.name.trim()) {
    modal.error = copy.value.requiredNameError
    return
  }

  if (!form.logo_url.trim()) {
    modal.error = copy.value.requiredLogoError
    return
  }

  const usingAiFlow = canUseAiGeneration.value && modal.flow === 'ai'
  const hasExistingAiBrief = !!form.prompt_text.trim() || !!form.audio_url.trim()

  if (!usingAiFlow && !form.image_url.trim() && !hasExistingAiBrief) {
    modal.error = copy.value.requiredImageError
    return
  }

  if (usingAiFlow && modal.briefMode === 'text' && !form.prompt_text.trim()) {
    modal.error = copy.value.requiredBriefError
    return
  }

  if (usingAiFlow && modal.briefMode === 'audio' && !form.audio_url.trim()) {
    modal.error = copy.value.requiredAudioError
    return
  }

  if (form.target_scope === 'zones' && form.target_zone_ids.length === 0) {
    modal.error = copy.value.targetZoneError
    return
  }

  loading.save = true
  try {
    const payload = buildPayload()
    if (modal.mode === 'create') {
      await cpApi.shellBannerCreate(payload)
      ElMessage.success(copy.value.created)
    } else if (modal.id) {
      await cpApi.shellBannerUpdate(modal.id, payload)
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

async function toggleBanner(item: any) {
  try {
    await cpApi.shellBannerToggle(item.id)
    ElMessage.success(copy.value.toggled)
    await reload()
  } catch (error: any) {
    ElMessage.error(errorText(error, copy.value.requestError))
  }
}

async function deleteBanner(item: any) {
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
    await cpApi.shellBannerDelete(item.id)
    ElMessage.success(copy.value.deleted)
    await reload()
  } catch (error: any) {
    ElMessage.error(errorText(error, copy.value.requestError))
  }
}

function clearAsset(kind: 'logo' | 'image' | 'audio') {
  if (kind === 'logo') {
    form.logo_url = ''
    if (logoInput.value) logoInput.value.value = ''
    return
  }

  if (kind === 'image') {
    form.image_url = ''
    if (imageInput.value) imageInput.value.value = ''
    return
  }

  form.audio_url = ''
  if (audioInput.value) audioInput.value.value = ''
}

async function onAssetSelected(event: Event, kind: 'logo' | 'image' | 'audio') {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0] || null
  if (!file) return

  await uploadAsset(kind, file)
}

async function uploadAsset(kind: 'logo' | 'image' | 'audio', file: File) {
  uploading[kind] = true
  modal.error = ''
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = kind === 'logo'
      ? await cpApi.shellBannerLogoUpload(formData)
      : kind === 'image'
        ? await cpApi.shellBannerImageUpload(formData)
        : await cpApi.shellBannerAudioUpload(formData)

    const url = String(response?.data?.url || '')
    if (kind === 'logo') {
      form.logo_url = url
      ElMessage.success(copy.value.uploadedLogo)
    } else if (kind === 'image') {
      form.image_url = url
      ElMessage.success(copy.value.uploadedImage)
    } else {
      form.audio_url = url
      ElMessage.success(copy.value.uploadedAudio)
    }
  } catch (error: any) {
    modal.error = errorText(error, copy.value.requestError)
  } finally {
    uploading[kind] = false
  }
}

function toggleSelection(target: number[], value: number) {
  const index = target.indexOf(value)
  if (index >= 0) {
    target.splice(index, 1)
  } else {
    target.push(value)
  }
}

function scopeLabel(scope: BannerScope | string) {
  if (scope === 'zones') return copy.value.targetZones
  if (scope === 'pcs') return copy.value.targetPcs
  return copy.value.targetAll
}

function bannerKind(item: any) {
  return String(item?.image_url || '').trim() ? 'upload' : 'ai'
}

function bannerKindLabel(item: any) {
  return bannerKind(item) === 'upload' ? copy.value.kindUpload : copy.value.kindAi
}

function bannerKindClass(item: any) {
  return bannerKind(item) === 'upload' ? 'upload' : 'ai'
}

function targetSummary(item: any) {
  const scope = String(item?.target_scope || 'all')
  if (scope === 'zones') {
    const ids = Array.isArray(item?.target_zone_ids) ? item.target_zone_ids.map((value: any) => Number(value)) : []
    const names = zones.value.filter((zone) => ids.includes(Number(zone.id))).map((zone) => zone.name)
    return names.length ? names.join(', ') : copy.value.targetZones
  }

  return copy.value.targetAll
}

function excerpt(value: string | null | undefined) {
  const text = String(value || '').trim()
  if (!text) return copy.value.previewHint
  return text.length > 120 ? `${text.slice(0, 117)}...` : text
}

function bannerPreviewStyle(item: any) {
  const accent = String(item?.accent_color || '#62E6FF')
  const imageUrl = String(item?.image_url || '').trim()
  const backgroundImage = imageUrl
    ? `linear-gradient(180deg, rgba(4,10,18,0.18) 0%, rgba(4,10,18,0.84) 100%), url("${imageUrl}")`
    : `radial-gradient(circle at 18% 20%, ${accent}44 0%, transparent 34%), linear-gradient(135deg, rgba(5,14,25,0.98) 0%, rgba(9,26,40,0.98) 100%)`

  return {
    backgroundImage,
    borderColor: `${accent}55`,
    boxShadow: `inset 0 0 0 1px ${accent}18`,
  }
}
</script>

<style scoped>
.shell-banners-page,
.banner-grid,
.asset-grid,
.selector-chips,
.selector-pc-grid {
  display: grid;
  gap: 18px;
}

.hero-tools,
.filters-actions,
.modal-head,
.modal-actions,
.banner-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hero-tools {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.filters-actions {
  justify-content: flex-end;
  align-self: end;
}

.guard-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--stroke);
  border-radius: 20px;
  background: var(--surface-soft);
  color: var(--text);
}

.guard-card strong {
  display: block;
  font-size: 15px;
}

.guard-card p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

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

.state-pill.ok {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, var(--stroke));
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
}

.filter-toolbar {
  display: grid;
  gap: 14px;
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
  min-height: 180px;
  border-radius: 20px;
  background: linear-gradient(120deg, color-mix(in srgb, var(--surface-soft) 86%, transparent), color-mix(in srgb, var(--surface) 88%, transparent), color-mix(in srgb, var(--surface-soft) 86%, transparent));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
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
  width: min(560px, 100%);
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid var(--stroke);
  border-radius: 28px;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

.modal-shell-wide {
  width: min(1320px, 100%);
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

.compact-filter-toolbar {
  grid-template-columns: 220px 220px minmax(280px, 1fr) auto;
  align-items: end;
}

.banner-grid {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.banner-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(11, 19, 28, 0.96), rgba(6, 12, 18, 0.98));
}

.banner-preview,
.preview-stage {
  min-height: 224px;
  display: grid;
  align-content: space-between;
  gap: 16px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(98, 230, 255, 0.16);
  background-size: cover;
  background-position: center;
}

.banner-preview-top,
.preview-stage-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.banner-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-scope,
.preview-badge,
.preview-duration {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.banner-kind-pill,
.banner-kind-inline {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.banner-kind-pill.ai,
.banner-kind-inline.ai {
  border: 1px solid rgba(126, 197, 255, 0.22);
  background: rgba(126, 197, 255, 0.12);
  color: #b7e8ff;
}

.banner-kind-pill.upload,
.banner-kind-inline.upload {
  border: 1px solid rgba(98, 230, 255, 0.24);
  background: rgba(98, 230, 255, 0.12);
  color: #c7fcff;
}

.banner-logo,
.preview-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.26));
}

.banner-copy,
.preview-copy {
  display: grid;
  gap: 8px;
}

.banner-copy strong,
.preview-copy strong {
  font-size: clamp(26px, 2vw, 34px);
  line-height: 1.02;
}

.banner-copy p,
.preview-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
  max-width: 420px;
}

.cta-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(98, 230, 255, 0.12);
  border: 1px solid rgba(98, 230, 255, 0.18);
  color: var(--text);
  font-size: 12px;
  font-weight: 800;
}

.banner-body {
  display: grid;
  gap: 10px;
}

.banner-body-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.banner-name {
  font-size: 18px;
}

.banner-meta-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.banner-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: var(--text-muted);
  font-size: 12px;
}

.banner-summary {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.banner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.shell-banner-modal {
  max-width: 1320px;
}

.banner-editor-layout {
  grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
  align-items: start;
}

.editor-main {
  display: grid;
  gap: 18px;
}

.banner-editor-simple {
  max-width: 920px;
}

.editor-section,
.editor-preview-shell {
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(15, 23, 33, 0.96), rgba(8, 14, 22, 0.98));
}

.section-head {
  display: grid;
  gap: 4px;
}

.section-head strong {
  font-size: 18px;
}

.section-kicker {
  color: var(--text-faint);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.field-grid {
  display: grid;
  gap: 16px;
}

.field-grid.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-grid.three-col {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.flow-switch-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.flow-card,
.mode-chip {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  cursor: pointer;
}

.flow-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  border-radius: 20px;
  text-align: left;
}

.flow-card p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.flow-card.active,
.mode-chip.active {
  border-color: rgba(98, 230, 255, 0.28);
  background: rgba(98, 230, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(98, 230, 255, 0.08);
}

.mode-switch {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
}

.mode-chip {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.upload-tile {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.upload-tile.required {
  border-color: rgba(98, 230, 255, 0.2);
}

.upload-tile-copy {
  display: grid;
  gap: 6px;
}

.upload-tile-copy strong {
  font-size: 17px;
}

.upload-tile-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.asset-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.asset-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.asset-card.required {
  border-color: rgba(98, 230, 255, 0.2);
}

.asset-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.asset-card-head span {
  color: var(--text-faint);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.asset-card-head strong {
  font-size: 12px;
  color: var(--text);
}

.asset-preview {
  min-height: 132px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  background: rgba(6, 12, 18, 0.76);
  overflow: hidden;
}

.asset-preview.wide {
  min-height: 160px;
}

.asset-preview.empty {
  color: var(--text-muted);
}

.asset-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.asset-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.asset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.audio-shell {
  min-height: 54px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(6, 12, 18, 0.66);
  color: var(--text-muted);
}

.audio-shell.ready {
  color: var(--text);
  border-color: rgba(98, 230, 255, 0.18);
}

.audio-player {
  width: 100%;
}

.selector-block {
  display: grid;
  gap: 12px;
}

.selector-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.selector-chips {
  grid-template-columns: repeat(auto-fit, minmax(140px, max-content));
}

.selector-chip,
.selector-pc,
.toggle-chip {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  font-weight: 700;
}

.selector-chip.active,
.selector-pc.active,
.toggle-chip.active {
  border-color: rgba(98, 230, 255, 0.24);
  background: rgba(98, 230, 255, 0.1);
}

.selector-pc-grid {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.selector-pc {
  min-height: 66px;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 4px;
}

.selector-pc span {
  color: var(--text-muted);
  font-size: 12px;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.panel-error {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
  line-height: 1.6;
}

.preview-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.note-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
  font-size: 12px;
}

.note-pill.required {
  border: 1px solid rgba(98, 230, 255, 0.18);
  color: var(--text);
}

.sr-only-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (max-width: 1160px) {
  .banner-editor-layout {
    grid-template-columns: 1fr;
  }

  .flow-switch-grid,
  .asset-grid,
  .field-grid.two-col,
  .field-grid.three-col {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .compact-filter-toolbar {
    grid-template-columns: 1fr;
  }

  .banner-body-top {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
