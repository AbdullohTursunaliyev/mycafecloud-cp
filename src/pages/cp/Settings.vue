<template>
  <div class="settings-page">
    <section class="hero card-flat">
      <div>
        <h1 class="hero-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7a3 3 0 0 1 3-3h3l2 2h5a3 3 0 0 1 3 3v2H4V7z" fill="currentColor" opacity="0.4"/>
              <path d="M4 11h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-5z" fill="currentColor"/>
            </svg>
          </span>
          Club Settings
        </h1>
        <p>Klub nomi, logo va kartadagi joylashuvni belgilang.</p>
      </div>
      <button class="btn ghost" :disabled="loading" @click="loadSettings">
        <span class="btn-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M20 4v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        {{ loading ? "Yuklanmoqda..." : "Qayta yuklash" }}
      </button>
    </section>

    <section class="grid">
      <article class="card-flat panel panel-wide">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6a2 2 0 0 1 2-2h6l4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" fill="currentColor" opacity="0.35"/>
              <path d="M10 11h6M10 15h6M8 11h.01M8 15h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
          Asosiy ma'lumot
        </h2>
        <label class="field">
          <span>Klub nomi</span>
          <input v-model="form.clubName" class="input" placeholder="Masalan: MyCafeCloud Chilonzor" />
        </label>
      </article>

      <article class="card-flat panel">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7z" fill="currentColor" opacity="0.35"/>
              <path d="M8 15l3-3 2 2 3-3 2 4H8z" fill="currentColor"/>
              <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
            </svg>
          </span>
          Logo
        </h2>
        <div class="logo-row">
          <div class="logo-box">
            <img v-if="form.clubLogo" :src="form.clubLogo" alt="Club logo" />
            <span v-else>Logo yo'q</span>
          </div>
          <div class="logo-actions">
            <input ref="logoInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" @change="onLogoSelected" />
            <button class="btn ghost" type="button" @click="clearLogo">Logoni olib tashlash</button>
          </div>
        </div>
      </article>

      <article class="card-flat panel">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6z" fill="currentColor" opacity="0.35"/>
              <path d="M10 9l6 3-6 3V9z" fill="currentColor"/>
            </svg>
          </span>
          Shell promo video
        </h2>
        <p class="hint">Login sahifasida ko'rsatiladigan promo rolik URL. MP4 yoki WebM tavsiya qilinadi.</p>
        <div class="promo-grid">
          <div class="promo-col">
            <label class="field">
              <span>Promo video URL</span>
              <input v-model="form.promoVideoUrl" class="input" placeholder="https://cdn.yourdomain.com/promo.mp4" />
            </label>
            <div class="promo-upload">
              <label class="field">
                <span>Yoki promo fayl yuklash (MP4/WebM/GIF)</span>
                <input ref="promoFileInput" class="input file" type="file" accept="video/mp4,video/webm,image/gif" @change="onPromoFileSelected" />
              </label>
              <div class="promo-actions">
                <button class="btn primary" type="button" :disabled="promoUploading || !promoFile" @click="uploadPromoFile">
                  {{ promoUploading ? "Yuklanmoqda..." : "Yuklash" }}
                </button>
                <span v-if="promoFileName" class="hint">{{ promoFileName }}</span>
              </div>
            </div>
          </div>
          <div class="promo-col">
            <div class="promo-preview">
              <div class="promo-preview-head">Preview</div>
              <div class="promo-preview-box">
                <img v-if="promoPreviewType === 'gif'" :src="promoPreviewUrl" alt="promo preview" />
                <video v-else-if="promoPreviewType === 'video'" :src="promoPreviewUrl" muted autoplay loop playsinline></video>
                <iframe v-else-if="promoPreviewType === 'youtube'" :src="promoPreviewUrl" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
                <div v-else class="hint">Preview mavjud emas</div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article class="card-flat panel">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7z" fill="currentColor" opacity="0.35"/>
              <path d="M7 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M9 13h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
          Quick Install (Agent + Shell)
        </h2>
        <p class="hint">Bu bo'lim orqali avtomatik o'rnatish uchun installer URL va parametrlarni saqlaysiz.</p>

        <div class="deploy-grid">
          <div class="deploy-col">
            <label class="field">
              <span>Client installer URL (all‑in‑one)</span>
              <input v-model="form.clientInstallerUrl" class="input" placeholder="https://cdn.yourdomain.com/mycafe-client-setup.exe" />
            </label>
            <div class="promo-upload">
              <label class="field">
                <span>Yoki Client fayl yuklash (EXE/MSI/ZIP)</span>
                <input ref="clientFileInput" class="input file" type="file" accept=".exe,.msi,.zip" @change="onClientFileSelected" />
              </label>
              <div class="promo-actions">
                <button class="btn primary" type="button" :disabled="clientUploading || !clientFile" @click="uploadClientFile">
                  {{ clientUploading ? "Yuklanmoqda..." : "Yuklash" }}
                </button>
                <span v-if="clientFileName" class="hint">{{ clientFileName }}</span>
              </div>
            </div>
            <label class="field">
              <span>Client install args</span>
              <input v-model="form.clientInstallArgs" class="input" placeholder='--install SERVER_URL="{SERVER}" PAIR_CODE="{PAIR_CODE}"' />
            </label>

            <label class="field">
              <span>Agent installer URL</span>
              <input v-model="form.agentInstallerUrl" class="input" placeholder="https://cdn.yourdomain.com/agent-setup.exe" />
            </label>
            <div class="promo-upload">
              <label class="field">
                <span>Yoki Agent fayl yuklash (EXE/MSI/ZIP)</span>
                <input ref="agentFileInput" class="input file" type="file" accept=".exe,.msi,.zip" @change="onAgentFileSelected" />
              </label>
              <div class="promo-actions">
                <button class="btn primary" type="button" :disabled="agentUploading || !agentFile" @click="uploadAgentFile">
                  {{ agentUploading ? "Yuklanmoqda..." : "Yuklash" }}
                </button>
                <span v-if="agentFileName" class="hint">{{ agentFileName }}</span>
              </div>
            </div>
            <label class="field">
              <span>Agent install args</span>
              <input v-model="form.agentInstallArgs" class="input" placeholder='/quiet SERVER_URL="{SERVER}" PAIR_CODE="{PAIR_CODE}"' />
            </label>
            <label class="field">
              <span>Agent SHA256 (auto)</span>
              <input v-model="form.agentHash" class="input" placeholder="auto-hash" readonly />
            </label>
          </div>

          <div class="deploy-col">
            <label class="field">
              <span>Shell installer URL</span>
              <input v-model="form.shellInstallerUrl" class="input" placeholder="https://cdn.yourdomain.com/shell-setup.exe" />
            </label>
            <div class="promo-upload">
              <label class="field">
                <span>Yoki Shell fayl yuklash (EXE/MSI/ZIP)</span>
                <input ref="shellFileInput" class="input file" type="file" accept=".exe,.msi,.zip" @change="onShellFileSelected" />
              </label>
              <div class="promo-actions">
                <button class="btn primary" type="button" :disabled="shellUploading || !shellFile" @click="uploadShellFile">
                  {{ shellUploading ? "Yuklanmoqda..." : "Yuklash" }}
                </button>
                <span v-if="shellFileName" class="hint">{{ shellFileName }}</span>
              </div>
            </div>
            <label class="field">
              <span>Shell install args</span>
              <input v-model="form.shellInstallArgs" class="input" placeholder='/quiet SERVER_URL="{SERVER}"' />
            </label>
            <label class="field">
              <span>Shell SHA256 (auto)</span>
              <input v-model="form.shellHash" class="input" placeholder="auto-hash" readonly />
            </label>
          </div>
        </div>
      </article>

      <article class="card-flat panel">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" fill="currentColor" opacity="0.35"/>
              <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
          Shell Autostart
        </h2>
        <p class="hint">Windows ishga tushganda Shell avtomatik ochiladi. Machine tanlansa barcha userlar uchun.</p>

        <label class="toggle-field">
          <input v-model="form.shellAutostartEnabled" type="checkbox" />
          <span>Autostart yoqilgan</span>
        </label>

        <div class="deploy-grid">
          <div class="deploy-col">
            <label class="field">
              <span>Shell EXE path</span>
              <input v-model="form.shellAutostartPath" class="input" placeholder="C:\\Program Files\\MyCafeCloud\\MyCafeCloud.exe" />
            </label>
            <label class="field">
              <span>Shell args</span>
              <input v-model="form.shellAutostartArgs" class="input" placeholder="--kiosk" />
            </label>
          </div>
          <div class="deploy-col">
            <label class="field">
              <span>Scope</span>
              <select v-model="form.shellAutostartScope" class="input">
                <option value="machine">Machine (HKLM)</option>
                <option value="user">User (HKCU)</option>
              </select>
            </label>
          </div>
        </div>
      </article>

      <article class="card-flat panel danger-panel">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4l9 16H3l9-16z" fill="currentColor" opacity="0.35"/>
              <path d="M12 9v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="17" r="1.2" fill="currentColor"/>
            </svg>
          </span>
          Explorer’ni Shell bilan almashtirish (Kiosk)
        </h2>
        <p class="hint">Bu rejimda Windows desktop o‘rniga Shell ishlaydi. Noto‘g‘ri path bo‘lsa PC bo‘sh ochilishi mumkin.</p>

        <label class="toggle-field">
          <input v-model="form.shellReplaceEnabled" type="checkbox" />
          <span>Explorer o‘rniga Shell</span>
        </label>

        <div class="deploy-grid">
          <div class="deploy-col">
            <label class="field">
              <span>Shell EXE path</span>
              <input v-model="form.shellReplacePath" class="input" placeholder="C:\\Program Files\\MyCafeCloud\\MyCafeCloud.exe" />
            </label>
            <label class="field">
              <span>Shell args</span>
              <input v-model="form.shellReplaceArgs" class="input" placeholder="--kiosk" />
            </label>
          </div>
        </div>
      </article>
    </section>

    <section class="card-flat panel">
      <h2 class="section-title">
        <span class="title-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a7 7 0 0 1 7 7c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 7-7z" fill="currentColor" opacity="0.35"/>
            <circle cx="12" cy="10" r="3" fill="currentColor"/>
          </svg>
        </span>
        Klub lokatsiyasi
      </h2>
      <div class="loc-grid">
        <label class="field">
          <span>Manzil</span>
          <input v-model="form.address" class="input" placeholder="Toshkent, Chilonzor..." />
        </label>
        <label class="field">
          <span>Latitude</span>
          <input v-model="form.lat" class="input" placeholder="41.2995" />
        </label>
        <label class="field">
          <span>Longitude</span>
          <input v-model="form.lng" class="input" placeholder="69.2401" />
        </label>
      </div>
      <div class="loc-actions">
        <button class="btn ghost" type="button" @click="useMyLocation">Mening lokatsiyam</button>
        <a v-if="mapExternalUrl" class="btn ghost" :href="mapExternalUrl" target="_blank" rel="noopener">Xaritada ochish</a>
      </div>
      <div v-if="mapEmbedUrl" class="map-wrap">
        <iframe :src="mapEmbedUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>
      <div v-else class="hint">Map preview uchun lat/lng kiriting.</div>
    </section>

    <section class="card-flat panel">
      <h2 class="section-title">
        <span class="title-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5l16 6-16 6 3-6-3-6z" fill="currentColor" opacity="0.35"/>
            <path d="M9 12l8-5-5 8-3-3z" fill="currentColor"/>
          </svg>
        </span>
        Telegram bildirishnoma
      </h2>
      <p class="hint">Smena ochilishi/yopilishi haqida xabar yuboriladi. Bo'sh qoldirsangiz hech narsa yuborilmaydi.</p>
      <div class="loc-grid tg-grid">
        <label class="field">
          <span>Telegram bot token</span>
          <input v-model="form.telegramBotToken" class="input" type="password" placeholder="123456:ABC-DEF..." />
        </label>
        <label class="field">
          <span>Telegram user (@username yoki chat_id)</span>
          <input v-model="form.telegramUser" class="input" placeholder="@club_owner yoki 123456789" />
        </label>
        <label class="field">
          <span>Telegram chat_id (ixtiyoriy)</span>
          <input v-model="form.telegramChatId" class="input" placeholder="-1001234567890" />
        </label>
      </div>
      <label class="toggle-field">
        <input v-model="form.telegramShiftNotifications" type="checkbox" />
        <span>Smena xabarlarini yuborish</span>
      </label>
    </section>

    <section class="card-flat panel">
      <h2 class="section-title">
        <span class="title-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.35"/>
            <path d="M12 7v5l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        Auto smena
      </h2>
      <p class="hint">Yoqilsa smena belgilangan jadval bo'yicha avtomatik ochilib/yopiladi.</p>
      <label class="toggle-field">
        <input v-model="form.autoShiftEnabled" type="checkbox" @change="onAutoShiftEnabledChange" />
        <span>Auto smena yoqilgan</span>
      </label>
      <div class="loc-actions">
        <button class="btn ghost" type="button" @click="openAutoShiftModal">Jadvalni sozlash</button>
      </div>
      <div v-if="form.autoShiftEnabled && form.autoShiftSlots.length" class="table-wrap auto-table">
        <div class="thead trow cols-auto-shift">
          <span>#</span><span>Nomi</span><span>Boshlanish</span><span>Tugash</span>
        </div>
        <div class="trow cols-auto-shift" v-for="(slot, idx) in form.autoShiftSlots" :key="`auto-slot-${idx}`">
          <span>{{ idx + 1 }}</span>
          <span>{{ slot.label || `Smena ${idx + 1}` }}</span>
          <span>{{ slot.start }}</span>
          <span>{{ slot.end }}</span>
        </div>
      </div>
    </section>

    <section class="card-flat panel staff-panel">
      <div class="staff-head">
        <div>
          <h2 class="section-title">
            <span class="title-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="currentColor" opacity="0.35"/>
                <path d="M2 20a6 6 0 0 1 12 0v1H2v-1zM14.5 21v-1a7.5 7.5 0 0 0-1.35-4.3A5 5 0 0 1 22 19v2h-7.5z" fill="currentColor"/>
              </svg>
            </span>
            Jamoa va ish haqi
          </h2>
          <p class="hint">Owner bu yerda operator/admin qo‘shadi, stavka belgilaydi va ishlagan kunlar bo‘yicha hisobni ko‘radi.</p>
        </div>
        <button class="btn ghost" type="button" :disabled="operatorsLoading || payrollLoading" @click="loadStaffData">
          {{ operatorsLoading || payrollLoading ? "Yangilanmoqda..." : "Jamoani yangilash" }}
        </button>
      </div>

      <div class="staff-layout">
        <form class="staff-create" @submit.prevent="createOperator">
          <div class="staff-card-title">Yangi xodim</div>
          <div class="staff-create-grid">
            <label class="field">
              <span>Ism</span>
              <input v-model="operatorForm.name" class="input" placeholder="Masalan: Aziz" />
            </label>
            <label class="field">
              <span>Login</span>
              <input v-model="operatorForm.login" class="input" placeholder="aziz.operator" />
            </label>
            <label class="field">
              <span>Parol</span>
              <input v-model="operatorForm.password" class="input" type="password" placeholder="Kamida 4 belgi" />
            </label>
            <label class="field">
              <span>Rol</span>
              <select v-model="operatorForm.role" class="input">
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label class="field">
              <span>Ish haqi turi</span>
              <select v-model="operatorForm.salaryType" class="input">
                <option value="daily">Kunlik</option>
                <option value="monthly">Oylik</option>
              </select>
            </label>
            <label class="field">
              <span>Stavka</span>
              <input v-model.number="operatorForm.salaryAmount" class="input" type="number" min="0" step="1000" placeholder="0" />
            </label>
          </div>
          <button class="btn primary staff-submit" type="submit" :disabled="operatorSaving">
            {{ operatorSaving ? "Qo‘shilmoqda..." : "Operator/Admin qo‘shish" }}
          </button>
        </form>

        <div class="staff-payroll">
          <div class="staff-payroll-top">
            <div>
              <div class="staff-card-title">Hisob-kitob</div>
              <p class="hint">Kunlik stavka ishlagan kunlarga ko‘payadi, oylik stavka oy uchun hisoblanadi.</p>
            </div>
            <div class="payroll-filter">
              <label class="field compact">
                <span>Dan</span>
                <input v-model="payrollFilter.from" class="input" type="date" />
              </label>
              <label class="field compact">
                <span>Gacha</span>
                <input v-model="payrollFilter.to" class="input" type="date" />
              </label>
              <button class="btn ghost" type="button" :disabled="payrollLoading" @click="loadPayroll">
                Hisoblash
              </button>
            </div>
          </div>
          <div class="payroll-metrics">
            <div class="payroll-metric">
              <span>To‘lanadi</span>
              <strong>{{ money(payroll?.summary?.net_payable_total || 0) }}</strong>
            </div>
            <div class="payroll-metric">
              <span>Jarima</span>
              <strong>{{ money(payroll?.summary?.penalty_total || 0) }}</strong>
            </div>
            <div class="payroll-metric">
              <span>Ishlagan kun</span>
              <strong>{{ payroll?.summary?.worked_days_total || 0 }}</strong>
            </div>
          </div>

          <div class="payroll-tools">
            <div class="staff-card-title">Bonus / jarima / avans</div>
            <div class="payroll-action-grid">
              <label class="field">
                <span>Xodim</span>
                <select v-model.number="payrollAction.operatorId" class="input">
                  <option :value="0">Tanlang</option>
                  <option v-for="staff in staffOperators" :key="`adj-${staff.id}`" :value="staff.id">
                    {{ staff.name }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>Turi</span>
                <select v-model="payrollAction.type" class="input">
                  <option value="bonus">Bonus</option>
                  <option value="penalty">Jarima</option>
                  <option value="advance">Avans</option>
                  <option value="correction">Tuzatish</option>
                </select>
              </label>
              <label class="field">
                <span>Summa</span>
                <input v-model.number="payrollAction.amount" class="input" type="number" step="1000" />
              </label>
              <label class="field">
                <span>Sana</span>
                <input v-model="payrollAction.date" class="input" type="date" />
              </label>
            </div>
            <label class="field">
              <span>Izoh</span>
              <input v-model="payrollAction.note" class="input" placeholder="Masalan: yaxshi smena uchun bonus" />
            </label>
            <div class="payroll-tool-actions">
              <button class="btn primary" type="button" :disabled="payrollBusy" @click="createPayrollAdjustment">
                Qo‘shish
              </button>
              <button class="btn ghost" type="button" :disabled="payrollBusy" @click="generatePayrollPeriod">
                Payroll period yaratish
              </button>
              <button class="btn ghost" type="button" :disabled="payrollBusy" @click="exportPayrollXlsx">
                Excel yuklash
              </button>
              <button class="btn ghost" type="button" :disabled="payrollBusy" @click="exportPayrollPdf">
                PDF yuklash
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="payrollPeriods.length" class="payroll-periods">
        <div class="staff-card-title">Payroll periodlar</div>
        <div v-for="period in payrollPeriods.slice(0, 3)" :key="period.id" class="period-row">
          <div>
            <strong>{{ period.name }}</strong>
            <span>{{ period.period_from }} - {{ period.period_to }} · {{ period.status }}</span>
          </div>
          <div class="period-money">{{ money(period.net_total || 0) }}</div>
          <div class="period-actions">
            <button v-if="period.status === 'draft'" class="btn ghost" type="button" :disabled="payrollBusy" @click="approvePayrollPeriod(period.id)">
              Tasdiqlash
            </button>
            <button v-if="period.status === 'approved'" class="btn ghost" type="button" :disabled="payrollBusy" @click="markPayrollPeriodPaid(period.id)">
              To‘landi
            </button>
          </div>
        </div>
      </div>

      <div class="staff-list">
        <div v-if="operatorsLoading" class="staff-empty">Jamoa yuklanmoqda...</div>
        <div v-else-if="!staffOperators.length" class="staff-empty">Hali operator yoki admin qo‘shilmagan.</div>
        <template v-else>
          <div v-for="staff in staffOperators" :key="staff.id" class="staff-row">
            <div class="staff-person">
              <div class="staff-avatar">{{ initials(staff.name) }}</div>
              <div>
                <strong>{{ staff.name }}</strong>
                <span>{{ roleLabel(staff.role) }} · {{ staff.login }} · {{ staff.is_active ? 'Faol' : 'O‘chirilgan' }}</span>
              </div>
            </div>
            <label class="field staff-inline-field">
              <span>Turi</span>
              <select v-model="staff.salary_type" class="input">
                <option value="daily">Kunlik</option>
                <option value="monthly">Oylik</option>
              </select>
            </label>
            <label class="field staff-inline-field">
              <span>Stavka</span>
              <input v-model.number="staff.salary_amount" class="input" type="number" min="0" step="1000" />
            </label>
            <div class="staff-payline">
              <span>{{ payrollLine(staff.id)?.worked_days || 0 }} kun</span>
              <strong>{{ money(payrollLine(staff.id)?.net_payable_amount || 0) }}</strong>
            </div>
            <div class="staff-row-actions">
              <button class="btn ghost" type="button" :disabled="savingOperatorId === staff.id" @click="saveStaffSalary(staff)">
                Saqlash
              </button>
              <button class="btn ghost" type="button" :disabled="savingOperatorId === staff.id" @click="markTodayAttendance(staff)">
                Bugun ishladi
              </button>
              <button class="btn ghost" type="button" :disabled="savingOperatorId === staff.id" @click="toggleStaff(staff)">
                {{ staff.is_active ? "O‘chirish" : "Faollashtirish" }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </section>

    <section class="actions">
      <button class="btn primary" :disabled="saving" @click="saveSettings">
        <span class="btn-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5h11l3 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="currentColor" opacity="0.35"/>
            <path d="M7 5h7v4H7zM7 14h10v5H7z" fill="currentColor"/>
          </svg>
        </span>
        {{ saving ? "Saqlanmoqda..." : "Saqlash" }}
      </button>
      <span v-if="message" class="ok">{{ message }}</span>
      <span v-if="error" class="err">{{ error }}</span>
    </section>

    <div v-if="showAutoShiftModal" class="modal-backdrop">
      <div class="modal card-flat">
        <div class="modal-head">
          <h3>Auto smena jadvali</h3>
          <button class="btn ghost" type="button" @click="cancelAutoShiftModal">Yopish</button>
        </div>
        <p class="hint">24 soatda nechta smena bo'lishini belgilang va vaqtlarni kiriting.</p>

        <div class="loc-grid auto-config-grid">
          <label class="field">
            <span>Smena soni (24 soat)</span>
            <input v-model.number="autoShiftDraftCount" class="input" type="number" min="1" max="6" @input="applyAutoShiftCount" />
          </label>
        </div>

        <div class="modal-slots">
          <div class="slot-row" v-for="(slot, idx) in form.autoShiftSlots" :key="`slot-edit-${idx}`">
            <label class="field">
              <span>Nomi</span>
              <input v-model="slot.label" class="input" :placeholder="`Smena ${idx + 1}`" />
            </label>
            <label class="field">
              <span>Boshlanish</span>
              <input v-model="slot.start" class="input" type="time" />
            </label>
            <label class="field">
              <span>Tugash</span>
              <input v-model="slot.end" class="input" type="time" />
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" @click="cancelAutoShiftModal">Bekor</button>
          <button class="btn primary" type="button" @click="saveAutoShiftModal">Qabul qilish</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { cpApi } from '../../api/cp'

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const error = ref('')
const logoInput = ref(null)
const promoFileInput = ref(null)
const promoFile = ref(null)
const promoUploading = ref(false)
const agentFileInput = ref(null)
const agentFile = ref(null)
const agentUploading = ref(false)
const clientFileInput = ref(null)
const clientFile = ref(null)
const clientUploading = ref(false)
const shellFileInput = ref(null)
const shellFile = ref(null)
const shellUploading = ref(false)
const showAutoShiftModal = ref(false)
const autoShiftDraftCount = ref(2)
const autoShiftSnapshot = ref(null)
const operatorsLoading = ref(false)
const operatorSaving = ref(false)
const payrollLoading = ref(false)
const payrollBusy = ref(false)
const savingOperatorId = ref(null)
const operators = ref([])
const payroll = ref(null)
const payrollPeriods = ref([])
const payrollAdjustments = ref([])

const operatorForm = reactive({
  name: '',
  login: '',
  password: '',
  role: 'operator',
  salaryType: 'daily',
  salaryAmount: 0,
})

const payrollFilter = reactive({
  from: monthDate('start'),
  to: monthDate('end'),
})

const payrollAction = reactive({
  operatorId: 0,
  type: 'bonus',
  amount: 0,
  date: todayDate(),
  note: '',
})

const form = reactive({
  clubName: '',
  clubLogo: '',
  promoVideoUrl: '',
  agentInstallerUrl: '',
  agentInstallArgs: '',
  clientInstallerUrl: '',
  clientInstallArgs: '',
  shellInstallerUrl: '',
  shellInstallArgs: '',
  agentHash: '',
  shellHash: '',
  address: '',
  lat: '',
  lng: '',
  telegramUser: '',
  telegramChatId: '',
  telegramBotToken: '',
  telegramShiftNotifications: true,
  autoShiftEnabled: false,
  autoShiftSlots: [],
  autoShiftOpeningCash: 0,
  shellAutostartEnabled: true,
  shellAutostartPath: '',
  shellAutostartArgs: '',
  shellAutostartScope: 'machine',
  shellReplaceEnabled: false,
  shellReplacePath: '',
  shellReplaceArgs: '',
})

const promoFileName = computed(() => (promoFile.value ? promoFile.value.name : ''))
const agentFileName = computed(() => (agentFile.value ? agentFile.value.name : ''))
const clientFileName = computed(() => (clientFile.value ? clientFile.value.name : ''))
const shellFileName = computed(() => (shellFile.value ? shellFile.value.name : ''))
const staffOperators = computed(() => (
  Array.isArray(operators.value)
    ? operators.value.filter((item) => ['operator', 'admin'].includes(String(item?.role || '')))
    : []
))

function monthDate(edge) {
  const d = new Date()
  const target = edge === 'start'
    ? new Date(d.getFullYear(), d.getMonth(), 1)
    : new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const year = target.getFullYear()
  const month = String(target.getMonth() + 1).padStart(2, '0')
  const day = String(target.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayDate() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function money(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} UZS`
}

function initials(value) {
  const parts = String(value || 'N')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return (parts[0]?.[0] || 'N').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()
}

function roleLabel(role) {
  if (role === 'admin') return 'Admin'
  if (role === 'operator') return 'Operator'
  return 'Owner'
}

function payrollLine(operatorId) {
  const rows = payroll.value?.operators
  if (!Array.isArray(rows)) return null
  return rows.find((row) => Number(row?.operator?.id) === Number(operatorId)) || null
}

function resetOperatorForm() {
  operatorForm.name = ''
  operatorForm.login = ''
  operatorForm.password = ''
  operatorForm.role = 'operator'
  operatorForm.salaryType = 'daily'
  operatorForm.salaryAmount = 0
}

function getYoutubeId(raw) {
  try {
    const url = new URL(String(raw || '').trim())
    const host = (url.hostname || '').toLowerCase()
    if (host.includes('youtu.be')) return url.pathname.replace('/', '').trim()
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com') || host.includes('m.youtube.com')) {
      const v = url.searchParams.get('v')
      if (v) return v
      const parts = url.pathname.split('/').filter(Boolean)
      const idx = parts.indexOf('embed')
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
    }
  } catch (_) {}
  const m = String(raw || '').match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{6,})/)
  return m ? m[1] : ''
}

const promoPreviewType = computed(() => {
  const url = String(form.promoVideoUrl || '').trim()
  if (!url) return ''
  if (/(\.gif)(\?|#|$)/i.test(url) || url.toLowerCase().startsWith('data:image/gif')) return 'gif'
  if (/(\.mp4|\.webm)(\?|#|$)/i.test(url)) return 'video'
  if (getYoutubeId(url)) return 'youtube'
  return ''
})

const promoPreviewUrl = computed(() => {
  const url = String(form.promoVideoUrl || '').trim()
  if (!url) return ''
  if (promoPreviewType.value === 'youtube') {
    const id = getYoutubeId(url)
    if (!id) return ''
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1`
  }
  return url
})

function normalizeLogoSrc(raw) {
  if (typeof raw !== 'string') return ''
  let value = raw.trim()
  if (!value) return ''
  try {
    const decoded = decodeURIComponent(value)
    if (decoded) value = decoded
  } catch (_) {}
  value = value.replace(/^[\"']+|[\"']+$/g, '').trim()
  if (!value) return ''
  const lower = value.toLowerCase()
  if (lower.startsWith('data:image/')) return value
  if (lower.startsWith('http://') || lower.startsWith('https://') || value.startsWith('/')) return value
  return ''
}

function parseSettings(items) {
  const out = {}
  for (const row of items || []) {
    if (row && typeof row.key === 'string') out[row.key] = row.value
  }
  return out
}

function validNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function cloneSlots(slots) {
  return (Array.isArray(slots) ? slots : []).map((s, idx) => ({
    label: String(s?.label || `Smena ${idx + 1}`),
    start: String(s?.start || ''),
    end: String(s?.end || ''),
  }))
}

function normalizeSlots(raw) {
  const list = Array.isArray(raw) ? raw : []
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i] || {}
    const start = String(item.start || item.from || '').slice(0, 5)
    const end = String(item.end || item.to || '').slice(0, 5)
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) continue
    out.push({
      label: String(item.label || `Smena ${i + 1}`),
      start,
      end,
    })
  }
  return out
}

