<template>
  <div class="install-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="hero-meta-badge">{{ copy.updatedAt }}: {{ refreshedAtLabel }}</span>
        <span class="hero-meta-badge">{{ copy.activeCodes }}: {{ activeCodeCount }}</span>
        <span class="hero-meta-badge">{{ copy.openBatches }}: {{ openBatchCount }}</span>
      </template>

      <template #actions>
        <div class="hero-actions">
          <button class="hero-btn" :disabled="loadingAll" @click="refreshAll">
            <Icon name="lucide:refresh-cw" size="15" />
            <span>{{ loadingAll ? copy.refreshing : copy.refreshAll }}</span>
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="stats-grid">
      <CpStatCard compact tone="tone-blue" :label="copy.quickCard" :value="String(codes.length)" :hint="copy.quickHint" />
      <CpStatCard compact tone="tone-green" :label="copy.rolloutCard" :value="String(batches.length)" :hint="copy.rolloutHint" />
      <CpStatCard compact tone="tone-amber" :label="copy.pcCard" :value="String(pcs.length)" :hint="copy.pcHint" />
      <CpStatCard compact tone="tone-rose" :label="copy.zoneCard" :value="String(zones.length)" :hint="copy.zoneHint" />
    </div>

    <div class="primary-grid">
      <CpPanelCard :title="copy.quickTitle" :subtitle="copy.quickSubtitle">
        <div class="form-grid two-up">
          <label class="field">
            <span>{{ copy.zone }}</span>
            <select v-model="quick.zone_id">
              <option value="">{{ copy.noZone }}</option>
              <option v-for="zone in zones" :key="`quick-zone-${zone.id}`" :value="String(zone.id)">{{ zone.name }}</option>
            </select>
          </label>

          <label class="field">
            <span>{{ copy.expires }}</span>
            <input v-model.number="quick.expires_in_min" type="number" min="1" max="120" />
          </label>
        </div>

        <div class="panel-inline-actions">
          <button class="hero-btn" :disabled="loading.quick" @click="makeQuick">
            <Icon name="lucide:key-round" size="15" />
            <span>{{ loading.quick ? copy.creating : copy.createCode }}</span>
          </button>
        </div>

        <p v-if="errors.quick" class="panel-error">{{ errors.quick }}</p>

        <div v-if="quickResult" class="result-card">
          <div class="result-top">
            <div>
              <span class="section-label">{{ copy.pairCode }}</span>
              <strong class="mono-line">{{ quickResult.pair_code }}</strong>
            </div>
            <span class="state-pill state-active">{{ stateLabel('active') }}</span>
          </div>

          <div class="result-meta">
            <div class="meta-card">
              <span>{{ copy.expiresAt }}</span>
              <strong>{{ fmtDate(quickResult.expires_at) }}</strong>
            </div>
            <div class="meta-card">
              <span>{{ copy.oneLiner }}</span>
              <strong>{{ copy.readyToCopy }}</strong>
            </div>
          </div>

          <div class="result-actions">
            <button class="subtle-btn" @click="copyText(quickResult.pair_code)">
              <Icon name="lucide:copy" size="14" />
              <span>{{ copy.copyCode }}</span>
            </button>
            <button class="subtle-btn" @click="copyText(quickResult.install_one_liner)">
              <Icon name="lucide:terminal" size="14" />
              <span>{{ copy.copyOneLiner }}</span>
            </button>
            <button class="subtle-btn" @click="openUrl(quickResult.installer_script_url)">
              <Icon name="lucide:download" size="14" />
              <span>{{ copy.downloadScript }}</span>
            </button>
            <button v-if="quickResult.gpo_one_liner" class="subtle-btn" @click="copyText(quickResult.gpo_one_liner)">
              <Icon name="lucide:building-2" size="14" />
              <span>{{ copy.copyGpo }}</span>
            </button>
          </div>
        </div>
      </CpPanelCard>

      <CpPanelCard :title="copy.bulkTitle" :subtitle="copy.bulkSubtitle">
        <div class="form-grid two-up">
          <label class="field">
            <span>{{ copy.bulkCount }}</span>
            <input v-model.number="bulk.count" type="number" min="1" max="300" />
          </label>

          <label class="field">
            <span>{{ copy.zone }}</span>
            <select v-model="bulk.zone_id">
              <option value="">{{ copy.noZone }}</option>
              <option v-for="zone in zones" :key="`bulk-zone-${zone.id}`" :value="String(zone.id)">{{ zone.name }}</option>
            </select>
          </label>

          <label class="field">
            <span>{{ copy.expires }}</span>
            <input v-model.number="bulk.expires_in_min" type="number" min="1" max="120" />
          </label>
        </div>

        <div class="panel-inline-actions">
          <button class="hero-btn" :disabled="loading.bulk" @click="makeBulk">
            <Icon name="lucide:layers-3" size="15" />
            <span>{{ loading.bulk ? copy.creating : copy.createBulk }}</span>
          </button>
        </div>

        <p v-if="errors.bulk" class="panel-error">{{ errors.bulk }}</p>

        <div v-if="bulkCodes.length" class="bulk-list">
          <article v-for="item in bulkCodes" :key="item.pair_code" class="bulk-card">
            <div>
              <span class="section-label">{{ copy.pairCode }}</span>
              <strong class="mono-line">{{ item.pair_code }}</strong>
            </div>
            <div class="bulk-actions">
              <button class="icon-btn" @click="copyText(item.pair_code)">
                <Icon name="lucide:copy" size="14" />
              </button>
              <button class="icon-btn" @click="copyText(oneLiner(item.pair_code))">
                <Icon name="lucide:terminal" size="14" />
              </button>
            </div>
          </article>
        </div>
      </CpPanelCard>
    </div>

    <CpPanelCard :title="copy.codesTitle" :subtitle="copy.codesSubtitle">
      <template #actions>
        <div class="toolbar">
          <label class="field-inline compact-field">
            <Icon name="lucide:filter" size="14" />
            <select v-model="pair.status" @change="loadCodes">
              <option value="active">{{ copy.active }}</option>
              <option value="used">{{ copy.used }}</option>
              <option value="expired">{{ copy.expired }}</option>
              <option value="all">{{ copy.all }}</option>
            </select>
          </label>

          <button class="subtle-btn" :disabled="loading.codes" @click="loadCodes">
            <Icon name="lucide:refresh-cw" size="14" />
            <span>{{ copy.refresh }}</span>
          </button>
        </div>
      </template>

      <p v-if="errors.codes" class="panel-error">{{ errors.codes }}</p>

      <div v-if="!codes.length" class="empty-state">{{ copy.empty }}</div>

      <div v-else class="list-grid">
        <article v-for="row in codes" :key="row.code" class="code-card">
          <div class="code-top">
            <div>
              <span class="section-label">{{ copy.pairCode }}</span>
              <strong class="mono-line">{{ row.code }}</strong>
            </div>
            <span class="state-pill" :class="`state-${row.state}`">{{ stateLabel(row.state) }}</span>
          </div>

          <div class="code-meta">
            <div class="meta-card">
              <span>{{ copy.expiresAt }}</span>
              <strong>{{ fmtDate(row.expires_at) }}</strong>
            </div>
            <div class="meta-card">
              <span>{{ copy.script }}</span>
              <strong>{{ copy.readyToCopy }}</strong>
            </div>
          </div>

          <div class="result-actions">
            <button class="subtle-btn" @click="copyText(oneLiner(row.code))">
              <Icon name="lucide:terminal" size="14" />
              <span>{{ copy.oneLiner }}</span>
            </button>
            <button class="subtle-btn" @click="copyText(scriptUrl(row.code))">
              <Icon name="lucide:download" size="14" />
              <span>{{ copy.script }}</span>
            </button>
            <button class="subtle-btn danger" :disabled="row.state !== 'active'" @click="revoke(row.code)">
              <Icon name="lucide:ban" size="14" />
              <span>{{ copy.revoke }}</span>
            </button>
          </div>
        </article>
      </div>
    </CpPanelCard>

    <div class="primary-grid">
      <CpPanelCard :title="copy.rolloutTitle" :subtitle="copy.rolloutSubtitle">
        <div class="form-grid two-up">
          <label class="field">
            <span>{{ copy.commandType }}</span>
            <select v-model="rollout.type">
              <option v-for="type in commandTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>

          <label class="field">
            <span>{{ copy.targetMode }}</span>
            <select v-model="rollout.target_mode">
              <option value="all">{{ copy.modeAll }}</option>
              <option value="online">{{ copy.modeOnline }}</option>
              <option value="zone">{{ copy.modeZone }}</option>
              <option value="selected">{{ copy.modeSelected }}</option>
            </select>
          </label>

          <label v-if="rollout.target_mode === 'zone'" class="field">
            <span>{{ copy.zone }}</span>
            <select v-model="rollout.zone_id">
              <option value="">{{ copy.selectOne }}</option>
              <option v-for="zone in zones" :key="`rollout-zone-${zone.id}`" :value="String(zone.id)">{{ zone.name }}</option>
            </select>
          </label>

          <label v-if="rollout.target_mode === 'selected'" class="field field-span">
            <span>{{ copy.pcSearch }}</span>
            <input v-model.trim="pcSearch" type="text" :placeholder="copy.pcSearchPlaceholder" />
          </label>
        </div>

        <div v-if="rollout.target_mode === 'selected'" class="picker-card">
          <div class="picker-head">
            <div>
              <span class="section-label">{{ copy.pcSelect }}</span>
              <strong>{{ selectedCountLabel }}</strong>
            </div>
            <div class="bulk-actions">
              <button class="subtle-btn" @click="selectAllVisiblePcs">
                <Icon name="lucide:check-check" size="14" />
                <span>{{ copy.pickAll }}</span>
              </button>
              <button class="subtle-btn" @click="clearSelectedPcs">
                <Icon name="lucide:x" size="14" />
                <span>{{ copy.clearSelected }}</span>
              </button>
            </div>
          </div>

          <div v-if="filteredPcs.length" class="pc-grid">
            <button
              v-for="pc in filteredPcs.slice(0, 120)"
              :key="pc.id"
              type="button"
              class="pc-card"
              :class="{ selected: rollout.selected_pc_ids.includes(String(pc.id)) }"
              @click="togglePc(pc.id)"
            >
              <span class="pc-code">{{ pc.code }}</span>
              <span class="pc-meta">{{ pc.zone || '-' }}</span>
              <span class="pc-state">{{ pc.status || '-' }}</span>
            </button>
          </div>

          <div v-else class="empty-state compact-empty">{{ copy.noPcs }}</div>
        </div>

        <div class="check-grid">
          <label class="check-pill">
            <input v-model="rollout.only_online" type="checkbox" />
            <span>{{ copy.onlyOnline }}</span>
          </label>
          <label class="check-pill">
            <input v-model="rollout.dry_run" type="checkbox" />
            <span>{{ copy.dryRun }}</span>
          </label>
        </div>

        <label class="field">
          <span>{{ copy.payload }}</span>
          <textarea v-model="rollout.payload_text" rows="8"></textarea>
        </label>

        <div class="payload-preview">
          <div class="meta-card">
            <span>{{ copy.targetPreview }}</span>
            <strong>{{ rolloutTargetPreview }}</strong>
          </div>
          <div class="meta-card">
            <span>{{ copy.payloadStatus }}</span>
            <strong>{{ payloadStatus }}</strong>
          </div>
        </div>

        <div class="result-actions">
          <button class="hero-btn" :disabled="loading.rollout" @click="sendRollout">
            <Icon name="lucide:send" size="15" />
            <span>{{ loading.rollout ? copy.sending : copy.sendRollout }}</span>
          </button>

          <button
            v-if="rollout.target_mode === 'selected' && rollout.selected_pc_ids.length === 1"
            class="subtle-btn"
            :disabled="loading.rollout"
            @click="sendSinglePcUpdate"
          >
            <Icon name="lucide:zap" size="14" />
            <span>{{ copy.singleUpdate }}</span>
          </button>
        </div>

        <p v-if="errors.rollout" class="panel-error">{{ errors.rollout }}</p>

        <div v-if="rolloutResult" class="result-card">
          <div class="result-top">
            <div>
              <span class="section-label">{{ copy.batchId }}</span>
              <strong class="mono-line">{{ shortId(rolloutResult.batch_id) }}</strong>
            </div>
            <span class="state-pill state-active">{{ copy.created }}</span>
          </div>
        </div>
      </CpPanelCard>

      <CpPanelCard :title="copy.batchTitle" :subtitle="copy.batchSubtitle">
        <template #actions>
          <div class="toolbar">
            <button class="subtle-btn" :disabled="loading.batches" @click="loadBatches">
              <Icon name="lucide:refresh-cw" size="14" />
              <span>{{ copy.refresh }}</span>
            </button>
          </div>
        </template>

        <p v-if="errors.batches" class="panel-error">{{ errors.batches }}</p>

        <div v-if="!batchItems.length" class="empty-state">{{ copy.empty }}</div>

        <div v-else class="batch-list">
          <button
            v-for="row in batchItems"
            :key="row.batch_id"
            type="button"
            class="batch-card"
            :class="{ active: selectedBatchId === String(row.batch_id) }"
            @click="openBatch(row.batch_id)"
          >
            <div class="batch-head">
              <strong class="mono-line">{{ shortId(row.batch_id) }}</strong>
              <span class="state-pill">{{ row.type }}</span>
            </div>
            <div class="batch-progress">
              <span>{{ row.done }}/{{ row.total }}</span>
              <span>{{ copy.failed }}: {{ row.failed }}</span>
            </div>
          </button>
        </div>

        <div v-if="batchDetail" class="detail-card">
          <div class="picker-head">
            <div>
              <span class="section-label">{{ copy.batchDetail }}</span>
              <strong class="mono-line">{{ shortId(batchDetail.batch_id) }}</strong>
            </div>
            <button class="subtle-btn danger" :disabled="loading.retry" @click="retryFailed">
              <Icon name="lucide:rotate-ccw" size="14" />
              <span>{{ copy.retryFailed }}</span>
            </button>
          </div>

          <div class="detail-list">
            <article v-for="item in batchDetail.items || []" :key="item.id" class="detail-row">
              <div>
                <strong>{{ item.pc_code || `#${item.pc_id}` }}</strong>
                <small>{{ item.error || copy.noError }}</small>
              </div>
              <span class="state-pill" :class="`state-${item.status}`">{{ item.status }}</span>
            </article>
          </div>
        </div>
      </CpPanelCard>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpFormatters } from '../../../composables/useCpFormatters'

