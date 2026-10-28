-- ALFIK Lifeline: England expansion wave 4 (Yorkshire, North West and national food-bank locators)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- Contact services before travel: food and volunteer capacity can change quickly.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'verified', now(), v.capacity_note
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

select organisation_name, verification_status, regions
from public.alfik_lifeline_services
where lower(organisation_name) in (
  'the yorkshire rescue pet food bank','joey’s legacy pet food bank',
  'woodlands animal sanctuary pet food bank','the pet food project',
  'blue cross pet food bank finder','rspca pet food bank finder'
)
order by organisation_name;
