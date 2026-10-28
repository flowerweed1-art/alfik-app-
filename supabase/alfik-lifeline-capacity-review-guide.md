# ALFIK Lifeline directory: checking service capacity

The capacity tracking columns are now installed in Supabase.

## Safe operating rule

Only set a capacity status after the organisation has confirmed it. A verified directory listing is not the same as confirmed capacity. The app marks checks older than 30 days as overdue, but even a recent check is not a guarantee of availability.

## Review listings that need a check

Run this in Supabase SQL Editor:

```sql
select id, organisation_name, public_contact, website,
       capacity_status, capacity_checked_at, capacity_checked_by,
       capacity_note
from public.alfik_lifeline_services
where verification_status = 'verified'
order by capacity_checked_at asc nulls first, organisation_name asc;
```

## Record a confirmed update

After contacting an organisation, replace the example UUID and values below with the correct listing and what the organisation actually told ALFIK. Use a role or name for `capacity_checked_by`; do not enter private contact details.

```sql
update public.alfik_lifeline_services
set capacity_status = 'accepting_referrals',
    capacity_checked_at = now(),
    capacity_checked_by = 'ALFIK volunteer',
    capacity_note = 'Confirmed by the service on [date]; ask them to reconfirm before referring.',
    updated_at = now()
where id = 'REPLACE-WITH-SERVICE-UUID';
```

Allowed `capacity_status` values:

- `accepting_referrals`
- `limited_capacity`
- `no_capacity`
- `not_accepting`
- `not_confirmed`

Use the matching status only. Do not mark a service as accepting referrals based on an old website, directory entry, or an unanswered message.

## When a service has not replied

Do not update the check date as if the service confirmed. Leave the last confirmed date unchanged and set the status to `not_confirmed` if the previous status is no longer reliable:

```sql
update public.alfik_lifeline_services
set capacity_status = 'not_confirmed',
    capacity_note = 'Capacity not currently confirmed. Please contact the service directly.',
    updated_at = now()
where id = 'REPLACE-WITH-SERVICE-UUID';
```

This second query deliberately does not change `capacity_checked_at`, so the record does not imply a new confirmation.

## Suggested review routine

1. Contact services and ask whether they are currently accepting referrals, what species/areas they cover, any eligibility rules, and how referrals should be made.
2. Record only the answer received, the date, and the staff/volunteer role that checked it.
3. Recheck important listings at least monthly. The app flags capacity records older than 30 days as overdue.
4. If a service is closed or its details are wrong, update or pause the directory listing through the ALFIK admin process.
5. Never promise a placement, funding, or response time to someone seeking help.
