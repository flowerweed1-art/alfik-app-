-- ALFIK user blocking and harassment reporting for private messaging
-- Apply after 202610240004_alfik_private_messaging.sql.

begin;

create table if not exists public.alfik_user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint alfik_user_blocks_not_self check (blocker_id <> blocked_id),
  constraint alfik_user_blocks_unique_pair unique (blocker_id, blocked_id)
);

create table if not exists public.alfik_user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.alfik_message_conversations(id) on delete set null,
  reason text not null check (reason in ('harassment', 'threats', 'scam', 'inappropriate', 'other')),
  details text not null default '' check (length(details) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  constraint alfik_user_reports_not_self check (reporter_id <> reported_user_id)
);

create index if not exists alfik_user_blocks_blocker_idx on public.alfik_user_blocks(blocker_id);
create index if not exists alfik_user_blocks_blocked_idx on public.alfik_user_blocks(blocked_id);
create index if not exists alfik_user_reports_status_recent_idx on public.alfik_user_reports(status, created_at desc);
create index if not exists alfik_user_reports_reporter_idx on public.alfik_user_reports(reporter_id);

alter table public.alfik_user_blocks enable row level security;
alter table public.alfik_user_reports enable row level security;

revoke all on public.alfik_user_blocks from anon, authenticated;
revoke all on public.alfik_user_reports from anon, authenticated;
grant select, insert, delete on public.alfik_user_blocks to authenticated;
grant select, insert, update on public.alfik_user_reports to authenticated;

drop policy if exists "Members can view blocks they created" on public.alfik_user_blocks;
create policy "Members can view blocks they created"
  on public.alfik_user_blocks for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "Members can block other accounts" on public.alfik_user_blocks;
create policy "Members can block other accounts"
  on public.alfik_user_blocks for insert to authenticated
  with check (blocker_id = auth.uid() and blocked_id <> auth.uid());

drop policy if exists "Members can unblock accounts they blocked" on public.alfik_user_blocks;
create policy "Members can unblock accounts they blocked"
  on public.alfik_user_blocks for delete to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "Report authors and ALFIK admins can read user reports" on public.alfik_user_reports;
create policy "Report authors and ALFIK admins can read user reports"
  on public.alfik_user_reports for select to authenticated
  using (
    reporter_id = auth.uid()
    or exists (select 1 from public.alfik_admins a where a.user_id = auth.uid())
  );

drop policy if exists "Conversation participants can report each other" on public.alfik_user_reports;
create policy "Conversation participants can report each other"
  on public.alfik_user_reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and reported_user_id <> auth.uid()
    and exists (
      select 1 from public.alfik_message_conversations c
      where c.id = conversation_id
        and (
          (c.owner_id = auth.uid() and c.contact_user_id = reported_user_id)
          or (c.contact_user_id = auth.uid() and c.owner_id = reported_user_id)
        )
    )
  );

drop policy if exists "ALFIK admins can update user report reviews" on public.alfik_user_reports;
create policy "ALFIK admins can update user report reviews"
  on public.alfik_user_reports for update to authenticated
  using (exists (select 1 from public.alfik_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.alfik_admins a where a.user_id = auth.uid()));

-- Enforce blocks in the database as well as in the interface.
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
        and not public.alfik_private_message_is_blocked(c.owner_id, c.contact_user_id)
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
  if exists (
    select 1 from public.alfik_user_blocks b
    where (b.blocker_id = v_user_id and b.blocked_id = v_owner_id)
       or (b.blocker_id = v_owner_id and b.blocked_id = v_user_id)
  ) then
    raise exception 'Messaging is unavailable because one member has blocked the other.';
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




-- Check blocking in a policy without exposing either member's block table.
-- The caller must be one of the two accounts being checked.
create or replace function public.alfik_private_message_is_blocked(
  p_user_a uuid,
  p_user_b uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $
begin
  if auth.uid() is null
     or auth.uid() not in (p_user_a, p_user_b)
     or p_user_a is null
     or p_user_b is null
     or p_user_a = p_user_b then
    raise exception 'You may only check blocking for your own conversation.';
  end if;

  return exists (
    select 1 from public.alfik_user_blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
end;
$;

revoke all on function public.alfik_private_message_is_blocked(uuid, uuid) from public, anon;
grant execute on function public.alfik_private_message_is_blocked(uuid, uuid) to authenticated;

-- Return only the relationship state for the signed-in member and one selected conversation partner.
-- This avoids granting broad read access to other members' block records.
create or replace function public.alfik_private_message_block_state(p_other_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $
declare
  v_user_id uuid := auth.uid();
  v_blocked_by_me boolean;
  v_blocked_me boolean;
begin
  if v_user_id is null then
    raise exception 'Please sign in to check messaging permissions.';
  end if;
  if p_other_user_id is null or p_other_user_id = v_user_id then
    raise exception 'Choose another member.';
  end if;

  select exists (
    select 1 from public.alfik_user_blocks b
    where b.blocker_id = v_user_id and b.blocked_id = p_other_user_id
  ) into v_blocked_by_me;

  select exists (
    select 1 from public.alfik_user_blocks b
    where b.blocker_id = p_other_user_id and b.blocked_id = v_user_id
  ) into v_blocked_me;

  return jsonb_build_object('blockedByMe', v_blocked_by_me, 'blockedMe', v_blocked_me);
end;
$;

revoke all on function public.alfik_private_message_block_state(uuid) from public, anon;
grant execute on function public.alfik_private_message_block_state(uuid) to authenticated;

commit;
