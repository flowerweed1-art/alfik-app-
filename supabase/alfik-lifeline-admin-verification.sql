-- ALFIK Lifeline directory admin verification workflow
-- Install in Supabase SQL Editor. This creates an explicit administrator allow-list.
-- IMPORTANT: after running this file, add your own signed-in auth.users UUID to
-- public.alfik_admin_users using the SQL snippet at the bottom before using the admin screen.
-- Do not add ordinary members to the allow-list.

create table if not exists public.alfik_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.alfik_admin_users enable row level security;
revoke all on public.alfik_admin_users from anon, authenticated;
grant select, insert, update, delete on public.alfik_admin_users to service_role;

alter table public.alfik_lifeline_services
  add column if not exists verification_notes text not null default '',
  add column if not exists verification_reviewed_at timestamptz,
  add column if not exists verification_reviewed_by uuid references auth.users(id) on delete set null;

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
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_admin_users a where a.user_id = auth.uid()
  ) then
    raise exception 'Administrator access required';
  end if;

  return query
  select s.id, s.organisation_name, s.summary, s.countries, s.regions,
         s.support_types, s.eligibility, s.referral_method, s.website,
         s.public_contact, s.verification_status, s.verified_at, s.verified_by,
         s.capacity_note, s.verification_notes, s.verification_reviewed_at,
         s.created_at, s.updated_at
  from public.alfik_lifeline_services s
  order by
    case s.verification_status
      when 'needs_verification' then 0
      when 'paused' then 1
      else 2
    end,
    s.organisation_name;
end;
$$;

create or replace function public.alfik_admin_review_lifeline_service(
  p_service_id uuid,
  p_status text,
  p_notes text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_admin_users a where a.user_id = auth.uid()
  ) then
    raise exception 'Administrator access required';
  end if;

  if p_status not in ('verified', 'needs_verification', 'paused') then
    raise exception 'Invalid Lifeline verification status';
  end if;

  update public.alfik_lifeline_services
  set verification_status = p_status,
      verified_at = case when p_status = 'verified' then now() else null end,
      verified_by = case when p_status = 'verified' then auth.uid() else null end,
      verification_notes = left(coalesce(p_notes, ''), 2000),
      verification_reviewed_at = now(),
      verification_reviewed_by = auth.uid(),
      updated_at = now()
  where id = p_service_id;

  if not found then
    raise exception 'Lifeline listing not found';
  end if;
  return true;
end;
$$;

revoke all on function public.alfik_admin_list_lifeline_verification() from public, anon;
revoke all on function public.alfik_admin_review_lifeline_service(uuid, text, text) from public, anon;
grant execute on function public.alfik_admin_list_lifeline_verification() to authenticated;
grant execute on function public.alfik_admin_review_lifeline_service(uuid, text, text) to authenticated;

comment on table public.alfik_admin_users is
  'Explicit ALFIK administrator allow-list. Managed only by trusted database administrators/service role.';

-- ONE-TIME SETUP: replace YOUR_AUTH_USER_UUID with the UUID for your own
-- signed-in ALFIK account from Supabase Authentication > Users, then run:
-- insert into public.alfik_admin_users (user_id)
-- values ('YOUR_AUTH_USER_UUID'::uuid)
-- on conflict (user_id) do nothing;
