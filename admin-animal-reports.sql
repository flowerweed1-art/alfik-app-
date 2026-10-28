-- ALFIK admin lost-and-found report management
-- Run this complete script in Supabase SQL Editor.
-- Only the ALFIK owner account below is authorised by these functions.
-- Update the allowlist deliberately if you later appoint additional admins.

create or replace function public.alfik_admin_list_animal_reports()
returns setof public.animal_reports
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    auth.uid() = 'a1669d1a-b6f9-47af-b5d2-196eb26aa2a8'::uuid
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'flowerweed1@gmail.com'
  ) then
    raise exception 'Not authorised to manage animal reports' using errcode = '42501';
  end if;
  return query select * from public.animal_reports order by created_at desc nulls last;
end;
$$;

create or replace function public.alfik_admin_delete_animal_report(p_report_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if not (
    auth.uid() = 'a1669d1a-b6f9-47af-b5d2-196eb26aa2a8'::uuid
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'flowerweed1@gmail.com'
  ) then
    raise exception 'Not authorised to manage animal reports' using errcode = '42501';
  end if;
  delete from public.animal_reports where id::text = p_report_id;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke all on function public.alfik_admin_list_animal_reports() from public;
revoke all on function public.alfik_admin_delete_animal_report(text) from public;
grant execute on function public.alfik_admin_list_animal_reports() to authenticated;
grant execute on function public.alfik_admin_delete_animal_report(text) to authenticated;
