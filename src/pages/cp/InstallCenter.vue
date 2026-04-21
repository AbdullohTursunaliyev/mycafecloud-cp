<template>
  <div class="install-page">
    <section class="hero card-flat">
      <div>
        <h1>{{ t('installCenter.title') }}</h1>
        <p>{{ t('installCenter.subtitle') }}</p>
      </div>
      <button class="btn ghost" :disabled="loading.all" @click="refreshAll">
        {{ loading.all ? t('installCenter.loading') : t('installCenter.refreshAll') }}
      </button>
    </section>

    <section class="grid two">
      <article class="card-flat panel">
        <h2>{{ t('installCenter.quick.title') }}</h2>
        <div class="form-grid">
          <label class="field">
            <span>{{ t('installCenter.quick.zone') }}</span>
            <select v-model="quick.zone_id" class="input">
              <option value="">{{ t('installCenter.common.noZone') }}</option>
              <option v-for="z in zones" :key="z.id" :value="String(z.id)">{{ z.name }}</option>
            </select>
          </label>
          <label class="field">
            <span>{{ t('installCenter.quick.expires') }}</span>
            <input v-model.number="quick.expires_in_min" class="input" type="number" min="1" max="120" />
          </label>
        </div>
        <div class="actions">
          <button class="btn primary" :disabled="loading.quick" @click="makeQuick">
            {{ loading.quick ? t('installCenter.loading') : t('installCenter.quick.create') }}
          </button>
        </div>
        <p v-if="errors.quick" class="err">{{ errors.quick }}</p>

        <div v-if="quickResult" class="result">
          <div class="kv"><span>{{ t('installCenter.quick.code') }}</span><b class="mono">{{ quickResult.pair_code }}</b></div>
          <div class="kv"><span>{{ t('installCenter.quick.expiresAt') }}</span><b>{{ fmtDate(quickResult.expires_at) }}</b></div>
          <div class="actions wrap">
            <button class="mini" @click="copy(quickResult.pair_code)">{{ t('installCenter.common.copyCode') }}</button>
            <button class="mini" @click="copy(quickResult.install_one_liner)">{{ t('installCenter.common.copyOneLiner') }}</button>
            <button v-if="quickResult.gpo_one_liner" class="mini" @click="copy(quickResult.gpo_one_liner)">GPO one‑liner</button>
            <button class="mini" @click="openUrl(quickResult.installer_script_url)">{{ t('installCenter.common.downloadScript') }}</button>
            <button v-if="quickResult.gpo_script_url" class="mini" @click="openUrl(quickResult.gpo_script_url)">GPO script</button>
          </div>
        </div>
      </article>

      <article class="card-flat panel">
        <h2>{{ t('installCenter.bulk.title') }}</h2>
        <div class="form-grid">
          <label class="field">
            <span>{{ t('installCenter.bulk.count') }}</span>
            <input v-model.number="bulk.count" class="input" type="number" min="1" max="300" />
          </label>
          <label class="field">
            <span>{{ t('installCenter.quick.zone') }}</span>
            <select v-model="bulk.zone_id" class="input">
              <option value="">{{ t('installCenter.common.noZone') }}</option>
              <option v-for="z in zones" :key="`bz-${z.id}`" :value="String(z.id)">{{ z.name }}</option>
            </select>
          </label>
          <label class="field">
            <span>{{ t('installCenter.quick.expires') }}</span>
            <input v-model.number="bulk.expires_in_min" class="input" type="number" min="1" max="120" />
          </label>
        </div>
        <div class="actions">
          <button class="btn primary" :disabled="loading.bulk" @click="makeBulk">
            {{ loading.bulk ? t('installCenter.loading') : t('installCenter.bulk.create') }}
          </button>
        </div>
        <p v-if="errors.bulk" class="err">{{ errors.bulk }}</p>

        <div v-if="bulkResult?.codes?.length" class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ t('installCenter.quick.code') }}</th>
                <th>{{ t('installCenter.common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in bulkResult.codes.slice(0, 30)" :key="row.pair_code">
                <td>{{ idx + 1 }}</td>
                <td class="mono">{{ row.pair_code }}</td>
                <td class="row-actions">
                  <button class="mini" @click="copy(row.pair_code)">{{ t('installCenter.common.copyCode') }}</button>
                  <button class="mini" @click="copy(scriptUrl(row.pair_code))">{{ t('installCenter.common.script') }}</button>
                  <button v-if="bulkResult?.gpo_one_liner_pattern" class="mini" @click="copy(gpoOneLiner(row.pair_code))">GPO</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section class="card-flat panel">
      <div class="panel-head">
        <h2>{{ t('installCenter.codes.title') }}</h2>
        <div class="row-actions">
          <select v-model="pair.status" class="input sm" @change="loadCodes">
            <option value="active">{{ t('installCenter.codes.active') }}</option>
            <option value="used">{{ t('installCenter.codes.used') }}</option>
            <option value="expired">{{ t('installCenter.codes.expired') }}</option>
            <option value="all">{{ t('installCenter.codes.all') }}</option>
          </select>
          <button class="btn ghost" :disabled="loading.codes" @click="loadCodes">{{ t('installCenter.refresh') }}</button>
        </div>
      </div>
      <p v-if="errors.codes" class="err">{{ errors.codes }}</p>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('installCenter.quick.code') }}</th>
              <th>{{ t('installCenter.codes.state') }}</th>
              <th>{{ t('installCenter.quick.expiresAt') }}</th>
              <th>{{ t('installCenter.common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!codes.length"><td colspan="4" class="empty">{{ t('installCenter.common.empty') }}</td></tr>
            <tr v-for="row in codes" :key="row.code">
              <td class="mono">{{ row.code }}</td>
              <td><span class="state" :class="`s-${row.state}`">{{ t(`installCenter.codes.${row.state}`) }}</span></td>
              <td>{{ fmtDate(row.expires_at) }}</td>
              <td class="row-actions">
                <button class="mini" @click="copy(oneLiner(row.code))">{{ t('installCenter.common.oneLiner') }}</button>
                <button class="mini danger" :disabled="row.state !== 'active'" @click="revoke(row.code)">{{ t('installCenter.codes.revoke') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="grid two">
      <article class="card-flat panel">
        <h2>{{ t('installCenter.rollout.title') }}</h2>
        <div class="form-grid">
          <label class="field">
            <span>{{ t('installCenter.rollout.type') }}</span>
            <select v-model="rollout.type" class="input">
              <option v-for="type in commandTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>
          <label class="field">
            <span>{{ t('installCenter.rollout.targetMode') }}</span>
            <select v-model="rollout.target_mode" class="input">
              <option value="all">{{ t('installCenter.rollout.mode.all') }}</option>
              <option value="online">{{ t('installCenter.rollout.mode.online') }}</option>
              <option value="zone">{{ t('installCenter.rollout.mode.zone') }}</option>
              <option value="selected">{{ t('installCenter.rollout.mode.selected') }}</option>
            </select>
          </label>
          <label v-if="rollout.target_mode === 'zone'" class="field">
            <span>{{ t('installCenter.quick.zone') }}</span>
            <select v-model="rollout.zone_id" class="input">
              <option value="">{{ t('installCenter.common.select') }}</option>
              <option v-for="z in zones" :key="`rz-${z.id}`" :value="String(z.id)">{{ z.name }}</option>
            </select>
          </label>
          <label v-if="rollout.target_mode === 'selected'" class="field col-span">
            <span>{{ t('installCenter.rollout.pcSearch') }}</span>
            <input v-model.trim="pcSearch" class="input" :placeholder="t('installCenter.rollout.pcSearchPlaceholder')" />
          </label>
          <label v-if="rollout.target_mode === 'selected'" class="field col-span">
            <span>{{ t('installCenter.rollout.pcSelect') }}</span>
            <select v-model="rollout.selected_pc_ids" class="input multi" multiple size="8">
              <option v-for="pc in filteredPcs" :key="`sel-${pc.id}`" :value="String(pc.id)">
                {{ pc.code }} | {{ pc.zone || '-' }} | {{ pc.status || '-' }}
              </option>
            </select>
            <div class="row-actions">
              <span class="muted">{{ t('installCenter.rollout.selectedCount', { count: rollout.selected_pc_ids.length }) }}</span>
              <button type="button" class="mini" @click="selectAllVisiblePcs">{{ t('installCenter.rollout.pickAll') }}</button>
              <button type="button" class="mini" @click="clearSelectedPcs">{{ t('installCenter.rollout.clearSelected') }}</button>
            </div>
          </label>
        </div>
        <div class="checks">
          <label><input v-model="rollout.only_online" type="checkbox" /> {{ t('installCenter.rollout.onlyOnline') }}</label>
          <label><input v-model="rollout.dry_run" type="checkbox" /> {{ t('installCenter.rollout.dryRun') }}</label>
        </div>
        <label class="field">
          <span>{{ t('installCenter.rollout.payload') }}</span>
          <textarea v-model="rollout.payload_text" class="input area"></textarea>
        </label>
        <div class="actions">
          <button class="btn primary" :disabled="loading.rollout" @click="sendRollout">
            {{ loading.rollout ? t('installCenter.loading') : t('installCenter.rollout.send') }}
          </button>
        </div>
        <div v-if="rollout.target_mode === 'selected' && rollout.selected_pc_ids.length === 1" class="single-pc-box">
          <div class="single-pc-title">{{ t('installCenter.rollout.singleTitle') }}</div>
          <div class="single-pc-sub">{{ t('installCenter.rollout.singleHint', { pc: selectedSinglePcLabel }) }}</div>
          <button class="btn primary" :disabled="loading.rollout" @click="sendSinglePcUpdate">
            {{ t('installCenter.rollout.singleUpdateNow') }}
          </button>
        </div>
        <p v-if="errors.rollout" class="err">{{ errors.rollout }}</p>
        <div v-if="rolloutResult" class="result"><b class="mono">{{ rolloutResult.batch_id }}</b></div>
      </article>

      <article class="card-flat panel">
        <div class="panel-head">
          <h2>{{ t('installCenter.batches.title') }}</h2>
          <button class="btn ghost" :disabled="loading.batches" @click="loadBatches">{{ t('installCenter.refresh') }}</button>
        </div>
        <p v-if="errors.batches" class="err">{{ errors.batches }}</p>
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr><th>batch_id</th><th>type</th><th>{{ t('installCenter.batches.progress') }}</th><th>{{ t('installCenter.common.actions') }}</th></tr>
            </thead>
            <tbody>
              <tr v-if="!batches.length"><td colspan="4" class="empty">{{ t('installCenter.common.empty') }}</td></tr>
              <tr v-for="row in batches" :key="row.batch_id">
                <td class="mono">{{ shortId(row.batch_id) }}</td>
                <td>{{ row.type }}</td>
                <td>{{ row.done }}/{{ row.total }} · F: {{ row.failed }}</td>
                <td><button class="mini" @click="openBatch(row.batch_id)">{{ t('installCenter.batches.open') }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="batchDetail" class="result">
          <div class="panel-head">
            <b class="mono">{{ batchDetail.batch_id }}</b>
            <button class="mini danger" :disabled="loading.retry" @click="retryFailed">{{ t('installCenter.batches.retryFailed') }}</button>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr><th>pc</th><th>{{ t('installCenter.codes.state') }}</th><th>error</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in batchDetail.items || []" :key="row.id">
                  <td>{{ row.pc_code || ('#' + row.pc_id) }}</td>
                  <td><span class="state" :class="`s-${row.status}`">{{ row.status }}</span></td>
                  <td class="mono">{{ row.error || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </section>

    <p v-if="toast" class="toast">{{ toast }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { cpApi } from '../../api/cp'
import { useI18n } from '../../i18n'

const { t } = useI18n()

const zones = ref([])
const pcs = ref([])
const pcSearch = ref('')
const quickResult = ref(null)
const bulkResult = ref(null)
const codes = ref([])
const batches = ref([])
const batchDetail = ref(null)
const rolloutResult = ref(null)
const toast = ref('')
const selectedBatchId = ref('')

const loading = reactive({ all: false, quick: false, bulk: false, codes: false, rollout: false, batches: false, retry: false })
const errors = reactive({ quick: '', bulk: '', codes: '', rollout: '', batches: '' })

const quick = reactive({ zone_id: '', expires_in_min: 10 })
const bulk = reactive({ count: 20, zone_id: '', expires_in_min: 30 })
const pair = reactive({ status: 'active', limit: 100 })
const rollout = reactive({
  type: 'UPDATE_SHELL',
  target_mode: 'online',
  zone_id: '',
  pc_ids: '',
  selected_pc_ids: [],
  only_online: true,
  dry_run: false,
  payload_text: '{\n  "version":"1.0.0",\n  "download_url":"https://cdn.example.com/shell.zip",\n  "sha256":""\n}',
})

const commandTypes = ['UPDATE_SHELL', 'INSTALL_GAME', 'UPDATE_GAME', 'ROLLBACK_GAME', 'RUN_SCRIPT', 'MESSAGE', 'REBOOT', 'SHUTDOWN', 'LOCK', 'UNLOCK']

const apiBase = `${window.location.origin}/api`

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}
function fmtDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
}
function shortId(v) {
  const s = String(v || '')
  return s.length > 16 ? `${s.slice(0, 8)}...${s.slice(-4)}` : s
}
function scriptUrl(code) {
  const p = bulkResult.value?.installer_script_url_pattern
  if (p && p.includes('{PAIR_CODE}')) return p.replace('{PAIR_CODE}', encodeURIComponent(code))
  return `${apiBase.replace(/\/api$/, '')}/api/deployment/quick-install/${encodeURIComponent(code)}/script.ps1`
}
function oneLiner(code) {
  const p = bulkResult.value?.install_one_liner_pattern
  if (p && p.includes('{PAIR_CODE}')) return p.replace('{PAIR_CODE}', code)
  return `powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -UseBasicParsing -Uri '${scriptUrl(code)}' | iex"`
}
function gpoScriptUrl(code) {
  const p = bulkResult.value?.gpo_script_url_pattern
  if (p && p.includes('{PAIR_CODE}')) return p.replace('{PAIR_CODE}', encodeURIComponent(code))
  return `${apiBase.replace(/\/api$/, '')}/api/deployment/quick-install/${encodeURIComponent(code)}/gpo.ps1`
}
function gpoOneLiner(code) {
  const p = bulkResult.value?.gpo_one_liner_pattern
  if (p && p.includes('{PAIR_CODE}')) return p.replace('{PAIR_CODE}', code)
  return `powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -UseBasicParsing -Uri '${gpoScriptUrl(code)}' | iex"`
}
function openUrl(url) { window.open(String(url || ''), '_blank', 'noopener,noreferrer') }
async function copy(text) {
  try {
    await navigator.clipboard.writeText(String(text || ''))
    showToast(t('installCenter.common.copied'))
  } catch (_) {}
}
function errMsg(e) {
  const first = e?.response?.data?.errors ? Object.values(e.response.data.errors).flat()[0] : null
  return first || e?.response?.data?.message || t('installCenter.common.actionError')
}
function parseRows(payload) {
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload)) return payload
  return []
}
const filteredPcs = computed(() => {
  const q = String(pcSearch.value || '').trim().toLowerCase()
  if (!q) return pcs.value
  return pcs.value.filter((pc) => {
    const hay = `${pc.code} ${pc.zone} ${pc.status}`.toLowerCase()
    return hay.includes(q)
  })
})
const selectedSinglePcLabel = computed(() => {
  if (rollout.selected_pc_ids.length !== 1) return '-'
  const id = Number(rollout.selected_pc_ids[0] || 0)
  const pc = pcs.value.find((x) => Number(x.id) === id)
  if (!pc) return '#'+id
  return `${pc.code} (${pc.zone || '-'})`
})
function selectAllVisiblePcs() {
  rollout.selected_pc_ids = filteredPcs.value.map((pc) => String(pc.id))
}
function clearSelectedPcs() {
  rollout.selected_pc_ids = []
}

async function loadZones() {
  try {
    const { data } = await cpApi.zoneList({ page: 1, per_page: 500 })
    const rows = Array.isArray(data?.data?.data) ? data.data.data : (Array.isArray(data?.data) ? data.data : [])
    zones.value = rows.map((x) => ({ id: Number(x.id), name: String(x.name || '-') }))
  } catch (_) { zones.value = [] }
}
async function loadPcs() {
  try {
    const { data } = await cpApi.pcs({ page: 1, per_page: 1000 })
    const rows = parseRows(data)
    pcs.value = rows
      .map((x) => ({
        id: Number(x?.id || 0),
        code: String(x?.code || x?.name || '-'),
        zone: String(x?.zone || x?.zone_name || '-'),
        status: String(x?.status || '-'),
      }))
      .filter((x) => x.id > 0)
  } catch (_) {
    pcs.value = []
  }
}
async function makeQuick() {
  loading.quick = true
  errors.quick = ''
  try {
    const payload = { expires_in_min: Math.max(1, Math.min(120, Number(quick.expires_in_min || 10))) }
    if (quick.zone_id) payload.zone_id = Number(quick.zone_id)
    const { data } = await cpApi.deploymentQuickInstall(payload)
    quickResult.value = data?.data || null
    showToast(t('installCenter.quick.created', { code: quickResult.value?.pair_code || '' }))
    await loadCodes()
  } catch (e) { errors.quick = errMsg(e) } finally { loading.quick = false }
}
async function makeBulk() {
  loading.bulk = true
  errors.bulk = ''
  try {
    const payload = { count: Math.max(1, Math.min(300, Number(bulk.count || 1))), expires_in_min: Math.max(1, Math.min(120, Number(bulk.expires_in_min || 10))) }
    if (bulk.zone_id) payload.zone_id = Number(bulk.zone_id)
    const { data } = await cpApi.deploymentQuickInstallBulk(payload)
    bulkResult.value = data?.data || null
    showToast(t('installCenter.bulk.created', { count: bulkResult.value?.count || 0 }))
    await loadCodes()
  } catch (e) { errors.bulk = errMsg(e) } finally { loading.bulk = false }
}
async function loadCodes() {
  loading.codes = true
  errors.codes = ''
  try {
    const { data } = await cpApi.deploymentPairCodes({ status: pair.status, limit: pair.limit })
    codes.value = Array.isArray(data?.data) ? data.data : []
  } catch (e) { errors.codes = errMsg(e) } finally { loading.codes = false }
}
async function revoke(code) {
  try {
    await cpApi.deploymentRevokePairCode(code)
    showToast(t('installCenter.codes.revoked'))
    await loadCodes()
  } catch (e) { errors.codes = errMsg(e) }
}
async function sendRollout() {
  loading.rollout = true
  errors.rollout = ''
  rolloutResult.value = null
  try {
    const req = { type: rollout.type, target_mode: rollout.target_mode, only_online: !!rollout.only_online, dry_run: !!rollout.dry_run }
    const payloadObj = JSON.parse(String(rollout.payload_text || '{}'))
    if (payloadObj && Object.keys(payloadObj).length) req.payload = payloadObj
    if (rollout.target_mode === 'zone') req.zone_id = Number(rollout.zone_id)
    if (rollout.target_mode === 'selected') {
      const selected = (rollout.selected_pc_ids || [])
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x) && x > 0)
      const fallback = String(rollout.pc_ids || '').split(/[\s,;]+/).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
      req.pc_ids = selected.length ? selected : fallback
      if (!req.pc_ids.length) {
        throw new Error(t('installCenter.rollout.selectAtLeastOne'))
      }
    }
    const { data } = await cpApi.deploymentRollout(req)
    rolloutResult.value = data?.data || null
    showToast(t('installCenter.rollout.created', { batchId: rolloutResult.value?.batch_id || '-' }))
    await loadBatches()
  } catch (e) { errors.rollout = errMsg(e) } finally { loading.rollout = false }
}
async function sendSinglePcUpdate() {
  const single = (rollout.selected_pc_ids || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
  if (single.length !== 1) {
    errors.rollout = t('installCenter.rollout.selectExactlyOne')
    return
  }
  const prev = {
    type: rollout.type,
    target_mode: rollout.target_mode,
    only_online: rollout.only_online,
    selected_pc_ids: [...rollout.selected_pc_ids],
  }
  try {
    rollout.type = 'UPDATE_SHELL'
    rollout.target_mode = 'selected'
    rollout.only_online = false
    rollout.selected_pc_ids = [String(single[0])]
    await sendRollout()
  } finally {
    rollout.type = prev.type
    rollout.target_mode = prev.target_mode
    rollout.only_online = prev.only_online
    rollout.selected_pc_ids = prev.selected_pc_ids
  }
}
async function loadBatches() {
  loading.batches = true
  errors.batches = ''
  try {
    const { data } = await cpApi.deploymentBatches({ limit: 30 })
    batches.value = Array.isArray(data?.data) ? data.data : []
    if (selectedBatchId.value) await openBatch(selectedBatchId.value)
  } catch (e) { errors.batches = errMsg(e) } finally { loading.batches = false }
}
async function openBatch(batchId) {
  selectedBatchId.value = String(batchId || '')
  const { data } = await cpApi.deploymentBatchStatus(selectedBatchId.value)
  batchDetail.value = data?.data || null
}
async function retryFailed() {
  if (!selectedBatchId.value) return
  loading.retry = true
  try {
    const { data } = await cpApi.deploymentRetryFailed(selectedBatchId.value)
    const next = data?.data?.new_batch_id || ''
    showToast(t('installCenter.batches.retried'))
    await loadBatches()
    if (next) await openBatch(next)
  } catch (e) { errors.batches = errMsg(e) } finally { loading.retry = false }
}
async function refreshAll() {
  loading.all = true
  try { await Promise.all([loadZones(), loadPcs(), loadCodes(), loadBatches()]) } finally { loading.all = false }
}

onMounted(refreshAll)
</script>

<style scoped>
.install-page{display:grid;gap:14px}
.hero{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px}
.hero h1{margin:0;font-size:22px}.hero p{margin:6px 0 0;opacity:.74;font-size:13px}
.grid{display:grid;gap:12px}.grid.two{grid-template-columns:1fr 1fr}
.panel{padding:14px}.panel h2{margin:0;font-size:15px}
.panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.form-grid{margin-top:12px;display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr))}
.field{display:grid;gap:6px}.field span{font-size:12px;opacity:.75}.col-span{grid-column:1/-1}
.input{height:38px;border-radius:10px;border:1px solid var(--stroke);background:rgba(2,6,23,.35);color:var(--text);padding:0 10px}
.input.area{min-height:120px;height:auto;padding:10px;font-family:ui-monospace,Consolas,monospace}
.input.multi{height:auto;min-height:190px;padding:8px}
.input.sm{width:140px}
.checks{display:flex;gap:12px;margin-top:10px;font-size:13px}
.checks label{display:inline-flex;gap:6px;align-items:center}
.actions{margin-top:12px;display:flex;align-items:center;gap:8px}.actions.wrap{flex-wrap:wrap}
.btn,.mini{border:1px solid var(--stroke);background:rgba(255,255,255,.04);color:var(--text);cursor:pointer}
.btn{height:38px;border-radius:10px;padding:0 14px}
.btn.primary{border-color:rgba(59,130,246,.45);background:rgba(59,130,246,.18)}
.btn.ghost{background:rgba(2,6,23,.35)}
.btn:disabled,.mini:disabled{opacity:.6;cursor:not-allowed}
.mini{height:28px;border-radius:8px;padding:0 10px;font-size:11px}
.mini.danger{border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.12)}
.table-wrap{margin-top:12px;border:1px solid var(--stroke);border-radius:12px;overflow:auto;background:rgba(2,6,23,.2)}
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl th,.tbl td{padding:9px 10px;border-bottom:1px solid var(--stroke);white-space:nowrap;text-align:left}
.tbl th{opacity:.75;font-weight:700;background:rgba(255,255,255,.02)}
.tbl tbody tr:last-child td{border-bottom:none}
.row-actions{display:flex;gap:6px}
.state{display:inline-flex;border-radius:999px;padding:3px 10px;border:1px solid var(--stroke);background:rgba(255,255,255,.04)}
.state.s-active,.state.s-used,.state.s-done,.state.s-sent{border-color:rgba(59,130,246,.35);background:rgba(59,130,246,.16)}
.state.s-expired,.state.s-failed{border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.12)}
.result{margin-top:12px;border:1px solid var(--stroke);background:rgba(2,6,23,.28);border-radius:12px;padding:10px;display:grid;gap:8px}
.single-pc-box{margin-top:10px;border:1px solid var(--stroke);border-radius:12px;padding:10px;background:rgba(59,130,246,.08);display:grid;gap:8px}
.single-pc-title{font-size:12px;font-weight:800;opacity:.9}
.single-pc-sub{font-size:12px;opacity:.75}
.kv{display:flex;justify-content:space-between;gap:8px}
.mono{font-family:ui-monospace,Consolas,monospace}
.empty{text-align:center;opacity:.7}
.err{margin-top:10px;font-size:12px;color:rgba(248,113,113,.95)}
.toast{position:fixed;right:16px;bottom:16px;z-index:50;border:1px solid rgba(59,130,246,.35);background:rgba(15,23,42,.94);border-radius:10px;padding:10px 12px;font-size:12px}
@media (max-width:1200px){.grid.two{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}.input.sm{width:100px}}
</style>
