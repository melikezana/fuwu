// Fixture only: never imported by the application or used for real reviews.
export async function submitProviderReviewAction(input: unknown) {
  window.dispatchEvent(new CustomEvent("fixture-review", { detail: input }));
  return { ok: true as const };
}
