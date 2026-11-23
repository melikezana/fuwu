"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { appRoutes } from "@/lib/constants/navigation";
import { trackFilterUsed } from "@/services/analytics";

// En sık aranan ihtiyaçlar: tek dokunuşla doğru kategoriye gider, arama yazmak gerekmez.
const quickNeeds = [
  { label: "Su kaçağı, tıkanıklık", category: "tesisat" },
  { label: "Elektrik arızası", category: "elektrik-hizmeti" },
  { label: "Ev temizliği", category: "temizlik" },
  { label: "Kapıda kaldım", category: "cilingir" },
  { label: "Boya badana", category: "boya-badana" },
] as const;

export function HeroSearch({ categories, districts }: { categories: string[]; districts: string[] }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    trackFilterUsed({ category: "", district: String(formData.get("district") ?? ""), hasQuery: Boolean(String(formData.get("q") ?? "").trim()) });
  }
  return (
    <form action={appRoutes.catalog} aria-label="Hizmet arama" className="home-search" onSubmit={handleSubmit} role="search">
      <label className="sr-only" htmlFor="home-service-search">Ne lazım? Hizmeti ya da sorunu yaz</label>
      <div className="home-search-input">
        <Search aria-hidden className="size-5 shrink-0" />
        <input autoComplete="off" enterKeyHint="search" id="home-service-search" list="home-service-options" name="q" placeholder="Ne lazım? Örn. musluk damlatıyor" type="search" />
        <datalist id="home-service-options">{categories.map(category => <option key={category} value={category} />)}</datalist>
      </div>
      <div className="home-search-actions">
        <button className="home-search-submit" type="submit">Hizmetleri Keşfet <ArrowRight aria-hidden className="size-4 shrink-0" /></button>
        <Link className="home-join-link" href="/provider-application">Usta Ol</Link>
      </div>
      <div className="home-search-meta">
        <label className="home-search-location" htmlFor="home-district"><MapPin aria-hidden className="size-4 shrink-0" /><span className="sr-only">Hizmet alacağın İstanbul ilçesi</span><select aria-label="Hizmet alacağın İstanbul ilçesi" defaultValue="" id="home-district" name="district"><option value="">İstanbul · Tüm ilçeler</option>{districts.map(district => <option key={district} value={district}>{district}</option>)}</select></label>
        <span className="home-search-hint">İlçene göre keşfet</span>
      </div>
      <nav aria-label="Sık aranan ihtiyaçlar" className="home-quick-needs">
        {quickNeeds.map(need => <Link href={`${appRoutes.catalog}?${new URLSearchParams({ category: need.category })}`} key={need.category}>{need.label}</Link>)}
      </nav>
    </form>
  );
}