function applyAutoShiftCount() {
  const next = Math.max(1, Math.min(6, Number(autoShiftDraftCount.value || 1)))
  autoShiftDraftCount.value = next

  const current = cloneSlots(form.autoShiftSlots)
  while (current.length < next) {
    if (current.length === 0) {
      current.push({ label: 'Kunduzgi', start: '09:00', end: '21:00' })
    } else if (current.length === 1) {
      current.push({ label: 'Tungi', start: '21:00', end: '09:00' })
    } else {
      const idx = current.length + 1
      current.push({ label: `Smena ${idx}`, start: '00:00', end: '08:00' })
    }
  }
  if (current.length > next) current.length = next
  form.autoShiftSlots = current
}

function openAutoShiftModal() {
  autoShiftSnapshot.value = {
    enabled: !!form.autoShiftEnabled,
    slots: cloneSlots(form.autoShiftSlots),
    count: autoShiftDraftCount.value,
  }

  if (!form.autoShiftSlots.length) {
    autoShiftDraftCount.value = 2
    applyAutoShiftCount()
  } else {
    autoShiftDraftCount.value = form.autoShiftSlots.length
  }
  showAutoShiftModal.value = true
}

function cancelAutoShiftModal() {
  const snap = autoShiftSnapshot.value
  if (snap) {
    form.autoShiftEnabled = !!snap.enabled
    form.autoShiftSlots = cloneSlots(snap.slots)
    autoShiftDraftCount.value = Number(snap.count || 2)
  }
  showAutoShiftModal.value = false
}

