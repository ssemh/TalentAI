"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type ChatRole = "user" | "assistant";
type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  json?: unknown;
  username?: string;
};

type GithubRepoBundle = {
  name: string;
  languages: Record<string, number>;
  readme: string | null;
  readme_truncated: boolean;
};

function normalizeUsername(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Hedef: github.com/<username>/ veya direkt kullanıcı adı.
  const urlMatch = trimmed.match(/github\.com\/([^\/\s?#]+)/i);
  const candidate = urlMatch ? urlMatch[1] : trimmed.replace(/^@/, "").replace(/\/$/, "");

  // GitHub kullanıcı adı: 1-39, harf/rakam/-, harf ile başlayabilir.
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(candidate)) return null;
  return candidate;
}

function extractUsernameFromInput(input: string): string | null {
  // Kullanıcı istersen direkt şunları yazabilir:
  // - octocat
  // - https://github.com/octocat
  // - Analyze this GitHub profile: octocat
  const trimmed = input.trim();
  const match = trimmed.match(/Analyze this GitHub profile:\s*(.+)\s*$/i);
  return match?.[1] ? normalizeUsername(match[1]) : normalizeUsername(trimmed);
}

export default function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      role: "assistant",
      content: "GitHub profilinden repo bilgilerini çekeceğim. Aşağıya kullanıcı adı veya URL yapıştır.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const didAutoRunRef = useRef(false);
  const searchParams = useSearchParams();

  const apiBase = useMemo(() => {
    // Next.js tarafı için env değişkeni.
    return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
  }, []);

  const extractedUsername = useMemo(() => extractUsernameFromInput(input), [input]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isLoading]);

  async function analyzeUsername(username: string) {
    const url = `${apiBase}/api/github/${encodeURIComponent(username)}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = typeof data === "object" && data && "detail" in data ? (data as any).detail : null;
      throw new Error(detail ? String(detail) : `API hata döndü: ${res.status}`);
    }
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content: `@${username} repo özeti`, json: data, username },
    ]);
  }

  useEffect(() => {
    const u = searchParams.get("u");
    if (!u) return;
    const normalized = normalizeUsername(u);
    if (!normalized) return;
    if (didAutoRunRef.current) return;

    didAutoRunRef.current = true;
    setInput(normalized);
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: normalized };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    void analyzeUsername(normalized)
      .catch((err) => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `İstek başarısız: ${err instanceof Error ? err.message : String(err)}`,
          },
        ]);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function getTopLanguages(languages: Record<string, number>, limit = 3): Array<[string, number]> {
    return Object.entries(languages)
      .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // MVP için sessiz fallback.
    }
  }

  async function onSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const username = extractUsernameFromInput(text);
      if (!username) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "Kullanıcı adını çıkaramadım. Lütfen GitHub kullanıcı adı veya profil URL’si yapıştır (örn: `octocat` veya `https://github.com/octocat`).",
          },
        ]);
        return;
      }

      await analyzeUsername(username);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `İstek başarısız: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="neon-glow rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm text-slate-200">1) Ne göndereceğim?</div>
            <p className="mt-1 text-sm text-slate-300">
              Sadece GitHub kullanıcı adı veya profil URL’si yaz. Örnek: <span className="font-mono">octocat</span> veya{" "}
              <span className="font-mono">https://github.com/octocat</span>.
            </p>
          </div>

          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void onSend();
            }}
          >
            <div className="flex-1">
              <label htmlFor="githubInput" className="sr-only">
                GitHub kullanıcı adı veya URL
              </label>
              <input
                id="githubInput"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-tertiary/50 focus:bg-black/30 focus-visible:ring-2 focus-visible:ring-tertiary/40"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="octocat veya https://github.com/octocat"
                disabled={isLoading}
              />
              <div className="mt-1 text-[11px] text-slate-400" aria-live="polite">
                Algılanan kullanıcı adı:{" "}
                {extractedUsername ? (
                  <code className="font-mono text-slate-100">{extractedUsername}</code>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                İstersen eski format da olur: <span className="font-mono">Analyze this GitHub profile: octocat</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full rounded-2xl px-4 py-2.5 text-sm font-bold disabled:opacity-60 sm:w-auto focus-visible:ring-2 focus-visible:ring-tertiary/40"
            >
              {isLoading ? "Analiz ediliyor..." : "Analiz Et"}
            </button>
          </form>
        </div>
      </div>

      <div className="neon-glow h-[60vh] overflow-auto rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur pr-2">
        <div className="flex flex-col gap-3">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={isUser ? "text-right" : "text-left"}>
                <div
                  className={[
                    "inline-block max-w-[92%] rounded-2xl px-3 py-2.5",
                    isUser
                      ? "bg-primary/15 border border-primary/30"
                      : "bg-slate-900/60 border border-white/10",
                  ].join(" ")}
                >
                  <div className="text-xs opacity-80">{isUser ? "Sen" : "TalentAI"}</div>

                  <div className="mt-1">
                    {m.json !== undefined && !isUser ? (
                      <AssistantResult
                        bundle={m.json}
                        username={m.username}
                        getTopLanguages={getTopLanguages}
                        copyToClipboard={copyToClipboard}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap break-words text-sm font-mono text-slate-100">{m.content}</pre>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading ? (
            <div className="text-left" aria-live="polite">
              <div className="inline-block rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2.5">
                <div className="text-xs opacity-80">TalentAI</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-100">
                  <span>GitHub’dan veri çekiyorum</span>
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-tertiary [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-tertiary [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-tertiary [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>
    </section>
  );
}

function AssistantResult({
  bundle,
  username,
  getTopLanguages,
  copyToClipboard,
}: {
  bundle: unknown;
  username?: string;
  getTopLanguages: (languages: Record<string, number>, limit?: number) => Array<[string, number]>;
  copyToClipboard: (text: string) => Promise<void>;
}) {
  const repos = Array.isArray(bundle) ? (bundle as GithubRepoBundle[]) : [];
  if (!Array.isArray(bundle)) {
    return (
      <>
        <div className="text-sm text-slate-100">Beklenmeyen yanıt formatı.</div>
      </>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-100 font-semibold">
            {username ? `@${username}` : "Kullanıcı"}: {repos.length} repo
          </div>
          <div className="mt-1 text-xs text-slate-300">Aşağıdaki özetler ekranda, JSON ise detayda.</div>
        </div>
        {username ? (
          <a
            className="btn-primary rounded-xl px-3 py-2 text-xs font-bold"
            href={`${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"}/api/cv/github/${encodeURIComponent(
              username,
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            CV (PDF) indir
          </a>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {repos.slice(0, 12).map((repo) => {
          const top = getTopLanguages(repo.languages ?? {}, 3);
          const snippet = typeof repo.readme === "string" ? repo.readme.slice(0, 220) : "";
          const hasReadme = typeof repo.readme === "string" && repo.readme.length > 0;
          return (
            <div
              key={repo.name}
              className="card-hover rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-sm text-slate-100">{repo.name}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {top.length ? (
                      top.map(([lang, bytes]) => (
                        <span
                          key={lang}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200"
                        >
                          {lang}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500">Dil bilgisi yok</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-neon rounded-lg px-2 py-1 text-[11px] font-semibold"
                  onClick={() => void copyToClipboard(JSON.stringify(repo, null, 2))}
                >
                  Kopyala
                </button>
              </div>

              {hasReadme ? (
                <div className="mt-2 text-xs text-slate-300">
                  <div className="whitespace-pre-wrap break-words leading-relaxed">
                    {snippet}
                    {repo.readme_truncated ? "..." : ""}
                  </div>
                  {repo.readme_truncated ? (
                    <div className="mt-1 inline-flex rounded-full border border-tertiary/30 bg-tertiary/10 px-2 py-0.5 text-[11px] text-tertiary">
                      README kısaltıldı
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-500">README bulunamadı.</div>
              )}

              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-slate-400 hover:text-slate-200">
                  Detay JSON / tam README
                </summary>
                <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  {hasReadme ? (
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] font-mono text-slate-100">
                      {repo.readme}
                    </pre>
                  ) : null}
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] font-mono text-slate-100">
                    {JSON.stringify(repo, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          );
        })}

        {repos.length > 12 ? (
          <div className="text-xs text-slate-500">İlk 12 repo gösteriliyor. İstersen sonraki adımda pagination ekleriz.</div>
        ) : null}
      </div>
    </div>
  );
}

