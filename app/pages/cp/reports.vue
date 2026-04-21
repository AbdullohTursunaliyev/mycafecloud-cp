<template>
  <div class="reports-page">
    <CpPageHero :eyebrow="copy.eyebrow" :title="copy.title" :subtitle="copy.subtitle">
      <template #meta>
        <span class="meta-chip">
          <Icon name="lucide:calendar-range" size="14" />
          {{ filters.from }} - {{ filters.to }}
        </span>
        <span class="meta-chip">
          <Icon name="lucide:clock-3" size="14" />
          {{ copy.updated }}: {{ refreshedAtLabel }}
        </span>
      </template>

      <template #actions>
        <div class="hero-tools">
          <label class="hero-field date-field">
            <span class="field-title">{{ copy.from }}</span>
            <div class="field-row">
              <Icon name="lucide:calendar-days" size="15" />
              <input v-model="filters.from" type="date" class="hero-input" />
            </div>
          </label>
          <label class="hero-field date-field">
            <span class="field-title">{{ copy.to }}</span>
            <div class="field-row">
              <Icon name="lucide:calendar-days" size="15" />
              <input v-model="filters.to" type="date" class="hero-input" />
            </div>
          </label>
          <div class="quick-range-group">
            <button class="toolbar-btn quick-btn" :disabled="isLoadingAny" @click="setQuickRange(7)">{{ copy.last7 }}</button>
            <button class="toolbar-btn quick-btn" :disabled="isLoadingAny" @click="setQuickRange(30)">{{ copy.last30 }}</button>
          </div>
          <button class="toolbar-btn toolbar-btn-primary refresh-btn" :disabled="isLoadingAny" @click="refreshAll">
            <Icon name="lucide:refresh-cw" size="15" />
            <span>{{ isLoadingAny ? copy.loading : copy.refresh }}</span>
          </button>
        </div>
      </template>
    </CpPageHero>

    <div class="tab-strip">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <Icon :name="tab.icon" size="16" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <p v-if="pageError" class="alert err">{{ pageError }}</p>

    <div class="stats-grid">
      <CpStatCard compact tone="tone-green" :label="copy.netSales" :value="money(summary.net_sales)" :hint="`${copy.grossSales}: ${money(summary.gross_sales)}`" />
      <CpStatCard compact tone="tone-blue" :label="copy.sessions" :value="String(int(summary.sessions_count))" :hint="`${copy.utilization}: ${num(summary.utilization_pct, 1)}%`" />
      <CpStatCard compact tone="tone-amber" :label="copy.clients" :value="String(int(activity.clients_in_period))" :hint="`${copy.transactions}: ${int(summary.tx_count)}`" />
      <CpStatCard compact tone="tone-rose" :label="copy.risk" :value="money(shiftsMeta.diff_shortage_total)" :hint="`${copy.returns}: ${money(summary.returns_total)}`" />
    </div>

    <template v-if="activeTab === 'overview'">
      <div class="content-grid">
        <CpPanelCard :title="copy.growthTitle" :subtitle="copy.growthSubtitle">
          <div v-if="growthRows.length" class="metric-grid">
            <article v-for="row in growthRows" :key="row.key" class="metric-card growth-card">
              <div class="growth-head">
                <span class="growth-label">
                  <Icon :name="growthIcon(row.key, row.unit)" size="14" />
                  {{ row.label }}
                </span>
              </div>
              <div class="metric-main">
                <strong>{{ growthPrimaryValue(row.current, row.unit) }}</strong>
                <small v-if="growthValueSuffix(row.unit)">{{ growthValueSuffix(row.unit) }}</small>
              </div>
              <div class="growth-foot">
                <em :class="row.trend">
                  <Icon :name="growthTrendIcon(row.trend)" size="13" />
                  {{ diffWithUnit(row.diff, row.unit) }}
                </em>
              </div>
            </article>
          </div>
          <div v-else class="empty-state compact">{{ copy.noData }}</div>
        </CpPanelCard>

        <CpPanelCard :title="copy.paymentMixTitle" :subtitle="copy.paymentMixSubtitle">
          <div class="chart-split">
            <CpReportChart type="doughnut" :data="paymentMixChartData" :options="doughnutOptions" />
            <div class="mix-list">
              <article v-for="item in paymentRows" :key="item.key" class="mix-item">
                <div class="mix-top">
                  <span>{{ item.label }}</span>
                  <strong>{{ money(item.value) }}</strong>
                </div>
                <div class="mix-bar">
                  <div class="mix-fill" :class="item.key" :style="{ width: `${item.pct}%` }"></div>
                </div>
                <small>{{ item.pct }}%</small>
              </article>
            </div>
          </div>
        </CpPanelCard>
      </div>

      <div class="content-grid">
        <CpPanelCard :title="copy.dailyTitle" :subtitle="copy.dailySubtitle">
          <div v-if="daily.length" class="chart-stack">
            <CpReportChart type="line" :data="dailyTrendChartData" :options="lineOptions" />
            <div class="daily-grid">
              <article v-for="item in daily.slice(-6)" :key="item.date" class="daily-card">
                <span>{{ item.date }}</span>
                <strong>{{ money(item.net_sales) }}</strong>
                <small>{{ copy.grossSales }}: {{ money(item.gross_sales) }}</small>
              </article>
            </div>
          </div>
          <div v-else class="empty-state compact">{{ copy.noData }}</div>
        </CpPanelCard>

        <CpPanelCard :title="copy.topClientsTitle" :subtitle="copy.topClientsSubtitle">
          <div v-if="topClients.length" class="stack-list top-clients-list">
            <article v-for="client in topClients.slice(0, 8)" :key="client.client_id" class="stack-card top-client-card">
              <div class="top-client-copy">
                <span class="top-client-badge">
                  <Icon name="lucide:user-round" size="13" />
                  {{ copy.clients }}
                </span>
                <strong>{{ client.login || client.account_id || client.phone || `#${client.client_id}` }}</strong>
                <p>
                  <Icon name="lucide:monitor-play" size="13" />
                  {{ int(client.sessions_count) }} {{ copy.sessionsSmall }}
                </p>
              </div>
              <div class="top-client-amount">
                <span>
                  <Icon name="lucide:wallet" size="13" />
                  {{ copy.netSales }}
                </span>
                <strong>{{ money(client.spent) }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="empty-state compact">{{ copy.noData }}</div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'operations'">
      <div class="content-grid">
        <CpPanelCard :title="copy.hourlyTitle" :subtitle="copy.hourlySubtitle">
          <div v-if="hourly.length" class="chart-stack">
            <CpReportChart type="bar" :data="hourlyChartData" :options="barOptions" />
            <div class="bar-list compact-list">
              <article v-for="item in hourly.slice(0, 6)" :key="item.hour" class="bar-row">
                <span>{{ item.label }}</span>
                <div class="mix-bar">
                  <div class="mix-fill cash" :style="{ width: `${hourlyMax ? Math.max(4, Math.round((int(item.sessions_count) / hourlyMax) * 100)) : 0}%` }"></div>
                </div>
                <strong>{{ int(item.sessions_count) }}</strong>
              </article>
            </div>
          </div>
          <div v-else class="empty-state compact">{{ copy.noData }}</div>
        </CpPanelCard>

        <CpPanelCard :title="copy.weekdayTitle" :subtitle="copy.weekdaySubtitle">
          <div v-if="weekday.length" class="chart-stack">
            <CpReportChart type="line" :data="weekdayChartData" :options="lineOptions" />
            <div class="bar-list compact-list">
              <article v-for="item in weekday" :key="item.weekday_no" class="bar-row">
                <span>{{ item.label }}</span>
                <div class="mix-bar">
                  <div class="mix-fill card" :style="{ width: `${weekdayMax ? Math.max(4, Math.round((int(item.sessions_count) / weekdayMax) * 100)) : 0}%` }"></div>
                </div>
                <strong>{{ int(item.sessions_count) }}</strong>
              </article>
            </div>
          </div>
          <div v-else class="empty-state compact">{{ copy.noData }}</div>
        </CpPanelCard>
      </div>

      <div class="content-grid">
        <CpPanelCard :title="copy.zonesTitle" :subtitle="copy.zonesSubtitle">
          <div v-if="zonesItems.length" class="stack-list report-mini-list">
            <article v-for="item in zonesItems.slice(0, 10)" :key="item.zone" class="stack-card report-mini-card">
              <div class="report-mini-copy">
                <span class="report-mini-badge">
                  <Icon name="lucide:map-pinned" size="13" />
                  {{ copy.zonesTitle }}
                </span>
                <strong>{{ item.zone }}</strong>
                <p>{{ int(item.sessions_count) }} {{ copy.sessionsSmall }} · {{ num(int(item.minutes) / 60, 1) }}h</p>
              </div>
              <div class="report-mini-amount">
                <span>
                  <Icon name="lucide:wallet" size="13" />
                  {{ copy.netSales }}
                </span>
                <strong>{{ money(item.revenue) }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="empty-state compact">{{ copy.noData }}</div>
        </CpPanelCard>

        <CpPanelCard :title="copy.operatorsTitle" :subtitle="copy.operatorsSubtitle">
          <div v-if="operatorItems.length" class="stack-list report-mini-list">
            <article v-for="item in operatorItems.slice(0, 10)" :key="item.operator_id" class="stack-card report-mini-card">
              <div class="report-mini-copy">
                <span class="report-mini-badge">
                  <Icon name="lucide:user-cog" size="13" />
                  {{ copy.operatorsTitle }}
                </span>
                <strong>{{ item.operator }}</strong>
                <p>{{ int(item.tx_count) }} tx · {{ int(item.sessions_count) }} {{ copy.sessionsSmall }}</p>
              </div>
              <div class="report-mini-amount">
                <span>
                  <Icon name="lucide:wallet" size="13" />
                  {{ copy.netSales }}
                </span>
                <strong>{{ money(item.sales_amount) }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="empty-state compact">{{ copy.noData }}</div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'insights'">
      <div class="content-grid">
        <CpPanelCard :title="copy.forecastTitle" :subtitle="copy.forecastSubtitle">
          <div class="metric-grid forecast-grid">
            <article class="metric-card forecast-card">
              <span class="forecast-badge">
                <Icon name="lucide:calendar-range" size="13" />
                {{ copy.yearAvg }}
              </span>
              <strong>{{ money(projection.yearly_from_average) }}</strong>
              <em class="equal">
                <Icon name="lucide:sun-medium" size="13" />
                {{ copy.dayAvg }}: {{ money(projection.daily_average_net) }}
              </em>
            </article>
            <article class="metric-card forecast-card">
              <span class="forecast-badge">
                <Icon name="lucide:arrow-down-wide-narrow" size="13" />
                {{ copy.yearMin }}
              </span>
              <strong>{{ money(projection.yearly_from_min) }}</strong>
              <em class="down">
                <Icon name="lucide:moon-star" size="13" />
                {{ copy.dayMin }}: {{ money(projection.daily_min_net) }}
              </em>
            </article>
            <article class="metric-card forecast-card">
              <span class="forecast-badge">
                <Icon name="lucide:arrow-up-wide-narrow" size="13" />
                {{ copy.yearMax }}
              </span>
              <strong>{{ money(projection.yearly_from_max) }}</strong>
              <em class="up">
                <Icon name="lucide:sparkles" size="13" />
                {{ copy.dayMax }}: {{ money(projection.daily_max_net) }}
              </em>
            </article>
          </div>
        </CpPanelCard>

        <CpPanelCard :title="copy.insightTitle" :subtitle="copy.insightSubtitle">
          <div class="stack-list insight-list">
            <article class="stack-card insight-card">
              <div class="insight-copy">
                <span class="insight-badge">
                  <Icon name="lucide:circle-dollar-sign" size="13" />
                  {{ copy.insightTitle }}
                </span>
                <strong>{{ copy.avgShiftRevenue }}</strong>
                <p>{{ copy.fastSignal }}</p>
              </div>
              <div class="insight-amount"><strong>{{ money(summary.avg_revenue_per_shift) }}</strong></div>
            </article>
            <article class="stack-card insight-card">
              <div class="insight-copy">
                <span class="insight-badge">
                  <Icon name="lucide:wallet-cards" size="13" />
                  {{ copy.insightTitle }}
                </span>
                <strong>{{ copy.avgTopup }}</strong>
                <p>{{ copy.fastSignal }}</p>
              </div>
              <div class="insight-amount"><strong>{{ money(clientsMeta.avg_topup_check) }}</strong></div>
            </article>
            <article class="stack-card insight-card">
              <div class="insight-copy">
                <span class="insight-badge">
                  <Icon name="lucide:clock-3" size="13" />
                  {{ copy.insightTitle }}
                </span>
                <strong>{{ copy.peakHour }}</strong>
                <p>{{ copy.fastSignal }}</p>
              </div>
              <div class="insight-amount"><strong>{{ peakHourLabel }}</strong></div>
            </article>
            <article class="stack-card insight-card">
              <div class="insight-copy">
                <span class="insight-badge">
                  <Icon name="lucide:calendar-heart" size="13" />
                  {{ copy.insightTitle }}
                </span>
                <strong>{{ copy.peakSalesDay }}</strong>
                <p>{{ copy.fastSignal }}</p>
              </div>
              <div class="insight-amount"><strong>{{ peakSalesDayLabel }}</strong></div>
            </article>
          </div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'autopilot'">
      <p v-if="autopilotError" class="alert err">{{ autopilotError }}</p>

      <div class="content-grid">
        <CpPanelCard :title="copy.autopilotTitle" :subtitle="copy.autopilotSubtitle">
          <template #actions>
            <label class="autopilot-strategy">
              <Icon name="lucide:bot" size="15" />
              <select v-model="autopilotStrategy" class="toolbar-select">
                <option v-for="item in strategyOptions" :key="item.key" :value="item.key">{{ item.label }}</option>
              </select>
            </label>
            <button class="toolbar-btn" :disabled="loadingAutopilot" @click="loadAutopilot">
              <Icon name="lucide:sparkles" size="15" />
              <span>{{ copy.recalculate }}</span>
            </button>
            <button class="toolbar-btn toolbar-btn-primary" :disabled="loadingAutopilot || applyingAutopilot || !autopilotData" @click="applyAutopilot">
              <Icon :name="applyingAutopilot ? 'lucide:loader-circle' : 'lucide:wand-sparkles'" size="15" />
              <span>{{ applyingAutopilot ? copy.applying : copy.applyAutopilot }}</span>
            </button>
          </template>

          <div class="metric-grid autopilot-metrics">
            <article class="metric-card autopilot-metric-card">
              <span class="autopilot-metric-badge">
                <Icon name="lucide:shield-check" size="13" />
                {{ copy.confidence }}
              </span>
              <strong>{{ int(autopilotMeta.confidence_pct) }}%</strong>
              <em class="equal">{{ autopilotRangeLabel }}</em>
            </article>
            <article class="metric-card autopilot-metric-card">
              <span class="autopilot-metric-badge">
                <Icon name="lucide:map" size="13" />
                {{ copy.zoneUpdates }}
              </span>
              <strong>{{ int(autopilotMeta.zones_to_update) }}</strong>
              <em class="equal">{{ copy.zonesSmall }}</em>
            </article>
            <article class="metric-card autopilot-metric-card">
              <span class="autopilot-metric-badge">
                <Icon name="lucide:trending-up" size="13" />
                {{ copy.monthlyUplift }}
              </span>
              <strong>{{ money(autopilotWhatIf.monthly_uplift_estimate) }}</strong>
              <em class="up">UZS</em>
            </article>
          </div>
        </CpPanelCard>

        <CpPanelCard :title="copy.zoneUpdateTitle" :subtitle="copy.zoneUpdateSubtitle">
          <div v-if="autopilotZoneUpdates.length" class="stack-list autopilot-zone-list">
            <article v-for="item in autopilotZoneUpdates.slice(0, 8)" :key="`${item.zone_id}-${item.zone}`" class="stack-card autopilot-zone-card">
              <div class="autopilot-zone-copy">
                <span class="autopilot-zone-badge">
                  <Icon name="lucide:badge-dollar-sign" size="13" />
                  {{ copy.zoneUpdateTitle }}
                </span>
                <strong>{{ item.zone }}</strong>
                <p>{{ money(item.current_price_uzs) }} -> {{ money(item.recommended_price_uzs) }}</p>
              </div>
              <div class="autopilot-zone-meta">
                <span>
                  <Icon name="lucide:lightbulb" size="13" />
                  {{ item.reason || '-' }}
                </span>
              </div>
            </article>
          </div>
          <div v-else class="empty-state compact">{{ copy.noData }}</div>
        </CpPanelCard>
      </div>

      <div class="content-grid">
        <CpPanelCard :title="copy.peakDemandTitle" :subtitle="copy.peakDemandSubtitle">
          <div v-if="autopilotPeakHours.length" class="bar-list autopilot-demand-list">
            <article v-for="item in autopilotPeakHours.slice(0, 6)" :key="`p-${item.hour}`" class="bar-row autopilot-demand-card">
              <div class="autopilot-demand-copy">
                <span class="autopilot-demand-badge">
                  <Icon name="lucide:sunrise" size="13" />
                  {{ item.hour }}:00
                </span>
                <p>{{ int(item.sessions_count || item.demand) }} {{ copy.sessionsSmall }}</p>
              </div>
              <div class="autopilot-demand-side">
                <strong>{{ Math.min(100, int(item.demand_pct || item.load_pct || 0)) }}%</strong>
                <div class="mix-bar">
                  <div class="mix-fill cash" :style="{ width: `${Math.min(100, int(item.demand_pct || item.load_pct || 0))}%` }"></div>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty-state compact">{{ copy.noData }}</div>
        </CpPanelCard>

        <CpPanelCard :title="copy.lowDemandTitle" :subtitle="copy.lowDemandSubtitle">
          <div v-if="autopilotLowHours.length" class="bar-list autopilot-demand-list">
            <article v-for="item in autopilotLowHours.slice(0, 6)" :key="`l-${item.hour}`" class="bar-row autopilot-demand-card">
              <div class="autopilot-demand-copy">
                <span class="autopilot-demand-badge">
                  <Icon name="lucide:moon-star" size="13" />
                  {{ item.hour }}:00
                </span>
                <p>{{ int(item.sessions_count || item.demand) }} {{ copy.sessionsSmall }}</p>
              </div>
              <div class="autopilot-demand-side">
                <strong>{{ Math.min(100, int(item.demand_pct || item.load_pct || 0)) }}%</strong>
                <div class="mix-bar">
                  <div class="mix-fill balance" :style="{ width: `${Math.min(100, int(item.demand_pct || item.load_pct || 0))}%` }"></div>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty-state compact">{{ copy.noData }}</div>
        </CpPanelCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'exchange'">
      <p v-if="exchangeError" class="alert err">{{ exchangeError }}</p>

      <div class="content-grid">
        <CpPanelCard :title="copy.exchangeTitle" :subtitle="copy.exchangeSubtitle">
          <div class="metric-grid">
            <article class="metric-card">
              <span>{{ copy.clubLoad }}</span>
              <strong>{{ num(exchangeClub.load_pct, 1) }}%</strong>
              <em class="equal">{{ int(exchangeClub.active_sessions) }} {{ copy.activeSmall }}</em>
            </article>
            <article class="metric-card">
              <span>{{ copy.partnersReady }}</span>
              <strong>{{ int(exchangeNetwork.partners_ready) }}</strong>
              <em class="equal">/ {{ int(exchangeNetwork.partners_total) }}</em>
            </article>
            <article class="metric-card">
              <span>{{ copy.crossClub }}</span>
              <strong>{{ int(exchangePassport.cross_club_members) }}</strong>
              <em class="equal">{{ copy.members }}</em>
            </article>
            <article class="metric-card">
              <span>{{ copy.recoveredMonthly }}</span>
              <strong>{{ money(exchangeOverflow.projected_recovered_monthly) }}</strong>
              <em class="up">UZS</em>
            </article>
          </div>
        </CpPanelCard>

        <CpPanelCard :title="copy.exchangeConfigTitle" :subtitle="copy.exchangeConfigSubtitle">
          <template #actions>
            <button class="toolbar-btn toolbar-btn-primary" :disabled="savingExchange" @click="saveExchangeConfig">
              {{ savingExchange ? copy.saving : copy.save }}
            </button>
          </template>

          <div class="form-grid">
            <label class="field-block">
              <span>{{ copy.enabled }}</span>
              <div class="field-shell">
                <Icon name="lucide:power" size="15" />
                <select v-model="exchangeForm.enabled" class="field-input select-field">
                  <option :value="true">{{ copy.on }}</option>
                  <option :value="false">{{ copy.off }}</option>
                </select>
              </div>
            </label>
            <label class="field-block">
              <span>{{ copy.overflow }}</span>
              <div class="field-shell">
                <Icon name="lucide:arrow-left-right" size="15" />
                <select v-model="exchangeForm.overflow_enabled" class="field-input select-field">
                  <option :value="true">{{ copy.on }}</option>
                  <option :value="false">{{ copy.off }}</option>
                </select>
              </div>
            </label>
            <label class="field-block">
              <span>{{ copy.radius }}</span>
              <div class="field-shell">
                <Icon name="lucide:radius" size="15" />
                <input v-model.number="exchangeForm.radius_km" type="number" min="1" class="field-input" />
              </div>
            </label>
            <label class="field-block">
              <span>{{ copy.minFree }}</span>
              <div class="field-shell">
                <Icon name="lucide:monitor-check" size="15" />
                <input v-model.number="exchangeForm.min_free_pcs" type="number" min="0" class="field-input" />
              </div>
            </label>
            <label class="field-block">
              <span>{{ copy.referralBonus }}</span>
              <div class="field-shell">
                <Icon name="lucide:gift" size="15" />
                <input v-model.number="exchangeForm.referral_bonus_uzs" type="number" min="0" class="field-input" />
              </div>
            </label>
            <label class="field-block">
              <span>{{ copy.auctionFloor }}</span>
              <div class="field-shell">
                <Icon name="lucide:badge-dollar-sign" size="15" />
                <input v-model.number="exchangeForm.auction_floor_uzs" type="number" min="0" class="field-input" />
              </div>
            </label>
          </div>
        </CpPanelCard>
      </div>

      <CpPanelCard :title="copy.partnerTitle" :subtitle="copy.partnerSubtitle">
        <div v-if="exchangeTopPartners.length" class="stack-list">
          <article v-for="item in exchangeTopPartners" :key="item.tenant_id" class="stack-card">
            <div>
              <strong>{{ item.tenant_name || item.name }}</strong>
              <p>{{ int(item.free_pcs) }} free PC · {{ num(item.load_pct, 1) }}%</p>
            </div>
            <strong>{{ money(item.recommended_bid_uzs || item.bid_uzs) }}</strong>
          </article>
        </div>
        <div v-else class="empty-state compact">{{ copy.noData }}</div>
      </CpPanelCard>
    </template>

    <template v-else>
      <p v-if="compareError" class="alert err">{{ compareError }}</p>

      <CpPanelCard :title="copy.compareTitle" :subtitle="copy.compareSubtitle">
        <template #actions>
          <label class="hero-field compact-field">
            <Icon name="lucide:key-round" size="15" />
            <input v-model.trim="compareKey" class="hero-input" :placeholder="copy.comparePlaceholder" />
          </label>
          <button class="toolbar-btn toolbar-btn-primary" :disabled="loadingCompare || !compareKey" @click="loadCompare">
            {{ loadingCompare ? copy.loading : copy.compareNow }}
          </button>
        </template>

        <div v-if="compareData" class="compare-layout">
          <div class="compare-head">
            <div class="compare-club">
              <span>{{ copy.leftClub }}</span>
              <strong>{{ compareData.left?.tenant?.name || '-' }}</strong>
              <small>{{ compareData.left?.license?.key || '-' }}</small>
            </div>
            <div class="compare-club">
              <span>{{ copy.rightClub }}</span>
              <strong>{{ compareData.right?.tenant?.name || '-' }}</strong>
              <small>{{ compareData.right?.license?.key || '-' }}</small>
            </div>
          </div>

          <div class="compare-list">
            <article v-for="item in compareItems" :key="item.key" class="compare-row">
              <div class="compare-side">
                <strong>{{ item.leftFormatted }}</strong>
                <div class="compare-bar">
                  <div class="compare-fill left" :style="{ width: `${item.leftPct}%` }"></div>
                </div>
              </div>
              <div class="compare-center">
                <span>{{ item.label }}</span>
                <small>{{ item.deltaFormatted }}</small>
              </div>
              <div class="compare-side">
                <strong>{{ item.rightFormatted }}</strong>
                <div class="compare-bar">
                  <div class="compare-fill right" :style="{ width: `${item.rightPct}%` }"></div>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div v-else class="empty-state">{{ copy.compareEmpty }}</div>
      </CpPanelCard>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { cpApi } from '@legacy/api/cp'
import { useCpFormatters } from '../../../composables/useCpFormatters'
import { useCpCopy } from '../../../composables/useCpCopy'
import { useCpTheme } from '../../../composables/useCpTheme'

definePageMeta({
  layout: 'cp',
  roles: ['admin', 'owner'],
})

useHead({ title: 'Reports · NEXORA CLOUD CP' })

const copy = useCpCopy({
  uz: {
    eyebrow: 'Owner analytics',
    title: 'Hisobotlar',
    subtitle: "Tushum, operatsiya, AI tavsiyalari va exchange oqimini bitta owner workspace ichida ko'ring.",
    updated: 'Yangilanish',
    from: 'Boshlanish',
    to: 'Tugash',
    last7: '7 kun',
    last30: '30 kun',
    refresh: 'Yangilash',
    loading: 'Yuklanmoqda...',
    tabs: { overview: 'Umumiy', operations: 'Operatsiya', insights: 'Insight', autopilot: 'Autopilot', exchange: 'Exchange', compare: 'Taqqoslash' },
    netSales: 'Sof tushum',
    grossSales: 'Jami savdo',
    sessions: 'Sessiyalar',
    utilization: 'Bandlik',
    clients: 'Mijozlar',
    transactions: 'Tx',
    risk: 'Risk',
    returns: 'Qaytarishlar',
    growthTitle: "O'sish indikatorlari",
    growthSubtitle: 'Oldingi davr bilan farq.',
    paymentMixTitle: "To'lov aralashmasi",
    paymentMixSubtitle: 'Naqd, karta va balans ulushi.',
    dailyTitle: 'Kunlik trend',
    dailySubtitle: 'Netto va gross oqim bo‘yicha oxirgi kunlar.',
    topClientsTitle: 'Top mijozlar',
    topClientsSubtitle: 'Davr ichida eng ko‘p sarflaganlar.',
    sessionsSmall: 'sessiya',
    hourlyTitle: 'Soatlik yuklama',
    hourlySubtitle: 'Qaysi soatda talab kuchli bo‘lgan.',
    weekdayTitle: 'Haftalik taqsimot',
    weekdaySubtitle: 'Kunlar bo‘yicha sessiya oqimi.',
    zonesTitle: 'Zona kesimi',
    zonesSubtitle: 'Sessiya, vaqt va tushum.',
    operatorsTitle: 'Operator samaradorligi',
    operatorsSubtitle: 'Tx, sessiya va savdo kesimi.',
    topPcTitle: 'Top PC',
    topPcSubtitle: 'Eng kuchli kompyuterlar.',
    underusedPcTitle: 'Kam ishlatilgan PC',
    underusedPcSubtitle: 'Past yuklama zonalari.',
    forecastTitle: 'Forecast va reja',
    forecastSubtitle: 'O‘rtacha, minimal va maksimal kun bo‘yicha yillik proyeksiya.',
    yearAvg: 'Yillik o‘rtacha',
    yearMin: 'Yillik minimal',
    yearMax: 'Yillik maksimal',
    dayAvg: 'Kunlik o‘rtacha',
    dayMin: 'Kunlik minimal',
    dayMax: 'Kunlik maksimal',
    insightTitle: 'Asosiy insightlar',
    insightSubtitle: 'Owner uchun tez signal nuqtalari.',
    avgShiftRevenue: '1 smena o‘rtacha tushum',
    avgTopup: 'O‘rtacha topup cheki',
    peakHour: 'Peak soat',
    peakSalesDay: 'Peak savdo kuni',
    fastSignal: 'Tez o‘qish',
    autopilotTitle: 'AI Profit Autopilot',
    autopilotSubtitle: 'Dinamik narx va promo tavsiyalari.',
    recalculate: 'Qayta hisoblash',
    applyAutopilot: "Qo'llash",
    applying: "Qo'llanmoqda...",
    confidence: 'Ishonch',
    zoneUpdates: 'Zona update',
    zonesSmall: 'zona',
    monthlyUplift: 'Oylik uplift',
    zoneUpdateTitle: 'Narx update tavsiyalari',
    zoneUpdateSubtitle: 'Qaysi zonada qanday o‘zgarish kerak.',
    peakDemandTitle: 'Peak demand',
    peakDemandSubtitle: 'Yuklama yuqori bo‘lgan soatlar.',
    lowDemandTitle: 'Low demand',
    lowDemandSubtitle: 'Promo uchun qulay past yuklama oynalari.',
    exchangeTitle: 'Exchange snapshot',
    exchangeSubtitle: 'Tarmoq yuklamasi va overflow holati.',
    clubLoad: 'Club load',
    partnersReady: 'Tayyor hamkorlar',
    crossClub: 'Cross-club',
    recoveredMonthly: 'Recovered monthly',
    activeSmall: 'aktiv',
    members: "a'zo",
    exchangeConfigTitle: 'Exchange config',
    exchangeConfigSubtitle: 'Overflow va referral qoidalari.',
    enabled: 'Enabled',
    overflow: 'Overflow',
    radius: 'Radius km',
    minFree: 'Min free PC',
    referralBonus: 'Referral bonus',
    auctionFloor: 'Auction floor',
    saving: 'Saqlanmoqda...',
    save: 'Saqlash',
    on: 'On',
    off: 'Off',
    partnerTitle: 'Top hamkorlar',
    partnerSubtitle: 'Qabul qila oladigan yaqin klublar.',
    compareTitle: 'Filial taqqoslash',
    compareSubtitle: 'Boshqa filial yoki tenant bilan yonma-yon ko‘ring.',
    comparePlaceholder: 'License key kiriting',
    compareNow: 'Taqqoslash',
    compareEmpty: 'Taqqoslash uchun license key kiriting.',
    leftClub: 'Joriy klub',
    rightClub: 'Taqqoslanayotgan klub',
    noData: "Ma'lumot topilmadi.",
    noZone: 'Zona yo‘q',
    cash: 'Naqd',
    card: 'Karta',
    balance: 'Balans',
  },
  ru: {
    eyebrow: 'Owner analytics',
    title: 'Отчеты',
    subtitle: 'Смотрите выручку, операции, AI-рекомендации и exchange-поток в одном owner workspace.',
    updated: 'Обновлено',
    from: 'От',
    to: 'До',
    last7: '7 дней',
    last30: '30 дней',
    refresh: 'Обновить',
    loading: 'Загрузка...',
    tabs: { overview: 'Обзор', operations: 'Операции', insights: 'Инсайты', autopilot: 'Autopilot', exchange: 'Exchange', compare: 'Сравнение' },
    netSales: 'Чистая выручка',
    grossSales: 'Валовая выручка',
    sessions: 'Сессии',
    utilization: 'Загрузка',
    clients: 'Клиенты',
    transactions: 'Tx',
    risk: 'Риск',
    returns: 'Возвраты',
    growthTitle: 'Индикаторы роста',
    growthSubtitle: 'Разница с прошлым периодом.',
    paymentMixTitle: 'Платежный микс',
    paymentMixSubtitle: 'Доля наличных, карты и баланса.',
    dailyTitle: 'Дневной тренд',
    dailySubtitle: 'Net и gross поток по дням.',
    topClientsTitle: 'Топ клиенты',
    topClientsSubtitle: 'Самые активные по тратам.',
    sessionsSmall: 'сессий',
    hourlyTitle: 'Почасовая загрузка',
    hourlySubtitle: 'Когда спрос был самым высоким.',
    weekdayTitle: 'Распределение по дням',
    weekdaySubtitle: 'Сессии по дням недели.',
    zonesTitle: 'Срез по зонам',
    zonesSubtitle: 'Сессии, время и выручка.',
    operatorsTitle: 'Эффективность операторов',
    operatorsSubtitle: 'Tx, сессии и продажи.',
    topPcTitle: 'Топ ПК',
    topPcSubtitle: 'Самые сильные компьютеры.',
    underusedPcTitle: 'Слабо загруженные ПК',
    underusedPcSubtitle: 'Зоны с низкой загрузкой.',
    forecastTitle: 'Forecast и план',
    forecastSubtitle: 'Годовая проекция по среднему, минимуму и максимуму.',
    yearAvg: 'Годовой средний',
    yearMin: 'Годовой минимум',
    yearMax: 'Годовой максимум',
    dayAvg: 'Дневной средний',
    dayMin: 'Дневной минимум',
    dayMax: 'Дневной максимум',
    insightTitle: 'Ключевые инсайты',
    insightSubtitle: 'Быстрые сигналы для owner.',
    avgShiftRevenue: 'Средняя выручка на смену',
    avgTopup: 'Средний чек пополнения',
    peakHour: 'Пиковый час',
    peakSalesDay: 'Пиковый день продаж',
    fastSignal: 'Быстрый сигнал',
    autopilotTitle: 'AI Profit Autopilot',
    autopilotSubtitle: 'Динамические цены и promo-рекомендации.',
    recalculate: 'Пересчитать',
    applyAutopilot: 'Применить',
    applying: 'Применение...',
    confidence: 'Уверенность',
    zoneUpdates: 'Обновления зон',
    zonesSmall: 'зона',
    monthlyUplift: 'Месячный uplift',
    zoneUpdateTitle: 'Рекомендации по ценам',
    zoneUpdateSubtitle: 'Где и что менять.',
    peakDemandTitle: 'Peak demand',
    peakDemandSubtitle: 'Часы с высокой нагрузкой.',
    lowDemandTitle: 'Low demand',
    lowDemandSubtitle: 'Низкая нагрузка для promo.',
    exchangeTitle: 'Exchange snapshot',
    exchangeSubtitle: 'Сеть, overflow и давление по загрузке.',
    clubLoad: 'Загрузка клуба',
    partnersReady: 'Готовые партнеры',
    crossClub: 'Cross-club',
    recoveredMonthly: 'Recovered monthly',
    activeSmall: 'активных',
    members: 'участников',
    exchangeConfigTitle: 'Exchange config',
    exchangeConfigSubtitle: 'Правила overflow и referral.',
    enabled: 'Enabled',
    overflow: 'Overflow',
    radius: 'Радиус км',
    minFree: 'Мин. свободных ПК',
    referralBonus: 'Referral bonus',
    auctionFloor: 'Auction floor',
    saving: 'Сохранение...',
    save: 'Сохранить',
    on: 'On',
    off: 'Off',
    partnerTitle: 'Топ партнеры',
    partnerSubtitle: 'Кто может принять overflow.',
    compareTitle: 'Сравнение филиалов',
    compareSubtitle: 'Сравнивайте текущий клуб с другим tenant.',
    comparePlaceholder: 'Введите license key',
    compareNow: 'Сравнить',
    compareEmpty: 'Введите license key для сравнения.',
    leftClub: 'Текущий клуб',
    rightClub: 'Сравниваемый клуб',
    noData: 'Данные не найдены.',
    noZone: 'Без зоны',
    cash: 'Наличные',
    card: 'Карта',
    balance: 'Баланс',
  },
  en: {
    eyebrow: 'Owner analytics',
    title: 'Reports',
    subtitle: 'See revenue, operations, AI recommendations, and exchange flow in one owner workspace.',
    updated: 'Updated',
    from: 'From',
    to: 'To',
    last7: '7 days',
    last30: '30 days',
    refresh: 'Refresh',
    loading: 'Loading...',
    tabs: { overview: 'Overview', operations: 'Operations', insights: 'Insights', autopilot: 'Autopilot', exchange: 'Exchange', compare: 'Compare' },
    netSales: 'Net sales',
    grossSales: 'Gross sales',
    sessions: 'Sessions',
    utilization: 'Utilization',
    clients: 'Clients',
    transactions: 'Tx',
    risk: 'Risk',
    returns: 'Returns',
    growthTitle: 'Growth indicators',
    growthSubtitle: 'Difference versus previous period.',
    paymentMixTitle: 'Payment mix',
    paymentMixSubtitle: 'Cash, card, and balance share.',
    dailyTitle: 'Daily trend',
    dailySubtitle: 'Net and gross flow by day.',
    topClientsTitle: 'Top clients',
    topClientsSubtitle: 'Highest spenders in the period.',
    sessionsSmall: 'sessions',
    hourlyTitle: 'Hourly load',
    hourlySubtitle: 'When demand was the highest.',
    weekdayTitle: 'Weekday spread',
    weekdaySubtitle: 'Sessions by weekday.',
    zonesTitle: 'Zone breakdown',
    zonesSubtitle: 'Sessions, time, and revenue.',
    operatorsTitle: 'Operator performance',
    operatorsSubtitle: 'Tx, sessions, and sales.',
    topPcTitle: 'Top PCs',
    topPcSubtitle: 'Highest-performing PCs.',
    underusedPcTitle: 'Underused PCs',
    underusedPcSubtitle: 'Low-load areas.',
    forecastTitle: 'Forecast and plan',
    forecastSubtitle: 'Yearly projection from average, min, and max days.',
    yearAvg: 'Year avg',
    yearMin: 'Year min',
    yearMax: 'Year max',
    dayAvg: 'Day avg',
    dayMin: 'Day min',
    dayMax: 'Day max',
    insightTitle: 'Key insights',
    insightSubtitle: 'Fast owner signals.',
    avgShiftRevenue: 'Avg revenue per shift',
    avgTopup: 'Avg top-up check',
    peakHour: 'Peak hour',
    peakSalesDay: 'Peak sales day',
    fastSignal: 'Fast signal',
    autopilotTitle: 'AI Profit Autopilot',
    autopilotSubtitle: 'Dynamic pricing and promo recommendations.',
    recalculate: 'Recalculate',
    applyAutopilot: 'Apply',
    applying: 'Applying...',
    confidence: 'Confidence',
    zoneUpdates: 'Zone updates',
    zonesSmall: 'zones',
    monthlyUplift: 'Monthly uplift',
    zoneUpdateTitle: 'Price updates',
    zoneUpdateSubtitle: 'Where and what to change.',
    peakDemandTitle: 'Peak demand',
    peakDemandSubtitle: 'High-load hours.',
    lowDemandTitle: 'Low demand',
    lowDemandSubtitle: 'Low-load promo windows.',
    exchangeTitle: 'Exchange snapshot',
    exchangeSubtitle: 'Network, overflow, and load pressure.',
    clubLoad: 'Club load',
    partnersReady: 'Ready partners',
    crossClub: 'Cross-club',
    recoveredMonthly: 'Recovered monthly',
    activeSmall: 'active',
    members: 'members',
    exchangeConfigTitle: 'Exchange config',
    exchangeConfigSubtitle: 'Overflow and referral rules.',
    enabled: 'Enabled',
    overflow: 'Overflow',
    radius: 'Radius km',
    minFree: 'Min free PCs',
    referralBonus: 'Referral bonus',
    auctionFloor: 'Auction floor',
    saving: 'Saving...',
    save: 'Save',
    on: 'On',
    off: 'Off',
    partnerTitle: 'Top partners',
    partnerSubtitle: 'Partners ready to receive overflow.',
    compareTitle: 'Branch compare',
    compareSubtitle: 'Compare the current club with another tenant.',
    comparePlaceholder: 'Enter license key',
    compareNow: 'Compare',
    compareEmpty: 'Enter a license key to compare.',
    leftClub: 'Current club',
    rightClub: 'Compared club',
    noData: 'No data found.',
    noZone: 'No zone',
    cash: 'Cash',
    card: 'Card',
    balance: 'Balance',
  },
})

type ReportTab = 'overview' | 'operations' | 'insights' | 'autopilot' | 'exchange' | 'compare'

function dateString(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

const { formatMoney, formatDateTime } = useCpFormatters()
const { isDark } = useCpTheme()
const filters = reactive({ from: dateString(-6), to: dateString(0) })
const activeTab = ref<ReportTab>('overview')
const overview = ref<any>(null)
const compareData = ref<any>(null)
const compareKey = ref('')
const autopilotData = ref<any>(null)
const exchangeData = ref<any>(null)
const autopilotStrategy = ref('balanced')
const exchangeForm = reactive({
  enabled: false,
  radius_km: 20,
  min_free_pcs: 2,
  referral_bonus_uzs: 12000,
  overflow_enabled: true,
  auction_floor_uzs: 6000,
  auction_ceiling_uzs: 26000,
})
const strategyOptions = [
  { key: 'balanced', label: 'Balanced' },
  { key: 'growth', label: 'Growth' },
  { key: 'aggressive', label: 'Aggressive' },
]
const loadingOverview = ref(false)
const loadingCompare = ref(false)
const loadingAutopilot = ref(false)
const applyingAutopilot = ref(false)
const loadingExchange = ref(false)
const savingExchange = ref(false)
const overviewError = ref('')
const compareError = ref('')
const autopilotError = ref('')
const exchangeError = ref('')
const refreshedAt = ref<string | null>(null)

const tabs = computed(() => [
  { key: 'overview', label: copy.value.tabs.overview, icon: 'lucide:layout-dashboard' },
  { key: 'operations', label: copy.value.tabs.operations, icon: 'lucide:activity' },
  { key: 'insights', label: copy.value.tabs.insights, icon: 'lucide:lightbulb' },
  { key: 'autopilot', label: copy.value.tabs.autopilot, icon: 'lucide:bot' },
  { key: 'exchange', label: copy.value.tabs.exchange, icon: 'lucide:arrow-left-right' },
  { key: 'compare', label: copy.value.tabs.compare, icon: 'lucide:split-square-horizontal' },
])

const isLoadingAny = computed(() => loadingOverview.value || loadingCompare.value || loadingAutopilot.value || loadingExchange.value)
const pageError = computed(() => overviewError.value || compareError.value || autopilotError.value || exchangeError.value)
const refreshedAtLabel = computed(() => (refreshedAt.value ? formatDateTime(refreshedAt.value) : '-'))

function int(value: any) { return Number(value || 0) }
function num(value: any, digits = 0) { return Number(value || 0).toFixed(digits) }
function money(value: any) { return formatMoney(Number(value || 0)) }
function pct(value: any, total: any) {
  const safeTotal = Number(total || 0)
  if (safeTotal <= 0) return 0
  return Math.round((Number(value || 0) / safeTotal) * 100)
}
function extractError(cause: any) {
  const firstError = cause?.response?.data?.errors ? Object.values(cause.response.data.errors).flat()[0] : null
  return String(firstError || cause?.response?.data?.message || "So'rov bajarilmadi.")
}
function valueWithUnit(value: any, unit: string) {
  if (unit === 'UZS') return `${money(value)} UZS`
  if (unit === '%') return `${num(value, 1)}%`
  if (unit === 'min') return `${num(value, 1)} min`
  return String(int(value))
}
function diffWithUnit(value: any, unit: string) {
  const sign = Number(value || 0) > 0 ? '+' : ''
  if (unit === 'UZS') return `${sign}${money(value)} UZS`
  if (unit === '%') return `${sign}${num(value, 1)}%`
  if (unit === 'min') return `${sign}${num(value, 1)} min`
  return `${sign}${int(value)}`
}

function growthPrimaryValue(value: any, unit: string) {
  if (unit === 'UZS') return money(value)
  if (unit === '%') return `${num(value, 1)}%`
  if (unit === 'min') return `${num(value, 1)} min`
  return String(int(value))
}

function growthValueSuffix(unit: string) {
  return unit === 'UZS' ? 'UZS' : ''
}

function growthIcon(key: string, unit: string) {
  if (unit === 'UZS') return 'lucide:wallet'
  if (unit === 'min') return 'lucide:timer'
  if (unit === '%') return 'lucide:gauge'
  if (key === 'sessions') return 'lucide:monitor-play'
  if (key === 'clients') return 'lucide:users'
  return 'lucide:activity'
}

function growthTrendIcon(trend: string) {
  if (trend === 'up') return 'lucide:trending-up'
  if (trend === 'down') return 'lucide:trending-down'
  return 'lucide:minus'
}

function setQuickRange(days: number) {
  filters.from = dateString(-(days - 1))
  filters.to = dateString(0)
  refreshAll()
}

const report = computed(() => overview.value?.report || {})
const summary = computed(() => report.value.summary || overview.value?.summary || report.value || {})
const payments = computed(() => report.value.payments || overview.value?.payments || {})
const activity = computed(() => report.value.activity || overview.value?.activity || {})
const sessionsMeta = computed(() => report.value.sessions || {})
const clientsMeta = computed(() => report.value.clients || {})
const shiftsMeta = computed(() => report.value.shifts || {})
const growthMeta = computed(() => report.value.growth || {})
const insightsMeta = computed(() => report.value.insights || {})
const topClients = computed(() => report.value.top_clients || [])
const daily = computed(() => report.value.daily || [])
const projection = computed(() => insightsMeta.value.projection || {})
const hourly = computed(() => sessionsMeta.value.hourly_distribution || [])
const weekday = computed(() => sessionsMeta.value.weekday_distribution || [])
const zonesItems = computed(() => (report.value.zones || {}).items || [])
const operatorItems = computed(() => (report.value.operators || {}).items || [])
const pcsTop = computed(() => (report.value.pcs || {}).top || [])
const pcsUnderused = computed(() => (report.value.pcs || {}).underused || [])

const growthLabelMap = computed(() => ({
  net_sales: { label: copy.value.netSales, unit: 'UZS' },
  gross_sales: { label: copy.value.grossSales, unit: 'UZS' },
  sessions_count: { label: copy.value.sessions, unit: 'count' },
  avg_session_minutes: { label: 'Avg session', unit: 'min' },
  utilization_pct: { label: copy.value.utilization, unit: '%' },
  cash_net: { label: copy.value.cash, unit: 'UZS' },
  card_net: { label: copy.value.card, unit: 'UZS' },
  clients_in_period: { label: copy.value.clients, unit: 'count' },
}))

const growthRows = computed(() =>
  Object.keys(growthLabelMap.value)
    .filter((key) => growthMeta.value?.[key])
    .map((key) => ({
      key,
      label: growthLabelMap.value[key].label,
      unit: growthLabelMap.value[key].unit,
      current: Number(growthMeta.value[key].current || 0),
      diff: Number(growthMeta.value[key].diff || 0),
      trend: growthMeta.value[key].trend || 'equal',
    })),
)

const paymentTotal = computed(() => int(payments.value.cash_sales_total) + int(payments.value.card_sales_total) + int(payments.value.balance_sales_total))
const paymentRows = computed(() => [
  { key: 'cash', label: copy.value.cash, value: int(payments.value.cash_sales_total), pct: pct(payments.value.cash_sales_total, paymentTotal.value) },
  { key: 'card', label: copy.value.card, value: int(payments.value.card_sales_total), pct: pct(payments.value.card_sales_total, paymentTotal.value) },
  { key: 'balance', label: copy.value.balance, value: int(payments.value.balance_sales_total), pct: pct(payments.value.balance_sales_total, paymentTotal.value) },
])

const hourlyMax = computed(() => (hourly.value.length ? Math.max(...hourly.value.map((item: any) => int(item.sessions_count)), 0) : 0))
const weekdayMax = computed(() => (weekday.value.length ? Math.max(...weekday.value.map((item: any) => int(item.sessions_count)), 0) : 0))
const peakHourLabel = computed(() => {
  const peak = sessionsMeta.value.peak_hour
  return peak ? `${peak.label} (${int(peak.sessions_count)})` : '-'
})
const peakSalesDayLabel = computed(() => {
  const peak = sessionsMeta.value.peak_sales_day
  return peak ? `${peak.date} · ${money(peak.net_sales)}` : '-'
})

const autopilotPlan = computed(() => autopilotData.value || {})
const autopilotActions = computed(() => autopilotPlan.value.actions || {})
const autopilotZoneUpdates = computed(() => autopilotActions.value.zone_price_updates || [])
const autopilotWhatIf = computed(() => autopilotPlan.value.what_if || {})
const autopilotMeta = computed(() => autopilotPlan.value.meta || {})
const autopilotDemand = computed(() => autopilotPlan.value.demand || {})
const autopilotPeakHours = computed(() => autopilotDemand.value.peak_hours || [])
const autopilotLowHours = computed(() => autopilotDemand.value.low_hours || [])
const autopilotRangeLabel = computed(() => {
  const range = autopilotPlan.value.range || {}
  return !range.from || !range.to ? '-' : `${range.from} - ${range.to}`
})

const exchangeClub = computed(() => exchangeData.value?.club || {})
const exchangeNetwork = computed(() => exchangeData.value?.network || {})
const exchangePassport = computed(() => exchangeData.value?.passport || {})
const exchangeOverflow = computed(() => exchangeData.value?.overflow || {})
const exchangePartners = computed(() => exchangeData.value?.partners || [])
const exchangeTopPartners = computed(() => exchangePartners.value.filter((item: any) => item.can_receive).slice(0, 8))

const compareItems = computed(() => {
  const items = compareData.value?.comparison || []
  return items.map((item: any) => {
    const left = Number(item.left || 0)
    const right = Number(item.right || 0)
    const base = Math.max(Math.abs(left), Math.abs(right), 1)
    return {
      ...item,
      leftPct: Math.max(6, Math.round((Math.abs(left) / base) * 100)),
      rightPct: Math.max(6, Math.round((Math.abs(right) / base) * 100)),
      leftFormatted: item.unit === 'UZS' ? money(left) : item.unit === '%' ? `${num(left, 1)}%` : int(left),
      rightFormatted: item.unit === 'UZS' ? money(right) : item.unit === '%' ? `${num(right, 1)}%` : int(right),
      deltaFormatted: item.diff != null ? diffWithUnit(item.diff, item.unit || 'count') : '-',
    }
  })
})

const chartPalette = computed(() => ({
  text: isDark.value ? '#dbe7fb' : '#20324a',
  soft: isDark.value ? '#8fa6c7' : '#6b7f9d',
  grid: isDark.value ? 'rgba(143,166,199,0.18)' : 'rgba(32,50,74,0.10)',
  accent: '#3b82f6',
  accent2: '#22c55e',
  accent3: '#f59e0b',
}))

const lineOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: chartPalette.value.soft }, grid: { display: false } },
    y: { ticks: { color: chartPalette.value.soft }, grid: { color: chartPalette.value.grid } },
  },
}))

const barOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: chartPalette.value.soft }, grid: { display: false } },
    y: { ticks: { color: chartPalette.value.soft }, grid: { color: chartPalette.value.grid } },
  },
}))

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: isDark.value ? '#102036' : '#ffffff',
      titleColor: chartPalette.value.text,
      bodyColor: chartPalette.value.text,
      borderColor: chartPalette.value.grid,
      borderWidth: 1,
    },
  },
}))

const dailyTrendChartData = computed(() => ({
  labels: daily.value.slice(-10).map((item: any) => item.date),
  datasets: [
    {
      label: copy.value.netSales,
      data: daily.value.slice(-10).map((item: any) => int(item.net_sales)),
      borderColor: chartPalette.value.accent,
      backgroundColor: isDark.value ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.10)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
    },
    {
      label: copy.value.grossSales,
      data: daily.value.slice(-10).map((item: any) => int(item.gross_sales)),
      borderColor: chartPalette.value.accent3,
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.35,
      pointRadius: 2,
    },
  ],
}))

const paymentMixChartData = computed(() => ({
  labels: paymentRows.value.map((item) => item.label),
  datasets: [
    {
      data: paymentRows.value.map((item) => item.value),
      backgroundColor: [chartPalette.value.accent, chartPalette.value.accent2, chartPalette.value.accent3],
      borderWidth: 0,
    },
  ],
}))

