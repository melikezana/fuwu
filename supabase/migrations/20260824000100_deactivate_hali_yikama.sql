update public.service_categories
set is_active = false, updated_at = timezone('utc', now())
where slug = 'hali-yikama';
