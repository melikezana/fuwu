"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag, UserRound } from "lucide-react";
import { appointment, money, orderLabels, paymentLabels } from "@/lib/commerce/display";
import { isHoldExpired, isOrderOverdue } from "@/lib/commerce/order-state";
import type { CommerceOrder } from "@/lib/commerce/types";
export type OrderCardDetails = { photo?: string; rebookHref?: string; reviewEligible?: boolean };
export function OrderList({ orders, unavailable, details = {}, audience = "customer" }: { orders: CommerceOrder[]; unavailable: boolean; details?: Record<string, OrderCardDetails>; audience?: "customer" | "provider" }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const initial = setTimeout(() => setNow(Date.now()), 0); const timer = setInterval(() => setNow(Date.now()), 30000); return () => { clearTimeout(initial); clearInterval(timer); }; }, []);
  if (unavailable) return <p role="alert" className="commerce-notice">Siparişlerinize şu anda ulaşılamıyor. Sayfayı yenileyerek yeniden deneyin.</p>;
  if (!orders.length) return <section className="commerce-empty"><ShoppingBag size={34} aria-hidden /><h2>Bu görünümde sipariş yok</h2><p>Satın alınan hizmetler ve randevularınız burada görünecek.</p><Link className="commerce-button" href={audience === "provider" ? "/provider-dashboard/store" : "/services"}>{audience === "provider" ? "Hizmet Mağazam" : "Hizmetleri İncele"} <ArrowRight size={18} aria-hidden /></Link></section>;
  return <div className="commerce-orders">{orders.map(order => {
    const detail = details[order.id];
    return <article className="commerce-order-card operations-order-card" key={order.id}><span className="commerce-status">{orderLabels[order.status]}</span>{now !== null && isOrderOverdue(order, now) && <p className="commerce-warning" role="status">Geciken hizmet · Planlanan bitiş saati geçti · hizmet takibi sürüyor</p>}{now !== null && isHoldExpired(order, now) && <p className="commerce-warning">Ödeme süresi doldu · ödeme sonucu kontrol ediliyor</p>}<h2>{order.service_name}</h2>{order.variant_name && <p>{order.variant_name}</p>}<div className="operations-order-provider">{detail?.photo ? <Image src={detail.photo} alt={`${order.provider_name} profil fotoğrafı`} width={44} height={44} unoptimized /> : <UserRound size={22} aria-hidden />}<span>{order.provider_name}</span></div><p>{appointment(order.starts_at)}</p><p className="operations-payment">{paymentLabels[order.payment_status]} · Sandbox</p>{audience === "provider" && <><p>{order.district_name} · {order.address}</p><p className="commerce-help">{order.scope}</p></>}<div className="operations-order-total"><strong>{money(order.total_minor)}</strong><Link className="commerce-text-link" href={`/orders/${order.id}`}>Sipariş Detayını Gör <ArrowRight size={17} aria-hidden /></Link></div>{audience === "customer" && order.status === "COMPLETED" && <div className="operations-card-actions">{detail?.rebookHref && <Link className="commerce-button" href={detail.rebookHref}>Yeniden Satın Al</Link>}<Link className="commerce-secondary" href={`/providers/${order.provider_id}`}>Ustayı İncele</Link>{detail?.reviewEligible && <Link className="commerce-secondary" href={`/orders/${order.id}#order-review`}>Değerlendir</Link>}{detail?.rebookHref && <p className="commerce-help">Güncel fiyat ve müsaitlik yeniden doğrulanır.</p>}</div>}</article>;
  })}</div>;
}
