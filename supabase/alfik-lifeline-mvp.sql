-- ALFIK Lifeline MVP
-- Run once in Supabase SQL Editor. Private records are restricted to their owner.
create extension if not exists pgcrypto;

create table if not exists public.alfik_lifeline_safety_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  animal_name text not null,
  species text not null default 'Other',
  essential_care text not null default '',
  medication text not null default '',
  vet_name text not null default '',
  vet_contact text not null default '',
  trusted_contact_name text not null default '',
  trusted_contact_phone text not null default '',
  handover_preference text not null default 'Ask me first',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint lifeline_plan_handover_check check (handover_preference in ('Ask me first','Only share with my trusted contact','No sharing without my explicit approval'))
);

create table if not exists public.alfik_lifeline_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  animal_name text not null,
  species text not null default 'Other',
  crisis_type text not null,
  urgency text not null default 'Soon',
  help_needed text[] not null default '{}',
  safe_contact_method text not null default 'In-app only',
  safe_contact_time text not null default '',
  safe_to_leave_message boolean not null default false,
  details text not null default '',
  status text not null default 'Seeking support',
  next_step text not null default '',
  consent_to_referrals boolean not null default false,
  closed_outcome text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lifeline_case_urgency_check check (urgency in ('Emergency','Today','Soon','Planning ahead')),
  constraint lifeline_case_status_check check (status in ('Draft','Seeking support','Referred','Help confirmed','Alternative needed','Closed')),
  constraint lifeline_case_contact_check check (safe_contact_method in ('In-app only','Email','Phone call','Text message','Trusted contact'))
);

create table if not exists public.alfik_lifeline_referrals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_id uuid not null references public.alfik_lifeline_cases(id) on delete cascade,
  service_name text not null,
  service_website text not null default '',
  contact_method text not null default '',
  referral_status text not null default 'Not contacted',
  outcome_notes text not null default '',
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lifeline_referral_status_check check (referral_status in ('Not contacted','Contacted','Waiting for reply','Help confirmed','Not eligible','No capacity','Alternative needed','Closed'))
);

create table if not exists public.alfik_lifeline_services (
  id uuid primary key default gen_random_uuid(),
  organisation_name text not null,
  summary text not null default '',
  countries text[] not null default '{}',
  regions text[] not null default '{}',
  species text[] not null default '{}',
  support_types text[] not null default '{}',
  eligibility text not null default 'Check directly with the service',
  referral_method text not null default 'Contact the service directly',
  website text not null default '',
  public_contact text not null default '',
  verification_status text not null default 'needs_verification',
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  capacity_note text not null default 'Availability must be confirmed directly with the service.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lifeline_service_verification_check check (verification_status in ('needs_verification','verified','paused'))
);

create index if not exists lifeline_plans_owner_idx on public.alfik_lifeline_safety_plans(owner_id);
create index if not exists lifeline_cases_owner_idx on public.alfik_lifeline_cases(owner_id, updated_at desc);
create index if not exists lifeline_referrals_owner_case_idx on public.alfik_lifeline_referrals(owner_id, case_id);
create index if not exists lifeline_services_status_idx on public.alfik_lifeline_services(verification_status);

alter table public.alfik_lifeline_safety_plans enable row level security;
alter table public.alfik_lifeline_cases enable row level security;
alter table public.alfik_lifeline_referrals enable row level security;
alter table public.alfik_lifeline_services enable row level security;

drop policy if exists "Owners manage their Lifeline plans" on public.alfik_lifeline_safety_plans;
create policy "Owners manage their Lifeline plans" on public.alfik_lifeline_safety_plans
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Owners manage their Lifeline cases" on public.alfik_lifeline_cases;
create policy "Owners manage their Lifeline cases" on public.alfik_lifeline_cases
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Owners manage their Lifeline referrals" on public.alfik_lifeline_referrals;
create policy "Owners manage their Lifeline referrals" on public.alfik_lifeline_referrals
  for all to authenticated using (
    owner_id = auth.uid() and exists (
      select 1 from public.alfik_lifeline_cases c
      where c.id = case_id and c.owner_id = auth.uid()
    )
  ) with check (
    owner_id = auth.uid() and exists (
      select 1 from public.alfik_lifeline_cases c
      where c.id = case_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Anyone signed in can view verified Lifeline services" on public.alfik_lifeline_services;
create policy "Anyone signed in can view verified Lifeline services" on public.alfik_lifeline_services
  for select to authenticated using (verification_status = 'verified');

-- Service-directory writes are deliberately unavailable to ordinary members.
-- ALFIK administrators should add/update listings through the Supabase SQL editor
-- or a future, separately permission-checked partner/admin workflow.
grant select on public.alfik_lifeline_services to authenticated;
grant select, insert, update, delete on public.alfik_lifeline_safety_plans to authenticated;
grant select, insert, update, delete on public.alfik_lifeline_cases to authenticated;
grant select, insert, update, delete on public.alfik_lifeline_referrals to authenticated;

comment on table public.alfik_lifeline_safety_plans is 'Sensitive owner-controlled animal continuity plans. Never publicly expose.';
comment on table public.alfik_lifeline_cases is 'Private owner crisis support requests. Not an emergency response service.';
comment on table public.alfik_lifeline_referrals is 'Owner-private referral tracking and outcomes.';
comment on table public.alfik_lifeline_services is 'Only verified entries are visible to signed-in users; updates require admin workflow.';
