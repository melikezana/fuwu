import fs from "node:fs";
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const remote = !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const readOnlyRpc = method === "POST" && ["/rest/v1/rpc/commerce_offers", "/rest/v1/rpc/provider_publication_gate"].includes(url.pathname);
  if (remote && !["GET", "HEAD"].includes(method) && !readOnlyRpc) throw new Error("QA blocked remote mutation");
  const start = performance.now();
  let status = null;
  try { const response = await nativeFetch(input, init); status = response.status; return response; }
  finally {
    if (remote && process.env.FUWU_QA_TELEMETRY) fs.appendFileSync(process.env.FUWU_QA_TELEMETRY, JSON.stringify({ at: new Date().toISOString(), resource: url.pathname, method, status, ms: Math.round(performance.now() - start) }) + "\n");
  }
};
