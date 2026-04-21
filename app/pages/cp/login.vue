<template>
  <div class="login-screen">
    <div class="ambient ambient-left" />
    <div class="ambient ambient-right" />
    <div class="grid-noise" />

    <section class="login-shell">
      <aside class="story-panel">
        <div class="story-top">
          <div class="brand-badge">{{ brandInitials }}</div>
          <div>
            <p class="eyebrow">{{ copy.kicker }}</p>
            <h1>{{ appName }}</h1>
            <p class="lead">{{ copy.lead }}</p>
          </div>
        </div>

        <div class="trust-grid">
          <article v-for="item in trustCards" :key="item.title" class="trust-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.body }}</p>
          </article>
        </div>

        <div class="status-strip">
          <div class="status-pill">
            <span class="status-dot" />
            <strong>{{ copy.status }}</strong>
          </div>
          <div class="status-copy">
            <span>{{ copy.lastLogin }}</span>
            <strong>{{ rememberedLoginLabel }}</strong>
          </div>
        </div>
      </aside>

      <main class="auth-card">
        <div class="auth-head">
          <div>
            <p class="eyebrow">{{ copy.signInKicker }}</p>
            <h2>{{ t('login.signIn') }}</h2>
            <p class="auth-sub">{{ copy.authSub }}</p>
          </div>

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
            <span>{{ loading ? copy.checking : t('login.signIn') }}</span>
          </button>
        </form>

        <footer class="auth-foot">
          <span>{{ appName }}</span>
          <strong>{{ currentYear }}</strong>
        </footer>
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

const appName = computed(() => String(runtimeConfig.public.appName || 'Control Panel'))
const brandInitials = computed(() => {
  const parts = appName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() || '')
  return parts.join('') || 'CP'
})

const copy = computed(() => {
  if (locale.value === 'ru') {
    return {
      kicker: 'Operator access',
      lead: 'Быстрый вход в панель управления сменой, клиентами, бронированиями и компьютерами.',
      signInKicker: 'Secure sign-in',
      authSub: 'Введите лицензию клуба и данные оператора для входа в систему.',
      status: 'Online',
      lastLogin: 'Последний вход',
      loginHelp: 'Введите логин оператора или имя аккаунта.',
      passwordHelp: 'Пароль должен принадлежать аккаунту оператора.',
      remember: 'Запомнить лицензию и логин',
      clear: 'Очистить',
      checking: 'Проверка...',
      showPassword: 'Show',
      hidePassword: 'Hide',
      emptyRemembered: 'Новый вход',
      licenseHelp: 'Введите лицензионный ключ клуба.',
      licenseIncomplete: 'Ключ заполнен не полностью.',
      licenseReady: 'Формат ключа выглядит корректно.',
      cleared: 'Сохраненные данные входа очищены.',
      defaultInfo: 'Введите лицензионный ключ, логин и пароль.',
    }
  }

  if (locale.value === 'en') {
    return {
      kicker: 'Operator access',
      lead: 'Fast access point for shifts, clients, bookings, and PC operations.',
      signInKicker: 'Secure sign-in',
      authSub: 'Use the club license key and operator credentials to enter the control panel.',
      status: 'Online',
      lastLogin: 'Last sign-in',
      loginHelp: 'Enter the operator login or account name.',
      passwordHelp: 'The password must belong to the operator account.',
      remember: 'Remember last license and login',
      clear: 'Clear',
      checking: 'Checking...',
      showPassword: 'Show',
      hidePassword: 'Hide',
      emptyRemembered: 'New sign-in',
      licenseHelp: 'Enter the club license key.',
      licenseIncomplete: 'The key is not complete yet.',
      licenseReady: 'The license format looks ready.',
      cleared: 'Saved sign-in data has been cleared.',
      defaultInfo: 'Enter license key, login, and password.',
    }
  }

  return {
    kicker: 'Operator access',
    lead: "Klubning smena, mijoz, booking va PC boshqaruvi uchun tezkor kirish nuqtasi.",
    signInKicker: 'Secure sign-in',
    authSub: "Tizimga kirish uchun klub litsenziyasi va operator ma'lumotlarini kiriting.",
    status: 'Online',
    lastLogin: 'Oxirgi login',
    loginHelp: "Operator login yoki account nomini kiriting.",
    passwordHelp: "Parol operator akkauntiga tegishli bo'lishi kerak.",
    remember: 'Oxirgi license va loginni eslab qol',
    clear: 'Tozalash',
    checking: 'Tekshirilmoqda...',
    showPassword: 'Show',
    hidePassword: 'Hide',
    emptyRemembered: 'Yangi kirish',
    licenseHelp: 'Klubga tegishli license kalitini kiriting.',
    licenseIncomplete: "Kalit hali to'liq emas.",
    licenseReady: "Kalit format bo'yicha tayyor.",
    cleared: "Saqlangan kirish ma'lumotlari tozalandi.",
    defaultInfo: "Litsenziya kaliti, login va parolni kiriting.",
  }
})

