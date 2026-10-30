import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { getAdminAccess } from "@/services/admin";
import { getPrelaunchSnapshot } from "@/services/admin/prelaunch";
export const dynamic = "force-dynamic";
export default async function InterestPage() {
 const access = await getAdminAccess();
 if (!access.ok) return <AdminAccessGate access={access} />;
 const data = await getPrelaunchSnapshot();
 return <AdminAccessGate access={access}><AdminPageShell active="interest" title="Müşteri İlgisi" description="İletişim izni bulunan açılış kayıtları."><section className="commerce-panel">{data ? <><h2>İzinli müşteri ön kayıtları</h2><strong className="control-score">{data.interest}</strong><p>İznini geri çeken kayıtlar bu sayıya dahil edilmez.</p></> : <p role="alert">Ön kayıt verileri okunamadı. Kayıt sayısı bilinmiyor.</p>}</section></AdminPageShell></AdminAccessGate>;
}
