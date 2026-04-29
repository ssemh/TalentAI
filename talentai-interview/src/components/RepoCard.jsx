export default function RepoCard({ repo }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/15 hover:bg-white/[0.05]">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-sm font-semibold text-white">
          {repo?.name ?? "—"}
        </div>
        <div className="shrink-0 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-white/65">
          {repo?.recent ?? "—"}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-white/60">
        <span>{repo?.lang ?? "—"}</span>
        <span className="tabular-nums">★ {repo?.stars ?? "—"}</span>
      </div>
    </div>
  );
}

