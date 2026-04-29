import { useEffect, useMemo, useState } from "react";

function formatElapsed(seconds) {
  const s = Math.max(0, seconds);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function Header({ candidateName = "Candidate", status = "In Progress" }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const elapsed = useMemo(() => formatElapsed(seconds), [seconds]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070913]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-[0_0_30px_rgba(139,92,246,0.25)]" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-white">
              DevAnalyzer
            </div>
            <div className="text-xs text-white/60">AI Interview</div>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
              Candidate
            </div>
            <div className="text-sm font-semibold text-white">{candidateName}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
              Timer
            </div>
            <div className="text-sm font-semibold tabular-nums text-white">
              {elapsed}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
              Status
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.5)]" />
              {status}
            </div>
          </div>
        </div>

        <button className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15">
          End Interview
        </button>
      </div>
    </header>
  );
}

