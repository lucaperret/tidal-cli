"use client";

import { motion } from "framer-motion";
import { Nav } from "./components/Nav";
import { Terminal } from "./components/Terminal";
import { FeatureCard } from "./components/FeatureCard";

export default function Home() {
  return (
    <>
      <Nav />

      <main id="main-content">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.06)_0%,transparent_70%)]" />

        <div className="relative max-w-4xl mx-auto px-6 text-center pt-24 md:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-tidal-gray-700 bg-tidal-gray-900 px-4 py-1.5">
                <div className="w-2 h-2 rounded-full bg-tidal-cyan animate-pulse" />
                <span className="text-xs font-mono text-tidal-gray-300">
                  Open Source CLI for Tidal
                </span>
              </div>
              <a
                href="#automation"
                className="inline-flex items-center gap-2 rounded-full border border-ai-pink/30 bg-ai-pink-dim px-4 py-1.5 hover:border-ai-pink/60 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-ai-pink animate-pulse" />
                <span className="text-xs font-mono text-ai-pink">
                  AI Agent Ready
                </span>
              </a>
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
                href="https://clawhub.ai/lucaperret/tidal-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-lg bg-ai-pink/10 border border-ai-pink/30 text-ai-pink font-semibold text-sm hover:bg-ai-pink/20 hover:border-ai-pink transition-colors"
              >
                Install on ClawHub
              </a>
              <a
                href="https://github.com/lucaperret/tidal-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-lg border border-tidal-gray-700 text-white font-semibold text-sm hover:border-tidal-gray-400 transition-colors"
              >
                GitHub
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
                { prompt: true, text: "npm install -g @lucaperret/tidal-cli" },
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

      {/* MCP / Claude */}
      <section id="claude" className="py-32 px-6 bg-tidal-dark">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-tidal-cyan/30 bg-tidal-cyan/5 px-4 py-1.5 mb-6">
              <div className="w-2 h-2 rounded-full bg-tidal-cyan" />
              <span className="text-xs font-mono text-tidal-cyan">
                MCP Connector
              </span>
            </div>
            <h2 className="text-4xl font-bold mb-4">
              Works with <span className="text-tidal-cyan">Claude</span>
            </h2>
            <p className="text-tidal-gray-400 text-lg">
              Connect your Tidal account to Claude Desktop or claude.ai.
              No install needed — just add the connector URL.
            </p>
          </motion.div>

          <div className="space-y-6">
            <div className="rounded-xl border border-tidal-gray-700 bg-tidal-gray-900 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-tidal-cyan/10 border border-tidal-cyan/20 flex items-center justify-center text-tidal-cyan font-bold text-lg">1</div>
                <div>
                  <p className="text-white font-medium mb-1">Add the connector</p>
                  <p className="text-tidal-gray-400 text-sm">Settings &rarr; Connectors &rarr; Add custom connector</p>
                  <div className="mt-3 bg-black/50 rounded-lg p-3 font-mono text-sm text-tidal-cyan select-all">
                    https://tidal-cli.lucaperret.ch/api/mcp
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-tidal-gray-700 bg-tidal-gray-900 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-tidal-cyan/10 border border-tidal-cyan/20 flex items-center justify-center text-tidal-cyan font-bold text-lg">2</div>
                <div>
                  <p className="text-white font-medium mb-1">Connect your Tidal account</p>
                  <p className="text-tidal-gray-400 text-sm">Click &ldquo;Connect&rdquo; and sign in with your Tidal credentials. OAuth keeps your password safe.</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-tidal-gray-700 bg-tidal-gray-900 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-tidal-cyan/10 border border-tidal-cyan/20 flex items-center justify-center text-tidal-cyan font-bold text-lg">3</div>
                <div>
                  <p className="text-white font-medium mb-1">Ask Claude anything about music</p>
                  <p className="text-tidal-gray-400 text-sm">32 tools available — search, playlists, library, recommendations, and more.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="https://smithery.ai/servers/lucaperret/tidal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-tidal-gray-400 hover:text-tidal-cyan transition-colors"
            >
              Also available on Smithery &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* AI Prompts */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-ai-pink/30 bg-ai-pink-dim px-4 py-1.5 mb-6">
              <div className="w-2 h-2 rounded-full bg-ai-pink" />
              <span className="text-xs font-mono text-ai-pink">
                AI Agent
              </span>
            </div>
            <h2 className="text-4xl font-bold mb-4">
              Just ask your agent
            </h2>
            <p className="text-tidal-gray-400 text-lg">
              Tell your AI what you want. It handles the rest.
            </p>
          </motion.div>

          <div className="space-y-3">
            {[
              { prompt: "Create a playlist with the best tracks from Daft Punk's Discovery album", desc: "Searches, creates playlist, adds tracks" },
              { prompt: "Find artists similar to Massive Attack and add their top tracks to my library", desc: "Discovers similar artists, adds to favorites" },
              { prompt: "What are my playlists? Add the new LCD Soundsystem album to the first one", desc: "Lists playlists, searches album, adds tracks" },
              { prompt: "Play me something by Boards of Canada", desc: "Searches, picks a track, plays it" },
              { prompt: "Build a 2000s indie rock playlist with The Strokes, Arctic Monkeys, and Interpol", desc: "Multi-step: create, search, add tracks" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="group rounded-xl border border-tidal-gray-700 bg-tidal-gray-900 p-5 hover:border-ai-pink/30 transition-colors"
              >
                <p className="text-white text-sm mb-1">{item.prompt}</p>
                <p className="text-tidal-gray-400 text-xs italic">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Automation */}
      <section id="automation" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,114,182,0.04)_0%,transparent_70%)]" />
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-ai-pink/30 bg-ai-pink-dim px-4 py-1.5 mb-6">
                <div className="w-2 h-2 rounded-full bg-ai-pink" />
                <span className="text-xs font-mono text-ai-pink">
                  AI Agent Skill
                </span>
              </div>
              <h2 className="text-4xl font-bold mb-4">
                Built for
                <br />
                <span className="text-ai-pink">AI automation</span>
              </h2>
              <p className="text-tidal-gray-400 leading-relaxed mb-6">
                Every command supports{" "}
                <code className="text-ai-pink text-sm bg-ai-pink-dim px-1.5 py-0.5 rounded">
                  --json
                </code>{" "}
                output for machine-readable responses. Available as a skill on{" "}
                <a href="https://clawhub.ai/lucaperret/tidal-cli" target="_blank" rel="noopener noreferrer" className="text-tidal-cyan hover:underline">ClawHub</a>,
                tidal-cli lets LLM agents search, curate playlists, and
                control playback programmatically.
              </p>
              <div className="bg-tidal-gray-900 border border-ai-pink/20 rounded-lg p-4 font-mono text-sm mb-6">
                <span className="text-ai-pink/50 select-none">$ </span>
                <span className="text-white">clawhub install tidal-cli</span>
              </div>
              <ul className="space-y-3 text-sm text-tidal-gray-300">
                <li className="flex items-center gap-3">
                  <span className="text-ai-pink">&#10003;</span>
                  JSON output on every command
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-ai-pink">&#10003;</span>
                  Non-interactive after initial auth
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-ai-pink">&#10003;</span>
                  Auto-refreshing tokens
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-ai-pink">&#10003;</span>
                  <a href="https://clawhub.ai/lucaperret/tidal-cli" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Available on ClawHub</a>
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
                compact
                lines={[
                  { prompt: true, text: "tidal-cli --json playlist list" },
                  { text: "" },
                  { text: "[{" },
                  { text: '  "id": "a20fff4a-...",' },
                  { text: '  "name": "Late Night Electronic",' },
                  { text: '  "numberOfItems": 24,' },
                  { text: '  "createdAt": "2025-04-20T..."', dim: true },
                  { text: "}, ...]" },
                ]}
              />
            </motion.div>
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-tidal-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <p className="text-sm text-tidal-gray-400">
                Built by{" "}
                <a
                  href="https://lucaperret.ch"
                  target="_blank"
                  rel="author noopener noreferrer"
                  className="text-white hover:text-tidal-cyan transition-colors"
                >
                  Luca Perret
                </a>
              </p>
              <p className="text-sm text-tidal-gray-400 mt-1">
                Open-source CLI for Tidal. Not affiliated with TIDAL.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/lucaperret"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tidal-gray-400 hover:text-white transition-colors"
                aria-label="GitHub profile"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a
                href="https://github.com/lucaperret/tidal-cli/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-6 border-t border-tidal-gray-800">
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
              href="https://clawhub.ai/lucaperret/tidal-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
            >
              ClawHub
            </a>
            <a
              href="https://smithery.ai/servers/lucaperret/tidal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
            >
              Smithery
            </a>
            <a
              href="/privacy"
              className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
            >
              Terms
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
