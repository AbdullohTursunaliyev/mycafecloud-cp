import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './styles/theme.css'
import './styles/cp-glass.css'
import { i18n } from './i18n'

const app = createApp(App)
app.config.globalProperties.$t = i18n.t
app.provide('i18n', i18n)
app.use(createPinia()).use(router).use(ElementPlus).mount('#app')
i18n.startDomTranslation()

