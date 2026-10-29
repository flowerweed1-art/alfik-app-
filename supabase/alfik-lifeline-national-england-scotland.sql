-- ALFIK Lifeline national directory consolidation: England + Scotland
-- Prepared 29 October 2026.
-- Run only after supabase/alfik-lifeline-mvp.sql.
-- Includes the existing Kent directory and England waves 1-6 plus Scotland listings.
-- Every imported insert checks for an existing organisation name to avoid duplicates.
-- The directory is a signposting resource, not an emergency-response guarantee.
-- Confirm eligibility, coverage, contact details and capacity directly before referral.


-- ===== Imported from supabase/alfik-lifeline-kent-directory.sql =====
-- ALFIK Lifeline: initial Kent support directory
-- Run in Supabase SQL Editor after alfik-lifeline-mvp.sql.
-- These are directory candidates approved by ALFIK for its Kent launch.
-- Listings do not promise current spaces, funding, eligibility or response times.
-- Ask each service directly to confirm availability before making a referral.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'verified', now(), v.capacity_note
from (values
  ('Raystede Centre for Animal Welfare',
   'Break Away temporary fostering service for animals when an owner faces a crisis such as domestic abuse or hospitalisation.',
   array['United Kingdom','England'], array['Kent','East Sussex','West Sussex'],
   array['Dogs','Cats','Small animals','Other'], array['Temporary fostering','Domestic abuse','Hospitalisation','Crisis support','Referral'],
   'Service criteria and current coverage must be confirmed directly.',
   'Contact Raystede through its official Break Away service page.',
   'https://www.raystede.org/adopt/break-away/',
   '01825 880468; rehoming@raystede.org',
   'Availability and foster-carer capacity must be confirmed directly with the service.'),
  ('Cats Protection Lifeline',
   'Free, confidential temporary fostering for cats belonging to people fleeing domestic abuse.',
   array['United Kingdom','England'], array['Kent','South East England'],
   array['Cats'], array['Temporary fostering','Domestic abuse','Crisis support'],
   'For people fleeing domestic abuse; confirm referral route and eligibility.',
   'Contact the South East Lifeline team using the official access page.',
   'https://www.cats.org.uk/what-we-do/cp-lifeline/accessing-lifeline',
   '0345 260 1280; lifelinesoutheast@cats.org.uk',
   'Confidential fostering is subject to eligibility and available foster capacity.'),
  ('Dogs Trust Freedom Project',
   'Free, confidential temporary fostering for dogs when owners are escaping domestic abuse.',
   array['United Kingdom','England'], array['Kent','South East England','Home Counties'],
   array['Dogs'], array['Temporary fostering','Domestic abuse','Crisis support'],
   'For people fleeing domestic abuse; check geographic coverage and referral criteria.',
   'Contact the Freedom Project through its official website.',
   'https://www.dogstrustfreedom.org.uk/',
   '0800 298 9199',
   'Foster placements are subject to eligibility and current capacity.'),
  ('RSPCA Ashford & District',
   'Local animal welfare support including an emergency pet-food service for eligible local owners.',
   array['United Kingdom','England'], array['Ashford','Kent'],
   array['Dogs','Cats'], array['Pet food','Welfare advice','Referral'],
   'Food support is subject to local eligibility criteria; check current requirements.',
   'Use the branch pet food bank information page.',
   'https://www.rspca-ashforddistrict.org.uk/pet-food-bank/',
   'Contact details and collection arrangements: see official website.',
   'Food parcels depend on eligibility and donated stock.'),
  ('Animal FoodBank UK',
   'Pet-food assistance network that may help owners facing short-term financial difficulty.',
   array['United Kingdom','England','Scotland','Wales'], array['Kent','England','Scotland','Wales'],
   array['Dogs','Cats','Other'], array['Pet food','Crisis support','Referral'],
   'Coverage, eligibility and local volunteer availability must be checked.',
   'Apply through the official request-for-help page.',
   'https://www.animalfoodbankuk.com/apply-for-help/',
   'admin@animalfoodbankuk.com',
   'Assistance depends on local coverage, eligibility and available stock.'),
  ('RSPCA Kent North West Branch',
   'Local branch support may include veterinary assistance, neutering and microchipping for eligible owners.',
   array['United Kingdom','England'], array['Dartford','Gravesend','Swanley','North West Kent'],
   array['Dogs','Cats','Other'], array['Veterinary costs','Neutering','Microchipping','Welfare advice'],
   'Branch catchment and financial-assistance criteria apply; contact the branch first.',
   'Contact the branch directly.',
   'https://www.rspca-kentnorthwest.org.uk/',
   '01322 286720; info@rspca-kentnorthwest.org.uk',
   'Financial support and appointments are subject to branch criteria and available funds.'),
  ('RSPCA Kent West Branch',
   'Local animal welfare support including possible veterinary aid and neutering assistance.',
   array['United Kingdom','England'], array['West Kent','Sevenoaks','Tonbridge'],
   array['Dogs','Cats','Other'], array['Veterinary costs','Neutering','Welfare advice','Referral'],
   'Geographic limits and eligibility criteria apply; confirm before referral.',
   'Contact the branch using its official branch page.',
   'https://www.rspca.org.uk/local/kent-west-branch/aboutus',
   '07410 538902; veterinary aid/neutering: 07939 318353',
   'Aid depends on eligibility, branch area and available funds.'),
  ('RSPCA Tunbridge Wells & Maidstone Branch',
   'Local welfare support with possible veterinary financial assistance, neutering and microchipping campaigns.',
   array['United Kingdom','England'], array['Tunbridge Wells','Maidstone','Mid Kent'],
   array['Dogs','Cats','Other'], array['Veterinary costs','Neutering','Microchipping','Welfare advice'],
   'Confirm the branch catchment and current support criteria.',
   'Contact the branch directly.',
   'https://www.rspca.org.uk/local/tunbridge-wells-and-maidstone-branch/aboutus',
   '01622 891222',
   'Assistance is subject to eligibility and available funds.'),
  ('RSPCA Kent-Folkestone & District Branch',
   'Local animal welfare advice and possible veterinary aid, consultations and neutering assistance.',
   array['United Kingdom','England'], array['Folkestone','East Kent'],
   array['Dogs','Cats','Wildlife','Other'], array['Veterinary costs','Neutering','Welfare advice','Wildlife advice'],
   'Confirm eligibility, service availability and branch boundaries.',
   'Contact the branch using its official contact page.',
   'https://www.rspca.org.uk/local/aboutus/contactus/-/rspca/kent-folkestone-and-district-branch',
   'Welfare: 07936 911613; veterinary aid: 01303 248501',
   'Financial assistance and treatment options must be confirmed directly.'),
  ('Lord Whisky Sanctuary Fund',
   'Low-income veterinary clinics intended to improve access to veterinary treatment.',
   array['United Kingdom','England'], array['Kent','South East England'],
   array['Dogs','Cats','Other'], array['Veterinary costs','Low-income veterinary care','Welfare advice'],
   'Confirm current clinic locations, fees and eligibility with the organisation.',
   'Contact the organisation through its official website.',
   'https://lordwhisky.co.uk/',
   '01303 862622',
   'Clinic access and treatment availability must be confirmed directly.'),
  ('Misfits Rescue Kent',
   'Volunteer-run, foster-based rescue offering animal welfare advice and lost-and-found support; may help signpost to other rescues.',
   array['United Kingdom','England'], array['Swale','Kent'],
   array['Cats','Dogs','Rabbits','Other'], array['Rescue referral','Welfare advice','Lost and found','Microchip scanning'],
   'Rescue intake and support depend on species, circumstances and capacity.',
   'Contact through the official website.',
   'https://www.misfitsrescuekent.co.uk/',
   'Contact via official website',
   'Not an emergency placement guarantee; confirm capacity before referral.'),
  ('Anim-Mates',
   'North West Kent animal sanctuary and rescue; supports multiple species and has a feral-cat neutering programme.',
   array['United Kingdom','England'], array['North West Kent','Medway'],
   array['Cats','Dogs','Rabbits','Other'], array['Rescue referral','Feral cat support','Neutering','Welfare advice'],
   'Check species accepted, catchment and referral criteria directly.',
   'Contact through the official website.',
   'https://www.anim-mates.org.uk/',
   'info@anim-mates.org.uk',
   'Intake and practical help depend on current capacity.'),
  ('Cats Protection Kent Cat Centre',
   'Cat welfare, rescue and rehoming contact; the wider network may signpost owners to local cat support.',
   array['United Kingdom','England'], array['Kent','Hartlip','Sittingbourne'],
   array['Cats'], array['Rescue referral','Cat welfare advice','Rehoming','Neutering advice'],
   'Ask about the appropriate local branch and the specific help available.',
   'Contact Cats Protection through its official website.',
   'https://www.cats.org.uk/',
   '01634 232471',
   'Branch services and intake capacity vary; confirm directly.'),
  ('Battersea Brands Hatch',
   'Dog and cat rescue, rehabilitation and rehoming; potential referral contact where an owner can no longer care for an animal.',
   array['United Kingdom','England'], array['Brands Hatch','Kent','South East England'],
   array['Dogs','Cats'], array['Rescue referral','Rehoming','Welfare advice'],
   'Not a general emergency fostering or financial-aid service; confirm whether it can assist.',
   'Contact the centre through its official visitor and contact information.',
   'https://www.battersea.org.uk/about-us/visit-us/visit-battersea-brands-hatch',
   '01474 874994',
   'Intake and rehoming decisions depend on assessment and capacity.'),
  ('Foal Farm Animal Rescue Centre',
   'Animal rescue, sanctuary and rehoming service for cats, dogs and other animals.',
   array['United Kingdom','England'], array['Biggin Hill','Kent','South East England'],
   array['Dogs','Cats','Other'], array['Rescue referral','Rehoming','Welfare advice'],
   'Confirm species accepted, catchment and whether the organisation can take a referral.',
   'Contact through the official website.',
   'https://www.foalfarm.org.uk/',
   '01959 572386',
   'Rescue intake depends on assessment and available capacity.'),
  ('The Cinnamon Trust',
   'UK-wide volunteer support for older or terminally ill people and their pets, including dog walking, vet transport and possible temporary fostering.',
   array['United Kingdom','England','Scotland','Wales','Northern Ireland'], array['Kent','United Kingdom'],
   array['Dogs','Cats','Other'], array['Dog walking','Veterinary transport','Temporary fostering','Older owners','Illness support'],
   'Generally for people aged 65 or over or who are terminally ill; confirm current eligibility.',
   'Contact the Trust through its official support page.',
   'https://cinnamon.org.uk/support-for-you-and-your-pet/',
   '01736 757900',
   'Volunteer availability and the type of help offered vary by area.')
) as v(organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, capacity_note)
where not exists (
  select 1 from public.alfik_lifeline_services existing
  where lower(existing.organisation_name) = lower(v.organisation_name)
);

