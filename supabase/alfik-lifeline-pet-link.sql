-- ALFIK Lifeline: link private help requests to a member's own pet profile.
-- Run once AFTER alfik-lifeline-mvp.sql in Supabase SQL Editor.
alter table public.alfik_lifeline_cases
  add column if not exists pet_id uuid
  references public.alfik_pets(id) on delete set null;

create index if not exists lifeline_cases_pet_owner_idx
  on public.alfik_lifeline_cases(owner_id, pet_id, updated_at desc);

drop policy if exists "Owners manage their Lifeline cases" on public.alfik_lifeline_cases;
create policy "Owners manage their Lifeline cases" on public.alfik_lifeline_cases
  for all to authenticated
  using (
    owner_id = auth.uid()
    and (
      pet_id is null
      or exists (
        select 1 from public.alfik_pets p
        where p.id = public.alfik_lifeline_cases.pet_id
          and p.owner_id = auth.uid()
      )
    )
  )
  with check (
    owner_id = auth.uid()
    and (
      pet_id is null
      or exists (
        select 1 from public.alfik_pets p
        where p.id = public.alfik_lifeline_cases.pet_id
          and p.owner_id = auth.uid()
      )
    )
  );

comment on column public.alfik_lifeline_cases.pet_id is
  'Optional link to the owner’s own ALFIK pet profile; null for unlinked requests.';
