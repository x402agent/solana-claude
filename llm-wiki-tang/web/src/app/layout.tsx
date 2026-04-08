import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clawd Vault",
  description: "Solana-native research vault for tokens, wallets, protocols, and trading agents. Upload sources and let solana-clawd maintain a compounding wiki.",
  metadataBase: new URL("https://solanaclawd.net"),
  openGraph: {
    title: "Clawd Vault",
    description: "Solana-native research vault for tokens, wallets, protocols, and trading agents. Upload sources and let solana-clawd maintain a compounding wiki.",
    url: "https://solanaclawd.net",
    siteName: "Clawd Vault",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Clawd Vault" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawd Vault",
    description: "Solana-native research vault for tokens, wallets, protocols, and trading agents. Upload sources and let solana-clawd maintain a compounding wiki.",
    images: ["/og.png"],
  },
};

// Script to prevent theme flash - runs before React hydrates
// Must match the storageKey used by ThemeProvider (default is 'theme')
const themeScript = `
  (function() {
    try {
      var storageKey = 'theme';
      var stored = localStorage.getItem(storageKey);
      var isValid = stored === 'light' || stored === 'dark';
      var theme = isValid ? stored : 'light';

      // Persist a sane default so a refresh doesn't fall back to light/system
      if (!isValid) {
        localStorage.setItem(storageKey, theme);
      }

      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      document.documentElement.style.colorScheme = theme;
    } catch (e) {
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'dark';
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
          suppressHydrationWarning
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="theme"
        >
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
