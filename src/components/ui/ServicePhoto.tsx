"use client";

import Image from "next/image";
import { useState } from "react";
import { Wrench } from "lucide-react";
import { getServicePhoto } from "@/lib/service-photos";

/** A verified profession photo, then an explicitly supplied photo, then a neutral icon. */
export function ServicePhoto({ keys, src, label, sizes, preload = false }: {
  keys: (string | undefined | null)[]; src?: string | null; label: string; sizes: string; preload?: boolean;
}) {
  const photo = getServicePhoto(...keys);
  const candidate = photo?.src || src || "";
  const [failedSource, setFailedSource] = useState("");
  if (!candidate || failedSource === candidate) return <div className="service-photo-placeholder" role="img" aria-label={`${label} · görsel henüz eklenmedi`}><Wrench size={32} aria-hidden /><span>{label}</span></div>;
  return <Image key={candidate} src={candidate} onError={() => setFailedSource(candidate)} alt={photo?.alt || `${label} hizmetini tanıtan temsili fotoğraf`} fill sizes={sizes} preload={preload} fetchPriority={preload ? "high" : undefined} style={{ objectFit: "cover", objectPosition: photo?.position || "50% 50%" }} />;
}
