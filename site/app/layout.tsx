import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "tidal-cli — Command-line interface for Tidal",
  description:
    "Control Tidal from your terminal. Search, manage playlists, play music, and automate with LLM agents.",
  metadataBase: new URL("https://tidal-cli.lucaperret.ch"),
  openGraph: {
    title: "tidal-cli",
    description: "Control Tidal from your terminal. Built for developers and AI agents.",
    type: "website",
    url: "https://tidal-cli.lucaperret.ch",
    siteName: "tidal-cli",
  },
  twitter: {
    card: "summary_large_image",
    title: "tidal-cli",
    description: "Control Tidal from your terminal. Built for developers and AI agents.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
