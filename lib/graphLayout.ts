import type {
  ComparisonDiff,
  IntelligenceEdge,
  IntelligenceNode,
  NodeLayer,
  UrlIntelligenceReport,
} from './types';

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
  node: IntelligenceNode;
}

const LAYER_ORDER: NodeLayer[] = [
  'entry',
  'frontend',
  'logic',
  'data',
  'external',
];

export function computeLayeredGraphPositions(
  nodes: IntelligenceNode[],
  edges: IntelligenceEdge[],
): PositionedNode[] {
  const buckets = new Map<NodeLayer, IntelligenceNode[]>();
  for (const layer of LAYER_ORDER) {
    buckets.set(layer, []);
  }

  for (const node of nodes) {
    const layer = LAYER_ORDER.includes(node.layer) ? node.layer : 'logic';
    buckets.get(layer)!.push(node);
  }

  // Sort nodes inside each layer slightly by total degree so hubs sit toward the middle
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }

  const colSpacing = 252;
  const rowSpacing = 134;
  const startX = 24;
  const startY = 24;

  const positioned: PositionedNode[] = [];
  let activeColIndex = 0;

  for (const layer of LAYER_ORDER) {
    const group = buckets.get(layer) ?? [];
    if (group.length === 0) continue;

    group.sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));

    // Center shorter columns vertically relative to tallest column
    const maxCount = Math.max(
      ...LAYER_ORDER.map((l) => (buckets.get(l) ?? []).length),
      1,
    );
    const verticalOffset = ((maxCount - group.length) * rowSpacing) / 2;

    group.forEach((node, idx) => {
      positioned.push({
        id: node.id,
        x: startX + activeColIndex * colSpacing,
        y: startY + verticalOffset + idx * rowSpacing,
        node,
      });
    });

    activeColIndex += 1;
  }

  return positioned;
}

function sanitizeMermaidId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeMermaidLabel(raw: string): string {
  return raw.replace(/"/g, "'").replace(/\n/g, ' ');
}

function resolveNodeHref(
  node: IntelligenceNode,
  report: UrlIntelligenceReport,
): string | null {
  if (!node.urlOrPath) return null;
  const raw = node.urlOrPath.trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    if (report.category === 'github' && report.normalizedUrl.includes('github.com')) {
      const base = report.normalizedUrl.replace(/\/+$/, '');
      if (raw === '/') return base;
      const cleanPath = raw.replace(/^\/+/, '');
      return `${base}/tree/main/${cleanPath}`;
    }
    return new URL(raw, report.normalizedUrl).toString();
  } catch {
    return null;
  }
}

export function generateMermaidDiagram(report: UrlIntelligenceReport): string {
  const lines: string[] = ['flowchart TD'];

  const layerLabels: Record<NodeLayer, string> = {
    entry: 'Entry & Discovery',
    frontend: 'Client & UI Layer',
    logic: 'Core Logic & APIs',
    data: 'Data & State',
    external: 'External Integrations',
  };

  const layerClass: Record<NodeLayer, string> = {
    entry: 'toneEntry',
    frontend: 'toneFrontend',
    logic: 'toneLogic',
    data: 'toneData',
    external: 'toneExternal',
  };

  for (const layer of LAYER_ORDER) {
    const layerNodes = report.nodes.filter((n) => n.layer === layer);
    if (layerNodes.length === 0) continue;
    lines.push(`  subgraph group_${layer}["${layerLabels[layer]}"]`);
    for (const node of layerNodes) {
      const id = sanitizeMermaidId(node.id);
      const tag = node.confidence === 'detected' ? 'Detected' : 'Inferred';
      lines.push(
        `    ${id}["${escapeMermaidLabel(node.label)}<br/>[${tag}]"]`,
      );
    }
    lines.push('  end');
  }

  for (const edge of report.edges) {
    const src = sanitizeMermaidId(edge.source);
    const tgt = sanitizeMermaidId(edge.target);
    const lbl = escapeMermaidLabel(edge.label);
    lines.push(`  ${src} -->|"${lbl}"| ${tgt}`);
  }

  // Clickable anchors for nodes with verified URLs/paths
  for (const node of report.nodes) {
    const href = resolveNodeHref(node, report);
    if (href) {
      const id = sanitizeMermaidId(node.id);
      lines.push(`  click ${id} "${href.replace(/"/g, '%22')}" _blank`);
    }
  }

  // Semantic layer tones matching URLMIND palette
  lines.push(
    '  classDef toneEntry fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#1e1b4b',
  );
  lines.push(
    '  classDef toneFrontend fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554',
  );
  lines.push(
    '  classDef toneLogic fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f',
  );
  lines.push(
    '  classDef toneData fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d',
  );
  lines.push(
    '  classDef toneExternal fill:#f1f5f9,stroke:#475569,stroke-width:1.5px,color:#0f172a',
  );

  for (const layer of LAYER_ORDER) {
    const ids = report.nodes
      .filter((n) => n.layer === layer)
      .map((n) => sanitizeMermaidId(n.id));
    if (ids.length > 0) {
      lines.push(`  class ${ids.join(',')} ${layerClass[layer]}`);
    }
  }

  return lines.join('\n');
}

