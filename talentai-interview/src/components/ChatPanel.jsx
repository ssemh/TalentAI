import { useEffect, useMemo, useRef, useState } from "react";
import MessageBubble from "./MessageBubble.jsx";

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({ initialMessages }) {
  const [messages, setMessages] = useState(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [aiTyping, setAiTyping] = useState(true);
  const listRef = useRef(null);

  useEffect(() => {
    const t = window.setTimeout(() => setAiTyping(false), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !aiTyping, [input, aiTyping]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, aiTyping]);

  function send() {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", time: nowTime(), text },
    ]);
    setInput("");

    setAiTyping(true);
    window.setTimeout(() => {
      setAiTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "ai",
          time: nowTime(),
          text: "Thanks. Next: show me how you would design a reusable chart component that supports large datasets and consistent UX.",
        },
      ]);
    }, 1200);
  }

  return (
    <section className="relative h-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-white">Interview</div>
            <div className="text-xs text-white/55">Realtime validation & scoring</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Live
          </div>
        </div>

        <div ref={listRef} className="flex-1 space-y-4 overflow-auto px-5 py-5">
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} time={m.time} text={m.text} />
          ))}

          {aiTyping ? (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
                  AI is typing…
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 focus-within:border-violet-500/40 focus-within:ring-4 focus-within:ring-violet-500/10">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={2}
                  placeholder="Type your answer… (Enter to send, Shift+Enter for newline)"
                  className="w-full resize-none bg-transparent text-sm text-white/90 outline-none placeholder:text-white/35"
                />
              </div>
            </div>
            <button
              onClick={send}
              disabled={!canSend}
              className="group inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              title="Send"
            >
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-white/90 opacity-0 transition group-hover:opacity-100" />
              Send
              <svg
                viewBox="0 0 24 24"
                className="ml-2 h-4 w-4 opacity-90"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          <div className="mt-2 text-xs text-white/45">
            Tip: Keep answers structured. Mention trade-offs, constraints, and verification signals.
          </div>
        </div>
      </div>
    </section>
  );
}

