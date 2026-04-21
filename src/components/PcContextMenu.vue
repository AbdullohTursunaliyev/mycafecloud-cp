<template>
  <div v-if="open" class="menu" :style="{ left:x+'px', top:y+'px' }" @click.stop>
    <div class="title">
      {{ pc?.name }}
      <div class="sub" v-if="pc?.client">👤 {{ pc.client }}</div>
      <div class="sub" v-else>—</div>
    </div>

    <button class="item" @click="$emit('action','start')">▶ Открыть сессию</button>

    <button v-if="pc?.status==='busy'" class="item" @click="$emit('action','topup')">
      + Пополнить баланс
    </button>

    <button v-if="pc?.status==='busy'" class="item" @click="$emit('action','attach_package')">
      + Добавить пакет
    </button>

    <button v-if="pc?.status==='busy'" class="item" @click="$emit('action','stop')">
      ■ Завершить сессию
    </button>

    <div class="sep"></div>

    <button class="item" @click="$emit('action','message')">✉ Сообщение</button>
    <button class="item" @click="$emit('action','reboot')">⟲ Перезагрузка</button>
    <button class="item" @click="$emit('action','power_off')">⏻ Выключить</button>
  </div>
</template>

<script setup>
defineProps({ open:Boolean, x:Number, y:Number, pc:Object })
defineEmits(['action'])
</script>

<style scoped>
.menu{position:fixed;width:220px;z-index:9999;border-radius:14px;border:1px solid var(--stroke2);
  background: rgba(15,23,42,.98);box-shadow: 0 30px 90px rgba(0,0,0,.6);padding:10px}
.title{font-weight:900;padding:8px 10px;border-radius:12px;background: rgba(2,6,23,.25);
  border:1px solid var(--stroke);margin-bottom:8px}
.sub{margin-top:4px;font-size:12px;opacity:.75;font-weight:600}
.item{width:100%;text-align:left;padding:9px 10px;border-radius:12px;border:1px solid transparent;
  background: transparent;color: var(--text);cursor:pointer}
.item:hover{background: rgba(255,255,255,.05);border-color: var(--stroke)}
.sep{height:1px;background: var(--stroke);margin:8px 0}
</style>

