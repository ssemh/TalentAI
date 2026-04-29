import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function toSkillRows(skills) {
  if (!skills || typeof skills !== "object") return [];
  return Object.entries(skills)
    .map(([tech, score]) => ({
      tech,
      score: Number.isFinite(score) ? score : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

export default function BarChartComponent({ skills }) {
  const rows = toSkillRows(skills);

  return (
    <section className="card">
      <div className="cardInner">
        <p className="cardTitle">Skills / Technologies</p>
        {!rows.length ? (
          <p className="subtitle">No skills object provided.</p>
        ) : (
          <div style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rows} margin={{ left: 0, right: 8, top: 12 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="tech"
                  tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.65)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 12,
                    color: "rgba(255,255,255,0.9)",
                  }}
                />
                <Bar dataKey="score" fill="rgba(59, 130, 246, 0.85)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {rows.length ? (
          <p className="cardHint">Top {rows.length} technologies (dynamic keys).</p>
        ) : null}
      </div>
    </section>
  );
}