definePageMeta({
  layout: 'cp',
})

const messages = {
  uz: {
    eyebrow: 'INSTALL WORKSPACE',
    title: 'Install center',
    subtitle: 'Agent ulash, pair code berish va rollout batchlarni bitta ish maydonida boshqaring.',
    updatedAt: 'Yangilandi',
    activeCodes: 'Faol kodlar',
    openBatches: 'Batchlar',
    refreshAll: 'Hammasini yangilash',
    refreshing: 'Yangilanmoqda',
    quickCard: 'Quick connect',
    quickHint: 'Bir martalik pair code',
    rolloutCard: 'Rollout batch',
    rolloutHint: 'Yuborilgan komandalar',
    pcCard: 'PC bazasi',
    pcHint: 'Tanlash uchun tayyor',
    zoneCard: 'Zonalar',
    zoneHint: 'Deploy targetlar',
    quickTitle: 'Tez ulash (1 PC)',
    quickSubtitle: 'Yangi agent uchun tez pair code yarating.',
    bulkTitle: 'Bulk ulash',
    bulkSubtitle: 'Bir nechta PC uchun kodlar toplamini tayyorlang.',
    zone: 'Zona',
    noZone: 'Zonasiz',
    expires: 'Amal qilish vaqti (min)',
    creating: 'Yaratilmoqda',
    createCode: 'Kod yaratish',
    createBulk: 'Bulk kodlar yaratish',
    pairCode: 'Pair code',
    expiresAt: 'Tugash vaqti',
    oneLiner: 'One-liner',
    readyToCopy: 'Nusxalashga tayyor',
    copyCode: 'Koddan nusxa olish',
    copyOneLiner: 'One-liner nusxa',
    downloadScript: 'Script yuklash',
    copyGpo: 'GPO nusxa',
    bulkCount: 'Soni',
    codesTitle: 'Pair kodlar',
    codesSubtitle: 'Aktiv, ishlatilgan va eskirgan kodlarni kuzating.',
    active: 'Faol',
    used: 'Ishlatilgan',
    expired: 'Eskirgan',
    all: 'Hammasi',
    refresh: 'Yangilash',
    empty: 'Maʼlumot topilmadi.',
    script: 'Script',
    revoke: 'Bekor qilish',
    rolloutTitle: 'Rollout boshqaruvi',
    rolloutSubtitle: 'Shell update, command va targeted rolloutlarni yuboring.',
    commandType: 'Komanda turi',
    targetMode: 'Target rejimi',
    modeAll: 'Hammasi',
    modeOnline: 'Faqat online',
    modeZone: 'Zona bo‘yicha',
    modeSelected: 'Tanlangan PC',
    selectOne: 'Tanlang',
    pcSearch: 'PC qidiruvi',
    pcSearchPlaceholder: 'Kod, zona yoki status bo‘yicha qidiring',
    pcSelect: 'PC tanlash',
    pickAll: 'Ko‘rinayotganlarni tanlash',
    clearSelected: 'Tozalash',
    noPcs: 'Mos PC topilmadi.',
    onlyOnline: 'Faqat online PC',
    dryRun: 'Dry run',
    payload: 'Payload (JSON)',
    targetPreview: 'Target preview',
    payloadStatus: 'Payload holati',
    sending: 'Yuborilmoqda',
    sendRollout: 'Rollout yuborish',
    singleUpdate: 'Bitta PC ni darhol update qilish',
    batchId: 'Batch ID',
    created: 'Yaratildi',
    batchTitle: 'Batch monitoring',
    batchSubtitle: 'Yuborilgan batchlar va natijalarni tez tekshiring.',
    failed: 'Xato',
    batchDetail: 'Batch detail',
    retryFailed: 'Xatolarni qayta yuborish',
    noError: 'Xato yo‘q',
    copied: 'Nusxa olindi',
    actionError: 'Amal bajarilmadi',
    createdToast: 'Kod yaratildi',
    bulkToast: 'Bulk kodlar yaratildi',
    revokedToast: 'Kod bekor qilindi',
    rolloutToast: 'Rollout yuborildi',
    retriedToast: 'Xatolar qayta yuborildi',
    selectAtLeastOne: 'Kamida bitta PC tanlang.',
    selectExactlyOne: 'Bitta PC tanlang.',
  },
  ru: {
    eyebrow: 'INSTALL WORKSPACE',
    title: 'Install center',
    subtitle: 'Подключайте агент, выдавайте pair code и управляйте rollout batch в одном окне.',
    updatedAt: 'Обновлено',
    activeCodes: 'Активные коды',
    openBatches: 'Batch',
    refreshAll: 'Обновить все',
    refreshing: 'Обновление',
    quickCard: 'Quick connect',
    quickHint: 'Одноразовый pair code',
    rolloutCard: 'Rollout batch',
    rolloutHint: 'Отправленные команды',
    pcCard: 'База ПК',
    pcHint: 'Готово к выбору',
    zoneCard: 'Зоны',
    zoneHint: 'Точки rollout',
    quickTitle: 'Быстрое подключение',
    quickSubtitle: 'Создайте код для одного нового ПК.',
    bulkTitle: 'Массовое подключение',
    bulkSubtitle: 'Сделайте набор кодов для нескольких машин.',
    zone: 'Зона',
    noZone: 'Без зоны',
    expires: 'Срок (мин)',
    creating: 'Создание',
    createCode: 'Создать код',
    createBulk: 'Создать bulk коды',
    pairCode: 'Pair code',
    expiresAt: 'Действует до',
    oneLiner: 'One-liner',
    readyToCopy: 'Готово к копированию',
    copyCode: 'Копировать код',
    copyOneLiner: 'Копировать one-liner',
    downloadScript: 'Скачать script',
    copyGpo: 'Копировать GPO',
    bulkCount: 'Количество',
    codesTitle: 'Pair коды',
    codesSubtitle: 'Следите за активными, использованными и истекшими кодами.',
    active: 'Активные',
    used: 'Использованные',
    expired: 'Истекшие',
    all: 'Все',
    refresh: 'Обновить',
    empty: 'Нет данных.',
    script: 'Script',
    revoke: 'Отозвать',
    rolloutTitle: 'Rollout',
    rolloutSubtitle: 'Отправляйте shell update и targeted команды без legacy-потока.',
    commandType: 'Тип команды',
    targetMode: 'Режим цели',
    modeAll: 'Все ПК',
    modeOnline: 'Только online',
    modeZone: 'По зоне',
    modeSelected: 'Выбранные ПК',
    selectOne: 'Выберите',
    pcSearch: 'Поиск ПК',
    pcSearchPlaceholder: 'Код, зона или статус',
    pcSelect: 'Список ПК',
    pickAll: 'Выбрать все',
    clearSelected: 'Очистить',
    noPcs: 'Подходящие ПК не найдены.',
    onlyOnline: 'Только online ПК',
    dryRun: 'Dry run',
    payload: 'Payload (JSON)',
    targetPreview: 'Цель',
    payloadStatus: 'Payload',
    sending: 'Отправка',
    sendRollout: 'Отправить rollout',
    singleUpdate: 'Сразу обновить один ПК',
    batchId: 'Batch ID',
    created: 'Создано',
    batchTitle: 'Мониторинг batch',
    batchSubtitle: 'Проверяйте отправленные batch и проблемные ПК.',
    failed: 'Ошибки',
    batchDetail: 'Детали batch',
    retryFailed: 'Повторить failed',
    noError: 'Без ошибок',
    copied: 'Скопировано',
    actionError: 'Операция не выполнена',
    createdToast: 'Код создан',
    bulkToast: 'Bulk коды созданы',
    revokedToast: 'Код отозван',
    rolloutToast: 'Rollout отправлен',
    retriedToast: 'Ошибки отправлены повторно',
    selectAtLeastOne: 'Выберите хотя бы один ПК.',
    selectExactlyOne: 'Выберите ровно один ПК.',
  },
  en: {
    eyebrow: 'INSTALL WORKSPACE',
    title: 'Install center',
    subtitle: 'Handle agent pairing, quick setup and rollout batches in one focused workspace.',
    updatedAt: 'Updated',
    activeCodes: 'Active codes',
    openBatches: 'Open batches',
    refreshAll: 'Refresh all',
    refreshing: 'Refreshing',
    quickCard: 'Quick connect',
    quickHint: 'Single-use pair code',
    rolloutCard: 'Rollout batch',
    rolloutHint: 'Queued commands',
    pcCard: 'PC inventory',
    pcHint: 'Ready for targeting',
    zoneCard: 'Zones',
    zoneHint: 'Deployment scopes',
    quickTitle: 'Quick pairing',
    quickSubtitle: 'Create a short-lived code for one new PC.',
    bulkTitle: 'Bulk pairing',
    bulkSubtitle: 'Prepare a set of codes for a rollout batch.',
    zone: 'Zone',
    noZone: 'No zone',
    expires: 'Expires in (min)',
    creating: 'Creating',
    createCode: 'Create code',
    createBulk: 'Create bulk codes',
    pairCode: 'Pair code',
    expiresAt: 'Expires at',
    oneLiner: 'One-liner',
    readyToCopy: 'Ready to copy',
    copyCode: 'Copy code',
    copyOneLiner: 'Copy one-liner',
    downloadScript: 'Download script',
    copyGpo: 'Copy GPO',
    bulkCount: 'Count',
    codesTitle: 'Pair codes',
    codesSubtitle: 'Track active, used and expired pairing codes.',
    active: 'Active',
    used: 'Used',
    expired: 'Expired',
    all: 'All',
    refresh: 'Refresh',
    empty: 'No data yet.',
    script: 'Script',
    revoke: 'Revoke',
    rolloutTitle: 'Rollout workspace',
    rolloutSubtitle: 'Send shell updates and targeted commands without the old legacy flow.',
    commandType: 'Command type',
    targetMode: 'Target mode',
    modeAll: 'All PCs',
    modeOnline: 'Only online',
    modeZone: 'By zone',
    modeSelected: 'Selected PCs',
    selectOne: 'Select one',
    pcSearch: 'Search PCs',
    pcSearchPlaceholder: 'Search by code, zone or status',
    pcSelect: 'PC selection',
    pickAll: 'Select all visible',
    clearSelected: 'Clear',
    noPcs: 'No matching PCs.',
    onlyOnline: 'Only online PCs',
    dryRun: 'Dry run',
    payload: 'Payload (JSON)',
    targetPreview: 'Target preview',
    payloadStatus: 'Payload status',
    sending: 'Sending',
    sendRollout: 'Send rollout',
    singleUpdate: 'Update single PC now',
    batchId: 'Batch ID',
    created: 'Created',
    batchTitle: 'Batch monitoring',
    batchSubtitle: 'Review sent batches and quickly reopen problem details.',
    failed: 'Failed',
    batchDetail: 'Batch detail',
    retryFailed: 'Retry failed',
    noError: 'No error',
    copied: 'Copied',
    actionError: 'Action failed',
    createdToast: 'Code created',
    bulkToast: 'Bulk codes created',
    revokedToast: 'Code revoked',
    rolloutToast: 'Rollout sent',
    retriedToast: 'Failed PCs retried',
    selectAtLeastOne: 'Select at least one PC.',
    selectExactlyOne: 'Select exactly one PC.',
  },
}