const hourlyChartData = computed(() => ({
  labels: hourly.value.map((item: any) => item.label),
  datasets: [
    {
      label: copy.value.sessions,
      data: hourly.value.map((item: any) => int(item.sessions_count)),
      backgroundColor: isDark.value ? 'rgba(59,130,246,0.65)' : 'rgba(59,130,246,0.78)',
      borderRadius: 8,
      borderSkipped: false,
    },
  ],
}))

const weekdayChartData = computed(() => ({
  labels: weekday.value.map((item: any) => item.label),
  datasets: [
    {
      label: copy.value.sessions,
      data: weekday.value.map((item: any) => int(item.sessions_count)),
      borderColor: chartPalette.value.accent2,
      backgroundColor: isDark.value ? 'rgba(34,197,94,0.16)' : 'rgba(34,197,94,0.10)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
    },
  ],
}))

async function loadOverview() {
  loadingOverview.value = true
  overviewError.value = ''
  try {
    const { data } = await cpApi.reportOverview({ from: filters.from, to: filters.to })
    overview.value = data?.data || null
  } catch (cause: any) {
    overviewError.value = extractError(cause)
    overview.value = null
  } finally {
    loadingOverview.value = false
  }
}

async function loadCompare() {
  if (!compareKey.value) return
  loadingCompare.value = true
  compareError.value = ''
  try {
    const { data } = await cpApi.reportBranchCompare({ from: filters.from, to: filters.to, license_key: compareKey.value })
    compareData.value = data?.data || null
  } catch (cause: any) {
    compareError.value = extractError(cause)
    compareData.value = null
  } finally {
    loadingCompare.value = false
  }
}

