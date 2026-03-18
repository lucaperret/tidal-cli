"use client";

import { Logo } from "./Logo";

export function Nav() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-tidal-gray-800/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex items-center gap-6">
          <a
            href="#features"
            className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
          >
            Features
          </a>
          <a
            href="#install"
            className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
          >
            Install
          </a>
          <a
            href="#automation"
            className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
          >
            Automation
          </a>
          <a
            href="https://clawhub.ai/lucaperret/tidal-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-tidal-cyan hover:text-white transition-colors"
          >
            ClawHub
          </a>
          <a
            href="https://github.com/lucaperret/tidal-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-tidal-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
        <a
          href="https://github.com/lucaperret/tidal-cli"
          target="_blank"
          rel="noopener noreferrer"
          className="md:hidden text-sm text-tidal-gray-400 hover:text-white transition-colors"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}
