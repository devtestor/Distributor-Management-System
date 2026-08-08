# Deployment

## Current Production Target

The current production deployment uses one Vercel app:

- Next.js frontend
- NestJS API through `api/[...path].js`
- Neon PostgreSQL through `DATABASE_URL`

Use the stable Vercel URL until the custom domain DNS is pointed at Vercel.

## Vercel App

This repository is ready for a Vercel frontend deployment from GitHub.

Recommended Vercel settings:

- Framework preset: `Next.js`
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: `.next`

Required Vercel environment variables:

```bash
NEXT_PUBLIC_API_URL=/api
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h
WEB_ORIGIN=https://your-vercel-app.vercel.app
```

Run database setup against the production database before using live accounts:

```bash
npm run prisma:deploy
npm run prisma:seed
```

`prisma:migrate` is for local development. Use `prisma:deploy` in production.

## Docker Deployment

A production Docker image is available through `Dockerfile`.

Local build:

```bash
docker build -t distributor-management-system .
```

Local stack with PostgreSQL:

```bash
docker compose up --build
```

The app is exposed at `http://localhost:3000`.

The Docker stack runs:

- `app`: Next.js frontend on port `3000`
- `api`: NestJS API on port `4000`
- `migrate`: one-shot Prisma migration job
- `seed`: one-shot seed job for roles, demo owner, starter products, warehouse, customer, and vehicle
- `postgres`: PostgreSQL on port `5432`

The frontend keeps `NEXT_PUBLIC_API_URL=/api` and proxies API calls to the internal Docker API service through `API_INTERNAL_URL=http://api:4000`.

Docker requirements:

- Docker Engine running
- Docker Compose v2 plugin available as `docker compose`
- Current shell user allowed to access the Docker daemon

Useful commands:

```bash
npm run docker:build
npm run docker:up
npm run docker:logs
npm run docker:down
```

If `docker compose` is unavailable, install the Compose v2 plugin. If Docker reports permission denied on `/var/run/docker.sock`, add the OS user to the Docker group or run the command from a shell with Docker daemon access.

The seed job is intended for local/demo stacks. For a real distributor production database, run migrations first, create real owner/admin users, and disable or avoid demo credentials.

## Database Backups

Use managed PostgreSQL backups in the hosting provider. Minimum policy:

- Daily backups
- 14 days retention during pilot
- 30 days retention for production
- Manual backup before major releases or imports

Manual backup example:

```bash
pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%Y%m%d-%H%M).dump"
```

Restore example:

```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL" backup-file.dump
```

## Logging and Monitoring

- Use Vercel deployment/function logs for runtime API errors.
- Use `/api/health` for health checks.
- Connect Sentry, Axiom, or a similar service before onboarding a real distributor.
- Review audit logs after sensitive account, product, price, and stock actions.

## GitHub Flow

Each completed phase should be committed and pushed to `origin/main`. Vercel can then deploy the latest pushed frontend automatically through its GitHub integration.
