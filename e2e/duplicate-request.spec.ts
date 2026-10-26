import { expect, test } from "@playwright/test";

test("opening a legacy buying link twice never submits a service request", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && request.url().includes("/request")) mutations.push(request.url()); });
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto("/request?service=tesisat");
    await expect(page).toHaveURL(/\/services\?category=tesisat$/);
  }
  expect(mutations).toEqual([]);
});
