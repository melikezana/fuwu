// Bound every server Auth/PostgREST request, including callers without abortSignal().
// Supabase may return an error object rather than throw on a timeout; callers still check error.
export const supabaseFetch: typeof fetch = async (input, init) => {
  // Next's proxy runtime does not expose AbortSignal.any, even when the host
  // Node version does. Use the common AbortController API in both runtimes.
  const controller = new AbortController();
  const upstream = init?.signal;
  const abort = () => controller.abort(upstream?.reason);
  const timer = setTimeout(() => controller.abort(new DOMException("Supabase request timed out", "TimeoutError")), 8000);
  if (upstream?.aborted) abort();
  else upstream?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    // These clients consume JSON/metadata, rather than long-lived streams. Keep
    // the deadline and caller cancellation active until the body has arrived.
    const body = response.body ? await response.arrayBuffer() : null;
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } finally {
    clearTimeout(timer);
    upstream?.removeEventListener("abort", abort);
  }
};