export function generateMarkdownReport(report: UrlIntelligenceReport): string {
  const detectedNodes = report.nodes.filter((n) => n.confidence === 'detected');
  const inferredNodes = report.nodes.filter((n) => n.confidence === 'inferred');

  const techLines = report.techStack
    .map(
      (t) =>
        `- **${t.name}** (${t.category}) — _${t.confidence.toUpperCase()}_: ${t.evidence}`,
    )
    .join('\n');

  const nodeLines = report.nodes
    .map(
      (n) =>
        `- **${n.label}** [${n.layer} · ${n.confidence}]: ${n.description} _(Evidence: ${n.evidence})_`,
    )
    .join('\n');

  const flowLines = report.workflows
    .map((wf) => {
      const steps = wf.steps
        .map(
          (s) =>
            `  ${s.stepNumber}. **${s.actor}**: ${s.action} -> ${s.outcome} _(${s.confidence})_`,
        )
        .join('\n');
      return `### ${wf.title}\n${wf.summary}\n${steps}`;
    })
    .join('\n\n');

  const explainerLines = report.explainerScript
    .map(
      (scene) =>
        `### Scene ${scene.sceneNumber}: ${scene.title} (${scene.durationSeconds}s)\n${scene.narration}\n- Key takeaway: ${scene.keyTakeaway}`,
    )
    .join('\n\n');

  return [
    `# URLMIND Intelligence Report: ${report.title}`,
    ``,
    `- **URL**: ${report.normalizedUrl}`,
    `- **Category**: ${report.category}`,
    `- **Analyzed**: ${report.analyzedAt}`,
    `- **Source Method**: ${report.sourceMethod}`,
    `- **Confidence Breakdown**: ${detectedNodes.length} detected nodes, ${inferredNodes.length} inferred nodes`,
    ``,
    `## Executive Summary`,
    report.summary,
    ``,
    report.executiveOverview,
    ``,
    `> **Transparency Note**: ${report.limitationsNote}`,
    ``,
    `## Architecture Nodes`,
    nodeLines,
    ``,
    `## Detected & Inferred Technologies`,
    techLines || '- No explicit technologies cataloged.',
    ``,
    `## Workflows & User Journeys`,
    flowLines || 'No workflows captured.',
    ``,
    `## 60-Second Explainer Script`,
    explainerLines,
    ``,
    `## Mermaid Architecture Diagram`,
    '```mermaid',
    generateMermaidDiagram(report),
    '```',
  ].join('\n');
}

export function computeComparisonDiff(
  reportA: UrlIntelligenceReport,
  reportB: UrlIntelligenceReport,
): ComparisonDiff {
  const techA = new Set(reportA.techStack.map((t) => t.name));
  const techB = new Set(reportB.techStack.map((t) => t.name));

  const sharedTech: string[] = [];
  const uniqueToA: string[] = [];
  const uniqueToB: string[] = [];

  for (const name of techA) {
    if (techB.has(name)) {
      sharedTech.push(name);
    } else {
      uniqueToA.push(name);
    }
  }
  for (const name of techB) {
    if (!techA.has(name)) {
      uniqueToB.push(name);
    }
  }

  const countDetectedRatio = (report: UrlIntelligenceReport) => {
    if (report.nodes.length === 0) return 0;
    const detected = report.nodes.filter((n) => n.confidence === 'detected').length;
    return Math.round((detected / report.nodes.length) * 100);
  };

  const buildLayerCounts = (
    nodes: IntelligenceNode[],
  ): Record<NodeLayer, number> => {
    const counts: Record<NodeLayer, number> = {
      entry: 0,
      frontend: 0,
      logic: 0,
      data: 0,
      external: 0,
    };
    for (const node of nodes) {
      counts[node.layer] = (counts[node.layer] ?? 0) + 1;
    }
    return counts;
  };

  return {
    sharedTech: sharedTech.sort(),
    uniqueToA: uniqueToA.sort(),
    uniqueToB: uniqueToB.sort(),
    detectedRatioA: countDetectedRatio(reportA),
    detectedRatioB: countDetectedRatio(reportB),
    nodeCountA: reportA.nodes.length,
    nodeCountB: reportB.nodes.length,
    edgeCountA: reportA.edges.length,
    edgeCountB: reportB.edges.length,
    layerBreakdownA: buildLayerCounts(reportA.nodes),
    layerBreakdownB: buildLayerCounts(reportB.nodes),
  };
}
