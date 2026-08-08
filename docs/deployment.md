# Deployment

## Current Production Target

The current production target is Render with two web services:

- `distributor-management-system-web`: Next.js frontend
- `distributor-management-system-api`: NestJS API
- Neon or Render PostgreSQL through `DATABASE_URL`

The root `render.yaml` defines both services as a Render Blueprint.

## Render Blueprint

Recommended setup:

1. Select a Render workspace:

   ```bash
   render workspace set
   ```

2. Validate the Blueprint:

   ```bash
   render blueprints validate ./render.yaml
   ```

3. Create or sync the Blueprint from the Render dashboard.

The Blueprint creates:

- API service build command: `npm run render:api:build`
- API service start command: `npm run render:api:start`
- API health check: `/api/health`
- Web service build command: `npm run render:web:build`
- Web service start command: `npm run render:web:start`
- Web health check: `/`

Required API environment variables:

```bash
DATABASE_URL=postgresql://...
JWT_EXPIRES_IN=1h
```

`render.yaml` generates `JWT_SECRET` if the service does not already have one. `DATABASE_URL` is marked `sync: false`; add the Neon or Render PostgreSQL connection string in the Render dashboard when creating the Blueprint.

The frontend receives `NEXT_PUBLIC_API_URL` from the API service's Render URL. The API receives `WEB_ORIGIN` from the web service's Render URL.

The API build command runs:

```bash
npm run prisma:generate
npm run prisma:deploy
npm run api:build
```

Seed data is not run automatically in Render. For demo or first admin setup, run it manually against the production database only when appropriate:

```bash
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

- Use Render service logs for runtime API and frontend errors.
- Use `/api/health` for health checks.
- Connect Sentry, Axiom, or a similar service before onboarding a real distributor.
- Review audit logs after sensitive account, product, price, and stock actions.

## GitHub Flow

Each completed phase should be committed and pushed to `origin/main`. Render can then deploy the latest pushed API and frontend automatically through its GitHub integration.
