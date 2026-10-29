-- ALFIK Lifeline: allow the signed-in directory to show verified and unverified services.
-- Unverified listings are labelled clearly in the interface. Paused listings remain hidden.
-- The app requires sign-in before the Lifeline directory is available.

drop policy if exists "Anyone signed in can view verified Lifeline services"
  on public.alfik_lifeline_services;

drop policy if exists "Signed-in users can view active Lifeline directory listings"
  on public.alfik_lifeline_services;

create policy "Signed-in users can view active Lifeline directory listings"
  on public.alfik_lifeline_services
  for select
  to authenticated
  using (verification_status in ('verified', 'needs_verification'));

grant select on public.alfik_lifeline_services to authenticated;
