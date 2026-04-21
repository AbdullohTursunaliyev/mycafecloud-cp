<template>
  <div class="login-screen">
    <div class="ambient ambient-left" />
    <div class="ambient ambient-right" />
    <div class="grid-noise" />

    <section class="login-shell">
      <main class="auth-card">
        <div class="auth-top">
          <div class="lang-switch">
            <button
              v-for="code in supportedLocales"
              :key="code"
              class="lang-btn"
              :class="{ active: locale === code }"
              @click="setLocale(code)"
            >
              {{ t(`layout.lang.${code}`) }}
            </button>
          </div>
        </div>

        <div class="auth-brand">
          <img :src="brandWordmark" alt="NEXORA CLOUD logo" class="brand-wordmark" />
        </div>

        <form class="auth-form" @submit.prevent="submitLogin">
          <label class="field">
            <span>{{ t('login.licenseKey') }}</span>
            <input
              v-model="licenseKeyInput"
              class="field-input"
              inputmode="text"
              autocomplete="off"
              placeholder="XXXX-XXXX-XXXX"
              @input="onLicenseInput"
            />
            <small>{{ licenseHint }}</small>
          </label>

          <label class="field">
            <span>{{ t('login.login') }}</span>
            <input
              v-model.trim="login"
              class="field-input"
              autocomplete="username"
              placeholder="operator_01"
            />
            <small>{{ copy.loginHelp }}</small>
          </label>

          <label class="field">
            <span>{{ t('login.password') }}</span>
            <div class="password-wrap">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="field-input password-input"
                autocomplete="current-password"
                placeholder="********"
              />
              <button type="button" class="visibility-btn" @click="showPassword = !showPassword">
                {{ showPassword ? copy.hidePassword : copy.showPassword }}
              </button>
            </div>
            <small>{{ copy.passwordHelp }}</small>
          </label>

          <div class="remember-row">
            <label class="remember-check">
              <input v-model="rememberLastLogin" type="checkbox" />
              <span>{{ copy.remember }}</span>
            </label>
            <button type="button" class="ghost-btn" @click="clearRemembered">
              {{ copy.clear }}
            </button>
          </div>

          <div v-if="error" class="feedback error">{{ error }}</div>
          <div v-else-if="info" class="feedback info">{{ info }}</div>

          <button class="submit-btn" :disabled="loading || !canSubmit" type="submit">
            <span>{{ loading ? copy.checking : copy.submit }}</span>
          </button>
        </form>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { navigateTo, useRuntimeConfig } from '#app'
import { useCpAuthStore } from '@legacy/stores/cpAuth'
import { useI18n } from '@legacy/i18n'

definePageMeta({
  layout: false,
})

const LAST_LICENSE_KEY = 'cp_last_license_key'
const LAST_LOGIN_KEY = 'cp_last_login'

const auth = useCpAuthStore()
const { t, locale, setLocale, supportedLocales } = useI18n()
const runtimeConfig = useRuntimeConfig()
const brandWordmark = '/brand/nexora-cloud-logo.png'

const appName = computed(() => String(runtimeConfig.public.appName || 'NEXORA CLOUD'))

const copy = computed(() => {
  if (locale.value === 'ru') {
    return {
      loginHelp: 'Введите логин оператора или имя аккаунта.',
      passwordHelp: 'Пароль должен принадлежать аккаунту оператора.',
      remember: 'Запомнить лицензию и логин',
      clear: 'Очистить',
      submit: 'Войти',
      checking: 'Проверка...',
      showPassword: 'Show',
      hidePassword: 'Hide',
      licenseHelp: 'Введите лицензионный ключ клуба.',
      licenseIncomplete: 'Ключ заполнен не полностью.',
      licenseReady: 'Формат ключа выглядит корректно.',
      cleared: 'Сохраненные данные входа очищены.',
    }
  }

  if (locale.value === 'en') {
    return {
      loginHelp: 'Enter the operator login or account name.',
      passwordHelp: 'The password must belong to the operator account.',
      remember: 'Remember last license and login',
      clear: 'Clear',
      submit: 'Login',
      checking: 'Checking...',
      showPassword: 'Show',
      hidePassword: 'Hide',
      licenseHelp: 'Enter the club license key.',
      licenseIncomplete: 'The key is not complete yet.',
      licenseReady: 'The license format looks ready.',
      cleared: 'Saved sign-in data has been cleared.',
    }
  }

  return {
    loginHelp: "Operator login yoki account nomini kiriting.",
    passwordHelp: "Parol operator akkauntiga tegishli bo'lishi kerak.",
    remember: 'Oxirgi license va loginni eslab qol',
    clear: 'Tozalash',
    submit: 'Kirish',
    checking: 'Tekshirilmoqda...',
    showPassword: 'Show',
    hidePassword: 'Hide',
    licenseHelp: 'Klubga tegishli license kalitini kiriting.',
    licenseIncomplete: "Kalit hali to'liq emas.",
    licenseReady: "Kalit format bo'yicha tayyor.",
    cleared: "Saqlangan kirish ma'lumotlari tozalandi.",
  }
})