async function loadAutopilot() {
  loadingAutopilot.value = true
  autopilotError.value = ''
  try {
    const { data } = await cpApi.reportAutopilot({ from: filters.from, to: filters.to, strategy: autopilotStrategy.value })
    autopilotData.value = data?.data || null
  } catch (cause: any) {
    autopilotError.value = extractError(cause)
    autopilotData.value = null
  } finally {
    loadingAutopilot.value = false
  }
}

async function applyAutopilot() {
  applyingAutopilot.value = true
  autopilotError.value = ''
  try {
    const { data } = await cpApi.reportAutopilotApply({
      from: filters.from,
      to: filters.to,
      strategy: autopilotStrategy.value,
      apply_zone_prices: true,
      apply_promotion: true,
      enable_beast_mode: true,
      dry_run: false,
    })
    if (data?.data?.plan) autopilotData.value = data.data.plan
    ElMessage.success('Autopilot applied')
    await loadOverview()
  } catch (cause: any) {
    autopilotError.value = extractError(cause)
  } finally {
    applyingAutopilot.value = false
  }
}

async function loadExchange() {
  loadingExchange.value = true
  exchangeError.value = ''
  try {
    const { data } = await cpApi.reportExchange({ from: filters.from, to: filters.to })
    exchangeData.value = data?.data || null
    const config = exchangeData.value?.config || {}
    exchangeForm.enabled = !!config.enabled
    exchangeForm.radius_km = int(config.radius_km || 20)
    exchangeForm.min_free_pcs = int(config.min_free_pcs || 2)
    exchangeForm.referral_bonus_uzs = int(config.referral_bonus_uzs || 12000)
    exchangeForm.overflow_enabled = config.overflow_enabled !== false
    exchangeForm.auction_floor_uzs = int(config.auction_floor_uzs || 6000)
    exchangeForm.auction_ceiling_uzs = int(config.auction_ceiling_uzs || 26000)
  } catch (cause: any) {
    exchangeError.value = extractError(cause)
    exchangeData.value = null
  } finally {
    loadingExchange.value = false
  }
}

