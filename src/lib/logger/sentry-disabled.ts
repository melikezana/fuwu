/** Browser-only implementation when no public Sentry DSN exists at build time.
 * The SDK already disables capture in this configuration. Server and configured
 * browser builds always resolve the real SDK; application logging is unchanged.
 */
export function init() {}
export function captureRouterTransitionStart() {}
export function captureMessage() { return ""; }
export function captureException() { return ""; }
