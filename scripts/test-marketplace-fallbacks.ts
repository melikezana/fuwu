import assert from "node:assert/strict";

// This isolated process deliberately has no Supabase connection or user session.
async function main() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { getProviderDirectory, getProviderById } = await import("@/services/providers");
  const { getProviderReviews } = await import("@/services/reviews");
  const directory = await getProviderDirectory();
  assert.equal(directory.source, "fallback");
  assert.deepEqual(directory.providers, []);
  assert.deepEqual(directory.allProviders, []);
  assert.equal(directory.totalCount, 0);
  assert.equal(directory.filterOptions.capabilities.hasPrice, false);
  assert.equal(directory.filterOptions.capabilities.hasRating, false);
  assert.deepEqual(directory.filterOptions.averagePrices, []);
  assert.equal(await getProviderById("fallback-cilingir-kadikoy"), undefined);
  const reviews = await getProviderReviews("00000000-0000-4000-8000-000000000013");
  assert.equal(reviews.source, "fallback");
  assert.deepEqual(reviews.reviews, []);
  assert.deepEqual(reviews.summary, { averageRating: 0, reviewCount: 0 });
  console.log("Marketplace unavailable-data checks passed: no fabricated providers, ratings, prices or reviews.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
