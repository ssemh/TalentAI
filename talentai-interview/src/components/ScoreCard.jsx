import ProgressBar from "./ProgressBar.jsx";

export default function ScoreCard({ label, value, hint }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {Math.round(v)}%
          </div>
        </div>
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-400/15 ring-1 ring-white/10" />
      </div>
      <div className="mt-3">
        <ProgressBar value={v} />
      </div>
      {hint ? (
        <div className="mt-2 text-sm text-white/55">{hint}</div>
      ) : null}
    </div>
  );
}

