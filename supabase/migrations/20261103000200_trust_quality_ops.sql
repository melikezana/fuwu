-- FUWU: hız, şeffaflık ve güven için ek operasyon katmanı.
-- Yalnızca yeni indeks ve salt-okunur raporlama fonksiyonları ekler; mevcut tablo,
-- politika ve fonksiyonlara dokunmaz. Tekrar çalıştırmak güvenlidir.
begin;

-- Hız: ödeme bekleyen rezervasyon taraması ve usta sipariş listeleri.
create index if not exists commerce_orders_pending_expiry_idx
  on public.commerce_orders(expires_at) where status = 'PENDING_PAYMENT';
create index if not exists commerce_orders_provider_created_idx
  on public.commerce_orders(provider_id, created_at desc);

-- Usta güven karnesi: son 90 günün ölçülebilir göstergeleri. Yalnızca ustanın kendisi ve admin okur.
create or replace function public.provider_quality_snapshot(p_provider_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not (
    exists(select 1 from public.providers where id = p_provider_id and user_id = auth.uid())
    or public.current_user_is_admin()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'window_days', 90,
      'completed_count', count(*) filter (where o.status = 'COMPLETED'),
      'cancelled_count', count(*) filter (where o.status in ('CANCELLED', 'REFUND_PENDING', 'REFUNDED')),
      'disputed_count', count(*) filter (where o.status = 'DISPUTED'),
      'arrival_checked_count', count(*) filter (where o.arrival_verified_at is not null),
      'on_time_count', count(*) filter (where o.arrival_verified_at is not null and o.arrival_verified_at <= o.starts_at + interval '15 minutes'),
      'rating_avg', (select round(avg(r.rating)::numeric, 2) from public.reviews r where r.provider_id = p_provider_id),
      'review_count', (select count(*) from public.reviews r where r.provider_id = p_provider_id)
    )
    from public.commerce_orders o
    where o.provider_id = p_provider_id
      and o.created_at >= now() - interval '90 days'
      and o.status <> 'PENDING_PAYMENT'
      and o.status <> 'PAYMENT_FAILED'
  );
end
$$;

revoke all on function public.provider_quality_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.provider_quality_snapshot(uuid) to authenticated;

-- Admin güven alarmları: müdahale gerektiren durumları tek yerde toplar. Kişisel veri döndürmez.
create or replace function public.admin_trust_alerts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.current_user_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'low_rated', coalesce((
      select jsonb_agg(x order by x->>'rating_avg') from (
        select jsonb_build_object('provider_id', p.id, 'name', p.name, 'rating_avg', round(avg(r.rating)::numeric, 2), 'review_count', count(*)) x
        from public.reviews r join public.providers p on p.id = r.provider_id
        group by p.id, p.name
        having count(*) >= 3 and avg(r.rating) < 3.5
        limit 20
      ) s), '[]'::jsonb),
    'frequent_cancellations', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('provider_id', p.id, 'name', p.name, 'count', count(*)) x
        from public.commerce_orders o join public.providers p on p.id = o.provider_id
        where o.status in ('CANCELLED', 'REFUND_PENDING', 'REFUNDED') and o.updated_at >= now() - interval '30 days'
        group by p.id, p.name
        having count(*) >= 2
        order by count(*) desc
        limit 20
      ) s), '[]'::jsonb),
    'late_arrivals', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('provider_id', p.id, 'name', p.name, 'count', count(*)) x
        from public.commerce_orders o join public.providers p on p.id = o.provider_id
        where o.arrival_verified_at > o.starts_at + interval '15 minutes' and o.starts_at >= now() - interval '30 days'
        group by p.id, p.name
        having count(*) >= 2
        order by count(*) desc
        limit 20
      ) s), '[]'::jsonb),
    'stale_disputes', (select count(*) from public.commerce_orders where status = 'DISPUTED' and updated_at < now() - interval '48 hours'),
    'stale_documents', (select count(*) from public.provider_document_versions where superseded_at is null and status in ('uploaded', 'in_review') and created_at < now() - interval '48 hours'),
    'generated_at', now()
  );
end
$$;

revoke all on function public.admin_trust_alerts() from public, anon, authenticated;
grant execute on function public.admin_trust_alerts() to authenticated;

commit;
