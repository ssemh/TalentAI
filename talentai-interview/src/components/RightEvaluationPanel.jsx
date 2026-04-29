import ScoreCard from "./ScoreCard.jsx";

function StarRow({ label, done, note }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="mt-1 text-xs text-white/55">{note}</div>
      </div>
      <div
        className={[
          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl border",
          done
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
            : "border-white/10 bg-white/[0.03] text-white/55",
        ].join(" ")}
        title={done ? "Complete" : "Pending"}
      >
        {done ? (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 6v6l4 2" />
          </svg>
        )}
      </div>
    </div>
  );
}

function InsightPill({ tone, text }) {
  const cls =
    tone === "positive"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
        : "border-white/10 bg-white/[0.03] text-white/70";
  return (
    <div className={`rounded-2xl border px-3 py-2 text-sm ${cls}`}>
      {text}
    </div>
  );
}

export default function RightEvaluationPanel({ scores, star }) {
  return (
    <aside className="h-full space-y-4 overflow-auto pl-1">
      <div className="grid grid-cols-2 gap-3">
        <ScoreCard
          label="Technical Fit"
          value={scores?.technicalFit}
          hint="Signal: architecture & depth"
        />
        <ScoreCard
          label="Ghost Code"
          value={scores?.ghostCode}
          hint="Lower is better"
        />
        <ScoreCard
          label="Skill Match"
          value={scores?.skillMatch}
          hint="CV vs GitHub overlap"
        />
        <ScoreCard
          label="Performance"
          value={scores?.performance}
          hint="Clarity & structure"
        />
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
            STAR evaluation
          </div>
          <div className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-white/60">
            Live
          </div>
        </div>
        <div className="mt-3 grid gap-3">
          <StarRow label="Situation" done={!!star?.situation?.done} note={star?.situation?.note} />
          <StarRow label="Task" done={!!star?.task?.done} note={star?.task?.note} />
          <StarRow label="Action" done={!!star?.action?.done} note={star?.action?.note} />
          <StarRow label="Result" done={!!star?.result?.done} note={star?.result?.note} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
          Insights
        </div>
        <div className="mt-3 space-y-2">
          {(scores?.insights ?? []).map((i, idx) => (
            <InsightPill key={`${i.text}-${idx}`} tone={i.tone} text={i.text} />
          ))}
        </div>
      </section>
    </aside>
  );
}

