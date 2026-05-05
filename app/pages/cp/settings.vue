<template>
  <div class="settings-page">
    <CpPageHero eyebrow="Klub profili" title="Sozlamalar" subtitle="Klub ma’lumotlari, media, o‘rnatish fayllari va jamoani bitta joydan boshqaring.">
      <template #meta>
        <span class="hero-meta-badge">
          <Icon name="lucide:clock-3" size="14" />
          Yangilandi: {{ updatedAtLabel }}
        </span>
        <span class="hero-meta-badge">
          <Icon name="lucide:badge-check" size="14" />
          Tayyor bo‘limlar: {{ readySections }}/8
        </span>
      </template>

      <template #actions>
        <button class="ghost-btn" type="button" :disabled="loading" @click="loadSettings">
          <Icon name="lucide:refresh-cw" size="15" />
          <span>{{ loading ? 'Yuklanmoqda...' : 'Qayta yuklash' }}</span>
        </button>
      </template>
    </CpPageHero>

    <div class="tab-strip">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="selectTab(tab.key)"
      >
        <Icon :name="tab.icon" size="16" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <p v-if="error" class="panel-error">{{ error }}</p>
    <p v-if="message" class="panel-ok">{{ message }}</p>

    <template v-if="activeTab === 'club'">
      <div class="content-grid">
        <CpPanelCard title="Klub" subtitle="Klub nomi va logotipi">
          <div class="form-grid">
            <label class="field field-span-2">
              <span>Klub nomi</span>
              <input v-model.trim="form.clubName" placeholder="Masalan: CyberArena Chilonzor" />
            </label>
          </div>
        </CpPanelCard>

        <CpPanelCard title="Logotip" subtitle="Klub kartasi va kirish ekrani uchun">
          <div class="logo-layout">
            <div class="logo-preview">
              <img v-if="form.clubLogo" :src="form.clubLogo" alt="Klub logotipi" />
              <div v-else class="empty-preview">
                <Icon name="lucide:image-off" size="18" />
                <span>Logotip yo‘q</span>
              </div>
            </div>

            <div class="stack-col">
              <label class="field">
                <span>Logo yuklash</span>
                <input ref="logoInput" class="file-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" @change="onLogoSelected" />
              </label>
              <button class="ghost-btn" type="button" @click="clearLogo">
                <Icon name="lucide:trash-2" size="14" />
                <span>Logoni olib tashlash</span>
              </button>
            </div>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'media'">
      <div class="content-grid">
        <CpPanelCard title="Media" subtitle="Kirish sahifasida ko‘rinadigan reklama videosi">
          <div class="form-grid">
            <label class="field field-span-2">
              <span>Reklama videosi havolasi</span>
              <input v-model.trim="form.promoVideoUrl" placeholder="https://cdn.domain.com/promo.mp4" />
            </label>
            <label class="field field-span-2">
              <span>Reklama videosini yuklash (MP4/WebM/GIF)</span>
              <input ref="promoFileInput" class="file-input" type="file" accept="video/mp4,video/webm,image/gif" @change="onPromoFileSelected" />
            </label>
          </div>

          <div class="inline-actions">
            <button class="primary-btn" type="button" :disabled="promoUploading || !promoFile" @click="uploadPromoFile">
              <Icon name="lucide:upload" size="14" />
              <span>{{ promoUploading ? 'Yuklanmoqda...' : 'Reklama videosini yuklash' }}</span>
            </button>
            <span v-if="promoFileName" class="helper-chip">{{ promoFileName }}</span>
          </div>
        </CpPanelCard>

        <CpPanelCard title="Oldindan ko‘rish" subtitle="Video yoki YouTube ko‘rinishi">
          <div class="video-shell">
            <img v-if="promoPreviewType === 'gif'" :src="promoPreviewUrl" alt="Reklama videosi ko‘rinishi" />
            <video v-else-if="promoPreviewType === 'video'" :src="promoPreviewUrl" muted autoplay loop playsinline></video>
            <iframe v-else-if="promoPreviewType === 'youtube'" :src="promoPreviewUrl" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
            <div v-else class="empty-preview wide">
              <Icon name="lucide:monitor-play" size="20" />
              <span>Oldindan ko‘rish mavjud emas</span>
            </div>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'installers'">
      <div class="content-grid">
        <CpPanelCard title="Kompyuter ilovasi va agent" subtitle="Kompyuterga o‘rnatish uchun fayl havolasi va parametrlar.">
          <div class="form-grid">
            <label class="field field-span-2">
              <span>Kompyuter ilovasi havolasi</span>
              <input v-model.trim="form.clientInstallerUrl" placeholder="https://cdn.domain.com/client-setup.exe" />
            </label>
            <label class="field field-span-2">
              <span>Kompyuter ilovasi faylini yuklash (EXE/MSI/ZIP)</span>
              <input ref="clientFileInput" class="file-input" type="file" accept=".exe,.msi,.zip" @change="onClientFileSelected" />
            </label>
            <div class="inline-actions field-span-2">
              <button class="primary-btn" type="button" :disabled="clientUploading || !clientFile" @click="uploadClientFile">
                <Icon name="lucide:upload" size="14" />
                <span>{{ clientUploading ? 'Yuklanmoqda...' : 'Kompyuter ilovasi faylini yuklash' }}</span>
              </button>
              <span v-if="clientFileName" class="helper-chip">{{ clientFileName }}</span>
            </div>
            <label class="field field-span-2">
              <span>Kompyuter ilovasi o‘rnatish parametrlari</span>
              <input v-model.trim="form.clientInstallArgs" placeholder='--install SERVER_URL="{SERVER}" PAIR_CODE="{PAIR_CODE}"' />
            </label>

            <label class="field field-span-2">
              <span>Agent dasturi havolasi</span>
              <input v-model.trim="form.agentInstallerUrl" placeholder="https://cdn.domain.com/agent-setup.exe" />
            </label>
            <label class="field field-span-2">
              <span>Agent faylini yuklash (EXE/MSI/ZIP)</span>
              <input ref="agentFileInput" class="file-input" type="file" accept=".exe,.msi,.zip" @change="onAgentFileSelected" />
            </label>
            <div class="inline-actions field-span-2">
              <button class="primary-btn" type="button" :disabled="agentUploading || !agentFile" @click="uploadAgentFile">
                <Icon name="lucide:upload" size="14" />
                <span>{{ agentUploading ? 'Yuklanmoqda...' : 'Agent faylini yuklash' }}</span>
              </button>
              <span v-if="agentFileName" class="helper-chip">{{ agentFileName }}</span>
            </div>
            <label class="field">
              <span>Agent o‘rnatish parametrlari</span>
              <input v-model.trim="form.agentInstallArgs" placeholder='/quiet SERVER_URL="{SERVER}" PAIR_CODE="{PAIR_CODE}"' />
            </label>
            <label class="field">
              <span>Agent nazorat xeshi</span>
              <input v-model.trim="form.agentHash" readonly />
            </label>
          </div>
        </CpPanelCard>

        <CpPanelCard title="Shell dasturi" subtitle="Shell fayli, o‘rnatish parametrlari va nazorat xeshi.">
          <div class="form-grid">
            <label class="field field-span-2">
              <span>Shell dasturi havolasi</span>
              <input v-model.trim="form.shellInstallerUrl" placeholder="https://cdn.domain.com/shell-setup.exe" />
            </label>
            <label class="field field-span-2">
              <span>Shell faylini yuklash (EXE/MSI/ZIP)</span>
              <input ref="shellFileInput" class="file-input" type="file" accept=".exe,.msi,.zip" @change="onShellFileSelected" />
            </label>
            <div class="inline-actions field-span-2">
              <button class="primary-btn" type="button" :disabled="shellUploading || !shellFile" @click="uploadShellFile">
                <Icon name="lucide:upload" size="14" />
                <span>{{ shellUploading ? 'Yuklanmoqda...' : 'Shell faylini yuklash' }}</span>
              </button>
              <span v-if="shellFileName" class="helper-chip">{{ shellFileName }}</span>
            </div>
            <label class="field">
              <span>Shell o‘rnatish parametrlari</span>
              <input v-model.trim="form.shellInstallArgs" placeholder='/quiet SERVER_URL="{SERVER}"' />
            </label>
            <label class="field">
              <span>Shell nazorat xeshi</span>
              <input v-model.trim="form.shellHash" readonly />
            </label>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'shell'">
      <div class="content-grid">
        <CpPanelCard title="Shell avtomatik ochilishi" subtitle="Windows ishga tushganda Shell ham avtomatik ochiladi.">
          <label class="check-line">
            <input v-model="form.shellAutostartEnabled" type="checkbox" />
            <span>Avtomatik ochilish yoqilgan</span>
          </label>

          <div class="form-grid">
            <label class="field field-span-2">
              <span>Shell dasturi joylashuvi</span>
              <input v-model.trim="form.shellAutostartPath" placeholder="C:\Program Files\NexoraCloud\NexoraCloud.exe" />
            </label>
            <label class="field">
              <span>Shell parametrlari</span>
              <input v-model.trim="form.shellAutostartArgs" placeholder="--kiosk" />
            </label>
            <label class="field">
              <span>Qo‘llanish sohasi</span>
              <select v-model="form.shellAutostartScope">
                <option value="machine">Barcha foydalanuvchilar (HKLM)</option>
                <option value="user">Joriy foydalanuvchi (HKCU)</option>
              </select>
            </label>
          </div>
        </CpPanelCard>

        <CpPanelCard title="Kiosk rejimi" subtitle="Windows Explorer o‘rniga Shell dasturini ishga tushirish.">
          <label class="check-line danger">
            <input v-model="form.shellReplaceEnabled" type="checkbox" />
            <span>Explorer o‘rniga Shell ishlasin</span>
          </label>

          <div class="form-grid">
            <label class="field field-span-2">
              <span>Shell dasturi joylashuvi</span>
              <input v-model.trim="form.shellReplacePath" placeholder="C:\Program Files\NexoraCloud\NexoraCloud.exe" />
            </label>
            <label class="field field-span-2">
              <span>Shell parametrlari</span>
              <input v-model.trim="form.shellReplaceArgs" placeholder="--kiosk" />
            </label>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'location'">
      <div class="content-grid">
        <CpPanelCard title="Manzil" subtitle="Klub joylashuvi va xarita ko‘rinishi">
          <div class="form-grid">
            <label class="field field-span-2">
              <span>Manzil</span>
              <input v-model.trim="form.address" placeholder="Toshkent, Chilonzor..." />
            </label>
            <label class="field">
              <span>Kenglik</span>
              <input v-model.trim="form.lat" placeholder="41.2995" />
            </label>
            <label class="field">
              <span>Uzunlik</span>
              <input v-model.trim="form.lng" placeholder="69.2401" />
            </label>
          </div>

          <div class="inline-actions">
            <button class="ghost-btn" type="button" @click="useMyLocation">
              <Icon name="lucide:locate-fixed" size="14" />
              <span>Mening lokatsiyam</span>
            </button>
            <a v-if="mapExternalUrl" class="ghost-btn" :href="mapExternalUrl" target="_blank" rel="noopener">
              <Icon name="lucide:map-pinned" size="14" />
              <span>Xaritada ochish</span>
            </a>
          </div>
        </CpPanelCard>

        <CpPanelCard title="Xarita ko‘rinishi" subtitle="Kiritilgan koordinatalar asosida">
          <div v-if="mapEmbedUrl" class="map-shell">
            <iframe :src="mapEmbedUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
          <div v-else class="empty-preview wide">
            <Icon name="lucide:map-off" size="18" />
            <span>Xarita ko‘rinishi uchun kenglik va uzunlikni kiriting</span>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'telegram'">
      <CpPanelCard title="Telegram" subtitle="Smena xabarlari va bot konfiguratsiyasi">
        <div class="form-grid">
          <label class="field field-span-2">
            <span>Telegram bot kaliti</span>
            <input v-model.trim="form.telegramBotToken" type="password" placeholder="123456:ABC-DEF..." />
          </label>
          <label class="field">
            <span>Telegram foydalanuvchi yoki ID</span>
            <input v-model.trim="form.telegramUser" placeholder="@club_owner yoki 123456789" />
          </label>
          <label class="field">
            <span>Telegram chat ID</span>
            <input v-model.trim="form.telegramChatId" placeholder="-1001234567890" />
          </label>
        </div>

        <label class="check-line">
          <input v-model="form.telegramShiftNotifications" type="checkbox" />
          <span>Smena xabarlarini yuborish</span>
        </label>
      </CpPanelCard>
    </template>

    <template v-else-if="activeTab === 'automation'">
      <CpPanelCard title="Avto smena" subtitle="Smenalar jadvali va boshlang‘ich kassa summasi">
        <div class="form-grid">
          <label class="check-line field-span-2">
            <input v-model="form.autoShiftEnabled" type="checkbox" @change="onAutoShiftEnabledChange" />
            <span>Avto smena yoqilgan</span>
          </label>
          <label class="field">
            <span>Smena soni (24 soat)</span>
            <input v-model.number="autoShiftDraftCount" type="number" min="1" max="6" @input="applyAutoShiftCount" />
          </label>
          <label class="field">
            <span>Boshlang‘ich kassa</span>
            <input v-model.number="form.autoShiftOpeningCash" type="number" min="0" />
          </label>
        </div>

        <div class="slot-list">
          <article v-for="(slot, idx) in form.autoShiftSlots" :key="`slot-${idx}`" class="slot-card">
            <div class="slot-top">
              <strong>Smena {{ idx + 1 }}</strong>
              <button class="icon-btn soft" type="button" :disabled="form.autoShiftSlots.length <= 1" @click="removeAutoShiftSlot(idx)">
                <Icon name="lucide:trash-2" size="14" />
              </button>
            </div>
            <div class="form-grid">
              <label class="field">
                <span>Nomi</span>
                <input v-model.trim="slot.label" :placeholder="`Smena ${idx + 1}`" />
              </label>
              <label class="field">
                <span>Boshlanish</span>
                <input v-model="slot.start" type="time" />
              </label>
              <label class="field">
                <span>Tugash</span>
                <input v-model="slot.end" type="time" />
              </label>
            </div>
          </article>
        </div>

        <div class="inline-actions">
          <button class="ghost-btn" type="button" :disabled="form.autoShiftSlots.length >= 6" @click="addAutoShiftSlot">
            <Icon name="lucide:plus" size="14" />
            <span>Smena qo‘shish</span>
          </button>
        </div>
      </CpPanelCard>
    </template>

    <template v-else-if="activeTab === 'team'">
      <div class="team-shell">
        <div class="team-workspace-head">
          <div class="team-subtabs">
            <button
              v-for="tab in visibleTeamTabs"
              :key="tab.key"
              type="button"
              class="team-subtab"
              :class="{ active: activeTeamTab === tab.key }"
              @click="activeTeamTab = tab.key"
            >
              <Icon :name="tab.icon" size="15" />
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <div class="team-toolbar">
            <button class="ghost-btn" type="button" :disabled="operatorsLoading || payrollLoading || taskLoading" @click="loadStaffData">
              <Icon name="lucide:refresh-cw" size="14" />
              <span>{{ operatorsLoading || payrollLoading || taskLoading ? 'Yangilanmoqda...' : 'Yangilash' }}</span>
            </button>
          </div>
        </div>

        <template v-if="activeTeamTab === 'staff' && canManageTeam">
          <div class="team-grid">
            <CpPanelCard title="Yangi xodim" subtitle="Operator yoki administrator profilini yarating.">
              <form class="team-create is-flat" @submit.prevent="createOperator">
                <div class="form-grid">
                  <label class="field">
                    <span>Ism</span>
                    <input v-model.trim="operatorForm.name" placeholder="Masalan: Aziz" />
                  </label>
                  <label class="field">
                    <span>Kirish nomi</span>
                    <input v-model.trim="operatorForm.login" placeholder="aziz.operator" />
                  </label>
                  <label class="field">
                    <span>Parol</span>
                    <input v-model="operatorForm.password" type="password" placeholder="Kamida 4 belgi" />
                  </label>
                  <label class="field">
                    <span>Rol</span>
                    <select v-model="operatorForm.role">
                      <option value="operator">Operator</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Ish haqi turi</span>
                    <select v-model="operatorForm.salaryType">
                      <option value="daily">Kunlik</option>
                      <option value="monthly">Oylik</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Ish haqi summasi</span>
                    <input v-model.number="operatorForm.salaryAmount" type="number" min="0" step="1000" placeholder="0" />
                  </label>
                </div>
                <button class="primary-btn team-submit" type="submit" :disabled="operatorSaving">
                  <Icon name="lucide:user-plus" size="14" />
                  <span>{{ operatorSaving ? 'Qo‘shilmoqda...' : 'Xodim qo‘shish' }}</span>
                </button>
              </form>
            </CpPanelCard>

            <CpPanelCard title="Xodimlar" subtitle="Ish haqi summasi, davomat va faol holatni boshqarish.">
              <div v-if="operatorsLoading" class="team-empty">Jamoa yuklanmoqda...</div>
              <div v-else-if="!staffOperators.length" class="team-empty">Hali operator yoki administrator qo‘shilmagan.</div>
              <div v-else class="staff-list">
                <article v-for="staff in staffOperators" :key="staff.id" class="staff-row compact">
                  <div class="staff-person">
                    <div class="staff-avatar">{{ initials(staff.name || staff.login) }}</div>
                    <div>
                      <strong>{{ staff.name || staff.login }}</strong>
                      <span>{{ roleLabel(staff.role) }} · {{ staff.login }} · {{ staff.is_active ? 'Faol' : 'O‘chirilgan' }}</span>
                    </div>
                  </div>

                  <label class="field staff-inline-field">
                    <span>Turi</span>
                    <select v-model="staff.salary_type">
                      <option value="daily">Kunlik</option>
                      <option value="monthly">Oylik</option>
                    </select>
                  </label>
                  <label class="field staff-inline-field">
                    <span>Ish haqi summasi</span>
                    <input v-model.number="staff.salary_amount" type="number" min="0" step="1000" />
                  </label>

                  <div class="staff-actions">
                    <button class="ghost-btn compact-btn" type="button" :disabled="savingOperatorId === staff.id" @click="saveStaffSalary(staff)">
                      Saqlash
                    </button>
                    <button class="ghost-btn compact-btn" type="button" :disabled="savingOperatorId === staff.id" @click="markTodayAttendance(staff)">
                      Bugun ishladi
                    </button>
                    <button class="ghost-btn compact-btn" type="button" :disabled="savingOperatorId === staff.id" @click="toggleStaff(staff)">
                      {{ staff.is_active ? 'O‘chirish' : 'Faollashtirish' }}
                    </button>
                  </div>
                </article>
              </div>
            </CpPanelCard>
          </div>
        </template>

        <template v-else-if="activeTeamTab === 'payroll' && canManageTeam">
          <CpPanelCard title="Ish haqi hisob-kitobi" subtitle="Davrni tanlang, ish haqi va jarimalarni ko‘ring.">
            <div class="team-summary">
              <div class="team-summary-card">
                <span>Xodimlar</span>
                <strong>{{ staffOperators.length }}</strong>
              </div>
              <div class="team-summary-card">
                <span>To‘lanadigan summa</span>
                <strong>{{ money(payroll?.summary?.net_payable_total || 0) }}</strong>
              </div>
              <div class="team-summary-card">
                <span>Jarimalar</span>
                <strong>{{ money(payroll?.summary?.penalty_total || 0) }}</strong>
              </div>
              <div class="team-summary-card">
                <span>Ishlangan kunlar</span>
                <strong>{{ payroll?.summary?.worked_days_total || 0 }}</strong>
              </div>
            </div>

            <div class="payroll-box is-flat">
              <div class="payroll-filter">
                <label class="field">
                  <span>Dan</span>
                  <input v-model="payrollFilter.from" type="date" />
                </label>
                <label class="field">
                  <span>Gacha</span>
                  <input v-model="payrollFilter.to" type="date" />
                </label>
                <button class="ghost-btn" type="button" :disabled="payrollLoading" @click="loadPayroll">
                  <Icon name="lucide:calculator" size="14" />
                  <span>Hisoblash</span>
                </button>
              </div>

              <div class="payroll-metrics">
                <div class="payroll-metric">
                  <span>To‘lanadigan summa</span>
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
            </div>
          </CpPanelCard>

          <CpPanelCard title="Bonus, jarima va yakuniy hisob" subtitle="Qo‘shimcha to‘lovlar, avans, jarima va yakuniy ish haqi davrini boshqarish.">
            <div class="payroll-action-grid">
              <label class="field">
                <span>Xodim</span>
                <select v-model.number="payrollAction.operatorId">
                  <option :value="0">Tanlang</option>
                  <option v-for="staff in staffOperators" :key="`adj-${staff.id}`" :value="staff.id">
                    {{ staff.name || staff.login }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>Turi</span>
                <select v-model="payrollAction.type">
                  <option value="bonus">Bonus</option>
                  <option value="penalty">Jarima</option>
                  <option value="advance">Avans</option>
                  <option value="correction">Tuzatish</option>
                </select>
              </label>
              <label class="field">
                <span>Summa</span>
                <input v-model.number="payrollAction.amount" type="number" step="1000" />
              </label>
              <label class="field">
                <span>Sana</span>
                <input v-model="payrollAction.date" type="date" />
              </label>
              <label class="field field-span-2">
                <span>Izoh</span>
                <input v-model.trim="payrollAction.note" placeholder="Masalan: yaxshi smena uchun bonus" />
              </label>
            </div>

            <div class="inline-actions">
              <button class="primary-btn" type="button" :disabled="payrollBusy" @click="createPayrollAdjustment">
                <Icon name="lucide:plus" size="14" />
                <span>Qo‘shish</span>
              </button>
              <button class="ghost-btn" type="button" :disabled="payrollBusy" @click="generatePayrollPeriod">
                <Icon name="lucide:file-check-2" size="14" />
                <span>Yakuniy hisob davrini yaratish</span>
              </button>
              <button class="ghost-btn" type="button" :disabled="payrollBusy" @click="exportPayrollXlsx">
                <Icon name="lucide:file-spreadsheet" size="14" />
                <span>Excel yuklash</span>
              </button>
              <button class="ghost-btn" type="button" :disabled="payrollBusy" @click="exportPayrollPdf">
                <Icon name="lucide:file-text" size="14" />
                <span>PDF yuklash</span>
              </button>
            </div>

            <div v-if="payrollPeriods.length" class="period-list">
              <div v-for="period in payrollPeriods.slice(0, 4)" :key="period.id" class="period-row">
                <div>
                  <strong>{{ period.name }}</strong>
                  <span>{{ period.period_from }} - {{ period.period_to }} · {{ periodStatusLabel(period.status) }}</span>
                </div>
                <div class="period-money">{{ money(period.net_total || 0) }}</div>
                <div class="period-actions">
                  <button v-if="period.status === 'draft'" class="ghost-btn compact-btn" type="button" :disabled="payrollBusy" @click="approvePayrollPeriod(period.id)">
                    Tasdiqlash
                  </button>
                  <button v-if="period.status === 'approved'" class="ghost-btn compact-btn" type="button" :disabled="payrollBusy" @click="markPayrollPeriodPaid(period.id)">
                    To‘landi
                  </button>
                </div>
              </div>
            </div>
          </CpPanelCard>
        </template>

        <CpPanelCard v-else-if="activeTeamTab === 'tasks' && canManageTasks" title="Vazifalar" subtitle="Owner yoki administrator operatorga muddatli vazifa beradi. Muddatdan o‘tsa jarima avtomatik belgilanadi.">
          <div class="task-layout">
            <form class="task-create" @submit.prevent="createOperatorTask">
              <div class="team-card-title">Yangi vazifa</div>
              <div class="form-grid">
                <label class="field">
                  <span>Xodim</span>
                  <select v-model.number="taskForm.assignedToOperatorId">
                    <option :value="0">Tanlang</option>
                    <option v-for="staff in staffOperators" :key="`task-staff-${staff.id}`" :value="staff.id">
                      {{ staff.name || staff.login }}
                    </option>
                  </select>
                </label>
                <label class="field">
                  <span>Muddat</span>
                  <input v-model="taskForm.dueAt" type="datetime-local" />
                </label>
                <label class="field field-span-2">
                  <span>Vazifa nomi</span>
                  <input v-model.trim="taskForm.title" placeholder="Masalan: reklama bannerni 22:00 gacha almashtirish" />
                </label>
                <label class="field">
                  <span>Jarima summasi</span>
                  <input v-model.number="taskForm.penaltyAmount" type="number" min="0" step="1000" placeholder="0" />
                </label>
                <label class="field">
                  <span>Holat filtri</span>
                  <select v-model="taskFilter.status" @change="loadOperatorTasks">
                    <option value="open">Ochiq vazifalar</option>
                    <option value="">Barchasi</option>
                    <option value="pending">Kutilmoqda</option>
                    <option value="overdue">Muddati o‘tgan</option>
                    <option value="completed">Bajarilgan</option>
                    <option value="cancelled">Bekor qilingan</option>
                  </select>
                </label>
                <label class="field field-span-2">
                  <span>Izoh</span>
                  <textarea v-model.trim="taskForm.description" placeholder="Operator nimani, qachongacha va qanday natija bilan bajarishi kerakligini yozing."></textarea>
                </label>
              </div>
              <button class="primary-btn team-submit" type="submit" :disabled="taskBusy || operatorsLoading">
                <Icon name="lucide:clipboard-plus" size="14" />
                <span>{{ taskBusy ? 'Yuborilmoqda...' : 'Vazifa berish' }}</span>
              </button>
            </form>

            <div class="task-list-box">
              <div class="task-list-head">
                <div>
                  <div class="team-card-title">Vazifalar ro‘yxati</div>
                  <p class="team-hint">Operatorlar o‘ziga biriktirilgan ishni bajarilgan deb belgilaydi, owner/admin esa nazorat qiladi.</p>
                </div>
                <button class="ghost-btn compact-btn" type="button" :disabled="taskLoading" @click="loadOperatorTasks">
                  <Icon name="lucide:refresh-cw" size="13" />
                  <span>Yangilash</span>
                </button>
              </div>

              <div v-if="taskLoading" class="team-empty">Vazifalar yuklanmoqda...</div>
              <div v-else-if="!operatorTasks.length" class="team-empty">Hali vazifa berilmagan.</div>
              <div v-else class="task-list">
                <article v-for="task in operatorTasks" :key="task.id" class="task-row" :class="taskStatusClass(task.status)">
                  <div class="task-row-top">
                    <div>
                      <strong>{{ task.title }}</strong>
                      <span>{{ taskAssigneeName(task) }} · {{ taskDueLabel(task.due_at) }}</span>
                    </div>
                    <span class="task-status">{{ taskStatusLabel(task.status) }}</span>
                  </div>
                  <p v-if="task.description" class="task-description">{{ task.description }}</p>
                  <div class="task-meta">
                    <span>Jarima: {{ money(task.penalty_amount || 0) }}</span>
                    <span v-if="task.penalty_applied">Jarima belgilangan</span>
                    <span v-if="task.completed_at">Bajarildi: {{ taskDueLabel(task.completed_at) }}</span>
                  </div>
                  <div class="task-actions">
                    <button v-if="['pending', 'overdue'].includes(String(task.status))" class="ghost-btn compact-btn" type="button" :disabled="taskBusy" @click="completeOperatorTask(task)">
                      Bajarildi
                    </button>
                    <button v-if="['pending', 'overdue'].includes(String(task.status))" class="ghost-btn compact-btn" type="button" :disabled="taskBusy" @click="cancelOperatorTask(task)">
                      Bekor qilish
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </CpPanelCard>

        <CpPanelCard v-else title="Ruxsat cheklangan" subtitle="Bu bo‘lim sizning rolingiz uchun yopiq.">
          <div class="team-empty">Kerakli bo‘limni ko‘rish uchun owner huquqi kerak.</div>
        </CpPanelCard>
      </div>
    </template>

    <div class="sticky-actions">
      <button class="primary-btn save-btn" type="button" :disabled="saving" @click="saveSettings">
        <Icon name="lucide:save" size="15" />
        <span>{{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { cpApi } from '@legacy/api/cp'
import { useCpAuthStore } from '@legacy/stores/cpAuth'
import { useCpFormatters } from '../../../composables/useCpFormatters'

definePageMeta({
  layout: 'cp',
  roles: ['admin', 'owner'],
})

const { formatDateTime } = useCpFormatters()
const auth = useCpAuthStore()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')
const updatedAt = ref(new Date().toISOString())
const activeTab = ref('club')
const activeTeamTab = ref('staff')

const tabs = [
  { key: 'club', icon: 'lucide:badge-info', label: 'Klub' },
  { key: 'media', icon: 'lucide:monitor-play', label: 'Media' },
  { key: 'installers', icon: 'lucide:download', label: 'O‘rnatish' },
  { key: 'shell', icon: 'lucide:monitor-cog', label: 'Shell sozlamalari' },
  { key: 'location', icon: 'lucide:map-pinned', label: 'Manzil' },
  { key: 'telegram', icon: 'lucide:send', label: 'Telegram' },
  { key: 'automation', icon: 'lucide:clock-3', label: 'Avto smena' },
  { key: 'team', icon: 'lucide:users', label: 'Jamoa' },
]

const logoInput = ref(null)
const promoFileInput = ref(null)
const agentFileInput = ref(null)
const clientFileInput = ref(null)
const shellFileInput = ref(null)

const promoFile = ref(null)
const agentFile = ref(null)
const clientFile = ref(null)
const shellFile = ref(null)

const promoUploading = ref(false)
const agentUploading = ref(false)
const clientUploading = ref(false)
const shellUploading = ref(false)
const autoShiftDraftCount = ref(2)
const operatorsLoading = ref(false)
const operatorSaving = ref(false)
const payrollLoading = ref(false)
const payrollBusy = ref(false)
const taskLoading = ref(false)
const taskBusy = ref(false)
const savingOperatorId = ref(null)

const operators = ref([])
const payroll = ref(null)
const payrollPeriods = ref([])
const payrollAdjustments = ref([])
const operatorTasks = ref([])

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

const taskFilter = reactive({
  status: 'open',
})

const taskForm = reactive({
  assignedToOperatorId: 0,
  title: '',
  description: '',
  dueAt: defaultTaskDueAt(),
  penaltyAmount: 0,
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

const updatedAtLabel = computed(() => formatDateTime(updatedAt.value))
const promoFileName = computed(() => promoFile.value?.name || '')
const agentFileName = computed(() => agentFile.value?.name || '')
const clientFileName = computed(() => clientFile.value?.name || '')
const shellFileName = computed(() => shellFile.value?.name || '')
const staffOperators = computed(() => (
  Array.isArray(operators.value)
    ? operators.value.filter((item) => ['operator', 'admin'].includes(String(item?.role || '').toLowerCase()))
    : []
))
const canManageTeam = computed(() => String(auth.operator?.role || '').toLowerCase() === 'owner')
const canManageTasks = computed(() => ['owner', 'admin'].includes(String(auth.operator?.role || '').toLowerCase()))
const visibleTeamTabs = computed(() => {
  const items = []
  if (canManageTeam.value) {
    items.push(
      { key: 'staff', icon: 'lucide:users', label: 'Xodimlar' },
      { key: 'payroll', icon: 'lucide:wallet-cards', label: 'Ish haqi' },
    )
  }
  if (canManageTasks.value) {
    items.push({ key: 'tasks', icon: 'lucide:clipboard-list', label: 'Vazifalar' })
  }
  return items
})
const clubReady = computed(() => !!form.clubName.trim() || !!form.clubLogo)
const mediaReady = computed(() => !!form.promoVideoUrl.trim())
const installersReadyCount = computed(() => [form.clientInstallerUrl, form.agentInstallerUrl, form.shellInstallerUrl].filter((item) => String(item || '').trim()).length)
const readySections = computed(() => [
  clubReady.value,
  mediaReady.value,
  installersReadyCount.value > 0,
  !!form.shellAutostartPath.trim() || !!form.shellReplacePath.trim(),
  !!form.address.trim() || (validNumber(form.lat) !== null && validNumber(form.lng) !== null),
  !!form.telegramBotToken.trim() || !!form.telegramUser.trim() || !!form.telegramChatId.trim(),
  form.autoShiftEnabled ? normalizeSlots(form.autoShiftSlots).length > 0 : false,
  staffOperators.value.length > 0,
].filter(Boolean).length)

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

function defaultTaskDueAt() {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function money(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} so‘m`
}

function initials(value) {
  const parts = String(value || 'N')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return (parts[0]?.[0] || 'N').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()
}

function roleLabel(role) {
  const value = String(role || '').toLowerCase()
  if (value === 'admin') return 'Administrator'
  if (value === 'operator') return 'Operator'
  return value || '-'
}

function periodStatusLabel(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'draft') return 'Qoralama'
  if (value === 'approved') return 'Tasdiqlangan'
  if (value === 'paid') return 'To‘langan'
  if (value === 'cancelled') return 'Bekor qilingan'
  return value || '-'
}

function taskStatusLabel(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'pending') return 'Kutilmoqda'
  if (value === 'overdue') return 'Muddati o‘tgan'
  if (value === 'completed') return 'Bajarilgan'
  if (value === 'cancelled') return 'Bekor qilingan'
  return value || '-'
}

function taskStatusClass(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'completed') return 'is-completed'
  if (value === 'overdue') return 'is-overdue'
  if (value === 'cancelled') return 'is-cancelled'
  return 'is-pending'
}

function taskDueLabel(value) {
  return value ? formatDateTime(value) : '-'
}

function taskAssigneeName(task) {
  const assigned = task?.assigned_to || {}
  return assigned.name || assigned.login || 'Xodim'
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

function resetTaskForm() {
  taskForm.title = ''
  taskForm.description = ''
  taskForm.dueAt = defaultTaskDueAt()
  taskForm.penaltyAmount = 0
  if (!taskForm.assignedToOperatorId && staffOperators.value[0]?.id) {
    taskForm.assignedToOperatorId = staffOperators.value[0].id
  }
}

function downloadBlob(data, filename) {
  const blob = data instanceof Blob ? data : new Blob([data])
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function selectTab(key) {
  activeTab.value = key
  if (key === 'team') ensureTeamTab()
  if (key === 'team' && (canManageTeam.value || canManageTasks.value) && !operatorsLoading.value && !payrollLoading.value && !staffOperators.value.length) {
    loadStaffData()
  }
}

function ensureTeamTab() {
  const first = visibleTeamTabs.value[0]?.key || 'tasks'
  if (!visibleTeamTabs.value.some((tab) => tab.key === activeTeamTab.value)) {
    activeTeamTab.value = first
  }
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
  const match = String(raw || '').match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{6,})/)
  return match ? match[1] : ''
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
  for (const row of Array.isArray(items) ? items : []) {
    if (row && typeof row.key === 'string') out[row.key] = row.value
  }
  return out
}

function validNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function cloneSlots(slots) {
  return (Array.isArray(slots) ? slots : []).map((slot, idx) => ({
    label: String(slot?.label || `Smena ${idx + 1}`),
    start: String(slot?.start || ''),
    end: String(slot?.end || ''),
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
    out.push({ label: String(item.label || `Smena ${i + 1}`), start, end })
  }
  return out
}

function createDefaultSlot(index) {
  if (index === 0) return { label: 'Kunduzgi', start: '09:00', end: '21:00' }
  if (index === 1) return { label: 'Tungi', start: '21:00', end: '09:00' }
  return { label: `Smena ${index + 1}`, start: '00:00', end: '08:00' }
}

function applyAutoShiftCount() {
  const next = Math.max(1, Math.min(6, Number(autoShiftDraftCount.value || 1)))
  autoShiftDraftCount.value = next
  const current = cloneSlots(form.autoShiftSlots)
  while (current.length < next) current.push(createDefaultSlot(current.length))
  if (current.length > next) current.length = next
  form.autoShiftSlots = current
}

function onAutoShiftEnabledChange() {
  if (form.autoShiftEnabled && !form.autoShiftSlots.length) applyAutoShiftCount()
}

function addAutoShiftSlot() {
  if (form.autoShiftSlots.length >= 6) return
  form.autoShiftSlots.push(createDefaultSlot(form.autoShiftSlots.length))
  autoShiftDraftCount.value = form.autoShiftSlots.length
}

function removeAutoShiftSlot(index) {
  if (form.autoShiftSlots.length <= 1) return
  form.autoShiftSlots.splice(index, 1)
  autoShiftDraftCount.value = form.autoShiftSlots.length
}

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
    form.lat = loc.lat == null ? '' : String(loc.lat)
    form.lng = loc.lng == null ? '' : String(loc.lng)
    form.telegramUser = typeof map.telegram_user === 'string' ? map.telegram_user : ''
    form.telegramChatId = typeof map.telegram_chat_id === 'string' ? map.telegram_chat_id : ''
    form.telegramBotToken = typeof map.telegram_bot_token === 'string' ? map.telegram_bot_token : ''
    form.telegramShiftNotifications = map.telegram_shift_notifications === undefined ? true : !!map.telegram_shift_notifications
    form.autoShiftEnabled = map.auto_shift_enabled === undefined ? false : !!map.auto_shift_enabled
    form.autoShiftSlots = normalizeSlots(map.auto_shift_slots)
    form.autoShiftOpeningCash = Math.max(0, Number(map.auto_shift_opening_cash || 0))
    autoShiftDraftCount.value = form.autoShiftSlots.length || 2
    updatedAt.value = new Date().toISOString()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Sozlamalar yuklanmadi'
  } finally {
    loading.value = false
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
  promoFile.value = event?.target?.files?.[0] || null
}

async function uploadPromoFile() {
  if (!promoFile.value) return
  promoUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const formData = new FormData()
    formData.append('file', promoFile.value)
    const { data } = await cpApi.promoVideoUpload(formData)
    if (data?.url) form.promoVideoUrl = data.url
    promoFile.value = null
    if (promoFileInput.value) promoFileInput.value.value = ''
    message.value = 'Reklama videosi yuklandi'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Reklama videosi yuklanmadi'
  } finally {
    promoUploading.value = false
  }
}

function onAgentFileSelected(event) {
  agentFile.value = event?.target?.files?.[0] || null
}

async function uploadAgentFile() {
  if (!agentFile.value) return
  agentUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const formData = new FormData()
    formData.append('file', agentFile.value)
    const { data } = await cpApi.agentInstallerUpload(formData)
    if (data?.url) form.agentInstallerUrl = data.url
    if (data?.sha256) form.agentHash = data.sha256
    agentFile.value = null
    if (agentFileInput.value) agentFileInput.value.value = ''
    message.value = 'Agent fayli yuklandi'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Agent fayli yuklanmadi'
  } finally {
    agentUploading.value = false
  }
}

function onClientFileSelected(event) {
  clientFile.value = event?.target?.files?.[0] || null
}

async function uploadClientFile() {
  if (!clientFile.value) return
  clientUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const formData = new FormData()
    formData.append('file', clientFile.value)
    const { data } = await cpApi.clientInstallerUpload(formData)
    if (data?.url) form.clientInstallerUrl = data.url
    clientFile.value = null
    if (clientFileInput.value) clientFileInput.value.value = ''
    message.value = 'Kompyuter ilovasi fayli yuklandi'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Kompyuter ilovasi fayli yuklanmadi'
  } finally {
    clientUploading.value = false
  }
}

function onShellFileSelected(event) {
  shellFile.value = event?.target?.files?.[0] || null
}

async function uploadShellFile() {
  if (!shellFile.value) return
  shellUploading.value = true
  error.value = ''
  message.value = ''
  try {
    const formData = new FormData()
    formData.append('file', shellFile.value)
    const { data } = await cpApi.shellInstallerUpload(formData)
    if (data?.url) form.shellInstallerUrl = data.url
    if (data?.sha256) form.shellHash = data.sha256
    shellFile.value = null
    if (shellFileInput.value) shellFileInput.value.value = ''
    message.value = 'Shell fayli yuklandi'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Shell fayli yuklanmadi'
  } finally {
    shellUploading.value = false
  }
}

function useMyLocation() {
  error.value = ''
  message.value = ''
  if (!process.client || !navigator?.geolocation) {
    error.value = 'Brauzer geolokatsiyani qo‘llamaydi'
    return
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.lat = String(position.coords.latitude)
      form.lng = String(position.coords.longitude)
      message.value = 'Lokatsiya olindi'
    },
    () => {
      error.value = 'Lokatsiyani olib bo‘lmadi'
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

async function loadOperators() {
  operatorsLoading.value = true
  try {
    const { data } = await cpApi.operators()
    operators.value = Array.isArray(data?.data) ? data.data : []
    if (!payrollAction.operatorId && staffOperators.value[0]?.id) {
      payrollAction.operatorId = staffOperators.value[0].id
    }
    if (!taskForm.assignedToOperatorId && staffOperators.value[0]?.id) {
      taskForm.assignedToOperatorId = staffOperators.value[0].id
    }
  } catch (e) {
    operators.value = []
    error.value = e?.response?.data?.message || 'Jamoa yuklanmadi'
  } finally {
    operatorsLoading.value = false
  }
}

async function loadOperatorTasks() {
  if (!canManageTasks.value) return
  taskLoading.value = true
  try {
    const params = {
      per_page: 30,
    }
    if (taskFilter.status === 'open') {
      params.open = 1
    } else if (taskFilter.status) {
      params.status = taskFilter.status
    }
    const { data } = await cpApi.operatorTasks(params)
    const payload = data?.data
    operatorTasks.value = Array.isArray(payload?.data)
      ? payload.data
      : (Array.isArray(payload) ? payload : [])
  } catch (e) {
    operatorTasks.value = []
    error.value = e?.response?.data?.message || 'Vazifalar yuklanmadi'
  } finally {
    taskLoading.value = false
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
    payroll.value = null
    error.value = e?.response?.data?.message || 'Ish haqi hisoblanmadi'
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
    payrollPeriods.value = []
    payrollAdjustments.value = []
    if (!error.value) error.value = e?.response?.data?.message || 'Ish haqi ma’lumotlari yuklanmadi'
  }
}

async function loadStaffData() {
  if (!canManageTeam.value && !canManageTasks.value) return
  error.value = ''
  message.value = ''
  const loaders = [loadOperators()]
  if (canManageTeam.value) {
    loaders.push(loadPayroll(), loadPayrollMeta())
  }
  if (canManageTasks.value) {
    loaders.push(loadOperatorTasks())
  }
  await Promise.all(loaders)
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
    is_active: true,
  }

  if (!payload.name || !payload.login || !payload.password) {
    error.value = 'Ism, login va parol majburiy'
    return
  }

  operatorSaving.value = true
  try {
    await cpApi.operatorCreate(payload)
    resetOperatorForm()
    message.value = 'Xodim qo‘shildi'
    await loadStaffData()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Xodim qo‘shilmadi'
  } finally {
    operatorSaving.value = false
  }
}

async function saveStaffSalary(staff) {
  if (!staff?.id || savingOperatorId.value) return
  error.value = ''
  message.value = ''
  savingOperatorId.value = staff.id
  try {
    await cpApi.operatorUpdate(staff.id, {
      name: staff.name,
      login: staff.login,
      role: staff.role,
      is_active: !!staff.is_active,
      salary_type: staff.salary_type || 'daily',
      salary_amount: Math.max(0, Number(staff.salary_amount || 0)),
    })
    message.value = 'Ish haqi summasi saqlandi'
    await loadStaffData()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Ish haqi summasi saqlanmadi'
  } finally {
    savingOperatorId.value = null
  }
}

async function toggleStaff(staff) {
  if (!staff?.id || savingOperatorId.value) return
  error.value = ''
  message.value = ''
  savingOperatorId.value = staff.id
  try {
    await cpApi.operatorUpdate(staff.id, {
      name: staff.name,
      login: staff.login,
      role: staff.role,
      is_active: !staff.is_active,
      salary_type: staff.salary_type || 'daily',
      salary_amount: Math.max(0, Number(staff.salary_amount || 0)),
    })
    message.value = !staff.is_active ? 'Xodim faollashtirildi' : 'Xodim o‘chirildi'
    await loadStaffData()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Xodim holati o‘zgarmadi'
  } finally {
    savingOperatorId.value = null
  }
}

async function markTodayAttendance(staff) {
  if (!staff?.id || savingOperatorId.value) return
  error.value = ''
  message.value = ''
  savingOperatorId.value = staff.id
  try {
    await cpApi.operatorAttendanceSave({
      operator_id: staff.id,
      work_date: todayDate(),
      status: 'worked',
      note: 'Sozlamalar sahifasi orqali belgilandi',
    })
    message.value = 'Bugungi davomat belgilandi'
    await loadStaffData()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Davomat belgilanmadi'
  } finally {
    savingOperatorId.value = null
  }
}

async function createOperatorTask() {
  if (taskBusy.value) return
  error.value = ''
  message.value = ''

  const payload = {
    assigned_to_operator_id: Number(taskForm.assignedToOperatorId || 0),
    title: String(taskForm.title || '').trim(),
    description: String(taskForm.description || '').trim() || null,
    due_at: taskForm.dueAt ? `${taskForm.dueAt}:00` : '',
    penalty_amount: Math.max(0, Number(taskForm.penaltyAmount || 0)),
  }

  if (!payload.assigned_to_operator_id || !payload.title || !payload.due_at) {
    error.value = 'Xodim, vazifa nomi va muddat majburiy'
    return
  }

  taskBusy.value = true
  try {
    await cpApi.operatorTaskCreate(payload)
    resetTaskForm()
    message.value = 'Vazifa operatorga biriktirildi'
    await loadOperatorTasks()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Vazifa berilmadi'
  } finally {
    taskBusy.value = false
  }
}

async function completeOperatorTask(task) {
  if (!task?.id || taskBusy.value) return
  error.value = ''
  message.value = ''
  taskBusy.value = true
  try {
    await cpApi.operatorTaskComplete(task.id, {
      completion_note: 'Panel orqali bajarildi deb belgilandi',
    })
    message.value = 'Vazifa bajarildi deb belgilandi'
    await loadOperatorTasks()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Vazifa bajarilgan deb belgilanmadi'
  } finally {
    taskBusy.value = false
  }
}

async function cancelOperatorTask(task) {
  if (!task?.id || taskBusy.value) return
  error.value = ''
  message.value = ''
  taskBusy.value = true
  try {
    await cpApi.operatorTaskCancel(task.id)
    message.value = 'Vazifa bekor qilindi'
    await loadOperatorTasks()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Vazifa bekor qilinmadi'
  } finally {
    taskBusy.value = false
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
    message.value = 'Ish haqi yozuvi qo‘shildi'
    await loadStaffData()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Ish haqi yozuvi qo‘shilmadi'
  } finally {
    payrollBusy.value = false
  }
}

async function generatePayrollPeriod() {
  if (payrollBusy.value) return
  error.value = ''
  message.value = ''
  payrollBusy.value = true
  try {
    await cpApi.payrollPeriodCreate({
      name: `Ish haqi ${payrollFilter.from} - ${payrollFilter.to}`,
      from: payrollFilter.from,
      to: payrollFilter.to,
    })
    message.value = 'Yakuniy hisob davri yaratildi'
    await loadStaffData()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Yakuniy hisob davri yaratilmadi'
  } finally {
    payrollBusy.value = false
  }
}

async function approvePayrollPeriod(id) {
  if (!id || payrollBusy.value) return
  error.value = ''
  message.value = ''
  payrollBusy.value = true
  try {
    await cpApi.payrollPeriodApprove(id)
    message.value = 'Yakuniy hisob davri tasdiqlandi'
    await loadStaffData()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Yakuniy hisob davri tasdiqlanmadi'
  } finally {
    payrollBusy.value = false
  }
}

async function markPayrollPeriodPaid(id) {
  if (!id || payrollBusy.value) return
  error.value = ''
  message.value = ''
  payrollBusy.value = true
  try {
    await cpApi.payrollPeriodMarkPaid(id)
    message.value = 'Yakuniy hisob davri to‘landi'
    await loadStaffData()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Yakuniy hisob davri to‘landi deb belgilanmadi'
  } finally {
    payrollBusy.value = false
  }
}

async function exportPayrollXlsx() {
  if (payrollBusy.value) return
  error.value = ''
  message.value = ''
  payrollBusy.value = true
  try {
    const { data } = await cpApi.payrollExportXlsx({
      from: payrollFilter.from,
      to: payrollFilter.to,
    })
    downloadBlob(data, `operator-payroll-${payrollFilter.from}-${payrollFilter.to}.xlsx`)
  } catch (e) {
    error.value = e?.response?.data?.message || 'Excel yuklanmadi'
  } finally {
    payrollBusy.value = false
  }
}

async function exportPayrollPdf() {
  if (payrollBusy.value) return
  error.value = ''
  message.value = ''
  payrollBusy.value = true
  try {
    const { data } = await cpApi.payrollExportPdf({
      from: payrollFilter.from,
      to: payrollFilter.to,
    })
    downloadBlob(data, `operator-payroll-${payrollFilter.from}-${payrollFilter.to}.pdf`)
  } catch (e) {
    error.value = e?.response?.data?.message || 'PDF yuklanmadi'
  } finally {
    payrollBusy.value = false
  }
}

async function saveSettings() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const payload = {
      settings: {
        club_name: form.clubName.trim(),
        club_logo: form.clubLogo || '',
        promo_video_url: form.promoVideoUrl.trim(),
        deploy_agent_download_url: form.agentInstallerUrl.trim(),
        deploy_agent_install_args: form.agentInstallArgs.trim(),
        deploy_client_download_url: form.clientInstallerUrl.trim(),
        deploy_client_install_args: form.clientInstallArgs.trim(),
        deploy_shell_download_url: form.shellInstallerUrl.trim(),
        deploy_shell_install_args: form.shellInstallArgs.trim(),
        deploy_agent_sha256: form.agentHash.trim(),
        deploy_shell_sha256: form.shellHash.trim(),
        shell_autostart_enabled: !!form.shellAutostartEnabled,
        shell_autostart_path: form.shellAutostartPath.trim(),
        shell_autostart_args: form.shellAutostartArgs.trim(),
        shell_autostart_scope: form.shellAutostartScope,
        shell_replace_explorer_enabled: !!form.shellReplaceEnabled,
        shell_replace_explorer_path: form.shellReplacePath.trim(),
        shell_replace_explorer_args: form.shellReplaceArgs.trim(),
        club_location: {
          address: form.address.trim(),
          lat: validNumber(form.lat),
          lng: validNumber(form.lng),
        },
        telegram_user: form.telegramUser.trim(),
        telegram_chat_id: form.telegramChatId.trim(),
        telegram_bot_token: form.telegramBotToken.trim(),
        telegram_shift_notifications: !!form.telegramShiftNotifications,
        auto_shift_enabled: !!form.autoShiftEnabled,
        auto_shift_slots: normalizeSlots(form.autoShiftSlots),
        auto_shift_opening_cash: Math.max(0, Number(form.autoShiftOpeningCash || 0)),
      },
    }
    await cpApi.settingsUpdate(payload)
    updatedAt.value = new Date().toISOString()
    message.value = 'Sozlamalar saqlandi'
    if (process.client) {
      window.dispatchEvent(new CustomEvent('cp-club-settings-updated', {
        detail: {
          club_name: form.clubName,
          club_logo: form.clubLogo,
        },
      }))
    }
  } catch (e) {
    error.value = e?.response?.data?.message || 'Sozlamalar saqlanmadi'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  ensureTeamTab()
  await loadSettings()
  if (!form.autoShiftSlots.length) applyAutoShiftCount()
  if (canManageTeam.value || canManageTasks.value) await loadStaffData()
})

watch(visibleTeamTabs, () => {
  ensureTeamTab()
}, { immediate: true })

watch([canManageTeam, canManageTasks], ([canManageAllowed, tasksAllowed]) => {
  if ((canManageAllowed || tasksAllowed) && activeTab.value === 'team' && !staffOperators.value.length) {
    loadStaffData()
  }
})
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 18px;
}

.tab-strip {
  position: sticky;
  top: 12px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--stroke);
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 96%, transparent), color-mix(in srgb, var(--surface) 100%, transparent));
}

.tab-btn,
.ghost-btn,
.primary-btn,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color .18s ease, transform .18s ease, background .18s ease;
}

.tab-btn.active,
.primary-btn {
  border-color: color-mix(in srgb, var(--brand-secondary) 36%, var(--stroke));
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 14%, var(--surface-soft)), color-mix(in srgb, var(--brand) 14%, var(--surface)));
}

.ghost-btn:hover,
.primary-btn:hover,
.tab-btn:hover,
.icon-btn:hover {
  transform: translateY(-1px);
  border-color: var(--stroke-strong);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field,
.check-line {
  display: grid;
  gap: 8px;
}

.field-span-2 {
  grid-column: span 2;
}

.field span,
.slot-top strong {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.field input,
.field select,
.field textarea,
.file-input {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 14px;
  outline: none;
}

.field textarea {
  min-height: 132px;
  padding: 14px;
  resize: vertical;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: color-mix(in srgb, var(--brand-secondary) 38%, var(--stroke));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-secondary) 14%, transparent);
}

.logo-layout {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.logo-preview,
.video-shell,
.map-shell,
.slot-card,
.empty-preview,
.panel-error,
.panel-ok {
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  border-radius: 18px;
}

.logo-preview {
  width: 132px;
  height: 132px;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-preview {
  min-height: 132px;
  display: grid;
  place-items: center;
  gap: 6px;
  color: var(--text-muted);
}

.empty-preview.wide {
  min-height: 240px;
}

.stack-col {
  display: grid;
  gap: 12px;
}

.inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 14px;
}

.helper-chip,
.hero-meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.video-shell,
.map-shell {
  min-height: 280px;
  overflow: hidden;
}

.video-shell img,
.video-shell video,
.video-shell iframe,
.map-shell iframe {
  width: 100%;
  height: 100%;
  min-height: 280px;
  object-fit: cover;
  border: 0;
}

.check-line {
  grid-auto-flow: column;
  justify-content: start;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: var(--surface-soft);
}

.check-line input {
  width: 16px;
  height: 16px;
}

.check-line.danger {
  border-color: color-mix(in srgb, var(--danger) 30%, var(--stroke));
}

.slot-list {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.slot-card {
  padding: 14px;
}

.slot-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.icon-btn {
  min-width: 42px;
  width: 42px;
  padding: 0;
}

.icon-btn.soft {
  background: color-mix(in srgb, var(--danger) 8%, var(--surface-soft));
  border-color: color-mix(in srgb, var(--danger) 24%, var(--stroke));
}

.sticky-actions {
  position: sticky;
  bottom: 18px;
  display: flex;
  justify-content: flex-end;
  z-index: 4;
}

.save-btn {
  min-width: 170px;
  box-shadow: 0 18px 30px rgba(9, 20, 40, 0.14);
}

.panel-error,
.panel-ok {
  padding: 13px 16px;
  font-size: 13px;
  font-weight: 700;
}

.panel-error {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 28%, var(--stroke));
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
}

.panel-ok {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 24%, var(--stroke));
  background: color-mix(in srgb, var(--success) 8%, var(--surface));
}

.team-shell {
  display: grid;
  gap: 18px;
}

.team-workspace-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px;
  border: 1px solid var(--stroke);
  border-radius: 20px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--brand-secondary) 10%, transparent), transparent 46%),
    color-mix(in srgb, var(--surface-soft) 88%, transparent);
}

.team-subtabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.team-subtab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease, color .18s ease, transform .18s ease;
}

.team-subtab:hover {
  transform: translateY(-1px);
  color: var(--text);
  border-color: var(--stroke);
}

.team-subtab.active {
  border-color: color-mix(in srgb, var(--brand-secondary) 30%, var(--stroke));
  background: color-mix(in srgb, var(--brand-secondary) 12%, var(--surface));
  color: var(--text);
}

.team-toolbar {
  display: flex;
  justify-content: flex-end;
}

.team-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.team-summary-card {
  display: grid;
  gap: 8px;
  min-height: 98px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--brand-secondary) 22%, var(--stroke));
  border-radius: 20px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--brand-secondary) 14%, transparent), transparent 52%),
    color-mix(in srgb, var(--surface-soft) 94%, transparent);
}

.team-summary-card span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.team-summary-card strong {
  color: var(--text);
  font-size: clamp(22px, 2vw, 30px);
  font-weight: 950;
  line-height: 1.1;
}

.team-grid {
  display: grid;
  grid-template-columns: minmax(280px, .9fr) minmax(0, 1.1fr);
  gap: 18px;
  align-items: stretch;
}

.task-layout {
  display: grid;
  grid-template-columns: minmax(300px, .85fr) minmax(0, 1.15fr);
  gap: 18px;
  align-items: start;
}

.team-create,
.payroll-box,
.task-create,
.task-list-box {
  border: 1px solid var(--stroke);
  background: var(--surface-soft);
  border-radius: 22px;
  padding: 18px;
}

.team-create.is-flat,
.payroll-box.is-flat {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.team-card-title {
  margin-bottom: 12px;
  color: var(--text);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.team-hint {
  margin: -4px 0 14px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.team-submit {
  width: 100%;
  margin-top: 14px;
}

.task-list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.payroll-filter,
.payroll-action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
}

.payroll-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.payroll-metric {
  display: grid;
  gap: 8px;
  min-height: 94px;
  padding: 14px;
  border: 1px solid var(--stroke);
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
}

.payroll-metric span,
.period-row span,
.staff-person span,
.staff-payline span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.payroll-metric strong,
.period-money,
.staff-payline strong {
  color: var(--text);
  font-size: 20px;
  font-weight: 900;
}

.period-list,
.staff-list,
.task-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.period-row,
.staff-row,
.task-row {
  display: grid;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--stroke);
  border-radius: 20px;
  background: var(--surface-soft);
}

.task-row {
  align-items: stretch;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--brand-secondary) 8%, transparent), transparent 58%),
    color-mix(in srgb, var(--surface) 88%, transparent);
}

.task-row.is-overdue {
  border-color: color-mix(in srgb, var(--danger) 32%, var(--stroke));
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--danger) 12%, transparent), transparent 58%),
    var(--surface-soft);
}

.task-row.is-completed {
  border-color: color-mix(in srgb, var(--success) 28%, var(--stroke));
}

.task-row.is-cancelled {
  opacity: .7;
}

.task-row-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.task-row-top > div:first-child {
  display: grid;
  gap: 5px;
}

.task-row-top strong {
  color: var(--text);
  font-size: 16px;
  font-weight: 900;
}

.task-row-top span,
.task-description,
.task-meta {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.task-status {
  flex: 0 0 auto;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--brand-secondary) 28%, var(--stroke));
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-secondary) 10%, var(--surface-soft));
  color: var(--text);
  font-size: 11px !important;
  font-weight: 900;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.task-description {
  margin: 0;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-meta span {
  padding: 7px 10px;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-soft) 80%, transparent);
}

.period-row {
  grid-template-columns: minmax(0, 1fr) auto auto;
}

.period-row > div:first-child {
  display: grid;
  gap: 4px;
}

.period-actions,
.staff-actions,
.task-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.staff-row {
  grid-template-columns: minmax(220px, 1.2fr) minmax(130px, .65fr) minmax(150px, .75fr) minmax(150px, .8fr) minmax(220px, 1fr);
}

.staff-row.compact {
  grid-template-columns: minmax(220px, 1.3fr) minmax(130px, .7fr) minmax(150px, .8fr) minmax(220px, 1fr);
}

.staff-person {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.staff-person > div:last-child {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.staff-person strong,
.staff-person span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.staff-avatar {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--brand-secondary) 28%, var(--stroke));
  border-radius: 16px;
  background: color-mix(in srgb, var(--brand-secondary) 14%, var(--surface));
  color: var(--brand-secondary);
  font-weight: 900;
}

.staff-inline-field {
  gap: 6px;
}

.staff-payline {
  display: grid;
  gap: 4px;
}

.team-empty {
  display: grid;
  min-height: 130px;
  place-items: center;
  border: 1px dashed var(--stroke);
  border-radius: 20px;
  color: var(--text-muted);
  font-weight: 800;
}

.compact-btn {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  font-size: 12px;
}

@media (max-width: 1180px) {
  .content-grid,
  .team-grid,
  .task-layout,
  .team-summary,
  .staff-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .payroll-filter,
  .payroll-action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .team-workspace-head {
    align-items: stretch;
    flex-direction: column;
  }

  .team-subtabs,
  .team-toolbar,
  .team-toolbar .ghost-btn {
    width: 100%;
  }

  .team-subtab {
    flex: 1 1 0;
    justify-content: center;
  }

  .content-grid,
  .form-grid,
  .logo-layout,
  .team-grid,
  .task-layout,
  .team-summary,
  .payroll-filter,
  .payroll-action-grid,
  .payroll-metrics,
  .period-row,
  .staff-row {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: span 1;
  }

  .logo-preview {
    width: 100%;
    max-width: 180px;
  }
}
</style>
