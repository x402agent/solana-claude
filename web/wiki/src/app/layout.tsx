import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLAWD Wiki — Solana Trading Intelligence",
  description: "AI-compiled knowledge base for Solana trading agents. OODA loops, market signals, agent memory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0f] text-[#e0e0e0] font-mono min-h-screen">
        {children}
      </body>
    </html>
  );
}
