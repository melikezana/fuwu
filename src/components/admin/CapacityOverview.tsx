"use client";
import { useId, useState } from "react";
import type { CapacityRow } from "@/services/admin/prelaunch";

export function CapacityOverview({ rows, pilotOnly }: { rows: CapacityRow[]; pilotOnly: boolean }) {
  const id = useId();
  const districts = [...new Map(rows.map(row => [row.district_id, row.district])).entries()];
  const categories = [...new Map(rows.map(row => [row.category_id, row.category])).entries()];
  const [district, setDistrict] = useState(districts[0]?.[0] ?? "");
  const [category, setCategory] = useState("");
  const visible = rows.filter(row => row.district_id === district && (!category || row.category_id === category));
  return <section className="commerce-panel" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>Kategori ve ilçe kapasitesi</h2>
    <p className="commerce-help">{pilotOnly ? "Yalnızca mevcut pilot verileri okunabildi. Tüm bölgeler için güncel şema gerekiyor." : "Yayınlanan gerçek ustalar ve hizmet verdikleri ilçeler. Açık takvim, boş randevu garantisi değildir."}</p>
    {rows.length ? <>
      <div className="control-capacity-filters">
        <label className="commerce-field" htmlFor={`${id}-district`}>İlçe<select id={`${id}-district`} value={district} onChange={event => setDistrict(event.target.value)}>{districts.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label>
        <label className="commerce-field" htmlFor={`${id}-category`}>Hizmet kategorisi<select id={`${id}-category`} value={category} onChange={event => setCategory(event.target.value)}><option value="">Tüm kategoriler</option>{categories.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label>
      </div><p className="commerce-help" role="status">{visible.length} kategori gösteriliyor.</p>
      <div className="control-capacity-grid">{visible.map(row => <article key={`${row.district_id}-${row.category_id}`}>
        <h3>{row.category}</h3><dl><div><dt>Yayındaki usta</dt><dd>{row.published}</dd></div><div><dt>Hizmeti hazır usta</dt><dd>{row.stores}</dd></div><div><dt>Takvimi açık usta</dt><dd>{row.calendars}</dd></div><div><dt>İzinli müşteri ilgisi</dt><dd>{row.interest}</dd></div></dl>
        <p className="commerce-help">{row.stores === 0 ? "Bu bölgede hizmet arzı gerekiyor." : row.calendars === 0 ? "Çalışma takvimleri tamamlanmalı." : "Hizmet ve takvim mevcut."}</p>
      </article>)}</div>
    </> : <p role="status">Henüz aktif kategori ve ilçe eşleşmesi yok.</p>}
  </section>;
}