function saveAutoShiftModal() {
  const slots = normalizeSlots(form.autoShiftSlots)
  if (!slots.length) {
    error.value = "Kamida bitta smena va vaqti bo'lishi kerak"
    return
  }
  const bad = slots.find((s) => s.start === s.end)
  if (bad) {
    error.value = "Boshlanish va tugash vaqti bir xil bo'lmasin"
    return
  }

  form.autoShiftEnabled = true
  form.autoShiftSlots = slots
  showAutoShiftModal.value = false
  error.value = ''
}

function onAutoShiftEnabledChange() {
  if (form.autoShiftEnabled) {
    openAutoShiftModal()
  }
}

const mapExternalUrl = computed(() => {
  const lat = validNumber(form.lat)
  const lng = validNumber(form.lng)
  if (lat === null || lng === null) return ''
  return `https://www.google.com/maps?q=${lat},${lng}`
})

const mapEmbedUrl = computed(() => {
  const lat = validNumber(form.lat)
  const lng = validNumber(form.lng)
  if (lat === null || lng === null) return ''
  return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
})

async function loadSettings() {
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const { data } = await cpApi.settingsList()
    const map = parseSettings(data?.data || [])

    form.clubName = typeof map.club_name === 'string' ? map.club_name : ''
    form.clubLogo = normalizeLogoSrc(map.club_logo)
    form.promoVideoUrl = typeof map.promo_video_url === 'string' ? map.promo_video_url : ''
    form.agentInstallerUrl = typeof map.deploy_agent_download_url === 'string' ? map.deploy_agent_download_url : ''
    form.agentInstallArgs = typeof map.deploy_agent_install_args === 'string' ? map.deploy_agent_install_args : ''
    form.clientInstallerUrl = typeof map.deploy_client_download_url === 'string' ? map.deploy_client_download_url : ''
    form.clientInstallArgs = typeof map.deploy_client_install_args === 'string' ? map.deploy_client_install_args : ''
    form.shellInstallerUrl = typeof map.deploy_shell_download_url === 'string' ? map.deploy_shell_download_url : ''
    form.shellInstallArgs = typeof map.deploy_shell_install_args === 'string' ? map.deploy_shell_install_args : ''
    form.agentHash = typeof map.deploy_agent_sha256 === 'string' ? map.deploy_agent_sha256 : ''
    form.shellHash = typeof map.deploy_shell_sha256 === 'string' ? map.deploy_shell_sha256 : ''
    form.shellAutostartEnabled = !!map.shell_autostart_enabled
    form.shellAutostartPath = typeof map.shell_autostart_path === 'string' ? map.shell_autostart_path : ''
    form.shellAutostartArgs = typeof map.shell_autostart_args === 'string' ? map.shell_autostart_args : ''
    form.shellAutostartScope = typeof map.shell_autostart_scope === 'string' ? map.shell_autostart_scope : 'machine'
    form.shellReplaceEnabled = !!map.shell_replace_explorer_enabled
    form.shellReplacePath = typeof map.shell_replace_explorer_path === 'string' ? map.shell_replace_explorer_path : ''
    form.shellReplaceArgs = typeof map.shell_replace_explorer_args === 'string' ? map.shell_replace_explorer_args : ''

    const loc = map.club_location && typeof map.club_location === 'object' ? map.club_location : {}
    form.address = typeof loc.address === 'string' ? loc.address : ''
    form.lat = loc.lat === null || loc.lat === undefined ? '' : String(loc.lat)
    form.lng = loc.lng === null || loc.lng === undefined ? '' : String(loc.lng)
    form.telegramUser = typeof map.telegram_user === 'string' ? map.telegram_user : ''
    form.telegramChatId = typeof map.telegram_chat_id === 'string' ? map.telegram_chat_id : ''
    form.telegramBotToken = typeof map.telegram_bot_token === 'string' ? map.telegram_bot_token : ''
    form.telegramShiftNotifications = map.telegram_shift_notifications === undefined
      ? true
      : !!map.telegram_shift_notifications
    form.autoShiftEnabled = map.auto_shift_enabled === undefined ? false : !!map.auto_shift_enabled
    form.autoShiftSlots = normalizeSlots(map.auto_shift_slots)
    form.autoShiftOpeningCash = Math.max(0, Number(map.auto_shift_opening_cash || 0))
    autoShiftDraftCount.value = form.autoShiftSlots.length || 2
  } catch (e) {
    error.value = e?.response?.data?.message || "Settings yuklanmadi"
  } finally {
    loading.value = false
  }
}

