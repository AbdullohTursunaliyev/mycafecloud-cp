# MyCafeCloud CP

Nuxt 4 based operator panel for MyCafeCloud.

## Stack

- Nuxt 4
- Pinia
- Element Plus
- Axios

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure backend origin:

```bash
cp .env.example .env
```

Set `NUXT_CP_BACKEND_ORIGIN` to your Laravel backend origin, for example:

```env
NUXT_CP_BACKEND_ORIGIN=http://mycafecloud.test
```

Nuxt proxies all frontend requests through `/api`, so the client code does not hardcode backend IPs.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Notes

- Legacy Vue pages/components are bridged from `src/` into Nuxt filesystem routing under `app/pages`.
- Auth middleware keeps `/cp/*` routes protected and redirects unauthenticated users to `/cp/login`.
- Production build output is generated in `.output/`.