async function saveExchangeConfig() {
  savingExchange.value = true
  exchangeError.value = ''
  try {
    await cpApi.reportExchangeConfig({
      enabled: !!exchangeForm.enabled,
      radius_km: int(exchangeForm.radius_km),
      min_free_pcs: int(exchangeForm.min_free_pcs),
      referral_bonus_uzs: int(exchangeForm.referral_bonus_uzs),
      overflow_enabled: !!exchangeForm.overflow_enabled,
      auction_floor_uzs: int(exchangeForm.auction_floor_uzs),
      auction_ceiling_uzs: int(exchangeForm.auction_ceiling_uzs),
    })
    ElMessage.success('Exchange config saved')
    await loadExchange()
  } catch (cause: any) {
    exchangeError.value = extractError(cause)
  } finally {
    savingExchange.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadOverview(), loadAutopilot(), loadExchange(), compareKey.value ? loadCompare() : Promise.resolve()])
  refreshedAt.value = new Date().toISOString()
}

onMounted(refreshAll)
</script>
<style scoped>
.reports-page {
  display: grid;
  gap: 18px;
}

.hero-tools,
.tab-strip,
.stats-grid,
.content-grid,
.metric-grid,
.daily-grid,
.stack-list,
.bar-list,
.form-grid {
  display: grid;
  gap: 14px;
}