async function loadOperators() {
  operatorsLoading.value = true
  try {
    const { data } = await cpApi.operators()
    operators.value = Array.isArray(data?.data) ? data.data : []
  } catch (e) {
    const status = e?.response?.status
    if (status !== 403) {
      error.value = e?.response?.data?.message || 'Jamoa yuklanmadi'
    }
    operators.value = []
  } finally {
    operatorsLoading.value = false
  }
}

async function loadPayroll() {
  payrollLoading.value = true
  try {
    const { data } = await cpApi.operatorPayroll({
      from: payrollFilter.from,
      to: payrollFilter.to,
    })
    payroll.value = data?.data || null
  } catch (e) {
    const status = e?.response?.status
    if (status !== 403) {
      error.value = e?.response?.data?.message || 'Ish haqi hisoblanmadi'
    }
    payroll.value = null
  } finally {
    payrollLoading.value = false
  }
}

async function loadPayrollMeta() {
  try {
    const [periodsResponse, adjustmentsResponse] = await Promise.all([
      cpApi.payrollPeriods(),
      cpApi.payrollAdjustments({
        from: payrollFilter.from,
        to: payrollFilter.to,
      }),
    ])
    payrollPeriods.value = Array.isArray(periodsResponse?.data?.data) ? periodsResponse.data.data : []
    payrollAdjustments.value = Array.isArray(adjustmentsResponse?.data?.data) ? adjustmentsResponse.data.data : []
  } catch (e) {
    const status = e?.response?.status
    if (status !== 403) {
      error.value = e?.response?.data?.message || 'Payroll ma’lumotlari yuklanmadi'
    }
    payrollPeriods.value = []
    payrollAdjustments.value = []
  }
}

