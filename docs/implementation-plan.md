# Implementation Plan

## Objective

Build a multilingual distributor management system for a BRALIRWA-style beverage distributor. The system must help the owner and team control inventory, customer debts, empty bottles/crates, deliveries, payments, expenses, and business performance.

The product should answer these questions daily:

- What stock do we have, and where is it?
- Which products are low and need reordering?
- Which customers owe money?
- Which customers owe empty bottles or crates?
- Which trucks and drivers are still on route?
- How much cash, mobile money, bank payment, and credit was recorded today?
- Are sales profitable after costs, losses, discounts, and expenses?

## Product Principles

- Keep the first version operational, not theoretical.
- Every stock change must create a stock movement record.
- Every customer debt change must be traceable to an invoice, payment, return, or adjustment.
- Empty bottles and crates must be tracked like money.
- Owners need summaries; operators need fast workflows.
- The system must support English, French, Kinyarwanda, and Swahili from day one.
- Mobile workflows must be simple enough for salespeople, drivers, and warehouse teams.

## Recommended Technology

- Frontend: Next.js, React, TypeScript
- Mobile field app: PWA first, native app later only if required
- Backend: NestJS, TypeScript
- Database: PostgreSQL
- ORM: Prisma or TypeORM
- Authentication: JWT access tokens with secure refresh tokens
- Authorization: role-based access control
- Reports: built-in reports first, Metabase later
- Deployment: Docker
- Hosting: DigitalOcean, Render, Railway, AWS, Azure, or Google Cloud
- Backups: automated PostgreSQL backups

## Languages

Supported languages:

- English: `en`
- French: `fr`
- Kinyarwanda: `rw`
- Swahili: `sw`

Implementation requirements:

- Store user preferred language on the user profile.
- Keep all UI text behind translation keys.
- Do not hardcode labels in forms, tables, buttons, errors, or reports.
- Format currency as RWF.
- Format dates by selected language.
- Keep product names as business data, not translation keys.

## User Roles

### Owner

- View all dashboards and reports
- Monitor profit, stock value, debt, cash, and empty containers
- Approve stock adjustments
- Approve credit limit changes
- View audit logs
- Manage users

### Admin

- Manage users, roles, products, warehouses, vehicles, routes, and customers
- Configure prices and reorder levels
- Manage system settings

### Warehouse Manager

- Receive BRALIRWA stock
- Issue stock to trucks
- Receive returned stock
- Record damaged stock
- Perform stock counts
- Request stock adjustments

### Salesperson

- Create customer orders
- View assigned customers
- Record customer payments
- See customer debt and empty container balance

### Driver

- View assigned delivery trip
- Confirm delivered quantities
- Record returned products
- Record empty bottles/crates collected
- Submit route reconciliation

### Accountant

- Record and verify payments
- Monitor customer balances
- Record expenses
- Produce daily and monthly financial reports

## Core Modules

## 1. Authentication and Access Control

Features:

- Login and logout
- Role-based permissions
- User profile with preferred language
- Password reset
- Active/inactive users
- Audit trail for sensitive actions

Acceptance criteria:

- Users can only access modules allowed by their role.
- Owner can disable users.
- Every stock adjustment, payment edit, and credit change is logged.

## 2. Product and Price Management

Features:

- Create products and SKUs
- Set category, brand, package type, unit size, unit cost, selling price, and reorder level
- Mark products as active or inactive
- Track whether a product requires empty bottle/crate return
- Maintain price history

Acceptance criteria:

- Product SKU must be unique.
- Inactive products cannot be sold but remain visible in history.
- Price changes do not rewrite old invoices.

## 3. Warehouse and Inventory

Features:

- Receive purchases from BRALIRWA
- Track stock by warehouse
- Transfer stock between warehouses
- Issue stock to delivery trucks
- Receive returned stock from trucks
- Record damaged, lost, expired, or adjusted stock
- Perform physical stock count
- Show stock valuation and reorder alerts

Acceptance criteria:

- Stock balance is calculated from stock movements.
- Stock cannot go negative unless owner/admin explicitly allows it.
- Every movement stores product, warehouse, quantity, reason, user, and timestamp.
- Low-stock products appear on the owner dashboard.

## 4. Empty Bottles and Crates

Features:

- Track full crates issued to customers
- Track empty bottles/crates expected back
- Record empties returned by customer
- Track missing empties by customer, product, route, and driver
- Assign deposit or replacement value
- Report total empty container exposure

Acceptance criteria:

- Owner can see each customer’s empty container balance.
- Driver reconciliation compares expected empties vs returned empties.
- Empty container movements are never overwritten; corrections are adjustments.

## 5. Customer Management

Features:

- Customer profile
- Phone, location, route, contact person
- Credit limit
- Payment terms
- Outstanding balance
- Empty container balance
- Order history
- Payment history
- Customer status: active, blocked, watchlist

