import { Type } from '@google/genai';
import { classifyUrl, normalizeAndValidateUrl } from './classifier';
import { crawlPublicUrl } from './crawler';
import { getGeminiClient } from './gemini';
import { findShowcasePreset } from './showcasePresets';
import type {
  ExplainerScene,
  IntelligenceEdge,
  IntelligenceNode,
  SitemapItem,
  TechItem,
  UrlIntelligenceReport,
  WorkflowSequence,
} from './types';

const REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    executiveOverview: { type: Type.STRING },
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          category: { type: Type.STRING },
          layer: {
            type: Type.STRING,
            description: 'One of: entry, frontend, logic, data, external',
          },
          description: { type: Type.STRING },
          confidence: {
            type: Type.STRING,
            description: 'Strictly "detected" or "inferred"',
          },
          evidence: { type: Type.STRING },
          urlOrPath: { type: Type.STRING },
        },
        required: [
          'id',
          'label',
          'category',
          'layer',
          'description',
          'confidence',
          'evidence',
        ],
      },
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          source: { type: Type.STRING },
          target: { type: Type.STRING },
          label: { type: Type.STRING },
          relationshipType: {
            type: Type.STRING,
            description:
              'One of: navigation, dependency, dataflow, auth, reference',
          },
          confidence: {
            type: Type.STRING,
            description: 'Strictly "detected" or "inferred"',
          },
        },
        required: [
          'id',
          'source',
          'target',
          'label',
          'relationshipType',
          'confidence',
        ],
      },
    },
    sitemap: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          path: { type: Type.STRING },
          role: { type: Type.STRING },
          depth: { type: Type.INTEGER },
          confidence: { type: Type.STRING },
          children: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                path: { type: Type.STRING },
                role: { type: Type.STRING },
                depth: { type: Type.INTEGER },
                confidence: { type: Type.STRING },
              },
              required: ['id', 'title', 'path', 'role', 'depth', 'confidence'],
            },
          },
        },
        required: ['id', 'title', 'path', 'role', 'depth', 'confidence'],
      },
    },
    workflows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                stepNumber: { type: Type.INTEGER },
                actor: { type: Type.STRING },
                action: { type: Type.STRING },
                targetNodeId: { type: Type.STRING },
                outcome: { type: Type.STRING },
                confidence: { type: Type.STRING },
              },
              required: [
                'id',
                'stepNumber',
                'actor',
                'action',
                'targetNodeId',
                'outcome',
                'confidence',
              ],
            },
          },
        },
        required: ['id', 'title', 'summary', 'steps'],
      },
    },
    inferredTechStack: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          confidence: { type: Type.STRING },
          evidence: { type: Type.STRING },
        },
        required: ['name', 'category', 'confidence', 'evidence'],
      },
    },
    explainerScript: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          sceneNumber: { type: Type.INTEGER },
          durationSeconds: { type: Type.INTEGER },
          title: { type: Type.STRING },
          narration: { type: Type.STRING },
          visualFocusNodeIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          keyTakeaway: { type: Type.STRING },
        },
        required: [
          'id',
          'sceneNumber',
          'durationSeconds',
          'title',
          'narration',
          'visualFocusNodeIds',
          'keyTakeaway',
        ],
      },
    },
    limitationsNote: { type: Type.STRING },
    suggestedQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'title',
    'summary',
    'executiveOverview',
    'nodes',
    'edges',
    'sitemap',
    'workflows',
    'inferredTechStack',
    'explainerScript',
    'limitationsNote',
    'suggestedQuestions',
  ],
};

interface GeminiStructuredOutput {
  title: string;
  summary: string;
  executiveOverview: string;
  nodes: IntelligenceNode[];
  edges: IntelligenceEdge[];
  sitemap: SitemapItem[];
  workflows: WorkflowSequence[];
  inferredTechStack: TechItem[];
  explainerScript: ExplainerScene[];
  limitationsNote: string;
  suggestedQuestions: string[];
}

