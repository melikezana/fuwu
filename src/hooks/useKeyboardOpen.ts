"use client";

import { useEffect, useState } from "react";

export function useKeyboardOpen() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;

    function handleResize() {
      if (!viewport) return;
      // If visualViewport height is significantly smaller than window.innerHeight, virtual keyboard is open
      const isSmaller = viewport.height < window.innerHeight * 0.82;
      setIsKeyboardOpen(isSmaller);
    }

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);

    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  return isKeyboardOpen;
}