async function loadStaffData() {
  await Promise.all([loadOperators(), loadPayroll(), loadPayrollMeta()])
}

async function createOperator() {
  if (operatorSaving.value) return
  error.value = ''
  message.value = ''
  const payload = {
    name: String(operatorForm.name || '').trim(),
    login: String(operatorForm.login || '').trim(),
    password: String(operatorForm.password || ''),
    role: operatorForm.role,
    salary_type: operatorForm.salaryType,
    salary_amount: Math.max(0, Number(operatorForm.salaryAmount || 0)),
  }

  if (!payload.name || !payload.login || payload.password.length < 4) {
    error.value = 'Ism, login va kamida 4 belgili parol kiriting'
    return
  }

  operatorSaving.value = true
  try {
    await cpApi.operatorCreate(payload)
    message.value = 'Xodim qo‘shildi'
    resetOperatorForm()
    await loadStaffData()
  } catch (e) {
    const firstErr = e?.response?.data?.errors
      ? Object.values(e.response.data.errors).flat()[0]
      : null
    error.value = firstErr || e?.response?.data?.message || 'Xodim qo‘shilmadi'
  } finally {
    operatorSaving.value = false
  }
}

async function saveStaffSalary(staff) {
  if (!staff?.id || savingOperatorId.value) return
  savingOperatorId.value = staff.id
  error.value = ''
  message.value = ''
  try {
    await cpApi.operatorUpdate(staff.id, {
      salary_type: staff.salary_type,
      salary_amount: Math.max(0, Number(staff.salary_amount || 0)),
    })
    message.value = 'Ish haqi saqlandi'
    await loadStaffData()
  } catch (e) {
    const firstErr = e?.response?.data?.errors
      ? Object.values(e.response.data.errors).flat()[0]
      : null
    error.value = firstErr || e?.response?.data?.message || 'Ish haqi saqlanmadi'
  } finally {
    savingOperatorId.value = null
  }
}

