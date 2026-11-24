import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { getAdminAccess } from "@/services/admin";
import { SETTING_DEFS, getAdminSettings } from "@/services/admin/settings";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { SettingsForm } from "./SettingsForm";
import { getIntermediaryParty } from "@/services/legal/intermediary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ayarlar | Admin",
  description: "FUWU platform ayarları.",
};

export default async function AdminSettingsPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl("/admin/settings"));
  }
  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const [{ values, error }, intermediary] = await Promise.all([getAdminSettings(), getIntermediaryParty()]);

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="settings"
        breadcrumbLabel="Ayarlar"
        description="Komisyon oranı, destek iletişimi ve platform genel ayarları."
        error={error}
        title="Ayarlar"
      >
        {!error && <p className={intermediary.ready ? "commerce-notice" : "commerce-warning"} role="status">{intermediary.ready ? "Ön bilgilendirme formu için FUWU bilgileri tamam; siparişler alınabilir." : "Sipariş alınamaz: ön bilgilendirme formu için FUWU'nun adı, vergi kimlik no (ya da MERSİS), açık adres, telefon ve e-postası aşağıda \"Yasal ·\" alanlarına girilmeli. Bu bilgiler sözleşmede ve fuwu.com.tr/on-bilgilendirme-formu sayfasında herkese görünür."}</p>}
        {!error && <SettingsForm defs={SETTING_DEFS} values={values} />}
      </AdminPageShell>
    </AdminAccessGate>
  );
}
