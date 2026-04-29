import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function clampPercent(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

export default function PieChartComponent({ ghostCoder }) {
  const gc = clampPercent(ghostCoder);
  const data =
    gc == null
      ? []
      : [
          { name: "Original", value: 100 - gc },
          { name: "Ghost / Copied", value: gc },
        ];

  return (
    <section className="card">
      <div className="cardInner">
        <p className="cardTitle">Ghost Coder Distribution</p>
        {!data.length ? (
          <p className="subtitle">No ghostCoder field provided.</p>
        ) : (
          <div style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                >
                  <Cell fill="rgba(34, 211, 238, 0.85)" />
                  <Cell fill="rgba(139, 92, 246, 0.9)" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.65)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 12,
                    color: "rgba(255,255,255,0.9)",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {gc != null ? (
          <p className="cardHint">
            Ghost coder: <span className="pill">{Math.round(gc)}%</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

