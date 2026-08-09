# Principal Engineering Audit

Date: 2026-08-08

## Executive Position

The system has moved beyond a static prototype: it has authentication, role-based access, live PostgreSQL data, inventory movements, invoices, payments, deliveries, reports, Render deployment, and multilingual UI copy.

It is not yet a mature business platform. The next work must focus on correctness, operational safety, data boundaries, and maintainability rather than adding more screens.

## Immediate Hardening Completed

- API startup now validates required production environment variables.
- `JWT_SECRET` can no longer fall back to a development-only secret.
- Weak placeholder JWT secrets are rejected at startup.
- Role authorization failures now return `403 Forbidden` instead of `401 Unauthorized`.
- Login now has in-memory throttling for repeated failed attempts.
- Product CRUD has safe deletion rules to preserve business history.
- Login UX no longer waits for every dashboard dataset before entering the app.

## Critical Business Risks

1. Frontend is too large.
   `app/page.tsx` is a single high-risk component. It should be split into feature modules: auth, layout, dashboard, inventory, customers, deliveries, payments, reports, settings.

2. Test coverage is still thin.
   Business-critical flows need automated tests: auth roles, invoice stock deduction, credit limit override, payment status refresh, delivery reconciliation, product deletion rules, and driver data scoping.

3. Audit logging is partial.
   Sensitive flows such as login failures, stock movement, negative stock approval, and some operational configuration changes should create audit records.

4. Demo seed account is unsafe for production.
   Seed data should be explicitly disabled in production or moved to a demo-only environment. Real onboarding should create an owner through a controlled setup command.

## Target Architecture

- Next.js frontend remains the web client.
- NestJS API remains the business API.
- PostgreSQL remains the source of truth.
- Prisma remains the data access layer.
- Expand company-scoped onboarding and administration workflows.
- Add pagination response metadata.
- Add service-level transaction boundaries for all financial and stock workflows.
- Add test suite before expanding workflow surface area.

## Next Engineering Phases

### Phase A: Correctness

- Add audit logs for stock, delivery, negative stock approval, and failed login events.
- Add backend tests for invoice stock deduction, credit limit override, delivery reconciliation, product deletion rules, and driver data scoping.
- Keep expanding financial tests around payment status edge cases.

### Phase B: Scale and Boundaries

- Add company administration screens for owner/admin users.
- Add pagination/filter DTOs to remaining report-heavy endpoints.
- Add indexes for company/date/status query patterns.

### Phase C: Maintainability

- Split `app/page.tsx` into feature components and hooks.
- Move API client by feature domain.
- Add form-level validation helpers.
- Add shared role permission utilities used by both frontend and backend.

### Phase D: Operations

- Add structured API logs.
- Add request IDs.
- Add Sentry or equivalent error reporting.
- Add backup restore drill documentation.
- Add production owner onboarding command.

## Principal Recommendation

Do not add more business modules until Phase A is complete. The current product already has enough surface area; the main risk is correctness under real business pressure.
