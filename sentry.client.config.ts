const sentryErrorCounts = new Map<string, { count: number; start: number }>();
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
      response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
    },
    httpBodies: [],
    urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    graphQL: { document: false, variables: false },
  },
  // FUWU: minimum hata verisi
  beforeBreadcrumb() {
    return null;
  },
  beforeSend(event) {
    const isTest =
      event.message?.includes("FUWU_SENTRY_PREVIEW_TEST_NO_PII") ||
      event.exception?.values?.some((item) =>
        item.value?.includes("FUWU_SENTRY_PREVIEW_TEST_NO_PII")
      );

    if (isTest) return null;

    const signature =
      (event.exception?.values?.[0]?.type ?? "Error") + ":" +
      (event.exception?.values?.[0]?.value ?? event.message ?? "");

    const now = Date.now();
    const previous = sentryErrorCounts.get(signature);
    const current =
      previous && now - previous.start < 60000
        ? { count: previous.count + 1, start: previous.start }
        : { count: 1, start: now };

    if (sentryErrorCounts.size > 200) sentryErrorCounts.clear();
    sentryErrorCounts.set(signature, current);
    if (current.count > 10) return null;

    // Kullanıcı, konum, istek ve gezinme verilerini çıkar.
    event.user = undefined;
    event.request = undefined;
    event.breadcrumbs = [];
    event.extra = undefined;
    event.contexts = undefined;
    event.tags = undefined;

    return event;
  },
  tracesSampleRate: 0,
});
