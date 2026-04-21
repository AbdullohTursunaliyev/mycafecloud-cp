import { i18n } from '@legacy/i18n'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.globalProperties.$t = i18n.t
  nuxtApp.vueApp.provide('i18n', i18n)
  i18n.startDomTranslation()

  return {
    provide: {
      t: i18n.t,
      i18n,
    },
  }
})
