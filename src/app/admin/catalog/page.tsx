import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { getAdminAccess } from "@/services/admin";
import { getAdminCatalog } from "@/services/admin/catalog";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { CatalogManager } from "./CatalogManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hizmet Kataloğu | Admin",
  description: "Fuwu hizmet kategorileri ve ilçe yönetimi.",
};

export default async function AdminCatalogPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl("/admin/catalog"));
  }
  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const { categories, districts, error } = await getAdminCatalog();

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
        active="catalog"
        breadcrumbLabel="Hizmet Kataloğu"
        description="Hizmet kategorilerini ve ilçeleri ekle, yeniden adlandır veya aktif/pasif yap."
        error={error}
        title="Hizmet Kataloğu"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <CatalogManager
            addLabel="Yeni kategori adı"
            items={categories}
            table="service_categories"
            title="Hizmet Kategorileri"
          />
          <CatalogManager
            addLabel="Yeni ilçe adı"
            items={districts}
            table="districts"
            title="İlçeler"
          />
        </div>
      </AdminPageShell>
    </AdminAccessGate>
  );
}
