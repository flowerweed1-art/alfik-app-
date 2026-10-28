-- ALFIK: safely mark an owner's active lost report as found/reunited.
-- Run this complete script in Supabase SQL Editor.
-- This function changes only the caller's own active lost report status.
create or replace function public.alfik_mark_own_report_resolved(p_report_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to update your report.' using errcode = '42501';
  end if;

  update public.animal_reports
  set status = 'resolved'
  where id::text = p_report_id
    and owner_id = auth.uid()
    and report_type = 'lost'
    and status = 'active';

  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

revoke all on function public.alfik_mark_own_report_resolved(text) from public;
grant execute on function public.alfik_mark_own_report_resolved(text) to authenticated;
