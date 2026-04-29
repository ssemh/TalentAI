import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function toRows(activity) {
  if (!Array.isArray(activity)) return [];
  return activity
    .map((a) => ({
      date: a?.date ?? "",
      commits: Number.isFinite(a?.commits) ? a.commits : 0,
    }))
    .filter((r) => r.date);
}

export default function LineChartComponent({ activity }) {
  const rows = toRows(activity);

  return (
    <section className="card">
      <div className="cardInner">
        <p className="cardTitle">Commit Activity</p>
        {!rows.length ? (
          <p className="subtitle">No activity array provided.</p>
        ) : (
          <div style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={rows} margin={{ left: 0, right: 8, top: 12 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
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
                <Line
                  type="monotone"
                  dataKey="commits"
                  stroke="rgba(139, 92, 246, 0.92)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {rows.length ? (
          <p className="cardHint">Daily commits over time.</p>
        ) : null}
      </div>
    </section>
  );
}

