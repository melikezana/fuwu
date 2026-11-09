import { createClient } from "@supabase/supabase-js";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { loadTestEnvironment } from "../scripts/testing/environment.mjs";
import { createHash, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";

export const hasLocalSupabaseE2E = loadTestEnvironment().safety.ready;

export function skipUnlessLocalSupabase() {
  test.skip(!hasLocalSupabaseE2E, "Local Supabase test env is not configured.");
}

export function uniqueE2EValue(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function uniqueE2EEmail(prefix: string) {
  return `${uniqueE2EValue(prefix)}@fuwu.test`;
}

type TestUserRole = "admin" | "customer" | "provider";
const createdTestUsers = new Map<string, string>();
const scopedProviders = new Map<string, Set<string>>();

export function registerTestProvider(id: string) {
  const key=test.info().testId;
  if(!scopedProviders.has(key)) scopedProviders.set(key,new Set());
  scopedProviders.get(key)!.add(id);
}

export async function cleanupTestProviders(testId: string) {
  const ids=[...(scopedProviders.get(testId)??[])];scopedProviders.delete(testId);
  if(!ids.length) return;
  // Exact IDs created by this test, never a name/phone search or another worker's data.
  // Preserve accounts, documents, orders and audit; the owned stack is discarded later.
  const db=getTestAdminClient();
  const hidden=await db.from("provider_publication_reviews").update({status:"hidden",record_kind:"test"}).in("provider_id",ids);expect(hidden.error).toBeNull();
  const audit=await db.from("audit_logs").insert(ids.map(id=>({entity_type:"provider",entity_id:id,action:"e2e.fixture.quarantined",metadata:{test_id:testId,synthetic:true}})));expect(audit.error).toBeNull();
}

export function getTestAdminClient() {
  if (!loadTestEnvironment().safety.ready) throw new Error("BLOCKED: isolated Supabase test target required");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Local Supabase service-role test env is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function ensureTestUserRole(email: string, role: TestUserRole) {
  if (!/^[a-z0-9._+-]+@fuwu\.test$/i.test(email)) throw new Error("BLOCKED: only synthetic fuwu.test identities are allowed");
  const admin = getTestAdminClient();
  let userId = createdTestUsers.get(email);
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: `E2E ${role}`,
      },
    });

    if (error) {
      throw error;
    }

    userId = data.user.id;
    createdTestUsers.set(email, userId);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: `E2E ${role}`,
      role,
    })
    .eq("id", userId);

  if (profileError) {
    throw profileError;
  }

  return userId;
}

export async function uniqueE2EPhone(): Promise<string> {
  const { data, error } = await getTestAdminClient().rpc("e2e_allocate_phone");
  if (error || typeof data !== "string" || !/^\+90559\d{7}$/.test(data)) throw new Error("Local fixture phone allocator is unavailable");
  return data;
}

// Create dedicated records; never borrow or change a seeded/another test's provider.
export async function createTestProvider(userId: string, options: { name?: string; categoryId?: string; districtId?: string } = {}) {
  const db = getTestAdminClient();
  // SLA tests own hidden categories. Never let their randomly sorted UUIDs
  // become the category of an unrelated public commerce fixture.
  const { data: category, error: ce } = await db.from("service_categories").select("id").eq("slug", "tesisat").eq("is_active", true).eq("is_visible",true).single();
  const { data: district, error: de } = await db.from("districts").select("id").eq("is_active", true).order("id").limit(1).single();
  expect(ce).toBeNull(); expect(de).toBeNull();
  const provider = { id: randomUUID(), user_id: userId, name: options.name ?? `E2E Provider ${randomUUID()}`, phone: await uniqueE2EPhone(), description: "E2E dedicated synthetic provider for isolated acceptance tests.", category_id: options.categoryId ?? category!.id, district_id: options.districtId ?? district!.id, is_active: true, is_approved: true };
  const { error } = await db.from("providers").insert(provider);
  expect(error).toBeNull();
  registerTestProvider(provider.id);
  return provider;
}

