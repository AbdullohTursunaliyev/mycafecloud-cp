<template>
  <CpLegacySectionHost
    :component="pageComponent"
    :eyebrow="copy.eyebrow"
    :title="copy.title"
    :subtitle="copy.subtitle"
  />
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { cpSectionMeta } from '../../constants/cp-sections'
import { cpSectionCopy } from '../../constants/cp-copy'
import { useCpCopy } from '../../../composables/useCpCopy'

definePageMeta({
  layout: 'cp',
})

const route = useRoute()

const section = computed(() => String(route.params.section || ''))
const meta = computed(() => cpSectionMeta[section.value])
const loader = computed(() => meta.value?.loader)
const copy = useCpCopy(() => cpSectionCopy[section.value] || {
  uz: { title: section.value, eyebrow: 'Bo`lim', subtitle: '' },
  ru: { title: section.value, eyebrow: 'Раздел', subtitle: '' },
  en: { title: section.value, eyebrow: 'Section', subtitle: '' },
})

if (!loader.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
  })
}

const pageComponent = defineAsyncComponent(async () => {
  const mod = await loader.value()
  return mod.default
})

useHead({
  title: computed(() => `${copy.value.title} · MyCafeCloud CP`),
})
</script>
