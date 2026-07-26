import { Megaphone } from "lucide-react";

// Ayarlardan gelen duyuru bandını sitenin en üstünde gösterir (boşsa görünmez).
export function AnnouncementBanner({ message }: { message: string }) {
  if (!message.trim()) {
    return null;
  }

  return (
    <div className="w-full bg-[var(--brand-navy)] px-4 py-2 text-center text-sm font-semibold text-white">
      <span className="inline-flex items-center gap-2">
        <Megaphone className="h-4 w-4 shrink-0" aria-hidden />
        {message}
      </span>
    </div>
  );
}
