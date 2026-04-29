function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  const clamped = Math.max(0, Math.min(100, value));
  return `${Math.round(clamped)}%`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "—";
  return Math.round(value).toString();
}

function Card({ title, value, hint }) {
  return (
    <div className="card">
      <div className="cardInner">
        <p className="cardTitle">{title}</p>
        <p className="cardValue">{value}</p>
        {hint ? <p className="cardHint">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function DataCards({ codeQuality, ghostCoder, complexity }) {
  return (
    <section className="grid grid3">
      <Card
        title="Code Quality Score"
        value={formatPercent(codeQuality)}
        hint="Signal: structure, maintainability, conventions"
      />
      <Card
        title="Ghost Coder Percentage"
        value={formatPercent(ghostCoder)}
        hint="Signal: template-like / copied distribution"
      />
      <Card
        title="Project Complexity"
        value={formatNumber(complexity)}
        hint="Signal: architecture, dependencies, domain surface"
      />
    </section>
  );
}