-- Refresh existing matching entries with the Kent launch details and visible status,
-- without creating duplicates. This also makes rerunning the script safe.
update public.alfik_lifeline_services s
set summary=v.summary, countries=v.countries, regions=v.regions, species=v.species,
    support_types=v.support_types, eligibility=v.eligibility, referral_method=v.referral_method,
    website=v.website, public_contact=v.public_contact,
    verification_status='verified', verified_at=now(),
    capacity_note=v.capacity_note, updated_at=now()
from (values
  ('Raystede Centre for Animal Welfare','Break Away temporary fostering service for animals when an owner faces a crisis such as domestic abuse or hospitalisation.',array['United Kingdom','England']::text[],array['Kent','East Sussex','West Sussex']::text[],array['Dogs','Cats','Small animals','Other']::text[],array['Temporary fostering','Domestic abuse','Hospitalisation','Crisis support','Referral']::text[],'Service criteria and current coverage must be confirmed directly.','Contact Raystede through its official Break Away service page.','https://www.raystede.org/adopt/break-away/','01825 880468; rehoming@raystede.org','Availability and foster-carer capacity must be confirmed directly with the service.'),
  ('Cats Protection Lifeline','Free, confidential temporary fostering for cats belonging to people fleeing domestic abuse.',array['United Kingdom','England']::text[],array['Kent','South East England']::text[],array['Cats']::text[],array['Temporary fostering','Domestic abuse','Crisis support']::text[],'For people fleeing domestic abuse; confirm referral route and eligibility.','Contact the South East Lifeline team using the official access page.','https://www.cats.org.uk/what-we-do/cp-lifeline/accessing-lifeline','0345 260 1280; lifelinesoutheast@cats.org.uk','Confidential fostering is subject to eligibility and available foster capacity.'),
  ('Dogs Trust Freedom Project','Free, confidential temporary fostering for dogs when owners are escaping domestic abuse.',array['United Kingdom','England']::text[],array['Kent','South East England','Home Counties']::text[],array['Dogs']::text[],array['Temporary fostering','Domestic abuse','Crisis support']::text[],'For people fleeing domestic abuse; check geographic coverage and referral criteria.','Contact the Freedom Project through its official website.','https://www.dogstrustfreedom.org.uk/','0800 298 9199','Foster placements are subject to eligibility and current capacity.'),
  ('RSPCA Ashford & District','Local animal welfare support including an emergency pet-food service for eligible local owners.',array['United Kingdom','England']::text[],array['Ashford','Kent']::text[],array['Dogs','Cats']::text[],array['Pet food','Welfare advice','Referral']::text[],'Food support is subject to local eligibility criteria; check current requirements.','Use the branch pet food bank information page.','https://www.rspca-ashforddistrict.org.uk/pet-food-bank/','Contact details and collection arrangements: see official website.','Food parcels depend on eligibility and donated stock.'),
  ('Animal FoodBank UK','Pet-food assistance network that may help owners facing short-term financial difficulty.',array['United Kingdom','England','Scotland','Wales']::text[],array['Kent','England','Scotland','Wales']::text[],array['Dogs','Cats','Other']::text[],array['Pet food','Crisis support','Referral']::text[],'Coverage, eligibility and local volunteer availability must be checked.','Apply through the official request-for-help page.','https://www.animalfoodbankuk.com/apply-for-help/','admin@animalfoodbankuk.com','Assistance depends on local coverage, eligibility and available stock.'),
  ('RSPCA Kent North West Branch','Local branch support may include veterinary assistance, neutering and microchipping for eligible owners.',array['United Kingdom','England']::text[],array['Dartford','Gravesend','Swanley','North West Kent']::text[],array['Dogs','Cats','Other']::text[],array['Veterinary costs','Neutering','Microchipping','Welfare advice']::text[],'Branch catchment and financial-assistance criteria apply; contact the branch first.','Contact the branch directly.','https://www.rspca-kentnorthwest.org.uk/','01322 286720; info@rspca-kentnorthwest.org.uk','Financial support and appointments are subject to branch criteria and available funds.'),
  ('RSPCA Kent West Branch','Local animal welfare support including possible veterinary aid and neutering assistance.',array['United Kingdom','England']::text[],array['West Kent','Sevenoaks','Tonbridge']::text[],array['Dogs','Cats','Other']::text[],array['Veterinary costs','Neutering','Welfare advice','Referral']::text[],'Geographic limits and eligibility criteria apply; confirm before referral.','Contact the branch using its official branch page.','https://www.rspca.org.uk/local/kent-west-branch/aboutus','07410 538902; veterinary aid/neutering: 07939 318353','Aid depends on eligibility, branch area and available funds.'),
  ('RSPCA Tunbridge Wells & Maidstone Branch','Local welfare support with possible veterinary financial assistance, neutering and microchipping campaigns.',array['United Kingdom','England']::text[],array['Tunbridge Wells','Maidstone','Mid Kent']::text[],array['Dogs','Cats','Other']::text[],array['Veterinary costs','Neutering','Microchipping','Welfare advice']::text[],'Confirm the branch catchment and current support criteria.','Contact the branch directly.','https://www.rspca.org.uk/local/tunbridge-wells-and-maidstone-branch/aboutus','01622 891222','Assistance is subject to eligibility and available funds.'),
  ('RSPCA Kent-Folkestone & District Branch','Local animal welfare advice and possible veterinary aid, consultations and neutering assistance.',array['United Kingdom','England']::text[],array['Folkestone','East Kent']::text[],array['Dogs','Cats','Wildlife','Other']::text[],array['Veterinary costs','Neutering','Welfare advice','Wildlife advice']::text[],'Confirm eligibility, service availability and branch boundaries.','Contact the branch using its official contact page.','https://www.rspca.org.uk/local/aboutus/contactus/-/rspca/kent-folkestone-and-district-branch','Welfare: 07936 911613; veterinary aid: 01303 248501','Financial assistance and treatment options must be confirmed directly.'),
  ('Lord Whisky Sanctuary Fund','Low-income veterinary clinics intended to improve access to veterinary treatment.',array['United Kingdom','England']::text[],array['Kent','South East England']::text[],array['Dogs','Cats','Other']::text[],array['Veterinary costs','Low-income veterinary care','Welfare advice']::text[],'Confirm current clinic locations, fees and eligibility with the organisation.','Contact the organisation through its official website.','https://lordwhisky.co.uk/','01303 862622','Clinic access and treatment availability must be confirmed directly.'),
  ('Misfits Rescue Kent','Volunteer-run, foster-based rescue offering animal welfare advice and lost-and-found support; may help signpost to other rescues.',array['United Kingdom','England']::text[],array['Swale','Kent']::text[],array['Cats','Dogs','Rabbits','Other']::text[],array['Rescue referral','Welfare advice','Lost and found','Microchip scanning']::text[],'Rescue intake and support depend on species, circumstances and capacity.','Contact through the official website.','https://www.misfitsrescuekent.co.uk/','Contact via official website','Not an emergency placement guarantee; confirm capacity before referral.'),
  ('Anim-Mates','North West Kent animal sanctuary and rescue; supports multiple species and has a feral-cat neutering programme.',array['United Kingdom','England']::text[],array['North West Kent','Medway']::text[],array['Cats','Dogs','Rabbits','Other']::text[],array['Rescue referral','Feral cat support','Neutering','Welfare advice']::text[],'Check species accepted, catchment and referral criteria directly.','Contact through the official website.','https://www.anim-mates.org.uk/','info@anim-mates.org.uk','Intake and practical help depend on current capacity.'),
  ('Cats Protection Kent Cat Centre','Cat welfare, rescue and rehoming contact; the wider network may signpost owners to local cat support.',array['United Kingdom','England']::text[],array['Kent','Hartlip','Sittingbourne']::text[],array['Cats']::text[],array['Rescue referral','Cat welfare advice','Rehoming','Neutering advice']::text[],'Ask about the appropriate local branch and the specific help available.','Contact Cats Protection through its official website.','https://www.cats.org.uk/','01634 232471','Branch services and intake capacity vary; confirm directly.'),
  ('Battersea Brands Hatch','Dog and cat rescue, rehabilitation and rehoming; potential referral contact where an owner can no longer care for an animal.',array['United Kingdom','England']::text[],array['Brands Hatch','Kent','South East England']::text[],array['Dogs','Cats']::text[],array['Rescue referral','Rehoming','Welfare advice']::text[],'Not a general emergency fostering or financial-aid service; confirm whether it can assist.','Contact the centre through its official visitor and contact information.','https://www.battersea.org.uk/about-us/visit-us/visit-battersea-brands-hatch','01474 874994','Intake and rehoming decisions depend on assessment and capacity.'),
  ('Foal Farm Animal Rescue Centre','Animal rescue, sanctuary and rehoming service for cats, dogs and other animals.',array['United Kingdom','England']::text[],array['Biggin Hill','Kent','South East England']::text[],array['Dogs','Cats','Other']::text[],array['Rescue referral','Rehoming','Welfare advice']::text[],'Confirm species accepted, catchment and whether the organisation can take a referral.','Contact through the official website.','https://www.foalfarm.org.uk/','01959 572386','Rescue intake depends on assessment and available capacity.'),
  ('The Cinnamon Trust','UK-wide volunteer support for older or terminally ill people and their pets, including dog walking, vet transport and possible temporary fostering.',array['United Kingdom','England','Scotland','Wales','Northern Ireland']::text[],array['Kent','United Kingdom']::text[],array['Dogs','Cats','Other']::text[],array['Dog walking','Veterinary transport','Temporary fostering','Older owners','Illness support']::text[],'Generally for people aged 65 or over or who are terminally ill; confirm current eligibility.','Contact the Trust through its official support page.','https://cinnamon.org.uk/support-for-you-and-your-pet/','01736 757900','Volunteer availability and the type of help offered vary by area.')
) as v(organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, capacity_note)
where lower(s.organisation_name)=lower(v.organisation_name);



