import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function runVerification() {
  console.log("Launching browser for mobile verification...");
  const browser = await chromium.launch();

  // Mobile iPhone 14 view
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 3,
  });

  // Desktop 1440px view
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const mobilePage = await mobileContext.newPage();
  const desktopPage = await desktopContext.newPage();

  const baseUrl = "http://localhost:3018";

  console.log("Testing Mobile Home & Bottom Nav...");
  await mobilePage.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await mobilePage.screenshot({ path: ".verification-mobile-feel-home-mobile.png" });

  console.log("Testing Mobile Providers Page...");
  await mobilePage.goto(`${baseUrl}/providers`, { waitUntil: "networkidle" });
  await mobilePage.screenshot({ path: ".verification-mobile-feel-providers-mobile.png" });

  console.log("Testing Desktop 1440px Home Page (Zero Regression Check)...");
  await desktopPage.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await desktopPage.screenshot({ path: ".verification-mobile-feel-home-desktop.png" });

  await browser.close();
  console.log("Verification screenshots saved successfully!");
}

runVerification().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
