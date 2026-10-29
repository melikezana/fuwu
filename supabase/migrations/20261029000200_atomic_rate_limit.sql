begin;

-- Browsers must never reset or lower their own counters. Keep read visibility.
revoke insert,update,delete on public.rate_limits from anon,authenticated;

create function public.consume_user_rate_limit(p_action text,p_limit integer,p_window_ms integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); instant timestamptz:=clock_timestamp(); window_start_at timestamptz; consumed integer;
begin
 if actor is null then raise exception 'unauthorized' using errcode='42501'; end if;
 if p_action is null or p_action !~ '^[A-Za-z0-9:._-]{1,80}$' or p_limit is null or p_limit not between 1 and 1000 or p_window_ms is null or p_window_ms not between 1000 and 86400000 then raise exception 'invalid_rate_limit'; end if;
 window_start_at:=to_timestamp(floor(extract(epoch from instant)*1000/p_window_ms)*p_window_ms/1000);
 insert into public.rate_limits(user_id,action,count,window_start,updated_at)
 values(actor,p_action,1,window_start_at,instant)
 on conflict(user_id,action,window_start) do update set count=least(public.rate_limits.count+1,1001),updated_at=instant
 returning count into consumed;
 return jsonb_build_object('allowed',consumed<=p_limit,'limit',p_limit,'remaining',greatest(0,p_limit-consumed),'resetAt',(extract(epoch from window_start_at)*1000+p_window_ms)::bigint);
end $$;
revoke all on function public.consume_user_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_user_rate_limit(text,integer,integer) to authenticated;

commit;
