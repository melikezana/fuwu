"use client";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
export function ConsentAnalytics({ enabled }: { enabled: boolean }) {
  const [consented,setConsented]=useState(false);
  useEffect(()=>{
    const sync=()=>{try{setConsented(localStorage.getItem('fuwu:cookie-consent')==='accepted');}catch{setConsented(false);}};
    sync();window.addEventListener('storage',sync);window.addEventListener('fuwuConsentChanged',sync);
    return ()=>{window.removeEventListener('storage',sync);window.removeEventListener('fuwuConsentChanged',sync);};
  },[]);
  return enabled&&consented?<><Analytics/><SpeedInsights/></>:null;
}
