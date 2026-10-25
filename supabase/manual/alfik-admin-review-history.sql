-- ALFIK admin queues and completed review history
-- Run once in Supabase SQL Editor. Completed decisions stay available in history.
begin;

create or replace function public.alfik_admin_list_verification_requests()
returns table (id uuid, name text, org_type text, contact_details text, verification_status text, verification_details text, verification_submitted_at timestamptz, verification_rejection_reason text)
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
begin
 if auth.uid() is null or not exists (select 1 from public.alfik_admins a where a.user_id=auth.uid()) then raise exception 'Administrator access required.'; end if;
 return query select o.id,o.name::text,o.org_type::text,o.contact_details::text,coalesce(o.verification_status,'unverified')::text,o.verification_details::text,o.verification_submitted_at,o.verification_rejection_reason::text
 from public.alfik_organisations o where o.org_type='rescue' and coalesce(o.verification_status,'unverified') in ('pending','unverified')
 order by o.verification_submitted_at nulls last,o.name;
end; $$;

create or replace function public.alfik_admin_list_verification_history()
returns table (id uuid,name text,org_type text,contact_details text,verification_status text,verification_details text,verification_submitted_at timestamptz,verification_rejection_reason text,verification_reviewed_at timestamptz)
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
begin
 if auth.uid() is null or not exists (select 1 from public.alfik_admins a where a.user_id=auth.uid()) then raise exception 'Administrator access required.'; end if;
 return query select o.id,o.name::text,o.org_type::text,o.contact_details::text,coalesce(o.verification_status,'unverified')::text,o.verification_details::text,o.verification_submitted_at,o.verification_rejection_reason::text,o.verification_reviewed_at
 from public.alfik_organisations o where o.org_type='rescue' and o.verification_status in ('verified','rejected')
 order by o.verification_reviewed_at desc nulls last,o.name;
end; $$;

create or replace function public.alfik_admin_list_member_safety_reports()
returns jsonb language plpgsql stable security definer set search_path = public, auth, pg_temp
as $$
declare v_reports jsonb;
begin
 if auth.uid() is null or not exists (select 1 from public.alfik_admins a where a.user_id=auth.uid()) then raise exception 'ALFIK administrator access required.'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) into v_reports
 from (select id,reporter_id,reported_user_id,conversation_id,reason,details,status,created_at from public.alfik_user_reports where status in ('pending','reviewing') order by created_at desc limit 500) q;
 return v_reports;
end; $$;

create or replace function public.alfik_admin_list_member_safety_report_history()
returns jsonb language plpgsql stable security definer set search_path = public, auth, pg_temp
as $$
declare v_reports jsonb;
begin
 if auth.uid() is null or not exists (select 1 from public.alfik_admins a where a.user_id=auth.uid()) then raise exception 'ALFIK administrator access required.'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.reviewed_at desc nulls last,q.created_at desc),'[]'::jsonb) into v_reports
 from (select id,reporter_id,reported_user_id,conversation_id,reason,details,status,created_at,reviewed_at from public.alfik_user_reports where status in ('actioned','dismissed') order by reviewed_at desc nulls last,created_at desc limit 500) q;
 return v_reports;
end; $$;

revoke all on function public.alfik_admin_list_verification_requests() from public,anon;
revoke all on function public.alfik_admin_list_verification_history() from public,anon;
revoke all on function public.alfik_admin_list_member_safety_reports() from public,anon;
revoke all on function public.alfik_admin_list_member_safety_report_history() from public,anon;
grant execute on function public.alfik_admin_list_verification_requests() to authenticated;
grant execute on function public.alfik_admin_list_verification_history() to authenticated;
grant execute on function public.alfik_admin_list_member_safety_reports() to authenticated;
grant execute on function public.alfik_admin_list_member_safety_report_history() to authenticated;
commit;
