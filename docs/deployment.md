# Deployment

## Vercel Frontend

This repository is ready for a Vercel frontend deployment from GitHub.

Recommended Vercel settings:

- Framework preset: `Next.js`
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: `.next`

Required Vercel environment variable:

```bash
NEXT_PUBLIC_API_URL=https://your-api-host.example.com/api
```

## API Hosting

The NestJS API in `apps/api` is a separate Node service. It should be hosted on a Node runtime such as Render, Railway, Fly.io, a VPS, or another backend host.

Required API environment variables:

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h
WEB_ORIGIN=https://your-vercel-app.vercel.app
API_PORT=4000
```

Run database setup against the production database before using live accounts:

```bash
npm run prisma:migrate
npm run prisma:seed
```

## GitHub Flow

Each completed phase should be committed and pushed to `origin/main`. Vercel can then deploy the latest pushed frontend automatically through its GitHub integration.
