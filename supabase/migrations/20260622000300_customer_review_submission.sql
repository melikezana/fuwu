-- Customer review submission with completed-request eligibility and atomic
-- provider rating aggregation.

alter table public.providers
  add column if not exists review_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'providers_review_count_check'
      and conrelid = 'public.providers'::regclass
  ) then
    alter table public.providers
      add constraint providers_review_count_check
      check (review_count >= 0);
  end if;
end $$;

with review_summary as (
  select
    provider_id,
    round(avg(rating)::numeric, 1) as average_rating,
    count(*)::integer as review_count
  from public.reviews
  group by provider_id
)
update public.providers provider
set
  rating = review_summary.average_rating,
  review_count = review_summary.review_count
from review_summary
where provider.id = review_summary.provider_id;

update public.providers provider
set
  rating = 0,
  review_count = 0
where not exists (
  select 1
  from public.reviews review
  where review.provider_id = provider.id
);

alter table public.reviews enable row level security;

drop policy if exists reviews_insert_own on public.reviews;
drop policy if exists reviews_update_own on public.reviews;
drop policy if exists reviews_delete_own on public.reviews;

create policy reviews_insert_own
on public.reviews
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.service_requests request
    where request.user_id = auth.uid()
      and request.assigned_provider_id = reviews.provider_id
      and request.status = 'completed'
  )
);

create or replace function public.submit_provider_review(
  p_provider_id uuid,
  p_rating smallint,
  p_comment text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_review_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'review-auth-required'
      using errcode = '42501';
  end if;

  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'review-rating-invalid'
      using errcode = '22023';
  end if;

  if p_comment is null
    or char_length(btrim(p_comment)) < 10
    or char_length(btrim(p_comment)) > 1000
  then
    raise exception 'review-comment-invalid'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.service_requests request
    where request.user_id = v_user_id
      and request.assigned_provider_id = p_provider_id
      and request.status = 'completed'
  ) then
    raise exception 'review-not-eligible'
      using errcode = '42501';
  end if;

  insert into public.reviews (
    provider_id,
    user_id,
    rating,
    comment
  )
  values (
    p_provider_id,
    v_user_id,
    p_rating,
    btrim(p_comment)
  )
  returning id into v_review_id;

  update public.providers provider
  set
    rating = summary.average_rating,
    review_count = summary.review_count
  from (
    select
      round(avg(review.rating)::numeric, 1) as average_rating,
      count(*)::integer as review_count
    from public.reviews review
    where review.provider_id = p_provider_id
  ) summary
  where provider.id = p_provider_id;

  return v_review_id;
exception
  when unique_violation then
    raise exception 'review-already-submitted'
      using errcode = '23505';
end;
$$;

revoke all on function public.submit_provider_review(uuid, smallint, text)
  from public, anon;
grant execute on function public.submit_provider_review(uuid, smallint, text)
  to authenticated, service_role;

comment on function public.submit_provider_review(uuid, smallint, text) is
  'Creates one eligible customer review and refreshes the provider rating summary atomically.';
