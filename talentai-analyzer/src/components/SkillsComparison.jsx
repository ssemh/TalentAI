import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toRows(cvSkills, ghSkills) {
  const cv = new Set(asArray(cvSkills).map((s) => String(s)));
  const gh = new Set(asArray(ghSkills).map((s) => String(s)));
  const all = Array.from(new Set([...cv, ...gh]));

  return all
    .map((skill) => ({
      skill,
      CV: cv.has(skill) ? 1 : 0,
      GitHub: gh.has(skill) ? 1 : 0,
    }))
    .sort((a, b) => b.CV + b.GitHub - (a.CV + a.GitHub))
    .slice(0, 16);
}

export default function SkillsComparison({ data }) {
  const cvSkills = data?.cv?.extractedSkills ?? [];
  const ghSkills = data?.github?.detectedTech ?? [];
  const rows = toRows(cvSkills, ghSkills);

  return (
    <section className="card">
      <div className="cardInner">
        <p className="cardTitle">Skills comparison</p>
        {!rows.length ? (
          <p className="subtitle">No CV/GitHub skills to compare.</p>
        ) : (
          <div style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rows} margin={{ left: 0, right: 8, top: 12 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="skill"
                  tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                  allowDecimals={false}
                  domain={[0, 1]}
                  ticks={[0, 1]}
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
                  formatter={(v) => (v ? "Yes" : "No")}
                />
                <Legend />
                <Bar dataKey="CV" fill="rgba(34, 211, 238, 0.75)" radius={[8, 8, 0, 0]} />
                <Bar
                  dataKey="GitHub"
                  fill="rgba(139, 92, 246, 0.78)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="cardHint">
          Visualizes presence of skills in CV vs GitHub detection.
        </p>
      </div>
    </section>
  );
}

