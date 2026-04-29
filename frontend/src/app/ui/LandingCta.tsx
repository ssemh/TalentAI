"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function normalizeUsername(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/github\.com\/([^\/\s?#]+)/i);
  const candidate = urlMatch ? urlMatch[1] : trimmed.replace(/^@/, "").replace(/\/$/, "");
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(candidate)) return null;
  return candidate;
}

export default function LandingCta() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const username = useMemo(() => normalizeUsername(value), [value]);

  return (
    <div className="group relative max-w-2xl">
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 to-tertiary/20 blur opacity-25 transition duration-1000 group-hover:opacity-50" />
      <div className="relative flex flex-col gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-2xl md:flex-row">
        <div className="flex flex-grow items-center gap-3 px-4">
          <span className="material-symbols-outlined text-outline">link</span>
          <input
            className="w-full border-none bg-transparent py-3 text-on-surface placeholder:text-outline/50 focus:ring-0"
            placeholder="GitHub kullanıcı adı veya URL (örn: octocat)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (!username) return;
            router.push(`/chat?u=${encodeURIComponent(username)}`);
          }}
          disabled={!username}
          className="btn-primary flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-bold disabled:opacity-60"
        >
          <span>Analiz Et</span>
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
        </button>
      </div>
      <div className="mt-2 text-xs text-on-surface-variant/70">
        {username ? (
          <span>
            Algılandı: <span className="font-mono text-on-surface">@{username}</span>
          </span>
        ) : (
          <span>Örn: `octocat` veya `https://github.com/octocat`</span>
        )}
      </div>
    </div>
  );
}

