"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
import { sanitizePhone, sanitizeText } from "@/lib/validations";

export async function saveCustomerDetails(form: FormData) {
  const { supabase, user } = await getServerAuthContext();
  if (!user || !supabase) redirect("/login?next=%2Faccount");
  const action = String(form.get("action") ?? "");
  let failed = true;
  if (action === "address") {
    const district = String(form.get("districtId") ?? "");
    const label = sanitizeText(String(form.get("label") ?? ""), 60);
    const address = sanitizeText(String(form.get("address") ?? ""), 1000);
    if (isUuid(district) && label && address.length >= 10) {
      const { data: area } = await supabase.from("districts").select("id").eq("id", district).eq("is_active", true).maybeSingle();
      if (area) {
        const { error } = await supabase.from("customer_addresses").insert({ customer_id: user.id, label, district_id: district, address });
        failed = Boolean(error);
      }
    }
  } else if (action === "delete_address") {
    const id = String(form.get("id") ?? "");
    if (isUuid(id)) { const { error } = await supabase.from("customer_addresses").delete().eq("id", id).eq("customer_id", user.id); failed = Boolean(error); }
  } else if (action === "profile") {
    const fullName = sanitizeText(String(form.get("fullName") ?? ""), 120);
    const phone = sanitizePhone(String(form.get("phone") ?? ""));
    if (fullName.length >= 2 && (!phone || /^\+?[0-9]{10,15}$/.test(phone))) {
      const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", user.id);
      failed = Boolean(error);
    }
  }
  revalidatePath("/account"); revalidatePath("/dashboard");
  redirect(`/account?view=${action === "profile" ? "settings" : "addresses"}&result=${failed ? "failed" : "saved"}`);
}
