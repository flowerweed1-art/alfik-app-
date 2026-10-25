-- ALFIK evidence uploads and safe public verified-rescue directory
-- Run after 202610240001_alfik_organisation_verification.sql.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'alfik-verification-evidence',
  'alfik-verification-evidence',
  false,
  5242880,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Rescue members upload verification evidence" on storage.objects;
create policy "Rescue members upload verification evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'alfik-verification-evidence'
  and exists (
    select 1 from public.alfik_org_members m
    where m.user_id = auth.uid()
      and m.org_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "Rescue members and ALFIK admins read verification evidence" on storage.objects;
create policy "Rescue members and ALFIK admins read verification evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'alfik-verification-evidence'
  and (
    exists (
      select 1 from public.alfik_org_members m
      where m.user_id = auth.uid()
        and m.org_id::text = (storage.foldername(name))[1]
    )
    or exists (
      select 1 from public.alfik_admins a
      where a.user_id = auth.uid()
    )
  )
);

create or replace function public.alfik_list_verified_rescues()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name::text
  from public.alfik_organisations o
  where o.org_type = 'rescue'
    and o.verification_status = 'verified'
  order by o.name;
$$;

revoke all on function public.alfik_list_verified_rescues() from public;
grant execute on function public.alfik_list_verified_rescues() to anon, authenticated;

commit;
