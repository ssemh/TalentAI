"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: string };

const tabs: Tab[] = [
  { href: "/cv", label: "CV Oluştur", icon: "description" },
  { href: "/interview", label: "Mülakat", icon: "forum" },
];

export default function TopTabs() {
  const pathname = usePathname();

  return (
    <div className="flex w-full justify-center">
      <div className="neon-glow inline-flex rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
              active ? "btn-primary" : "btn-neon hover:opacity-100",
            ].join(" ")}
          >
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
      </div>
    </div>
  );
}

