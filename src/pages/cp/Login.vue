<template>
  <div class="login-shell">
    <div class="bg-orb orb1"></div>
    <div class="bg-orb orb2"></div>

    <div class="login-card">
      <div class="login-header">
        <div class="left">
          <div class="logo">MC</div>
          <div>
            <div class="title">MyCafeCloud</div>
            <div class="subtitle">{{ t('login.subtitle') }}</div>
          </div>
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

      <el-form label-position="top" @submit.prevent>
        <el-form-item :label="t('login.licenseKey')">
          <el-input
            v-model="licenseKey"
            placeholder="XXXX-XXXX-XXXX"
            size="large"
          />
        </el-form-item>

        <el-form-item :label="t('login.login')">
          <el-input
            v-model="login"
            placeholder="operator_01"
            size="large"
          />
        </el-form-item>

        <el-form-item :label="t('login.password')">
          <el-input
            v-model="password"
            type="password"
            show-password
            placeholder="********"
            size="large"
          />
        </el-form-item>

        <el-alert
          v-if="error"
          :title="error"
          type="error"
          show-icon
          style="margin-bottom: 14px"
        />

        <el-button
          type="primary"
          size="large"
          :loading="loading"
          class="login-btn"
          @click="doLogin"
        >
          {{ t('login.signIn') }}
        </el-button>
      </el-form>

      <div class="login-footer">
        &copy; {{ new Date().getFullYear() }} MyCafeCloud
        <span>{{ t('login.footer') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCpAuthStore } from '../../stores/cpAuth'
import { useI18n } from '../../i18n'

const router = useRouter()
const auth = useCpAuthStore()
const { t, locale, setLocale, supportedLocales } = useI18n()

const licenseKey = ref('')
const login = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const doLogin = async () => {
  error.value = ''
  loading.value = true
  try {
    await auth.login({
      license_key: licenseKey.value.trim(),
      login: login.value.trim(),
      password: password.value,
    })
    router.push('/cp/dashboard')
  } catch (e) {
    error.value = e?.response?.data?.message || t('login.errorFallback')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background:
    radial-gradient(900px 500px at 20% 10%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(700px 500px at 80% 70%, rgba(34, 197, 94, 0.16), transparent 60%),
    linear-gradient(180deg, #050914, #0b1220);
  overflow: hidden;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.6;
}

.orb1 {
  width: 420px;
  height: 420px;
  background: #2563eb;
  top: -120px;
  left: -120px;
}

.orb2 {
  width: 380px;
  height: 380px;
  background: #22c55e;
  bottom: -140px;
  right: -140px;
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: 26px 26px 20px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(9, 14, 28, 0.95));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.6);
  position: relative;
  z-index: 2;
}

.login-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 18px;
}

.left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.35);
}

.title {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.3px;
}

.subtitle {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 2px;
}

.lang-switch {
  display: flex;
  align-items: center;
  gap: 6px;
}

.lang-btn {
  border: 1px solid var(--stroke);
  background: rgba(2, 6, 23, 0.35);
  color: var(--text);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}

.lang-btn.active {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(59, 130, 246, 0.18);
}

.login-btn {
  width: 100%;
  margin-top: 6px;
  border-radius: 14px;
  font-weight: 700;
}

.login-footer {
  margin-top: 16px;
  font-size: 11px;
  opacity: 0.55;
  text-align: center;
}

.login-footer span {
  display: block;
  margin-top: 4px;
}
</style>

