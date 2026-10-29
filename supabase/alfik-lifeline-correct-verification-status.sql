-- ALFIK Lifeline: correct verification status of imported listings
-- The user confirms that only Animals Lost and Found in Kent Ltd has actually been verified.
-- Keep all other listings out of the public verified directory until individually checked.
-- Do not create verification requests for imported listings: admins should only review explicit requests.

update public.alfik_lifeline_services
set verification_status = 'needs_verification',
    verified_at = null,
    verified_by = null,
    verification_requested = false,
    updated_at = now()
where lower(trim(organisation_name)) <> lower('Animals Lost and found in Kent Ltd');

-- Preserve the single explicitly verified ALFIK listing.
update public.alfik_lifeline_services
set verification_status = 'verified',
    verified_at = coalesce(verified_at, now()),
    verification_requested = false,
    updated_at = now()
where lower(trim(organisation_name)) = lower('Animals Lost and found in Kent Ltd');

-- Review the final status counts and the verified listings.
select verification_status, count(*) as listing_count
from public.alfik_lifeline_services
group by verification_status
order by verification_status;

select organisation_name, verification_status, verified_at
from public.alfik_lifeline_services
where verification_status = 'verified'
order by organisation_name;
