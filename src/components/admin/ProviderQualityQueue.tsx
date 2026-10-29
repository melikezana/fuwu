import { assessProviderQuality, qualityLabels } from "@/lib/providers/quality";
import type { ProviderQualityRow } from "@/services/admin/provider-quality";
const labels = { pending_review: "İnceleme bekliyor", approved: "Yayın onaylı", changes_requested: "Düzeltme istendi", hidden: "Yayın durduruldu" };
export function ProviderQualityQueue({ rows, unavailable, action, feedback }: { rows: ProviderQualityRow[]; unavailable: boolean; action: (form: FormData) => void | Promise<void>; feedback?: string }) {
  return <section className="commerce-panel provider-quality" id="profile-quality" aria-labelledby="profile-quality-title">
    <h2 id="profile-quality-title">Profil kalite ve yayın incelemesi</h2>
    <p className="commerce-help">İçerik ve yayın onayı ayrı değerlendirilir. Sinyaller inceleme nedenidir; kullanıcı metni otomatik değiştirilmez. Profil değişirse yeniden onay gerekir.</p>
    {feedback && <p role={feedback === "saved" ? "status" : "alert"} className={feedback === "saved" ? "commerce-notice" : "commerce-error"}>{feedback === "saved" ? "İnceleme kararı kaydedildi." : "Karar kaydedilemedi. Profil değişmiş, kanıt eksik veya bağlantı kesilmiş olabilir. Sayfayı yenileyip tekrar kontrol et."}</p>}
    {unavailable ? <p className="commerce-warning" role="status">Kalite kuyruğu okunamadı. İncelenecek profil sayısı bilinmiyor. Şema ve yetkiler doğrulanmalı.</p> : <>
      <p className="commerce-help">{rows.filter(row => row.status === "pending_review").length} profil inceleme bekliyor · {rows.filter(row => assessProviderQuality(row).length).length} profilde kalite sinyali var.</p>
      {rows.length === 0 && <p>İncelenecek profil bulunmuyor.</p>}
      {rows.map(row => { const flags = assessProviderQuality(row); return <details className="quality-record" key={row.id} open={row.status === "pending_review"}>
        <summary><strong>{row.name || "Adsız profil"}</strong><span>{labels[row.status]}{flags.length > 0 ? ` · ${flags.length} inceleme nedeni` : ""}</span></summary>
        <p className="commerce-help">Profil kimliği: {row.id}</p>
        <blockquote className="quality-original">{row.description || "Hizmet açıklaması girilmemiş."}</blockquote>
        {flags.length > 0 ? <ul className="quality-reasons">{flags.map(flag => <li key={flag}>{qualityLabels[flag]}</li>)}</ul> : <p className="commerce-help">Otomatik sinyal yok. Yayın için insan incelemesi gerekir.</p>}
        <p className="commerce-help">Kayıtlı deneyim: {row.experience_years == null ? "Bilinmiyor" : `${row.experience_years} yıl · ustanın beyanı`}. Yorum kaydı: {row.actual_review_count ?? "Bilinmiyor"}.</p>
        {row.review_note && <p className="commerce-help">Son karar notu: {row.review_note}</p>}
        <form action={action} className="quality-form">
          <label className="commerce-field">Kayıt kaynağı<select name="recordKind" defaultValue={row.record_kind ?? "unclassified"}><option value="unclassified">Kaynak henüz doğrulanmadı</option><option value="real">Gerçek usta · kaynağını inceledim</option><option value="test">Test / demo · kamuya kapalı</option></select></label>
          <input type="hidden" name="providerId" value={row.id} /><input type="hidden" name="fingerprint" value={row.fingerprint} />
          <label className="commerce-field">İnceleme kararı<select aria-label="İnceleme kararı" name="status" defaultValue="changes_requested"><option value="changes_requested">Düzeltme iste</option><option value="approved">İçeriği inceledim, yayına onayla</option><option value="hidden">Yayını durdur</option><option value="pending_review">İnceleme kuyruğunda tut</option></select></label>
          <label className="commerce-field">Karar gerekçesi<textarea name="note" required minLength={10} maxLength={1000} rows={3} placeholder="İncelediğin bilgileri ve karar gerekçeni yaz." /></label>
          <label className="commerce-field">Doğrulama kanıtı referansı<input name="verificationReference" maxLength={500} aria-describedby={`evidence-${row.id}`} /><small id={`evidence-${row.id}`}>Doğrulama bayrağı varsa bu ustaya ait, belgesi incelenmiş onaylı başvurunun kimliği zorunlu. <a href="/admin/verifications">Doğrulama belgelerini incele</a>.</small></label>
          <button className="commerce-button" type="submit">İnceleme kararını kaydet</button>
        </form>
      </details>; })}
    </>}
  </section>;
}
