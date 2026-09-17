-- Run this in your Supabase SQL editor when you want persistent storage for the admin dashboard.
-- Tables: categories, products, orders

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  price decimal(12,2) not null,
  image_url text,
  image_urls jsonb,
  stock_quantity int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products add column if not exists image_urls jsonb;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  shipping_address text not null,
  items jsonb not null,
  subtotal decimal(12,2) not null,
  total decimal(12,2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  link_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists offers (
  product_id uuid primary key references products(id) on delete cascade,
  offer_price decimal(12,2) not null,
  percent_off numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional: enable RLS and policies for your setup
-- alter table categories enable row level security;
-- alter table products enable row level security;
-- alter table orders enable row level security;
-- alter table banners enable row level security;
-- alter table offers enable row level security;
