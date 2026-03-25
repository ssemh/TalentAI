import "./globals.css";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";

export const metadata = {
  title: "TalentAI",
  description: "AI-Powered Talent Intelligence Ecosystem (MVP)",
};

const headline = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-headline",
  weight: ["300", "400", "500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className={`${headline.variable} ${body.variable} font-body selection:bg-primary selection:text-on-primary`}>
        {children}
      </body>
    </html>
  );
}

