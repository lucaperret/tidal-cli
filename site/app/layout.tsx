import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
    "Control Tidal from your terminal with tidal-cli. Search the catalog, manage playlists, play lossless music, and automate with AI agents via CLI or MCP.",
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

const jsonLdSoftwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "tidal-cli",
  url: "https://tidal-cli.lucaperret.ch",
  author: {
    "@type": "Person",
    name: "Luca Perret",
    url: "https://lucaperret.ch",
    sameAs: ["https://github.com/lucaperret"],
  },
  description:
    "Command-line interface for Tidal music streaming. Designed for LLM agent automation.",
  applicationCategory: "Music",
  operatingSystem: "macOS, Linux, Windows",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

const jsonLdFaqPage = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I install tidal-cli?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Run `npm install -g @lucaperret/tidal-cli`, then `tidal-cli auth` to connect your Tidal account.",
      },
    },
    {
      "@type": "Question",
      name: "Can tidal-cli be used with LLM agents?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, tidal-cli is designed for LLM agent automation. Install the skill via OpenClaw or skills.sh for seamless integration with Claude Code, Codex, and other AI coding agents.",
      },
    },
    {
      "@type": "Question",
      name: "Is tidal-cli free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, tidal-cli is free and open-source under the MIT license. You need a Tidal subscription to access the music catalog.",
      },
    },
  ],
};

const jsonLdPerson = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Luca Perret",
  url: "https://lucaperret.ch",
  sameAs: ["https://github.com/lucaperret"],
  jobTitle: "Software Engineer",
  contactPoint: {
    "@type": "ContactPoint",
    url: "https://github.com/lucaperret/tidal-cli/issues",
    contactType: "technical support",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="canonical" href="https://tidal-cli.lucaperret.ch/" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdSoftwareApplication),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdFaqPage),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdPerson),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-tidal-cyan focus:text-black focus:rounded-lg focus:font-semibold focus:text-sm"
        >
          Skip to main content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
