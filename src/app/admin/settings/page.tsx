import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { getAdminAccess } from "@/services/admin";
import { SETTING_DEFS, getAdminSettings } from "@/services/admin/settings";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ayarlar | Admin",
  description: "Fuwu platform ayarları.",
};

export default async function AdminSettingsPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl("/admin/settings"));
  }
  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const { values, error } = await getAdminSettings();

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="settings"
        breadcrumbLabel="Ayarlar"
        description="Komisyon oranı, destek iletişimi ve platform genel ayarları."
        error={error}
        title="Ayarlar"
      >
        <SettingsForm defs={SETTING_DEFS} values={values} />
      </AdminPageShell>
    </AdminAccessGate>
  );
}
