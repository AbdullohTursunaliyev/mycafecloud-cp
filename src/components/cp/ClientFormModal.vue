<template>
  <div class="modal-overlay" @mousedown.self="close">
    <div class="modal-shell">
      <header class="modal-head">
        <div>
          <p class="kicker">NEW CLIENT</p>
          <h2>Новый клиент</h2>
          <p class="sub">Создайте аккаунт быстро: оператору достаточно логина, пароля и при необходимости имени с телефоном.</p>
        </div>
        <button class="icon-btn" type="button" aria-label="Закрыть" @click="close">×</button>
      </header>

      <div class="content-grid">
        <section class="panel">
          <h3>Основные данные</h3>
          <div class="field-grid">
            <label class="field">
              <span>Логин</span>
              <input v-model="form.login" class="field-input" placeholder="Например: 506773367" />
            </label>

            <label class="field">
              <span>Имя клиента</span>
              <input v-model="form.name" class="field-input" placeholder="Например: Azizbek" />
            </label>

            <label class="field">
              <span>Телефон</span>
              <input v-model="form.phone" class="field-input" inputmode="tel" placeholder="+998 __ ___ __ __" />
            </label>
          </div>
        </section>

        <section class="panel">
          <h3>Пароль</h3>
          <div class="field-grid">
            <label class="field">
              <span>Пароль</span>
              <div class="password-field">
                <input
                  v-model="form.password"
                  class="field-input with-action"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Введите пароль"
                />
                <button class="mini-btn" type="button" @click="showPassword = !showPassword">
                  {{ showPassword ? 'Скрыть' : 'Показать' }}
                </button>
              </div>
            </label>

            <label class="field">
              <span>Повтор пароля</span>
              <input
                v-model="form.password_confirm"
                class="field-input"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Повторите пароль"
              />
            </label>
          </div>

          <div class="quick-passwords">
            <button class="quick-btn" type="button" @click="applyPassword('1234')">Заполнить паролем 1234</button>
          </div>

          <p class="hint">Один клик подставляет пароль сразу в оба поля.</p>
        </section>
      </div>

      <p v-if="error" class="inline-error">{{ error }}</p>

      <footer class="modal-foot">
        <button class="action-btn ghost" type="button" @click="close">Отмена</button>
        <button class="action-btn primary" :disabled="saving" type="button" @click="submit">
          {{ saving ? '...' : 'Создать клиента' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { cpApi } from '../../api/cp'

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'created'])

const saving = ref(false)
const error = ref('')
const showPassword = ref(false)

const form = reactive({
  login: '',
  name: '',
  phone: '',
  password: '',
  password_confirm: '',
})

function applyPassword(value) {
  form.password = value
  form.password_confirm = value
}

function close() {
  emit('close')
}

async function submit() {
  error.value = ''
  if (!form.login.trim()) return (error.value = 'Введите логин')
  if (!form.password) return (error.value = 'Введите пароль')
  if (form.password.length < 4) return (error.value = 'Пароль слишком короткий')
  if (form.password !== form.password_confirm) return (error.value = 'Пароли не совпадают')

  saving.value = true
  try {
    const payload = {
      login: form.login.trim(),
      password: form.password,
    }
    if (form.name?.trim()) payload.name = form.name.trim()
    if (form.phone?.trim()) payload.phone = form.phone.trim()
    await cpApi.createClient(payload)
    emit('created')
  } catch (e) {
    error.value = e?.response?.data?.message || 'Не удалось создать клиента'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(7, 16, 30, 0.36);
  backdrop-filter: blur(10px);
}

.modal-shell {
  width: min(960px, 100%);
  border-radius: 26px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  color: var(--text);
  box-shadow: var(--shadow-panel);
}

.modal-head,
.modal-foot {
  padding: 24px;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--stroke);
}

.kicker {
  margin: 0 0 10px;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand);
}

.modal-head h2 {
  margin: 0;
  font-size: 32px;
}

.sub {
  margin: 10px 0 0;
  max-width: 620px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.icon-btn,
.mini-btn,
.quick-btn,
.action-btn {
  border: 1px solid var(--stroke);
  border-radius: 14px;
  font: inherit;
}

.icon-btn {
  width: 42px;
  height: 42px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 24px;
  line-height: 1;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  padding: 24px 24px 0;
}

.panel {
  padding: 22px;
  border-radius: 20px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
}

.panel h3 {
  margin: 0 0 16px;
  font-size: 18px;
}

.field-grid {
  display: grid;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span,
.hint {
  color: var(--text-muted);
  font-size: 12px;
}

.field-input {
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--bg-elevated);
  color: var(--text);
  font: inherit;
}

.field-input::placeholder {
  color: var(--text-faint);
}

.password-field {
  position: relative;
}

.with-action {
  padding-right: 124px;
}

.mini-btn {
  position: absolute;
  top: 50%;
  right: 8px;
  min-height: 38px;
  padding: 0 14px;
  transform: translateY(-50%);
  background: var(--surface-muted);
  color: var(--text);
  font-weight: 700;
}

.quick-passwords {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.quick-btn {
  min-height: 46px;
  padding: 0 18px;
  background: color-mix(in srgb, var(--brand-secondary) 10%, var(--surface-muted));
  color: var(--text);
  font-weight: 700;
}

.hint {
  margin: 10px 0 0;
}

.inline-error {
  margin: 20px 24px 0;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--stroke));
  border-radius: 16px;
  background: color-mix(in srgb, var(--danger) 10%, var(--surface-soft));
  color: var(--danger);
  font-size: 13px;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid var(--stroke);
}

.action-btn {
  min-height: 46px;
  padding: 0 18px;
  background: var(--surface-muted);
  color: var(--text);
  font-weight: 700;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--brand-secondary), color-mix(in srgb, var(--brand-secondary) 72%, var(--brand) 28%));
  border-color: color-mix(in srgb, var(--brand-secondary) 55%, var(--stroke));
  color: #fff;
}

.action-btn.ghost {
  background: var(--surface-soft);
}

:global(html[data-theme='light'] .modal-overlay) {
  background: rgba(148, 163, 184, 0.28);
}

:global(html[data-theme='dark'] .modal-overlay) {
  background: rgba(7, 16, 30, 0.54);
}

@media (max-width: 840px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .modal-foot {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}

@media (max-width: 620px) {
  .modal-overlay {
    padding: 16px;
  }

  .modal-head,
  .modal-foot,
  .content-grid {
    padding-left: 18px;
    padding-right: 18px;
  }

  .modal-head h2 {
    font-size: 26px;
  }

  .panel {
    padding: 18px;
  }

  .quick-btn {
    width: 100%;
  }
}
</style>
