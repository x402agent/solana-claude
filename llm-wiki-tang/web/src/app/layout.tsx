import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clawd Vault",
  description: "Solana-native research vault for $CLAWD, dSolana workflows, wallets, protocols, and autonomous financial blockchain agents. Upload sources and let solana-clawd maintain a compounding wiki.",
  metadataBase: new URL("https://vault.solanaclawd.com"),
  openGraph: {
    title: "Clawd Vault",
    description: "Solana-native research vault for $CLAWD, dSolana workflows, wallets, protocols, and autonomous financial blockchain agents.",
    url: "https://vault.solanaclawd.com",
    siteName: "Clawd Vault",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Clawd Vault" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawd Vault",
    description: "Solana-native research vault for $CLAWD, dSolana workflows, wallets, protocols, and autonomous financial blockchain agents.",
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
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="theme"
        >
          {children}
          <Toaster richColors />
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
