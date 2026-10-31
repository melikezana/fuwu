import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ensureTestUserRole, getTestAdminClient, loginWithEmailMagicLink, skipUnlessLocalSupabase, uniqueE2EEmail } from "./helpers";

test("private document upload, owner/admin download, foreign-user denial and access audit", async ({ page, browser }) => {
 skipUnlessLocalSupabase(); // Production and unclassified project URLs are rejected.
 const db = getTestAdminClient(), email = uniqueE2EEmail("document-owner");
 const owner = await ensureTestUserRole(email, "provider");
 const { data: category, error: categoryError } = await db.from("service_categories").select("id").eq("is_active", true).limit(1).single();
 const { data: district, error: districtError } = await db.from("districts").select("id").eq("is_active", true).limit(1).single();
 expect(categoryError).toBeNull(); expect(districtError).toBeNull();
 const applicationId = crypto.randomUUID(), providerId = crypto.randomUUID();
 const provider = await db.from("providers").insert({ id: providerId, user_id: owner, name: "E2E Document Owner", phone: "+905550009999", description: "E2E synthetic provider for private document transport only.", category_id: category!.id, district_id: district!.id, is_active: true, is_approved: true });
 expect(provider.error).toBeNull();
 const application = await db.from("provider_applications").insert({ id: applicationId, user_id: owner, full_name: "E2E Document Owner", phone: "+905550009999", category_id: category!.id, district_id: district!.id, status: "approved" });
 expect(application.error).toBeNull();
 await loginWithEmailMagicLink(page, { email, role: "provider", nextPath: "/provider-dashboard/profile" });
 const bytes = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
 const form = page.locator("#documents");
 await form.getByLabel("Belge türü", { exact: true }).selectOption("qualification");
 await form.getByLabel("Dosya", { exact: true }).setInputFiles({ name: "E2E-synthetic.pdf", mimeType: "application/pdf", buffer: bytes });
 await form.getByRole("button", { name: "İncelemeye gönder", exact: true }).click();
 await expect(form.getByRole("status")).toContainText("Belgen alındı.");
 const document = await db.from("provider_document_versions").select("id,storage_path,status,owner_id").eq("application_id", applicationId).single();
 expect(document.error).toBeNull(); expect(document.data).toMatchObject({ owner_id: owner, status: "uploaded" });
 const upload = await db.from("provider_document_uploads").select("sha256,scan_status").eq("path", document.data!.storage_path).single();
 expect(upload.error).toBeNull(); expect(upload.data?.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
 expect(upload.data?.scan_status).toBe("unavailable"); // Never advertise a completed malware scan.
 const url = `/api/provider-documents/${document.data!.id}`;
 const download = await page.request.get(url, { maxRedirects: 0 });
 expect(download.status()).toBe(303); expect(download.headers()["cache-control"]).toBe("private, no-store");
 const file = await page.request.get(download.headers().location);
 expect(file.ok()).toBe(true); expect(await file.body()).toEqual(bytes);
 const otherContext = await browser.newContext();
 try {
  const other = await otherContext.newPage(); await other.goto("/login");
  expect((await other.request.get(url, { maxRedirects: 0 })).status()).toBe(401);
  await loginWithEmailMagicLink(other, { email: uniqueE2EEmail("document-stranger") });
  const denied = await other.request.get(url, { maxRedirects: 0 });
  expect(denied.status()).toBe(403); expect(denied.headers().location).toBeUndefined();
  await loginWithEmailMagicLink(other, { email: uniqueE2EEmail("document-admin"), role: "admin", nextPath: "/admin" });
  expect((await other.request.get(url, { maxRedirects: 0 })).status()).toBe(303);
 } finally { await otherContext.close(); }
 const audit = await db.from("audit_logs").select("id,actor_user_id").eq("entity_id", document.data!.id).eq("action", "trust.document.access");
 expect(audit.error).toBeNull(); expect(audit.data).toHaveLength(2);
 // Keep synthetic evidence in the isolated project; never cascade-delete accounts/history.
});