-- ===== Imported from supabase/alfik-lifeline-england-wave-1.sql =====
-- ALFIK Lifeline: England expansion wave 1 (South East and national services)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- These entries are based on the organisations' published service information.
-- Eligibility, geographic catchment and capacity must always be confirmed directly.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'needs_verification', null, v.capacity_note
from (values
  ('RSPCA Surrey East Branch',
   'Local support for pet owners including veterinary financial assistance for eligible residents and pet food bank links through local partners.',
   array['United Kingdom','England']::text[], array['Surrey','East Surrey']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Pet food','Welfare advice','Pet bereavement']::text[],
   'Veterinary aid is limited to the branch catchment and eligibility criteria, including qualifying benefits and income limits. Check the official postcode checker.',
   'Read the support page and use the official postcode/eligibility guidance before applying.',
   'https://rspcasurreyeast.org.uk/supporting-you/',
   'Contact details and application route are on the official website.',
   'Financial assistance must be agreed before treatment begins. Food support depends on local partner availability.'),
  ('Treat Me Kind',
   'Sussex-based animal welfare charity working with food banks, veterinary practices and community organisations to help with emergency pet food and essential supplies.',
   array['United Kingdom','England']::text[], array['Sussex','East Sussex','West Sussex']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Veterinary costs','Crisis support','Professional referral']::text[],
   'Emergency food referrals are normally made by a support worker, food bank or another trusted professional. Ask the charity about current coverage.',
   'Owners can contact the charity for signposting; professionals can use the official referral route.',
   'https://treatmekind.org.uk/how-emergency-pet-food-referral-works/',
   'Contact through the official website.',
   'Support depends on referral route, local partners and current resources.'),
  ('Sussex Search & Rescue for Lost Dogs Pet Food Bank',
   'Community pet food bank in Sussex for owners who are struggling to feed their established pets; may also have pet items available.',
   array['United Kingdom','England']::text[], array['Sussex','East Sussex','West Sussex']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Crisis support']::text[],
   'Contact the volunteer team to check whether they can help at your postcode and what information is required.',
   'Use the official pet food bank contact page or email the team.',
   'https://www.sussexsarforlostdogs.org.uk/pet-food-bank',
   'petfoodbank@sussexsarforlostdogs.org.uk; 07525 636456',
   'Donated stock and volunteer availability vary; contact them before travelling.'),
  ('Pets in Need Herts CIC',
   'Hertfordshire community service providing pet food and care packages for people facing hardship, including older people, people with disabilities and people experiencing homelessness.',
   array['United Kingdom','England']::text[], array['Hertfordshire','Herts']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Crisis support','Referral']::text[],
   'Check current service area and application requirements with the organisation.',
   'Apply or enquire through the official website.',
   'https://pinherts.org.uk/',
   'info@pinherts.org.uk; 07867 236138',
   'Support is subject to local reach, eligibility and donated supplies.'),
  ('Mayhew Pet Refuge',
   'Temporary shelter or foster care for pets whose owners are experiencing a short-term crisis, such as hospitalisation.',
   array['United Kingdom','England']::text[], array['London','Greater London','Within the M25']::text[],
   array['Dogs','Cats','Other']::text[], array['Temporary fostering','Crisis support','Hospitalisation','Temporary animal care']::text[],
   'Currently aimed at people living within the M25. Additional housing-related criteria may apply; contact the service directly.',
   'Contact the Pet Refuge team using the official service page.',
   'https://themayhew.org/how-we-help/in-our-home/pet-refuge/',
   '020 8962 8000',
   'Temporary care is subject to assessment, suitability and available places.'),
  ('Waltham Forest Pet Food Bank',
   'Council-listed community pet food bank offering short-term pet food help and some pet accessories to eligible local residents.',
   array['United Kingdom','England']::text[], array['Waltham Forest','London','Greater London']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Neutering advice','Pet care advice']::text[],
   'For Waltham Forest residents; check the council page for current locations, sessions and criteria.',
   'Use the council information page or contact the volunteer-run food bank.',
   'https://www.walthamforest.gov.uk/health-and-wellbeing/support-and-community-services-your-area/waltham-forest-pet-food-bank',
   'lbwfpetfoodbank@gmail.com',
   'Volunteer-run sessions and donated stock can change; confirm before visiting.'),
  ('Dogs Trust Hope Project',
   'Veterinary support pathway for dogs belonging to people experiencing homelessness or housing crisis, delivered through participating practices and support organisations.',
   array['United Kingdom','England']::text[], array['England','London','National participating locations']::text[],
   array['Dogs']::text[], array['Veterinary costs','Homelessness','Housing crisis','Veterinary advice']::text[],
   'For dog owners experiencing homelessness or housing crisis. Local access is through participating veterinary practices and partner organisations.',
   'Visit the official Dogs Trust website and ask a homelessness service or participating vet about local access.',
   'https://www.dogstrust.org.uk/how-we-help/hope-project',
   'Contact route and eligibility details are on the official website.',
   'Availability depends on participating local providers and the scheme criteria.'),
  ('PDSA',
   'Charity veterinary care for eligible pet owners who receive qualifying benefits and live within the catchment of a PDSA Pet Hospital or practice.',
   array['United Kingdom','England']::text[], array['England','Nationwide where eligible services operate']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Low-cost veterinary care','Veterinary advice']::text[],
   'Eligibility depends on benefits, postcode, local PDSA provision and the type of treatment required. Check the official eligibility checker.',
   'Use the official eligibility checker or contact PDSA before arranging treatment.',
   'https://www.pdsa.org.uk/pet-help-and-advice/eligibility',
   '0800 731 2502',
   'Not every postcode or treatment is covered; confirm eligibility and appointment availability.'),
  ('Blue Cross',
   'Animal charity providing veterinary support and advice in selected areas, plus pet food support and practical help through some local services.',
   array['United Kingdom','England']::text[], array['England','Selected local areas']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Pet food','Welfare advice','Rehoming advice']::text[],
   'Services vary by location and may have financial, postcode or clinical eligibility criteria. Check the relevant local service page.',
   'Use the official website to find the relevant service and check eligibility.',
   'https://www.bluecross.org.uk/',
   '0300 790 9903',
   'Only selected locations provide particular services; check local coverage and current availability.')
) as v(organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, capacity_note)
where not exists (
  select 1 from public.alfik_lifeline_services s
  where lower(s.organisation_name)=lower(v.organisation_name)
);



