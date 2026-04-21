<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useCpTheme } from '../composables/useCpTheme'

const { initTheme } = useCpTheme()

onMounted(() => {
  initTheme()
})
</script>
