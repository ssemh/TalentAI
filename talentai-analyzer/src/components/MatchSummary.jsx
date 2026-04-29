import { useMemo } from "react";

import MatchVsMismatchPie from "./charts/MatchVsMismatchPie.jsx";

function clampPercent(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="card">
      <div className="cardInner">
        <p className="cardTitle">{label}</p>
        <p className="cardValue">{value ?? "—"}</p>
        {hint ? <p className="cardHint">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function MatchSummary({ data }) {
  const verified = data?.comparison?.verifiedSkills ?? [];
  const unverified = data?.comparison?.unverifiedClaims ?? [];
  const verifiedCount = Array.isArray(verified) ? verified.length : 0;
  const unverifiedCount = Array.isArray(unverified) ? unverified.length : 0;

  const derivedMatch = useMemo(() => {
    const total = verifiedCount + unverifiedCount;
    if (!total) return null;
    return Math.round((verifiedCount / total) * 100);
  }, [verifiedCount, unverifiedCount]);

  const matchScore = clampPercent(data?.matchScore) ?? derivedMatch;
  const trustScore = clampPercent(data?.trustScore);

  return (
    <section className="grid grid3" style={{ marginTop: 16 }}>
      <MetricCard
        label="Match Score"
        value={matchScore != null ? `${matchScore}%` : null}
        hint="How well CV claims align with GitHub evidence"
      />
      <MetricCard
        label="Trust Score"
        value={trustScore != null ? `${trustScore}%` : null}
        hint="Confidence in the profile based on signals"
      />
      <MatchVsMismatchPie verified={verified} unverified={unverified} />
    </section>
  );
}

