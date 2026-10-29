import { getRequestOrigin } from "./safeRedirect";

export const MAX_API_BODY_BYTES = 64 * 1024;
export class RequestBoundaryError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}

export function assertSameOrigin(request: { url: string; headers: Headers }) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== getRequestOrigin(request)) || (!origin && fetchSite && !["same-origin", "none"].includes(fetchSite))) {
    throw new RequestBoundaryError(403, "forbidden");
  }
}

// Count bytes from the stream as well as Content-Length: chunked requests cannot
// evade the limit. Keep a fresh Request so the existing handler consumes it once.
export async function boundRequestBody(request: Request, maxBytes = MAX_API_BODY_BYTES): Promise<Uint8Array<ArrayBuffer>> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new RequestBoundaryError(413, "payload_too_large");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new RequestBoundaryError(413, "payload_too_large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}