-- ===== Imported from supabase/alfik-lifeline-england-wave-2.sql =====
-- ALFIK Lifeline: England expansion wave 2 (Essex, Berkshire, Hampshire, Oxfordshire)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- Listings are based on published organisation information. Eligibility and capacity must be confirmed directly.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'needs_verification', null, v.capacity_note
from (values
  ('RSPCA Essex South, Southend & District Branch',
   'Local animal welfare charity offering limited financial assistance for veterinary consultations or pet food, cat neutering support, advice and rehoming.',
   array['United Kingdom','England']::text[], array['Southend','South Essex','SS0-SS12']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Pet food','Neutering','Welfare advice','Rehoming']::text[],
   'Branch catchment is limited to postcodes SS0 through SS12. Financial assistance and neutering support have separate criteria.',
   'Use the official branch website to check eligibility and submit the relevant application.',
   'https://www.rspca.org.uk/local/essex-south-southend-and-district-branch/aboutus',
   'admin@rspcaessexsouth.org.uk',
   'Financial assistance is limited and subject to assessment; confirm current support before arranging treatment.'),
  ('SPSAS Pet Bank Essex',
   'Community pet bank project providing pet food and essential supplies for local owners facing difficulty.',
   array['United Kingdom','England']::text[], array['Essex']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Crisis support']::text[],
   'Contact the team to confirm the area served, referral or collection arrangements and any eligibility criteria.',
   'Email the pet bank team using the published contact address.',
   'https://spsas.co.uk/spsas-pet-bank',
   'essexpetbank@spsas.co.uk',
   'Volunteer-led support depends on donations and current stock; arrange help before travelling.'),
  ('SPSAS Pet Bank Bracknell',
   'Community pet bank project providing pet food and essentials for local pet owners experiencing hardship.',
   array['United Kingdom','England']::text[], array['Bracknell','Berkshire']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Crisis support']::text[],
   'Contact the team to confirm local coverage and current collection arrangements.',
   'Email the Bracknell pet bank team.',
   'https://spsas.co.uk/spsas-pet-bank',
   'bracknellpetbank@spsas.co.uk',
   'Volunteer-led support depends on donated supplies and current availability.'),
  ('RSPCA Oxfordshire Branch',
   'Local branch offering animal welfare advice, cat neutering and limited veterinary financial aid for eligible Oxfordshire residents.',
   array['United Kingdom','England']::text[], array['Oxfordshire','Oxford','Abingdon']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Neutering','Microchipping','Welfare advice','Rehoming']::text[],
   'Veterinary financial aid and neutering support are for Oxfordshire residents and non-urgent needs; criteria apply.',
   'Contact the branch using its official website or published email and telephone details.',
   'https://www.rspca.org.uk/local/oxfordshire-branch/aboutus/contactus',
   '07887 475401; welfare@rspcaoxford.org.uk',
   'Limited local resources; the branch prioritises animals rescued from cruelty and neglect.'),
  ('Banbury Pet Bank',
   'Local pet food bank providing emergency pet food support for families struggling to feed their animals.',
   array['United Kingdom','England']::text[], array['Banbury','Oxfordshire','North Oxfordshire']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Crisis support']::text[],
   'Ask the service about its current self-referral process, opening times and collection arrangements.',
   'Use the contact details or self-referral form published by Good Food Oxfordshire.',
   'https://gfo.org.uk/get-involved/our-network/',
   'thepetbankbanbury@gmail.com; 07446 895478',
   'Opening times and stock may change; confirm before travelling.'),
  ('Next Chapter Animal Rescue',
   'Rescue and rehabilitation charity covering Surrey, Hampshire and Berkshire; also lists discounted neutering, microchipping and vaccination assistance.',
   array['United Kingdom','England']::text[], array['Surrey','Hampshire','Berkshire']::text[],
   array['Dogs','Cats','Rabbits','Other']::text[], array['Rescue referral','Rehoming','Neutering','Microchipping','Vaccination assistance','Fostering']::text[],
   'Coverage and assistance depend on circumstances and available resources. Ask directly whether owner-support help is available.',
   'Contact the rescue through its official website.',
   'https://nextchapteranimalrescue.org.uk/',
   '07763 356338',
   'Do not assume emergency temporary fostering is available for an owner crisis; confirm the service and capacity first.'),
  ('Helping Dogs and Cats UK',
   'Volunteer-run rescue based in Hampshire, supporting dogs, cats and small animals through rescue, rehabilitation, foster care and rehoming.',
   array['United Kingdom','England']::text[], array['Hampshire','Basingstoke','Berkshire','Surrey']::text[],
   array['Dogs','Cats','Rabbits','Other']::text[], array['Rescue referral','Fostering','Rehoming','Veterinary care','Microchipping','Neutering']::text[],
   'Contact the rescue to establish whether it can assist with the specific situation; rescue intake is not the same as an owner crisis-fostering scheme.',
   'Enquire through the official website or email the organisation.',
   'https://helpingdogsandcatsuk.org/',
   'enquiries@helpingdogsandcatsuk.org; 01256 593373',
   'Volunteer capacity and intake depend on available foster homes and case assessment.'),
  ('RSPCA East Berkshire Branch',
   'Local animal welfare branch supporting cat and dog rehoming and foster care.',
   array['United Kingdom','England']::text[], array['East Berkshire','Berkshire']::text[],
   array['Dogs','Cats']::text[], array['Rescue referral','Fostering','Rehoming','Welfare advice']::text[],
   'Contact the branch to confirm its catchment and whether it can help with the circumstances described.',
   'Use the official branch website contact information.',
   'https://www.rspca-eastberkshire.org.uk/',
   '07852 481079',
   'Small branch relying on foster homes; owner-crisis support and available capacity must be confirmed.')
) as v(organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, capacity_note)
where not exists (
  select 1 from public.alfik_lifeline_services s
  where lower(s.organisation_name)=lower(v.organisation_name)
);



