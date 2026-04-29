function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function Chip({ variant = "neutral", children }) {
  const cls =
    variant === "green"
      ? "chip chipGreen"
      : variant === "red"
        ? "chip chipRed"
        : "chip";
  return <span className={cls}>{children}</span>;
}

export default function CVSection({ cv, verifiedSkills = [], unverifiedClaims = [] }) {
  const extractedSkills = asArray(cv?.extractedSkills);
  const technologies = asArray(cv?.technologies);
  const projects = asArray(cv?.projects);

  const verifiedSet = new Set(asArray(verifiedSkills).map((s) => String(s).toLowerCase()));
  const unverifiedSet = new Set(asArray(unverifiedClaims).map((s) => String(s).toLowerCase()));

  return (
    <section className="card">
      <div className="cardInner">
        <div className="cardTitle">CV data</div>

        <h3 className="sectionSubTitle">Extracted skills</h3>
        <div className="chipRow">
          {extractedSkills.length ? (
            extractedSkills.map((s) => {
              const key = String(s);
              const k = key.toLowerCase();
              const variant = verifiedSet.has(k)
                ? "green"
                : unverifiedSet.has(k)
                  ? "red"
                  : "neutral";
              return (
                <Chip key={key} variant={variant}>
                  {key}
                </Chip>
              );
            })
          ) : (
            <p className="subtitle">No CV skills provided.</p>
          )}
        </div>

        <h3 className="sectionSubTitle">Listed technologies</h3>
        <div className="chipRow">
          {technologies.length ? (
            technologies.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))
          ) : (
            <p className="subtitle">No technologies listed.</p>
          )}
        </div>

        <h3 className="sectionSubTitle">Projects mentioned</h3>
        {projects.length ? (
          <div className="stackList">
            {projects.map((p, idx) => (
              <div key={`${p?.name ?? "project"}-${idx}`} className="stackItem">
                <div className="stackHeader">
                  <span style={{ fontWeight: 800 }}>{p?.name ?? "—"}</span>
                </div>
                <div className="chipRow" style={{ marginTop: 8 }}>
                  {asArray(p?.stack).map((s) => (
                    <Chip key={`${p?.name}-${s}`}>{s}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="subtitle">No projects provided.</p>
        )}
      </div>
    </section>
  );
}

