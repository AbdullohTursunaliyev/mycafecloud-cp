# AI Notes (Project Conventions)

## Identifiers
- UI often shows client login/phone, but backend endpoints typically expect numeric client_id.
- Client lookup should accept either numeric id or login/account_id when ambiguity exists.

## Key API Endpoints (Operator)
- POST /clients/{id}/topup
- GET /clients/{id}/history
- GET /clients/{id}/sessions
- POST /clients/{id}/packages/attach
- GET /clients/{id}/packages
- GET /clients/{id}/subscriptions
- POST /clients/{id}/subscribe
- POST /clients/{id}/subscriptions/{subId}/cancel

## Returns
- GET /clients/{id}/returns/options
- POST /clients/{id}/returns
- GET /returns

Rules:
- Return allowed only within 5 minutes.
- Return allowed only in current shift.
- Topup return reverses balance/bonus/lifetime_topup.
- Package return: balance purchases refund to balance; cash/card refunds recorded (no balance change).

## Transactions
- client_transactions.type includes: topup, package, subscription, refund, tier_upgrade_bonus.
- payment_method: cash | card | balance | system.

## UI
- Client context menu in src/pages/cp/Clients.vue.
- Returns modal: src/components/cp/ClientReturnModal.vue.
- Returns list page: src/pages/cp/Returns.vue.
- Sidebar: src/layouts/CpLayout.vue.

## Known Pitfall
- Filtering transactions by type must handle exact string values.
- Collections filtered in PHP should be reindexed with alues() before JSON.
