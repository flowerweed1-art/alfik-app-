-- ALFIK Lifeline: England expansion wave 3 (Gloucestershire, East Midlands and specialist fostering)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- Service areas, eligibility and capacity must be confirmed directly before referring anyone.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'verified', now(), v.capacity_note
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

select organisation_name, verification_status, regions
from public.alfik_lifeline_services
where lower(organisation_name) in (
  'rspca cotswolds, gloucester & district branch','rspca cheltenham & east gloucestershire branch',
  'juno women’s aid pet foster project','endeavour pet fostering','refuge4pets','rspca east norfolk branch'
)
order by organisation_name;