const copy = useCpCopy(messages)
const { formatDateTime } = useCpFormatters()

useHead({
  title: computed(() => `${copy.value.title} - NEXORA CLOUD CP`),
})

const zones = ref<any[]>([])
const pcs = ref<any[]>([])
const codes = ref<any[]>([])
const batches = ref<any[]>([])
const batchDetail = ref<any | null>(null)
const quickResult = ref<any | null>(null)
const bulkResult = ref<any | null>(null)
const rolloutResult = ref<any | null>(null)
const selectedBatchId = ref('')
const refreshedAt = ref<string | null>(null)
const toast = ref('')
const pcSearch = ref('')

const loading = reactive({
  all: false,
  quick: false,
  bulk: false,
  codes: false,
  rollout: false,
  batches: false,
  retry: false,
})

const errors = reactive({
  quick: '',
  bulk: '',
  codes: '',
  rollout: '',
  batches: '',
})

const quick = reactive({
  zone_id: '',
  expires_in_min: 10,
})

const bulk = reactive({
  count: 20,
  zone_id: '',
  expires_in_min: 30,
})

const pair = reactive({
  status: 'active',
  limit: 60,
})

const rollout = reactive({
  type: 'UPDATE_SHELL',
  target_mode: 'online',
  zone_id: '',
  selected_pc_ids: [] as string[],
  only_online: true,
  dry_run: false,
  payload_text: '{\n  "version":"1.0.0",\n  "download_url":"https://cdn.example.com/shell.zip",\n  "sha256":""\n}',
})