async function toggleStaff(staff) {
  if (!staff?.id || savingOperatorId.value) return
  savingOperatorId.value = staff.id
  error.value = ''
  message.value = ''
  try {
    await cpApi.operatorUpdate(staff.id, {
      is_active: !staff.is_active,
    })
    message.value = staff.is_active ? 'Xodim o‘chirildi' : 'Xodim faollashtirildi'
    await loadOperators()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Status o‘zgarmadi'
  } finally {
    savingOperatorId.value = null
  }
}

async function markTodayAttendance(staff) {
  if (!staff?.id || savingOperatorId.value) return
  savingOperatorId.value = staff.id
  error.value = ''
  message.value = ''
  try {
    await cpApi.operatorAttendanceSave({
      operator_id: staff.id,
      work_date: todayDate(),
      status: 'present',
      minutes_worked: 0,
      note: 'Owner settings orqali belgilandi',
    })
    message.value = 'Davomat belgilandi'
    await loadStaffData()
  } catch (e) {
    const firstErr = e?.response?.data?.errors
      ? Object.values(e.response.data.errors).flat()[0]
      : null
    error.value = firstErr || e?.response?.data?.message || 'Davomat saqlanmadi'
  } finally {
    savingOperatorId.value = null
  }
}

async function createPayrollAdjustment() {
  if (payrollBusy.value) return
  error.value = ''
  message.value = ''
  if (!payrollAction.operatorId || !Number(payrollAction.amount || 0)) {
    error.value = 'Xodim va summani kiriting'
    return
  }
  payrollBusy.value = true
  try {
    await cpApi.payrollAdjustmentCreate({
      operator_id: payrollAction.operatorId,
      type: payrollAction.type,
      amount: Number(payrollAction.amount || 0),
      effective_date: payrollAction.date || todayDate(),
      note: String(payrollAction.note || '').trim() || null,
    })
    payrollAction.amount = 0
    payrollAction.note = ''
    message.value = 'Payroll tuzatish qo‘shildi'
    await loadStaffData()
  } catch (e) {
    const firstErr = e?.response?.data?.errors
      ? Object.values(e.response.data.errors).flat()[0]
      : null
    error.value = firstErr || e?.response?.data?.message || 'Tuzatish qo‘shilmadi'
  } finally {
    payrollBusy.value = false
  }
}

async function generatePayrollPeriod() {
  if (payrollBusy.value) return
  payrollBusy.value = true
  error.value = ''
  message.value = ''
  try {
    await cpApi.payrollPeriodCreate({
      name: `Payroll ${payrollFilter.from} - ${payrollFilter.to}`,
      from: payrollFilter.from,
      to: payrollFilter.to,
    })
    message.value = 'Payroll period yaratildi'
    await loadStaffData()
  } catch (e) {
    const firstErr = e?.response?.data?.errors
      ? Object.values(e.response.data.errors).flat()[0]
      : null
    error.value = firstErr || e?.response?.data?.message || 'Period yaratilmay qoldi'
  } finally {
    payrollBusy.value = false
  }
}

async function approvePayrollPeriod(id) {
  if (!id || payrollBusy.value) return
  payrollBusy.value = true
  try {
    await cpApi.payrollPeriodApprove(id)
    message.value = 'Payroll tasdiqlandi'
    await loadPayrollMeta()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Tasdiqlanmadi'
  } finally {
    payrollBusy.value = false
  }
}

async function markPayrollPeriodPaid(id) {
  if (!id || payrollBusy.value) return
  payrollBusy.value = true
  try {
    await cpApi.payrollPeriodMarkPaid(id)
    message.value = 'Payroll to‘landi deb belgilandi'
    await loadPayrollMeta()
  } catch (e) {
    error.value = e?.response?.data?.message || 'To‘landi belgisi qo‘yilmadi'
  } finally {
    payrollBusy.value = false
  }
}

async function exportPayrollXlsx() {
  if (payrollBusy.value) return
  payrollBusy.value = true
  error.value = ''
  try {
    const { data } = await cpApi.payrollExportXlsx({
      from: payrollFilter.from,
      to: payrollFilter.to,
    })
    const url = window.URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `operator-payroll-${payrollFilter.from}-${payrollFilter.to}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e?.response?.data?.message || 'Excel yuklanmadi'
  } finally {
    payrollBusy.value = false
  }
}

async function exportPayrollPdf() {
  if (payrollBusy.value) return
  payrollBusy.value = true
  error.value = ''
  try {
    const { data } = await cpApi.payrollExportPdf({
      from: payrollFilter.from,
      to: payrollFilter.to,
    })
    const url = window.URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `operator-payroll-${payrollFilter.from}-${payrollFilter.to}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e?.response?.data?.message || 'PDF yuklanmadi'
  } finally {
    payrollBusy.value = false
  }
}

function onLogoSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  if (file.size > 1024 * 1024) {
    error.value = "Logo 1MB dan katta bo'lmasin"
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.clubLogo = normalizeLogoSrc(String(reader.result || ''))
    error.value = ''
  }
  reader.readAsDataURL(file)
}

function clearLogo() {
  form.clubLogo = ''
  if (logoInput.value) logoInput.value.value = ''
}

function onPromoFileSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  const okTypes = ['video/mp4', 'video/webm', 'image/gif']
  const nameOk = /\.(mp4|webm|gif)$/i.test(file.name || '')
  if (!okTypes.includes(file.type) && !nameOk) {
    error.value = 'Faqat MP4/WebM/GIF fayl yuklash mumkin'
    return
  }
  if (file.size > 200 * 1024 * 1024) {
    error.value = "Fayl 200MB dan katta bo'lmasin"
    return
  }
  promoFile.value = file
  error.value = ''
}

async function uploadPromoFile() {
  if (!promoFile.value || promoUploading.value) return
  promoUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const fd = new FormData()
    fd.append('file', promoFile.value)
    const { data } = await cpApi.promoVideoUpload(fd)
    if (data?.promo_video_url) {
      form.promoVideoUrl = data.promo_video_url
      message.value = 'Promo video yuklandi'
    } else {
      message.value = 'Yuklandi'
    }
    promoFile.value = null
    if (promoFileInput.value) promoFileInput.value.value = ''
  } catch (e) {
    const firstErr = e?.response?.data?.errors
      ? Object.values(e.response.data.errors).flat()[0]
      : null
    error.value = firstErr || e?.response?.data?.message || "Yuklashda xato"
  } finally {
    promoUploading.value = false
  }
}

function onAgentFileSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  const okTypes = ['application/x-msdownload', 'application/octet-stream', 'application/x-ms-installer', 'application/zip']
  const nameOk = /\.(exe|msi|zip)$/i.test(file.name || '')
  if (!okTypes.includes(file.type) && !nameOk) {
    error.value = 'Faqat EXE/MSI/ZIP fayl yuklash mumkin'
    return
  }
  if (file.size > 500 * 1024 * 1024) {
    error.value = "Fayl 500MB dan katta bo'lmasin"
    return
  }
  agentFile.value = file
  error.value = ''
}