Acceptance criteria:

- A customer over credit limit cannot receive credit without approval.
- Owner can see top debtors and top buyers.
- Salesperson sees only assigned customers unless given wider access.

## 6. Orders and Invoices

Features:

- Create customer order
- Convert order to invoice
- Apply discounts
- Support cash, mobile money, bank, and credit
- Print or export invoice
- Track partial payments
- Track returns and credit notes

Acceptance criteria:

- Invoice totals are calculated from invoice items.
- Invoice stock deduction happens through stock movement records.
- Credit sales update customer balance.
- Paid invoices cannot be silently edited.

## 7. Delivery and Route Management

Features:

- Create delivery trip
- Assign driver, truck, route, and loaded products
- Track customers served on route
- Confirm delivered quantities
- Record cash collected
- Record credit issued
- Record returned products
- Record damaged products
- Record empty bottles/crates collected
- Reconcile truck at end of route

Acceptance criteria:

- Loaded quantity equals delivered quantity plus returned quantity plus damaged/lost quantity.
- Cash expected must match cash submitted, or a variance is recorded.
- Driver shortages are visible to owner/accountant.
- Delivery status is visible on dashboard.

## 8. Payments and Debt

Features:

- Record payment by cash, mobile money, bank, or credit settlement
- Allocate payment to invoice
- Support partial payments
- Track customer account balance
- Show aging debt report
- Flag overdue customers

Acceptance criteria:

- Customer balance can be rebuilt from invoices, payments, returns, and adjustments.
- Payment reference is required for mobile money and bank payments.
- Accountant can export daily collections.

## 9. Expenses

Features:

- Record fuel, salaries, repairs, rent, utilities, loading labor, and other expenses
- Assign expenses to vehicle, route, or general business
- Attach notes and receipt reference
- Report expenses by category and period

Acceptance criteria:

- Monthly profit report subtracts expenses.
- Owner can compare route sales against route expenses.

## 10. Reports and Dashboard

Owner dashboard:

- Today’s sales
- Today’s cash collected
- Today’s credit sales
- Current stock value
- Low-stock products
- Customer debt total
- Empty container exposure
- Active deliveries
- Driver reconciliation issues
- Product gross margin

Reports:

- Daily sales report
- Stock movement report
- Stock valuation report
- Low-stock report
- Customer debt report
- Debt aging report
- Empty bottles/crates report
- Driver reconciliation report
- Route performance report
- Product profitability report
- Monthly profit and loss report

Acceptance criteria:

- Reports can filter by date range.
- Reports can filter by product, customer, route, driver, and warehouse where relevant.
- Owner can export important reports to CSV or PDF.

## 11. Offline PWA Field Work

Features:

- Installable mobile web app
- Cache core screens
- Store draft orders and delivery confirmations locally
- Sync when internet returns
- Show sync status clearly

Acceptance criteria:

- Field user can continue creating orders when offline.
- Sync conflicts are visible and do not silently overwrite server data.
- Server validates all synced records before accepting them.

## Data Model Build Order

1. Roles
2. Users
3. Products
4. Warehouses
5. Customers
6. Vehicles
7. Stock movements
8. Invoices
9. Invoice items
10. Payments
11. Empty container movements
12. Delivery trips
13. Delivery trip items
14. Expenses
15. Audit logs

## API Build Order

1. `POST /auth/login`
2. `POST /auth/refresh`
3. `GET /me`
4. `GET /dashboard/owner`
5. `GET /products`
6. `POST /products`
7. `GET /warehouses`
8. `GET /warehouses/:id/stock`
9. `GET /stock/movements`
10. `POST /stock/receive`
11. `POST /stock/adjust`
12. `POST /stock/transfer`
13. `POST /stock/count`
14. `GET /customers`
15. `POST /customers`
16. `GET /customers/:id/balance`
17. `GET /customers/:id/account-history`
18. `GET /customers/debt-aging`
19. `POST /orders`
20. `POST /invoices`
21. `POST /payments`
22. `POST /deliveries/trips`
23. `POST /deliveries/trips/:id/load`
24. `POST /deliveries/trips/:id/reconcile`
25. `GET /reports/sales`
26. `GET /reports/stock`
21. `GET /reports/debt`
22. `GET /reports/empties`

## Frontend Build Order

1. Dashboard shell and navigation
2. Language switcher and translation structure
3. Login screen
4. Role-based app layout
5. Product list and product form
6. Stock receiving screen
7. Stock adjustment screen
8. Customer list and customer form
9. Customer account page
10. Order creation screen
11. Invoice view
12. Payment recording screen
13. Delivery trip list
14. Truck loading screen
15. Driver mobile delivery screen
16. Truck reconciliation screen
17. Reports screens
18. Offline sync status UI

## Milestones

