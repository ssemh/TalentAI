import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

// Bileşenler (Dosya yollarının doğruluğundan emin ol)
import DataCards from "../components/DataCards.jsx";
import RepoTable from "../components/RepoTable.jsx";
import PieChartComponent from "../components/charts/PieChartComponent.jsx";
import BarChartComponent from "../components/charts/BarChartComponent.jsx";
import LineChartComponent from "../components/charts/LineChartComponent.jsx";

// API Servisi
import { getReports, getStoredToken } from "../lib/api";

/**
 * Yardımcı Fonksiyonlar
 */
const safeJsonParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- States ---
  const [apiReports, setApiReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fallbackData] = useState(() => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem("talentai:lastResult");
    return safeJsonParse(raw);
  });

  // --- 2. API Veri Çekme İşlemi ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = getStoredToken();
        if (token) {
          const res = await getReports(token);
          // Backend'den gelen yapıya göre res.items veya direkt res
          setApiReports(res.items || res || []);
        } else {
          // Token yoksa API çağrısını atla; sessionStorage'daki son sonucu (fallback) kullan.
          setApiReports([]);
        }
      } catch (err) {
        console.error("Dashboard API hatası:", err);
        setError(err instanceof Error ? err.message : "Veriler sunucudan alınamadı.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- 3. Veri Önceliği ve Hesaplamalar ---
  // API'den gelen en güncel raporu al
  const latestReport = useMemo(() => apiReports[0] || null, [apiReports]);

  // Sayfa geçişinden gelen veri veya yedek veri
  const localData = location.state?.data ?? fallbackData ?? null;

  // Skorları API'den dinamik olarak eşleştir
  const getScore = (name) => 
    latestReport?.scores?.find((s) => s.name === name)?.value ?? 0;

  const metrics = {
    codeQuality: getScore("CodeQuality"),
    ghostCoder: getScore("ProfileCompleteness"),
    complexity: getScore("RepositoryActivity"),
  };

  // Gösterilecek kullanıcı adı
  const githubUser = latestReport?.githubUsername || location.state?.github || location.state?.username || "User";

  // Herhangi bir veri var mı kontrolü
  const hasAnyData = useMemo(() => {
    return !!(latestReport || localData);
  }, [latestReport, localData]);

  // --- Render Mantığı ---

  if (isLoading) {
    return (
      <div className="appShell flexCenter">
        <div className="loadingSpinner">Analiz verileri yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true" />
          <span>TalentAI</span>
        </div>
        <div className="inline" style={{ gap: 12 }}>
          <span className="pill">@{githubUser}</span>
          <Link className="pill pillLink" to="/">New Analysis</Link>
          <Link className="pill pillLink" to="/validation">CV Validation</Link>
        </div>
      </header>

      <main style={{ paddingTop: 12 }}>
        <div className="pageHeader">
          <h1 className="title">
            <span className="gradientText">Dashboard</span>
          </h1>
          <p className="subtitle">
            {error ? <span style={{ color: 'red' }}>{error} (Yedek veriler gösteriliyor)</span> : "GitHub yetenek analiz sonuçları."}
          </p>
        </div>

        {!hasAnyData ? (
          <section className="card" style={{ marginTop: 16 }}>
            <div className="cardInner">
              <div className="cardTitle">Veri Bulunamadı</div>
              <p className="subtitle">Henüz bir analiz yapmamış görünüyorsunuz.</p>
              <button className="button" style={{ marginTop: 12 }} onClick={() => navigate("/")}>
                Analiz Başlat
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Üst Kartlar: Skorlar API'den geliyor */}
            <div style={{ marginTop: 16 }}>
              <DataCards
                codeQuality={metrics.codeQuality}
                ghostCoder={metrics.ghostCoder}
                complexity={metrics.complexity}
              />
            </div>

            {/* Grafikler Bölümü */}
            <h2 className="sectionTitle">Yetenek Grafikleri</h2>
            <section className="grid grid3">
              <PieChartComponent ghostCoder={metrics.ghostCoder} />
              <BarChartComponent skills={localData?.skills || latestReport?.skills} />
              <LineChartComponent activity={localData?.activity || latestReport?.activity} />
            </section>

            {/* Repository Listesi */}
            <h2 className="sectionTitle">Repolar</h2>
            <RepoTable repos={localData?.repos || latestReport?.repos} />
          </>
        )}
      </main>
    </div>
  );
}