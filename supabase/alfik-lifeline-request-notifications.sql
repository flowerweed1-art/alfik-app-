-- ALFIK Lifeline verification requests and administrator in-app alerts
-- Run after supabase/alfik-lifeline-partner-listings.sql.
-- Existing imported listings are deliberately NOT treated as verification requests.

alter table public.alfik_lifeline_services
  add column if not exists verification_requested boolean not null default false;

-- Make the existing imported backlog safe: none of these rows counts as a request.
update public.alfik_lifeline_services
set verification_requested = false
where organisation_id is null;

-- Only show listings explicitly submitted by a partner in the admin verification queue.
create or replace function public.alfik_admin_list_lifeline_verification()
returns table (
  id uuid,
  organisation_name text,
  summary text,
  countries text[],
  regions text[],
  support_types text[],
  eligibility text,
  referral_method text,
  website text,
  public_contact text,
  verification_status text,
  verified_at timestamptz,
  verified_by uuid,
  capacity_note text,
  verification_notes text,
  verification_reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_admin_users a where a.user_id = auth.uid()
  ) then raise exception 'Administrator access required'; end if;

  return query
  select s.id, s.organisation_name, s.summary, s.countries, s.regions,
         s.support_types, s.eligibility, s.referral_method, s.website,
         s.public_contact, s.verification_status, s.verified_at, s.verified_by,
         s.capacity_note, s.verification_notes, s.verification_reviewed_at,
         s.created_at, s.updated_at
  from public.alfik_lifeline_services s
  where s.verification_requested = true
    and s.verification_status <> 'verified'
  order by s.created_at, s.organisation_name;
end;
$$;

-- A submitted listing is explicitly marked as needing review.
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
      partner_updated_at, partner_update_needs_review, verification_requested
    ) values (
      p_org_id, left(trim(p_organisation_name),200), left(coalesce(p_summary,''),5000),
      coalesce(p_countries,'{}'), coalesce(p_regions,'{}'), coalesce(p_species,'{}'),
      coalesce(p_support_types,'{}'), left(coalesce(p_eligibility,''),2000),
      left(coalesce(p_referral_method,''),1000), left(coalesce(p_website,''),1000),
      left(coalesce(p_public_contact,''),1000), left(coalesce(p_capacity_note,''),1000),
      'needs_verification', null, null, now(), false, true
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
        verification_requested = true,
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

-- Verification and pause decisions close the request; "needs verification" keeps it in the queue.
create or replace function public.alfik_admin_review_lifeline_service(
  p_service_id uuid,
  p_status text,
  p_notes text default ''
)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_admin_users a where a.user_id = auth.uid()
  ) then raise exception 'Administrator access required'; end if;
  if p_status not in ('verified', 'needs_verification', 'paused') then
    raise exception 'Invalid Lifeline verification status';
  end if;

  update public.alfik_lifeline_services
  set verification_status = p_status,
      verification_requested = case when p_status in ('verified','paused') then false else true end,
      verified_at = case when p_status = 'verified' then now() else null end,
      verified_by = case when p_status = 'verified' then auth.uid() else null end,
      verification_notes = left(coalesce(p_notes, ''), 2000),
      verification_reviewed_at = now(),
      verification_reviewed_by = auth.uid(),
      updated_at = now()
  where id = p_service_id and verification_requested = true;

  if not found then raise exception 'Listing not found or no verification request is pending'; end if;
  return true;
end;
$$;

-- Send admin in-app notifications for partner-created listings and explicit verification requests.
create or replace function public.alfik_notify_lifeline_admins()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare a record;
begin
  if TG_OP = 'INSERT' and new.organisation_id is not null then
    for a in select user_id from public.alfik_admin_users loop
      insert into public.alfik_in_app_notifications(user_id, title, body)
      values (a.user_id, 'New Lifeline listing added',
        coalesce(new.organisation_name,'A rescue') || ' added a Lifeline listing. It is hidden from the public until ALFIK approves it.');
    end loop;
  end if;

  if new.verification_requested = true
     and (TG_OP = 'INSERT' or coalesce(old.verification_requested,false) = false) then
    for a in select user_id from public.alfik_admin_users loop
      insert into public.alfik_in_app_notifications(user_id, title, body)
      values (a.user_id, 'Lifeline verification requested',
        coalesce(new.organisation_name,'A Lifeline listing') || ' has been submitted for verification. Open Admin Tools > Lifeline verification to review it.');
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists alfik_lifeline_admin_notifications on public.alfik_lifeline_services;
create trigger alfik_lifeline_admin_notifications
after insert or update of verification_requested on public.alfik_lifeline_services
for each row execute function public.alfik_notify_lifeline_admins();

revoke all on function public.alfik_notify_lifeline_admins() from public, anon, authenticated;
grant execute on function public.alfik_admin_list_lifeline_verification() to authenticated;
grant execute on function public.alfik_admin_review_lifeline_service(uuid,text,text) to authenticated;