const commandTypes = ['UPDATE_SHELL', 'INSTALL_GAME', 'UPDATE_GAME', 'ROLLBACK_GAME', 'RUN_SCRIPT', 'MESSAGE', 'REBOOT', 'SHUTDOWN', 'LOCK', 'UNLOCK']

function showToast(message: string) {
  toast.value = message
  window.setTimeout(() => {
    if (toast.value === message) toast.value = ''
  }, 2200)
}

function fmtDate(value: unknown) {
  return formatDateTime(value as string)
}

function shortId(value: unknown) {
  const text = String(value || '')
  return text.length > 18 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text
}

function scriptUrl(code: string) {
  return `/api/deployment/quick-install/${encodeURIComponent(code)}/script.ps1`
}

function oneLiner(code: string) {
  return `powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -UseBasicParsing -Uri '${window.location.origin}${scriptUrl(code)}' | iex"`
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(String(text || ''))
    showToast(copy.value.copied)
  } catch {
    showToast(copy.value.actionError)
  }
}

function openUrl(url: string) {
  window.open(String(url || ''), '_blank', 'noopener,noreferrer')
}

function errMsg(error: any) {
  const first = error?.response?.data?.errors ? Object.values(error.response.data.errors).flat()[0] : null
  return String(first || error?.response?.data?.message || copy.value.actionError)
}

