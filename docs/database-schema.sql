-- Initial PostgreSQL schema sketch for the BRALIRWA distributor system.
-- This is the contract the NestJS API should implement next.

create table roles (
  id uuid primary key,
  name text not null unique
);

create table users (
  id uuid primary key,
  role_id uuid not null references roles(id),
  full_name text not null,
  phone text,
  email text unique,
  password_hash text not null,
  preferred_locale text not null default 'en',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key,
  sku text not null unique,
  name text not null,
  brand text not null,
  category text not null,
  package_type text not null,
  unit_size text not null,
  unit_cost numeric(14, 2) not null,
  unit_price numeric(14, 2) not null,
  reorder_level integer not null default 0,
  tracks_empties boolean not null default false,
  is_active boolean not null default true
);

create table warehouses (
  id uuid primary key,
  name text not null,
  location text,
  is_active boolean not null default true
);

create table stock_movements (
  id uuid primary key,
  product_id uuid not null references products(id),
  warehouse_id uuid not null references warehouses(id),
  movement_type text not null,
  quantity integer not null,
  unit_cost numeric(14, 2),
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key,
  name text not null,
  phone text,
  route text,
  location text,
  credit_limit numeric(14, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key,
  customer_id uuid not null references customers(id),
  invoice_number text not null unique,
  status text not null,
  payment_status text not null,
  total_amount numeric(14, 2) not null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table invoice_items (
  id uuid primary key,
  invoice_id uuid not null references invoices(id),
  product_id uuid not null references products(id),
  quantity integer not null,
  unit_price numeric(14, 2) not null,
  discount_amount numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null
);

create table payments (
  id uuid primary key,
  customer_id uuid not null references customers(id),
  invoice_id uuid references invoices(id),
  method text not null,
  amount numeric(14, 2) not null,
  reference text,
  received_by uuid not null references users(id),
  received_at timestamptz not null default now()
);

create table empty_container_movements (
  id uuid primary key,
  customer_id uuid not null references customers(id),
  product_id uuid references products(id),
  movement_type text not null,
  quantity integer not null,
  reference_type text,
  reference_id uuid,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table vehicles (
  id uuid primary key,
  plate_number text not null unique,
  driver_id uuid references users(id),
  is_active boolean not null default true
);

create table delivery_trips (
  id uuid primary key,
  vehicle_id uuid not null references vehicles(id),
  driver_id uuid not null references users(id),
  route text not null,
  status text not null,
  loaded_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

create table delivery_trip_items (
  id uuid primary key,
  trip_id uuid not null references delivery_trips(id),
  product_id uuid not null references products(id),
  loaded_quantity integer not null,
  delivered_quantity integer not null default 0,
  returned_quantity integer not null default 0,
  damaged_quantity integer not null default 0
);

create table expenses (
  id uuid primary key,
  category text not null,
  amount numeric(14, 2) not null,
  note text,
  spent_by uuid references users(id),
  spent_at timestamptz not null default now()
);
