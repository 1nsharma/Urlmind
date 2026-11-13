import { normalizeAndValidateUrl } from './classifier';
import type {
  IntelligenceEdge,
  IntelligenceNode,
  NodeLayer,
  SitemapItem,
  TechItem,
  UrlIntelligenceReport,
} from './types';

export const SAMPLE_WAPPALYZER_CSV = `URL,Technology,Categories,Version,Confidence
https://gitdiagram.com,Next.js,Web frameworks;React frameworks,15,100
https://gitdiagram.com,React,JavaScript frameworks,19,100
https://gitdiagram.com,Tailwind CSS,UI frameworks,4,100
https://gitdiagram.com,Radix UI,UI libraries,,100
https://gitdiagram.com,Lucide,Icons,,100
https://gitdiagram.com,Mermaid,JavaScript graphics,11,100
https://gitdiagram.com,Turbopack,Build tools,,100
https://gitdiagram.com,Priority Hints,Performance,,100
https://gitdiagram.com,Cloudflare,CDN;Reverse proxies,,100
https://gitdiagram.com,PostHog,Analytics,,100
https://gitdiagram.com,Open Graph,Miscellaneous;SEO,,100`;

interface ParsedCsvRow {
  url?: string;
  technology: string;
  rawCategory: string;
  version?: string;
  confidence?: string;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function mapRawCategoryToTechCategory(
  raw: string,
  techName = '',
): TechItem['category'] {
  const lower = `${raw} ${techName}`.toLowerCase();
  if (lower.includes('cdn') || lower.includes('proxy') || lower.includes('hosting') || lower.includes('cloud') || lower.includes('paas') || lower.includes('server') || lower.includes('vercel')) {
    return 'Infrastructure';
  }
  if (lower.includes('analytic') || lower.includes('telemetry') || lower.includes('tag manager') || lower.includes('posthog') || lower.includes('plausible')) {
    return 'Analytics';
  }
  if (lower.includes('security') || lower.includes('auth') || lower.includes('waf')) {
    return 'Auth / Security';
  }
  if (lower.includes('seo') || lower.includes('open graph') || lower.includes('metadata')) {
    return 'SEO / Metadata';
  }
  if (lower.includes('performance') || lower.includes('hint') || lower.includes('cache')) {
    return 'Performance';
  }
  if (lower.includes('bundler') || lower.includes('build') || lower.includes('webpack') || lower.includes('vite') || lower.includes('turbopack')) {
    return 'Bundler & Build';
  }
  if (lower.includes('graphic') || lower.includes('chart') || lower.includes('diagram') || lower.includes('mermaid') || lower.includes('canvas') || lower.includes('3d')) {
    return 'Graphics / Visualization';
  }
  if (lower.includes('icon') || lower.includes('lucide') || lower.includes('radix') || lower.includes('shadcn') || lower.includes('ui librar')) {
    return 'UI & Icons';
  }
  if (lower.includes('css') || lower.includes('tailwind') || lower.includes('styling')) {
    return 'Styling';
  }
  if (lower.includes('api') || lower.includes('graphql') || lower.includes('rest') || lower.includes('openapi')) {
    return 'API / Protocol';
  }
  if (lower.includes('language') || lower.includes('typescript') || lower.includes('python') || lower.includes('node')) {
    return 'Language / Runtime';
  }
  return 'Framework';
}

function mapTechCategoryToLayer(category: TechItem['category']): NodeLayer {
  switch (category) {
    case 'Infrastructure':
    case 'Performance':
      return 'entry';
    case 'Framework':
    case 'Styling':
    case 'UI & Icons':
    case 'Graphics / Visualization':
    case 'SEO / Metadata':
      return 'frontend';
    case 'Bundler & Build':
    case 'Language / Runtime':
    case 'API / Protocol':
    case 'Auth / Security':
      return 'logic';
    case 'Analytics':
      return 'external';
  }
}

export function parseTechCsv(csvText: string): {
  rows: ParsedCsvRow[];
  detectedUrl?: string;
} {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('CSV input is empty. Upload or paste a Wappalyzer / BuiltWith CSV.');
  }

  const firstCells = splitCsvLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = firstCells.some(
    (c) =>
      c.includes('tech') ||
      c.includes('name') ||
      c.includes('categor') ||
      c === 'url' ||
      c === 'domain',
  );

  let urlIdx = -1;
  let techIdx = 0;
  let catIdx = 1;
  let verIdx = -1;
  let confIdx = -1;