.hero-tools {
  grid-template-columns: repeat(4, minmax(0, auto));
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--stroke-strong);
  border-radius: 20px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--brand-secondary) 6%, var(--surface-strong)) 0%, color-mix(in srgb, var(--surface) 98%, transparent) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 12px 28px rgba(15, 23, 42, 0.06);
}

.hero-field {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid var(--stroke-strong);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-strong) 92%, var(--bg-elevated) 8%);
  color: var(--cp-text-soft);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--surface) 45%, transparent),
    0 6px 18px rgba(15, 23, 42, 0.04);
}

.hero-field:focus-within {
  border-color: color-mix(in srgb, var(--brand-secondary) 46%, var(--stroke-strong));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--brand-secondary) 15%, transparent),
    0 0 0 4px color-mix(in srgb, var(--brand-secondary) 10%, transparent),
    0 8px 20px rgba(15, 23, 42, 0.08);
}

.date-field {
  display: grid;
  align-content: center;
  gap: 6px;
  min-width: 188px;
  padding: 10px 14px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--brand-secondary) 5%, var(--surface-strong)) 0%, color-mix(in srgb, var(--surface) 98%, var(--bg-elevated) 2%) 100%);
}

.field-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cp-text-faint);
}

.field-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.compact-field {
  width: min(320px, 100%);
}

