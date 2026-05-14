-- Public read policies required by the provider directory filters.
-- Run this after supabase/schema.sql. It is safe to re-run.

alter table public.service_categories enable row level security;
alter table public.districts enable row level security;

grant select on table public.service_categories to anon, authenticated;
grant select on table public.districts to anon, authenticated;

drop policy if exists service_categories_select_public on public.service_categories;
create policy service_categories_select_public
on public.service_categories
for select
to anon, authenticated
using (true);

comment on policy service_categories_select_public on public.service_categories is
  'Anyone can read service categories for public provider browsing and filter options.';

drop policy if exists districts_select_public on public.districts;
create policy districts_select_public
on public.districts
for select
to anon, authenticated
using (true);

comment on policy districts_select_public on public.districts is
  'Anyone can read districts for public provider browsing and filter options.';
