-- ALFIK Lifeline: capacity tracking for service directory
-- Run once in Supabase SQL Editor. Existing listings remain unconfirmed until checked.

alter table public.alfik_lifeline_services
  add column if not exists capacity_status text not null default 'not_confirmed',
  add column if not exists capacity_checked_at timestamptz,
  add column if not exists capacity_checked_by text;

alter table public.alfik_lifeline_services
  drop constraint if exists lifeline_service_capacity_status_check;

alter table public.alfik_lifeline_services
  add constraint lifeline_service_capacity_status_check
  check (capacity_status in (
    'accepting_referrals',
    'limited_capacity',
    'no_capacity',
    'not_accepting',
    'not_confirmed'
  ));

comment on column public.alfik_lifeline_services.capacity_status is
  'Latest manually recorded referral capacity. This is not a live availability feed.';
comment on column public.alfik_lifeline_services.capacity_checked_at is
  'Date/time the organisation last confirmed its referral capacity.';
comment on column public.alfik_lifeline_services.capacity_checked_by is
  'Name or role of the person who confirmed capacity; do not store private contact details.';

-- Existing listings deliberately default to not_confirmed.
-- Only record accepting_referrals after the organisation has confirmed it.
