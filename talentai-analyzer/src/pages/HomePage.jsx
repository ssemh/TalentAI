import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  analyzeCandidate,
  API_BASE,
  ANALYZE_PATH,
  getStoredToken,
} from "../lib/api.js";

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => username.trim().length > 0 && !loading, [
    username,
    loading,
  ]);

  useEffect(() => {
    setError("");
  }, [username, cvFile]);

  async function onAnalyze() {
    const gh = username.trim();
    if (!gh) return;

    setLoading(true);
    setError("");

    try {
      const token = getStoredToken();
      const data = await analyzeCandidate({ github: gh, cvFile, token });
      sessionStorage.setItem("talentai:lastResult", JSON.stringify(data));
      navigate("/validation", { state: { data, github: gh, isMock: false } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const last = useMemo(() => {
    const raw = sessionStorage.getItem("talentai:lastResult");
    return safeJsonParse(raw, null);
  }, []);

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true" />
          <span>TalentAI</span>
        </div>
        <span className="pill">Vite • React Router • Recharts</span>
      </header>

      <main style={{ paddingTop: 12 }}>
        <div className="pageHeader">
          <h1 className="title">
            Analyze a developer’s <span className="gradientText">GitHub</span>
          </h1>
          <p className="subtitle">
            Dark-mode dashboard UI. Frontend-only. Data is rendered dynamically
            from the API response.
          </p>
        </div>

        <div style={{ height: 18 }} />

        <section className="card heroCard">
          <div className="cardInner" style={{ padding: 18 }}>
            <div className="cardTitle" style={{ marginBottom: 10 }}>
              Inputs
            </div>
            <div className="formRow" style={{ alignItems: "flex-start" }}>
              <div className="formGrow" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div className="cardTitle" style={{ marginBottom: 6 }}>
                    GitHub username
                  </div>
                  <input
                    className="input"
                    placeholder="e.g. torvalds"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onAnalyze();
                    }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div>
                  <div className="cardTitle" style={{ marginBottom: 6 }}>
                    CV (PDF)
                  </div>
                  <input
                    className="input"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.type !== "application/pdf") {
                        setError("Please upload a PDF file.");
                        setCvFile(null);
                        return;
                      }
                      setCvFile(f);
                    }}
                  />
                  <p className="cardHint" style={{ marginTop: 8 }}>
                    {cvFile ? (
                      <>
                        Selected: <span className="pill">{cvFile.name}</span>
                      </>
                    ) : (
                      "Optional — upload a résumé to validate claims against GitHub."
                    )}
                  </p>
                </div>
              </div>

              <div className="formActions">
                <button
                  className="button"
                  onClick={onAnalyze}
                  disabled={!canSubmit}
                >
                  <span className="inline">
                    {loading ? (
                      <span className="spinner" aria-hidden="true" />
                    ) : null}
                    {loading ? "Analyzing..." : "Analyze"}
                  </span>
                </button>
              </div>
            </div>
            <p className="cardHint" style={{ marginTop: 10 }}>
              Uploads via <span className="pill">FormData</span> to{" "}
              <span className="pill">{API_BASE}{ANALYZE_PATH}</span>{" "}
              <span className="muted">(fields: cv, github)</span>.
            </p>

            {error ? (
              <div style={{ marginTop: 12 }} className="card">
                <div className="cardInner">
                  <div className="cardTitle" style={{ color: "rgba(251,113,133,0.9)" }}>
                    Error
                  </div>
                  <p className="subtitle" style={{ color: "rgba(255,255,255,0.78)" }}>
                    {error}
                  </p>
                </div>
              </div>
            ) : null}

            {last ? (
              <div style={{ marginTop: 12 }}>
                <button
                  className="button"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(34,211,238,0.9), rgba(59,130,246,0.9))",
                  }}
                  onClick={() => navigate("/validation", { state: { data: last, isMock: true } })}
                >
                  Open last validation
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

