import {expect,it} from "vitest";
import {verificationDocumentContentType,validateProviderVerificationDocumentFile} from "@/services/storage/providerVerificationDocuments";
it("checks document size, empty content and magic bytes instead of trusting a PDF extension",async()=>{
  expect(validateProviderVerificationDocumentFile(new File([],"empty.pdf"))).not.toBeNull();
  expect(validateProviderVerificationDocumentFile(new File([new Uint8Array(5*1024*1024+1)],"large.pdf"))).not.toBeNull();
  expect(await verificationDocumentContentType(new File(["<script>alert(1)</script>"],"fake.pdf",{type:"application/pdf"}))).toBeNull();
  expect(await verificationDocumentContentType(new File(["%PDF-1.7\n"],"fixture.pdf"))).toBe("application/pdf");
  expect(await verificationDocumentContentType(new File([Uint8Array.from([0xff,0xd8,0xff])],"fixture.jpg"))).toBe("image/jpeg");
  expect(await verificationDocumentContentType(new File(["RIFF0000WEBP"],"fixture.pdf"))).toBeNull();
});
