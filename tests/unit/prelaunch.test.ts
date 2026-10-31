import { describe, expect, it } from "vitest";
import { CONFIRMED_TEST_PROVIDER_IDS, isRealPublishedProvider, SEEDED_PROVIDER_IDS } from "@/lib/providers/provenance";
import { publicAnnouncement } from "@/lib/prelaunch";
describe("prelaunch public trust boundaries",()=>{
  it("blocks every repository seed ID even if it is mistakenly classified real",()=>{
    expect(SEEDED_PROVIDER_IDS).toHaveLength(13);
    for(const id of SEEDED_PROVIDER_IDS)expect(isRealPublishedProvider({id,record_kind:'real'})).toBe(false);
  });
  it("requires explicit real classification and fails closed on an older RPC response",()=>{
    const id='ac000000-0000-4000-8000-000000000001';
    expect(isRealPublishedProvider({id})).toBe(false);
    expect(isRealPublishedProvider({id,record_kind:'test'})).toBe(false);
    expect(isRealPublishedProvider({id,record_kind:'unclassified'})).toBe(false);
    expect(isRealPublishedProvider({id,record_kind:'real'})).toBe(true);
  });
  it("suppresses the legacy development message while retaining operational announcements",()=>{
    expect(publicAnnouncement('FUWU’yu GELİŞTİRİYORUZ')).toBe('');
    expect(publicAnnouncement('  Kadıköy operasyon saatleri güncellendi.  ')).toBe('Kadıköy operasyon saatleri güncellendi.');
  });
  it("hides owner-confirmed test profiles even when an RPC classifies them real",()=>{
    expect(CONFIRMED_TEST_PROVIDER_IDS).toHaveLength(4);
    for(const id of CONFIRMED_TEST_PROVIDER_IDS) {
      expect(isRealPublishedProvider({id,record_kind:'real'})).toBe(false);
      expect(isRealPublishedProvider({id:id.toUpperCase(),record_kind:'real'})).toBe(false);
    }
  });
});