## Milestone 1: Prototype Foundation

Goal:

- Build clickable dashboard and multilingual shell.

Deliverables:

- Owner dashboard UI
- Translation keys for four languages
- Mock products, customers, deliveries, and payments
- PWA manifest
- Architecture notes

Status:

- Started.

## Milestone 2: Backend Foundation

Goal:

- Add real API and database persistence.

Deliverables:

- NestJS backend
- PostgreSQL database
- ORM setup
- Migrations
- Seed data
- Health check endpoint
- Environment configuration

Acceptance criteria:

- Backend starts locally.
- Database migrations run successfully.
- Seed data can be loaded.
- API health check returns successfully.

Current status:

- NestJS backend source tree has been added under `apps/api`.
- Prisma schema has been created under `prisma/schema.prisma`.
- Prisma seed script has been added under `prisma/seed.ts`.
- API compile currently passes.
- PostgreSQL migration and seed still need to be run against a real local database.

## Milestone 3: Authentication and Roles

Goal:

- Secure the system by user role.

Deliverables:

- Login API
- JWT authentication
- Role and permission guards
- Login page
- User management screen

Acceptance criteria:

- Users can log in.
- Unauthorized users are blocked from protected pages.
- Role restrictions are enforced by backend and frontend.

Current status:

- JWT login endpoint has been added.
- Role metadata and JWT guard have been added.
- `GET /api/me` has been added.
- Frontend login panel has been added.
- Frontend protected navigation has been added.
- Backend read endpoints now restrict inventory, customer, payment, invoice, product, warehouse, and vehicle data by role.
- Driver delivery lists are scoped to assigned trips only, and drivers can only reconcile their own assigned trips.
- Frontend live-data loading now requests only the datasets allowed for the signed-in role.
- Customer assignment scoping for salesperson accounts is still pending because the current schema does not yet have a customer-to-salesperson assignment relation.

## Milestone 4: Inventory Operations

Goal:

- Replace mock stock with real inventory operations.

Deliverables:

- Product management
- Warehouse stock view
- BRALIRWA stock receiving
- Stock adjustments
- Stock movement ledger
- Warehouse transfers
- Physical stock counts
- Low-stock alerts

Acceptance criteria:

- Stock balance updates from movements.
- Owner can see low-stock and stock value.
- Warehouse manager can receive and adjust stock.
- Stock cannot go negative unless owner/admin explicitly authorizes it.
- Warehouse transfers create paired ledger records.
- Physical stock counts store a count adjustment record.

Current status:

- Product list/create endpoints have been added.
- Warehouse list endpoint has been added.
- Warehouse stock endpoint has been added.
- Stock receive and stock adjust endpoints have been added.
- Stock movement ledger endpoint has been added.
- Stock transfer endpoint has been added.
- Physical stock count endpoint has been added.
- Negative-stock authorization has been added for owner/admin.
- Stock balances are derived from movement records.

## Milestone 5: Customers, Sales, and Payments

Goal:

- Track sales, customer balances, and collections.

Deliverables:

- Customer management
- Order creation
- Invoice generation
- Payment recording
- Customer balance ledger
- Debt aging report

Acceptance criteria:

- Credit sales increase customer balance.
- Payments reduce customer balance.
- Customer account history is auditable.

Current status:

- Customer list/create endpoints have been added.
- Customer balance endpoint has been added.
- Customer account history endpoint has been added.
- Debt aging endpoint has been added.
- Invoice list/detail/create endpoints have been added.
- Invoice creation deducts stock through stock movement records.
- Invoice creation enforces customer credit limits unless owner/admin approves an override.
- Payment list/create endpoints have been added.
- Invoice-specific payments cannot exceed the invoice balance.

## Milestone 6: Empty Container Tracking

Goal:

- Control bottle and crate losses.

Deliverables:

- Empty container ledger
- Customer empty balance
- Empty return workflow
- Empty exposure report

Acceptance criteria:

- Owner can see total and customer-level empty container exposure.
- Driver can record returned empties during delivery.

Current status:

- Empty container movement endpoint has been added.
- Customer empty container ledger endpoint has been added.

## Milestone 7: Delivery and Driver Reconciliation

Goal:

- Control trucks, routes, cash, returns, and shortages.

Deliverables:

- Delivery trip creation
- Truck loading
- Driver mobile route screen
- Delivery confirmation
- Return and damage recording
- End-of-trip reconciliation

Acceptance criteria:

- Loaded stock reconciles against delivered, returned, and damaged stock.
- Cash expected reconciles against cash collected.
- Variances are reported to owner/accountant.

Current status:

- Delivery trip list/create endpoints have been added.
- Active vehicle list endpoint has been added.
- Delivery trip creation now records truck-load stock movement ledger entries.
- Delivery reconciliation endpoint has been added.
- Quantity reconciliation rule has been added.
- Returned truck stock now records return movement ledger entries back to the loading warehouse.
- Frontend owner/admin truck-loading action has been added.
- Cash collection and variance tracking are still pending.

