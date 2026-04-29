export default function MessageBubble({ role, time, text }) {
  const isAI = role === "ai";
  return (
    <div className={isAI ? "flex justify-start" : "flex justify-end"}>
      <div
        className={[
          "max-w-[86%] rounded-2xl px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.25)]",
          isAI
            ? "border border-violet-500/20 bg-gradient-to-b from-violet-500/12 to-white/[0.03] text-white"
            : "border border-cyan-500/20 bg-gradient-to-b from-cyan-500/10 to-white/[0.03] text-white",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium tracking-wide text-white/60">
            {isAI ? "AI Interviewer" : "You"}
          </div>
          <div className="text-xs tabular-nums text-white/45">{time}</div>
        </div>
        <div className="mt-2 text-sm leading-relaxed text-white/90">
          {text}
        </div>
      </div>
    </div>
  );
}

