import { getServerAuthContext } from "@/services/auth/server";
import { ApplicationDocuments } from "./ApplicationDocuments";
import { PartnerDocumentUpload } from "./PartnerDocumentUpload";
export async function PartnerDocuments() {
 const { supabase, user } = await getServerAuthContext(); if (!supabase || !user) return null;
 const [{ data: a, error }, { data: types, error: typesError }] = await Promise.all([
  supabase.from("provider_applications").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  supabase.from("provider_document_types").select("code,label").eq("enabled", true).neq("purpose", "payment"),
 ]);
 if (error || !a) return <p className="commerce-error" role="alert">Başvuru dosyan okunamadı. Hesap bağlantısını kontrol et.</p>;
 return <div className="trust-file"><ApplicationDocuments applicationId={a.id} />{typesError ? <p className="commerce-error" role="alert">Belge türleri okunamadı. Güvenli yükleme kurulumu kontrol edilmeli.</p> : <PartnerDocumentUpload types={types || []} />}</div>;
}
