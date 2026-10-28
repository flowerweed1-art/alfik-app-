-- ALFIK Lifeline: organisation claim and profile ownership workflow
-- Run once in Supabase SQL Editor. Approval remains an ALFIK-admin action.
alter table public.alfik_lifeline_services
  add column if not exists claimed_by uuid references auth.users(id) on delete set null;

create table if not exists public.alfik_lifeline_org_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  service_id uuid references public.alfik_lifeline_services(id) on delete set null,
  request_type text not null default 'claim_existing',
  organisation_name text not null,
  website text not null default '',
  public_contact text not null default '',
  summary text not null default '',
  countries text[] not null default '{}',
  regions text[] not null default '{}',
  species text[] not null default '{}',
  support_types text[] not null default '{}',
  eligibility text not null default 'Check directly with the service',
  referral_method text not null default 'Contact the service directly',
  status text not null default 'pending',
  review_notes text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lifeline_org_request_type_check check (request_type in ('claim_existing','new_listing')),
  constraint lifeline_org_request_status_check check (status in ('pending','approved','rejected','more_information'))
);

create index if not exists lifeline_org_requests_owner_idx
  on public.alfik_lifeline_org_requests(owner_id, created_at desc);
create index if not exists lifeline_org_requests_status_idx
  on public.alfik_lifeline_org_requests(status, created_at);

alter table public.alfik_lifeline_org_requests enable row level security;
drop policy if exists "Organisations can view their own directory requests" on public.alfik_lifeline_org_requests;
create policy "Organisations can view their own directory requests"
  on public.alfik_lifeline_org_requests for select to authenticated
  using (owner_id = auth.uid());
drop policy if exists "Organisations can submit directory requests" on public.alfik_lifeline_org_requests;
create policy "Organisations can submit directory requests"
  on public.alfik_lifeline_org_requests for insert to authenticated
  with check (owner_id = auth.uid() and status = 'pending' and reviewed_by is null and reviewed_at is null);
grant select, insert on public.alfik_lifeline_org_requests to authenticated;

-- Public users still see only verified listings. A verified/claimed organisation can also
-- read its own listing while it is paused or awaiting verification.
drop policy if exists "Anyone signed in can view verified Lifeline services" on public.alfik_lifeline_services;
create policy "Anyone signed in can view verified Lifeline services"
  on public.alfik_lifeline_services for select to authenticated
  using (verification_status = 'verified' or claimed_by = auth.uid());

drop policy if exists "Claimed organisations can edit their own listing details" on public.alfik_lifeline_services;
create policy "Claimed organisations can edit their own listing details"
  on public.alfik_lifeline_services for update to authenticated
  using (claimed_by = auth.uid())
  with check (claimed_by = auth.uid());

-- Column-level grants prevent a claimed organisation changing its own verification status,
-- ownership, or approval fields. Do not grant table-wide UPDATE to authenticated users.
revoke update on public.alfik_lifeline_services from authenticated;
grant update (organisation_name, summary, countries, regions, species, support_types,
  eligibility, referral_method, website, public_contact, capacity_note, updated_at)
  on public.alfik_lifeline_services to authenticated;

comment on table public.alfik_lifeline_org_requests is
  'Private organisation/rescue claims and new directory listing requests. ALFIK admin approval required before linking or publication.';
comment on column public.alfik_lifeline_services.claimed_by is
  'Auth user allowed to edit the organisation listing after manual ALFIK approval. Never set by the claimant.';
