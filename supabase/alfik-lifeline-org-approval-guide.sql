-- ALFIK Lifeline organisation request review guide
-- Run the organisation-claims migration first.
-- These statements are for an authorised ALFIK administrator using Supabase SQL Editor.
-- Do not approve a claim until you have independently checked the organisation's identity
-- and authority to manage the listing. Never ask claimants to share passwords or access tokens.

-- 1) Review pending requests:
select id, created_at, request_type, organisation_name, service_id, website,
       public_contact, summary, countries, regions, support_types, eligibility
from public.alfik_lifeline_org_requests
where status = 'pending'
order by created_at asc;

-- 2A) APPROVE a claim for an EXISTING listing.
-- Replace REQUEST_UUID with the request id. Verify the selected service_id first.
-- This links ownership but does not change the service's verification status.
-- Run as one transaction:
-- begin;
-- update public.alfik_lifeline_services s
-- set claimed_by = r.owner_id, updated_at = now()
-- from public.alfik_lifeline_org_requests r
-- where r.id = 'REQUEST_UUID'::uuid
--   and r.request_type = 'claim_existing'
--   and r.status = 'pending'
--   and r.service_id = s.id
--   and (s.claimed_by is null or s.claimed_by = r.owner_id);
-- update public.alfik_lifeline_org_requests
-- set status = 'approved', review_notes = 'Identity and authority checked.',
--     reviewed_at = now(), updated_at = now()
-- where id = 'REQUEST_UUID'::uuid and request_type = 'claim_existing' and status = 'pending';
-- commit;
-- Check the first update affected exactly one row before committing. If not, roll back.

-- 2B) APPROVE a NEW listing request and link its account.
-- Replace REQUEST_UUID with the request id. This creates a listing that remains
-- needs_verification and is NOT visible in the public directory until separately verified.
-- begin;
-- with request as (
--   select * from public.alfik_lifeline_org_requests
--   where id = 'REQUEST_UUID'::uuid and request_type = 'new_listing' and status = 'pending'
-- ), inserted as (
--   insert into public.alfik_lifeline_services
--     (organisation_name, summary, countries, regions, species, support_types, eligibility,
--      referral_method, website, public_contact, verification_status, claimed_by, capacity_note)
--   select organisation_name, summary, countries, regions, species, support_types, eligibility,
--          referral_method, website, public_contact, 'needs_verification', owner_id,
--          'Availability and eligibility must be confirmed directly with the service.'
--   from request
--   returning id
-- )
-- update public.alfik_lifeline_org_requests r
-- set service_id = inserted.id, status = 'approved',
--     review_notes = 'Account approved; directory listing still requires verification.',
--     reviewed_at = now(), updated_at = now()
-- from inserted
-- where r.id = 'REQUEST_UUID'::uuid;
-- commit;

-- 3) Mark a listing verified ONLY after its details and current service operation have been checked:
-- update public.alfik_lifeline_services
-- set verification_status = 'verified', verified_at = now(), verified_by = 'ADMIN_USER_UUID'::uuid, updated_at = now()
-- where id = 'SERVICE_UUID'::uuid;
-- Use the real administrator auth.users UUID for verified_by.

-- 4) If rejecting or requesting more information:
-- update public.alfik_lifeline_org_requests
-- set status = 'rejected', review_notes = 'Reason explained to the applicant.',
--     reviewed_at = now(), updated_at = now()
-- where id = 'REQUEST_UUID'::uuid and status = 'pending';
-- Allowed status values: pending, approved, rejected, more_information.
