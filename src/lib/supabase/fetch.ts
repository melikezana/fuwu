// Bound every server Auth/PostgREST request, including callers without abortSignal().
// Supabase may return an error object rather than throw on a timeout; callers still check error.
export const supabaseFetch: typeof fetch = (input, init) => fetch(input, {
  ...init,
  signal: AbortSignal.any([AbortSignal.timeout(8000), ...(init?.signal ? [init.signal] : [])]),
});
