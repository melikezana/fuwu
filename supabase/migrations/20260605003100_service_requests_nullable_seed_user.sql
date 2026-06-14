-- Local seed data may include demo service requests that are not linked to a
-- real Supabase Auth user. Runtime inserts still require authenticated ownership
-- through RLS, but seed rows can keep user_id null.

alter table public.service_requests
  alter column user_id drop not null;
