import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import MatchSummary from "../components/MatchSummary.jsx";
import CVSection from "../components/CVSection.jsx";
import GitHubSection from "../components/GitHubSection.jsx";
import SkillsComparison from "../components/SkillsComparison.jsx";
import RepoActivityChart from "../components/RepoActivityChart.jsx";
import RepoTable from "../components/RepoTable.jsx";

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isEmptyObject(obj) {
  return !!obj && typeof obj === "object" && Object.keys(obj).length === 0;
}

export default function ValidationDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [fallbackData] = useState(() => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem("talentai:lastResult");
    return safeJsonParse(raw, null);
  });

  const data = location.state?.data ?? fallbackData ?? null;
  const github = location.state?.github ?? location.state?.username ?? "";
  const isMock = location.state?.isMock ?? false;

  const hasAnyData = useMemo(() => {
    if (!data) return false;
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === "object") return !isEmptyObject(data);
    return true;
  }, [data]);

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true" />
          <span>TalentAI</span>
        </div>
        <div className="inline" style={{ gap: 12 }}>
          <span className="pill">{github ? `@${github}` : "Validation"}</span>
          <Link className="pill pillLink" to="/">
            New analysis
          </Link>
          <Link className="pill pillLink" to="/dashboard">
            Classic dashboard
          </Link>
        </div>
      </header>

      <main style={{ paddingTop: 12 }}>
        <div className="pageHeader">
          <h1 className="title">
            <span className="gradientText">CV ↔ GitHub Validation</span>
          </h1>
          <p className="subtitle">
            Two-column comparison UI for validating résumé claims against real repository evidence.
          </p>
        </div>

        {isMock ? (
          <div style={{ marginTop: 10 }}>
            <span className="pill">Mock data</span>
          </div>
        ) : null}

        {!hasAnyData ? (
          <section className="card" style={{ marginTop: 16 }}>
            <div className="cardInner">
              <div className="cardTitle">No data</div>
              <p className="subtitle">
                Opened validation without data. Go back to{" "}
                <button
                  className="button"
                  style={{ height: 36, padding: "0 12px", marginLeft: 8 }}
                  onClick={() => navigate("/")}
                >
                  Home
                </button>
              </p>
            </div>
          </section>
        ) : null}

        <MatchSummary data={data} />

        <h2 className="sectionTitle">Comparison</h2>
        <section className="twoCol">
          <CVSection
            cv={data?.cv}
            verifiedSkills={data?.comparison?.verifiedSkills}
            unverifiedClaims={data?.comparison?.unverifiedClaims}
          />
          <GitHubSection github={data?.github} />
        </section>

        <section className="grid grid2" style={{ marginTop: 16 }}>
          <SkillsComparison data={data} />
          <RepoActivityChart activity={data?.github?.activity ?? data?.activity} />
        </section>

        {Array.isArray(data?.comparison?.inconsistencies) &&
        data.comparison.inconsistencies.length ? (
          <section className="warnBox">
            <div className="warnTitle">Warning: inconsistencies</div>
            <ul className="subtitle" style={{ margin: 0, paddingLeft: 18 }}>
              {data.comparison.inconsistencies.map((line) => (
                <li key={line} style={{ marginBottom: 6 }}>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data?.comparison?.aiSummary ? (
          <section className="card" style={{ marginTop: 16 }}>
            <div className="cardInner">
              <div className="cardTitle">AI-generated summary</div>
              <p className="subtitle">{data.comparison.aiSummary}</p>
            </div>
          </section>
        ) : null}

        <h2 className="sectionTitle">Repositories (evidence)</h2>
        <RepoTable repos={data?.repos} />
      </main>
    </div>
  );
}

