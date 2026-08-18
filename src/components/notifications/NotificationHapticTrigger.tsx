"use client";

import { useEffect } from "react";
import { triggerHapticFeedback } from "@/lib/utils/haptics";

export function NotificationHapticTrigger({ unreadCount }: { unreadCount: number }) {
  useEffect(() => {
    if (unreadCount > 0) {
      triggerHapticFeedback(50);
    }
  }, [unreadCount]);

  return null;
}
