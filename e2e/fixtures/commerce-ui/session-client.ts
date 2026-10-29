// Explicit browser fixture only. Never imported by the Next application.
export function createClient() {
  if (location.search.includes("sdk-failure")) throw new Error("TEST SDK chunk unavailable");
  return { auth: { onAuthStateChange(callback: (event: string) => void) {
    Object.assign(window, { __QA_AUTH_EVENT: callback });
    return { data: { subscription: { unsubscribe() { Object.assign(window, { __QA_AUTH_EVENT: undefined }); } } } };
  } } };
}
