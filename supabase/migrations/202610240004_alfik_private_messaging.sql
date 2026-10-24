-- ALFIK private owner/finder messaging
-- Apply after the existing animal_reports table is present.
-- Conversations and messages contain no public email address or phone-number fields.

begin;

create table if not exists public.alfik_message_conversations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.animal_reports(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint alfik_message_conversations_report_contact_unique unique (report_id, contact_user_id),
  constraint alfik_message_conversations_distinct_users check (owner_id <> contact_user_id)
);

create table if not exists public.alfik_private_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.alfik_message_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists alfik_message_conversations_owner_recent_idx
  on public.alfik_message_conversations (owner_id, last_message_at desc);
create index if not exists alfik_message_conversations_contact_recent_idx
  on public.alfik_message_conversations (contact_user_id, last_message_at desc);
create index if not exists alfik_private_messages_conversation_created_idx
  on public.alfik_private_messages (conversation_id, created_at);

alter table public.alfik_message_conversations enable row level security;
alter table public.alfik_private_messages enable row level security;

revoke all on public.alfik_message_conversations from anon, authenticated;
revoke all on public.alfik_private_messages from anon, authenticated;
grant select on public.alfik_message_conversations to authenticated;
grant select, insert on public.alfik_private_messages to authenticated;

drop policy if exists "ALFIK conversation participants can read conversations" on public.alfik_message_conversations;
create policy "ALFIK conversation participants can read conversations"
  on public.alfik_message_conversations
  for select to authenticated
  using (owner_id = auth.uid() or contact_user_id = auth.uid());

drop policy if exists "ALFIK participants can read private messages" on public.alfik_private_messages;
create policy "ALFIK participants can read private messages"
  on public.alfik_private_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.alfik_message_conversations c
      where c.id = conversation_id
        and (c.owner_id = auth.uid() or c.contact_user_id = auth.uid())
    )
  );

drop policy if exists "ALFIK participants can send private messages" on public.alfik_private_messages;
create policy "ALFIK participants can send private messages"
  on public.alfik_private_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.alfik_message_conversations c
      where c.id = conversation_id
        and c.status = 'open'
        and (c.owner_id = auth.uid() or c.contact_user_id = auth.uid())
    )
  );

create or replace function public.alfik_start_conversation(p_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_report_type text;
  v_report_status text;
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Please sign in to contact the report owner.';
  end if;

  select r.owner_id, r.report_type::text, r.status::text
    into v_owner_id, v_report_type, v_report_status
  from public.animal_reports r
  where r.id = p_report_id;

  if not found then
    raise exception 'This animal report could not be found.';
  end if;
  if v_report_type not in ('lost', 'found') then
    raise exception 'Private contact is available only for lost or found reports.';
  end if;
  if v_report_status <> 'active' then
    raise exception 'This report is no longer active.';
  end if;
  if v_owner_id is null then
    raise exception 'This report has no account owner to contact.';
  end if;
  if v_owner_id = v_user_id then
    raise exception 'You cannot start a conversation with yourself.';
  end if;

  insert into public.alfik_message_conversations (report_id, owner_id, contact_user_id)
  values (p_report_id, v_owner_id, v_user_id)
  on conflict (report_id, contact_user_id)
  do update set last_message_at = public.alfik_message_conversations.last_message_at
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$$;

revoke all on function public.alfik_start_conversation(uuid) from public, anon;
grant execute on function public.alfik_start_conversation(uuid) to authenticated;

create or replace function public.alfik_touch_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.alfik_message_conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

revoke all on function public.alfik_touch_conversation_after_message() from public, anon, authenticated;

drop trigger if exists alfik_touch_conversation_after_message on public.alfik_private_messages;
create trigger alfik_touch_conversation_after_message
  after insert on public.alfik_private_messages
  for each row execute function public.alfik_touch_conversation_after_message();

commit;
