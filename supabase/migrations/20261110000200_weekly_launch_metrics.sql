-- 9 Kasım 2026 CEO & CTO denetimi · İzleme (haftalık ölçümler), başvuru bağlantı envanteri ve
-- yetkisiz işlem dağılımı. Salt okunur, yalnızca admin. Kişisel veri, IP veya serbest metin döndürmez.
-- Test ve kaynağı doğrulanmamış usta kayıtları gerçek metriklere katılmaz.
begin;

create or replace function public.admin_weekly_launch_metrics(p_weeks integer default 8)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare weeks integer := least(greatest(coalesce(p_weeks, 8), 1), 26);
        first_week timestamptz := date_trunc('week', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul' - make_interval(weeks => least(greatest(coalesce(p_weeks, 8), 1), 26) - 1);
begin
 if (select auth.uid()) is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
 return jsonb_build_object(
  'version', 1,
  'timezone', 'Europe/Istanbul',
  'weeks', (
   select coalesce(jsonb_agg(to_jsonb(row) order by row.week_start), '[]'::jsonb) from (
    select to_char(w.starts at time zone 'Europe/Istanbul', 'YYYY-MM-DD') as week_start,
     (select count(*) from public.provider_applications a where a.created_at >= w.starts and a.created_at < w.ends) applications_received,
     (select count(*) from public.provider_publication_reviews q where q.record_kind = 'real' and q.status = 'approved' and q.reviewed_at >= w.starts and q.reviewed_at < w.ends) providers_approved,
     (select count(distinct f.provider_id) from public.provider_service_offerings f where f.is_active and f.updated_at >= w.starts and f.updated_at < w.ends and public.provider_is_published(f.provider_id)) stores_updated,
     (select count(*) from public.launch_interest_consent_events e where e.event = 'granted' and e.created_at >= w.starts and e.created_at < w.ends) interest_granted,
     (select count(*) from public.launch_interest_consent_events e where e.event = 'withdrawn' and e.created_at >= w.starts and e.created_at < w.ends) interest_withdrawn,
     (select count(*) from public.commerce_orders o where o.created_at >= w.starts and o.created_at < w.ends and public.provider_is_published(o.provider_id)) orders_created,
     (select count(*) from public.commerce_orders o where o.status = 'COMPLETED' and o.service_completed_at >= w.starts and o.service_completed_at < w.ends and public.provider_is_published(o.provider_id)) orders_completed,
     (select count(*) from public.support_messages s where s.created_at >= w.starts and s.created_at < w.ends) support_received,
     (select count(*) from public.support_messages s where s.status = 'resolved' and s.resolved_at >= w.starts and s.resolved_at < w.ends) support_resolved
    from (select first_week + make_interval(weeks => n) starts, first_week + make_interval(weeks => n + 1) ends from generate_series(0, weeks - 1) n) w
   ) row),
  'totals', jsonb_build_object(
   'published_providers', (select count(*) from public.providers p where public.provider_is_published(p.id)),
   'published_stores', (select count(distinct f.provider_id) from public.provider_service_offerings f where f.is_active and public.provider_is_published(f.provider_id)),
   'consented_interest', (select count(*) from public.launch_interest where withdrawn_at is null),
   'open_support', (select count(*) from public.support_messages where status <> 'resolved')),
  -- Denetim bulgusu: kullanıcı hesabına bağlanmamış başvurular. Kaynak kararı insan incelemesi gerektirir.
  'applications', jsonb_build_object(
   'total', (select count(*) from public.provider_applications),
   'linked', (select count(*) from public.provider_applications where user_id is not null),
   'unlinked', (select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) from (select status, count(*) as total from public.provider_applications where user_id is null group by status) s)),
  -- Denetim bulgusu: security.unauthorized_action kayıtlarının gün ve kaynak türüne göre dağılımı (son 14 gün).
  'unauthorized_actions', (
   select coalesce(jsonb_agg(to_jsonb(row) order by row.day desc, row.entity_type), '[]'::jsonb) from (
    select to_char(l.created_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') as day, l.entity_type,
     count(*) as total, count(*) filter (where l.actor_user_id is null) as anonymous, count(distinct l.actor_user_id) as distinct_accounts
    from public.audit_logs l
    where l.action = 'security.unauthorized_action' and l.created_at >= now() - interval '14 days'
    group by 1, 2
   ) row)
 );
end $$;
revoke all on function public.admin_weekly_launch_metrics(integer) from public, anon, authenticated;
grant execute on function public.admin_weekly_launch_metrics(integer) to authenticated, service_role;
comment on function public.admin_weekly_launch_metrics(integer) is 'Yalnızca admin. Haftalık lansman ölçümleri; kişisel veri döndürmez.';

commit;