const licenseKeyInput = ref('')
const login = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const info = ref('')
const showPassword = ref(false)
const rememberLastLogin = ref(true)
const rememberedLicense = ref('')
const rememberedLogin = ref('')

const licenseKey = computed(() => formatLicenseKey(licenseKeyInput.value))

const canSubmit = computed(() => {
  return licenseKey.value.replace(/-/g, '').length >= 8 && login.value.trim().length >= 2 && password.value.length >= 1
})

const licenseHint = computed(() => {
  const rawLength = licenseKey.value.replace(/-/g, '').length
  if (!rawLength) return copy.value.licenseHelp
  if (rawLength < 8) return copy.value.licenseIncomplete
  return copy.value.licenseReady
})

useHead(() => ({
  title: `Login | ${appName.value}`,
}))

function formatLicenseKey(value: string) {
  const clean = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)

  const groups = clean.match(/.{1,4}/g)
  return groups ? groups.join('-') : ''
}

function normalizeAuthError(message: string) {
  const source = String(message || '').trim()
  const map: Record<string, string> = {
    'Р вЂєР С‘РЎвЂ Р ВµР Р…Р В·Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°': 'Litsenziya topilmadi.',
    'Р›РёС†РµРЅР·РёСЏ РЅРµ РЅР°Р№РґРµРЅР°': 'Litsenziya topilmadi.',
    'Р вЂєР С‘РЎвЂ Р ВµР Р…Р В·Р С‘РЎРЏ Р Р…Р Вµ Р В°Р С”РЎвЂљР С‘Р Р†Р Р…Р В°': 'Litsenziya aktiv emas.',
    'Р›РёС†РµРЅР·РёСЏ РЅРµ Р°РєС‚РёРІРЅР°': 'Litsenziya aktiv emas.',
    'Р РЋРЎР‚Р С•Р С” Р В»Р С‘РЎвЂ Р ВµР Р…Р В·Р С‘Р С‘ Р С‘РЎРѓРЎвЂљРЎвЂР С”': 'Litsenziya muddati tugagan.',
    'РЎСЂРѕРє Р»РёС†РµРЅР·РёРё РёСЃС‚С‘Рє': 'Litsenziya muddati tugagan.',
    'Р С™Р В»РЎС“Р В± Р В·Р В°Р В±Р В»Р С•Р С”Р С‘РЎР‚Р С•Р Р†Р В°Р Р…': 'Klub bloklangan.',
    'РљР»СѓР± Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ': 'Klub bloklangan.',
    'Р СњР ВµР Р†Р ВµРЎР‚Р Р…РЎвЂ№Р в„– Р В»Р С•Р С–Р С‘Р Р… Р С‘Р В»Р С‘ Р С—Р В°РЎР‚Р С•Р В»РЎРЉ': "Login yoki parol noto'g'ri.",
    'РќРµРІРµСЂРЅС‹Р№ Р»РѕРіРёРЅ РёР»Рё РїР°СЂРѕР»СЊ': "Login yoki parol noto'g'ri.",
    'Р С’Р С”Р С”Р В°РЎС“Р Р…РЎвЂљ Р С•РЎвЂљР С”Р В»РЎР‹РЎвЂЎРЎвЂР Р…': "Operator akkaunti o'chirilgan.",
    'РђРєРєР°СѓРЅС‚ РѕС‚РєР»СЋС‡С‘РЅ': "Operator akkaunti o'chirilgan.",
  }
  return map[source] || source || t('login.errorFallback')
}

function syncRememberedFromStorage() {
  if (!import.meta.client) return
  rememberedLicense.value = String(localStorage.getItem(LAST_LICENSE_KEY) || '').trim()
  rememberedLogin.value = String(localStorage.getItem(LAST_LOGIN_KEY) || '').trim()
}

function onLicenseInput() {
  licenseKeyInput.value = formatLicenseKey(licenseKeyInput.value)
}

function clearRemembered() {
  if (!import.meta.client) return
  localStorage.removeItem(LAST_LICENSE_KEY)
  localStorage.removeItem(LAST_LOGIN_KEY)
  rememberedLicense.value = ''
  rememberedLogin.value = ''
  info.value = copy.value.cleared
}

