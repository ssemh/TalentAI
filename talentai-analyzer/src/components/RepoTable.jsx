function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function RepoTable({ repos }) {
  const rows = asArray(repos);

  return (
    <section className="card">
      <div className="cardInner tableWrap">
        {!rows.length ? (
          <>
            <div className="cardTitle">Repository table</div>
            <p className="subtitle">No repositories in response.</p>
          </>
        ) : (
          <table className="table" role="table">
            <thead>
              <tr>
                <th className="th">Repository Name</th>
                <th className="th">Stars</th>
                <th className="th">Commits</th>
                <th className="th">Primary Language</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr className="tr" key={`${r?.name ?? "repo"}-${idx}`}>
                  <td className="td" style={{ fontWeight: 700 }}>
                    {r?.name ?? "—"}
                  </td>
                  <td className="td">{Number.isFinite(r?.stars) ? r.stars : "—"}</td>
                  <td className="td">
                    {Number.isFinite(r?.commits) ? r.commits : "—"}
                  </td>
                  <td className="td">{r?.language ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

