-- Prevent duplicate fan-out records when a request action is retried.

create unique index if not exists notifications_unique_provider_request_match_idx
  on public.notifications (request_id, recipient_user_id, type)
  where type = 'new_service_request_match';

comment on index public.notifications_unique_provider_request_match_idx is
  'Ensures each provider account receives at most one automatic match notification per request.';
