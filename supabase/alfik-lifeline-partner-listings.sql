-- ALFIK Lifeline organisation-owned listings and safe claim workflow
-- Run in Supabase SQL Editor after alfik-lifeline-mvp.sql and
-- alfik-lifeline-admin-verification.sql.
-- Uses existing ALFIK organisation memberships; it does not create a second account system.

create extension if not exists pgcrypto;

alter table public.alfik_lifeline_services
  add column if not exists organisation_id uuid references public.alfik_organisations(id) on delete set null,
  add column if not exists partner_updated_at timestamptz,
  add column if not exists partner_update_needs_review boolean not null default false;

create index if not exists lifeline_services_organisation_idx
  on public.alfik_lifeline_services(organisation_id);

create table if not exists public.alfik_lifeline_claim_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.alfik_lifeline_services(id) on delete cascade,
  organisation_id uuid not null references public.alfik_organisations(id) on delete cascade,
  requested_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  evidence text not null default '',
  status text not null default 'pending',
  admin_notes text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lifeline_claim_status_check check (status in ('pending','approved','rejected','withdrawn')),
  constraint lifeline_claim_once_per_org unique (service_id, organisation_id)
);

alter table public.alfik_lifeline_claim_requests enable row level security;
revoke all on public.alfik_lifeline_claim_requests from anon, authenticated;
grant select, insert, update, delete on public.alfik_lifeline_claim_requests to authenticated;

-- All partner actions below verify membership against ALFIK's existing organisation table.
create or replace function public.alfik_partner_list_lifeline_services(p_org_id uuid)
returns table (
  id uuid, organisation_id uuid, organisation_name text, summary text,
  countries text[], regions text[], species text[], support_types text[],
  eligibility text, referral_method text, website text, public_contact text,
  verification_status text, capacity_note text, verification_notes text,
  partner_update_needs_review boolean, updated_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_org_members m where m.org_id = p_org_id and m.user_id = auth.uid()
  ) then raise exception 'You do not have access to this organisation'; end if;

  return query
  select s.id, s.organisation_id, s.organisation_name, s.summary,
         s.countries, s.regions, s.species, s.support_types, s.eligibility,
         s.referral_method, s.website, s.public_contact, s.verification_status,
         s.capacity_note, s.verification_notes, s.partner_update_needs_review, s.updated_at
  from public.alfik_lifeline_services s
  where s.organisation_id = p_org_id
  order by s.updated_at desc;
end;
$$;

create or replace function public.alfik_partner_save_lifeline_service(
  p_org_id uuid,
  p_service_id uuid default null,
  p_organisation_name text default '',
  p_summary text default '',
  p_countries text[] default '{}',
  p_regions text[] default '{}',
  p_species text[] default '{}',
  p_support_types text[] default '{}',
  p_eligibility text default 'Check directly with the service',
  p_referral_method text default 'Contact the service directly',
  p_website text default '',
  p_public_contact text default '',
  p_capacity_note text default 'Availability must be confirmed directly with the service.'
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_org_members m where m.org_id = p_org_id and m.user_id = auth.uid()
  ) then raise exception 'You do not have access to this organisation'; end if;
  if nullif(trim(coalesce(p_organisation_name,'')), '') is null then
    raise exception 'Organisation name is required';
  end if;

  if p_service_id is null then
    insert into public.alfik_lifeline_services (
      organisation_id, organisation_name, summary, countries, regions, species,
      support_types, eligibility, referral_method, website, public_contact,
      capacity_note, verification_status, verified_at, verified_by,
      partner_updated_at, partner_update_needs_review
    ) values (
      p_org_id, left(trim(p_organisation_name),200), left(coalesce(p_summary,''),5000),
      coalesce(p_countries,'{}'), coalesce(p_regions,'{}'), coalesce(p_species,'{}'),
      coalesce(p_support_types,'{}'), left(coalesce(p_eligibility,''),2000),
      left(coalesce(p_referral_method,''),1000), left(coalesce(p_website,''),1000),
      left(coalesce(p_public_contact,''),1000), left(coalesce(p_capacity_note,''),1000),
      'needs_verification', null, null, now(), false
    ) returning id into v_id;
  else
    update public.alfik_lifeline_services s
    set organisation_name = left(trim(p_organisation_name),200),
        summary = left(coalesce(p_summary,''),5000),
        countries = coalesce(p_countries,'{}'),
        regions = coalesce(p_regions,'{}'),
        species = coalesce(p_species,'{}'),
        support_types = coalesce(p_support_types,'{}'),
        eligibility = left(coalesce(p_eligibility,''),2000),
        referral_method = left(coalesce(p_referral_method,''),1000),
        website = left(coalesce(p_website,''),1000),
        public_contact = left(coalesce(p_public_contact,''),1000),
        capacity_note = left(coalesce(p_capacity_note,''),1000),
        partner_updated_at = now(),
        partner_update_needs_review = (s.verification_status = 'verified'),
        verification_status = case when s.verification_status = 'verified' then 'needs_verification' else s.verification_status end,
        verified_at = null,
        verified_by = null,
        updated_at = now()
    where s.id = p_service_id and s.organisation_id = p_org_id
    returning s.id into v_id;
    if v_id is null then raise exception 'Listing not found or it does not belong to this organisation'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.alfik_partner_request_lifeline_claim(
  p_service_id uuid, p_org_id uuid, p_evidence text
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_org_members m where m.org_id = p_org_id and m.user_id = auth.uid()
  ) then raise exception 'You do not have access to this organisation'; end if;
  if not exists (select 1 from public.alfik_lifeline_services s where s.id = p_service_id and s.organisation_id is null) then
    raise exception 'This listing is already linked to an organisation or does not exist';
  end if;
  insert into public.alfik_lifeline_claim_requests(service_id, organisation_id, requested_by, evidence)
  values (p_service_id, p_org_id, auth.uid(), left(coalesce(p_evidence,''),4000))
  on conflict (service_id, organisation_id) do update
    set evidence = excluded.evidence, status = 'pending', admin_notes = '', updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.alfik_partner_list_lifeline_claims(p_org_id uuid)
