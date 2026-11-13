'use client';

import { useState } from 'react';
import Markdown from 'react-markdown';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { normalizeAndValidateUrl } from '@/lib/classifier';
import { SHOWCASE_PRESET_METAS } from '@/lib/showcasePresets';
import type { ComparisonResult, UrlIntelligenceReport } from '@/lib/types';

interface CompareViewProps {
  history: UrlIntelligenceReport[];
  activeReport: UrlIntelligenceReport | null;
}

export default function CompareView({
  history,
  activeReport,
}: CompareViewProps) {
  const initialUrlA =
    activeReport?.normalizedUrl || SHOWCASE_PRESET_METAS[0].url;
  const initialUrlB =
    SHOWCASE_PRESET_METAS.find(
      (m) =>
        m.url.replace(/\/+$/, '').toLowerCase() !==
        initialUrlA.replace(/\/+$/, '').toLowerCase(),
    )?.url || SHOWCASE_PRESET_METAS[1].url;

  const [urlA, setUrlA] = useState(initialUrlA);
  const [urlB, setUrlB] = useState(initialUrlB);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    const checkA = normalizeAndValidateUrl(urlA);
    const checkB = normalizeAndValidateUrl(urlB);
    if (!checkA.valid || !checkA.normalizedUrl) {
      setError(`URL A: ${checkA.error}`);
      return;
    }
    if (!checkB.valid || !checkB.normalizedUrl) {
      setError(`URL B: ${checkB.error}`);
      return;
    }

    setError(null);
    setIsComparing(true);

    try {
      const findCached = (target: string) => {
        const clean = target.replace(/\/+$/, '').toLowerCase();
        return history.find(
          (r) => r.normalizedUrl.replace(/\/+$/, '').toLowerCase() === clean,
        );
      };

      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlA: checkA.normalizedUrl,
          urlB: checkB.normalizedUrl,
          reportA: findCached(checkA.normalizedUrl),
          reportB: findCached(checkB.normalizedUrl),
          usePreset: true,
        }),
      });
      const data = (await res.json()) as {
        comparison?: ComparisonResult;
        error?: string;
      };
      if (!res.ok || !data.comparison) {
        throw new Error(data.error || 'Failed to compare URLs.');
      }
      setResult(data.comparison);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Comparison request failed.',
      );
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Compare Two URLs
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Contrast architecture layers, detected technology stacks, and structural
          complexity side by side.
        </p>
      </div>

      <form
        onSubmit={handleCompare}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="compare-url-a"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              First URL (Baseline)
            </label>
            <input
              id="compare-url-a"
              type="url"
              value={urlA}
              onChange={(e) => setUrlA(e.target.value)}
              placeholder="https://stripe.com"
              className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label
              htmlFor="compare-url-b"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Second URL (Target)
            </label>
            <input
              id="compare-url-b"
              type="url"
              value={urlB}
              onChange={(e) => setUrlB(e.target.value)}
              placeholder="https://github.com/vercel/ai"
              className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Quick pairs:</span>
            <button
              type="button"
              onClick={() => {
                setUrlA('https://stripe.com');
                setUrlB('https://nextjs.org/docs');
              }}
              className="underline hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              stripe.com vs nextjs.org/docs
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setUrlA('https://github.com/vercel/ai');
                setUrlB('https://petstore3.swagger.io');
              }}
              className="underline hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              vercel/ai vs petstore3.swagger.io
            </button>
          </div>

          <button
            type="submit"
            disabled={isComparing}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {isComparing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Comparing...</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                <span>Compare Architectures</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 px-4 py-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Structural Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Structural & Evidence Diff
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50">
                    <th className="py-2.5 px-4 font-medium">Dimension</th>
                    <th className="py-2.5 px-4 font-medium font-mono">
                      {result.reportA.domain}
                    </th>
                    <th className="py-2.5 px-4 font-medium font-mono">
                      {result.reportB.domain}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Classification
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-900 dark:text-white">
                      {result.reportA.category}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-900 dark:text-white">
                      {result.reportB.category}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Architecture Nodes / Edges
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-900 dark:text-white">
                      {result.diff.nodeCountA} nodes · {result.diff.edgeCountA}{' '}
                      edges
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-900 dark:text-white">
                      {result.diff.nodeCountB} nodes · {result.diff.edgeCountB}{' '}
                      edges
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Directly Detected Ratio
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                      {result.diff.detectedRatioA}% detected
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                      {result.diff.detectedRatioB}% detected
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Unique Technologies
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                      {result.diff.uniqueToA.join(', ') || 'None'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                      {result.diff.uniqueToB.join(', ') || 'None'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Shared Technologies
                    </td>
                    <td
                      colSpan={2}
                      className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300"
                    >
                      {result.diff.sharedTech.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {result.diff.sharedTech.join(', ')}
                        </span>
                      ) : (
                        'No overlapping technology signatures detected.'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Comparative Synthesis */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-3">
              Comparative Intelligence Synthesis
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-slate-700 dark:text-slate-300">
              <Markdown>{result.aiSynthesis}</Markdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
