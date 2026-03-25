import LandingCta from "./ui/LandingCta";

export default function HomePage() {
  return (
    <main className="bg-mesh pt-16">
      <nav className="fixed top-0 z-50 w-full">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#131313]/95 via-[#131313]/75 to-transparent backdrop-blur-xl" />
        <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-3">
          <div className="neon-glow pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-[#131313]/70 px-3 py-2 backdrop-blur-xl">
            <a href="/" className="flex items-center gap-2 rounded-xl px-3 py-2">
              <span className="material-symbols-outlined text-[#DDB7FF]">terminal</span>
              <span className="bg-gradient-to-r from-[#DDB7FF] to-[#B76DFF] bg-clip-text font-headline text-xl font-bold tracking-tighter text-transparent">
                TalentAI
              </span>
            </a>

            <div className="h-7 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <a href="/cv" className="btn-neon rounded-xl px-4 py-2 text-sm font-semibold">
                CV Oluştur
              </a>
              <a href="/interview" className="btn-primary rounded-xl px-5 py-2 text-sm font-bold">
                Mülakat
              </a>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative mx-auto max-w-7xl overflow-hidden px-8 py-16 md:py-20">
        <div className="absolute right-0 top-0 -z-10 h-[500px] w-[500px] translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="max-w-4xl">
          <h1 className="mb-6 font-headline text-5xl font-bold tracking-tight leading-[1.1] md:text-7xl">
            CV’nin ötesine geç. <br />
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              GitHub’ından gerçek içgörü üret.
            </span>
          </h1>
          <p className="mb-12 max-w-2xl text-xl font-light leading-relaxed text-on-surface-variant">
            GitHub profilini yapıştır, repo &amp; README’lerden özet çıkaralım. (MVP)
          </p>

          <LandingCta />

          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-on-surface-variant/70">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">check_circle</span> Ücretsiz deneme
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">bolt</span> 1 dakikadan kısa
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">lock</span> Sadece public veriler
            </span>
          </div>
        </div>
      </section>

      <section className="relative bg-surface-container-low/30 px-8 py-14">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-10 font-headline text-3xl font-bold">Neler yapıyor?</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="glass-card card-hover flex flex-col gap-6 rounded-xl p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-3xl">description</span>
              </div>
              <h3 className="font-headline text-2xl font-bold">Akıllı Özet</h3>
              <p className="leading-relaxed text-on-surface-variant">
                Repo ve README içeriklerini tek ekranda anlaşılır şekilde toplar.
              </p>
            </div>

            <div className="glass-card card-hover flex flex-col gap-6 rounded-xl p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-tertiary/10 text-tertiary">
                <span className="material-symbols-outlined text-3xl">visibility</span>
              </div>
              <h3 className="font-headline text-2xl font-bold">Ghost Coder Tespiti</h3>
              <p className="leading-relaxed text-on-surface-variant">
                Kopyala-yapıştır / boilerplate oranını ve “gerçek katkı” sinyallerini yakalamaya odaklanır.
              </p>
            </div>

            <div className="glass-card card-hover flex flex-col gap-6 rounded-xl p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <span className="material-symbols-outlined text-3xl">forum</span>
              </div>
              <h3 className="font-headline text-2xl font-bold">Chat-First</h3>
              <p className="leading-relaxed text-on-surface-variant">
                Tüm akış sohbet ekranında ilerler (MVP: ham veri + özet).
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-[#4D4354]/15 bg-[#131313] px-8 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <span className="text-lg font-bold text-[#E5E2E1]">TalentAI</span>
            <p className="text-center font-inter text-sm text-[#CFC2D6] md:text-left">© {new Date().getFullYear()} TalentAI</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#CFC2D6]">
            <span className="material-symbols-outlined text-base text-primary">info</span>
            MVP demo
          </div>
        </div>
      </footer>
    </main>
  );
}