  if (hasHeader) {
    urlIdx = firstCells.findIndex((c) => c === 'url' || c === 'domain' || c === 'site' || c === 'host');
    techIdx = firstCells.findIndex((c) => c.includes('tech') || c === 'name' || c === 'product');
    if (techIdx === -1) techIdx = urlIdx === 0 ? 1 : 0;
    catIdx = firstCells.findIndex((c) => c.includes('categor') || c === 'type');
    if (catIdx === -1) catIdx = techIdx + 1;
    verIdx = firstCells.findIndex((c) => c.includes('version'));
    confIdx = firstCells.findIndex((c) => c.includes('confiden'));
  }

  const startRow = hasHeader ? 1 : 0;
  const rows: ParsedCsvRow[] = [];
  let detectedUrl: string | undefined;

  for (let i = startRow; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const tech = (cells[techIdx] || '').trim();
    if (!tech) continue;

    const rawUrl = urlIdx >= 0 ? cells[urlIdx] : undefined;
    if (!detectedUrl && rawUrl && rawUrl.includes('.')) {
      detectedUrl = rawUrl;
    }

    rows.push({
      url: rawUrl,
      technology: tech,
      rawCategory: (cells[catIdx] || 'Framework').trim(),
      version: verIdx >= 0 ? cells[verIdx]?.trim() : undefined,
      confidence: confIdx >= 0 ? cells[confIdx]?.trim() : undefined,
    });
  }

  if (rows.length === 0) {
    throw new Error(
      'No technology rows were found in the CSV. Expected columns such as URL, Technology, Categories.',
    );
  }

  return { rows, detectedUrl };
}

