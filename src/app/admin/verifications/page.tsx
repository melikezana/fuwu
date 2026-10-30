import Link from "next/link";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { TrustDecisionForm } from "@/components/admin/TrustDecisionForm";
import { getAdminAccess } from "@/services/admin";
import { getServerAuthContext } from "@/services/auth/server";
import { documentStatusLabels } from "@/lib/trust/types";
import type { DocumentRule } from "@/lib/trust/types";
import { DocumentRuleEditor, DocumentTypeEditor } from "@/components/admin/DocumentRuleEditor";
export const dynamic = "force-dynamic";
type Queue = { documents: { id: string; application_id: string; full_name: string; document_type: string; status: keyof typeof documentStatusLabels; expires_on: string | null }[]; cases: { id: string; order_id: string | null; provider_id: string | null; reporter_side: string; kind: string; reason: string; status: string }[]; overdue_confirmations: number; review_requests: number };
export default async function VerificationsPage() {
 const access = await getAdminAccess(); if (!access.ok) return <AdminAccessGate access={access} />;
 const { supabase } = await getServerAuthContext();
 const result = await supabase?.rpc("trust_admin_queue", {});
 const [types, rules, categories, providers] = await Promise.all([
  supabase?.from("provider_document_types").select("code,label"),
  supabase?.from("provider_document_rules").select("*"),
  supabase?.from("service_categories").select("id,name").order("name"),
  supabase?.from("providers").select("id,name").order("name").limit(200),
 ]);
 const queue = result?.data as unknown as Queue | null;
 const failed = result?.error || !queue || !Array.isArray(queue.documents) || !Array.isArray(queue.cases);
 return <AdminPageShell active="verifications" title="Güvenlik ve doğrulama" description="Belge incelemeleri, güvenlik olayları ve itirazlar mevcut dosyalarda takip edilir." error={failed ? "Güvence kuyruğu okunamadı. Şema ve bağlantı kontrol edilmeli; bu bir boş kuyruk sonucu değildir." : null}>
 <Link className="commerce-secondary" href="/admin/provider-applications">Başvuruları incele</Link>
 {!failed && queue && <><div className="trust-stats">{[["Kimlik incelemesi", queue.documents.filter(d => d.document_type === "identity" && ["uploaded", "in_review"].includes(d.status)).length], ["Mesleki inceleme", queue.documents.filter(d => d.document_type !== "identity" && ["uploaded", "in_review"].includes(d.status)).length], ["Süresi dolanlar", queue.documents.filter(d => d.expires_on && d.expires_on < new Date().toISOString().slice(0, 10)).length], ["İnceleme isteyen ustalar", queue.review_requests]].map(([label, count]) => <section className="commerce-panel" key={label}><h2>{label}</h2><strong>{count}</strong></section>)}</div>
 <section className="commerce-panel"><h2>Belge kuyruğu</h2>{queue.documents.length === 0 && <p>Belge kaydı yok.</p>}{queue.documents.map(d => <div className="trust-document trust-row" key={d.id}><div><strong>{d.full_name}</strong><p>{d.document_type} · {documentStatusLabels[d.status]}</p></div><Link className="commerce-secondary" href={`/admin/provider-applications/${d.application_id}`}>Dosyayı incele</Link></div>)}</section>
 <section className="commerce-panel"><h2>Şüpheli hesaplar, güvenlik olayları ve itirazlar</h2><p>48 saati aşan müşteri onayı: {queue.overdue_confirmations}. Destek taraflarla iletişim kurar; sessizlik onay sayılmaz.</p>{queue.cases.length === 0 && <p>Bildirim yok.</p>}{queue.cases.map(c => <details className="trust-document" key={c.id}><summary>{c.reporter_side === "provider" ? "Usta" : "Müşteri"} · {({ safety: "Güvenlik olayı", complaint: "Şikâyet", appeal: "İtiraz", no_show: "Randevuya gelinmedi", unreachable: "Ulaşılamıyor", suspicious_account: "Şüpheli hesap" } as Record<string, string>)[c.kind] || c.kind} · {c.status}</summary><p>{c.reason}</p>{c.order_id ? <Link href={`/orders/${c.order_id}`}>Siparişi aç</Link> : <Link href={`/admin/providers?id=${c.provider_id}`}>Usta dosyasını aç</Link>}<TrustDecisionForm kind="case" id={c.id} /></details>)}</section></>}
 <section className="commerce-panel"><h2>Belge kuralları</h2><p>Kuralı yalnızca kapsam, resmî kaynak, yürürlük tarihi ve hukuki inceleme tamamlandıktan sonra etkinleştir. Taslak kurallar ustalara zorunluluk getirmez.</p>{types?.error || rules?.error || categories?.error || providers?.error ? <p role="alert">Kural yapılandırması okunamadı.</p> : <><details><summary>Yeni kural ekle</summary><DocumentRuleEditor types={types?.data || []} categories={categories?.data || []} providers={providers?.data || []} /></details>{(rules?.data || []).map(rule => <details className="trust-document" key={rule.id}><summary>{rule.document_type} · {rule.regulatory_rule_version} · {rule.enabled ? "Etkin" : "Devre dışı"}</summary><DocumentRuleEditor rule={rule as DocumentRule} types={types?.data || []} categories={categories?.data || []} providers={providers?.data || []} /></details>)}</>}<details><summary>Belge türü ekle veya güncelle</summary><DocumentTypeEditor /></details></section></AdminPageShell>;
}
