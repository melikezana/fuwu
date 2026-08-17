"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

type MetaPixelScriptProps = {
  enabled: boolean;
  nonce?: string;
  pixelId: string;
};

const cookieConsentStorageKey = "fuwu:cookie-consent";

function hasAnalyticsConsent() {
  try {
    return window.localStorage.getItem(cookieConsentStorageKey) === "accepted";
  } catch {
    return false;
  }
}

function serializeForInlineScript(value: string) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function MetaPixelScript({ enabled, nonce, pixelId }: MetaPixelScriptProps) {
  const [canRenderPixel, setCanRenderPixel] = useState(false);

  useEffect(() => {
    function syncConsentState() {
      setCanRenderPixel(enabled && Boolean(pixelId) && hasAnalyticsConsent());
    }

    syncConsentState();
    window.addEventListener("fuwuConsentChanged", syncConsentState);
    window.addEventListener("storage", syncConsentState);

    return () => {
      window.removeEventListener("fuwuConsentChanged", syncConsentState);
      window.removeEventListener("storage", syncConsentState);
    };
  }, [enabled, pixelId]);

  if (!enabled || !pixelId || !canRenderPixel) {
    return null;
  }

  return (
    <Script
      dangerouslySetInnerHTML={{
        __html: `
!function(f,b,e,v,n,t,s) {
  if (f.fbq) return;
  n = f.fbq = function() {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  t = b.createElement(e);
  t.async = true;
  t.src = v;
  s = b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t, s);
}(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

window.fbq("init", ${serializeForInlineScript(pixelId)});
window.fbq("track", "PageView");
`,
      }}
      id="meta-pixel"
      nonce={nonce}
      strategy="afterInteractive"
    />
  );
}
