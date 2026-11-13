'use client';

import { useState } from 'react';
import { Check, Copy, Server, Terminal } from 'lucide-react';

interface PipelineViewProps {
  onGoToAnalyzer: () => void;
}

const CONVERSION_MATRIX = [
  {
    input: 'Website URL',
    output: 'Website Architecture',
    extracts: 'Pages, navigation, internal links, sitemap, content hierarchy, user journeys',
  },
  {
    input: 'Web App URL',
    output: 'Application Map',
    extracts: 'Visible modules, UI flows, routes, integrations, detected client technologies',
  },
  {
    input: 'API Documentation',
    output: 'API Architecture',
    extracts: 'REST endpoints, OpenAPI request/response schemas, authentication, dependencies',
  },
  {
    input: 'Article / Docs',
    output: 'Knowledge Graph',
    extracts: 'Topics, concepts, references, relationships, summarized knowledge',
  },
  {
    input: 'GitHub URL',
    output: 'Codebase Architecture',
    extracts: 'Directories, source packages, components, dependencies, execution flows',
  },
  {
    input: 'Video & Media URL',
    output: 'Media & Creator Map',
    extracts: 'YouTube oEmbed metadata, creator channel links, topic breakdown, takeaways',
  },
  {
    input: 'Social Post / Thread',
    output: 'Social Intelligence Map',
    extracts: 'Public X/Twitter oEmbed posts, OpenGraph previews, and gated-access transparency',
  },
];

const ROADMAP_PHASES = [
  {
    phase: 'Phase 1 · URL to Website Map',
    detail: 'Crawl public websites, extract pages, generate sitemaps, and render interactive React Flow node graphs.',
  },
  {
    phase: 'Phase 2 · AI Intelligence & Mermaid',
    detail: 'Synthesize architectural explanations, live Mermaid v11 SVG flowcharts, and grounded Ask This URL Q&A.',
  },
  {
    phase: 'Phase 3 · GitHub, API & Social oEmbed',
    detail: 'Direct GitHub REST tree inspection, OpenAPI 3.0 schema parsing, plus YouTube/X/Instagram adapters.',
  },
  {
    phase: 'Phase 4 · Explainer + Persistent Cache',
    detail: 'Interactive 60s storyboard player, shared server LRU caching, and Markdown/Mermaid/SVG/JSON export.',
  },
  {
    phase: 'Phase 5 · Open-Source Self-Hosting',
    detail: 'Containerized Next.js deployment with server-only environment configuration and extensible adapters.',
  },
];

const ENV_VARIABLES = [
  {
    name: 'GEMINI_API_KEY',
    requirement: 'Required',
    purpose: 'Server-side Gemini synthesis key used exclusively by /api/* routes.',
  },
  {
    name: 'META_OEMBED_TOKEN',
    requirement: 'Optional',
    purpose: 'Meta App token enabling authenticated Instagram Graph oEmbed previews.',
  },
  {
    name: 'CACHE_TTL_HOURS',
    requirement: 'Optional',
    purpose: 'Server disk & memory cache lifetime in hours (defaults to 24).',
  },
];

const DOCKER_SNIPPET = `docker build -t urlmind .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key -e CACHE_TTL_HOURS=24 urlmind`;

export default function PipelineView({ onGoToAnalyzer }: PipelineViewProps) {
  const [copiedDocker, setCopiedDocker] = useState(false);

  const handleCopyDocker = async () => {
    try {
      await navigator.clipboard.writeText(DOCKER_SNIPPET);
      setCopiedDocker(true);
      setTimeout(() => setCopiedDocker(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            URLMIND Architecture & Pipeline
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Universal URL ingestion paired with transparent Detected vs. Inferred
            intelligence modeling and open-source self-hosting.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToAnalyzer}
          className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
        >
          Open Analyzer
        </button>
      </div>

      {/* Conversion Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Supported URL Conversions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50">
                <th className="py-2.5 px-4 font-medium">Input Type</th>
                <th className="py-2.5 px-4 font-medium">Intelligence Output</th>
                <th className="py-2.5 px-4 font-medium">Extracted Entities & Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {CONVERSION_MATRIX.map((row) => (
                <tr key={row.input}>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {row.input}
                  </td>
                  <td className="py-3 px-4 text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                    {row.output}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {row.extracts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open-Source & Self-Hosting */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Open-Source & Self-Hosting
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Keys remain server-side via environment variables
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Terminal className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Run with Docker</span>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyDocker()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {copiedDocker ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" aria-hidden="true" />
                    <span>Copy command</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-lg bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
              <code>{DOCKER_SNIPPET}</code>
            </pre>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Shared report caching stores normalized JSON snapshots under{' '}
              <code className="font-mono text-slate-800 dark:text-slate-200">.cache/urlmind/</code>{' '}
              on disk so repeat team lookups resolve immediately without redundant crawls.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-3 font-medium">Environment Variable</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ENV_VARIABLES.map((env) => (
                  <tr key={env.name}>
                    <td className="py-2.5 pr-3 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {env.name}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {env.requirement}
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400">
                      {env.purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Platform Evolution Roadmap
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROADMAP_PHASES.map((item) => (
            <div
              key={item.phase}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
            >
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                {item.phase}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
