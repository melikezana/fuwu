import { createHash } from "node:crypto";
import { expect, test } from "./fixtures";
import { authenticatedTestClient, ensureTestUserRole, expectUnavailableProfile, getTestAdminClient, loginWithEmailMagicLink, skipUnlessLocalSupabase, uniqueE2EEmail, uniqueE2EPhone } from "./helpers";
import { providerControlLabels } from "../src/lib/providers/control";

for (const documentType of ["qualification", "identity"] as const) {
test(`private ${documentType} document upload, review, owner/admin download, foreign-user denial and audit`, async ({ page, browser }) => {
 test.setTimeout(120_000);
 skipUnlessLocalSupabase(); // Production and unclassified project URLs are rejected.
 const db = getTestAdminClient(), email = uniqueE2EEmail("document-owner");
 const owner = await ensureTestUserRole(email, "provider");
 const { data: category, error: categoryError } = await db.from("service_categories").select("id").eq("is_active", true).limit(1).single();
 const { data: district, error: districtError } = await db.from("districts").select("id").eq("is_active", true).limit(1).single();
 expect(categoryError).toBeNull(); expect(districtError).toBeNull();
 const phone = await uniqueE2EPhone();
 const applicationId = crypto.randomUUID(), providerId = crypto.randomUUID();
 const provider = await db.from("providers").insert({ id: providerId, user_id: owner, name: "E2E Document Owner", phone, description: "E2E synthetic provider for private document transport only.", category_id: category!.id, district_id: district!.id, is_active: true, is_approved: true });
 expect(provider.error).toBeNull();
 const application = await db.from("provider_applications").insert({ id: applicationId, user_id: owner, full_name: "E2E Document Owner", phone, category_id: category!.id, district_id: district!.id, status: "approved" });
 expect(application.error).toBeNull();
 await loginWithEmailMagicLink(page, { email, role: "provider", nextPath: "/provider-dashboard/profile" });
 const bytes = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
 const form = page.locator("#documents:visible");
 await form.getByLabel("Belge türü", { exact: true }).selectOption(documentType);
 await form.getByLabel("Dosya", { exact: true }).setInputFiles({ name: "E2E-invalid.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a PDF") });
 await form.getByRole("button", { name: "İncelemeye gönder", exact: true }).click();
 await expect(form.getByRole("alert")).toContainText("eşleşmeli");
 await expect(form.getByLabel("Belge türü", { exact: true })).toHaveValue(documentType);
 expect(await form.getByLabel("Dosya", { exact: true }).evaluate((input: HTMLInputElement) => input.files?.[0]?.name)).toBe("E2E-invalid.pdf");
 await form.getByLabel("Dosya", { exact: true }).setInputFiles({ name: "E2E-too-large.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
 await form.getByRole("button", { name: "İncelemeye gönder", exact: true }).click();
 await expect(form.getByRole("alert")).toContainText("5 MB");
 await expect(form.getByLabel("Belge türü", { exact: true })).toHaveValue(documentType);
 await form.getByLabel("Dosya", { exact: true }).setInputFiles({ name: "E2E-synthetic.pdf", mimeType: "application/pdf", buffer: bytes });
 await form.getByRole("button", { name: "İncelemeye gönder", exact: true }).click();
 await expect(form.getByRole("status")).toContainText("Belgen alındı.");
 const document = await db.from("provider_document_versions").select("id,storage_path,status,owner_id").eq("application_id", applicationId).single();
 expect(document.error).toBeNull(); expect(document.data).toMatchObject({ owner_id: owner, status: "uploaded" });
 const upload = await db.from("provider_document_uploads").select("sha256,scan_status").eq("path", document.data!.storage_path).single();
 expect(upload.error).toBeNull(); expect(upload.data?.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
 expect(upload.data?.scan_status).toBe("unavailable"); // Never advertise a completed malware scan.
 const ownerClient=await authenticatedTestClient(page);
 const selfReview=await ownerClient.rpc("trust_review_document",{p_id:document.data!.id,p_version:1,p_status:"approved",p_reason:"E2E owner must never approve their own document"});expect(selfReview.error).not.toBeNull();
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
  const foreignClient=await authenticatedTestClient(other), foreignObject=await foreignClient.storage.from("provider-verification-documents").download(document.data!.storage_path);expect(foreignObject.error).not.toBeNull();
  await loginWithEmailMagicLink(other, { email: uniqueE2EEmail("document-admin"), role: "admin", nextPath: "/admin" });
  const adminDownload=await other.request.get(url,{maxRedirects:0});expect(adminDownload.status()).toBe(303);
  expect(await (await other.request.get(adminDownload.headers().location)).body()).toEqual(bytes);
  await other.goto(`/admin/provider-applications/${applicationId}`);
  const doc=other.locator("article.trust-document:visible");await doc.getByText("Belgeyi incele",{exact:true}).click();
  await doc.getByLabel("Karar",{exact:true}).selectOption("approved");await doc.getByLabel("Gerekçe ve düzeltme yolu",{exact:true}).fill("E2E synthetic professional document reviewed by a different admin.");
  await doc.getByRole("button",{name:"Kararı kaydet",exact:true}).click();
  await other.getByRole("dialog").getByRole("button",{name:"Kararı onayla",exact:true}).click();
  await expect.poll(async()=>(await db.from("provider_document_versions").select("status").eq("id",document.data!.id).single()).data?.status).toBe("approved");
  const verified=await db.from("providers").select("is_verified,identity_verified").eq("id",providerId).single();expect(verified.error).toBeNull();
  expect(documentType === "identity" ? verified.data?.identity_verified : verified.data?.is_verified).toBe(true);
  await other.reload(); await expect(other.locator("article.trust-document:visible")).toContainText("Onaylandı");
  const reviewed=await db.from("audit_logs").select("id").eq("entity_id",document.data!.id).eq("action","trust.document.reviewed");expect(reviewed.error).toBeNull();expect(reviewed.data).toHaveLength(1);
  if (documentType === "qualification") {
   // Upload requeues the application. A reviewed document does not replace
   // the separate account approval required by the verification action.
   other.once("dialog",dialog=>dialog.accept());await other.getByRole("button",{name:"Onayla",exact:true}).click();
   await expect(other.getByRole("status").filter({hasText:"Başvuru onaylandı."})).toBeVisible();
   await expect.poll(async()=>(await db.from("provider_applications").select("status").eq("id",applicationId).single()).data?.status).toBe("approved");
   for (const action of ["unverify", "verify"] as const) {
    await other.goto(`/admin/providers?id=${providerId}`);
    await other.getByRole("combobox", {name:"İşlem",exact:true}).selectOption(action);
    await other.getByRole("button", {name:"Kararı uygula",exact:true}).click();
    const decision=other.getByRole("dialog");await decision.getByLabel("Kısa gerekçe").fill("E2E reversible verification decision with reviewed synthetic evidence.");
    if(action === "verify") await decision.getByLabel("Onaylı başvuru kimliği").fill(applicationId);
    await decision.getByRole("button",{name:providerControlLabels[action]+" · Onayla",exact:true}).click();
    await expect(other.getByRole("status").filter({hasText:"İşlem kaydedildi."})).toBeVisible();
    expect((await db.from("providers").select("is_verified").eq("id",providerId).single()).data?.is_verified).toBe(action === "verify");
    await expect(other.locator(".control-history")).toContainText(providerControlLabels[action]);
    const audit=await db.from("audit_logs").select("id").eq("entity_id",providerId).eq("action","provider.control."+action);expect(audit.error).toBeNull();expect(audit.data).toHaveLength(1);
    const denied=await ownerClient.rpc("admin_provider_action",{p_provider_id:providerId,p_action:action,p_reason:"E2E owner cannot make admin decisions",p_expected_version:"a".repeat(32),p_request_id:crypto.randomUUID()});expect(denied.error).not.toBeNull();
   }
  }
  // Document approval must never accidentally publish an unreviewed profile.
  const anonymousContext=await browser.newContext();try {await expectUnavailableProfile(await anonymousContext.newPage(),providerId);}finally{await anonymousContext.close();}
 } finally { await otherContext.close(); }
 const audit = await db.from("audit_logs").select("id,actor_user_id").eq("entity_id", document.data!.id).eq("action", "trust.document.access");
 expect(audit.error).toBeNull(); expect(audit.data).toHaveLength(2);
 const uploaded=await db.from("audit_logs").select("id").eq("entity_id",document.data!.id).eq("action","trust.document.uploaded");expect(uploaded.error).toBeNull();expect(uploaded.data).toHaveLength(1);
 // Keep synthetic evidence in the isolated project; never cascade-delete accounts/history.
});
}
