-- ALFIK Lifeline: England expansion wave 1 (South East and national services)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- These entries are based on the organisations' published service information.
-- Eligibility, geographic catchment and capacity must always be confirmed directly.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'verified', now(), v.capacity_note
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

select organisation_name, verification_status, regions
from public.alfik_lifeline_services
where lower(organisation_name) in (
  'rspca surrey east branch','treat me kind','sussex search & rescue for lost dogs pet food bank',
  'pets in need herts cic','mayhew pet refuge','waltham forest pet food bank',
  'dogs trust hope project','pdsa','blue cross'
)
order by organisation_name;
