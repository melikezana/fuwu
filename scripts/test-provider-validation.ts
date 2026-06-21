import { validateProviderApplicationInput } from "../src/lib/validations/providerSchemas";

const result = validateProviderApplicationInput({
  availability: "Tam zamanlı",
  categoryId: "11111111-1111-4111-8111-111111111111",
  districtId: "22222222-2222-4222-8222-222222222222",
  experienceYears: "5",
  fullName: "Opsiyonel Belgesiz Usta",
  hasEquipment: "true",
  introduction:
    "Bu başvuru doğrulama belgesi olmadan gönderilebilen geçerli bir test kaydıdır.",
  phone: "+905551112233",
  portfolioUrl: "",
});

if (!result.ok) {
  throw new Error(`Optional document validation failed: ${result.message}`);
}

if (
  result.data.verificationDocumentPath ||
  result.data.verificationDocumentUrl
) {
  throw new Error("Optional document fields should remain empty.");
}

console.log("Provider application optional document validation passed.");