-- ===== Imported from supabase/alfik-lifeline-england-wave-3.sql =====
-- ALFIK Lifeline: England expansion wave 3 (Gloucestershire, East Midlands and specialist fostering)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- Service areas, eligibility and capacity must be confirmed directly before referring anyone.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'needs_verification', null, v.capacity_note
from (values
  ('RSPCA Cotswolds, Gloucester & District Branch',
   'Local animal welfare charity serving Gloucestershire, with a low-cost veterinary clinic, financial assistance, pet food bank and a pet retreat scheme for people fleeing domestic violence.',
   array['United Kingdom','England']::text[], array['Gloucestershire','Gloucester','Cotswolds']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Low-cost veterinary care','Pet food','Domestic abuse fostering','Neutering','Microchipping']::text[],
   'Local branch catchment and eligibility rules apply, especially for veterinary financial aid. Contact the branch to check whether the service fits the case.',
   'Use the official branch website or contact the branch directly.',
   'https://www.rspca.org.uk/local/cotswolds-gloucester-and-district-branch',
   '01453 890014; reception@cdch.org.uk',
   'Veterinary aid and pet retreat places depend on assessment, catchment and capacity.'),
  ('RSPCA Cheltenham & East Gloucestershire Branch',
   'Local branch offering veterinary financial aid through a voucher scheme for eligible owners, plus neutering support and rehoming services.',
   array['United Kingdom','England']::text[], array['Cheltenham','East Gloucestershire','Gloucestershire']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Neutering','Rescue referral','Rehoming']::text[],
   'Financial assistance may be available to people receiving certain benefits within the branch area. Ask the branch for current criteria.',
   'Contact the branch by phone or email before arranging treatment.',
   'https://www.rspca.org.uk/local/cheltenham-and-east-gloucestershire-branch/aboutus/contactus',
   '01242 521958; rspcachelt@gmail.com',
   'Aid is limited and must be agreed with the branch; do not assume a voucher will be approved.'),
  ('Juno Women’s Aid Pet Foster Project',
   'Confidential pet fostering support for women fleeing domestic abuse, helping them seek safety without having to leave their pet behind.',
   array['United Kingdom','England']::text[], array['Nottinghamshire','Derbyshire','Lincolnshire']::text[],
   array['Dogs','Cats','Other']::text[], array['Domestic abuse fostering','Temporary fostering','Crisis support']::text[],
   'Coverage is Nottinghamshire and parts of Derbyshire and Lincolnshire. Contact the service safely and ask about current eligibility.',
   'Try the specialist project mobile numbers first; if unavailable, contact the 24-hour Juno Women’s Aid helpline.',
   'https://junowomensaid.org.uk/pet-foster-project/',
   '07971 337264; 07587 773572; 24-hour helpline 0808 800 0340',
   'Confidential placements are subject to assessment and foster availability. Only use a safe contact method chosen by the person.'),
  ('Endeavour Pet Fostering',
   'Specialist confidential fostering to help people and their pets leave domestic abuse safely, with temporary care for cats and small pets.',
   array['United Kingdom','England']::text[], array['Cheshire','Cumbria','Greater Manchester','Lancashire','Merseyside','Derbyshire']::text[],
   array['Cats','Rabbits','Other']::text[], array['Domestic abuse fostering','Temporary fostering','Crisis support']::text[],
   'Service coverage is limited to the listed North West areas and Derbyshire. Contact the organisation to check the current catchment and species accepted.',
   'Contact the specialist pet fostering team using the official website or published email.',
   'https://endeavourproject.org.uk/',
   '01204 394842; petfostering@endeavourproject.org.uk',
   'Confidential placements depend on assessment and foster capacity. Do not leave messages unless the person says it is safe.'),
  ('Refuge4Pets',
   'Specialist animal fostering service for people experiencing domestic abuse, supporting a wide range of pets and covering associated care such as food and veterinary costs.',
   array['United Kingdom','England']::text[], array['Devon','Cornwall','South West England']::text[],
   array['Dogs','Cats','Rabbits','Birds','Other','Exotics','Livestock']::text[], array['Domestic abuse fostering','Temporary fostering','Veterinary costs','Pet food','Crisis support']::text[],
   'Published coverage is Devon and Cornwall. Contact the service to check eligibility and whether the animal type can be supported.',
   'Contact Refuge4Pets through the official website or phone number.',
   'https://refuge4pets.org.uk/',
   '0300 4000 121; info@refuge4pets.org.uk',
   'Specialist fostering is confidential and subject to assessment and capacity. Use a safe contact route.'),
  ('RSPCA East Norfolk Branch',
   'Local animal welfare branch that may be able to signpost residents to practical help, rehoming and welfare support.',
   array['United Kingdom','England']::text[], array['East Norfolk','Norfolk','Norwich']::text[],
   array['Dogs','Cats','Other']::text[], array['Welfare advice','Rescue referral','Rehoming','Neutering advice']::text[],
   'Check the branch catchment and current services directly; branch services differ across the RSPCA network.',
   'Use the official RSPCA branch directory to find current contact and service details.',
   'https://www.rspca.org.uk/local',
   'Contact details are provided by the official branch directory.',
   'This is a signposting entry, not a promise of emergency intake or financial assistance. Confirm the correct local branch before referral.')
) as v(organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, capacity_note)
where not exists (
  select 1 from public.alfik_lifeline_services s
  where lower(s.organisation_name)=lower(v.organisation_name)
);



