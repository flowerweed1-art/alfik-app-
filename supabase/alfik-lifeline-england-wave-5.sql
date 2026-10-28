-- ALFIK Lifeline: England expansion wave 5 (Lincolnshire and York)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- Service eligibility and current capacity must be checked directly before referring anyone.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'verified', now(), v.capacity_note
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

select organisation_name, verification_status, regions
from public.alfik_lifeline_services
where lower(organisation_name) in (
  'rspca lincolnshire east branch','rspca lincolnshire mid, north east & lincoln branch',
  'rspca lincolnshire north & humber branch','keep your pet (york)',
  'the cinnamon trust','dogs trust hope project'
)
order by organisation_name;
