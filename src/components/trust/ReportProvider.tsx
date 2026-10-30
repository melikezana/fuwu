"use client";
import Link from "next/link";
import { useActionState } from "react";
import { reportProviderAccount } from "@/app/providers/[id]/trust-actions";
export function ReportProvider({ providerId, canReport }: { providerId: string; canReport: boolean }) {
 const [state, report, busy] = useActionState(reportProviderAccount, { ok: false, message: "" });
 return <details className="trust-document"><summary>Profil hakkında güvenlik bildirimi</summary>{canReport ? <form action={report} className="trust-decision"><input type="hidden" name="providerId" value={providerId} /><label className="commerce-field">Şüphenin gerekçesi<textarea name="reason" required minLength={10} maxLength={2000} rows={3} disabled={busy} /></label><p className="commerce-help">Kimlik numarası veya belge görseli yazma. Bildirim insan tarafından incelenir; tek başına suçlama doğrulaması değildir.</p>{state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}<button className="commerce-secondary" disabled={busy}>Güvenlik ekibine bildir</button></form> : <Link className="commerce-secondary" href={`/login?next=${encodeURIComponent(`/providers/${providerId}`)}`}>Bildirim için giriş yap</Link>}</details>;
}
