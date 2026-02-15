"use client";

import { motion } from "framer-motion";

const nodes = [
  { x: 65, y: 20, size: 4, delay: 0 },
  { x: 80, y: 35, size: 3, delay: 0.5 },
  { x: 55, y: 45, size: 5, delay: 1 },
  { x: 90, y: 55, size: 3, delay: 0.3 },
  { x: 70, y: 65, size: 4, delay: 0.8 },
  { x: 85, y: 18, size: 3, delay: 1.2 },
  { x: 60, y: 75, size: 4, delay: 0.6 },
  { x: 78, y: 80, size: 3, delay: 0.2 },
  { x: 95, y: 40, size: 3, delay: 0.9 },
  { x: 50, y: 30, size: 4, delay: 1.5 },
  { x: 72, y: 50, size: 6, delay: 0.4 },
  { x: 88, y: 70, size: 3, delay: 1.1 },
];

const connections = [
  [0, 1], [0, 5], [1, 3], [1, 4], [2, 4],
  [2, 9], [3, 8], [4, 6], [4, 10], [5, 8],
  [6, 7], [7, 11], [10, 1], [10, 6], [9, 0],
  [3, 11], [8, 5],
];

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-20">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />

      {/* Network constellation */}
      <div className="pointer-events-none absolute inset-0 hidden opacity-40 md:block">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          {/* Connection lines */}
          {connections.map(([from, to], i) => (
            <motion.line
              key={`line-${i}`}
              x1={nodes[from].x}
              y1={nodes[from].y}
              x2={nodes[to].x}
              y2={nodes[to].y}
              stroke="rgba(59, 130, 246, 0.12)"
              strokeWidth="0.15"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.5 + i * 0.08, ease: "easeOut" }}
            />
          ))}

          {/* Data pulse along connections */}
          {connections.filter((_, i) => i % 3 === 0).map(([from, to], i) => (
            <motion.circle
              key={`pulse-${i}`}
              r="0.4"
              fill="#60a5fa"
              initial={{ opacity: 0 }}
              animate={{
                cx: [nodes[from].x, nodes[to].x],
                cy: [nodes[from].y, nodes[to].y],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 3,
                delay: 2 + i * 1.5,
                repeat: Infinity,
                repeatDelay: 4 + i,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Nodes */}
          {nodes.map((node, i) => (
            <g key={`node-${i}`}>
              {/* Outer glow */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.size * 0.6}
                fill="rgba(96, 165, 250, 0.08)"
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.5, 1] }}
                transition={{
                  scale: { duration: 4, delay: node.delay + 1, repeat: Infinity, ease: "easeInOut" },
                }}
              />
              {/* Core dot */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.size * 0.25}
                fill="#60a5fa"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: [0.4, 0.9, 0.4] }}
                transition={{
                  scale: { duration: 0.5, delay: node.delay },
                  opacity: { duration: 3, delay: node.delay + 0.5, repeat: Infinity, ease: "easeInOut" },
                }}
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm text-accent-bright">
            <span className="h-2 w-2 rounded-full bg-accent-bright animate-pulse" />
            Accepting new contracts
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Enterprise-grade solutions.
            <br />
            <span className="text-accent-bright">Independent-scale attention.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            Custom software, network engineering, and IT strategy for
            businesses that can&apos;t afford to get it wrong. 21 years of
            hands-on experience &mdash; no layers of management between
            you and the person doing the work.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a
              href="tel:+15599001400"
              className="group flex items-center justify-center gap-3 rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/25"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
              </svg>
              (559) 900-1400
            </a>
            <a
              href="#services"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-8 py-4 text-lg font-medium text-foreground transition-colors hover:border-white/20 hover:bg-surface-light"
            >
              Our services
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
