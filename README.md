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

## Docker

1. Create env file:

```bash
cp .env.example .env
```

2. Point `NUXT_CP_BACKEND_ORIGIN` to your backend URL.

Examples:

```env
NUXT_CP_BACKEND_ORIGIN=http://host.docker.internal:8080
```

or when running inside the full Docker stack:

```env
NUXT_CP_BACKEND_ORIGIN=http://api:8000
```

3. Build and run:

```bash
docker compose up --build -d
```

App will be available on [http://localhost:3000](http://localhost:3000).

## Notes

- Legacy Vue pages/components are bridged from `src/` into Nuxt filesystem routing under `app/pages`.
- Auth middleware keeps `/cp/*` routes protected and redirects unauthenticated users to `/cp/login`.
- Production build output is generated in `.output/`.