returns table (
  id uuid, service_id uuid, organisation_id uuid, listing_name text,
  evidence text, status text, admin_notes text, created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_org_members m where m.org_id = p_org_id and m.user_id = auth.uid()
  ) then raise exception 'You do not have access to this organisation'; end if;
  return query
  select c.id, c.service_id, c.organisation_id, s.organisation_name,
         c.evidence, c.status, c.admin_notes, c.created_at
  from public.alfik_lifeline_claim_requests c
  join public.alfik_lifeline_services s on s.id = c.service_id
  where c.organisation_id = p_org_id
  order by c.created_at desc;
end;
$$;

create or replace function public.alfik_admin_list_lifeline_claim_requests()
returns table (
  id uuid, service_id uuid, organisation_id uuid, listing_name text,
  claimant_name text, claimant_type text, evidence text, status text, created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_admin_users a where a.user_id = auth.uid()
  ) then raise exception 'Administrator access required'; end if;
  return query
  select c.id, c.service_id, c.organisation_id, s.organisation_name,
         o.name, o.org_type, c.evidence, c.status, c.created_at
  from public.alfik_lifeline_claim_requests c
  join public.alfik_lifeline_services s on s.id = c.service_id
  join public.alfik_organisations o on o.id = c.organisation_id
  where c.status = 'pending'
  order by c.created_at;
end;
$$;

create or replace function public.alfik_admin_review_lifeline_claim(
  p_claim_id uuid, p_decision text, p_notes text default ''
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_service_id uuid; v_org_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_admin_users a where a.user_id = auth.uid()
  ) then raise exception 'Administrator access required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid claim decision'; end if;

  select c.service_id, c.organisation_id into v_service_id, v_org_id
  from public.alfik_lifeline_claim_requests c
  where c.id = p_claim_id and c.status = 'pending';
  if v_service_id is null then raise exception 'Pending claim request not found'; end if;

  if p_decision = 'approved' then
    update public.alfik_lifeline_services
    set organisation_id = v_org_id, verification_status = 'needs_verification',
        verified_at = null, verified_by = null, updated_at = now()
    where id = v_service_id and organisation_id is null;
    if not found then raise exception 'Listing is no longer available to claim'; end if;
  end if;

  update public.alfik_lifeline_claim_requests
  set status = p_decision, admin_notes = left(coalesce(p_notes,''),2000),
      reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_claim_id;
  return true;
end;
$$;

revoke all on function public.alfik_partner_list_lifeline_services(uuid) from public, anon;
revoke all on function public.alfik_partner_save_lifeline_service(uuid,uuid,text,text,text[],text[],text[],text[],text,text,text,text,text) from public, anon;
revoke all on function public.alfik_partner_request_lifeline_claim(uuid,uuid,text) from public, anon;
revoke all on function public.alfik_partner_list_lifeline_claims(uuid) from public, anon;
revoke all on function public.alfik_admin_list_lifeline_claim_requests() from public, anon;
revoke all on function public.alfik_admin_review_lifeline_claim(uuid,text,text) from public, anon;
grant execute on function public.alfik_partner_list_lifeline_services(uuid) to authenticated;
grant execute on function public.alfik_partner_save_lifeline_service(uuid,uuid,text,text,text[],text[],text[],text[],text,text,text,text,text) to authenticated;
grant execute on function public.alfik_partner_request_lifeline_claim(uuid,uuid,text) to authenticated;
grant execute on function public.alfik_partner_list_lifeline_claims(uuid) to authenticated;
grant execute on function public.alfik_admin_list_lifeline_claim_requests() to authenticated;
grant execute on function public.alfik_admin_review_lifeline_claim(uuid,text,text) to authenticated;

comment on column public.alfik_lifeline_services.organisation_id is
  'ALFIK organisation workspace allowed to manage this Lifeline listing. Only linked organisation members can edit via permission-checked RPCs.';
