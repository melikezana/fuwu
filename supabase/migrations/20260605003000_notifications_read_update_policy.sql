-- Users should only update the read state of notifications addressed to them.
-- Admins can still read notifications through the SELECT policy, but read-state
-- updates stay scoped to recipient_user_id = auth.uid().

alter table public.notifications enable row level security;

drop policy if exists notifications_update_own_read_state on public.notifications;
create policy notifications_update_own_read_state
on public.notifications
for update
to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());
