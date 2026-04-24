import { http } from './http'

export const cpApi = {
    // ixtiyoriy: license tekshirib tenant nomini ko'rsatish uchun
    resolveLicense(payload) {
        return http.post('/cp/license/resolve', payload)
    },

    login(payload) {
        return http.post('/cp/auth/login', payload)
    },

    me() {
        return http.get('/cp/auth/me')
    },

    logout() {
        return http.post('/cp/auth/logout')
    },

    // keyingi sahifalar (keyin ulaymiz)

    clients(params) {
        return http.get('/clients', { params })
    },
    createClient(payload) {
        return http.post('/clients', payload)
    },
    topupClient(id, payload) {
        return http.post(`/clients/${id}/topup`, payload)
    },

    bulkTopup(payload) {
        return http.post('/clients/bulk-topup', payload)
    },
    clientHistory(id, params) {
        return http.get(`/clients/${id}/history`, { params })
    },

    clientSessions(id, params) {
        return http.get(`/clients/${id}/sessions`, { params })
    },
    clientReturnsOptions(id) {
        return http.get(`/clients/${id}/returns/options`)
    },
    clientReturn(id, payload) {
        return http.post(`/clients/${id}/returns`, payload)
    },
    clientTransfer(id, payload) {
        return http.post(`/clients/${id}/transfer`, payload)
    },
    returnsList(params) {
        return http.get('/returns', { params })
    },
    transfersList(params) {
        return http.get('/transfers', { params })
    },
    bookingsList(params = {}) {
        return http.get('/bookings', { params })
    },
    bookingCreate(payload) {
        return http.post('/bookings', payload)
    },
    bookingCancel(id) {
        return http.post(`/bookings/${id}/cancel`)
    },
    // SHIFT (kassa/smena)
    shiftCurrent() {
        return http.get('/shifts/current')
    },
    shiftOpen(payload) {
        return http.post('/shifts/open', payload)
    },
    shiftClose(payload) {
        return http.post('/shifts/close', payload)
    },
    shiftReport(params = {}) {
        // params: { shift_id: 1 } kabi
        return http.get('/shifts/report', { params })
    },
    reportOverview(params = {}) {
        return http.get('/reports/overview', { params })
    },
    reportBranchCompare(params = {}) {
        return http.get('/reports/branch-compare', { params })
    },
    reportAutopilot(params = {}) {
        return http.get('/reports/autopilot', { params })
    },
    reportAutopilotApply(payload = {}) {
        return http.post('/reports/autopilot/apply', payload)
    },
    reportExchange(params = {}) {
        return http.get('/reports/exchange', { params })
    },
    reportExchangeConfig(payload = {}) {
        return http.post('/reports/exchange/config', payload)
    },
    currentShiftSummary() {
        return http.get('/shifts/current/summary')
    },
    shiftHistory(params = {}) {
        return http.get('/shifts/history', { params })
    },
    shiftHistoryExport(params = {}) {
        return http.get('/shifts/history/export', {
            params,
            responseType: 'blob',
        })
    },
    shiftHistoryExportXlsx(params = {}) {
        return http.get('/shifts/history/export-xlsx', {
            params,
            responseType: 'blob',
        })
    },
    shiftHistoryDetail(id) {
        return http.get(`/shifts/history/${id}`)
    },
    shiftExpensesCurrent(params = {}) {
        return http.get('/shifts/current/expenses', { params })
    },
    shiftExpenseCreate(payload) {
        return http.post('/shifts/current/expenses', payload)
    },
    shiftExpenseDelete(id) {
        return http.delete(`/shifts/expenses/${id}`)
    },
    promotionList(params) {
        return http.get('/promotions', { params })
    },
    promotionCreate(payload) {
        return http.post('/promotions', payload)
    },
    promotionUpdate(id, payload) {
        return http.patch(`/promotions/${id}`, payload)
    },
    promotionToggle(id) {
        return http.post(`/promotions/${id}/toggle`)
    },
    promotionActiveForTopup(params) {
        return http.get('/promotions/active-for-topup', { params })
    },
    zoneList(params) {
        return http.get('/zones', { params })
    },
    zoneCreate(payload) {
        return http.post('/zones', payload)
    },
    zoneUpdate(id, payload) {
        return http.patch(`/zones/${id}`, payload)
    },
    zoneToggle(id) {
        return http.post(`/zones/${id}/toggle`)
    },
    clubVisuals(params = {}) {
        return http.get('/club-visuals', { params })
    },
    clubVisualCreate(payload) {
        return http.post('/club-visuals', payload)
    },
    nexoraOverview(params = {}) {
        return http.get('/nexora-assistant/overview', { params })
    },
    nexoraPlan(payload = {}) {
        return http.post('/nexora-assistant/plan', payload)
    },
    nexoraExecute(payload = {}) {
        return http.post('/nexora-assistant/execute', payload)
    },
    nexoraAutopilot(payload = {}) {
        return http.post('/nexora-assistant/autopilot', payload)
    },
    nexoraSpeak(payload = {}) {
        return http.post('/nexora-assistant/speak', payload, {
            responseType: 'blob',
        })
    },
    clubVisualGenerateDraft(payload) {
        return http.post('/club-visuals/generate-draft', payload)
    },
    clubVisualUpdate(id, payload) {
        return http.patch(`/club-visuals/${id}`, payload)
    },
    clubVisualToggle(id) {
        return http.post(`/club-visuals/${id}/toggle`)
    },
    clubVisualDelete(id) {
        return http.delete(`/club-visuals/${id}`)
    },
    shellBanners(params = {}) {
        return http.get('/shell-banners', { params })
    },
    shellBannerCreate(payload) {
        return http.post('/shell-banners', payload)
    },
    shellBannerUpdate(id, payload) {
        return http.patch(`/shell-banners/${id}`, payload)
    },
    shellBannerToggle(id) {
        return http.post(`/shell-banners/${id}/toggle`)
    },
    shellBannerDelete(id) {
        return http.delete(`/shell-banners/${id}`)
    },
    shellBannerImageUpload(formData) {
        return http.post('/shell-banners/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
    shellBannerLogoUpload(formData) {
        return http.post('/shell-banners/upload-logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
    shellBannerAudioUpload(formData) {
        return http.post('/shell-banners/upload-audio', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
    clubVisualImageUpload(formData) {
        return http.post('/club-visuals/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
    clubVisualAudioUpload(formData) {
        return http.post('/club-visuals/upload-audio', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
    zonePricingWindows(zoneId, params = {}) {
        return http.get(`/zones/${zoneId}/pricing-windows`, { params })
    },
    zonePricingWindowCreate(zoneId, payload) {
        return http.post(`/zones/${zoneId}/pricing-windows`, payload)
    },
    zonePricingWindowUpdate(zoneId, windowId, payload) {
        return http.patch(`/zones/${zoneId}/pricing-windows/${windowId}`, payload)
    },
    zonePricingWindowToggle(zoneId, windowId) {
        return http.post(`/zones/${zoneId}/pricing-windows/${windowId}/toggle`)
    },
    zonePricingWindowDelete(zoneId, windowId) {
        return http.delete(`/zones/${zoneId}/pricing-windows/${windowId}`)
    },
    packagesList(params){ return http.get('/packages', { params }) },
    packagesCreate(payload){ return http.post('/packages', payload) },
    packagesUpdate(id, payload){ return http.patch(`/packages/${id}`, payload) },
    packagesToggle(id){ return http.post(`/packages/${id}/toggle`) },

    zonesList(params){ return http.get('/zones', { params }) },
    attachClientPackage(clientId, payload) {
        return http.post(`/clients/${clientId}/packages/attach`, payload)
    },
    clientPackages(clientId) {
        return http.get(`/clients/${clientId}/packages`)
    },
    // Subscription plans
    subscriptionPlanList(params) {
        return http.get('/subscription-plans', { params })
    },
    subscriptionPlanCreate(payload) {
        return http.post('/subscription-plans', payload)
    },
    subscriptionPlanUpdate(id, payload) {
        return http.patch(`/subscription-plans/${id}`, payload)
    },
    subscriptionPlanToggle(id) {
        return http.post(`/subscription-plans/${id}/toggle`)
    },

// Client subscriptions
    clientSubscriptions(clientId, params) {
        return http.get(`/clients/${clientId}/subscriptions`, { params })
    },
    clientSubscribe(clientId, payload) {
        return http.post(`/clients/${clientId}/subscribe`, payload)
    },
    clientSubscriptionCancel(clientId, subId) {
        return http.post(`/clients/${clientId}/subscriptions/${subId}/cancel`)
    },

    activeSessions() {
        return http.get('/sessions/active')
    },
    pauseSession(id) {
        return http.post(`/sessions/${id}/pause`)
    },
    resumeSession(id) {
        return http.post(`/sessions/${id}/resume`)
    },
    stopSession(id) {
        return http.post(`/sessions/${id}/stop`)
    },
    sendPcCommand(pcId, payload) {
        return http.post(`/pcs/${pcId}/commands`, payload)
    },
    logsList(params = {}) {
        return http.get('/logs', { params })
    },
    deploymentQuickInstall(payload = {}) {
        return http.post('/deployment/quick-install', payload)
    },
    deploymentQuickInstallBulk(payload = {}) {
        return http.post('/deployment/quick-install/bulk', payload)
    },
    deploymentPairCodes(params = {}) {
        return http.get('/deployment/pair-codes', { params })
    },
    deploymentRevokePairCode(code) {
        return http.delete(`/deployment/pair-codes/${encodeURIComponent(code)}`)
    },
    deploymentRollout(payload = {}) {
        return http.post('/deployment/rollout', payload)
    },
    deploymentBatches(params = {}) {
        return http.get('/deployment/batches', { params })
    },
    deploymentBatchStatus(batchId) {
        return http.get(`/deployment/batches/${encodeURIComponent(batchId)}`)
    },
    deploymentRetryFailed(batchId) {
        return http.post(`/deployment/batches/${encodeURIComponent(batchId)}/retry-failed`)
    },
    shellGamesList(params = {}) {
        return http.get('/shell-games', { params })
    },
    shellGameCreate(payload) {
        return http.post('/shell-games', payload)
    },
    shellGameUpdate(id, payload) {
        return http.patch(`/shell-games/${id}`, payload)
    },
    shellGameToggle(id) {
        return http.post(`/shell-games/${id}/toggle`)
    },
    shellGameSetPcState(pcId, gameId, payload) {
        return http.post(`/pcs/${pcId}/shell-games/${gameId}/state`, payload)
    },

    pcs(params) {
        return http.get('/pcs', { params })
    },
    createPc(payload) {
        return http.post('/pcs', payload)
    },
    updatePc(id, payload) {
        return http.patch(`/pcs/${id}`, payload)
    },

    layout() {
        return http.get('/layout')
    },
    layoutGridUpdate(payload) {
        return http.patch('/layout/grid', payload)
    },
    layoutCellsBatch(payload) {
        return http.post('/layout/cells/batch', payload)
    },
    settingsList() {
        return http.get('/settings')
    },
    settingsUpdate(payload) {
        return http.post('/settings', payload)
    },
    promoVideoUpload(formData) {
        return http.post('/settings/promo-video', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
    agentInstallerUpload(formData) {
        return http.post('/settings/agent-installer', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
    clientInstallerUpload(formData) {
        return http.post('/settings/client-installer', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
    shellInstallerUpload(formData) {
        return http.post('/settings/shell-installer', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
    billingLogs(params = {}) {
        return http.get('/billing-logs', { params })
    },
}
