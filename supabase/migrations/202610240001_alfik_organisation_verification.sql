-- ALFIK organisation verification workflow
-- Run this migration in Supabase SQL Editor before using the new verification screens.
begin;

alter table public.alfik_organisations
  add column if not exists verification_details text,
  add column if not exists verification_submitted_at timestamptz,
  add column if not exists verification_reviewed_at timestamptz,
  add column if not exists verification_reviewed_by uuid references auth.users(id),
  add column if not exists verification_rejection_reason text;

create table if not exists public.alfik_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.alfik_admins enable row level security;
revoke all on public.alfik_admins from anon, authenticated;
grant select on public.alfik_admins to authenticated;
drop policy if exists "Users can view their own ALFIK admin status" on public.alfik_admins;
create policy "Users can view their own ALFIK admin status"
  on public.alfik_admins for select to authenticated
  using (user_id = auth.uid());

create or replace function public.alfik_submit_organisation_verification(
  p_org_id uuid,
  p_details text
) returns text
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in to submit verification details.';
  end if;
  if p_details is null or length(trim(p_details)) < 20 then
    raise exception 'Please provide at least 20 characters describing the organisation and evidence of its work.';
  end if;
  if length(p_details) > 4000 then
    raise exception 'Verification details must be 4000 characters or fewer.';
  end if;
  if not exists (
    select 1 from public.alfik_org_members m
    where m.org_id = p_org_id and m.user_id = auth.uid()
  ) then
    raise exception 'You must be a member of this organisation to submit verification.';
  end if;

  update public.alfik_organisations
  set verification_status = 'pending',
      verification_details = trim(p_details),
      verification_submitted_at = now(),
      verification_reviewed_at = null,
      verification_reviewed_by = null,
      verification_rejection_reason = null
  where id = p_org_id
    and org_type = 'rescue';

  if not found then
    raise exception 'Rescue organisation not found.';
  end if;
  return 'Verification details submitted. Status: Pending review.';
end;
$$;

create or replace function public.alfik_admin_list_verification_requests()
returns table (
  id uuid,
  name text,
  org_type text,
  contact_details text,
  verification_status text,
  verification_details text,
  verification_submitted_at timestamptz,
  verification_rejection_reason text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Administrator access required.';
  end if;

  return query
    select o.id, o.name::text, o.org_type::text, o.contact_details::text,
           coalesce(o.verification_status, 'unverified')::text,
           o.verification_details::text, o.verification_submitted_at,
           o.verification_rejection_reason::text
    from public.alfik_organisations o
    where o.org_type = 'rescue'
      and coalesce(o.verification_status, 'unverified') in ('pending','unverified','rejected')
    order by o.verification_submitted_at nulls last, o.name;
end;
$$;

create or replace function public.alfik_admin_review_organisation(
  p_org_id uuid,
  p_decision text,
  p_reason text default null
) returns text
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.alfik_admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Administrator access required.';
  end if;
  if p_decision not in ('verified','rejected') then
    raise exception 'Decision must be verified or rejected.';
  end if;
  if p_decision = 'rejected' and coalesce(length(trim(p_reason)),0) < 5 then
    raise exception 'Please provide a rejection reason of at least 5 characters.';
  end if;

  update public.alfik_organisations
  set verification_status = p_decision,
      verification_reviewed_at = now(),
      verification_reviewed_by = auth.uid(),
      verification_rejection_reason = case when p_decision = 'rejected' then trim(p_reason) else null end
  where id = p_org_id and org_type = 'rescue';

  if not found then
    raise exception 'Rescue organisation not found.';
  end if;
  return 'Organisation status updated to ' || p_decision || '.';
end;
$$;

revoke all on function public.alfik_submit_organisation_verification(uuid,text) from public;
revoke all on function public.alfik_admin_list_verification_requests() from public;
revoke all on function public.alfik_admin_review_organisation(uuid,text,text) from public;
grant execute on function public.alfik_submit_organisation_verification(uuid,text) to authenticated;
grant execute on function public.alfik_admin_list_verification_requests() to authenticated;
grant execute on function public.alfik_admin_review_organisation(uuid,text,text) to authenticated;

commit;
