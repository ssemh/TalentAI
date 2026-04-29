export const API_BASE =
  import.meta.env.VITE_API_BASE?.trim() ||
  // Dev: Vite proxy ile backend'e gider. Prod: aynı origin altında /api ile çalışacak şekilde varsayılır.
  "/api/v1";

export const ANALYZE_PATH =
  import.meta.env.VITE_ANALYZE_PATH?.trim() ||
  // Default: POST /api/v1/analyze
  "/analyze";

export function getStoredToken() {
  if (typeof window === "undefined") return "";
  const candidates = [
    localStorage.getItem("token"),
    localStorage.getItem("accessToken"),
    localStorage.getItem("jwt"),
    sessionStorage.getItem("token"),
    sessionStorage.getItem("accessToken"),
    sessionStorage.getItem("jwt"),
  ].filter(Boolean);

  return candidates[0] || "";
}

async function apiFetch(path, { token, ...init } = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`);
  }
  return await res.json();
}

async function apiFetchForm(path, formData, { token, ...init } = {}) {
  const headers = new Headers(init.headers);
  // FormData'da Content-Type'ı set etmiyoruz; browser boundary ekliyor.
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    ...init,
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`);
  }

  return await res.json();
}

export async function getReports(token) {
  return await apiFetch("/reports?page=1&pageSize=10", { method: "GET", token });
}

// ─────────────────────────────────────────────────────────────────────────────
// GitHub Public API Fallback
// Backend ulaşılamadığında (502, connection refused vb.) doğrudan GitHub API
// kullanarak gerçek veri çeker.
// ─────────────────────────────────────────────────────────────────────────────

const GITHUB_API = "https://api.github.com";

async function ghFetch(path) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("GitHub kullanıcısı bulunamadı.");
    if (res.status === 403) throw new Error("GitHub API rate limit aşıldı. Biraz bekleyin.");
    throw new Error(`GitHub API hatası: ${res.status}`);
  }
  return res.json();
}

/**
 * GitHub Public API üzerinden kullanıcı profilini, repolarını,
 * dil dağılımını ve commit aktivitesini çeker.
 */
async function analyzeViaGitHub(username) {
  // 1. Kullanıcı profili
  const profile = await ghFetch(`/users/${username}`);

  // 2. Public repolar (en fazla 100, star'a göre sıralı)
  const repos = await ghFetch(
    `/users/${username}/repos?per_page=100&sort=updated&direction=desc`
  );

  // 3. Dil dağılımı hesapla
  const langCount = {};
  for (const r of repos) {
    if (r.language) {
      langCount[r.language] = (langCount[r.language] || 0) + 1;
    }
  }

  // Dil yüzdeleri
  const totalLangRepos = Object.values(langCount).reduce((a, b) => a + b, 0) || 1;
  const skills = {};
  for (const [lang, count] of Object.entries(langCount)) {
    skills[lang] = Math.round((count / totalLangRepos) * 100);
  }

  // 4. Son 6 haftalık commit aktivitesi (events API üzerinden tahmin)
  let activity = [];
  try {
    const events = await ghFetch(`/users/${username}/events/public?per_page=100`);
    const pushEvents = events.filter((e) => e.type === "PushEvent");

    // Haftalık gruplama
    const weekMap = {};
    for (const ev of pushEvents) {
      const d = new Date(ev.created_at);
      // Haftanın pazartesisine yuvarla
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const key = monday.toISOString().slice(0, 10);
      const commits = ev.payload?.commits?.length || 1;
      weekMap[key] = (weekMap[key] || 0) + commits;
    }

    activity = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([date, commits]) => ({ date, commits }));
  } catch {
    // Events API başarısız olursa boş bırak
    activity = [];
  }

  // 5. En önemli repoları hazırla
  const topRepos = repos.slice(0, 10).map((r) => ({
    name: r.name,
    stars: r.stargazers_count,
    commits: r.size, // Yaklaşık büyüklük
    language: r.language || "—",
    url: r.html_url,
    description: r.description || "",
    forks: r.forks_count,
    updated: r.updated_at,
  }));

  // 6. Detected technologies
  const detectedTech = Object.entries(langCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([lang]) => lang);

  // 7. Commit frequency label
  const totalCommits = activity.reduce((s, a) => s + a.commits, 0);
  const avgPerWeek = activity.length ? totalCommits / activity.length : 0;
  let commitFrequency = "Low";
  if (avgPerWeek >= 10) commitFrequency = "Very Active (daily)";
  else if (avgPerWeek >= 5) commitFrequency = "Steady (weekly)";
  else if (avgPerWeek >= 2) commitFrequency = "Moderate";

  // 8. Skor hesaplama
  const repoCount = repos.length;
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const codeQuality = Math.min(100, Math.round(40 + (totalStars / Math.max(repoCount, 1)) * 5 + repoCount * 0.5));
  const ghostCoder = Math.max(0, Math.min(100, 100 - Math.round(avgPerWeek * 8 + repoCount * 0.8)));
  const complexity = Math.min(100, Math.round(detectedTech.length * 12 + repoCount * 0.6));

  return {
    matchScore: Math.round((codeQuality + (100 - ghostCoder) + complexity) / 3),
    trustScore: Math.min(100, Math.round(repoCount * 1.5 + totalStars * 0.5 + avgPerWeek * 3)),
    githubUsername: username,
    profile: {
      name: profile.name || username,
      avatar: profile.avatar_url,
      bio: profile.bio || "",
      followers: profile.followers,
      following: profile.following,
      publicRepos: profile.public_repos,
    },
    cv: {
      extractedSkills: [],
      technologies: [],
      projects: [],
    },
    github: {
      detectedTech,
      commitFrequency,
      activity,
    },
    comparison: {
      verifiedSkills: detectedTech.slice(0, 3),
      unverifiedClaims: [],
      inconsistencies: [],
      aiSummary: `GitHub profili analiz edildi. ${profile.name || username} toplam ${repoCount} public repoya sahip, ${totalStars} star almış. En çok kullanılan diller: ${detectedTech.slice(0, 3).join(", ")}. Haftalık ortalama commit: ~${avgPerWeek.toFixed(1)}.`,
    },
    ghostCoder,
    codeQuality,
    complexity,
    skills,
    repos: topRepos,
    activity,
    _source: "github-api-fallback",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana analyze fonksiyonu — backend'i dener, başarısız olursa GitHub fallback
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeCandidate({ github, cvFile, token } = {}) {
  const gh = String(github || "").trim();
  if (!gh) throw new Error("GitHub username boş olamaz.");

  // Önce backend'i dene
  try {
    const formData = new FormData();
    formData.append("github", gh);
    if (cvFile) formData.append("cv", cvFile);

    const result = await apiFetchForm(ANALYZE_PATH, formData, { token });
    return result;
  } catch (backendErr) {
    console.warn("Backend ulaşılamıyor, GitHub API fallback kullanılıyor:", backendErr.message);

    // Backend başarısız → GitHub Public API üzerinden analiz
    try {
      const fallbackResult = await analyzeViaGitHub(gh);
      return fallbackResult;
    } catch (ghErr) {
      // GitHub da başarısız olursa, orijinal backend hatasını da göster
      throw new Error(
        `Backend: ${backendErr.message}\nGitHub Fallback: ${ghErr.message}`
      );
    }
  }
}