'use client';

import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  FileCode2,
  Globe,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  classifyUrl,
  getCategoryLabel,
  normalizeAndValidateUrl,
} from '@/lib/classifier';
import { SHOWCASE_PRESET_METAS } from '@/lib/showcasePresets';

interface UrlAnalyzerLandingProps {
  onAnalyze: (
    url: string,
    options?: { usePreset?: boolean; forceRefresh?: boolean },
  ) => Promise<void>;
  isLoading: boolean;
  pipelineStage: number;
  errorMessage: string | null;
}

const PIPELINE_STEPS = [
  {
    step: '01',
    title: 'URL Classifier',
    detail:
      'Detects Website, Web App, GitHub, API Spec, Docs, YouTube, or Social URLs.',
  },
  {
    step: '02',
    title: 'Intelligent Crawler',
    detail:
      'Checks server cache, fetches DOM/GitHub/OpenAPI, or queries public oEmbed APIs.',
  },
  {
    step: '03',
    title: 'AI Analysis Engine',
    detail:
      'Maps interactive graphs, Mermaid diagrams, flows, tech stack, and 60s explainer.',
  },
];

function getPresetIcon(id: string) {
  if (id.includes('github')) return <Code2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
  if (id.includes('petstore')) return <FileCode2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
  if (id.includes('nextjs')) return <BookOpen className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
  return <Globe className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
}

export default function UrlAnalyzerLanding({
  onAnalyze,
  isLoading,
  pipelineStage,
  errorMessage,
}: UrlAnalyzerLandingProps) {
  const [urlInput, setUrlInput] = useState('');
  const [forceRefresh, setForceRefresh] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const trimmed = urlInput.trim();
  const detectedCategory = trimmed ? classifyUrl(trimmed) : null;
  const displayError = validationError || errorMessage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = normalizeAndValidateUrl(urlInput);
    if (!check.valid || !check.normalizedUrl) {
      setValidationError(check.error || 'Enter a valid public URL.');
      return;
    }
    setValidationError(null);
    await onAnalyze(check.normalizedUrl, {
      usePreset: false,
      forceRefresh,
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-xs font-medium tracking-wide text-blue-600 dark:text-blue-400 mb-3">
          Universal URL Intelligence
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
          Understand anything on the internet from a single URL.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Convert any public website, web app, GitHub repository, API documentation,
          article, YouTube video, or social post into an interactive graph, live
          Mermaid diagram, 60-second explainer, and intelligence report.
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label htmlFor="urlmind-url-input" className="sr-only">
              Public URL to analyze
            </label>
            <div className="flex-1 flex items-center gap-3 px-3">
              <Globe
                className="w-4 h-4 text-slate-400 shrink-0"
                aria-hidden="true"
              />
              <input
                id="urlmind-url-input"
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="https://react.dev, github.com/vercel/ai, or youtube.com/watch?v=..."
                disabled={isLoading}
                className="w-full py-2.5 text-sm sm:text-base bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Analyzing</span>
                </>
              ) : (
                <>
                  <span>Analyze URL</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>

          <div className="px-3 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              {detectedCategory ? (
                <span>
                  Classifier preview:{' '}
                  <strong className="font-medium text-slate-800 dark:text-slate-200">
                    {getCategoryLabel(detectedCategory)}
                  </strong>
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Quick fill:</span>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setValidationError(null);
                      setUrlInput('https://www.youtube.com/watch?v=M7lc1UVf-VE');
                    }}
                    className="font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    YouTube Video
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setValidationError(null);
                      setUrlInput('https://x.com/vercel');
                    }}
                    className="font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    X Profile
                  </button>
                </div>
              )}
            </div>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={forceRefresh}
                disabled={isLoading}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-600"
              />
              <RefreshCw className="w-3 h-3 text-slate-400" aria-hidden="true" />
              <span>Bypass server cache (Force live)</span>
            </label>
          </div>
        </form>

        {displayError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2.5 text-left px-4 py-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{displayError}</span>
          </div>
        )}

        {isLoading && (
          <div
            aria-live="polite"
            className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-left"
          >
            <p className="text-xs font-semibold text-slate-900 dark:text-white mb-4">
              Running URL Intelligence Pipeline
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PIPELINE_STEPS.map((item, idx) => {
                const active = pipelineStage === idx + 1;
                const done = pipelineStage > idx + 1;
                return (
                  <div
                    key={item.step}
                    className={`p-3 rounded-lg border transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                        : done
                          ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-medium mb-1">
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {item.step}. {item.title}
                      </span>
                      {done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                      ) : active ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" aria-hidden="true" />
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {item.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Curated Interactive Examples */}
      <section className="mt-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Explore Reference Intelligence Maps
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Load an instant multi-view workspace across each supported URL domain.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SHOWCASE_PRESET_METAS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setValidationError(null);
                setUrlInput(preset.url);
                void onAnalyze(preset.url, { usePreset: true });
              }}
              className="group text-left p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {preset.categoryLabel}
                </span>
                {getPresetIcon(preset.id)}
              </div>
              <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                {preset.label}
              </p>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {preset.tagline}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Pipeline & Epistemic Transparency */}
      <section className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-slate-200 dark:border-slate-800 pt-10">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            01. Universal URL Classification
          </h3>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Routes websites, web apps, GitHub repositories, OpenAPI specs,
            documentation portals, YouTube videos, and social posts through tailored adapters.
          </p>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            02. Real Crawl, oEmbed + Server Cache
          </h3>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Inspects live HTML DOM routes, GitHub trees, OpenAPI JSON, and public
            oEmbed feeds with persistent server caching for instant repeat lookups.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
            <span>Detected vs. Inferred Integrity</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Public URLs cannot reveal private databases or gated social feeds.
            URLMIND labels every node and technology strictly as{' '}
            <strong className="text-slate-800 dark:text-slate-200">Detected</strong>{' '}
            (observable evidence) or{' '}
            <strong className="text-slate-800 dark:text-slate-200">Inferred</strong>{' '}
            (architectural reasoning).
          </p>
        </div>
      </section>
    </div>
  );
}
