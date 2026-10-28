-- ALFIK Lifeline: England expansion wave 2 (Essex, Berkshire, Hampshire, Oxfordshire)
-- Run in Supabase SQL Editor after the existing Lifeline setup.
-- Listings are based on published organisation information. Eligibility and capacity must be confirmed directly.

insert into public.alfik_lifeline_services
  (organisation_name, summary, countries, regions, species, support_types, eligibility, referral_method, website, public_contact, verification_status, verified_at, capacity_note)
select v.organisation_name, v.summary, v.countries, v.regions, v.species, v.support_types,
       v.eligibility, v.referral_method, v.website, v.public_contact,
       'verified', now(), v.capacity_note
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

select organisation_name, verification_status, regions
from public.alfik_lifeline_services
where lower(organisation_name) in (
  'rspca essex south, southend & district branch','spsas pet bank essex','spsas pet bank bracknell',
  'rspca oxfordshire branch','banbury pet bank','next chapter animal rescue',
  'helping dogs and cats uk','rspca east berkshire branch'
)
order by organisation_name;
