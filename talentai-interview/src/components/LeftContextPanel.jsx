import RepoCard from "./RepoCard.jsx";

export default function LeftContextPanel({ cv, github }) {
  return (
    <aside className="h-full space-y-4 overflow-auto pr-1">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
          CV summary
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/80">
          {cv?.summary}
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
            Skills extracted
          </div>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-white/60">
            {cv?.skills?.length ?? 0}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(cv?.skills ?? []).map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.05]"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
          GitHub overview
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] text-white/55">Repos</div>
            <div className="mt-1 text-lg font-semibold text-white">
              {github?.overview?.repos ?? "—"}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] text-white/55">Stars</div>
            <div className="mt-1 text-lg font-semibold text-white">
              {github?.overview?.stars ?? "—"}
            </div>
          </div>
          <div className="col-span-2 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] text-white/55">Activity</div>
            <div className="mt-1 text-sm text-white/75">
              {github?.overview?.activityNote ?? "—"}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
            Language usage
          </div>
          <div className="mt-3 space-y-2">
            {(github?.overview?.topLanguages ?? []).map((l) => (
              <div key={l.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-white/65">
                  <span>{l.name}</span>
                  <span className="tabular-nums">{l.pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                    style={{ width: `${l.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
            Repos
          </div>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-white/60">
            {github?.repos?.length ?? 0}
          </span>
        </div>
        <div className="mt-3 grid gap-3">
          {(github?.repos ?? []).map((r) => (
            <RepoCard key={r.name} repo={r} />
          ))}
        </div>
      </section>
    </aside>
  );
}