function parseRows(payload: any) {
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload)) return payload
  return []
}

function stateLabel(state: string) {
  const map: Record<string, string> = {
    active: copy.value.active,
    used: copy.value.used,
    expired: copy.value.expired,
    sent: copy.value.created,
    done: copy.value.created,
    failed: copy.value.failed,
  }
  return map[String(state || '').toLowerCase()] || String(state || '-')
}

function togglePc(pcId: number) {
  const key = String(pcId)
  if (rollout.selected_pc_ids.includes(key)) {
    rollout.selected_pc_ids = rollout.selected_pc_ids.filter((item) => item !== key)
    return
  }
  rollout.selected_pc_ids = [...rollout.selected_pc_ids, key]
}

const loadingAll = computed(() => Object.values(loading).some(Boolean))
const refreshedAtLabel = computed(() => (refreshedAt.value ? fmtDate(refreshedAt.value) : '-'))
const activeCodeCount = computed(() => codes.value.filter((row) => row.state === 'active').length)
const openBatchCount = computed(() => batches.value.filter((row) => Number(row.failed || 0) > 0 || Number(row.done || 0) < Number(row.total || 0)).length)
const bulkCodes = computed(() => (Array.isArray(bulkResult.value?.codes) ? bulkResult.value.codes.slice(0, 12) : []))
const batchItems = computed(() => batches.value.slice(0, 12))
const filteredPcs = computed(() => {
  const query = pcSearch.value.trim().toLowerCase()
  if (!query) return pcs.value
  return pcs.value.filter((pc) => `${pc.code} ${pc.zone} ${pc.status}`.toLowerCase().includes(query))
})
const selectedCountLabel = computed(() => `${rollout.selected_pc_ids.length} / ${filteredPcs.value.length || pcs.value.length}`)
const singleSelectedPcLabel = computed(() => {
  if (rollout.selected_pc_ids.length !== 1) return '-'
  const target = pcs.value.find((item) => String(item.id) === rollout.selected_pc_ids[0])
  return target ? `${target.code} (${target.zone || '-'})` : rollout.selected_pc_ids[0]
})
const rolloutTargetPreview = computed(() => {
  if (rollout.target_mode === 'zone') {
    const zone = zones.value.find((item) => String(item.id) === rollout.zone_id)
    return zone?.name || copy.value.selectOne
  }
  if (rollout.target_mode === 'selected') {
    return rollout.selected_pc_ids.length ? singleSelectedPcLabel.value : copy.value.selectAtLeastOne
  }
  if (rollout.target_mode === 'online') return copy.value.modeOnline
  return copy.value.modeAll
})
const payloadStatus = computed(() => {
  try {
    JSON.parse(String(rollout.payload_text || '{}'))
    return 'JSON OK'
  } catch {
    return 'JSON error'
  }
})

