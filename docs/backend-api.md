# Backend API Status

## Runtime

- Framework: NestJS
- Database client: Prisma
- Database target: PostgreSQL
- Default API port: `4000`
- Global prefix: `/api`

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`
- `API_PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `WEB_ORIGIN`

## Local Commands

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run api:dev
```

If Docker Compose is unavailable, use plain Docker:

```bash
docker run --name human-concept-erp-postgres \
  -e POSTGRES_DB=human_concept_erp \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16-alpine
```

## Seed Login

The seed script creates this local development owner:

- Email: `owner@example.com`
- Password: `ChangeMe123!`
- Role: `OWNER`

Change this password before using real business data.

## Implemented Endpoints

Public:

- `GET /api/health`
- `POST /api/auth/login`

Authenticated:

- `GET /api/me`
- `GET /api/dashboard/owner`
- `GET /api/products`
- `POST /api/products`
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id/balance`
- `GET /api/warehouses/:id/stock`
- `POST /api/stock/receive`
- `POST /api/stock/adjust`
- `GET /api/invoices`
- `GET /api/invoices/:id`
- `POST /api/invoices`
- `GET /api/payments`
- `POST /api/payments`
- `GET /api/empty-containers/customers/:customerId`
- `POST /api/empty-containers/movements`
- `GET /api/deliveries/trips`
- `POST /api/deliveries/trips`
- `POST /api/deliveries/trips/:id/reconcile`

## Current Business Rules

- Bank and mobile money payments require a payment reference.
- Invoice totals are calculated from current product prices.
- Initial invoice payment cannot exceed invoice total.
- Customer balance is derived from invoices minus payments.
- Empty container balance is derived from empty container movements.
- Warehouse stock is derived from stock movements.
- Stock movements cannot make inventory negative.
- Delivery trip reconciliation requires delivered plus returned plus damaged quantities to equal loaded quantity.

## Frontend Integration

- The dashboard includes a login panel using `POST /api/auth/login`.
- After login, it calls `GET /api/dashboard/owner` with the bearer token.
- If the API or database is not running, the dashboard stays usable in demo mode with sample data.
- Set `NEXT_PUBLIC_API_URL` if the API is not running on `http://localhost:4000/api`.

## Remaining Backend Work

- Refresh invoice payment status when invoices have multiple payment updates in all edge cases.
- Deduct invoice stock through stock movement records.
- Deduct truck-loaded stock through stock movement records.
- Add delivery cash collection and variance tracking.
- Add route, warehouse, and vehicle management endpoints.
- Add expenses API.
- Add audit log writes for sensitive actions.
- Add refresh token flow.
- Add test coverage for inventory, invoices, payments, empty containers, and delivery reconciliation.