export function buildReportFromTechCsv(
  csvText: string,
  targetUrlOverride?: string,
): UrlIntelligenceReport {
  const { rows, detectedUrl } = parseTechCsv(csvText);

  const rawTarget = (targetUrlOverride || detectedUrl || 'imported-stack.example.com').trim();
  const validation = normalizeAndValidateUrl(rawTarget);
  const normalizedUrl = validation.valid && validation.normalizedUrl
    ? validation.normalizedUrl
    : 'https://imported-stack.example.com/';
  const domain = validation.valid && validation.domain
    ? validation.domain
    : 'imported-stack.example.com';

  // Deduplicate technologies into TechItem[]
  const techMap = new Map<string, TechItem>();
  const layerBuckets: Record<NodeLayer, TechItem[]> = {
    entry: [],
    frontend: [],
    logic: [],
    data: [],
    external: [],
  };

  for (const row of rows) {
    const key = row.technology.toLowerCase();
    if (techMap.has(key)) continue;

    const mappedCategory = mapRawCategoryToTechCategory(
      row.rawCategory,
      row.technology,
    );
    const versionPart = row.version ? ` v${row.version}` : '';
    const confPart = row.confidence ? ` · ${row.confidence}%` : '';

    const item: TechItem = {
      name: row.version ? `${row.technology} ${row.version}` : row.technology,
      category: mappedCategory,
      confidence: 'detected',
      evidence: `CSV Export (${row.rawCategory}${versionPart}${confPart})`,
    };
    techMap.set(key, item);
    layerBuckets[mapTechCategoryToLayer(mappedCategory)].push(item);
  }

  const techStack = Array.from(techMap.values());

  // Build layered architectural nodes from CSV categories
  const nodes: IntelligenceNode[] = [];
  const edges: IntelligenceEdge[] = [];

  const infraFirst = [
    ...layerBuckets.entry.filter((t) => t.category === 'Infrastructure'),
    ...layerBuckets.entry.filter((t) => t.category !== 'Infrastructure'),
  ];
  const entryTechNames = infraFirst.map((t) => t.name);
  nodes.push({
    id: 'csv-entry',
    label: entryTechNames.length > 0 ? `${domain} Edge (${entryTechNames[0]})` : `${domain} Entry`,
    category: 'Edge & Delivery',
    layer: 'entry',
    description:
      entryTechNames.length > 0
        ? `Public edge & delivery layer powered by ${entryTechNames.join(', ')}.`
        : `Public entry domain ${domain} from imported technology audit.`,
    confidence: 'detected',
    evidence:
      entryTechNames.length > 0
        ? `Detected in CSV: ${entryTechNames.join(', ')}`
        : `Target domain from CSV export: ${domain}`,
    urlOrPath: normalizedUrl,
  });

  if (layerBuckets.frontend.length > 0) {
    const uiItems = layerBuckets.frontend.slice(0, 6);
    nodes.push({
      id: 'csv-frontend',
      label: uiItems.slice(0, 2).map((t) => t.name).join(' + '),
      category: 'Frontend & UI Stack',
      layer: 'frontend',
      description: `Client presentation, UI primitives, and visualization libraries: ${uiItems.map((t) => t.name).join(', ')}.`,
      confidence: 'detected',
      evidence: uiItems.map((t) => t.evidence).slice(0, 3).join(' | '),
      urlOrPath: '/',
    });
    edges.push({
      id: 'e-entry-frontend',
      source: 'csv-entry',
      target: 'csv-frontend',
      label: 'serves UI bundle',
      relationshipType: 'navigation',
      confidence: 'detected',
    });
  }

  if (layerBuckets.logic.length > 0) {
    const logicItems = layerBuckets.logic;
    nodes.push({
      id: 'csv-logic',
      label: logicItems.slice(0, 2).map((t) => t.name).join(' / '),
      category: 'Build & Runtime Core',
      layer: 'logic',
      description: `Build pipeline, runtime, and API integrations detected in stack: ${logicItems.map((t) => t.name).join(', ')}.`,
      confidence: 'detected',
      evidence: logicItems.map((t) => t.evidence).slice(0, 3).join(' | '),
    });
    edges.push({
      id: 'e-frontend-logic',
      source: layerBuckets.frontend.length > 0 ? 'csv-frontend' : 'csv-entry',
      target: 'csv-logic',
      label: 'compiled / powered by',
      relationshipType: 'dependency',
      confidence: 'detected',
    });
  }

  // Always include an inferred application/storage core to keep architecture transparent
  nodes.push({
    id: 'csv-data',
    label: 'Application Data & Cache Layer',
    category: 'Backend & Persistence',
    layer: 'data',
    description:
      'Inferred backend persistence, session state, and API data store (not directly exposed in client Wappalyzer/BuiltWith CSV exports).',
    confidence: 'inferred',
    evidence: 'Inferred architectural tier required behind public web stack',
  });
  edges.push({
    id: 'e-logic-data',
    source: layerBuckets.logic.length > 0 ? 'csv-logic' : layerBuckets.frontend.length > 0 ? 'csv-frontend' : 'csv-entry',
    target: 'csv-data',
    label: 'reads / persists state',
    relationshipType: 'dataflow',
    confidence: 'inferred',
  });

  if (layerBuckets.external.length > 0) {
    const extItems = layerBuckets.external;
    nodes.push({
      id: 'csv-external',
      label: extItems.map((t) => t.name).join(', '),
      category: 'Analytics & Telemetry',
      layer: 'external',
      description: `Third-party analytics and observability endpoints: ${extItems.map((t) => t.name).join(', ')}.`,
      confidence: 'detected',
      evidence: extItems.map((t) => t.evidence).slice(0, 3).join(' | '),
    });
    edges.push({
      id: 'e-frontend-external',
      source: layerBuckets.frontend.length > 0 ? 'csv-frontend' : 'csv-entry',
      target: 'csv-external',
      label: 'streams telemetry events',
      relationshipType: 'dataflow',
      confidence: 'detected',
    });
  }

  const sitemap: SitemapItem[] = [
    {
      id: 'sm-root',
      title: `${domain} Technology Audit`,
      path: '/',
      role: `${techStack.length} imported stack signals across ${nodes.length} architecture layers`,
      depth: 0,
      confidence: 'detected',
      children: techStack.slice(0, 8).map((t, idx) => ({
        id: `sm-tech-${idx + 1}`,
        title: t.name,
        path: `#${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        role: `${t.category} — ${t.evidence}`,
        depth: 1,
        confidence: t.confidence,
      })),
    },
  ];

  const primaryTargetId = layerBuckets.frontend.length > 0 ? 'csv-frontend' : 'csv-entry';

  return {
    id: `csv-report-${Date.now()}`,
    url: normalizedUrl,
    normalizedUrl,
    domain,
    title: `${domain} — Imported Tech Stack Ecosystem`,
    category: 'webapp',
    summary: `Synthesized from ${techStack.length} Wappalyzer/BuiltWith CSV technology signatures for ${domain}.`,
    executiveOverview: `Imported technology audit for ${domain} identifies ${techStack.length} verified stack components (${techStack.map((t) => t.name).slice(0, 6).join(', ')}${techStack.length > 6 ? ', and more' : ''}) mapped across edge delivery, frontend UI, build/runtime tooling, external telemetry, and inferred backend persistence.`,
    analyzedAt: new Date().toISOString(),
    sourceMethod: 'csv-import',
    crawlMetrics: {
      internalLinksCount: techStack.length,
      externalLinksCount: layerBuckets.external.length,
      headingsCount: nodes.length,
      scriptsCount: layerBuckets.frontend.length + layerBuckets.logic.length,
      inspectedLabel: `${techStack.length} CSV technology rows imported`,
    },
    nodes,
    edges,
    sitemap,
    workflows: [
      {
        id: 'wf-csv-delivery',
        title: 'Stack Request & Telemetry Lifecycle',
        summary: `How user requests traverse ${domain}'s detected edge, client UI, runtime, and telemetry stack.`,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            actor: 'Visitor Browser',
            action: 'Requests application entry URL',
            targetNodeId: 'csv-entry',
            outcome: entryTechNames.length > 0 ? `Routed via ${entryTechNames.join(', ')}` : `Resolved to ${domain}`,
            confidence: 'detected',
          },
          {
            id: 'step-2',
            stepNumber: 2,
            actor: 'Edge / Origin',
            action: 'Delivers client UI & graphics bundle',
            targetNodeId: primaryTargetId,
            outcome: `Hydrates ${layerBuckets.frontend.map((t) => t.name).join(', ') || 'client UI'}`,
            confidence: 'detected',
          },
          {
            id: 'step-3',
            stepNumber: 3,
            actor: 'Application Core',
            action: 'Executes business logic and queries data store',
            targetNodeId: 'csv-data',
            outcome: 'Inferred persistence and cache operations complete',
            confidence: 'inferred',
          },
        ],
      },
    ],
    techStack,
    explainerScript: [
      {
        id: 'scene-1',
        sceneNumber: 1,
        durationSeconds: 15,
        title: 'Edge & Entry Infrastructure',
        narration: `${domain} enters through ${entryTechNames.join(', ') || 'its public web edge'}, handling TLS termination, routing, and asset delivery.`,
        visualFocusNodeIds: ['csv-entry'],
        keyTakeaway: `${entryTechNames.length || 1} entry signal(s) detected in CSV`,
      },
      {
        id: 'scene-2',
        sceneNumber: 2,
        durationSeconds: 15,
        title: 'Frontend UI & Visualization Stack',
        narration: `In the browser, ${domain} relies on ${layerBuckets.frontend.map((t) => t.name).join(', ') || 'its client UI bundle'} to render interactive views and components.`,
        visualFocusNodeIds: [primaryTargetId],
        keyTakeaway: `${layerBuckets.frontend.length} frontend technologies verified`,
      },
      {
        id: 'scene-3',
        sceneNumber: 3,
        durationSeconds: 15,
        title: 'Build Tooling & Telemetry',
        narration: `Supporting build, API, and analytics tools—including ${[...layerBuckets.logic, ...layerBuckets.external].map((t) => t.name).join(', ') || 'runtime tooling'}—power compilation and product metrics.`,
        visualFocusNodeIds: [
          ...(layerBuckets.logic.length > 0 ? ['csv-logic'] : []),
          ...(layerBuckets.external.length > 0 ? ['csv-external'] : []),
        ],
        keyTakeaway: 'CSV evidence separated cleanly from inferred tiers',
      },
      {
        id: 'scene-4',
        sceneNumber: 4,
        durationSeconds: 15,
        title: 'Inferred Backend Boundary',
        narration: `Because browser-side Wappalyzer exports cannot observe private databases, backend storage is explicitly marked as Inferred alongside your detected stack.`,
        visualFocusNodeIds: ['csv-data'],
        keyTakeaway: 'Full architecture diagram & report ready to export',
      },
    ],
    limitationsNote:
      'Generated from an imported Wappalyzer / BuiltWith CSV file. All listed technologies are marked Detected from your CSV export, while private backend data stores remain labeled Inferred.',
    suggestedQuestions: [
      `Which detected technologies in ${domain} handle frontend UI vs. analytics?`,
      `What backend layers remain inferred from the CSV export?`,
      `How do the components in ${domain}'s stack depend on each other?`,
    ],
  };
}
