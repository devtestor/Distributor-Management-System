# Distributor Management System

## System Description

The Distributor Management System is a web platform for beverage distributors that need to control stock, customer orders, deliveries, empty bottles and crates, payments, customer debt, expenses, and business performance.

The system is designed for BRALIRWA-style distribution operations. It helps distributors manage products received from BRALIRWA, monitor warehouse operations, reconcile driver deliveries, track customer payments, and generate operational and financial reports.

The system supports multiple roles, including owners, administrators, warehouse managers, sales representatives, drivers, and accountants. Each user has access to the functions relevant to their responsibility through role-based access control.

## Core Business Question

The product is built to answer:

> Where is my stock, where is my money, who owes me, who has my crates, and am I making a profit?

## Current Scope

- English, French, Kinyarwanda, and Swahili UI switching
- Login/logout and JWT authentication
- Role-based navigation and protected backend endpoints
- Owner KPI dashboard
- Product and price management
- Product price history
- Inventory visibility with reorder alerts
- Stock receiving and stock adjustment endpoints
- Customer debt and empty container balances
- Delivery and driver reconciliation overview
- Payment monitoring
- User management and account security
- Audit trail for sensitive account and product actions

## Technology

- Frontend: Next.js, React, TypeScript
- Backend: NestJS, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Authentication: JWT
- Styling: CSS modules/global CSS

## Run Locally

Install dependencies:

```bash
npm install
```

Create environment variables:

```bash
cp .env.example .env
```

Run migrations and seed data:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Start the API:

```bash
npm run api:dev
```

Start the frontend:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000/api`

Seed owner account:

- Email: `owner@example.com`
- Password: `ChangeMe123!`

## Useful Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run api:build
npm run prisma:generate
```

## Documentation

- [Implementation plan](docs/implementation-plan.md)
- [Backend API status](docs/backend-api.md)
- [Architecture notes](docs/architecture.md)
- [Deployment notes](docs/deployment.md)
- [Database schema notes](docs/database-schema.sql)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
