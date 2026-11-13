export type UrlCategory =
  | 'website'
  | 'webapp'
  | 'api'
  | 'docs'
  | 'github'
  | 'article'
  | 'social'
  | 'media';

export type SocialPlatform = 'youtube' | 'twitter' | 'instagram' | 'linkedin';

export interface SocialMetadata {
  platform: SocialPlatform;
  title: string;
  authorName?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  embedHtml?: string;
  description?: string;
  accessRestricted: boolean;
  accessNote?: string;
}

export type EvidenceConfidence = 'detected' | 'inferred';

export type NodeLayer =
  | 'entry'
  | 'frontend'
  | 'logic'
  | 'data'
  | 'external';

export type RelationshipType =
  | 'navigation'
  | 'dependency'
  | 'dataflow'
  | 'auth'
  | 'reference';

export interface IntelligenceNode {
  id: string;
  label: string;
  category: string;
  layer: NodeLayer;
  description: string;
  confidence: EvidenceConfidence;
  evidence: string;
  urlOrPath?: string;
}

export interface IntelligenceEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relationshipType: RelationshipType;
  confidence: EvidenceConfidence;
}

export interface SitemapItem {
  id: string;
  title: string;
  path: string;
  role: string;
  depth: number;
  confidence: EvidenceConfidence;
  children?: SitemapItem[];
}

export interface FlowStep {
  id: string;
  stepNumber: number;
  actor: string;
  action: string;
  targetNodeId: string;
  outcome: string;
  confidence: EvidenceConfidence;
}

export interface WorkflowSequence {
  id: string;
  title: string;
  summary: string;
  steps: FlowStep[];
}

export interface TechItem {
  name: string;
  category:
    | 'Framework'
    | 'Styling'
    | 'API / Protocol'
    | 'Infrastructure'
    | 'Analytics'
    | 'Auth / Security'
    | 'Language / Runtime';
  confidence: EvidenceConfidence;
  evidence: string;
}

export interface ExplainerScene {
  id: string;
  sceneNumber: number;
  durationSeconds: number;
  title: string;
  narration: string;
  visualFocusNodeIds: string[];
  keyTakeaway: string;
}

export interface CrawlMetrics {
  httpStatus?: number;
  internalLinksCount: number;
  externalLinksCount: number;
  headingsCount: number;
  scriptsCount: number;
  inspectedLabel: string;
}

export interface UrlIntelligenceReport {
  id: string;
  url: string;
  normalizedUrl: string;
  domain: string;
  title: string;
  category: UrlCategory;
  summary: string;
  executiveOverview: string;
  analyzedAt: string;
  sourceMethod: 'live-crawl' | 'preset-showcase' | 'url-context' | 'oembed-social';
  cacheStatus?: 'hit' | 'miss' | 'bypassed';
  cachedAt?: string;
  socialMetadata?: SocialMetadata;
  crawlMetrics: CrawlMetrics;
  nodes: IntelligenceNode[];
  edges: IntelligenceEdge[];
  sitemap: SitemapItem[];
  workflows: WorkflowSequence[];
  techStack: TechItem[];
  explainerScript: ExplainerScene[];
  limitationsNote: string;
  suggestedQuestions: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ComparisonDiff {
  sharedTech: string[];
  uniqueToA: string[];
  uniqueToB: string[];
  detectedRatioA: number;
  detectedRatioB: number;
  nodeCountA: number;
  nodeCountB: number;
  edgeCountA: number;
  edgeCountB: number;
  layerBreakdownA: Record<NodeLayer, number>;
  layerBreakdownB: Record<NodeLayer, number>;
}

export interface ComparisonResult {
  reportA: UrlIntelligenceReport;
  reportB: UrlIntelligenceReport;
  diff: ComparisonDiff;
  aiSynthesis: string;
  createdAt: string;
}

export type WorkspaceView =
  | 'map'
  | 'sitemap'
  | 'flows'
  | 'tech'
  | 'explainer'
  | 'ask'
  | 'export';