function selectAllVisiblePcs() {
  rollout.selected_pc_ids = filteredPcs.value.slice(0, 120).map((pc) => String(pc.id))
}

function clearSelectedPcs() {
  rollout.selected_pc_ids = []
}

async function loadZones() {
  try {
    const { data } = await cpApi.zoneList({ page: 1, per_page: 500 })
    const rows = Array.isArray(data?.data?.data) ? data.data.data : Array.isArray(data?.data) ? data.data : []
    zones.value = rows.map((row: any) => ({ id: Number(row.id), name: String(row.name || '-') }))
  } catch {
    zones.value = []
  }
}

async function loadPcs() {
  try {
    const { data } = await cpApi.pcs({ page: 1, per_page: 1000 })
    pcs.value = parseRows(data)
      .map((row: any) => ({
        id: Number(row?.id || 0),
        code: String(row?.code || row?.name || '-'),
        zone: String(row?.zone || row?.zone_name || '-'),
        status: String(row?.status || '-'),
      }))
      .filter((row: any) => row.id > 0)
  } catch {
    pcs.value = []
  }
}

async function makeQuick() {
  loading.quick = true
  errors.quick = ''
  try {
    const payload: Record<string, any> = {
      expires_in_min: Math.max(1, Math.min(120, Number(quick.expires_in_min || 10))),
    }
    if (quick.zone_id) payload.zone_id = Number(quick.zone_id)
    const { data } = await cpApi.deploymentQuickInstall(payload)
    quickResult.value = data?.data || null
    showToast(copy.value.createdToast)
    await loadCodes()
  } catch (error) {
    errors.quick = errMsg(error)
  } finally {
    loading.quick = false
  }
}