export async function authenticatedTestClient(page: Page) {
  if (!loadTestEnvironment().safety.ready) throw new Error("Unsafe test target");
  const cookies = await page.context().cookies();
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookies, setAll: () => { throw new Error("Unexpected fixture session refresh"); } },
  });
  const { data, error } = await client.auth.getUser();
  expect(error).toBeNull(); expect(data.user?.email).toMatch(/@fuwu\.test$/);
  return client;
}

export async function createCommerceFixture(ownerId: string) {
  const db = getTestAdminClient(), provider = await createTestProvider(ownerId);
  const serviceId = randomUUID(), offeringId = randomUUID();
  const prepared = await db.from("providers").update({ iyzico_submerchant_status: "active", iyzico_submerchant_key: `e2e-no-processor-${provider.id}` }).eq("id", provider.id);
  expect(prepared.error).toBeNull();
  const service = await db.from("service_catalog").insert({ id: serviceId, category_id: provider.category_id, slug: `e2e-${serviceId}`, name: `E2E Service ${serviceId}`, description: "E2E isolated service fixture.", scope: "E2E isolated scope.", image_url: "/images/services/plumbing-work.webp", pricing_type: "FIXED_PRICE" });
  expect(service.error).toBeNull();
  const offering = await db.from("provider_service_offerings").insert({ id: offeringId, provider_id: provider.id, service_id: serviceId, price_minor: 85000, duration_minutes: 60, district_ids: [provider.district_id], is_active: true });
  expect(offering.error).toBeNull();
  const hours = await db.from("provider_availability").insert(Array.from({ length: 7 }, (_, weekday) => ({ provider_id: provider.id, weekday, starts_at: "08:00", ends_at: "20:00" })));
  expect(hours.error).toBeNull();
  const review = await db.from("provider_publication_reviews").update({ status: "approved", record_kind: "real" }).eq("provider_id", provider.id);
  expect(review.error).toBeNull();
  return { provider, offeringId, serviceId, districtId: provider.district_id };
}

export async function createTrustFixture() {
  const email=uniqueE2EEmail("trust-customer"), providerEmail=uniqueE2EEmail("trust-provider");
  const customerId=await ensureTestUserRole(email,"customer"), ownerId=await ensureTestUserRole(providerEmail,"provider");
  const prepared=await createCommerceFixture(ownerId), id=randomUUID();
  const result=await getTestAdminClient().from("commerce_orders").insert({id,customer_id:customerId,provider_id:prepared.provider.id,offering_id:prepared.offeringId,service_name:"E2E Synthetic Trust Appointment",scope:"E2E synthetic service scope",provider_name:prepared.provider.name,district_id:prepared.districtId,district_name:"E2E District",address:"E2E isolated synthetic address 10",starts_at:new Date(Date.now()-5*60000).toISOString(),ends_at:new Date(Date.now()+55*60000).toISOString(),total_minor:85000,commission_minor:8500,provider_gross_minor:76500,status:"CONFIRMED",payment_status:"PAID",expires_at:new Date(Date.now()+3600000).toISOString(),idempotency_key:randomUUID()});
  expect(result.error).toBeNull();
  return {id,email,customerId,providerEmail,ownerId};
}

export async function expectUnavailableProfile(page: Page, id: string, name?: string) {
  const response=await page.goto(`/providers/${id}`);
  // The preserved custom not-found page returns 200; Next may stream a 404 UI
  // with 200 too. Assert absence of profile data and noindex, not status alone.
  expect([200,404]).toContain(response?.status());
  await expect(page.getByRole("heading",{name:"Usta bulunamadı",exact:true})).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content",/noindex/);
  if(name) await expect(page.getByRole("heading",{name,exact:true})).toHaveCount(0);
}

