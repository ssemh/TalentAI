import ChatClient from "../../components/ChatClient";
import TopTabs from "../ui/TopTabs";

export default function ChatPage() {
  return (
    <main className="bg-mesh min-h-screen text-on-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 pt-24">
        <header className="mt-2">
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tight">TalentAI</h1>
            <p className="max-w-xl text-sm text-on-surface-variant">
              GitHub kullanıcı adı veya URL yapıştırıp analizi başlat.
            </p>
            <a href="/" className="btn-neon rounded-xl px-4 py-2 text-sm font-semibold">
              Ana sayfa
            </a>
          </div>
          <div className="mt-4">
            <TopTabs />
          </div>
        </header>
        <ChatClient />
      </div>
    </main>
  );
}

