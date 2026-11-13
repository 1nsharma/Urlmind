'use client';

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
];

const ROADMAP_PHASES = [
  {
    phase: 'Phase 1 · URL to Website Map',
    detail: 'Crawl public websites, extract pages, generate sitemaps, and render interactive React Flow node graphs.',
  },
  {
    phase: 'Phase 2 · AI Intelligence',
    detail: 'Synthesize architectural explanations, workflow relationships, and grounded Ask This URL Q&A.',
  },
  {
    phase: 'Phase 3 · GitHub + API Specs',
    detail: 'Direct GitHub REST repository tree inspection and OpenAPI 3.0 schema parsing.',
  },
  {
    phase: 'Phase 4 · Explainer + Export',
    detail: 'Interactive 60-second narrated storyboard player alongside Markdown, Mermaid, JSON, and PDF export.',
  },
  {
    phase: 'Phase 5 · Developer Platform',
    detail: 'Open-source core, public REST API, MCP server, and browser extension integrations.',
  },
];

export default function PipelineView({ onGoToAnalyzer }: PipelineViewProps) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            URLMIND Architecture & Pipeline
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Universal URL ingestion paired with transparent Detected vs. Inferred
            intelligence modeling.
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
