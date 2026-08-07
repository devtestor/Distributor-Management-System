# Human Concept ERP

Multilingual inventory and business monitoring system for a beverage distributor.

## Current scope

This first build contains a Next.js dashboard prototype for a BRALIRWA-style distributor. It supports:

- English, French, Kinyarwanda, and Swahili UI switching
- Owner KPI dashboard
- Inventory visibility with reorder alerts
- Customer debt and empty container balances
- Delivery and driver reconciliation overview
- Payment monitoring
- Backend architecture and PostgreSQL schema notes

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Run the API locally

```bash
cp .env.example .env
docker compose up -d postgres
npm run prisma:migrate
npm run prisma:seed
npm run api:dev
```

The API runs at `http://localhost:4000/api`.

If this Docker installation does not include the Compose plugin, start PostgreSQL with plain Docker:

```bash
docker run --name human-concept-erp-postgres \
  -e POSTGRES_DB=human_concept_erp \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16-alpine
```

The dashboard can log in with the seeded owner account after migration and seed:

- Email: `owner@example.com`
- Password: `ChangeMe123!`

## Next build phase

The next phase should add the NestJS API, PostgreSQL database, authentication, and real stock movement workflows.

See [docs/implementation-plan.md](docs/implementation-plan.md) for the full product build plan.
See [docs/backend-api.md](docs/backend-api.md) for the current backend API status.
