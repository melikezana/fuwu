-- FUWU: Before User Created kancasının (yurt dışı numara engeli) güvenle açılabilmesi için yetkiler.
-- Supabase Auth kancayı supabase_auth_admin rolüyle çağırır; bu rolün public şemasını kullanma izni
-- yoksa kanca açıldığında yeni üyelikler hata verir. Supabase'in kanca rehberindeki izinlerin aynısı.
-- Rol yoksa (yerel test veritabanı) hiçbir şey yapmaz. Tekrar çalıştırmak güvenlidir.
begin;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin')
     and to_regprocedure('public.hook_fuwu_before_user_created(jsonb)') is not null then
    grant usage on schema public to supabase_auth_admin;
    grant execute on function public.hook_fuwu_before_user_created(jsonb) to supabase_auth_admin;
  end if;
end
$$;

-- Kanca yalnızca Supabase Auth tarafından çağrılabilir; tarayıcı rolleri çağıramaz.
do $$
begin
  if to_regprocedure('public.hook_fuwu_before_user_created(jsonb)') is not null then
    revoke all on function public.hook_fuwu_before_user_created(jsonb) from public, anon, authenticated;
  end if;
end
$$;

commit;
