import type { ServiceIconName } from "@/lib/constants/services";
import { cn } from "@/lib/utils";

type ServiceIconProps = {
  name: ServiceIconName;
  className?: string;
};

export function ServiceIcon({ name, className }: ServiceIconProps) {
  const iconClassName = cn("h-6 w-6", className);

  if (name === "faucet" || name === "pipe") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="M7 6.5h6.5a3.5 3.5 0 0 1 3.5 3.5v1.25M5.25 6.5H7m10 0h1.75M7 4.5v4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M14.75 11.25h5.5v3.25h-5.5v-3.25Zm-7.5 0h7.5M6 14.5h4.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M17.5 16.4c1.05 1.2 1.58 2.15 1.58 2.85a1.58 1.58 0 0 1-3.16 0c0-.7.53-1.65 1.58-2.85Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "bolt") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="m13.25 3.75-7 9h5.25l-.75 7.5 7-9H12.5l.75-7.5Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "broom") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="M14.5 4.25 9.25 9.5m-1 1 5.25 5.25m-7-3.25 5 5M5 17.75c2.15.95 4.3.95 6.45 0l1.3-1.3-5.2-5.2-1.3 1.3c-1.05 1.05-1.47 2.9-1.25 5.2Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="m17.5 6.25.55 1.5 1.45.62-1.45.63-.55 1.5-.55-1.5-1.45-.63 1.45-.62.55-1.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  if (name === "rug") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="M6.25 4.75h11.5A1.25 1.25 0 0 1 19 6v12a1.25 1.25 0 0 1-1.25 1.25H6.25A1.25 1.25 0 0 1 5 18V6a1.25 1.25 0 0 1 1.25-1.25Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M8 7.75h8M8 16.25h8M9 10.5c1.05.95 2.05.95 3 0s1.95-.95 3 0M9 13.5c1.05-.95 2.05-.95 3 0s1.95.95 3 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "air-conditioner") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="M5.25 5.25h13.5A1.25 1.25 0 0 1 20 6.5v5.75H4V6.5a1.25 1.25 0 0 1 1.25-1.25Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M7.25 9h9.5M8 16l8 4M16 16l-8 4M12 15.25v5.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "furniture-tool" || name === "box") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="M5.25 11.25h13.5v5.5H5.25v-5.5Zm1.25 5.5v3m11-3v3M7.5 8.5h9A1.5 1.5 0 0 1 18 10v1.25H6V10a1.5 1.5 0 0 1 1.5-1.5Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="m15.75 4.75 3.5 3.5m-1.05-4.55 1.1 1.1-5.35 5.35-1.1-1.1 5.35-5.35Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  if (name === "paint-roller") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="M5.25 5.5h10.5v4.25H5.25V5.5Zm10.5 2.12h1.75a1.75 1.75 0 0 1 0 3.5H12a1.75 1.75 0 0 0-1.75 1.75v1.38"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M8.75 14.25h3v5.5h-3v-5.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "truck") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="M4.75 7.5h9.5v8.75h-9.5V7.5Zm9.5 3.25h3.4l1.6 2.15v3.35h-5v-5.5Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M8 18.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Zm8.75 0a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "appliance") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="M7.25 3.75h9.5A1.25 1.25 0 0 1 18 5v14a1.25 1.25 0 0 1-1.25 1.25h-9.5A1.25 1.25 0 0 1 6 19V5a1.25 1.25 0 0 1 1.25-1.25Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M8.75 6.5h6.5M12 17.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "sparkles") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="m12 3.75 1.45 4.1 3.8 1.65-3.8 1.65L12 15.25l-1.45-4.1-3.8-1.65 3.8-1.65L12 3.75Zm6.25 10.5.75 2.05 1.9.82-1.9.83-.75 2.05-.75-2.05-1.9-.83 1.9-.82.75-2.05ZM5.75 13l.82 2.3 2.18.95-2.18.95-.82 2.3-.82-2.3-2.18-.95 2.18-.95.82-2.3Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="m4.75 11.25 7.25-6 7.25 6M6.5 10.15V19h11v-8.85M9.5 19v-5.25h5V19"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "graduation-cap") {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="m3.75 9.5 8.25-4 8.25 4-8.25 4-8.25-4Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M7.25 11.2v4.25c1.1 1.35 2.68 2.05 4.75 2.05s3.65-.7 4.75-2.05V11.2M20.25 9.5v5.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
      <path
        d="M15.25 5.25a4.65 4.65 0 0 0-.85 5.25l-8.3 8.3a1.7 1.7 0 0 0 2.4 2.4l8.3-8.3a4.65 4.65 0 0 0 5.25-.85l-3.35-1.15-.95-3.95-2.5-1.7Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
