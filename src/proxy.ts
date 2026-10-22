import type { NextRequest } from "next/server";
import { middleware } from "../middleware";

// Next.js 16 executes this entry point. Keep one implementation for session, roles and CSP.
export function proxy(request: NextRequest) {
  return middleware(request);
}

export const config = {
  matcher: [
    {
      missing: [
        { key: "next-router-prefetch", type: "header" },
        { key: "purpose", type: "header", value: "prefetch" },
      ],
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
    },
  ],
};
