import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$CLAWD Wiki — Solana Blockchain & Finance Agents",
  description: "Operational wiki for the $CLAWD Solana blockchain and finance agent stack: agent fleet, memory, risk rails, web surfaces, and execution flow.",
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