-- ===== Imported from supabase/alfik-lifeline-england-wave-4.sql =====
-- ALFIK Lifeline: England expansion wave 4 (Yorkshire, North West and national food-bank locators)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- Contact services before travel: food and volunteer capacity can change quickly.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'needs_verification', null, v.capacity_note
from (values
  ('The Yorkshire Rescue Pet Food Bank',
   'Pet food bank offering short-term pet food and essential items such as coats, leads, collars, towels and bedding to help owners keep their pets during hardship.',
   array['United Kingdom','England']::text[], array['North Yorkshire','West Yorkshire','North and West Yorkshire']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Crisis support']::text[],
   'The service covers areas of North and West Yorkshire. The organisation says it cannot supply food to people who took on a new pet while already struggling financially. Photo ID is required at collection.',
   'Contact the rescue in advance to arrange a collection or delivery point.',
   'https://www.yorkshirerescue.org/food-bank',
   '07512 025180; hello@yorkshirerescue.org',
   'Normally limited to around one week of food at a time; donations and volunteer delivery capacity determine availability.'),
  ('Joey’s Legacy Pet Food Bank',
   'Pet food bank serving Liverpool and surrounding areas, with possible help for pet-care items such as flea and worm treatments, bedding, collars and leads.',
   array['United Kingdom','England']::text[], array['Liverpool','Merseyside','North West England']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Crisis support']::text[],
   'Owners can contact the service directly and do not need to receive benefits. Collection is from Netherton, Liverpool; the service does not deliver food.',
   'Complete the pet food bank request form on the official website.',
   'https://www.joeyslegacyrescue.com/joey-s-pet-food-bank',
   'Contact through the online request form.',
   'The team will try to help but cannot guarantee stock or specific food types.'),
  ('Woodlands Animal Sanctuary Pet Food Bank',
   'Community pet food bank supporting individuals and families experiencing financial hardship, with collection hubs in Chorley, Skelmersdale and Southport.',
   array['United Kingdom','England']::text[], array['Lancashire','Chorley','Skelmersdale','Southport','West Lancashire','Merseyside']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Crisis support']::text[],
   'Contact the sanctuary or use the booking form to check which community hub serves you and how to arrange collection.',
   'Use the official pet food bank page to pre-book a collection or check hub opening details.',
   'https://www.woodlandsanimalsanctuary.org.uk/petfoodbank/',
   'Contact through the official website.',
   'Collections depend on donated stock; the organisation cannot guarantee supplies at every visit.'),
  ('The Pet Food Project',
   'Community interest company supporting food banks and animal shelters with pet food distribution around Wirral and Liverpool.',
   array['United Kingdom','England']::text[], array['Wirral','Liverpool','Merseyside']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Food-bank partnership','Crisis support']::text[],
   'The project works through local food banks, shelters and community partners. Ask which local partner can provide assistance to an owner.',
   'Contact the project through its official website for local food-bank partner information.',
   'https://petfoodproject.org/about-us/',
   'Contact through the official website.',
   'This organisation primarily supplies partner services; direct-to-owner help may depend on local partner arrangements.'),
  ('Blue Cross Pet Food Bank Finder',
   'National finder for Blue Cross pet food banks and partner food banks. Current listed England locations include Devon, Manchester, Oxfordshire, Worcestershire and Yorkshire, with partner locations elsewhere.',
   array['United Kingdom','England','Wales']::text[], array['England','Devon','Greater Manchester','Oxfordshire','Worcestershire','Yorkshire','Wales']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Food-bank locator']::text[],
   'Availability and access requirements differ by location. Blue Cross advises people to phone a site before visiting to confirm stock.',
   'Use the official finder map to identify the nearest Blue Cross or partner food bank.',
   'https://www.bluecross.org.uk/help-and-support/our-pet-food-banks',
   'Contact the relevant local site through the finder.',
   'The locator includes partner organisations; not every location is operated directly by Blue Cross.'),
  ('RSPCA Pet Food Bank Finder',
   'National finder for RSPCA centres, branches and partner food banks offering pet food, supplies and advice in communities across England and Wales.',
   array['United Kingdom','England','Wales']::text[], array['England','Wales','Local partner areas']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Pet supplies','Welfare advice','Food-bank locator']::text[],
   'Each local food bank or partner may have its own collection arrangements and criteria. If no listing appears nearby, RSPCA advises contacting a local food bank, council or branch.',
   'Enter a location in the official interactive finder to identify a nearby support point.',
   'https://www.rspca.org.uk/adviceandwelfare/costofliving/foodbank',
   'Contact the local partner shown in the finder.',
   'The national map changes as partners join; confirm stock, hours and eligibility with the local provider.')
) as v(organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, capacity_note)
where not exists (
  select 1 from public.alfik_lifeline_services s
  where lower(s.organisation_name)=lower(v.organisation_name)
);



