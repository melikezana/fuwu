"use client";
import { useActionState } from "react";
import { trustAdminAction } from "@/app/admin/verifications/actions";
import type { DocumentRule } from "@/lib/trust/types";
type Option = { id: string; name: string };
export function DocumentRuleEditor({ categories, providers, types, rule }: { categories: Option[]; providers: Option[]; types: { code: string; label: string }[]; rule?: DocumentRule }) {
 const [state, save, busy] = useActionState(trustAdminAction, { ok: false, message: "" });
 return <form action={save} className="trust-decision"><input type="hidden" name="kind" value="rule" /><input type="hidden" name="ruleId" value={rule?.id || ""} />
 <label className="commerce-field">Belge türü<select name="documentType" defaultValue={rule?.document_type || ""} required disabled={busy}><option value="" disabled>Belge seç</option>{types.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}</select></label>
 <label className="commerce-field">Kategori<select name="category" defaultValue={rule?.category_id || ""} disabled={busy}><option value="">Tüm kategoriler</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label className="commerce-field">Kapsama giren usta<select name="provider" defaultValue={rule?.provider_id || ""} disabled={busy}><option value="">Kategorideki tüm ustalar</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <p className="commerce-help">Alt meslek, iş kapsamı, yetkili servis iddiası ve muafiyetleri kişi bazında değerlendir. Tüm ustaları ancak aynı zorunluluk geçerliyse seç.</p>
 <label className="commerce-field">Aşama<select name="stage" defaultValue={rule?.stage || "publication"} disabled={busy}><option value="application">İlk başvuru (bilgilendirme)</option><option value="publication">Yayın öncesi</option><option value="payment">Satış ve ödeme öncesi</option></select></label>
 <label className="commerce-field">Kapsam ve kabul edilen eşdeğerler<textarea name="scope" defaultValue={rule?.scope || ""} maxLength={2000} rows={3} required disabled={busy} /></label>
 <label className="commerce-field">Kural sürümü<input name="ruleVersion" defaultValue={rule?.regulatory_rule_version || ""} maxLength={120} required disabled={busy} /></label>
 <label className="commerce-field">Resmî kaynak bağlantısı<input type="url" name="sourceUrl" defaultValue={rule?.source_url || ""} required disabled={busy} /></label>
 <label className="commerce-field">Yürürlük tarihi<input type="date" name="effectiveDate" defaultValue={rule?.effective_date || ""} required disabled={busy} /></label>
 <label className="commerce-field">Hukuki inceleme<select name="legalStatus" defaultValue={rule?.legal_status || "draft"} disabled={busy}><option value="draft">Tamamlanmadı / taslak</option><option value="approved">Tamamlandı ve onaylandı</option><option value="retired">Kullanımdan kaldırıldı</option></select></label>
 <label><input type="checkbox" name="required" defaultChecked={rule?.required} disabled={busy} /> Yayından / satıştan önce gerekli</label><label><input type="checkbox" name="enabled" defaultChecked={rule?.enabled} disabled={busy} /> Kural etkin</label>
 <label className="commerce-field">Gerekçe ve hukuki inceleme notu<textarea name="reason" minLength={10} maxLength={1000} required rows={3} disabled={busy} /></label>
 {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}<button className="commerce-button" disabled={busy}>{busy ? "Kaydediliyor…" : "Kuralı kaydet"}</button></form>;
}
export function DocumentTypeEditor() {
 const [state, save, busy] = useActionState(trustAdminAction, { ok: false, message: "" });
 return <form action={save} className="trust-decision"><input type="hidden" name="kind" value="document_type" /><label className="commerce-field">Türün sabit kısa adı<input name="code" pattern="[a-z_]{3,60}" required disabled={busy} /></label><label className="commerce-field">Ustanın göreceği belge adı<input name="label" minLength={3} maxLength={120} required disabled={busy} /></label><label className="commerce-field">Amaç<select name="purpose" disabled={busy}><option value="professional">Mesleki</option><option value="business">Ticari</option><option value="identity">Kimlik</option><option value="payment">Ödeme kuruluşu</option></select></label><label className="commerce-field">Saklama değerlendirme süresi (gün)<input name="retentionDays" type="number" min={1} max={3650} required disabled={busy} /></label><label><input type="checkbox" name="enabled" defaultChecked disabled={busy} /> Tür kullanılabilir</label><label className="commerce-field">Gerekçe<textarea name="reason" minLength={10} maxLength={1000} required disabled={busy} /></label>{state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}<button className="commerce-button" disabled={busy}>Belge türünü kaydet</button></form>;
}
