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

export default function InterviewPage() {
  const [value, setValue] = useState("");
  const username = useMemo(() => normalizeUsername(value), [value]);

  return (
    <main className="bg-mesh min-h-screen text-on-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 pt-24">
        <header className="mt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-headline text-3xl font-bold tracking-tight">TalentAI</h1>
              <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
                Mock Interview (MVP): profilini seç, soruları burada akıtacağız.
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
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-base text-tertiary">forum</span>
            Mock Interview (MVP UI)
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="text-sm text-slate-200">Hedef profil</div>
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

              <button
                className={[
                  "mt-3 w-full rounded-2xl px-4 py-2.5 text-sm font-bold",
                  username ? "btn-primary" : "btn-primary opacity-60 pointer-events-none",
                ].join(" ")}
                type="button"
                disabled={!username}
              >
                Oturumu Başlat (yakında)
              </button>

              <div className="mt-3 text-xs text-on-surface-variant">
                Sonraki adım: repo koduna göre kişiselleştirilmiş soru üretimi + cevap değerlendirme.
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-on-surface-variant">Örnek akış (görsel)</div>
                <div className="mt-3 flex flex-col gap-3">
                  <div className="self-start max-w-[92%] rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2.5">
                    <div className="text-xs opacity-80">TalentAI</div>
                    <div className="mt-1 text-sm text-slate-100">
                      Merhaba! @{username ?? "kullanici"} repo’larından 2 soru seçeceğim. Hazır mısın?
                    </div>
                  </div>
                  <div className="self-end max-w-[92%] rounded-2xl border border-primary/30 bg-primary/15 px-3 py-2.5">
                    <div className="text-xs opacity-80">Sen</div>
                    <div className="mt-1 text-sm text-slate-100">Hazırım.</div>
                  </div>
                  <div className="self-start max-w-[92%] rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2.5">
                    <div className="text-xs opacity-80">TalentAI</div>
                    <div className="mt-1 text-sm text-slate-100">
                      Repo X’te şu pattern’i kullanmışsın. Neden bu yaklaşımı seçtin?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

