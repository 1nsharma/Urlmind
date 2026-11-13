'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Cpu, HelpCircle, ShieldAlert } from 'lucide-react';
import type { EvidenceConfidence, UrlIntelligenceReport } from '@/lib/types';

interface TechStackViewProps {
  report: UrlIntelligenceReport;
}

export default function TechStackView({ report }: TechStackViewProps) {
  const [confidenceFilter, setConfidenceFilter] = useState<
    EvidenceConfidence | 'all'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set(report.techStack.map((t) => t.category));
    return ['all', ...Array.from(set)];
  }, [report.techStack]);

  const filtered = useMemo(() => {
    return report.techStack.filter((item) => {
      if (confidenceFilter !== 'all' && item.confidence !== confidenceFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [report.techStack, confidenceFilter, categoryFilter]);

  const detectedCount = report.techStack.filter(
    (t) => t.confidence === 'detected',
  ).length;
  const inferredCount = report.techStack.length - detectedCount;

  return (
    <div className="space-y-4">
      {/* Transparency Callout */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert
          className="w-4 h-4 text-amber-600 mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-900 dark:text-white">
            Public Surface vs. Inferred Architecture:
          </span>{' '}
          {report.limitationsNote}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter technologies by verification confidence"
          className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
        >
          {(
            [
              { id: 'all', label: `All (${report.techStack.length})` },
              { id: 'detected', label: `Detected (${detectedCount})` },
              { id: 'inferred', label: `Inferred (${inferredCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setConfidenceFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                confidenceFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="tech-category-filter"
            className="text-xs font-medium text-slate-500 dark:text-slate-400"
          >
            Category
          </label>
          <select
            id="tech-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Cpu
            className="w-4 h-4 text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Detected & Inferred Technology Stack
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No technologies match the active filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50">
                  <th className="py-2.5 px-4 font-medium">Technology</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Confidence</th>
                  <th className="py-2.5 px-4 font-medium">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((tech) => {
                  const isDetected = tech.confidence === 'detected';
                  return (
                    <tr
                      key={`${tech.name}-${tech.category}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {tech.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {tech.category}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 ${
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
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                        {tech.evidence}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
