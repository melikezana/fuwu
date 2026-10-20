"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { appRoutes } from "@/lib/constants/navigation";
import { trackFilterUsed } from "@/services/analytics";

type HeroSearchProps = { categories: string[]; districts: string[] };

export function HeroSearch({ categories, districts }: HeroSearchProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    trackFilterUsed({
      category: "",
      district: String(formData.get("district") ?? ""),
      hasQuery: Boolean(String(formData.get("q") ?? "").trim()),
    });
  }
  return (
    <form action={appRoutes.providers} aria-label="Hizmet arama" className="home-search" onSubmit={handleSubmit} role="search">
      <label className="home-search-label" htmlFor="home-service-search">Hangi hizmete ihtiyacınız var?</label>
      <div className="home-search-row">
        <div className="home-search-input">
          <Search aria-hidden="true" className="size-5 shrink-0" />
          <input autoComplete="off" id="home-service-search" list="home-service-options" name="q" placeholder="Arayın…" type="search" />
          <datalist id="home-service-options">{categories.map((category) => <option key={category} value={category} />)}</datalist>
        </div>
        <button className="home-search-submit" type="submit">Hizmet Bul <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></button>
      </div>
      <div className="home-search-meta"><div className="home-search-location">
        <MapPin aria-hidden="true" className="size-4 shrink-0" />
        <label htmlFor="home-district">İstanbul</label><span aria-hidden="true">/</span>
        <select defaultValue="" id="home-district" name="district"><option value="">Tüm ilçeler</option>{districts.map((district) => <option key={district} value={district}>{district}</option>)}</select>
      </div><Link className="home-how-link" href={appRoutes.howItWorks}>Nasıl Çalışır? <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link></div>
    </form>
  );
}