## Milestone 8: Reports and Profitability

Goal:

- Give owner full business visibility.

Deliverables:

- Daily sales report
- Stock valuation report
- Debt aging report
- Empty container report
- Driver reconciliation report
- Product margin report
- Route performance report
- Monthly profit and loss report

Acceptance criteria:

- Reports filter by date range.
- Reports export to CSV.
- Monthly profit accounts for expenses and losses.

Current status:

- Sales report endpoint has been added with date-range filters.
- Stock valuation report endpoint has been added.
- Customer debt report endpoint has been added.
- Empty container exposure report endpoint has been added.
- Reports screen now renders sales, stock, debt, and empty-container reports.
- CSV export has been added for the implemented reports.
- Driver reconciliation, route performance, product profitability, and monthly profit/loss reports are still pending.
- Expense capture is still pending, so monthly profit/loss cannot be completed yet.

## Milestone 9: Offline PWA

Goal:

- Support field work with unstable internet.

Deliverables:

- Offline-capable order drafts
- Offline delivery confirmations
- Sync queue
- Conflict handling
- Sync status indicators

Acceptance criteria:

- Salesperson or driver can continue working offline.
- Data syncs when online.
- Conflicts require user/admin resolution.

Current status:

- PWA manifest has been expanded with scope and install icon.
- Service worker has been added to cache the app shell and static assets.
- Online/offline status indicator has been added to the authenticated app.
- Local offline draft queue has been added for stock receipts, invoices, payments, delivery trips, and reconciliations.
- Queued drafts sync automatically when the connection returns and can be triggered manually.
- Full conflict review/admin resolution UI is still pending.

## Milestone 10: Production Deployment

Goal:

- Prepare the system for real distributor operations.

Deliverables:

- Docker setup
- Production environment variables
- Database backup policy
- Error logging
- Audit logging
- Deployment documentation
- Basic user training notes

Acceptance criteria:

- App deploys to selected hosting provider.
- Database backups are scheduled.
- Owner/admin can recover from common operational mistakes.

Current status:

- Render Blueprint deployment is configured with separate frontend and API services.
- Vercel production deployment remains available as an alternate target, but the active target is Render.
- Dockerfile has been added for container deployment.
- Docker Compose includes app, API, migration, seed, and PostgreSQL services for local production-like runs.
- Production migration script `prisma:deploy` has been added.
- Deployment documentation has been expanded with Render, Docker, backup, logging, and monitoring notes.
- Production runbook has been added.
- Principal engineering audit has been added to define the remaining path to business-grade software.
- API startup now validates required environment variables and rejects weak JWT secrets.
- Login throttling has been added for repeated failed attempts.
- Invoice numbers now use a database-backed sequence instead of count-based generation.
- Payment creation and invoice payment status refresh now run inside one transaction.
- Invoice and payment creation now write audit log entries.
- A backend test script and initial payment service tests have been added.
- High-growth list endpoints now accept `page` and `limit` query parameters with capped default limits.
- Basic user training notes have been added.
- External managed database backup scheduling still needs to be enabled in the selected PostgreSQL provider.
- Structured error monitoring provider is still pending.

## Testing Strategy

Unit tests:

- Price calculations
- Invoice totals
- Stock movement balance logic
- Customer balance logic
- Empty container balance logic
- Role permission checks

Integration tests:

- Receive stock
- Create invoice
- Record payment
- Load truck
- Reconcile truck
- Record customer empty returns

End-to-end tests:

- Owner views dashboard
- Warehouse receives stock
- Salesperson creates order
- Accountant records payment
- Driver reconciles delivery trip

Manual checks:

- Mobile layout
- Language switching
- Offline behavior
- CSV/PDF exports

## Operational Controls

The system should include these controls before production:

- Audit log for sensitive changes
- Approval workflow for large stock adjustments
- Approval workflow for credit limit changes
- Daily cash close report
- User activity history
- Database backups
- Exportable reports
- Data import templates for products and customers

## Risks

- Incorrect starting stock will create unreliable reports.
- Weak empty container tracking will hide major losses.
- Allowing paid invoices to be edited can corrupt financial records.
- Offline sync can create duplicate records if not designed carefully.
- Poor role permissions can expose financial data to the wrong users.
- Reports will be misleading if expenses are added late or inconsistently.

## Immediate Next Steps

1. Create the NestJS backend application.
2. Add PostgreSQL and ORM configuration.
3. Convert the schema sketch into migrations.
4. Add seed data for roles, users, products, warehouses, customers, and vehicles.
5. Connect the current dashboard to real API endpoints.
6. Build login and role-based navigation.
7. Build the stock receiving workflow.
