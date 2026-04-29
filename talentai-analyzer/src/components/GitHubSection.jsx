function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function Chip({ children }) {
  return <span className="chip chipBlue">{children}</span>;
}

export default function GitHubSection({ github }) {
  const detected = asArray(github?.detectedTech);
  const commitFrequency = github?.commitFrequency ?? "—";

  return (
    <section className="card">
      <div className="cardInner">
        <div className="cardTitle">GitHub data</div>

        <h3 className="sectionSubTitle">Detected technologies</h3>
        <div className="chipRow">
          {detected.length ? (
            detected.map((t) => <Chip key={t}>{t}</Chip>)
          ) : (
            <p className="subtitle">No detected technologies provided.</p>
          )}
        </div>

        <h3 className="sectionSubTitle">Commit frequency</h3>
        <p className="subtitle" style={{ marginTop: 6 }}>
          <span className="pill">{commitFrequency}</span>
        </p>

        <h3 className="sectionSubTitle">Evidence</h3>
        <p className="cardHint">
          This section is meant to summarize repo signals (languages, project activity, and consistency).
        </p>
      </div>
    </section>
  );
}

