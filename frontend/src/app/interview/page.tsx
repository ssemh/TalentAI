"use client";

import { FormEvent, useMemo, useState } from "react";
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
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const username = useMemo(() => normalizeUsername(value), [value]);
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000", []);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!username || !prompt.trim() || loading) return;

    const userText = prompt.trim();
    const nextHistory = [...history, { role: "user" as const, content: userText }];
    setHistory(nextHistory);
    setPrompt("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                `Sen TalentAI Interview asistanısın. Kullanıcının GitHub adı @${username}. ` +
                "Cevapların kısa, net ve Türkçe olsun. Teknik mülakat odağında ilerle.",
            },
            ...nextHistory.map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.4,
          max_tokens: 512,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = data && typeof data === "object" && "detail" in data ? String((data as any).detail) : "AI isteği başarısız.";
        throw new Error(detail);
      }

      const reply = data && typeof data === "object" && "reply" in data ? String((data as any).reply) : "";
      if (!reply) throw new Error("AI boş yanıt döndürdü.");

      setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

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
                onClick={() => {
                  setHistory([]);
                  setError(null);
                }}
              >
                Oturumu Sıfırla
              </button>

              <div className="mt-3 text-xs text-on-surface-variant">
                Sonraki adım: repo koduna göre kişiselleştirilmiş soru üretimi + cevap değerlendirme.
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-on-surface-variant">LM Studio ile canlı mülakat akışı</div>

                <div className="mt-3 max-h-[360px] overflow-auto rounded-xl border border-white/10 bg-slate-950/30 p-3">
                  {history.length === 0 ? (
                    <div className="text-sm text-slate-400">
                      {username
                        ? `@${username} için ilk mesajını gönder, AI mülakatı başlasın.`
                        : "Önce soldan bir GitHub kullanıcı adı gir."}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {history.map((m, idx) => (
                        <div
                          key={`${m.role}-${idx}`}
                          className={
                            m.role === "assistant"
                              ? "self-start max-w-[92%] rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2.5"
                              : "self-end max-w-[92%] rounded-2xl border border-primary/30 bg-primary/15 px-3 py-2.5"
                          }
                        >
                          <div className="text-xs opacity-80">{m.role === "assistant" ? "TalentAI" : "Sen"}</div>
                          <div className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{m.content}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {loading ? <div className="mt-3 text-xs text-slate-400">AI düşünüyor...</div> : null}
                  {error ? <div className="mt-3 text-xs text-rose-300">Hata: {error}</div> : null}
                </div>

                <form className="mt-3 flex gap-2" onSubmit={sendMessage}>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-tertiary/50 focus:bg-black/30"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Örn: Backend projemde test stratejisini nasıl anlatmalıyım?"
                    disabled={!username || loading}
                  />
                  <button
                    type="submit"
                    className="btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
                    disabled={!username || !prompt.trim() || loading}
                  >
                    Gönder
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

