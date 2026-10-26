-- Explicitly approved source-only security fix. Apply to staging first; never auto-apply.
-- RLS protects rows, not columns. Public profiles must never expose financial identity.
begin;
revoke select on public.providers from public,anon,authenticated;
grant select on public.providers to service_role;
do $$ declare field text; begin
 for field in select attname from pg_attribute where attrelid='public.providers'::regclass and attnum>0 and not attisdropped
   and attname<>all(array['payout_iban','tax_identity_number','tax_office','legal_name','payout_address','iyzico_submerchant_key','iyzico_submerchant_conversation_id'])
 loop execute format('grant select(%I) on public.providers to anon,authenticated',field); end loop;
end $$;

create function public.commerce_provider_private(p_provider_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare row_data jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.providers where id=p_provider_id and (user_id=auth.uid() or public.current_user_is_admin()))
 then raise exception 'forbidden' using errcode='42501'; end if;
 select to_jsonb(p) into row_data from public.providers p where p.id=p_provider_id;
 -- The payment processor key and conversation identity are never sent to the browser.
 return jsonb_build_object('payout_iban',row_data->'payout_iban','tax_identity_number',row_data->'tax_identity_number',
 'tax_office',row_data->'tax_office','legal_name',row_data->'legal_name','payout_address',row_data->'payout_address');
end $$;
revoke all on function public.commerce_provider_private(uuid) from public,anon,authenticated;
grant execute on function public.commerce_provider_private(uuid) to authenticated;

create or replace function public.fusion_protect_provider_fields() returns trigger language plpgsql set search_path='' as $$
declare field text;
begin
 if current_user in ('authenticated','anon') and not public.current_user_is_admin() then
   foreach field in array array['user_id','rating','review_count','is_approved','is_verified','phone_verified','identity_verified','iyzico_submerchant_key','iyzico_submerchant_status','iyzico_submerchant_conversation_id','payout_iban','tax_identity_number','tax_office','legal_name','payout_address'] loop
     if to_jsonb(new)->field is distinct from to_jsonb(old)->field then raise exception 'provider_field_forbidden' using errcode='42501'; end if;
   end loop;
 end if;
 return new;
end $$;
commit;
