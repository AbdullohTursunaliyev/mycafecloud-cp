const CLIENT_TIERS = [
  { key: 'rookie', icon: 'lucide:sprout', min: 0, color: '#94a3b8' },
  { key: 'squire', icon: 'lucide:shield', min: 1_000_000, color: '#22c55e' },
  { key: 'knight', icon: 'lucide:swords', min: 5_000_000, color: '#3b82f6' },
  { key: 'captain', icon: 'lucide:badge', min: 12_000_000, color: '#8b5cf6' },
  { key: 'baron', icon: 'lucide:crown', min: 25_000_000, color: '#f59e0b' },
  { key: 'investor', icon: 'lucide:gem', min: 50_000_000, color: '#ef4444' },
  { key: 'legend', icon: 'lucide:flame', min: 90_000_000, color: '#06b6d4' },
] as const

export function useCpClientTiers() {
  function lifetimeOf(client: any) {
    const value = client?.lifetime_topup ?? client?.lifetime_total ?? 0
    const parsed = Number(value || 0)
    return Number.isFinite(parsed) ? parsed : 0
  }

  function getTier(client: any) {
    const total = lifetimeOf(client)
    let current = CLIENT_TIERS[0]
    for (const tier of CLIENT_TIERS) {
      if (total >= tier.min) current = tier
    }
    return current
  }

  function getNextTier(client: any) {
    const total = lifetimeOf(client)
    for (const tier of CLIENT_TIERS) {
      if (total < tier.min) return tier
    }
    return null
  }

  function remainToNext(client: any) {
    const next = getNextTier(client)
    if (!next) return 0
    return Math.max(0, next.min - lifetimeOf(client))
  }

  function progressToNext(client: any) {
    const current = getTier(client)
    const next = getNextTier(client)
    if (!next) return 100

    const total = lifetimeOf(client)
    const span = Math.max(1, next.min - current.min)
    const covered = Math.min(span, Math.max(0, total - current.min))
    return Math.round((covered / span) * 100)
  }

  return {
    clientTiers: CLIENT_TIERS,
    lifetimeOf,
    getTier,
    getNextTier,
    remainToNext,
    progressToNext,
  }
}