async function makeBulk() {
  loading.bulk = true
  errors.bulk = ''
  try {
    const payload: Record<string, any> = {
      count: Math.max(1, Math.min(300, Number(bulk.count || 1))),
      expires_in_min: Math.max(1, Math.min(120, Number(bulk.expires_in_min || 30))),
    }
    if (bulk.zone_id) payload.zone_id = Number(bulk.zone_id)
    const { data } = await cpApi.deploymentQuickInstallBulk(payload)
    bulkResult.value = data?.data || null
    showToast(copy.value.bulkToast)
    await loadCodes()
  } catch (error) {
    errors.bulk = errMsg(error)
  } finally {
    loading.bulk = false
  }
}

async function loadCodes() {
  loading.codes = true
  errors.codes = ''
  try {
    const { data } = await cpApi.deploymentPairCodes({ status: pair.status, limit: pair.limit })
    codes.value = Array.isArray(data?.data) ? data.data : []
  } catch (error) {
    errors.codes = errMsg(error)
  } finally {
    loading.codes = false
  }
}

async function revoke(code: string) {
  try {
    await cpApi.deploymentRevokePairCode(code)
    showToast(copy.value.revokedToast)
    await loadCodes()
  } catch (error) {
    errors.codes = errMsg(error)
  }
}

async function sendRollout() {
  loading.rollout = true
  errors.rollout = ''
  rolloutResult.value = null
  try {
    const request: Record<string, any> = {
      type: rollout.type,
      target_mode: rollout.target_mode,
      only_online: Boolean(rollout.only_online),
      dry_run: Boolean(rollout.dry_run),
    }
    const payload = JSON.parse(String(rollout.payload_text || '{}'))
    if (payload && Object.keys(payload).length) request.payload = payload
    if (rollout.target_mode === 'zone') request.zone_id = Number(rollout.zone_id)
    if (rollout.target_mode === 'selected') {
      request.pc_ids = rollout.selected_pc_ids.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
      if (!request.pc_ids.length) throw new Error(copy.value.selectAtLeastOne)
    }
    const { data } = await cpApi.deploymentRollout(request)
    rolloutResult.value = data?.data || null
    showToast(copy.value.rolloutToast)
    await loadBatches()
  } catch (error) {
    errors.rollout = errMsg(error)
  } finally {
    loading.rollout = false
  }
}

async function sendSinglePcUpdate() {
  if (rollout.selected_pc_ids.length !== 1) {
    errors.rollout = copy.value.selectExactlyOne
    return
  }
  const prevType = rollout.type
  const prevMode = rollout.target_mode
  const prevOnline = rollout.only_online
  try {
    rollout.type = 'UPDATE_SHELL'
    rollout.target_mode = 'selected'
    rollout.only_online = false
    await sendRollout()
  } finally {
    rollout.type = prevType
    rollout.target_mode = prevMode
    rollout.only_online = prevOnline
  }
}

async function loadBatches() {
  loading.batches = true
  errors.batches = ''
  try {
    const { data } = await cpApi.deploymentBatches({ limit: 30 })
    batches.value = Array.isArray(data?.data) ? data.data : []
    if (selectedBatchId.value) await openBatch(selectedBatchId.value)
  } catch (error) {
    errors.batches = errMsg(error)
  } finally {
    loading.batches = false
  }
}

async function openBatch(batchId: string) {
  selectedBatchId.value = String(batchId || '')
  const { data } = await cpApi.deploymentBatchStatus(selectedBatchId.value)
  batchDetail.value = data?.data || null
}

