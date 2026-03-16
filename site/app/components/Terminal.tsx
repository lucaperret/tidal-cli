"use client";

import { motion } from "framer-motion";

interface TerminalProps {
  lines: { prompt?: boolean; text: string; dim?: boolean }[];
  title?: string;
  compact?: boolean;
}

export function Terminal({ lines, title = "Terminal", compact = false }: TerminalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-tidal-gray-700 bg-tidal-gray-900 overflow-hidden shadow-2xl"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-tidal-gray-700">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-xs text-tidal-gray-400 ml-2 font-mono">
          {title}
        </span>
      </div>

      {/* Content */}
      <div className={`p-5 font-mono text-sm ${compact ? "leading-5" : "leading-7"} overflow-x-auto text-left`}>
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
          >
            {line.prompt && (
              <span className="text-tidal-cyan select-none">$ </span>
            )}
            <span className={line.dim ? "text-tidal-gray-400" : "text-white"}>
              {line.text}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
