"use client";

import { motion } from "framer-motion";
import { Nav } from "./components/Nav";
import { Terminal } from "./components/Terminal";
import { FeatureCard } from "./components/FeatureCard";

export default function Home() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.06)_0%,transparent_70%)]" />

        <div className="relative max-w-4xl mx-auto px-6 text-center pt-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-tidal-gray-700 bg-tidal-gray-900 px-4 py-1.5 mb-8">
              <div className="w-2 h-2 rounded-full bg-tidal-cyan animate-pulse" />
              <span className="text-xs font-mono text-tidal-gray-300">
                Open Source CLI for Tidal
              </span>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              Tidal from
              <br />
              <span className="text-tidal-cyan">your terminal</span>
            </h1>

            <p className="text-lg text-tidal-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
              Search, play, and manage your Tidal library with a single command.
              Built for developers, designed for LLM agent automation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <a
                href="#install"
                className="px-8 py-3 rounded-lg bg-tidal-cyan text-black font-semibold text-sm hover:bg-tidal-cyan/90 transition-colors"
              >
                Get Started
              </a>
              <a
                href="https://github.com/lucaperret/tidal-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-lg border border-tidal-gray-700 text-white font-semibold text-sm hover:border-tidal-gray-400 transition-colors"
              >
                View on GitHub
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Terminal
              title="tidal-cli"
              lines={[
                { prompt: true, text: 'tidal-cli search track "Around the World"' },
                { text: "" },
                { text: 'Search results for "Around the World" (tracks):', dim: true },
                { text: "" },
                { text: "  [5756235]  Around the World — Daft Punk (7:27, LOSSLESS)" },
                { text: "  [5756236]  Around the World — Daft Punk (Radio Edit) (3:58)" },
                { text: "  [92847103] Around the World — Moderat (4:12)" },
                { text: "" },
                { prompt: true, text: "tidal-cli playback play 5756235" },
                { text: "" },
                { text: "Downloading track 5756235 (LOSSLESS, FLAC)...", dim: true },
                { text: "Playing... Press Ctrl+C to stop.", dim: true },
              ]}
            />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-tidal-gray-400 text-lg">
              Full control over your Tidal experience, all from the command
              line.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={<SearchIcon />}
              title="Search"
              description="Search the entire Tidal catalog — artists, albums, tracks, videos, and playlists."
              commands={[
                'search artist "Gorillaz"',
                'search track "Teardrop"',
                'search video "Stylo"',
                'search playlist "Electronic"',
              ]}
            />
            <FeatureCard
              icon={<ArtistIcon />}
              title="Artist & Track"
              description="Explore artist info, full discography, and detailed track metadata including ISRC, BPM, and key."
              commands={[
                "artist info <id>",
                "artist albums <id>",
                "track info <id>",
              ]}
            />
            <FeatureCard
              icon={<DiscoveryIcon />}
              title="Discovery"
              description="Find similar artists and tracks, or get personalized recommendations from your listening history."
              commands={[
                "artist similar <id>",
                "track similar <id>",
                "recommend",
              ]}
            />
            <FeatureCard
              icon={<PlaylistIcon />}
              title="Playlists"
              description="Create, rename, delete playlists. Add or remove tracks and entire albums."
              commands={[
                "playlist list",
                'playlist create --name "Chill"',
                "playlist add-album ...",
              ]}
            />
            <FeatureCard
              icon={<PlayIcon />}
              title="Playback"
              description="Play tracks locally, get stream URLs, or inspect playback quality."
              commands={[
                "playback play 5756235",
                "playback url 5756235",
                "playback info 5756235",
              ]}
            />
            <FeatureCard
              icon={<LibraryIcon />}
              title="Library"
              description="Manage your favorites. Add or remove artists, albums, tracks, and videos."
              commands={[
                "library add --track-id ...",
                "library favorite-playlists",
                "history tracks",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="py-32 px-6 bg-tidal-dark">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">Ready in two commands</h2>
            <p className="text-tidal-gray-400 text-lg">
              Install, sign in. That&apos;s it.
            </p>
          </motion.div>

          <div className="space-y-6">
            <Terminal
              title="Installation"
              lines={[
                { prompt: true, text: "npm install -g tidal-cli" },
                { text: "" },
                { text: "# Sign in with your Tidal account", dim: true },
                { prompt: true, text: "tidal-cli auth" },
                { text: "Opening browser for Tidal authorization...", dim: true },
                { text: "Authenticated successfully! User ID: 123456789", dim: true },
                { text: "" },
                { text: "# You're ready — start exploring", dim: true },
                { prompt: true, text: 'tidal-cli search track "Teardrop"' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Automation */}
      <section id="automation" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-tidal-cyan/20 bg-tidal-cyan/10 px-4 py-1.5 mb-6">
                <span className="text-xs font-mono text-tidal-cyan">
                  LLM Ready
                </span>
              </div>
              <h2 className="text-4xl font-bold mb-4">
                Built for
                <br />
                AI automation
              </h2>
              <p className="text-tidal-gray-400 leading-relaxed mb-6">
                Every command supports{" "}
                <code className="text-tidal-cyan text-sm bg-tidal-gray-800 px-1.5 py-0.5 rounded">
                  --json
                </code>{" "}
                output for machine-readable responses. Designed as an OpenClaw
                skill, tidal-cli lets LLM agents search, curate playlists, and
                control playback programmatically.
              </p>
              <ul className="space-y-3 text-sm text-tidal-gray-300">
                <li className="flex items-center gap-3">
                  <span className="text-tidal-cyan">&#10003;</span>
                  JSON output on every command
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-tidal-cyan">&#10003;</span>
                  Non-interactive after initial auth
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-tidal-cyan">&#10003;</span>
                  Auto-refreshing tokens
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-tidal-cyan">&#10003;</span>
                  OpenClaw skill integration
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Terminal
                title="JSON output"
                lines={[
                  { prompt: true, text: "tidal-cli --json playlist list" },
                  { text: "" },
                  { text: "[" },
                  { text: "  {" },
                  { text: '    "id": "a20fff4a-...",' },
                  { text: '    "name": "Late Night Electronic",' },
                  { text: '    "numberOfItems": 24,' },
                  {
                    text: '    "createdAt": "2025-04-20T..."',
                    dim: true,
                  },
                  { text: "  }," },
                  { text: "  ..." },
                  { text: "]" },
                ]}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-tidal-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-tidal-gray-400">
            tidal-cli is an open-source project. Not affiliated with TIDAL.
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/lucaperret/tidal-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://developer.tidal.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
            >
              Tidal Developer
            </a>
            <a
              href="/privacy"
              className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
            >
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PlaylistIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15V6" />
      <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M12 12H3" />
      <path d="M16 6H3" />
      <path d="M12 18H3" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function ArtistIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

function DiscoveryIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
