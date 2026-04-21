<template>
  <div class="tile" :class="statusClass" @contextmenu.prevent="$emit('context', $event)">
    <div class="top">
      <div class="name-wrap">
        <div class="name">{{ pc.name }}</div>
        <div class="subline muted">{{ pc.zone || '—' }} • {{ pc.code || '—' }}</div>
      </div>
      <div class="status-pill" :class="statusClass">
        <span class="dot" :class="statusClass"></span>
        <span>{{ statusLabel }}</span>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="label">Зона</div>
        <div class="value">{{ pc.zone || '—' }}</div>
      </div>
      <div class="stat">
        <div class="label">ПК</div>
        <div class="value">{{ pc.code || '—' }}</div>
      </div>
      <div class="stat" v-if="pc.status==='busy'">
        <div class="label">Клиент</div>
        <div class="value clamp">{{ pc.client || '—' }}</div>
      </div>
    </div>

    <div class="footer">
      <div class="status-line">
        <div class="dot" :class="statusClass"></div>
        <div class="muted small">{{ statusText }}</div>
      </div>
      <div class="timer" v-if="pc.session_left || computedLeft">
        {{ pc.session_left || computedLeft }}
      </div>
    </div>

    <!-- Quick actions only when busy -->
    <div class="actions" v-if="pc.status==='busy'">
      <button class="btn" @click.stop="$emit('topup')">+ Баланс</button>
      <button class="btn" @click.stop="$emit('attach_package')">+ Пакет</button>
      <button class="btn danger" @click.stop="$emit('stop')">Завершить</button>
    </div>

    <!-- When online: start -->
    <div class="actions single" v-else-if="pc.status==='online'">
      <button class="btn primary" @click.stop="$emit('start')">▶ Открыть сессию</button>
    </div>

    <!-- locked: show hint only -->
    <div class="hint" v-else>
      <span class="muted">Ожидает вход по аккаунту</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ pc: { type:Object, required:true } })

const statusClass = computed(() => props.pc.status || 'locked')

const statusLabel = computed(() => {
  const s = props.pc.status || 'locked'
  if (s === 'online') return 'Свободен'
  if (s === 'busy') return 'Занят'
  return 'Ожидание'
})

const statusText = computed(() => {
  const s = props.pc.status || 'locked'
  if (s === 'online') return 'Готов к запуску'
  if (s === 'busy') return 'Сессия активна'
  return 'Вход по аккаунту'
})

const computedLeft = computed(() => {
  if (props.pc.status !== 'busy') return null
  const bal = Number(props.pc.client_balance || 0)
  const pph = Number(props.pc.zone_price_per_hour || 0)
  if (!pph) return null
  const sec = Math.floor((bal / pph) * 3600)
  const h = String(Math.floor(sec / 3600)).padStart(2,'0')
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2,'0')
  const s = String(sec % 60).padStart(2,'0')
  return `${h}:${m}:${s}`
})
</script>

<style scoped>
.tile{
  --accent: rgba(148,163,184,0.85);
  border-radius:18px;
  border:1px solid rgba(255,255,255,0.08);
  background: linear-gradient(180deg, rgba(12,18,34,0.9), rgba(8,13,26,0.78));
  padding:14px;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  position:relative;
  overflow:hidden;
  box-shadow: 0 14px 28px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05);
}
.tile:before{
  content:"";
  position:absolute;
  inset:0;
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(99,162,255,0.12), transparent 60%),
    radial-gradient(80% 80% at 100% 0%, rgba(99,102,241,0.10), transparent 55%);
  opacity:.9;
  pointer-events:none;
}
.tile:after{
  content:"";
  position:absolute;
  left:12px;
  right:12px;
  bottom:8px;
  height:2px;
  border-radius:999px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity:.65;
}
.tile:hover{
  transform: translateY(-3px);
  border-color: rgba(255,255,255,0.16);
  box-shadow: 0 22px 36px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
}
.tile.online{--accent: rgba(34,197,94,0.9);}
.tile.busy{--accent: rgba(245,158,11,0.9);}
.tile.locked{--accent: rgba(148,163,184,0.85);}

.top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;position:relative;z-index:1}
.name-wrap{min-width:0}
.name{font-weight:900;font-size:16px;letter-spacing:.2px}
.subline{margin-top:4px;font-size:12px;opacity:.9}

.status-pill{
  display:inline-flex;align-items:center;gap:6px;
  font-size:11px;font-weight:800;letter-spacing:.3px;
  padding:6px 10px;border-radius:999px;
  border:1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.06);
  color: rgba(226,232,240,0.95);
}
.status-pill.online{border-color: rgba(34,197,94,0.45); background: rgba(34,197,94,0.14); color: rgba(187,247,208,0.95)}
.status-pill.busy{border-color: rgba(245,158,11,0.45); background: rgba(245,158,11,0.16); color: rgba(253,230,138,0.98)}
.status-pill.locked{border-color: rgba(148,163,184,0.3); background: rgba(148,163,184,0.10)}

.stats{
  margin-top:12px;
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:10px;
  position:relative;
  z-index:1;
}
.stat{
  padding:10px 10px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,0.08);
  background: rgba(7,11,22,0.45);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
.label{font-size:11px;letter-spacing:.6px;text-transform:uppercase;opacity:.7}
.value{margin-top:4px;font-weight:800}
.clamp{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.footer{
  margin-top:12px;
  display:flex;
  align-items:center;
  gap:10px;
  position:relative;
  z-index:1;
}
.status-line{display:flex;align-items:center;gap:8px;min-width:0}
.dot{width:9px;height:9px;border-radius:99px;background: rgba(148,163,184,0.6)}
.dot.online{background:rgba(34,197,94,0.9); box-shadow:0 0 16px rgba(34,197,94,0.28)}
.dot.busy{background:rgba(245,158,11,0.9); box-shadow:0 0 16px rgba(245,158,11,0.25)}
.dot.locked{background:rgba(148,163,184,0.7)}
.small{font-size:12px}
.timer{
  margin-left:auto;
  font-weight:900;
  font-size:12px;
  padding:6px 10px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,0.14);
  background: rgba(2,6,23,0.35);
  color: rgba(226,232,240,0.95);
}

.actions{
  margin-top:12px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:8px;
  position:relative;
  z-index:1;
}
.actions.single{grid-template-columns:1fr}
.btn{
  padding:9px 10px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,0.12);
  background: linear-gradient(180deg, rgba(12,18,34,0.85), rgba(8,13,26,0.85));
  color: var(--text);
  cursor:pointer;
  font-weight:800;
  font-size:12px;
  transition: transform .15s ease, border-color .15s ease, background .15s ease;
}
.btn:hover{transform: translateY(-1px); border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.06)}
.btn.primary{
  border-color: rgba(59,130,246,0.45);
  background: linear-gradient(180deg, rgba(59,130,246,0.25), rgba(37,99,235,0.18));
}
.btn.danger{
  border-color: rgba(239,68,68,0.45);
  background: linear-gradient(180deg, rgba(239,68,68,0.22), rgba(220,38,38,0.16));
}

.hint{
  margin-top:12px;
  padding:10px 12px;
  border-radius:12px;
  border:1px dashed rgba(255,255,255,0.14);
  background: rgba(6,10,20,0.35);
  opacity:.95;
  position:relative;
  z-index:1;
}
</style>