async function findLatestMagicLink(page: Page, email: string, requestedAt: number) {
  const mailpitUrl = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";
  const listResponse = await page.request.get(`${mailpitUrl}/api/v1/messages`);

  if (!listResponse.ok()) {
    return "";
  }

  const payload = (await listResponse.json()) as {
    messages?: Array<{
      Created?: string;
      ID?: string;
      To?: Array<{ Address?: string }>;
    }>;
  };
  const message = payload.messages?.find((candidate) => {
    const recipientMatches = candidate.To?.some(
      (recipient) =>
        recipient.Address?.toLocaleLowerCase("en") === email.toLocaleLowerCase("en"),
    );
    const createdAt = candidate.Created ? Date.parse(candidate.Created) : 0;

    return recipientMatches && createdAt >= requestedAt - 5_000;
  });

  if (!message?.ID) {
    return "";
  }

  const detailResponse = await page.request.get(
    `${mailpitUrl}/api/v1/message/${encodeURIComponent(message.ID)}`,
  );

  if (!detailResponse.ok()) {
    return "";
  }

  const detail = (await detailResponse.json()) as { HTML?: string; Text?: string };
  const htmlMatch = detail.HTML?.match(/href="([^"]+)"/i);
  const textMatch = detail.Text?.match(/https?:\/\/[^\s)]+/i);

  return (htmlMatch?.[1] ?? textMatch?.[0] ?? "").replaceAll("&amp;", "&");
}

export async function loginWithEmailMagicLink(
  page: Page,
  {
    email = uniqueE2EEmail("customer"),
    nextPath = "/account",
    role = "customer",
    existingUserId,
  }: {
    email?: string;
    nextPath?: string;
    role?: TestUserRole;
    existingUserId?: string;
  } = {},
) {
  skipUnlessLocalSupabase();
  if (existingUserId) {
    if (!/@fuwu\.test$/i.test(email)) throw new Error("BLOCKED: only synthetic existing identities are allowed");
    const { data, error } = await getTestAdminClient().auth.admin.getUserById(existingUserId);
    if (error || data.user?.email !== email) throw new Error("BLOCKED: prepared test identity does not match appointment");
    createdTestUsers.set(email, existingUserId);
  }
  await ensureTestUserRole(email, role);
  // Distinct synthetic clients must not share the one loopback IP quota. Keep
  // the real limiter enabled; use documentation-only IPv6 client addresses at
  // the already validated LOCAL app boundary (never a production request).
  const clientAddress=createHash("sha256").update(email).digest("hex").slice(0,24).match(/.{4}/g)!.join(":");
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `2001:db8:${clientAddress}` });
  const requestedAt = Date.now();

  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  const emailInput = page.locator('input[data-testid="login-email-input"]:visible');
  await expect(emailInput).toHaveCount(1);
  await emailInput.fill(email);
  await expect(emailInput).toHaveValue(email);
  // SMTP delivery can become visible before the Auth request has completed.
  // Do not consume a one-use email link until the real /otp call commits.
  const delivery=page.waitForResponse(response=>response.request().method()==="POST"&&response.url().startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL!+"/auth/v1/otp"));
  await page.locator('form[data-testid="email-login-form"]:visible').locator('button[type="submit"]').click();
  const delivered=await delivery;await delivered.finished();
  expect(delivered.status(),"Auth must accept the magic-link request before consuming Mailpit delivery").toBe(200);

  let magicLink = "";
  await expect
    .poll(
      async () => {
        magicLink = await findLatestMagicLink(page, email, requestedAt);
        return magicLink;
      },
      {
        timeout: 15_000,
      },
    )
    .not.toBe("");

  expect(new URL(magicLink).origin).toBe(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin);
  const verificationResponse = await page.request.get(magicLink, {
    maxRedirects: 0,
  });
  const callbackUrl = verificationResponse.headers().location;

  expect([302, 303]).toContain(verificationResponse.status());
  expect(callbackUrl).toContain("/auth/callback");
  expect(new URL(callbackUrl).origin).toBe(new URL(page.url()).origin);
  const callback = new URL(callbackUrl);
  expect(callback.searchParams.get("error_code"), "Auth verification must return a valid one-use PKCE code").toBeNull();
  expect(callback.searchParams.has("code"), "Auth verification did not issue a PKCE code").toBe(true);

  await page.goto(callbackUrl, { waitUntil: "domcontentloaded" });
  await expectAuthenticated(page);
  await page.goto(nextPath, { waitUntil: "domcontentloaded" });
  await expectAuthenticated(page);

  return email;
}

