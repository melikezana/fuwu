"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import {
  sceneServiceTargets,
  type ServiceCategoryTarget,
} from "@/lib/constants/service-category-map";

type SceneServiceLinksProps = {
  className: string;
  label?: string;
  linkClassName: string;
  showArrow?: boolean;
  targets?: readonly ServiceCategoryTarget[];
};

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0;
}

function isSpaceActivation(event: KeyboardEvent<HTMLAnchorElement>) {
  return event.key === " " || event.key === "Space" || event.key === "Spacebar";
}

export function SceneServiceLinks({
  className,
  label = "Hizmet kategorileri",
  linkClassName,
  showArrow = false,
  targets = sceneServiceTargets,
}: SceneServiceLinksProps) {
  const router = useRouter();

  function navigate(target: ServiceCategoryTarget) {
    router.push(target.href);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>, target: ServiceCategoryTarget) {
    if (isModifiedClick(event)) {
      return;
    }

    event.preventDefault();
    navigate(target);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLAnchorElement>, target: ServiceCategoryTarget) {
    if (isSpaceActivation(event)) {
      event.preventDefault();
      navigate(target);
    }
  }

  return (
    <nav aria-label={label} className={className}>
      {targets.map((target) => (
        <a
          className={linkClassName}
          href={target.href}
          key={target.id}
          onClick={(event) => handleClick(event, target)}
          onKeyDown={(event) => handleKeyDown(event, target)}
        >
          <span className="min-w-0 truncate">{target.label}</span>
          <span className="sr-only"> ustalarını gör</span>
          {showArrow ? (
            <ArrowRight aria-hidden="true" className="size-3 shrink-0 text-[var(--brand-orange)]" />
          ) : null}
        </a>
      ))}
    </nav>
  );
}
