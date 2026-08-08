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

1. Tenant/company boundary is missing.
   Every table currently belongs to one implicit distributor. A real product needs `Company` or `Distributor` ownership on users, warehouses, customers, products, invoices, payments, deliveries, and stock movements.

2. Invoice number generation is not concurrency-safe.
   `INV-${count + 1}` can collide when two invoices are created at the same time. This needs a database-backed sequence or counter table inside the invoice transaction.

3. Payment creation and invoice status update are not fully atomic.
   A payment is created first, then invoice status is refreshed. If the second step fails, financial status can be stale. This should be one transaction.

4. List endpoints are unpaginated.
   Products, customers, invoices, payments, stock movement ledger, users, and reports can become slow and expensive as data grows.

5. Frontend is too large.
   `app/page.tsx` is a single high-risk component. It should be split into feature modules: auth, layout, dashboard, inventory, customers, deliveries, payments, reports, settings.

6. Test coverage is missing.
   Business-critical flows need automated tests: auth roles, invoice stock deduction, credit limit override, payment status refresh, delivery reconciliation, product deletion rules, and driver data scoping.

7. Audit logging is partial.
   Sensitive flows such as login failures, invoice creation, payment creation, stock movement, negative stock approval, and delivery reconciliation should create audit records.

8. Demo seed account is unsafe for production.
   Seed data should be explicitly disabled in production or moved to a demo-only environment. Real onboarding should create an owner through a controlled setup command.

## Target Architecture

- Next.js frontend remains the web client.
- NestJS API remains the business API.
- PostgreSQL remains the source of truth.
- Prisma remains the data access layer.
- Add `companyId` ownership across business records.
- Add pagination DTOs and response metadata.
- Add service-level transaction boundaries for all financial and stock workflows.
- Add test suite before expanding workflow surface area.

## Next Engineering Phases

### Phase A: Correctness

- Replace invoice count-based numbering with database-safe invoice sequence.
- Make payment creation and invoice status refresh atomic.
- Add audit logs for invoice, payment, stock, delivery, and failed login events.
- Add backend tests for the above.

### Phase B: Scale and Boundaries

- Add tenant/company schema.
- Scope every read/write by company.
- Add pagination/filter DTOs to list endpoints.
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
