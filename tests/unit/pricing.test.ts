import { describe, expect, it } from "vitest";
import { calculatePrice, percentToBps, FEE_TERMS_VERSION } from "@/lib/commerce/pricing";
import { providerNetEntitlement, type ProviderFinance } from "@/lib/commerce/finance";

describe("minor-unit pricing", () => {
  it("charges 10% provider commission and zero customer fee by default", () => {
    expect(calculatePrice(85000)).toEqual({ service_price_minor:85000, customer_fee_minor:0, total_minor:85000, commission_minor:8500, provider_gross_minor:76500, provider_commission_bps:1000, customer_fee_bps:0, terms_version:FEE_TERMS_VERSION });
  });
  it("keeps a configured customer fee separate from provider commission", () => {
    expect(calculatePrice(10000,1000,500)).toMatchObject({ total_minor:10500, commission_minor:1000, customer_fee_minor:500, provider_gross_minor:9000 });
  });
  it.each([-1,0,1.5,NaN,Infinity,100_000_001,Number.MAX_SAFE_INTEGER])("rejects invalid service price %s", n => expect(()=>calculatePrice(n)).toThrow("invalid_price"));
  it.each([-1,10001,1.5,NaN,Infinity])("rejects invalid rate %s on either side", n => {
    expect(()=>calculatePrice(100,n)).toThrow("invalid_price");
    expect(()=>calculatePrice(100,1000,n)).toThrow("invalid_price");
  });
  it("rounds half a kuruş up independently and conserves every kuruş", () => {
    expect(calculatePrice(5)).toMatchObject({ commission_minor:1, provider_gross_minor:4 });
    expect(calculatePrice(4)).toMatchObject({ commission_minor:0, provider_gross_minor:4 });
    for(const price of [1,5,999,85000,100_000_000]) for(const rate of [0,1,3333,10000]) {
      const q=calculatePrice(price,rate,rate);
      expect(q.commission_minor+q.provider_gross_minor).toBe(price);
      expect(q.total_minor).toBe(price+q.customer_fee_minor);
      expect(Number.isSafeInteger(q.total_minor)).toBe(true);
    }
  });
  it("prices an externally discounted service amount; full refund basis is total including customer fee", () => {
    const q=calculatePrice(9000,1000,500);
    expect(q.commission_minor).toBe(900); expect(q.total_minor).toBe(9450);
    // There is no coupon/discount engine in FUWU. This asserts only the supplied basis.
    expect(q.provider_gross_minor+q.commission_minor+q.customer_fee_minor).toBe(q.total_minor);
  });
  it.each([["10",1000],["0",0],["1,25",125],["100.00",10000],[" 0.01 ",1],["100.01",null],["-1",null],["NaN",null],["1e2",null],["",null],["1.001",null]])("parses percent %s exactly", (value,result)=>expect(percentToBps(value as string)).toBe(result));
  it("does not invent provider net revenue when processor costs are unknown or inconsistent",()=>{
    const finance={provider_gross_minor:9000,provider_processor_fee_minor:150,unconfirmed_provider_fee_count:0} as ProviderFinance;
    expect(providerNetEntitlement(finance)).toBe(8850);
    for(const patch of [{unconfirmed_provider_fee_count:1},{provider_processor_fee_minor:undefined},{provider_processor_fee_minor:-1},{provider_processor_fee_minor:9001},{provider_processor_fee_minor:1.5}]) expect(providerNetEntitlement({...finance,...patch})).toBeNull();
  });
});