-- ===== Imported from supabase/alfik-lifeline-england-wave-5.sql =====
-- ALFIK Lifeline: England expansion wave 5 (Lincolnshire and York)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- Service eligibility and current capacity must be checked directly before referring anyone.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'needs_verification', null, v.capacity_note
from (values
  ('RSPCA Lincolnshire East Branch',
   'Local animal welfare branch offering limited one-off veterinary welfare vouchers for eligible applicants, alongside animal welfare and rehoming work.',
   array['United Kingdom','England']::text[], array['Lincolnshire','East Lincolnshire','Spalding']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Welfare advice','Rescue referral','Rehoming']::text[],
   'Applications are assessed individually. The branch has a small budget and cannot guarantee financial assistance.',
   'Contact the branch directly before arranging treatment.',
   'https://rspca-lincseast.org.uk/veterinary-assistance/',
   '07967 565367; trish@rspca-lincseast.org.uk',
   'Published branch information describes a limited voucher scheme; assistance is not guaranteed and must be agreed in advance.'),
  ('RSPCA Lincolnshire Mid, North East & Lincoln Branch',
   'Local branch welfare voucher scheme offering limited one-off help with eligible veterinary costs, paid directly to a veterinary practice.',
   array['United Kingdom','England']::text[], array['Lincolnshire','Lincoln','North East Lincolnshire']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Neutering','Welfare advice']::text[],
   'The branch postcode map determines eligibility; the branch states it does not cover PE or NG postcodes. Applications are limited by available funds.',
   'Use the official welfare voucher page and postcode map to check eligibility and apply.',
   'https://www.rspca-lincoln.org.uk/welfare-assistance-voucher-scheme/',
   'Contact through the official branch website.',
   'The scheme has a small budget; approval is not guaranteed.'),
  ('RSPCA Lincolnshire North & Humber Branch',
   'Local animal welfare branch offering pet welfare advice, rehoming support and limited veterinary financial aid in its catchment area.',
   array['United Kingdom','England']::text[], array['North Lincolnshire','Humber','Scunthorpe','Brigg']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Welfare advice','Neutering','Microchipping','Rescue referral']::text[],
   'Branch catchment and service criteria apply. Contact the branch to check whether the postcode and circumstances are eligible.',
   'Contact the branch during its published opening hours before arranging treatment.',
   'https://www.rspca.org.uk/local/aboutus/contactus/-/rspca/lincolnshire-north-and-humber-branch',
   '01724 843620; rspcadavina@aol.com',
   'Financial aid is limited and local branch services can change; confirm availability directly.'),
  ('Keep Your Pet (York)',
   'Free volunteer-supported help for older or vulnerable people in the greater York area, including dog walking, visits to feed pets, vet transport, collecting pet food or medication and temporary fostering for dogs.',
   array['United Kingdom','England']::text[], array['York','Greater York','North Yorkshire']::text[],
   array['Dogs','Cats','Other']::text[], array['Temporary fostering','Dog walking','Veterinary transport','Pet food','Medication collection','Crisis support','Advice and signposting']::text[],
   'Designed for older or vulnerable people in the greater York area. The service is not an emergency service and encourages owners to plan ahead.',
   'Register or enquire through the official Keep Your Pet website.',
   'https://keepyourpet.co.uk/register-a-pet/',
   'Contact through the official website.',
   'Volunteer availability varies. Owners are generally expected to cover pet food, equipment and veterinary treatment costs.'),
  ('The Cinnamon Trust',
   'UK-wide volunteer support for older people and people who are terminally ill, including dog walking, practical pet care and short-term fostering during hospital stays.',
   array['United Kingdom','England','Wales']::text[], array['England','Wales','United Kingdom']::text[],
   array['Dogs','Cats','Other']::text[], array['Temporary fostering','Hospitalisation','Dog walking','Pet care','Older owners','Terminal illness support']::text[],
   'Intended for people aged 65 or over and people who are terminally ill. Registration and assessment apply.',
   'Register or contact the Trust through its official support website.',
   'https://cinnamon.org.uk/support-for-you-and-your-pet/temporary-pet-care/',
   '01736 757900',
   'Support depends on registered status, circumstances and available volunteers; plan ahead where possible.'),
  ('Dogs Trust Hope Project',
   'Support pathway for dogs belonging to people experiencing homelessness or housing crisis, including veterinary support through participating practices and partner organisations.',
   array['United Kingdom','England']::text[], array['England','Participating local areas']::text[],
   array['Dogs']::text[], array['Veterinary costs','Homelessness','Housing crisis','Veterinary advice']::text[],
   'For dog owners experiencing homelessness or housing crisis. Access depends on local participating providers and scheme criteria.',
   'Use the official Dogs Trust website or ask a homelessness support worker or veterinary practice about local access.',
   'https://www.dogstrust.org.uk/how-we-help/hope-project',
   'Contact route and eligibility details are on the official website.',
   'Not every area has a participating provider; confirm local availability and eligibility before relying on support.')
) as v(organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, capacity_note)
where not exists (
  select 1 from public.alfik_lifeline_services s
  where lower(s.organisation_name)=lower(v.organisation_name)
);



-- ===== Imported from supabase/alfik-lifeline-england-wave-6.sql =====
-- ALFIK Lifeline: England expansion wave 6 (East Midlands and West Midlands)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- Confirm local eligibility and current capacity with each service before referring anyone.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'needs_verification', null, v.capacity_note
from (values
  ('Jerry Green Dog Rescue Community Support',
   'Community support for dog owners facing hardship, including free donated essentials such as dog food, leads, collars, beds and crates, with limited discretionary veterinary help in rare cases.',
   array['United Kingdom','England']::text[], array['North Lincolnshire','South Lincolnshire','Nottinghamshire','East Yorkshire']::text[],
   array['Dogs']::text[], array['Pet food','Pet supplies','Veterinary costs','Crisis support','Rehoming advice']::text[],
   'Community services cover the listed areas. Support is intended to help dogs stay with their owners where possible; veterinary assistance is limited and discretionary.',
   'Contact the community support team through the official website.',
   'https://www.jerrygreendogs.org.uk/get-support/community-support/',
   'Contact through the official website.',
   'Supplies depend on donations. Veterinary assistance is not a routine entitlement and is decided case by case.'),
  ('RSPCA Nottinghamshire East Branch',
   'Local RSPCA branch covering eastern Nottinghamshire, with a financial assistance checker and limited veterinary financial aid and neutering support for eligible local residents.',
   array['United Kingdom','England']::text[], array['Eastern Nottinghamshire','Retford','Newark','Ollerton','Southwell']::text[],
   array['Dogs','Cats','Other']::text[], array['Veterinary costs','Neutering','Welfare advice','Rescue referral','Rehoming']::text[],
   'Applicants must live within the branch boundary and receive a qualifying form of income support for financial assistance. Check the postcode boundary and current criteria.',
   'Contact the branch using its official website and financial assistance checker.',
   'https://www.rspca.org.uk/local/nottinghamshire-east-branch/aboutus',
   '07554 026934; info@rspcanottseast.org.uk',
   'Aid is limited to the branch area and available resources; contact the branch before arranging treatment.'),
  ('Eastwood Volunteer Bureau & Food Bank',
   'Community food bank in Eastwood, Nottinghamshire. Household parcels may include pet food where supplies allow.',
   array['United Kingdom','England']::text[], array['Eastwood','Nottinghamshire','Broxtowe']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Food-bank referral','Crisis support']::text[],
   'A confidential assessment and the food bank’s eligibility criteria apply. Ask whether pet food is available when arranging support.',
   'Call or visit the Bureau during published assessment hours to arrange an assessment.',
   'https://www.eastwoodvb.org.uk/food-bank/',
   '01773 535255',
   'Pet food is not guaranteed in every parcel and the service operates specific opening hours; confirm before visiting.'),
  ('Dogs Trust Freedom Project',
   'Free, confidential temporary fostering for dogs belonging to people escaping domestic abuse, with foster care and associated dog expenses covered by the service.',
   array['United Kingdom','England','Scotland','Wales']::text[], array['Greater London','Home Counties','East Anglia','Yorkshire','North of England','England']::text[],
   array['Dogs']::text[], array['Domestic abuse fostering','Temporary fostering','Crisis support','Veterinary costs','Pet food']::text[],
   'For dog owners who need to leave an abusive situation and cannot safely take their dog. Service coverage is divided into regional teams; contact the relevant team using a safe method.',
   'Use the official Dogs Trust Freedom page to find the appropriate local team.',
   'https://www.dogstrust.org.uk/get-help/freedom',
   'Regional contact details are provided on the official service page.',
   'Confidential fostering requires assessment and is subject to regional coverage and foster availability. Never leave messages unless safe to do so.'),
  ('Birmingham Dogs Home',
   'Animal welfare charity providing dog rescue and rehoming, plus telephone advice for owners worried about providing for their dog or considering rehoming.',
   array['United Kingdom','England']::text[], array['Birmingham','West Midlands','Solihull','Coventry']::text[],
   array['Dogs']::text[], array['Welfare advice','Rehoming advice','Rescue referral','Pet food signposting']::text[],
   'Contact the charity to discuss the dog and the owner’s circumstances. Advice does not guarantee financial assistance or a placement.',
   'Use the official website contact route to ask for advice before making a rehoming decision.',
   'https://www.birminghamdogshome.org.uk/',
   'Contact through the official website.',
   'Any intake, practical support or signposting depends on the dog’s needs, assessment and current capacity.')
) as v(organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, capacity_note)
where not exists (
  select 1 from public.alfik_lifeline_services s
  where lower(s.organisation_name)=lower(v.organisation_name)
);

