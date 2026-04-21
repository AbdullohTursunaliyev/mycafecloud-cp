<template>
  <div class="cp-page">
    <div class="cp-head glass">
      <div class="left">
        <div class="title">Transfers</div>
        <div class="sub">All balance transfers</div>
      </div>

      <div class="right">
        <button class="btn ghost" @click="load(page)" :disabled="loading">
          {{ loading ? '...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div class="cp-card glass">
      <div class="table">
        <div class="thead">
          <div class="th c-date">Date</div>
          <div class="th c-from">From</div>
          <div class="th c-to">To</div>
          <div class="th c-amount">Amount</div>
          <div class="th c-operator">Operator</div>
          <div class="th c-shift">Shift</div>
        </div>

        <div v-if="loading" class="skeleton-list">
          <div v-for="i in 6" :key="i" class="skeleton-row"></div>
        </div>

        <div v-else-if="!rows.length" class="empty">No data</div>

        <div v-else v-for="r in rows" :key="r.id" class="tr">
          <div class="td c-date">{{ formatDT(r.created_at) }}</div>
          <div class="td c-from">
            <div class="client-main">{{ r.from_client?.login || r.from_client?.phone || r.from_client_id }}</div>
            <div class="muted">ID: {{ r.from_client_id }}</div>
          </div>
          <div class="td c-to">
            <div class="client-main">{{ r.to_client?.login || r.to_client?.phone || r.to_client_id }}</div>
            <div class="muted">ID: {{ r.to_client_id }}</div>
          </div>
          <div class="td c-amount">{{ money(r.amount) }} UZS</div>
          <div class="td c-operator">{{ r.operator?.login || r.operator_id }}</div>
          <div class="td c-shift">#{{ r.shift_id || '-' }}</div>
        </div>
      </div>

      <div class="pager">
        <button class="btn ghost small" :disabled="page<=1 || loading" @click="load(page-1)"><</button>
        <div class="pageText">Page <b>{{ page }}</b></div>
        <button class="btn ghost small" :disabled="!hasMore || loading" @click="load(page+1)">></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { cpApi } from '../../api/cp'

const loading = ref(false)
const rows = ref([])
const page = ref(1)
const hasMore = ref(false)

async function load(p = 1) {
  loading.value = true
  try {
    const r = await cpApi.transfersList({ page: p })
    const data = r?.data?.data ?? r?.data ?? {}
    const list = Array.isArray(data?.data) ? data.data : []
    rows.value = list
    page.value = data?.current_page ?? p
    hasMore.value = (data?.current_page ?? p) < (data?.last_page ?? p)
  } finally {
    loading.value = false
  }
}

function money(v) {
  return Number(v || 0).toLocaleString('en-US')
}
function formatDT(v) {
  if (!v) return '-'
  try { return new Date(v).toLocaleString('en-GB') } catch { return String(v) }
}

load(1)
</script>

<style scoped>
.cp-page{ padding: 18px; }
.glass{
  background: rgba(12, 18, 32, .55);
  border: 1px solid rgba(255,255,255,.06);
  box-shadow: 0 12px 40px rgba(0,0,0,.35);
  backdrop-filter: blur(14px);
  border-radius: 16px;
}
.cp-head{
  display:flex; justify-content:space-between; gap:14px;
  padding: 14px 14px;
  align-items:center;
}
.title{ font-size: 18px; font-weight: 700; color: rgba(255,255,255,.92); }
.sub{ font-size: 12px; color: rgba(255,255,255,.55); margin-top: 4px; }
.right{ display:flex; gap:10px; align-items:center; flex-wrap: wrap; justify-content:flex-end; }
.btn{
  height: 34px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.85);
  cursor:pointer;
}
.btn:disabled{ opacity:.6; cursor:not-allowed; }
.btn.ghost{ background: rgba(255,255,255,.03); }
.btn.small{ height: 30px; border-radius: 11px; padding: 0 10px; }

.cp-card{ margin-top: 14px; padding: 12px; }
.table{
  min-height: 420px;
  border-radius: 14px;
  overflow:hidden;
  border: 1px solid rgba(255,255,255,.06);
}
.thead, .tr{
  display:grid;
  grid-template-columns: 160px 1fr 1fr 140px 140px 80px;
  align-items:center;
}
.thead{
  background: rgba(255,255,255,.03);
  color: rgba(255,255,255,.70);
  font-size: 12px;
  padding: 10px 12px;
}
.tr{
  padding: 10px 10px;
  border-top: 1px solid rgba(255,255,255,.06);
}
.td{ color: rgba(255,255,255,.88); }
.client-main{ font-weight:700; }
.muted{ color: rgba(255,255,255,.50); font-size: 12px; margin-top: 4px; }
.empty{
  padding: 26px;
  text-align:center;
  color: rgba(255,255,255,.55);
}
.pager{
  display:flex; justify-content:center; align-items:center; gap:10px;
  margin-top: 12px;
}
.pageText{ color: rgba(255,255,255,.65); font-size: 13px; }
.skeleton-list{display:flex;flex-direction:column;gap:10px;padding:10px 10px 14px}
.skeleton-row{height:62px;border-radius:14px;background: rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);animation: skPulse 1.2s infinite ease-in-out}
@keyframes skPulse{0%,100%{opacity:.6}50%{opacity:1}}
</style>

