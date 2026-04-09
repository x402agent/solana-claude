import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clawd Vault",
  description: "Solana-native research vault for tokens, wallets, protocols, and trading agents. Upload sources and let solana-clawd maintain a compounding wiki.",
  metadataBase: new URL("https://vault.solanaclawd.com"),
  openGraph: {
    title: "Clawd Vault",
    description: "Solana-native research vault for tokens, wallets, protocols, and trading agents.",
    url: "https://vault.solanaclawd.com",
    siteName: "Clawd Vault",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Clawd Vault" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawd Vault",
    description: "Solana-native research vault for tokens, wallets, protocols, and trading agents.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster richColors theme="dark" />
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
