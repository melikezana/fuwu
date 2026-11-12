-- 10 Kasım 2026 denetimi · P0/3: "10 başvuruyu gerçek / demo / eksik sınıflandır; 8 bağsız kaydı araştır."
-- Başvurunun kaynak kararı ayrı bir tabloda tutulur; provider_applications satırları ve mevcut onay akışı değişmez.
-- Karar yalnızca admin RPC'siyle verilir, gerekçe zorunludur ve her karar denetim kaydına düşer.
-- Üretime uygulamadan önce staging/izole ortamda doğrulanmalıdır.
begin;

create table if not exists public.provider_application_source_reviews (
 application_id uuid primary key references public.provider_applications(id) on delete cascade,
 source_kind text not null check (source_kind in ('real','test','incomplete')),
 note text not null check (length(btrim(note)) between 10 and 500),
 reviewed_by uuid not null references public.profiles(id),
 reviewed_at timestamptz not null default now()
);
create index if not exists provider_application_source_reviews_reviewed_by_fk_idx on public.provider_application_source_reviews (reviewed_by);
alter table public.provider_application_source_reviews enable row level security;
revoke all on public.provider_application_source_reviews from public, anon, authenticated;
grant all on public.provider_application_source_reviews to service_role;
do $$
begin
 if not exists(select 1 from pg_catalog.pg_policy where polrelid = 'public.provider_application_source_reviews'::regclass) then
  create policy provider_application_source_reviews_server_only on public.provider_application_source_reviews
   as restrictive for all to anon, authenticated using (false) with check (false);
 end if;
end $$;
comment on table public.provider_application_source_reviews is 'Başvuru kaynak kararı (gerçek / deneme / eksik). Yalnızca admin RPC''leri üzerinden okunur ve yazılır.';

-- Liste ekranı için özet: kaynak kararı ve hesaba bağlılık. Kişisel alan döndürmez.
create or replace function public.admin_application_sources()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 if (select auth.uid()) is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
 return (
  select coalesce(jsonb_object_agg(a.id, jsonb_build_object(
   'linked', a.user_id is not null,
   'has_provider', a.user_id is not null and exists(select 1 from public.providers p where p.user_id = a.user_id),
   'source_kind', coalesce(r.source_kind, 'unclassified'),
   'note', r.note,
   'reviewed_at', r.reviewed_at)), '{}'::jsonb)
  from public.provider_applications a
  left join public.provider_application_source_reviews r on r.application_id = a.id);
end $$;
revoke all on function public.admin_application_sources() from public, anon, authenticated;
grant execute on function public.admin_application_sources() to authenticated, service_role;

-- Kaynak kararı. Başvuru durumunu, usta profilini veya yayın kararını değiştirmez; geri alınabilir (yeniden sınıflandırılır).
create or replace function public.admin_classify_application(p_application_id uuid, p_kind text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare previous text;
begin
 if (select auth.uid()) is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
 if p_kind is null or p_kind not in ('real','test','incomplete') or p_note is null or length(btrim(p_note)) not between 10 and 500 then
  raise exception 'invalid_classification' using errcode = '22023';
 end if;
 if not exists(select 1 from public.provider_applications where id = p_application_id) then raise exception 'application_not_found' using errcode = 'P0002'; end if;
 select source_kind into previous from public.provider_application_source_reviews where application_id = p_application_id for update;
 insert into public.provider_application_source_reviews(application_id, source_kind, note, reviewed_by)
 values (p_application_id, p_kind, btrim(p_note), (select auth.uid()))
 on conflict (application_id) do update set source_kind = excluded.source_kind, note = excluded.note, reviewed_by = excluded.reviewed_by, reviewed_at = now();
 insert into public.audit_logs(actor_user_id, entity_type, entity_id, action, metadata)
 values ((select auth.uid()), 'provider_application', p_application_id, 'application.source_classified',
  jsonb_build_object('source_kind', p_kind, 'previous', coalesce(previous, 'unclassified')));
end $$;
revoke all on function public.admin_classify_application(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_classify_application(uuid, text, text) to authenticated, service_role;

commit;
