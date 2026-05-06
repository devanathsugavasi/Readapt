-- Minimal launch schema for Readapt backend
-- Run this in Supabase SQL editor.

create table if not exists public.user_profiles (
  user_id text primary key,
  quiz_score integer,
  preset jsonb,
  subscription_status text default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists user_profiles_subscription_status_idx
  on public.user_profiles (subscription_status);

create index if not exists user_profiles_updated_at_idx
  on public.user_profiles (updated_at desc);
