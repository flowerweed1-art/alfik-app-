-- ALFIK admin recovery control for test or incorrectly verified rescue organisations
-- Run this migration in Supabase SQL Editor after the existing verification migrations.
begin;

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
    order by o.verification_submitted_at nulls last, o.name;
end;
$$;

create or replace function public.alfik_admin_return_organisation_to_pending(
  p_org_id uuid
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

  update public.alfik_organisations
  set verification_status = 'pending',
      verification_reviewed_at = null,
      verification_reviewed_by = null,
      verification_rejection_reason = null
  where id = p_org_id
    and org_type = 'rescue'
    and verification_status = 'verified';

  if not found then
    raise exception 'No verified rescue organisation was changed. Refresh the queue and check its current status.';
  end if;

  return 'Verification removed. The organisation is now pending review; its evidence files and organisation record were preserved.';
end;
$$;

revoke all on function public.alfik_admin_list_verification_requests() from public;
revoke all on function public.alfik_admin_return_organisation_to_pending(uuid) from public;
grant execute on function public.alfik_admin_list_verification_requests() to authenticated;
grant execute on function public.alfik_admin_return_organisation_to_pending(uuid) to authenticated;

commit;