-- ===== Scotland expansion =====
-- Based on official organisation pages checked on 29 October 2026.
-- Contact each service to confirm eligibility, area, capacity and opening arrangements.
insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'needs_verification', null, v.capacity_note
from (values
  ('Scottish Animal Welfare',
   'Scotland-wide animal help and welfare advice, including guidance for domestic animals, wildlife and animal welfare concerns.',
   array['United Kingdom','Scotland']::text[], array['Scotland']::text[],
   array['Dogs','Cats','Wildlife','Other']::text[], array['Welfare advice','Emergency animal help','Wildlife help','Rescue referral']::text[],
   'Use the organisation’s guided help route to identify the appropriate service; support depends on the circumstances.',
   'Use the official online Get Help route or call the animal helpline.',
   'https://www.scottishanimalwelfare.org.uk/',
   '03000 999 000',
   'The helpline is advertised as 24-hour. The organisation is volunteer-run; response and practical support depend on case and capacity.'),
  ('Pet Fostering Service Scotland',
   'Short-term foster care for pets when an owner cannot care for them because of illness, temporary homelessness or domestic abuse and has no alternative arrangement.',
   array['United Kingdom','Scotland']::text[], array['Scotland','Edinburgh and Lothians','Fife','Perthshire','Aberdeen','Dundee','Inverness','Tayside','Angus','Moray','Glasgow','Ayrshire','Lanarkshire','Borders','Stirling']::text[],
   array['Dogs','Cats','Small animals','Birds','Other']::text[], array['Temporary fostering','Homelessness','Domestic abuse','Illness','Crisis support','Veterinary hardship']::text[],
   'Coverage is not universal: the service currently says it does not operate in Dumfries & Galloway. Cat fostering has specific requirements. Confirm suitability and area with PFSS.',
   'Call the national number and choose the local area option; do not submit fostering requests by general email.',
   'https://www.pfss.org.uk/requesting-pet-fostering/',
   '0344 811 9909; fosterenquiry@pfss.org.uk',
   'Foster places depend on suitable volunteer availability. PFSS reports demand can exceed capacity.'),
  ('Edinburgh Dog and Cat Home Pet Food Bank',
   'Pet food and essential supplies for owners facing hardship, with partner food-bank locations across Edinburgh and parts of East and Central Scotland.',
   array['United Kingdom','Scotland']::text[], array['Edinburgh','Lothians','East and Central Scotland']::text[],
   array['Dogs','Cats']::text[], array['Pet food','Pet supplies','Crisis support','Welfare advice','Local food-bank referral']::text[],
   'Contact the Home to discuss current arrangements and the nearest partner collection point. Collection must be arranged in advance.',
   'Phone the Home to arrange a collection or ask about a local partner food bank.',
   'https://edch.org.uk/community/pet-food-bank/',
   '0131 669 5331',
   'Food and supplies vary; collection appointments are required and partner locations may change.'),
  ('Pet Pantry Cumbernauld',
   'Community pet food support helping people experiencing financial difficulty or crisis to feed their pets and keep them with their families.',
   array['United Kingdom','Scotland']::text[], array['Cumbernauld','North Lanarkshire']::text[],
   array['Dogs','Cats','Other']::text[], array['Pet food','Crisis support','Pet retention support']::text[],
   'Ask the charity or a partner food bank to confirm local eligibility and referral arrangements.',
   'Contact Pet Pantry Cumbernauld through its official website.',
   'https://www.petpantrycumbernauld.org.uk/',
   'Contact through the official website.',
   'Community support depends on donations, stock and partner arrangements.'),
  ('Dog Aid Scotland Veterinary Aid Scheme',
   'Support and advice for dog owners in Scotland, including a veterinary aid scheme for eligible owners on low incomes or benefits.',
   array['United Kingdom','Scotland']::text[], array['Scotland']::text[],
   array['Dogs']::text[], array['Veterinary costs','Welfare advice','Financial assistance']::text[],
   'Financial help is assessed against the scheme’s current criteria and is not guaranteed. Contact the charity before arranging treatment.',
   'Use the official website to check the veterinary aid scheme and application requirements.',
   'https://www.dogaidsociety.com/',
   'Contact through the official website.',
   'Funding is limited and must be agreed by the charity; it is not a substitute for pet insurance.'),
  ('All4Paws',
   'Student-led veterinary outreach providing basic veterinary care and advice to homeless and vulnerably housed people and their animals in the Edinburgh area.',
   array['United Kingdom','Scotland']::text[], array['Edinburgh','Lothians']::text[],
   array['Dogs','Cats','Other']::text[], array['Basic veterinary care','Welfare advice','Homelessness support']::text[],
   'For homeless or vulnerably housed people and their animals. Not a veterinary clinic and cannot treat seriously ill animals or emergencies.',
   'Check the official service information and contact route before attending.',
   'https://www.edch.org.uk/accessible-pet-support/',
   'Contact through the official service information.',
   'Limited outreach service; not suitable for emergencies or serious illness.'),
  ('Scottish SPCA Animal Helpline',
   'Advice and reporting route for animal welfare concerns in Scotland, including animals that may be injured, neglected or in danger.',
   array['United Kingdom','Scotland']::text[], array['Scotland']::text[],
   array['Dogs','Cats','Wildlife','Other']::text[], array['Animal welfare concerns','Welfare advice','Rescue referral']::text[],
   'Use for animal welfare concerns and follow the helpline’s instructions. It is not a guaranteed financial assistance or pet food service.',
   'Contact the Scottish SPCA through its official website or helpline.',
   'https://www.scottishspca.org/',
   '03000 999 999',
   'Opening hours and response depend on the nature of the concern and operational capacity.'),
  ('Cats Protection Lifeline Scotland',
   'Confidential temporary fostering support for cats belonging to people experiencing domestic abuse, helping owners and cats remain safe until reunion is possible.',
   array['United Kingdom','Scotland']::text[], array['Scotland']::text[],
   array['Cats']::text[], array['Temporary fostering','Domestic abuse','Crisis support']::text[],
   'For people affected by domestic abuse. Contact the service to confirm the safe referral route, eligibility and available foster capacity.',
   'Use the official Cats Protection Lifeline access page.',
   'https://www.cats.org.uk/what-we-do/cp-lifeline/accessing-lifeline',
   'Use the confidential contact details on the official access page.',
   'Confidential placements are subject to eligibility and available foster capacity.'),
  ('Dogs Trust Freedom Project Scotland',
   'Confidential temporary fostering for dogs belonging to people fleeing domestic abuse in Scotland.',
   array['United Kingdom','Scotland']::text[], array['Scotland']::text[],
   array['Dogs']::text[], array['Temporary fostering','Domestic abuse','Crisis support']::text[],
   'For people fleeing domestic abuse. Contact the project to confirm safe access, eligibility and availability.',
   'Use the official Dogs Trust Freedom Project access page.',
   'https://www.dogstrust.org.uk/how-we-help/providing-support/freedom-project',
   'Use the confidential contact route on the official website.',
   'Fostering is subject to eligibility and available capacity; contact details and coverage should be confirmed before referral.')
) as v(organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, capacity_note)
where not exists (
  select 1 from public.alfik_lifeline_services s
  where lower(s.organisation_name)=lower(v.organisation_name)
);

-- Final check: count and review national directory records after running this script.
select count(*) as visible_directory_entries
from public.alfik_lifeline_services
where verification_status='verified';