async function retryFailed() {
  if (!selectedBatchId.value) return
  loading.retry = true
  try {
    const { data } = await cpApi.deploymentRetryFailed(selectedBatchId.value)
    const nextId = data?.data?.new_batch_id || ''
    showToast(copy.value.retriedToast)
    await loadBatches()
    if (nextId) await openBatch(nextId)
  } catch (error) {
    errors.batches = errMsg(error)
  } finally {
    loading.retry = false
  }
}

async function refreshAll() {
  loading.all = true
  try {
    await Promise.all([loadZones(), loadPcs(), loadCodes(), loadBatches()])
    refreshedAt.value = new Date().toISOString()
  } finally {
    loading.all = false
  }
}

onMounted(refreshAll)
</script>

<style scoped>
.install-page,
.stats-grid,
.primary-grid,
.hero-actions,
.toolbar,
.result-actions,
.bulk-actions,
.panel-inline-actions,
.code-meta,
.result-meta,
.check-grid,
.batch-list,
.detail-list {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.primary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
}

.primary-grid :deep(.panel-card) {
  height: 100%;
}

.primary-grid :deep(.panel-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hero-actions,
.toolbar,
.panel-inline-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.panel-inline-actions {
  margin-top: 12px;
}

.form-grid {
  display: grid;
  gap: 14px;
}

.two-up {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field,
.field-inline {
  display: grid;
  gap: 8px;
}

.field-span {
  grid-column: 1 / -1;
}

.field span,
.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.field select,
.field input,
.field textarea,
.field-inline select {
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  outline: 0;
  font-size: 13px;
}

.field textarea {
  min-height: 170px;
  padding: 14px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  line-height: 1.55;
}

.field-inline {
  grid-auto-flow: column;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.field-inline select {
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
}

.compact-field {
  min-width: 156px;
}

.hero-btn,
.subtle-btn,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(79, 140, 255, 0.24);
  background: linear-gradient(180deg, rgba(79, 140, 255, 0.15), rgba(79, 209, 197, 0.1));
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.hero-btn:hover,
.subtle-btn:hover,
.icon-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(79, 140, 255, 0.38);
}

.subtle-btn {
  min-height: 36px;
  padding: 0 12px;
  border-color: var(--stroke);
  background: var(--surface-soft);
  font-weight: 600;
}

.subtle-btn.danger {
  border-color: rgba(251, 113, 133, 0.28);
  color: var(--danger);
}

.icon-btn {
  min-width: 36px;
  min-height: 36px;
  padding: 0;
  background: var(--surface-soft);
  border-color: var(--stroke);
}

.result-card,
.detail-card,
.picker-card {
  display: grid;
  gap: 14px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.result-top,
.code-top,
.picker-head,
.batch-head,
.batch-progress {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mono-line {
  display: block;
  margin-top: 6px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 14px;
  line-height: 1.4;
}

.result-meta,
.code-meta,
.payload-preview {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

.meta-card {
  display: grid;
  gap: 8px;
  min-height: 72px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.02);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.meta-card span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.meta-card strong {
  font-size: 13px;
  line-height: 1.45;
}

.bulk-list,
.list-grid {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.bulk-list {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.bulk-card,
.code-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.state-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.04);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

.state-active,
.state-used,
.state-sent,
.state-done {
  border-color: rgba(52, 211, 153, 0.28);
  color: var(--success);
}

.state-expired,
.state-failed {
  border-color: rgba(251, 113, 133, 0.28);
  color: var(--danger);
}

.pc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 10px;
  max-height: 340px;
  overflow: auto;
}

.pc-card {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.02);
  text-align: left;
  cursor: pointer;
}

.pc-card.selected {
  border-color: rgba(79, 140, 255, 0.34);
  background: rgba(79, 140, 255, 0.14);
}

.pc-code {
  font-size: 13px;
  font-weight: 800;
}

.pc-meta,
.pc-state {
  font-size: 12px;
  color: var(--text-muted);
}

.check-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 6px 0 10px;
}

.check-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  font-size: 12px;
  color: var(--text-muted);
}

.field + .check-grid,
.check-grid + .field,
.field + .payload-preview,
.payload-preview + .result-actions,
.check-grid + .result-actions {
  margin-top: 8px;
}

.payload-preview {
  margin-top: 14px;
}

.result-actions {
  margin-top: 14px;
}

.batch-list {
  margin-top: 8px;
}

.batch-card,
.detail-row {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  text-align: left;
}

.batch-card.active {
  border-color: rgba(79, 140, 255, 0.34);
}

.detail-list {
  gap: 10px;
}

.detail-row {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.detail-row small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 140px;
  border-radius: 18px;
  border: 1px dashed var(--stroke);
  background: var(--surface-soft);
  font-size: 13px;
  color: var(--text-muted);
}

.compact-empty {
  min-height: 100px;
}

.panel-error {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--danger);
}

.toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 30;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(79, 140, 255, 0.32);
  background: rgba(7, 13, 26, 0.92);
  color: white;
  box-shadow: var(--shadow-panel);
  font-size: 12px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 1200px) {
  .stats-grid,
  .primary-grid,
  .two-up,
  .result-meta,
  .code-meta,
  .payload-preview {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 900px) {
  .stats-grid,
  .primary-grid,
  .two-up,
  .result-meta,
  .code-meta,
  .payload-preview {
    grid-template-columns: 1fr;
  }

  .hero-actions,
  .toolbar,
  .panel-inline-actions {
    justify-content: stretch;
    flex-wrap: wrap;
  }
}
</style>