.hero-input,
.toolbar-select,
.field-input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--cp-text);
  font: inherit;
  outline: none;
}

.hero-input {
  font-size: 14px;
  font-weight: 700;
}

.hero-input[type='date'] {
  color: var(--cp-text);
}

.quick-range-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 4px;
  border: 1px solid var(--stroke-strong);
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface-strong) 94%, var(--bg-elevated) 6%);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--surface) 45%, transparent),
    0 6px 18px rgba(15, 23, 42, 0.04);
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid var(--stroke-strong);
  border-radius: 14px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 96%, var(--bg-elevated) 4%) 0%, color-mix(in srgb, var(--surface) 98%, white 2%) 100%);
  color: var(--cp-text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--cp-surface) 60%, transparent),
    0 6px 18px rgba(15, 23, 42, 0.04);
}

.toolbar-btn:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--brand-secondary) 38%, var(--stroke-strong));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--surface) 60%, transparent),
    0 10px 22px rgba(15, 23, 42, 0.08);
}

.toolbar-btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
}

.toolbar-btn-primary {
  border-color: color-mix(in srgb, var(--brand-secondary) 38%, var(--stroke-strong));
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 14%, var(--surface-strong)), color-mix(in srgb, var(--brand) 16%, var(--surface)));
}

.quick-btn {
  min-width: 88px;
  padding-inline: 18px;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.quick-btn:hover {
  border-color: color-mix(in srgb, var(--brand-secondary) 28%, var(--stroke-strong));
  background: color-mix(in srgb, var(--brand-secondary) 8%, var(--surface));
  box-shadow: none;
}

.refresh-btn {
  min-width: 126px;
}

.toolbar-select {
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--cp-accent) 18%, var(--cp-border));
  border-radius: 14px;
  background: var(--cp-surface);
}

.tab-strip {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  padding: 6px;
  border: 1px solid color-mix(in srgb, var(--cp-accent) 14%, var(--cp-border));
  border-radius: 18px;
  background: color-mix(in srgb, var(--cp-surface) 85%, transparent);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--cp-text-soft);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.tab-btn.active {
  background: linear-gradient(135deg, color-mix(in srgb, var(--cp-accent) 18%, var(--cp-surface)), color-mix(in srgb, var(--cp-accent-2) 16%, var(--cp-surface)));
  color: var(--cp-text);
  border-color: color-mix(in srgb, var(--cp-accent) 40%, var(--cp-border));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--cp-accent) 18%, transparent);
}

.tab-btn:hover {
  background: color-mix(in srgb, var(--cp-accent) 8%, var(--cp-surface));
  color: var(--cp-text);
}

.stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.content-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metric-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-card,
.daily-card,
.stack-card,
.compare-club {
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--cp-accent) 12%, var(--cp-border));
  border-radius: 18px;
  background: color-mix(in srgb, var(--cp-surface) 92%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 10px 24px rgba(15, 23, 42, 0.04);
}

.metric-card {
  display: grid;
  gap: 8px;
}

.growth-card {
  gap: 12px;
  padding: 18px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--brand-secondary) 4%, var(--surface-strong)) 0%, color-mix(in srgb, var(--surface) 100%, transparent) 100%);
  border-color: color-mix(in srgb, var(--brand-secondary) 18%, var(--stroke));
  min-height: 144px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 16px 32px rgba(15, 23, 42, 0.05);
}

.growth-head,
.growth-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.growth-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--brand-secondary) 18%, var(--stroke));
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-secondary) 6%, var(--surface));
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.metric-card span,
.daily-card span,
.compare-club span,
.field-block span {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cp-text-faint);
}

