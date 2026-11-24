"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return <button type="button" className="commerce-secondary" onClick={() => window.print()}><Printer size={17} aria-hidden /> Yazdır / PDF olarak kaydet</button>;
}
