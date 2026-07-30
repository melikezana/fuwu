"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { useEffect, useRef, type PointerEvent } from "react";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import type { ServiceIconName } from "@/lib/constants/services";

type TiltServiceCardProps = {
  category: string;
  description: string;
  href: string;
  iconName: ServiceIconName;
  title: string;
};

function useReducedMotionRef() {
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mediaQuery.matches;

    function handleChange(event: MediaQueryListEvent) {
      reducedMotionRef.current = event.matches;
    }

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return reducedMotionRef;
}

export function LayeredHomeStack() {
  const stackRef = useRef<HTMLDivElement>(null);
  const reducedMotionRef = useReducedMotionRef();
  const baseTransform = "rotateX(52deg) rotateZ(-38deg)";

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reducedMotionRef.current || !stackRef.current) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    stackRef.current.style.transform = `rotateX(${52 - y * 12}deg) rotateZ(${-38 + x * 14}deg)`;
  }

  function resetTransform() {
    if (stackRef.current) {
      stackRef.current.style.transform = baseTransform;
    }
  }

  return (
    <div
      aria-label="FUWU'nun tek platform, doğrulanmış usta ve komisyonsuzluk sözünü anlatan katmanlı görsel"
      className="relative mx-auto flex min-h-[22rem] w-full max-w-[30rem] items-center justify-center sm:min-h-[28rem]"
      onPointerLeave={resetTransform}
      onPointerMove={handlePointerMove}
      role="img"
      style={{ perspective: "1400px" }}
    >
      <div
        className="relative h-64 w-64 transition-transform duration-200 ease-out sm:h-80 sm:w-80"
        ref={stackRef}
        style={{ transform: baseTransform, transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-[linear-gradient(145deg,#1F1F23,#17171A)] text-center shadow-[0_30px_70px_-26px_rgba(0,0,0,0.9)]"
          style={{ transform: "translateZ(0px)" }}
        >
          <span className="inline-flex size-12 items-center justify-center rounded-lg border border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF8A33]">
            <ServiceIcon className="size-6" name="home" />
          </span>
          <span className="text-sm font-bold text-[#F9F8F5]">Ev Hizmetleri</span>
          <span className="font-mono text-[0.68rem] font-semibold uppercase text-[#F9F8F5]/40">
            Tek platform
          </span>
        </div>

        <div
          className="absolute inset-[11%] flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-[linear-gradient(145deg,#23231F,#1A1A17)] text-center shadow-[0_24px_56px_-24px_rgba(0,0,0,0.85)]"
          style={{ transform: "translateZ(46px)" }}
        >
          <span className="inline-flex size-12 items-center justify-center rounded-lg border border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF8A33]">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>
          <span className="text-sm font-bold text-[#F9F8F5]">Doğrulanmış Usta</span>
          <span className="font-mono text-[0.68rem] font-semibold uppercase text-[#F9F8F5]/40">
            Kimlik onaylı
          </span>
        </div>

        <div
          className="absolute inset-[23%] flex flex-col items-center justify-center gap-2 rounded-lg border border-[#0F0F0F]/20 bg-[linear-gradient(145deg,#FF8A33,#FF6B00_58%,#B84800)] text-center shadow-[0_28px_70px_-20px_rgba(255,107,0,0.44)]"
          style={{ transform: "translateZ(92px)" }}
        >
          <span className="inline-flex size-11 items-center justify-center rounded-lg border border-[#0F0F0F]/25 bg-[#0F0F0F]/15 font-mono text-lg font-bold text-[#1A1000]">
            %0
          </span>
          <span className="text-sm font-extrabold text-[#1A1000]">Komisyonsuz</span>
          <span className="font-mono text-[0.65rem] font-bold uppercase text-[#1A1000]/70">
            Kesinti yok
          </span>
        </div>
      </div>

      <div className="home-float-chip absolute left-0 top-8 hidden min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-[#1F1F23] px-3 text-xs font-bold text-[#F9F8F5] shadow-[0_18px_36px_-18px_rgba(0,0,0,0.9)] sm:inline-flex">
        <span className="inline-flex size-2 rounded-full bg-[#3ECF7A] shadow-[0_0_10px_rgba(62,207,122,0.8)]" />
        Teklif onaylandı
      </div>
      <div className="home-float-chip absolute bottom-10 right-0 hidden min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-[#1F1F23] px-3 text-xs font-bold text-[#F9F8F5] shadow-[0_18px_36px_-18px_rgba(0,0,0,0.9)] sm:inline-flex [animation-delay:1.2s]">
        <span className="inline-flex size-2 rounded-full bg-[#3ECF7A] shadow-[0_0_10px_rgba(62,207,122,0.8)]" />
        Usta yola çıktı
      </div>
    </div>
  );
}

export function TiltServiceCard({
  category,
  description,
  href,
  iconName,
  title,
}: TiltServiceCardProps) {
  const reducedMotionRef = useReducedMotionRef();

  function handlePointerMove(event: PointerEvent<HTMLAnchorElement>) {
    if (reducedMotionRef.current) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    event.currentTarget.style.transform = `perspective(720px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) translate3d(0,-3px,0)`;
  }

  function resetTransform(event: PointerEvent<HTMLAnchorElement>) {
    event.currentTarget.style.transform =
      "perspective(720px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)";
  }

  return (
    <Link
      aria-label={`${title} kategorisinde usta bul`}
      className="group relative flex min-h-[11rem] cursor-pointer flex-col justify-between rounded-lg border border-[#F9F8F5]/10 bg-[linear-gradient(145deg,#1F1F23,#17171A)] p-5 shadow-[0_24px_54px_-34px_rgba(0,0,0,0.9)] transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-[#FF6B00]/40 hover:shadow-[0_28px_66px_-34px_rgba(255,107,0,0.38)] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]"
      href={href}
      onPointerLeave={resetTransform}
      onPointerMove={handlePointerMove}
      style={{
        transform: "perspective(720px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)",
        transformStyle: "preserve-3d",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF8A33] transition-colors duration-200 group-hover:bg-[#FF6B00] group-hover:text-[#0F0F0F]">
          <ServiceIcon className="size-5" name={iconName} />
        </span>
        <span className="inline-flex min-h-8 items-center rounded-md border border-[#F9F8F5]/10 px-2.5 text-[0.72rem] font-bold text-[#F9F8F5]/50">
          {category}
        </span>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-[#F9F8F5]">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-6 text-[#F9F8F5]/60">{description}</p>
      </div>

      <span className="absolute right-5 top-5 inline-flex size-8 items-center justify-center rounded-full border border-[#F9F8F5]/10 text-[#FF8A33] opacity-0 transition-all duration-200 group-hover:opacity-100">
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </span>
    </Link>
  );
}
