import { test as base } from '@playwright/test';
import { cleanupTestProviders } from './helpers';
export * from '@playwright/test';
export const test = base.extend<{ fixtureCleanup: void }>({
  // Playwright requires a destructured first argument, even for dependency-free fixtures.
  fixtureCleanup: [async ({}, runFixture, info) => {
    try { await runFixture(); }
    finally { await cleanupTestProviders(info.testId); }
  }, { auto: true }],
});