async function submitLogin() {
  if (!canSubmit.value) return

  error.value = ''
  info.value = ''
  loading.value = true

  try {
    await auth.login({
      license_key: licenseKey.value,
      login: login.value.trim(),
      password: password.value,
    })

    if (rememberLastLogin.value) {
      localStorage.setItem(LAST_LICENSE_KEY, licenseKey.value)
      localStorage.setItem(LAST_LOGIN_KEY, login.value.trim())
      syncRememberedFromStorage()
    } else {
      clearRemembered()
    }

    await navigateTo('/cp/dashboard')
  } catch (cause: any) {
    error.value = normalizeAuthError(cause?.response?.data?.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  syncRememberedFromStorage()
  const savedLicense = rememberedLicense.value
  const savedLogin = rememberedLogin.value

  if (savedLicense) licenseKeyInput.value = formatLicenseKey(savedLicense)
  if (savedLogin) login.value = savedLogin

  rememberLastLogin.value = Boolean(savedLicense || savedLogin)
})

watch(
  () => locale.value,
  () => {
    if (!error.value) {
      info.value = ''
    }
  },
)
</script>

<style scoped>
.login-screen {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #f8fafc;
  background:
    radial-gradient(880px 480px at 12% 18%, rgba(55, 232, 255, 0.28), transparent 58%),
    radial-gradient(860px 520px at 88% 80%, rgba(255, 255, 255, 0.12), transparent 60%),
    linear-gradient(135deg, #010304 0%, #04101a 46%, #010203 100%);
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
}

.ambient {
  position: absolute;
  border-radius: 999px;
  filter: blur(120px);
  opacity: 0.75;
  pointer-events: none;
}

.ambient-left {
  top: -160px;
  left: -120px;
  width: 420px;
  height: 420px;
  background: rgba(55, 232, 255, 0.36);
}

.ambient-right {
  right: -140px;
  bottom: -180px;
  width: 460px;
  height: 460px;
  background: rgba(192, 252, 255, 0.16);
}

.grid-noise {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at center, black, transparent 85%);
  pointer-events: none;
}

.login-shell {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px clamp(20px, 4vw, 48px);
}

.auth-card {
  border-radius: 28px;
  border: 1px solid rgba(95, 225, 255, 0.12);
  background: linear-gradient(180deg, rgba(4, 10, 16, 0.92), rgba(1, 5, 9, 0.9));
  box-shadow:
    0 30px 90px rgba(0, 0, 0, 0.42),
    0 0 56px rgba(55, 232, 255, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
}

.brand-wordmark {
  display: block;
  width: min(100%, 280px);
  height: auto;
  filter: drop-shadow(0 0 18px rgba(55, 232, 255, 0.2));
}

.auth-brand {
  display: flex;
  justify-content: center;
  margin-top: -6px;
  margin-bottom: -2px;
}

.auth-card {
  width: min(100%, 520px);
  padding: 28px;
  display: grid;
  min-height: auto;
  gap: 14px;
  align-content: start;
}

.auth-top {
  display: flex;
  justify-content: flex-end;
  margin-bottom: -2px;
}

.lang-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.lang-btn {
  min-width: 44px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: #f8fafc;
  cursor: pointer;
}

.lang-btn.active {
  color: #07111f;
  font-weight: 800;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(142, 247, 255, 0.8));
}

.auth-form {
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(191, 219, 254, 0.86);
}

.field small {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(148, 163, 184, 0.85);
}

.field-input {
  width: 100%;
  min-height: 52px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03));
  color: #f8fafc;
  padding: 0 16px;
  font-size: 15px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.field-input:focus {
  outline: none;
  border-color: rgba(142, 247, 255, 0.44);
  box-shadow: 0 0 0 4px rgba(55, 232, 255, 0.12);
}

.password-wrap {
  position: relative;
}

.password-input {
  padding-right: 84px;
}

.visibility-btn {
  position: absolute;
  right: 8px;
  top: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  cursor: pointer;
}

.remember-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.remember-check {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(226, 232, 240, 0.86);
}

.remember-check input {
  width: 16px;
  height: 16px;
  accent-color: #37e8ff;
}

.ghost-btn,
.submit-btn {
  min-height: 48px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease, border-color 0.18s ease;
}

.ghost-btn {
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.03);
  color: #e2e8f0;
}

.submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(55, 232, 255, 0.88));
  color: #031017;
  font-size: 15px;
  font-weight: 900;
  box-shadow: 0 18px 38px rgba(55, 232, 255, 0.2);
}

.ghost-btn:hover,
.submit-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.feedback {
  padding: 14px 16px;
  border-radius: 18px;
  font-size: 13px;
  line-height: 1.55;
}

.feedback.error {
  border: 1px solid rgba(248, 113, 113, 0.28);
  background: rgba(248, 113, 113, 0.12);
  color: #fecaca;
}

.feedback.info {
  border: 1px solid rgba(142, 247, 255, 0.24);
  background: rgba(55, 232, 255, 0.08);
  color: #d4fbff;
}

@media (max-width: 1180px) {
  .login-shell {
    padding: 24px;
  }
}

@media (max-width: 720px) {
  .login-shell {
    padding: 18px;
  }

  .auth-card {
    padding: 20px;
    border-radius: 24px;
  }

  .remember-row,
  .auth-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .auth-brand {
    justify-content: center;
    margin-top: 0;
    margin-bottom: 2px;
  }

  .lang-switch {
    width: 100%;
    justify-content: space-between;
  }

  .lang-btn {
    flex: 1;
  }
}
</style>
