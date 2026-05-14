# Admin Role Setup

Fuwu admin access is controlled by `public.profiles.role`. The admin panel does not accept a demo code; a user must have a real Supabase session and a matching profile row with `role = 'admin'`.

## Make The First Admin

1. Sign in once through `/login` with the account that should become admin.
2. In the Supabase dashboard, open **Authentication > Users** and copy that user's UUID.
3. In the Supabase SQL editor, run this with the copied UUID:

```sql
insert into public.profiles (id, full_name, role)
values ('00000000-0000-0000-0000-000000000000', 'Fuwu Admin', 'admin')
on conflict (id)
do update set role = 'admin';
```

Replace `00000000-0000-0000-0000-000000000000` with the real `auth.users.id`.

If the profile row already exists, the same statement safely updates only the role. Do not put service role keys, anon keys, passwords, or tokens in source files or documentation.
