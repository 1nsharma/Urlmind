'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FolderTree,
  GitBranch,
  ImageOff,
  MessageSquare,
  Moon,
  Network,
  PlayCircle,
  RefreshCw,
  Sun,
  Video,
} from 'lucide-react';
import { getCategoryLabel } from '@/lib/classifier';
import type {
  IntelligenceNode,
  SocialMetadata,
  UrlIntelligenceReport,
  WorkspaceView,
} from '@/lib/types';
import ArchitectureMap from './ArchitectureMap';
import AskUrlChat from './AskUrlChat';
import ExplainerPlayer from './ExplainerPlayer';
import ExportView from './ExportView';
import SitemapView from './SitemapView';
import TechStackView from './TechStackView';
import WorkflowView from './WorkflowView';

interface IntelligenceWorkspaceProps {
  report: UrlIntelligenceReport;
  history: UrlIntelligenceReport[];
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  onSelectReport: (report: UrlIntelligenceReport) => void;
  onOpenCompare: () => void;
  onRefreshLive: () => void;
  isRefreshing: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
}

const VIEW_ITEMS: Array<{
  id: WorkspaceView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'map', label: 'Architecture Map', icon: Network },
  { id: 'sitemap', label: 'Sitemap & Tree', icon: FolderTree },
  { id: 'flows', label: 'User & Data Flows', icon: GitBranch },
  { id: 'tech', label: 'Tech Stack & Evidence', icon: Cpu },
  { id: 'explainer', label: '60s Explainer', icon: PlayCircle },
  { id: 'ask', label: 'Ask This URL', icon: MessageSquare },
  { id: 'export', label: 'Export Report', icon: Download },
];

const PLATFORM_LABELS: Record<SocialMetadata['platform'], string> = {
  youtube: 'YouTube Video / Channel',
  twitter: 'X / Twitter Post',
  instagram: 'Instagram Media',
  linkedin: 'LinkedIn Page / Post',
};

function SocialThumbnail({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full sm:w-44 h-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-1 text-slate-400 shrink-0">
        <ImageOff className="w-4 h-4" aria-hidden="true" />
        <span className="text-[11px]">Thumbnail unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full sm:w-44 h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export default function IntelligenceWorkspace({
  report,
  history,
  activeView,
  onSelectView,
  onSelectReport,
  onOpenCompare,
  onRefreshLive,
  isRefreshing,
  isDark,
  onToggleTheme,
}: IntelligenceWorkspaceProps) {
  const [askNodePrompt, setAskNodePrompt] = useState<string | null>(null);

  const handleAskAboutNode = (node: IntelligenceNode) => {
    setAskNodePrompt(
      `Explain the role of "${node.label}" (${node.confidence}) in ${report.domain} and what evidence supports it.`,
    );
    onSelectView('ask');
  };

  const detectedCount = report.nodes.filter(
    (n) => n.confidence === 'detected',
  ).length;

  const cacheLabel =
    report.cacheStatus === 'hit'
      ? 'Cached Report'
      : report.cacheStatus === 'bypassed'
        ? 'Live Analysis (Cache Bypassed)'
        : report.sourceMethod === 'preset-showcase'
          ? 'Reference Preset'
          : 'Live Analysis';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sidebar */}
        <aside
          aria-label="Workspace navigation"
          className="w-full lg:w-[256px] shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-5"
        >
          {/* Active Target Summary */}
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {getCategoryLabel(report.category)}
            </p>
            <h2 className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white truncate">
              {report.domain}
            </h2>
            <a
              href={report.normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-blue-600 dark:text-slate-400 truncate max-w-full"
            >
              <span className="truncate">{report.normalizedUrl}</span>
              <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
            </a>
          </div>

          {/* Views Menu */}
          <nav aria-label="Intelligence views" className="space-y-1">
            {VIEW_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Recent History */}
          {history.length > 1 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Recent Maps
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {history.slice(0, 5).map((item) => {
                  const isCurrent = item.id === report.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelectReport(item)}
                        className={`w-full text-left px-2.5 py-1.5 text-xs font-mono rounded-md truncate transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {item.domain}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Sidebar Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onOpenCompare}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Compare URL</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </aside>

        {/* Main Workspace Content */}
        <main className="flex-1 min-w-0 w-full space-y-5">
          {/* Contextual Header & Executive Summary Strip */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Workspace</span>
                  <span aria-hidden="true">/</span>
                  <span className="font-mono">{report.domain}</span>
                  <span aria-hidden="true">/</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {VIEW_ITEMS.find((v) => v.id === activeView)?.label}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <Database
                      className={`w-3.5 h-3.5 ${
                        report.cacheStatus === 'hit'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{cacheLabel}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    disabled={isRefreshing}
                    onClick={onRefreshLive}
                    className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh Live'}</span>
                  </button>
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white text-balance">
                  {report.title}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {report.summary}
                </p>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nodes
                  </p>
                  <p className="font-mono text-base font-semibold text-slate-900 dark:text-white tabular-nums">
                    {report.nodes.length}
                  </p>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Detected
                  </p>
                  <p className="font-mono text-base font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {detectedCount}/{report.nodes.length}
                  </p>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Routes / Items
                  </p>
                  <p className="font-mono text-base font-semibold text-slate-900 dark:text-white tabular-nums">
                    {report.crawlMetrics.internalLinksCount}
                  </p>
                </div>
              </div>
            </div>

            {activeView === 'map' && report.executiveOverview && (
              <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {report.executiveOverview}
              </p>
            )}

            {report.socialMetadata && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-start">
                {report.socialMetadata.thumbnailUrl && (
                  <SocialThumbnail
                    key={report.socialMetadata.thumbnailUrl}
                    src={report.socialMetadata.thumbnailUrl}
                    alt={report.socialMetadata.title}
                  />
                )}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                      <Video className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{PLATFORM_LABELS[report.socialMetadata.platform]}</span>
                    </span>
                    {report.socialMetadata.authorName && (
                      <>
                        <span aria-hidden="true">·</span>
                        {report.socialMetadata.authorUrl ? (
                          <a
                            href={report.socialMetadata.authorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <span>{report.socialMetadata.authorName}</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {report.socialMetadata.authorName}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {report.socialMetadata.title}
                  </p>
                  {report.socialMetadata.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {report.socialMetadata.description}
                    </p>
                  )}
                  {report.socialMetadata.accessRestricted &&
                    report.socialMetadata.accessNote && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                        <AlertTriangle
                          className="w-3.5 h-3.5 mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{report.socialMetadata.accessNote}</span>
                      </div>
                    )}
                </div>
              </div>
            )}
          </section>

          {/* Active View Canvas */}
          {activeView === 'map' && (
            <ArchitectureMap
              report={report}
              onAskAboutNode={handleAskAboutNode}
              isDark={isDark}
            />
          )}
          {activeView === 'sitemap' && <SitemapView report={report} />}
          {activeView === 'flows' && <WorkflowView report={report} />}
          {activeView === 'tech' && <TechStackView report={report} />}
          {activeView === 'explainer' && <ExplainerPlayer report={report} />}
          {activeView === 'ask' && (
            <AskUrlChat
              key={`${report.id}-${askNodePrompt ?? ''}`}
              report={report}
              initialPrompt={askNodePrompt}
            />
          )}
          {activeView === 'export' && <ExportView report={report} />}
        </main>
      </div>
    </div>
  );
}
