# ALFIK

Animal Lost, Found, Information Keeper

## Mission

ALFIK is a UK-wide pet reunification, rescue management and animal welfare platform.

The goal is to reunite lost animals with their owners faster while providing tools for pet owners, rescue organisations and veterinary practices.

## Core Features

- Lost pet reporting
- Found pet reporting
- Search system
- Secure messaging
- SOS alerts
- Rescue management
- Veterinary integration
- Pet healthcare records
- GDPR-compliant privacy controls

## Status

🚧 Early Development

## ALFIK Lifeline (MVP)

The Lifeline feature adds:
- Private, owner-controlled animal safety plans.
- Private crisis/help requests for illness, housing insecurity, domestic abuse, financial hardship, bereavement and temporary care needs.
- A personal referral tracker with outcomes and next steps.
- A directory that displays only listings explicitly marked verified by ALFIK.
- Row-level security so a signed-in member can access only their own plans, cases and referrals.

### One-time Supabase setup

1. Open the ALFIK Supabase project and go to **SQL Editor**.
2. Open `supabase/alfik-lifeline-mvp.sql` in this repository.
3. Copy the complete SQL into a new Supabase query and run it once.
4. Reload `https://alfik.co.uk`, sign in, then open **🛟 ALFIK Lifeline**.

The app code is deployed through the repository's normal GitHub Pages workflow. The SQL migration must be run separately in Supabase; a GitHub commit cannot execute database changes.

### Verified directory governance

The service directory intentionally starts empty. ALFIK must verify each organisation's current eligibility, geographic coverage, supported species, referral route and contact details before an entry is marked `verified`. Directory changes are currently managed by an authorised operator in Supabase SQL Editor; a public-facing service submission or admin UI is not enabled yet.

### Safeguarding and scope

- Lifeline is not an emergency response service and does not automatically contact organisations.
- The first version stores requests privately for the account holder and lets them track referrals themselves.
- Do not enter details that could endanger a person, passwords, or exact confidential refuge/safe-house locations.
- No unvetted person can offer or arrange animal placement through this feature.
- Do not promise funding, a foster place, or immediate service capacity.
- Before partner organisations can access or coordinate cases, ALFIK needs explicit partner agreements, role-based access, retention rules, safeguarding processes and a privacy impact assessment.
