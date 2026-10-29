-- ALFIK Lifeline: set unreviewed England and Scotland additions to pending verification.
-- Preserves the original Kent launch directory entries.
-- No rows are deleted. Pending listings will not appear publicly until ALFIK verifies them.
-- Run in Supabase SQL Editor, then review the status summary.

update public.alfik_lifeline_services
set verification_status = 'needs_verification',
    verified_at = null,
    verified_by = null,
    updated_at = now()
where lower(organisation_name) in (
  'banbury pet bank',
  'birmingham dogs home',
  'blue cross',
  'dogs trust hope project',
  'eastwood volunteer bureau & food bank',
  'endeavour pet fostering',
  'helping dogs and cats uk',
  'jerry green dog rescue community support',
  'joey’s legacy pet food bank',
  'juno women’s aid pet foster project',
  'keep your pet (york)',
  'mayhew pet refuge',
  'next chapter animal rescue',
  'pdsa',
  'pets in need herts cic',
  'refuge4pets',
  'rspca cheltenham & east gloucestershire branch',
  'rspca cotswolds, gloucester & district branch',
  'rspca east berkshire branch',
  'rspca east norfolk branch',
  'rspca essex south, southend & district branch',
  'rspca lincolnshire east branch',
  'rspca lincolnshire mid, north east & lincoln branch',
  'rspca lincolnshire north & humber branch',
  'rspca nottinghamshire east branch',
  'rspca oxfordshire branch',
  'rspca surrey east branch',
  'spsas pet bank bracknell',
  'spsas pet bank essex',
  'sussex search & rescue for lost dogs pet food bank',
  'the pet food project',
  'the yorkshire rescue pet food bank',
  'treat me kind',
  'waltham forest pet food bank',
  'woodlands animal sanctuary pet food bank',
  'blue cross pet food bank finder',
  'rspca pet food bank finder',
  'all4paws',
  'cats protection lifeline scotland',
  'dog aid scotland veterinary aid scheme',
  'dogs trust freedom project scotland',
  'edinburgh dog and cat home pet food bank',
  'pet fostering service scotland',
  'pet pantry cumbernauld',
  'scottish animal welfare',
  'scottish spca animal helpline'
)
and verification_status = 'verified';

select verification_status, count(*) as listing_count
from public.alfik_lifeline_services
group by verification_status
order by verification_status;

select organisation_name, verification_status, verified_at
from public.alfik_lifeline_services
where lower(organisation_name) in (
  'banbury pet bank',
  'birmingham dogs home',
  'blue cross',
  'dogs trust hope project',
  'eastwood volunteer bureau & food bank',
  'endeavour pet fostering',
  'helping dogs and cats uk',
  'jerry green dog rescue community support',
  'joey’s legacy pet food bank',
  'juno women’s aid pet foster project',
  'keep your pet (york)',
  'mayhew pet refuge',
  'next chapter animal rescue',
  'pdsa',
  'pets in need herts cic',
  'refuge4pets',
  'rspca cheltenham & east gloucestershire branch',
  'rspca cotswolds, gloucester & district branch',
  'rspca east berkshire branch',
  'rspca east norfolk branch',
  'rspca essex south, southend & district branch',
  'rspca lincolnshire east branch',
  'rspca lincolnshire mid, north east & lincoln branch',
  'rspca lincolnshire north & humber branch',
  'rspca nottinghamshire east branch',
  'rspca oxfordshire branch',
  'rspca surrey east branch',
  'spsas pet bank bracknell',
  'spsas pet bank essex',
  'sussex search & rescue for lost dogs pet food bank',
  'the pet food project',
  'the yorkshire rescue pet food bank',
  'treat me kind',
  'waltham forest pet food bank',
  'woodlands animal sanctuary pet food bank',
  'blue cross pet food bank finder',
  'rspca pet food bank finder',
  'all4paws',
  'cats protection lifeline scotland',
  'dog aid scotland veterinary aid scheme',
  'dogs trust freedom project scotland',
  'edinburgh dog and cat home pet food bank',
  'pet fostering service scotland',
  'pet pantry cumbernauld',
  'scottish animal welfare',
  'scottish spca animal helpline'
)
order by organisation_name;
