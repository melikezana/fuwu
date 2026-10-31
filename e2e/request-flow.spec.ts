import { expect, test } from "./fixtures";
import { getTestAdminClient, skipUnlessLocalSupabase } from "./helpers";

test.describe("direct purchase entry", () => {
  test("legacy links retain category and district in the service catalog", async ({ page }) => {
    await page.goto("/request?service=tesisat&district=Kad%C4%B1k%C3%B6y&offer_amount=1");
    await expect(page).toHaveURL(url => url.pathname === "/services" && url.searchParams.get("category") === "tesisat" && url.searchParams.get("district") === "Kadıköy" && !url.searchParams.has("offer_amount"));
    await expect(page.getByTestId("request-form")).toHaveCount(0);
  });
  test("home offers direct purchasing and provider onboarding", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Hizmetleri Keşfet", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evinin işi, FUWU'nun işi.", exact: true })).toBeVisible();
    await expect(page.getByRole("search", { name: "Hizmet arama" }).getByRole("link", { name: "Usta Ol", exact: true })).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
  });
  test("all eleven active categories retain district filters and expose the real catalog", async ({ page }) => {
    skipUnlessLocalSupabase();
    const slugs=["bahce-bakimi","boya-badana","cilingir","elektrik-hizmeti","hali-yikama","havuz-bakimi","klima-beyaz-esya","mobilya-montaj","nakliye-yardimi","temizlik","tesisat"];
    const categories=await getTestAdminClient().from("service_categories").select("id,name,slug,is_active").in("slug",slugs);expect(categories.error).toBeNull();expect(categories.data).toHaveLength(11);
    for(const category of categories.data!) {
      expect(category.is_active).toBe(true);
      expect((await page.goto(`/services?category=${category.slug}&district=Kad%C4%B1k%C3%B6y`))?.status()).toBe(200);
      await expect(page.getByRole("heading",{name:category.name,exact:true,level:1})).toBeVisible();
      await expect(page.getByRole("navigation",{name:"Hizmet kategorileri"}).locator('[aria-current="page"]')).toHaveAttribute("href",`/services?category=${category.slug}&district=Kad%C4%B1k%C3%B6y`);
      await expect(page.locator('.catalog-payment-note:visible')).toContainText("Online satın alma henüz açılmadı.");
      const links=await page.locator('.commerce-service-card:visible h3 a').evaluateAll(elements=>elements.map(element=>(element as HTMLAnchorElement).search));
      expect(links.every(query=>new URLSearchParams(query).get('district')==='Kadıköy')).toBe(true);
    }
  });
});
