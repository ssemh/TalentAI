import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function MatchVsMismatchPie({ verified, unverified }) {
  const v = asArray(verified).length;
  const u = asArray(unverified).length;
  const data =
    v + u
      ? [
          { name: "Verified", value: v },
          { name: "Unverified", value: u },
        ]
      : [];

  return (
    <section className="card">
      <div className="cardInner">
        <p className="cardTitle">Match vs mismatch</p>
        {!data.length ? (
          <p className="subtitle">No comparison data provided.</p>
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
                  <Cell fill="rgba(52, 211, 153, 0.82)" />
                  <Cell fill="rgba(251, 113, 133, 0.82)" />
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
        {data.length ? (
          <p className="cardHint">
            Verified: <span className="pill">{v}</span> · Unverified:{" "}
            <span className="pill">{u}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

