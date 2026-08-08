# Production Runbook

## Daily Checks

- Confirm `/api/health` returns `status: ok`.
- Confirm owner login works.
- Review owner dashboard alerts: low stock, debt exposure, empty container exposure, active deliveries.
- Review audit logs after user, product, price, stock, or account changes.
- Confirm the latest database backup completed.

## Deployment Checklist

1. Run local checks:

   ```bash
   npm run lint
   npm run typecheck
   npm run build
   npm run api:build
   ```

2. Push to `origin/main`.
3. Deploy from Vercel or run `vercel deploy --prod`.
4. Smoke-test production:

   ```bash
   curl https://your-domain/api/health
   ```

5. Login as owner and verify Dashboard, Inventory, Deliveries, Reports, and Settings.

## Required Production Environment Variables

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=long-random-secret
JWT_EXPIRES_IN=1h
WEB_ORIGIN=https://your-production-domain
NEXT_PUBLIC_API_URL=/api
```

## Database Backup Policy

- Use managed PostgreSQL automatic backups if using Neon, Render, Railway, DigitalOcean, AWS, Azure, or Google Cloud.
- Minimum backup frequency: daily.
- Minimum retention: 14 days before pilot, 30 days for production.
- Before major releases or data imports, create a manual backup/snapshot.
- Test restore at least once before real distributor onboarding.

## Manual PostgreSQL Backup

Use this when direct database access is available:

```bash
pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%Y%m%d-%H%M).dump"
```

Restore into a clean database:

```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL" backup-file.dump
```

## Incident Response

- If login fails for every user, check `JWT_SECRET`, `DATABASE_URL`, and deployment health.
- If stock looks wrong, inspect stock movement ledger before editing products.
- If a payment is wrong, create a correction payment or adjustment instead of editing history silently.
- If a user leaves the company, deactivate the account first. Delete only accounts with no business history.
- If offline drafts fail to sync, keep the draft queue visible and resolve the server-side validation error before retrying.

## Error Logging

- Vercel function logs are the current primary runtime log source.
- API errors should be investigated from Vercel deployment logs and correlated with user action time.
- Before full production rollout, connect structured error tracking such as Sentry or Axiom.