export async function analyzeUrlPipeline(
  rawUrl: string,
  options: { usePreset?: boolean } = {},
): Promise<UrlIntelligenceReport> {
  const validation = normalizeAndValidateUrl(rawUrl);
  if (!validation.valid || !validation.normalizedUrl || !validation.domain) {
    throw new Error(validation.error || 'Invalid URL provided.');
  }

  const normalizedUrl = validation.normalizedUrl;
  const domain = validation.domain;

  if (options.usePreset) {
    const preset = findShowcasePreset(normalizedUrl);
    if (preset) {
      return preset;
    }
  }

  const category = classifyUrl(normalizedUrl);
  const crawled = await crawlPublicUrl(normalizedUrl, domain);
  const ai = getGeminiClient();

  let urlContextNotes = '';
  let sourceMethod: UrlIntelligenceReport['sourceMethod'] = 'live-crawl';

  // If direct HTTP crawl was blocked or returned thin content, supplement via Gemini urlContext
  if (!crawled.crawlSuccess || crawled.textExcerpt.length < 180) {
    try {
      const ctxRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Inspect ${normalizedUrl} and summarize its visible purpose, main navigation sections/routes, technologies, and key concepts.`,
        config: {
          tools: [{ urlContext: {} }],
        },
      });
      if (ctxRes.text) {
        urlContextNotes = ctxRes.text.slice(0, 8000);
        sourceMethod = 'url-context';
      }
    } catch {
      // Proceed with whatever crawl data or domain context we have
    }
  }

  if (!crawled.crawlSuccess && !urlContextNotes) {
    throw new Error(
      `Could not retrieve public content from ${domain} (${crawled.crawlError || 'unreachable or blocked'}). Try another public URL or one of the curated examples.`,
    );
  }

  const promptPayload = {
    url: normalizedUrl,
    domain,
    classifiedCategory: category,
    crawlSuccess: crawled.crawlSuccess,
    pageTitle: crawled.pageTitle,
    metaDescription: crawled.metaDescription,
    headings: crawled.headings.slice(0, 25),
    internalLinks: crawled.internalLinks.slice(0, 35),
    externalLinks: crawled.externalLinks.slice(0, 15),
    scripts: crawled.scripts.slice(0, 15),
    detectedTech: crawled.detectedTech,
    githubDetails: crawled.githubDetails,
    openApiDetails: crawled.openApiDetails,
    textExcerpt: crawled.textExcerpt.slice(0, 7500),
    urlContextNotes,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Analyze this crawled public URL evidence and produce a structured URLMIND intelligence report.\n\nCRAWL DATA:\n${JSON.stringify(promptPayload, null, 2)}`,
    config: {
      systemInstruction: `You are URLMIND's AI Analysis Engine. Transform crawled public URL data into an accurate interactive architecture map, sitemap, workflow, tech audit, and 60-second explainer script.

CRITICAL EPISTEMIC RULES:
1. Clearly distinguish "detected" (directly observed in the provided HTML, links, headers, GitHub files, OpenAPI spec, or URL context) vs. "inferred" (architectural backend/infrastructure inferred from public clues). Never claim private databases or internal source code were directly observed on a public marketing site.
2. Produce 6 to 9 well-connected nodes distributed across layers ("entry", "frontend", "logic", "data", "external"). Every edge source and target MUST match an existing node id.
3. Produce 1 to 2 realistic user/execution workflows whose targetNodeId values match existing node ids.
4. Produce an explainerScript with 4 to 5 scenes whose durationSeconds sum to 60 (e.g. 12s x 5 or 15s x 4), and whose visualFocusNodeIds reference existing node ids.
5. For techStack, only add technologies not already listed in detectedTech, marking unverified backend guesses strictly as "inferred".
6. Keep all labels concise, natural title-case, and grounded in actual evidence.`,
      responseMimeType: 'application/json',
      responseSchema: REPORT_SCHEMA,
    },
  });

  const rawJson = (response.text || '').trim();
  if (!rawJson) {
    throw new Error('AI analysis returned an empty response. Please try again.');
  }

  const parsed = JSON.parse(rawJson) as GeminiStructuredOutput;

  // Normalize node layers, confidence, and edge integrity
  const validLayers = new Set(['entry', 'frontend', 'logic', 'data', 'external']);
  const nodes: IntelligenceNode[] = (parsed.nodes || []).map((n, idx) => ({
    id: n.id || `node-${idx + 1}`,
    label: n.label || `Component ${idx + 1}`,
    category: n.category || 'Module',
    layer: validLayers.has(n.layer) ? n.layer : 'logic',
    description: n.description || '',
    confidence: n.confidence === 'detected' ? 'detected' : 'inferred',
    evidence: n.evidence || 'Derived from public page inspection',
    urlOrPath: n.urlOrPath,
  }));

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validRelTypes = new Set([
    'navigation',
    'dependency',
    'dataflow',
    'auth',
    'reference',
  ]);
  const edges: IntelligenceEdge[] = (parsed.edges || [])
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e, idx) => ({
      id: e.id || `edge-${idx + 1}`,
      source: e.source,
      target: e.target,
      label: e.label || 'connects to',
      relationshipType: validRelTypes.has(e.relationshipType)
        ? e.relationshipType
        : 'dependency',
      confidence: e.confidence === 'detected' ? 'detected' : 'inferred',
    }));

  // Merge deterministic detected tech with AI inferred tech without duplicates
  const mergedTechMap = new Map<string, TechItem>();
  for (const t of crawled.detectedTech) {
    mergedTechMap.set(t.name.toLowerCase(), t);
  }
  const validTechCats = new Set<TechItem['category']>([
    'Framework',
    'Styling',
    'API / Protocol',
    'Infrastructure',
    'Analytics',
    'Auth / Security',
    'Language / Runtime',
  ]);
  for (const t of parsed.inferredTechStack || []) {
    const key = t.name.toLowerCase();
    if (!mergedTechMap.has(key)) {
      mergedTechMap.set(key, {
        name: t.name,
        category: validTechCats.has(t.category) ? t.category : 'Infrastructure',
        confidence: t.confidence === 'detected' ? 'detected' : 'inferred',
        evidence: t.evidence || 'Inferred from public architectural signals',
      });
    }
  }

  return {
    id: `report-${Date.now()}`,
    url: rawUrl.trim(),
    normalizedUrl,
    domain,
    title: parsed.title || crawled.pageTitle || domain,
    category,
    summary: parsed.summary || crawled.metaDescription || `Architecture analysis of ${domain}`,
    executiveOverview: parsed.executiveOverview || parsed.summary || '',
    analyzedAt: new Date().toISOString(),
    sourceMethod,
    crawlMetrics: crawled.metrics,
    nodes,
    edges,
    sitemap: parsed.sitemap || [],
    workflows: (parsed.workflows || []).map((wf) => ({
      ...wf,
      steps: (wf.steps || []).map((s) => ({
        ...s,
        confidence: s.confidence === 'detected' ? 'detected' : 'inferred',
      })),
    })),
    techStack: Array.from(mergedTechMap.values()),
    explainerScript: (parsed.explainerScript || []).map((sc, idx) => ({
      ...sc,
      sceneNumber: sc.sceneNumber || idx + 1,
      durationSeconds: sc.durationSeconds || 12,
      visualFocusNodeIds: (sc.visualFocusNodeIds || []).filter((id) =>
        nodeIds.has(id),
      ),
    })),
    limitationsNote:
      parsed.limitationsNote ||
      'Public URL analysis reflects observable HTML, headers, API specs, or public repository files. Private backend infrastructure and databases are labeled as inferred.',
    suggestedQuestions:
      parsed.suggestedQuestions?.length > 0
        ? parsed.suggestedQuestions.slice(0, 3)
        : [
            `Which components of ${domain} are directly detected vs. inferred?`,
            `How do users or data flow through ${domain}?`,
            `What are the key technology dependencies identified?`,
          ],
  };
}
