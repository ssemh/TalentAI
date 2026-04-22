"use client";

import { useCallback, useMemo, useState } from "react";
import TopTabs from "../ui/TopTabs";

function normalizeUsername(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/github\.com\/([^\/\s?#]+)/i);
  const candidate = urlMatch ? urlMatch[1] : trimmed.replace(/^@/, "").replace(/\/$/, "");
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(candidate)) return null;
  return candidate;
}

type ScorePayload = {
  username: string;
  github_score: number;
  cv_readiness_score: number;
  github_score_baseline: number;
  cv_readiness_score_baseline: number;
  github_score_ai: number | null;
  cv_readiness_score_ai: number | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  signals: Record<string, unknown>;
  model: string;
};

type CvDocScorePayload = {
  overall_score: number;
  overall_score_baseline: number;
  overall_score_ai: number | null;
  dimensions: Record<string, number>;
  summary: string;
  strengths: string[];
  improvements: string[];
  signals: Record<string, unknown>;
  model: string;
};

const CV_DIMENSION_LABELS: Record<string, string> = {
  structure_clarity: "Yapı ve okunabilirlik",
  impact_and_results: "Etki ve sonuçlar",
  skills_depth: "Beceri derinliği",
  professional_tone: "Profesyonel sunum",
};

export default function CvPage() {
  const [value, setValue] = useState("");
  const [score, setScore] = useState<ScorePayload | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [cvText, setCvText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [docScore, setDocScore] = useState<CvDocScorePayload | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const username = useMemo(() => normalizeUsername(value), [value]);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
  const pdfUrl = username ? `${apiBase}/api/cv/github/${encodeURIComponent(username)}` : null;

  const fetchScore = useCallback(async () => {
    if (!username) return;
    setScoreLoading(true);
    setScoreError(null);
    try {
      const res = await fetch(`${apiBase}/api/score/github/${encodeURIComponent(username)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          data && typeof data === "object" && "detail" in data ? String((data as { detail: unknown }).detail) : "Skor alınamadı.";
        throw new Error(detail);
      }
      setScore(data as ScorePayload);
    } catch (e) {
      setScore(null);
      setScoreError(e instanceof Error ? e.message : String(e));
    } finally {
      setScoreLoading(false);
    }
  }, [apiBase, username]);

  const fetchDocScore = useCallback(async () => {
    const trimmed = cvText.trim();
    if (trimmed.length < 40) return;
    setDocLoading(true);
    setDocError(null);
    try {
      const res = await fetch(`${apiBase}/api/score/cv-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          target_role: targetRole.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          data && typeof data === "object" && "detail" in data ? String((data as { detail: unknown }).detail) : "CV skoru alınamadı.";
        throw new Error(detail);
      }
      setDocScore(data as CvDocScorePayload);
    } catch (e) {
      setDocScore(null);
      setDocError(e instanceof Error ? e.message : String(e));
    } finally {
      setDocLoading(false);
    }
  }, [apiBase, cvText, targetRole]);

  const canAnalyzeCv = cvText.trim().length >= 40;

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
              <button
                type="button"
                className={[
                  "btn-neon rounded-2xl px-4 py-2.5 text-sm font-semibold",
                  username && !scoreLoading ? "" : "pointer-events-none opacity-60",
                ].join(" ")}
                disabled={!username || scoreLoading}
                onClick={() => void fetchScore()}
              >
                {scoreLoading ? "Skor hesaplanıyor..." : "GitHub + CV skoru (AI)"}
              </button>
              <div className="text-xs text-on-surface-variant">
                PDF: GitHub verisinden AI ile "Hakkımda" + "Yetkinlikler" ve repo özeti üretir.
              </div>
            </div>
          </div>

          {scoreError ? (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {scoreError}
            </div>
          ) : null}

          {score ? (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="text-xs text-on-surface-variant">GitHub profil skoru</div>
                <div className="mt-1 font-headline text-3xl font-bold text-tertiary">{score.github_score}</div>
                <div className="mt-2 text-[11px] text-slate-400">
                  Temel: {score.github_score_baseline}
                  {score.github_score_ai != null ? ` · AI: ${score.github_score_ai}` : ""}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="text-xs text-on-surface-variant">CV hazırlık skoru (PDF)</div>
                <div className="mt-1 font-headline text-3xl font-bold text-primary">{score.cv_readiness_score}</div>
                <div className="mt-2 text-[11px] text-slate-400">
                  Temel: {score.cv_readiness_score_baseline}
                  {score.cv_readiness_score_ai != null ? ` · AI: ${score.cv_readiness_score_ai}` : ""}
                </div>
              </div>
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-on-surface-variant">Özet (model: {score.model})</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-100">{score.summary}</p>
                {score.strengths.length ? (
                  <div className="mt-3">
                    <div className="text-xs text-tertiary">Güçlü yönler</div>
                    <ul className="mt-1 list-inside list-disc text-sm text-slate-200">
                      {score.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {score.improvements.length ? (
                  <div className="mt-3">
                    <div className="text-xs text-primary">Geliştirme</div>
                    <ul className="mt-1 list-inside list-disc text-sm text-slate-200">
                      {score.improvements.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-3 text-[11px] text-slate-500">
                  Repo: {String(score.signals.repo_count ?? "-")} · README %:{" "}
                  {String(score.signals.readme_coverage_pct ?? "-")} · Diller:{" "}
                  {String(score.signals.unique_languages ?? "-")}
                </div>
              </div>
            </div>
          ) : null}

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

        <section className="neon-glow rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-base text-tertiary">analytics</span>
            CV metni analizi (LM Studio)
          </div>
          <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
            Özgeçmiş metnini yapıştır; AI genel skoru ve alt boyutları üretir. İsteğe bağlı hedef rol, değerlendirmeyi role göre hafifçe çerçeveler.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="text-xs text-slate-400">CV metni</label>
              <textarea
                className="mt-1 min-h-[200px] w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-tertiary/50 focus-visible:ring-2 focus-visible:ring-tertiary/40"
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="CV içeriğini buraya yapıştırın (en az ~40 karakter)…"
              />
              <div className="mt-1 text-[11px] text-slate-500">{cvText.trim().length} karakter</div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Hedef rol (isteğe bağlı)</label>
              <input
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-tertiary/50 focus-visible:ring-2 focus-visible:ring-tertiary/40"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Örn: Senior Backend Engineer"
              />
              <button
                type="button"
                className={[
                  "btn-primary mt-4 w-full rounded-2xl px-4 py-2.5 text-sm font-bold",
                  canAnalyzeCv && !docLoading ? "" : "pointer-events-none opacity-60",
                ].join(" ")}
                disabled={!canAnalyzeCv || docLoading}
                onClick={() => void fetchDocScore()}
              >
                {docLoading ? "Analiz ediliyor…" : "CV skorunu hesapla"}
              </button>
            </div>
          </div>

          {docError ? (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {docError}
            </div>
          ) : null}

          {docScore ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs text-on-surface-variant">Genel CV skoru</div>
                  <div className="mt-1 font-headline text-3xl font-bold text-tertiary">{docScore.overall_score}</div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Temel: {docScore.overall_score_baseline}
                    {docScore.overall_score_ai != null ? ` · AI: ${docScore.overall_score_ai}` : ""}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-on-surface-variant">Model</div>
                  <div className="mt-2 font-mono text-sm text-slate-200">{docScore.model}</div>
                  <div className="mt-3 text-[11px] text-slate-500">
                    Kelime: {String(docScore.signals.word_count ?? "-")}
                    {docScore.signals.truncated_for_ai ? " · AI için metin kısaltıldı" : ""}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(docScore.dimensions).map(([key, val]) => (
                  <div key={key} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
                      <span>{CV_DIMENSION_LABELS[key] ?? key}</span>
                      <span className="font-mono text-slate-200">{val}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-tertiary/80 to-primary/80 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-on-surface-variant">Özet</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-100">{docScore.summary}</p>
                {docScore.strengths.length ? (
                  <div className="mt-3">
                    <div className="text-xs text-tertiary">Güçlü yönler</div>
                    <ul className="mt-1 list-inside list-disc text-sm text-slate-200">
                      {docScore.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {docScore.improvements.length ? (
                  <div className="mt-3">
                    <div className="text-xs text-primary">Geliştirme</div>
                    <ul className="mt-1 list-inside list-disc text-sm text-slate-200">
                      {docScore.improvements.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

