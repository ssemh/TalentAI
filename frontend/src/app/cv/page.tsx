"use client";

import { useMemo, useState } from "react";
import TopTabs from "../ui/TopTabs";

function normalizeUsername(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/github\.com\/([^\/\s?#]+)/i);
  const candidate = urlMatch ? urlMatch[1] : trimmed.replace(/^@/, "").replace(/\/$/, "");
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(candidate)) return null;
  return candidate;
}

export default function CvPage() {
  const [value, setValue] = useState("");

  const username = useMemo(() => normalizeUsername(value), [value]);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
  const pdfUrl = username ? `${apiBase}/api/cv/github/${encodeURIComponent(username)}` : null;

  return (
    <main className="bg-mesh min-h-screen text-on-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 pt-24">
        <header className="mt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-headline text-3xl font-bold tracking-tight">TalentAI</h1>
              <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
                GitHub’ından CV PDF üret. Kullanıcı adını veya URL’yi yapıştır.
              </p>
            </div>
            <a href="/" className="btn-neon rounded-xl px-4 py-2 text-sm font-semibold">
              Ana sayfa
            </a>
          </div>
          <div className="mt-4">
            <TopTabs />
          </div>
        </header>

        <section className="neon-glow rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-base text-primary">description</span>
                PDF CV Üretimi
              </div>
              <div className="mt-3 text-sm text-slate-200">GitHub kullanıcı adı / URL</div>
              <div className="mt-2">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-tertiary/50 focus:bg-black/30 focus-visible:ring-2 focus-visible:ring-tertiary/40"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="octocat veya https://github.com/octocat"
                />
                <div className="mt-1 text-[11px] text-slate-400">
                  {username ? (
                    <>
                      Algılandı: <span className="font-mono text-slate-100">@{username}</span>
                    </>
                  ) : (
                    "Örn: octocat"
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:min-w-[220px]">
              <a
                className={[
                  "btn-primary rounded-2xl px-4 py-2.5 text-sm font-bold text-center",
                  pdfUrl ? "" : "pointer-events-none opacity-60",
                ].join(" ")}
                href={pdfUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
              >
                CV (PDF) indir
              </a>
              <div className="text-xs text-on-surface-variant">
                PDF: repo adları, diller, README özetleri (MVP).
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-on-surface-variant">Önizleme (stil)</div>
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-lg font-headline font-bold text-on-surface">TalentAI CV</div>
              <div className="mt-1 text-sm text-on-surface-variant">
                {username ? `GitHub: @${username}` : "GitHub: @kullaniciadi"}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                  <div className="text-[11px] text-on-surface-variant">Projeler</div>
                  <div className="text-sm font-semibold text-on-surface">Repo listesi</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                  <div className="text-[11px] text-on-surface-variant">Diller</div>
                  <div className="text-sm font-semibold text-on-surface">Top stack</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                  <div className="text-[11px] text-on-surface-variant">README</div>
                  <div className="text-sm font-semibold text-on-surface">Kısa özet</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

