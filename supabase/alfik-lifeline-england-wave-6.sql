-- ALFIK Lifeline: England expansion wave 6 (East Midlands and West Midlands)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- Confirm local eligibility and current capacity with each service before referring anyone.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'verified', now(), v.capacity_note
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

select organisation_name, verification_status, regions
from public.alfik_lifeline_services
where lower(organisation_name) in (
  'jerry green dog rescue community support','rspca nottinghamshire east branch',
  'eastwood volunteer bureau & food bank','dogs trust freedom project','birmingham dogs home'
)
order by organisation_name;