export async function expectAuthenticated(page: Page) {
  const response = await page.request.get("/api/auth/user");
  const body = await response.json();
  expect(response.status(), `Auth endpoint: ${body.error || "ok"}`).toBe(200);

  expect(body.authenticated).toBe(true);
}

export async function checkFirstInputByValue(
  page: Page,
  selector: string,
  valueIncludes: string,
) {
  const inputs = page.locator(selector);
  const count = await inputs.count();

  for (let index = 0; index < count; index += 1) {
    const input = inputs.nth(index);
    const value = await input.getAttribute("value");

    if (value?.toLocaleLowerCase("tr").includes(valueIncludes.toLocaleLowerCase("tr"))) {
      await input.check({ force: true });
      return;
    }
  }

  await inputs.first().check({ force: true });
}

export async function fillStandardLocksmithRequest(page: Page) {
  const suffix = uniqueE2EValue("request");

  await page.goto("/request");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId("request-form")).toBeVisible();
  await expect(
    page.getByTestId("request-form").locator('button[type="submit"]'),
  ).toBeEnabled();
  // The form is server-rendered and controlled after hydration. Waiting here
  // prevents React from replacing values entered into the pre-hydration DOM.
  await page.waitForTimeout(750);
  await checkFirstInputByValue(page, 'input[name="serviceCategory"]', "çilingir");
  await page.locator('input[name="district"]').fill("Kadıköy");
  await page.locator('input[name="fullAddress"]').fill(`E2E adres ${suffix}`);
  await page.locator('input[name="urgencyLevel"][value="Bu hafta"]').check({ force: true });
  await page.locator('input[name="budgetTag"]').first().check({ force: true });
  await page.locator('input[name="paymentPreference"][value="online_soon"]').check({ force: true });
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.locator('input[name="preferredDate"]').fill(futureDate);
  await page.locator('select[name="preferredTimeRange"]').selectOption({ index: 1 });
  await page.locator('textarea[name="shortDescription"]').fill(`E2E çilingir talebi ${suffix}`);
  await page.locator('input[name="fullName"]').fill("E2E Müşteri");
}

export async function submitStandardLocksmithRequest(page: Page) {
  await fillStandardLocksmithRequest(page);
  await page.getByTestId("request-form").locator('button[type="submit"]').click();
}

// Telefonu önceden doğrulanmış hesapta form, numara yazılınca kendiliğinden "Telefon doğrulandı" durumuna
// geçebilir (auth.getUser yanıtı doldurmadan sonra gelirse). Bu durumda "Telefonumu doğrula" düğmesi ekrandan
// kalkar; ona koşulsuz tıklamak test süresi dolana kadar bekler. İki yol da geçerlidir; sonuç her zaman doğrulanır.
export async function confirmApplicationPhone(form: Locator) {
  const verified = form.getByRole("button", { name: "Telefon doğrulandı", exact: true });
  const verify = form.getByRole("button", { name: "Telefonumu doğrula", exact: true });
  await expect(verified.or(verify)).toBeVisible();
  if (!(await verified.isVisible())) await verify.click({ timeout: 5_000 }).catch(() => undefined);
  await expect(verified).toBeVisible();
}

