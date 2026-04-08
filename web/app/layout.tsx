import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/notifications/ToastProvider";

export const metadata: Metadata = {
  title: "solana-clawd",
  description: "The agentic engine Solana deserves: MCP tools, buddies, gateway, TailClawd, and distributed worker swarm.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
        {/* @ts-expect-error -- ElevenLabs ConvAI web component */}
        <elevenlabs-convai agent-id="agent_1601knpw2ax7ejb80fdxx118n7qn" />
        <Script
          src="https://unpkg.com/@elevenlabs/convai-widget-embed"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