async function uploadAgentFile() {
  if (!agentFile.value || agentUploading.value) return
  agentUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const fd = new FormData()
    fd.append('file', agentFile.value)
    const { data } = await cpApi.agentInstallerUpload(fd)
    if (data?.deploy_agent_download_url) {
      form.agentInstallerUrl = data.deploy_agent_download_url
      message.value = 'Agent installer yuklandi'
    } else if (data?.url) {
      form.agentInstallerUrl = data.url
      message.value = 'Agent installer yuklandi'
    } else {
      message.value = 'Yuklandi'
    }
    agentFile.value = null
    if (agentFileInput.value) agentFileInput.value.value = ''
  } catch (e) {
    const firstErr = e?.response?.data?.errors
      ? Object.values(e.response.data.errors).flat()[0]
      : null
    error.value = firstErr || e?.response?.data?.message || 'Yuklashda xato'
  } finally {
    agentUploading.value = false
  }
}

function onClientFileSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  const okTypes = ['application/x-msdownload', 'application/octet-stream', 'application/x-ms-installer', 'application/zip']
  const nameOk = /\.(exe|msi|zip)$/i.test(file.name || '')
  if (!okTypes.includes(file.type) && !nameOk) {
    error.value = 'Faqat EXE/MSI/ZIP fayl yuklash mumkin'
    return
  }
  if (file.size > 500 * 1024 * 1024) {
    error.value = "Fayl 500MB dan katta bo'lmasin"
    return
  }
  clientFile.value = file
  error.value = ''
}

async function uploadClientFile() {
  if (!clientFile.value || clientUploading.value) return
  clientUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const fd = new FormData()
    fd.append('file', clientFile.value)
    const { data } = await cpApi.clientInstallerUpload(fd)
    if (data?.deploy_client_download_url) {
      form.clientInstallerUrl = data.deploy_client_download_url
      message.value = 'Client installer yuklandi'
    } else if (data?.url) {
      form.clientInstallerUrl = data.url
      message.value = 'Client installer yuklandi'
    } else {
      message.value = 'Yuklandi'
    }
    clientFile.value = null
    if (clientFileInput.value) clientFileInput.value.value = ''
  } catch (e) {
    const firstErr = e?.response?.data?.errors
      ? Object.values(e.response.data.errors).flat()[0]
      : null
    error.value = firstErr || e?.response?.data?.message || 'Yuklashda xato'
  } finally {
    clientUploading.value = false
  }
}

function onShellFileSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  const okTypes = ['application/x-msdownload', 'application/octet-stream', 'application/x-ms-installer', 'application/zip']
  const nameOk = /\.(exe|msi|zip)$/i.test(file.name || '')
  if (!okTypes.includes(file.type) && !nameOk) {
    error.value = 'Faqat EXE/MSI/ZIP fayl yuklash mumkin'
    return
  }
  if (file.size > 500 * 1024 * 1024) {
    error.value = "Fayl 500MB dan katta bo'lmasin"
    return
  }
  shellFile.value = file
  error.value = ''
}

async function uploadShellFile() {
  if (!shellFile.value || shellUploading.value) return
  shellUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const fd = new FormData()
    fd.append('file', shellFile.value)
    const { data } = await cpApi.shellInstallerUpload(fd)
    if (data?.deploy_shell_download_url) {
      form.shellInstallerUrl = data.deploy_shell_download_url
      message.value = 'Shell installer yuklandi'
    } else if (data?.url) {
      form.shellInstallerUrl = data.url
      message.value = 'Yuklandi'
    } else {
      message.value = 'Yuklandi'
    }
    shellFile.value = null
    if (shellFileInput.value) shellFileInput.value.value = ''
  } catch (e) {
    const firstErr = e?.response?.data?.errors
      ? Object.values(e.response.data.errors).flat()[0]
      : null
    error.value = firstErr || e?.response?.data?.message || 'Yuklashda xato'
  } finally {
    shellUploading.value = false
  }
}

function useMyLocation() {
  error.value = ''
  if (!navigator?.geolocation) {
    error.value = "Brauzer geolocation qo'llamaydi"
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      form.lat = String(Number(pos.coords.latitude).toFixed(6))
      form.lng = String(Number(pos.coords.longitude).toFixed(6))
    },
    () => {
      error.value = 'Lokatsiyani olishga ruxsat bering'
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

async function saveSettings() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const lat = validNumber(form.lat)
    const lng = validNumber(form.lng)
    const normalizedAutoShiftSlots = normalizeSlots(form.autoShiftSlots)

    if (form.autoShiftEnabled && !normalizedAutoShiftSlots.length) {
      error.value = "Auto smena yoqilgan bo'lsa, kamida bitta smena va vaqt kiriting"
      openAutoShiftModal()
      return
    }

    const payload = {
      settings: {
        club_name: form.clubName.trim() || null,
        club_logo: normalizeLogoSrc(form.clubLogo) || null,
        promo_video_url: form.promoVideoUrl.trim() || null,
        deploy_agent_download_url: form.agentInstallerUrl.trim() || null,
        deploy_agent_install_args: form.agentInstallArgs.trim() || null,
        deploy_client_download_url: form.clientInstallerUrl.trim() || null,
        deploy_client_install_args: form.clientInstallArgs.trim() || null,
        deploy_shell_download_url: form.shellInstallerUrl.trim() || null,
        deploy_shell_install_args: form.shellInstallArgs.trim() || null,
        deploy_agent_sha256: form.agentHash.trim() || null,
        deploy_shell_sha256: form.shellHash.trim() || null,
        shell_autostart_enabled: !!form.shellAutostartEnabled,
        shell_autostart_path: form.shellAutostartPath.trim() || null,
        shell_autostart_args: form.shellAutostartArgs.trim() || null,
        shell_autostart_scope: form.shellAutostartScope || 'machine',
        shell_replace_explorer_enabled: !!form.shellReplaceEnabled,
        shell_replace_explorer_path: form.shellReplacePath.trim() || null,
        shell_replace_explorer_args: form.shellReplaceArgs.trim() || null,
        club_location: {
          address: form.address.trim() || null,
          lat,
          lng,
        },
        telegram_user: form.telegramUser.trim() || null,
        telegram_chat_id: form.telegramChatId.trim() || null,
        telegram_bot_token: form.telegramBotToken.trim() || null,
        telegram_shift_notifications: !!form.telegramShiftNotifications,
        auto_shift_enabled: !!form.autoShiftEnabled,
        auto_shift_slots: form.autoShiftEnabled ? normalizedAutoShiftSlots : [],
        auto_shift_opening_cash: Math.max(0, Number(form.autoShiftOpeningCash || 0)),
      },
    }
    await cpApi.settingsUpdate(payload)
    message.value = 'Saqlandi'

    window.dispatchEvent(new CustomEvent('cp-club-settings-updated', {
      detail: {
        club_name: payload.settings.club_name,
        club_logo: payload.settings.club_logo,
      },
    }))
  } catch (e) {
    const firstErr = e?.response?.data?.errors
      ? Object.values(e.response.data.errors).flat()[0]
      : null
    error.value = firstErr || e?.response?.data?.message || 'Saqlashda xato'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
  loadStaffData()
})
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 16px;
  padding-bottom: 12px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(420px 220px at 15% 0%, rgba(212, 175, 106, 0.18), transparent 60%),
    radial-gradient(420px 220px at 85% 100%, rgba(45, 212, 191, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(12, 18, 36, 0.9), rgba(7, 10, 22, 0.9));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.hero h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0.2px;
}

.hero-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero p {
  margin: 6px 0 0;
  opacity: 0.75;
  font-size: 13px;
}

.grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
}