const trustCards = computed(() => {
  if (locale.value === 'ru') {
    return [
      {
        label: 'Shift ready',
        title: 'Касса, сессии, возвраты',
        body: 'Ключевые действия оператора собраны в одном рабочем потоке.',
      },
      {
        label: 'Fast control',
        title: 'PC и client ops',
        body: 'Загрузка зала, пополнение, бронирования и сигналы доступны из одной панели.',
      },
      {
        label: 'Secure access',
        title: 'Лицензия и оператор',
        body: 'Каждый вход проходит проверку лицензии клуба и аккаунта оператора.',
      },
    ]
  }

  if (locale.value === 'en') {
    return [
      {
        label: 'Shift ready',
        title: 'Cash, sessions, returns',
        body: 'Core operator tasks stay in one clear workflow.',
      },
      {
        label: 'Fast control',
        title: 'PC and client ops',
        body: 'Occupancy, top-up, bookings, and alerts stay inside one panel.',
      },
      {
        label: 'Secure access',
        title: 'License and operator auth',
        body: 'Every sign-in is checked against the club license and operator account.',
      },
    ]
  }

  return [
    {
      label: 'Shift ready',
      title: 'Kassa, sessiya, qaytarishlar',
      body: "Operatorga kerak bo'lgan asosiy ishlar bitta oqimda yuradi.",
    },
    {
      label: 'Fast control',
      title: 'PC va client ops',
      body: 'Bandlik, topup, booking va signal bir panel ichida boshqariladi.',
    },
    {
      label: 'Secure access',
      title: 'License va operator auth',
      body: 'Har bir kirish klub litsenziyasi va operator akkaunti bilan tekshiriladi.',
    },
  ]
})

const licenseKeyInput = ref('')
const login = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const info = ref(copy.value.defaultInfo)
const showPassword = ref(false)
const rememberLastLogin = ref(true)
const rememberedLicense = ref('')
const rememberedLogin = ref('')

const licenseKey = computed(() => formatLicenseKey(licenseKeyInput.value))
const currentYear = new Date().getFullYear()

const canSubmit = computed(() => {
  return licenseKey.value.replace(/-/g, '').length >= 8 && login.value.trim().length >= 2 && password.value.length >= 1
})

const rememberedLoginLabel = computed(() => {
  const savedLicense = rememberedLicense.value
  const savedLogin = rememberedLogin.value
  if (!savedLicense && !savedLogin) return copy.value.emptyRemembered
  if (!savedLicense) return savedLogin
  if (!savedLogin) return savedLicense
  return `${savedLicense} | ${savedLogin}`
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
  info.value = copy.value.defaultInfo
})

