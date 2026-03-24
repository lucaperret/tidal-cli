import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — tidal-cli | How We Handle Your Data",
  description:
    "Learn how tidal-cli handles your data. No personal data collected, local token storage, OAuth 2.0 with PKCE, and full transparency as an open-source project.",
  authors: [{ name: "Luca Perret", url: "https://lucaperret.ch" }],
  other: {
    "article:published_time": "2026-03-18",
    "article:modified_time": "2026-03-18",
    "article:author": "Luca Perret",
  },
};

export default function PrivacyPolicy() {
  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <a
          href="/"
          className="text-sm text-tidal-gray-400 hover:text-white transition-colors mb-8 inline-block"
        >
          &larr; Back to home
        </a>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-tidal-gray-400 mb-2">
          Last updated: <time dateTime="2026-03-18">March 18, 2026</time>
        </p>
        <p className="text-tidal-gray-400 text-sm mb-12">
          By <a href="https://lucaperret.ch" target="_blank" rel="author noopener noreferrer" className="text-tidal-cyan hover:underline">Luca Perret</a>
        </p>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "Privacy Policy",
              url: "https://tidal-cli.lucaperret.ch/privacy",
              datePublished: "2026-03-18",
              dateModified: "2026-03-18",
              author: {
                "@type": "Person",
                name: "Luca Perret",
                url: "https://lucaperret.ch",
              },
            }),
          }}
        />

        <div className="space-y-8 text-tidal-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
            <p>
              tidal-cli is an open-source command-line tool that lets you
              interact with your Tidal account. It is designed for personal use
              and LLM agent automation. Your privacy is important to us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Data We Collect
            </h2>
            <p>
              <strong className="text-white">tidal-cli does not collect, store, or transmit any personal data to us beyond what is necessary to operate the service.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              CLI (Command-Line Interface)
            </h2>
            <p>
              When using tidal-cli as a command-line tool, it communicates directly
              between your device and Tidal&apos;s API servers. No data passes through
              any intermediary server. Authentication tokens are stored locally on your
              device at <code className="text-tidal-cyan text-sm bg-tidal-gray-800 px-1.5 py-0.5 rounded">~/.tidal-cli/session.json</code>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              MCP Server (Claude Integration)
            </h2>
            <p>
              When using tidal-cli as an MCP connector (e.g., through Claude Desktop
              or claude.ai), authentication tokens are stored server-side in an
              encrypted Redis database hosted on Upstash (via Vercel). This is required
              to maintain your Tidal session across requests in a serverless environment.
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1">
              <li>Tidal OAuth tokens are stored per-user with a 30-day TTL</li>
              <li>Tokens are used exclusively to call the Tidal API on your behalf</li>
              <li>No music content, playlists, or listening history is stored on our servers</li>
              <li>You can revoke access at any time from your Tidal account settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Authentication
            </h2>
            <p>
              Both the CLI and MCP server use OAuth 2.0 Authorization Code flow with
              PKCE to authenticate with Tidal. Your Tidal username and password are
              never seen or stored by tidal-cli — you authenticate directly with Tidal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Data Storage
            </h2>
            <ul className="list-disc list-inside mt-3 space-y-1">
              <li><strong className="text-white">CLI:</strong> OAuth tokens in <code className="text-tidal-cyan text-sm bg-tidal-gray-800 px-1.5 py-0.5 rounded">~/.tidal-cli/session.json</code> (local only)</li>
              <li><strong className="text-white">MCP:</strong> OAuth tokens in Upstash Redis (encrypted, 30-day TTL)</li>
              <li>No analytics, telemetry, or tracking</li>
              <li>No cookies on this website (except those set by Tidal during OAuth)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Third-Party Services
            </h2>
            <p>
              tidal-cli communicates with the following services:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1">
              <li>
                <strong className="text-white">Tidal API</strong> (openapi.tidal.com) — to access your music library, playlists, and catalog.
                Subject to{" "}
                <a
                  href="https://tidal.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tidal-cyan hover:underline"
                >
                  Tidal&apos;s Privacy Policy
                </a>
              </li>
              <li>
                <strong className="text-white">Tidal Auth</strong> (login.tidal.com, auth.tidal.com) — for OAuth authentication
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Open Source
            </h2>
            <p>
              tidal-cli is fully open source. You can inspect the source code to
              verify these claims at{" "}
              <a
                href="https://github.com/lucaperret/tidal-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tidal-cyan hover:underline"
              >
                github.com/lucaperret/tidal-cli
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Data Deletion
            </h2>
            <p>
              To remove all locally stored data, delete the session file:
            </p>
            <div className="mt-3 bg-tidal-gray-900 border border-tidal-gray-700 rounded-lg p-4 font-mono text-sm">
              <span className="text-tidal-cyan/50">$ </span>rm -rf ~/.tidal-cli
            </div>
            <p className="mt-3">
              You can also revoke tidal-cli&apos;s access from your Tidal account
              settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p>
              For questions about this privacy policy, open an issue on{" "}
              <a
                href="https://github.com/lucaperret/tidal-cli/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tidal-cyan hover:underline"
              >
                GitHub
              </a>
              .
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-tidal-gray-800 flex items-center justify-between text-sm text-tidal-gray-400">
            <a href="/" className="hover:text-white transition-colors">&larr; Home</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service &rarr;</a>
          </div>
        </div>
      </div>
    </main>
  );
}
