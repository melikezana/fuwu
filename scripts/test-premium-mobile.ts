import assert from "node:assert/strict";
import { getServicePhoto } from "../src/lib/service-photos";
import { providerNetEntitlement, type ProviderFinance } from "../src/lib/commerce/finance";
import nextConfig from "../next.config";

assert.equal(getServicePhoto("havuz-bakimi")?.src,"/images/services/pool.webp");
assert.equal(getServicePhoto("hali-yikama")?.src,"/images/services/carpet.webp");
assert.equal(getServicePhoto("klima-bakimi","klima-beyaz-esya")?.src,"/images/services/climate.webp");
assert.equal(getServicePhoto("klima-beyaz-esya")?.src,"/images/services/appliance.webp");
assert.equal(getServicePhoto("unknown-service"),null);
const base: ProviderFinance={environment:"sandbox",completed_count:1,gross_minor:85000,commission_minor:8500,provider_gross_minor:76500,known_processor_fee_minor:250,unknown_fee_count:0,released_minor:0,pending_minor:76500,in_flight_count:0,provider_processor_fee_minor:250,unconfirmed_provider_fee_count:0};
assert.equal(providerNetEntitlement(base),76250);
assert.equal(providerNetEntitlement({...base,unconfirmed_provider_fee_count:1}),null);
assert.equal(providerNetEntitlement({...base,unconfirmed_provider_fee_count:undefined}),null);
for(const fee of [undefined,-1,1.5,NaN,Infinity,76501])assert.equal(providerNetEntitlement({...base,provider_processor_fee_minor:fee}),null);
assert.equal(providerNetEntitlement({...base,provider_processor_fee_minor:0}),76500);
console.log("Photo isolation and conservative provider entitlement checks passed.");

const originalDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
type BuildContext = Parameters<NonNullable<typeof nextConfig.webpack>>[1];
const aliases = (isServer: boolean) => {
  const config = { resolve: { alias: {} as Record<string,string> } };
  nextConfig.webpack!(config, { isServer } as BuildContext);
  return config.resolve.alias;
};
try {
  delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  assert.ok(aliases(false)["@sentry/nextjs$"].endsWith("sentry-disabled.ts"));
  assert.equal(aliases(true)["@sentry/nextjs$"], undefined);
  process.env.NEXT_PUBLIC_SENTRY_DSN = "test-configured-dsn-no-network";
  assert.equal(aliases(false)["@sentry/nextjs$"], undefined);
  assert.equal(aliases(true)["@sentry/nextjs$"], undefined);
  console.log("Monitoring: only unconfigured browser uses the no-op; configured browser and all server builds retain the SDK.");
} finally {
  if (originalDsn === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  else process.env.NEXT_PUBLIC_SENTRY_DSN = originalDsn;
}
