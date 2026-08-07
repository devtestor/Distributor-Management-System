# Distributor Inventory System Architecture

## Product direction

The first version is a multilingual owner dashboard for a BRALIRWA-style beverage distributor. It must answer five operating questions at any time:

- Where is the stock?
- Where is the money?
- Which customers owe money?
- Which customers owe empty bottles or crates?
- Which routes, drivers, and products are profitable?

## Recommended stack

- Frontend: Next.js, React, TypeScript
- Mobile field experience: Progressive Web App
- Backend API: NestJS
- Database: PostgreSQL
- Analytics later: Metabase
- Deployment: Docker on DigitalOcean, Render, Railway, AWS, Azure, or Google Cloud

## Languages

The UI is built around translation keys from the beginning:

- English: `en`
- French: `fr`
- Kinyarwanda: `rw`
- Swahili: `sw`

The current prototype uses local dictionaries in `lib/i18n.ts`. In production, translations can move to database-managed copy or JSON files loaded by route.

## Core modules

- Products and SKUs
- Warehouses and stock movements
- Supplier purchases from BRALIRWA
- Customer orders and invoices
- Payments and customer debt
- Empty bottle and crate balances
- Truck loading and route delivery
- Driver reconciliation
- Expenses
- Owner reports and alerts

## Roles

- Owner: full access, dashboards, reports, approvals
- Admin: master data and users
- Warehouse manager: receive, issue, transfer, count stock
- Salesperson: create orders, collect payments, view customers
- Driver: delivery confirmation, returns, cash handover
- Accountant: payments, debt, expenses, reports

## Implementation phases

1. Build the dashboard shell and data model.
2. Add authentication and role-based access.
3. Add PostgreSQL persistence and NestJS API.
4. Add stock movement workflows.
5. Add customer debt and empty container ledgers.
6. Add truck loading and reconciliation.
7. Add offline PWA support for field teams.
8. Add advanced reports and forecasting.
