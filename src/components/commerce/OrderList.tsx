"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { appointment, money, orderLabels } from "@/lib/commerce/display";
import type { CommerceOrder } from "@/lib/commerce/types";
export function OrderList({ orders, unavailable }: { orders: CommerceOrder[]; unavailable: boolean }) {
  const [now,setNow] = useState<number | null>(null);
  useEffect(() => { const timer=setInterval(() => setNow(Date.now()),1000); return () => clearInterval(timer); },[]);
  if (unavailable) return <p role="alert" className="commerce-notice">Siparişlerinize şu anda ulaşılamıyor. Lütfen daha sonra yeniden deneyin.</p>;
  if (!orders.length) return <section className="commerce-empty"><ShoppingBag size={34} aria-hidden /><h2>Henüz sipariş yok</h2><p>Satın aldığınız hizmetler ve randevularınız burada görünecek.</p><Link className="commerce-button" href="/services">Hizmetleri İncele <ArrowRight size={18} aria-hidden /></Link></section>;
  return <div className="commerce-orders">{orders.map(order => <Link className="commerce-order-card" href={`/orders/${order.id}`} key={order.id}><span className="commerce-status">{orderLabels[order.status === "PENDING_PAYMENT" && now !== null && Date.parse(order.expires_at) <= now ? "CANCELLED" : order.status]}</span><h2>{order.service_name}</h2><p>{order.provider_name} {order.variant_name && `· ${order.variant_name}`}</p><p>{appointment(order.starts_at)}</p><div><strong>{money(order.total_minor)}</strong><span>Siparişi Gör <ArrowRight size={17} aria-hidden /></span></div></Link>)}</div>;
}