watch(
  () => locale.value,
  () => {
    if (!error.value) {
      info.value = copy.value.defaultInfo
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
    radial-gradient(900px 480px at 10% 12%, rgba(37, 99, 235, 0.32), transparent 60%),
    radial-gradient(960px 520px at 88% 84%, rgba(22, 163, 74, 0.22), transparent 60%),
    linear-gradient(135deg, #030713 0%, #07152c 45%, #020611 100%);
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
  background: rgba(59, 130, 246, 0.42);
}

.ambient-right {
  right: -140px;
  bottom: -180px;
  width: 460px;
  height: 460px;
  background: rgba(16, 185, 129, 0.28);
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
  display: grid;
  grid-template-columns: minmax(320px, 1.1fr) minmax(360px, 460px);
  gap: 28px;
  align-items: stretch;
  padding: 40px clamp(20px, 4vw, 48px);
}

.story-panel,
.auth-card {
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(10, 18, 36, 0.88), rgba(4, 10, 24, 0.82));
  box-shadow:
    0 30px 90px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
}

.story-panel {
  padding: 36px;
  display: grid;
  gap: 28px;
  min-height: 620px;
  align-content: space-between;
}

.story-top {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 18px;
  align-items: start;
}

.brand-badge {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  font-size: 28px;
  font-weight: 900;
  color: #f8fafc;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.88), rgba(34, 197, 94, 0.72));
  box-shadow: 0 12px 30px rgba(37, 99, 235, 0.28);
}

.eyebrow {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(103, 232, 249, 0.9);
}

.story-top h1,
.auth-head h2 {
  margin: 8px 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.story-top h1 {
  font-size: clamp(34px, 4vw, 56px);
  line-height: 0.98;
}

.lead {
  margin: 14px 0 0;
  max-width: 620px;
  font-size: 17px;
  line-height: 1.65;
  color: rgba(226, 232, 240, 0.82);
}

.trust-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.trust-card {
  min-height: 180px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(59, 130, 246, 0.08), transparent 55%),
    rgba(255, 255, 255, 0.03);
}

.trust-card span {
  display: block;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.88);
}

.trust-card strong {
  display: block;
  margin-top: 10px;
  font-size: 19px;
  line-height: 1.2;
}

.trust-card p {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(203, 213, 225, 0.78);
}

.status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.12);
}

.status-copy span {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(148, 163, 184, 0.88);
}

.status-copy strong {
  display: block;
  margin-top: 6px;
}

.auth-card {
  padding: 28px;
  display: grid;
  min-height: 620px;
  gap: 24px;
  align-content: space-between;
}

.auth-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.auth-head h2 {
  font-size: 34px;
  line-height: 1;
}

.auth-sub {
  margin: 12px 0 0;
  max-width: 340px;
  color: rgba(203, 213, 225, 0.78);
  line-height: 1.6;
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
  background: linear-gradient(135deg, rgba(253, 224, 71, 0.95), rgba(103, 232, 249, 0.72));
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
  border-color: rgba(103, 232, 249, 0.46);
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.12);
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
  accent-color: #22c55e;
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
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.94), rgba(16, 185, 129, 0.82));
  color: #06111d;
  font-size: 15px;
  font-weight: 900;
  box-shadow: 0 18px 38px rgba(37, 99, 235, 0.22);
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
  border: 1px solid rgba(103, 232, 249, 0.24);
  background: rgba(14, 165, 233, 0.1);
  color: #bae6fd;
}

.auth-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 6px;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.88);
}

@media (max-width: 1180px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .story-panel {
    min-height: auto;
  }

  .trust-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .login-shell {
    padding: 18px;
  }

  .story-panel,
  .auth-card {
    padding: 20px;
    border-radius: 24px;
  }

  .story-top {
    grid-template-columns: 56px 1fr;
  }

  .brand-badge {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    font-size: 22px;
  }

  .auth-head,
  .remember-row,
  .auth-foot,
  .status-strip {
    flex-direction: column;
    align-items: flex-start;
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
