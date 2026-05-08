import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LevelUpOverlay from "@/components/ui/LevelUpOverlay";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GREQuest — AI-Powered Verbal Prep",
  description: "Gamified GRE & GMAT verbal prep powered by AI. Streak bonuses, boss battles, and adaptive difficulty.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <LevelUpOverlay />
      </body>
    </html>
  );
}