.panel {
  padding: 16px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(135deg, rgba(16, 24, 44, 0.88), rgba(8, 12, 26, 0.92));
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.panel-wide {
  grid-column: 1 / -1;
}

.panel h2 {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  color: rgba(212, 175, 106, 0.95);
}

.title-icon svg {
  width: 18px;
  height: 18px;
}

.field {
  display: grid;
  gap: 6px;
}

.promo-upload {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.promo-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.promo-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(260px, 1fr);
  gap: 14px;
  align-items: start;
}

.promo-col {
  display: grid;
  gap: 10px;
}

.promo-preview {
  display: grid;
  gap: 8px;
}

.promo-preview-head {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  opacity: 0.7;
}

.promo-preview-box {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(3, 7, 18, 0.5);
  overflow: hidden;
  aspect-ratio: 16 / 9;
  min-height: 180px;
  display: grid;
  place-items: center;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
}

.promo-preview-box video,
.promo-preview-box img,
.promo-preview-box iframe {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 0;
}

.deploy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 18px;
}

.deploy-col {
  display: grid;
  gap: 12px;
}

.danger-panel {
  border-color: rgba(255, 96, 120, 0.35);
  background: linear-gradient(180deg, rgba(40, 10, 18, 0.6), rgba(12, 6, 12, 0.6));
}

@media (max-width: 980px) {
  .promo-grid {
    grid-template-columns: 1fr;
  }

  .deploy-grid {
    grid-template-columns: 1fr;
  }
}

.field span {
  font-size: 12px;
  opacity: 0.75;
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

.input {
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(3, 7, 18, 0.5);
  color: var(--text);
  padding: 0 10px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}
.input:focus {
  outline: none;
  border-color: rgba(212, 175, 106, 0.5);
  box-shadow: 0 0 0 2px rgba(212, 175, 106, 0.15);
}
.input.file {
  padding: 6px 10px;
  height: auto;
}

.logo-row {
  display: grid;
  gap: 12px;
  grid-template-columns: 140px 1fr;
  align-items: center;
}

.logo-box {
  width: 120px;
  height: 120px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(3, 7, 18, 0.5);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.logo-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-box span {
  font-size: 11px;
  opacity: 0.65;
}

.logo-actions {
  display: grid;
  gap: 8px;
}

.loc-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 1.4fr .8fr .8fr;
}

.tg-grid {
  grid-template-columns: 1fr 1fr 1fr;
}

.toggle-field {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  opacity: 0.9;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(3, 7, 18, 0.45);
}

.toggle-field input {
  width: 18px;
  height: 18px;
  accent-color: #d4af6a;
}

.table-wrap {
  margin-top: 12px;
}

.trow {
  display: grid;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid var(--stroke);
}

.thead {
  font-size: 12px;
  opacity: 0.72;
  font-weight: 700;
}

.cols-auto-shift {
  grid-template-columns: 48px 1fr 120px 120px;
}

.auto-table {
  border: 1px solid var(--stroke);
  border-radius: 12px;
  overflow: hidden;
}

.staff-panel {
  display: grid;
  gap: 16px;
}

.staff-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.staff-layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.95fr) minmax(360px, 1.05fr);
  gap: 14px;
}

.staff-create,
.staff-payroll,
.staff-row,
.staff-empty {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background:
    radial-gradient(260px 160px at 10% 0%, rgba(45, 212, 191, 0.12), transparent 65%),
    rgba(3, 7, 18, 0.38);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.staff-create,
.staff-payroll {
  padding: 14px;
}

.staff-card-title {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: rgba(103, 232, 249, 0.95);
}

.staff-create-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.staff-submit {
  margin-top: 12px;
  width: 100%;
  justify-content: center;
}

.staff-payroll-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.payroll-filter {
  display: grid;
  grid-template-columns: 128px 128px auto;
  align-items: end;
  gap: 8px;
}

.field.compact {
  gap: 4px;
}

.payroll-metrics {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.payroll-metric {
  min-height: 92px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(103, 232, 249, 0.16);
  background: linear-gradient(145deg, rgba(8, 20, 30, 0.82), rgba(8, 12, 26, 0.72));
  display: grid;
  align-content: space-between;
}

.payroll-metric span,
.staff-payline span {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.payroll-metric strong {
  font-size: 22px;
}

.payroll-tools {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 10px;
}

.payroll-action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.payroll-tool-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.payroll-periods {
  border: 1px solid rgba(103, 232, 249, 0.16);
  border-radius: 18px;
  padding: 14px;
  background:
    radial-gradient(360px 180px at 80% 0%, rgba(45, 212, 191, 0.12), transparent 70%),
    rgba(3, 7, 18, 0.32);
  display: grid;
  gap: 10px;
}

.period-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.period-row strong,
.period-row span {
  display: block;
}

.period-row span {
  margin-top: 4px;
  color: rgba(148, 163, 184, 0.95);
  font-size: 12px;
}

.period-money {
  color: rgba(134, 239, 172, 0.98);
  font-size: 17px;
  font-weight: 900;
  white-space: nowrap;
}

.period-actions {
  display: flex;
  justify-content: flex-end;
}

.staff-list {
  display: grid;
  gap: 10px;
}

.staff-empty {
  padding: 18px;
  color: rgba(148, 163, 184, 0.95);
}

.staff-row {
  padding: 12px;
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) 140px 150px 130px auto;
  gap: 10px;
  align-items: center;
}

.staff-person {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.staff-avatar {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #08111f;
  font-weight: 900;
  background: linear-gradient(135deg, rgba(212, 175, 106, 0.92), rgba(103, 232, 249, 0.92));
}

.staff-person strong,
.staff-person span {
  display: block;
  min-width: 0;
}

.staff-person span {
  margin-top: 3px;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.95);
}

.staff-inline-field span {
  font-size: 10px;
}

.staff-payline {
  display: grid;
  gap: 3px;
}

.staff-payline strong {
  font-size: 16px;
}

.staff-row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(2, 6, 23, 0.7);
  display: grid;
  place-items: center;
  padding: 16px;
}

.modal {
  width: min(920px, 96vw);
  padding: 16px;
  border: 1px solid var(--stroke);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.modal-head h3 {
  margin: 0;
  font-size: 18px;
}

.auto-config-grid {
  grid-template-columns: 220px;
}

.modal-slots {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.slot-row {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 180px 180px;
}

.modal-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.loc-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.map-wrap {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  overflow: hidden;
  height: 280px;
  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.35);
}

.map-wrap iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.hint {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.7;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 2px 6px;
}

.btn {
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  padding: 0 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn.primary {
  border-color: rgba(212, 175, 106, 0.6);
  background: linear-gradient(135deg, rgba(212, 175, 106, 0.35), rgba(45, 212, 191, 0.25));
  color: #0f141f;
  font-weight: 700;
}

.btn-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon svg {
  width: 18px;
  height: 18px;
}

.btn.ghost {
  background: rgba(3, 7, 18, 0.45);
}

.ok {
  font-size: 12px;
  color: rgba(34, 197, 94, 0.95);
}

.err {
  font-size: 12px;
  color: rgba(248, 113, 113, 0.95);
}

@media (max-width: 1000px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .loc-grid {
    grid-template-columns: 1fr;
  }
  .slot-row {
    grid-template-columns: 1fr;
  }
  .cols-auto-shift {
    grid-template-columns: 36px 1fr 90px 90px;
  }
  .staff-head,
  .staff-payroll-top {
    display: grid;
  }
  .staff-layout,
  .staff-create-grid,
  .payroll-metrics,
  .payroll-action-grid,
  .period-row {
    grid-template-columns: 1fr;
  }
  .payroll-filter {
    grid-template-columns: 1fr;
  }
  .staff-row {
    grid-template-columns: 1fr;
  }
  .staff-row-actions {
    justify-content: flex-start;
  }
}
</style>
