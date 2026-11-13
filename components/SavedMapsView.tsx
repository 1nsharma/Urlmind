'use client';

import { ArrowUpRight, FolderKanban, Globe, Trash2 } from 'lucide-react';
import { getCategoryLabel } from '@/lib/classifier';
import { SHOWCASE_PRESET_METAS } from '@/lib/showcasePresets';
import type { UrlIntelligenceReport } from '@/lib/types';

interface SavedMapsViewProps {
  history: UrlIntelligenceReport[];
  onOpenReport: (report: UrlIntelligenceReport) => void;
  onOpenPreset: (url: string) => void;
  onDeleteReport: (id: string) => void;
  onStartNew: () => void;
}

export default function SavedMapsView({
  history,
  onOpenReport,
  onOpenPreset,
  onDeleteReport,
  onStartNew,
}: SavedMapsViewProps) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Browse &amp; Saved Intelligence Maps
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Reopen your locally saved URL analyses or browse curated reference architecture maps.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNew}
          className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
        >
          Analyze Another URL
        </button>
      </div>

      {history.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <FolderKanban
            className="w-8 h-8 text-slate-400 mx-auto"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            No analyzed URLs saved yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Analyze any public URL or open one of the reference maps below to save
            its architecture graph, Mermaid diagram, and report here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
          {history.map((item) => {
            const detected = item.nodes.filter(
              (n) => n.confidence === 'detected',
            ).length;
            return (
              <div
                key={item.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {getCategoryLabel(item.category)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {item.nodes.length} nodes ({detected} detected)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(item.analyzedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="mt-1 font-display text-base font-semibold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h2>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                    {item.normalizedUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenReport(item)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-lg cursor-pointer"
                  >
                    <span>Open Map</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete saved map for ${item.domain}`}
                    onClick={() => onDeleteReport(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Featured Public Reference Catalog */}
      <section className="space-y-3 pt-2">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Featured Reference Maps
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Explore pre-indexed public architectures across websites, GitHub repositories, OpenAPI specs, and docs.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SHOWCASE_PRESET_METAS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onOpenPreset(preset.url)}
              className="group text-left p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {preset.categoryLabel}
                </span>
                <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" aria-hidden="true" />
              </div>
              <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white truncate">
                {preset.label}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {preset.tagline}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
