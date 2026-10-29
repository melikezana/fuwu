import { describe, expect, it } from "vitest";
import { assessProviderQuality } from "@/lib/providers/quality";
import { getProviderTrustBadges } from "@/lib/providers/trust";
const profile = { name: "Örnek Usta", description: "Su tesisatı bakım ve musluk montajı hizmeti sunuyorum.", category_id: "plumbing", district_id: "kadikoy", experience_years: 10, rating: 0, review_count: 0 };
describe("P1 provider publication quality signals", () => {
  it("preserves normal Turkish text without claiming it is verified", () => { const before = JSON.stringify(profile); expect(assessProviderQuality(profile)).toEqual([]); expect(JSON.stringify(profile)).toBe(before); });
  it.each(["aaaaaaa", "shshshshshsh", "asdf qwer", "bakım bakım bakım bakım"])("queues nonsense: %s", description => expect(assessProviderQuality({ ...profile, description })).toContain("repeated_text"));
  it("queues test, abusive, incomplete, conflicting experience and false trust claims", () => {
    expect(assessProviderQuality({ ...profile, name: "TEST Usta", description: "aptal" })).toEqual(expect.arrayContaining(["test_profile", "abusive_text", "missing_service"]));
    expect(assessProviderQuality({ ...profile, description: "25 yıllık deneyimimle tesisat hizmetleri veriyorum." })).toContain("experience_claim");
    expect(assessProviderQuality({ ...profile, is_verified: true, identity_verified: false })).toContain("verification_claim");
    expect(assessProviderQuality({ ...profile, description: "FUWU onaylı doğrulanmış usta hizmeti sunuyoruz." })).toContain("verification_claim");
  });
  it("flags aggregate mismatch without equating unavailable evidence with zero", () => {
    expect(assessProviderQuality({ ...profile, rating: 5, review_count: 20, actual_review_count: 0, actual_rating: 0 })).toContain("rating_mismatch");
    expect(assessProviderQuality({ ...profile, rating: 4.8, review_count: 12 })).not.toContain("rating_mismatch");
  });
  it("never emits the verified-master badge from a legacy flag alone", () => {
    expect(getProviderTrustBadges({ isVerified: true, identityVerified: false }).map(b => b.id)).not.toContain("fuwu-approved");
    expect(getProviderTrustBadges({ isVerified: true, identityVerified: true }).map(b => b.id)).toContain("fuwu-approved");
    expect(getProviderTrustBadges({})).toEqual([]);
  });
});
