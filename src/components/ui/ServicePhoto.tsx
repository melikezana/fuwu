"use client";

import Image from "next/image";
import { useState } from "react";
import { KeyRound, Leaf, PaintRoller, Scissors, Sparkles, Truck, Wrench } from "lucide-react";
import { resolveServicePhoto } from "@/lib/service-photos";

/** Prefer a precise service photo; show a semantic fallback instead of repeating another card photo. */
export function ServicePhoto({ keys, src, label, sizes, preload = false, placeholderOnly = false }: {
  keys: (string | undefined | null)[]; src?: string | null; label: string; sizes: string; preload?: boolean; placeholderOnly?: boolean;
}) {
  const photo = resolveServicePhoto(keys, src);
  const candidate = photo?.src || "";
  const serviceName = label.toLocaleLowerCase("tr-TR");
  const Icon = /çit|budama/.test(serviceName) ? Scissors : /çim|bahçe/.test(serviceName) ? Leaf : /boya/.test(serviceName) ? PaintRoller : /kilit|kapı aç/.test(serviceName) ? KeyRound : /nakli|taşıma/.test(serviceName) ? Truck : /temizlik|yıkama/.test(serviceName) ? Sparkles : Wrench;
  const [failedSource, setFailedSource] = useState("");
  if (placeholderOnly || !candidate || failedSource === candidate) return <div className="service-photo-placeholder" role="img" aria-label={`${label} · hizmet görseli`}><Icon size={32} aria-hidden /><span>{label}</span></div>;
  return <Image key={candidate} src={candidate} onError={() => setFailedSource(candidate)} alt={photo?.alt || `${label} hizmetini tanıtan temsili fotoğraf`} fill sizes={sizes} preload={preload} fetchPriority={preload ? "high" : undefined} style={{ objectFit: "cover", objectPosition: photo?.position || "50% 50%" }} />;
}
