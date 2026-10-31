"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
const client = () => true;
const server = () => false;

// Forms with client-only submit handlers must not accept submissions before
// hydration; otherwise the browser performs a native navigation instead.
export function useHydrated() {
 return useSyncExternalStore(subscribe, client, server);
}
