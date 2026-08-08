-- Migration: 002_universal_measurements.sql
-- Description: Creates Universal Measurement System tables and migrates existing measurement data

-- 1. Universal Measurement Templates
create table if not exists universal_measurement_templates (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  template_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Universal Measurement Fields
create table if not exists universal_measurement_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references universal_measurement_templates(id) on delete cascade,
  field_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Customer Measurements (One editable profile per customer)
create table if not exists customer_measurements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references customers(id) on delete cascade,
  template_id uuid references universal_measurement_templates(id) on delete set null,
  measurements jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS Policies
alter table universal_measurement_templates enable row level security;
alter table universal_measurement_fields enable row level security;
alter table customer_measurements enable row level security;

create policy "Users can manage templates for their shop"
  on universal_measurement_templates
  for all using (
    shop_id in (
      select shop_id from staff where user_id = auth.uid()
      union
      select id from shops where owner_id = auth.uid()
    )
  );

create policy "Users can manage fields for their shop templates"
  on universal_measurement_fields
  for all using (
    template_id in (
      select id from universal_measurement_templates where shop_id in (
        select shop_id from staff where user_id = auth.uid()
        union
        select id from shops where owner_id = auth.uid()
      )
    )
  );

create policy "Users can manage customer measurements for their shop"
  on customer_measurements
  for all using (
    customer_id in (
      select id from customers where shop_id in (
        select shop_id from staff where user_id = auth.uid()
        union
        select id from shops where owner_id = auth.uid()
      )
    )
  );
