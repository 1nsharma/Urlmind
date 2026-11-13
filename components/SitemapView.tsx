'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FolderTree,
  HelpCircle,
} from 'lucide-react';
import type { SitemapItem, UrlIntelligenceReport } from '@/lib/types';

interface SitemapViewProps {
  report: UrlIntelligenceReport;
}

function SitemapBranch({ item }: { item: SitemapItem }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isDetected = item.confidence === 'detected';

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 px-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.title}`}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded cursor-pointer shrink-0"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-6 shrink-0" aria-hidden="true" />
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                {item.title}
              </span>
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 truncate">
                {item.path}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {item.role}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 ${
            isDetected
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {isDetected ? (
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{isDetected ? 'Detected' : 'Inferred'}</span>
        </span>
      </div>

      {hasChildren && expanded && (
        <div className="pl-6 sm:pl-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30">
          {item.children!.map((child) => (
            <SitemapBranch key={child.id} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SitemapView({ report }: SitemapViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderTree
              className="w-4 h-4 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Site & Module Hierarchy
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {report.crawlMetrics.internalLinksCount} internal routes / entries inspected
          </p>
        </div>

        {report.sitemap.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No hierarchical route tree was returned for this URL. Check the
            Architecture Map for discovered modules.
          </div>
        ) : (
          <div>
            {report.sitemap.map((root) => (
              <SitemapBranch key={root.id} item={root} />
            ))}
          </div>
        )}
      </div>

      {/* Flat Node Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Component & Route Directory
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50">
                <th className="py-2.5 px-4 font-medium">Component</th>
                <th className="py-2.5 px-4 font-medium">Layer</th>
                <th className="py-2.5 px-4 font-medium">Path / Role</th>
                <th className="py-2.5 px-4 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.nodes.map((node) => (
                <tr
                  key={node.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                >
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    {node.label}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 capitalize">
                    {node.layer}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                    {node.urlOrPath || node.category}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium">
                    <span
                      className={
                        node.confidence === 'detected'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }
                    >
                      {node.confidence === 'detected' ? 'Detected' : 'Inferred'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
