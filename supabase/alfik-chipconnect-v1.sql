-- ALFIK ChipConnect v1
-- Secure, consent-controlled microchip lookup for verified veterinary practices.
-- Run this once in the Supabase SQL Editor after reviewing the schema.
-- Full microchip values are never copied into the audit log or notifications.

alter table public.alfik_pets
  add column if not exists chip_lookup_enabled boolean not null default false;

comment on column public.alfik_pets.chip_lookup_enabled is
  'Owner opt-in allowing verified veterinary practices to trigger an ALFIK ChipConnect notification when this pet exact-matches its registered microchip.';

create table if not exists public.alfik_chip_lookup_audit (
  id uuid primary key default gen_random_uuid(),
  searched_by uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.alfik_organisations(id) on delete cascade,
  pet_id uuid references public.alfik_pets(id) on delete set null,
  result text not null check (result in ('match_notified','no_match_or_not_enabled','rate_limited')),
  reason text not null default 'animal_found'
    check (reason in ('animal_found','treatment','routine_identification','other')),
  created_at timestamptz not null default now()
);

create index if not exists alfik_chip_audit_vet_time_idx
  on public.alfik_chip_lookup_audit(searched_by, created_at desc);
create index if not exists alfik_chip_audit_pet_time_idx
  on public.alfik_chip_lookup_audit(pet_id, created_at desc);

alter table public.alfik_chip_lookup_audit enable row level security;

-- Audit records are only written by the protected RPC. No direct table access.
revoke all on public.alfik_chip_lookup_audit from public, anon, authenticated;

create or replace function public.alfik_set_chip_lookup_consent(
  p_pet_id uuid,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_rows integer;
begin
  if v_user is null then
    raise exception 'Please sign in to change microchip lookup consent.';
  end if;
  if p_pet_id is null or p_enabled is null then
    raise exception 'A pet and consent choice are required.';
  end if;

  update public.alfik_pets
     set chip_lookup_enabled = p_enabled
   where id = p_pet_id and owner_id = v_user;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception 'Pet profile not found or not owned by this account.';
  end if;
  return true;
end;
$$;

revoke all on function public.alfik_set_chip_lookup_consent(uuid, boolean) from public, anon;
grant execute on function public.alfik_set_chip_lookup_consent(uuid, boolean) to authenticated;

create or replace function public.alfik_vet_lookup_microchip(
  p_microchip text,
  p_reason text default 'animal_found'
)
returns table(match_found boolean, pet_name text, species text, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org_id uuid;
  v_org_name text;
  v_contact text;
  v_chip text;
  v_pet record;
  v_reason text;
begin
  if v_user is null then
    raise exception 'Please sign in with your verified veterinary account.';
  end if;

  v_chip := regexp_replace(coalesce(p_microchip, ''), '[^0-9]', '', 'g');
  if length(v_chip) < 9 or length(v_chip) > 15 then
    raise exception 'Enter a valid microchip number (9 to 15 digits).';
  end if;

  v_reason := coalesce(p_reason, 'animal_found');
  if v_reason not in ('animal_found','treatment','routine_identification','other') then
    raise exception 'Select a valid reason for the lookup.';
  end if;

  -- Require membership of an organisation that ALFIK has verified as veterinary.
  select o.id, o.name, coalesce(o.contact_details, '')
    into v_org_id, v_org_name, v_contact
  from public.alfik_org_members m
  join public.alfik_organisations o on o.id = m.org_id
  where m.user_id = v_user
    and lower(coalesce(o.org_type, '')) = 'veterinary'
    and lower(coalesce(o.verification_status, '')) = 'verified'
  order by o.name
  limit 1;

  if v_org_id is null then
    raise exception 'ChipConnect lookup is available only to members of an ALFIK-verified veterinary practice.';
  end if;

  -- Conservative rate limit: no more than 10 attempts per user in a rolling hour.
  if (select count(*) from public.alfik_chip_lookup_audit a
      where a.searched_by = v_user
        and a.created_at > now() - interval '1 hour') >= 10 then
    insert into public.alfik_chip_lookup_audit(searched_by, organisation_id, result, reason)
    values (v_user, v_org_id, 'rate_limited', v_reason);
    return query select false, null::text, null::text,
      'Lookup limit reached. Please contact ALFIK support if you need assistance.';
    return;
  end if;

  -- Exact normalized match only. A result is available only where the owner opted in.
  select p.id, p.owner_id, p.name, p.species
    into v_pet
  from public.alfik_pets p
  where p.chip_lookup_enabled = true
    and length(regexp_replace(coalesce(p.microchip, ''), '[^0-9]', '', 'g')) between 9 and 15
    and regexp_replace(coalesce(p.microchip, ''), '[^0-9]', '', 'g') = v_chip
  limit 1;

  if v_pet.id is null then
    insert into public.alfik_chip_lookup_audit(searched_by, organisation_id, result, reason)
    values (v_user, v_org_id, 'no_match_or_not_enabled', v_reason);
    return query select false, null::text, null::text,
      'No ALFIK ChipConnect match was available. Use the appropriate established microchip database as well.';
    return;
  end if;

  insert into public.alfik_in_app_notifications(user_id, title, body)
  values (
    v_pet.owner_id,
    'ALFIK ChipConnect: microchip scanned',
    'A verified veterinary practice (' || coalesce(v_org_name, 'Veterinary practice') ||
    ') has searched ALFIK for your pet''s registered microchip. Reason: ' ||
    case v_reason
      when 'animal_found' then 'animal found'
      when 'treatment' then 'veterinary treatment'
      when 'routine_identification' then 'routine identification'
      else 'other'
    end ||
    '. Practice contact details: ' || coalesce(nullif(trim(v_contact), ''), 'Please contact ALFIK support for practice contact details') ||
    '. Please contact the practice directly. Your personal contact details have not been shared.'
  );

  insert into public.alfik_chip_lookup_audit(searched_by, organisation_id, pet_id, result, reason)
  values (v_user, v_org_id, v_pet.id, 'match_notified', v_reason);

  return query select true, v_pet.name::text, v_pet.species::text,
    'ALFIK match found. The owner has been notified. Do not treat this as proof of ownership; follow your practice procedures.';
end;
$$;

revoke all on function public.alfik_vet_lookup_microchip(text, text) from public, anon;
grant execute on function public.alfik_vet_lookup_microchip(text, text) to authenticated;

comment on table public.alfik_chip_lookup_audit is
  'ChipConnect audit trail. Stores no raw microchip numbers; access is restricted to the protected database function.';