.metric-card strong,
.daily-card strong,
.stack-card strong,
.compare-club strong {
  font-size: clamp(18px, 2.3vw, 30px);
  line-height: 1.08;
}

.growth-card strong {
  font-size: clamp(17px, 2vw, 25px);
  letter-spacing: -0.03em;
}

.metric-main {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  padding-bottom: 2px;
  min-height: 52px;
}

.metric-main small {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--cp-accent) 10%, var(--cp-surface));
  color: var(--cp-text-soft);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.metric-card em {
  font-style: normal;
  font-size: 12px;
  font-weight: 700;
}

.growth-card em {
  display: inline-flex;
  width: fit-content;
  min-height: 28px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--stroke-strong) 70%, transparent);
  background: color-mix(in srgb, var(--surface-soft) 86%, transparent);
}

.metric-grid {
  align-items: stretch;
}

.metric-card .up {
  color: var(--cp-success);
}

.metric-card .down {
  color: var(--cp-danger);
}

.metric-card .equal,
.stack-card p,
.daily-card small,
.compare-club small {
  color: var(--cp-text-soft);
  font-size: 12px;
}

.mix-list,
.daily-grid {
  display: grid;
  gap: 12px;
}

.chart-split {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}

.chart-stack {
  display: grid;
  gap: 14px;
}

.top-clients-list {
  gap: 10px;
}

.top-client-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.top-client-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.top-client-badge,
.top-client-amount span,
.top-client-copy p {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.top-client-badge {
  width: fit-content;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--brand-secondary) 16%, var(--stroke));
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-secondary) 6%, var(--surface));
  color: var(--text-faint);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.top-client-copy strong {
  font-size: clamp(15px, 1.5vw, 21px);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.top-client-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.top-client-amount {
  display: grid;
  justify-items: end;
  gap: 6px;
  min-width: 140px;
}

.top-client-amount span {
  color: var(--text-faint);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.top-client-amount strong {
  font-size: clamp(18px, 1.8vw, 28px);
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.report-mini-list {
  gap: 10px;
}

.report-mini-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.report-mini-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.report-mini-badge,
.report-mini-amount span,
.report-mini-copy p {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.report-mini-badge {
  width: fit-content;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--brand-secondary) 16%, var(--stroke));
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-secondary) 6%, var(--surface));
  color: var(--text-faint);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.report-mini-copy strong {
  font-size: clamp(15px, 1.5vw, 20px);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.report-mini-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  flex-wrap: wrap;
}

.report-mini-dot {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: var(--text-faint);
}

.report-mini-amount {
  display: grid;
  justify-items: end;
  gap: 6px;
  min-width: 140px;
}

.report-mini-amount span {
  color: var(--text-faint);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.report-mini-amount strong {
  font-size: clamp(18px, 1.8vw, 28px);
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.forecast-grid {
  align-items: stretch;
}

.forecast-card {
  gap: 12px;
  min-height: 150px;
  padding: 16px 18px;
}

.forecast-badge,
.insight-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--brand-secondary) 16%, var(--stroke));
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-secondary) 6%, var(--surface));
  color: var(--text-faint);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.forecast-card strong {
  font-size: clamp(15px, 1.45vw, 22px);
  line-height: 1.12;
  letter-spacing: -0.025em;
  font-weight: 800;
  word-break: break-word;
}

.forecast-card em {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--stroke-strong) 70%, transparent);
  background: color-mix(in srgb, var(--surface-soft) 86%, transparent);
  font-size: 10px;
}

.insight-list {
  gap: 12px;
}

.insight-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
}

.insight-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.insight-copy strong {
  font-size: clamp(14px, 1.2vw, 18px);
  line-height: 1.18;
  letter-spacing: -0.015em;
}

.insight-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.insight-amount {
  min-width: 132px;
  display: grid;
  justify-items: end;
}

.insight-amount strong {
  font-size: clamp(16px, 1.45vw, 24px);
  line-height: 1.12;
  letter-spacing: -0.02em;
  text-align: right;
  word-break: break-word;
}

.autopilot-strategy {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--cp-accent) 18%, var(--cp-border));
  border-radius: 14px;
  background: color-mix(in srgb, var(--cp-surface) 94%, transparent);
  color: var(--cp-text-soft);
}

.autopilot-metrics {
  align-items: stretch;
}

.autopilot-metric-card {
  gap: 10px;
  min-height: 132px;
  padding: 16px 18px;
}

.autopilot-metric-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--brand-secondary) 16%, var(--stroke));
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-secondary) 6%, var(--surface));
  color: var(--text-faint);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.autopilot-metric-card strong {
  font-size: clamp(16px, 1.7vw, 24px);
  line-height: 1.12;
  letter-spacing: -0.02em;
}

.autopilot-zone-list,
.autopilot-demand-list {
  gap: 12px;
}

.autopilot-zone-card,
.autopilot-demand-card {
  display: grid;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.autopilot-zone-copy,
.autopilot-demand-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.autopilot-zone-copy strong,
.autopilot-demand-copy strong {
  font-size: clamp(15px, 1.3vw, 19px);
  line-height: 1.15;
  letter-spacing: -0.015em;
}

.autopilot-zone-copy p,
.autopilot-demand-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.autopilot-zone-badge,
.autopilot-demand-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--cp-accent) 18%, var(--cp-border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--cp-accent) 7%, var(--cp-surface));
  color: var(--cp-text-faint);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.autopilot-zone-meta {
  display: grid;
  justify-items: end;
  min-width: 180px;
}

.autopilot-zone-card {
  grid-template-columns: minmax(0, 1fr) auto;
}

.autopilot-zone-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--stroke-strong) 72%, transparent);
  background: color-mix(in srgb, var(--surface-soft) 88%, transparent);
  color: var(--cp-text-soft);
  font-size: 11px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: normal;
}

.autopilot-demand-card {
  grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
}

.autopilot-demand-side {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.autopilot-demand-side strong {
  font-size: clamp(16px, 1.5vw, 22px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-align: right;
}

.compact-list .bar-row {
  min-height: 32px;
}

.mix-item {
  display: grid;
  gap: 8px;
}

.mix-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mix-bar,
.compare-bar {
  width: 100%;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--cp-border) 65%, transparent);
}

.mix-fill,
.compare-fill {
  height: 100%;
  border-radius: inherit;
}

.mix-fill.cash,
.compare-fill.left {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.mix-fill.card {
  background: linear-gradient(90deg, #22c55e, #2dd4bf);
}

.mix-fill.balance,
.compare-fill.right {
  background: linear-gradient(90deg, #f59e0b, #f97316);
}

.daily-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.daily-card {
  display: grid;
  gap: 6px;
}

.stack-list,
.bar-list {
  gap: 10px;
}

.stack-card,
.bar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.bar-row span {
  width: 92px;
  flex: 0 0 92px;
  font-size: 13px;
  color: var(--cp-text-soft);
}

.bar-row strong {
  width: 56px;
  flex: 0 0 56px;
  text-align: right;
  font-size: 13px;
}

.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-block {
  display: grid;
  gap: 8px;
}

.field-shell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--cp-accent) 18%, var(--cp-border));
  border-radius: 14px;
  background: var(--cp-surface);
  color: var(--cp-text-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cp-surface) 55%, transparent);
}

.compare-layout,
.compare-list {
  display: grid;
  gap: 14px;
}

.compare-head {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.compare-row {
  display: grid;
  align-items: center;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) 180px minmax(0, 1fr);
  padding: 14px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--cp-border) 70%, transparent);
}

.compare-row:last-child {
  border-bottom: 0;
}

.compare-side {
  display: grid;
  gap: 8px;
}

.compare-center {
  display: grid;
  justify-items: center;
  gap: 4px;
  text-align: center;
}

.compare-center span {
  font-size: 13px;
  font-weight: 700;
}

.compare-center small {
  color: var(--cp-text-soft);
  font-size: 12px;
}

.empty-state,
.alert {
  padding: 18px 20px;
  border: 1px dashed var(--cp-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--cp-surface) 85%, transparent);
  color: var(--cp-text-soft);
  text-align: center;
}

.empty-state.compact {
  padding: 14px 16px;
}

.alert.err {
  border-style: solid;
  border-color: color-mix(in srgb, var(--cp-danger) 28%, var(--cp-border));
  color: var(--cp-danger);
  text-align: left;
}

@media (max-width: 1400px) {
  .stats-grid,
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .hero-tools,
  .tab-strip,
  .content-grid,
  .daily-grid,
  .form-grid,
  .compare-head,
  .chart-split {
    grid-template-columns: 1fr;
  }

  .compare-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 840px) {
  .stats-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .autopilot-zone-card,
  .autopilot-demand-card {
    grid-template-columns: 1fr;
  }

  .autopilot-zone-meta {
    justify-items: start;
    min-width: 0;
  }

  .autopilot-demand-side strong {
    text-align: left;
  }

  .stack-card,
  .bar-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .bar-row span,
  .bar-row strong {
    width: auto;
    flex: 0 0 auto;
    text-align: left;
  }
}
</style>
