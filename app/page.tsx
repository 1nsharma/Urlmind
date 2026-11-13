'use client';

import { useCallback, useEffect, useState } from 'react';
import CompareView from '@/components/CompareView';
import IntelligenceWorkspace from '@/components/IntelligenceWorkspace';
import PipelineView from '@/components/PipelineView';
import SavedMapsView from '@/components/SavedMapsView';
import TopNav, { type AppSection } from '@/components/TopNav';
import UrlAnalyzerLanding from '@/components/UrlAnalyzerLanding';
import { SHOWCASE_PRESETS } from '@/lib/showcasePresets';
import type { UrlIntelligenceReport, WorkspaceView } from '@/lib/types';

const STORAGE_HISTORY_KEY = 'urlmind_history_v1';
const STORAGE_THEME_KEY = 'urlmind_theme_v1';

export default function HomePage() {
  const [section, setSection] = useState<AppSection>('analyzer');
  const [activeReport, setActiveReport] =
    useState<UrlIntelligenceReport | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>('map');
  const [history, setHistory] = useState<UrlIntelligenceReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Hydrate persisted history, theme, and optional ?autostart=1
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
        if (savedTheme === 'dark') {
          setIsDark(true);
          document.documentElement.classList.add('dark');
        }

        const rawHistory = localStorage.getItem(STORAGE_HISTORY_KEY);
        if (rawHistory) {
          const parsed = JSON.parse(rawHistory) as UrlIntelligenceReport[];
          if (Array.isArray(parsed)) {
            setHistory(parsed);
          }
        }
      } catch {
        // Ignore storage access failures
      }

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autostart') === '1') {
          const demo = SHOWCASE_PRESETS['https://github.com/vercel/ai'];
          if (demo) {
            setActiveReport(demo);
            setActiveView('map');
            setSection('analyzer');
          }
        }
      }
    });
  }, []);

  const persistHistory = useCallback((items: UrlIntelligenceReport[]) => {
    setHistory(items);
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(items.slice(0, 12)));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem(STORAGE_THEME_KEY, 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem(STORAGE_THEME_KEY, 'light');
      }
      return next;
    });
  };

  const upsertReport = useCallback(
    (report: UrlIntelligenceReport) => {
      setActiveReport(report);
      setActiveView('map');
      setSection('analyzer');
      setHistory((prev) => {
        const filtered = prev.filter(
          (item) =>
            item.normalizedUrl.replace(/\/+$/, '').toLowerCase() !==
            report.normalizedUrl.replace(/\/+$/, '').toLowerCase(),
        );
        const updated = [report, ...filtered].slice(0, 12);
        try {
          localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
        } catch {
          // Ignore storage error
        }
        return updated;
      });
    },
    [],
  );

  const handleAnalyze = async (
    url: string,
    options: { usePreset?: boolean } = {},
  ) => {
    setErrorMessage(null);
    setIsLoading(true);
    setPipelineStage(1);

    // Instant deterministic showcase load when clicking a curated preset card
    if (options.usePreset) {
      const clean = url.trim().replace(/\/+$/, '').toLowerCase();
      const matched = Object.entries(SHOWCASE_PRESETS).find(
        ([k]) => k.replace(/\/+$/, '').toLowerCase() === clean,
      )?.[1];
      if (matched) {
        setPipelineStage(2);
        setTimeout(() => {
          setPipelineStage(3);
          upsertReport(matched);
          setIsLoading(false);
          setPipelineStage(0);
        }, 220);
        return;
      }
    }

    const stageTimer1 = setTimeout(() => setPipelineStage(2), 600);
    const stageTimer2 = setTimeout(() => setPipelineStage(3), 1800);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, usePreset: Boolean(options.usePreset) }),
      });

      const data = (await res.json()) as {
        report?: UrlIntelligenceReport;
        error?: string;
      };
      if (!res.ok || !data.report) {
        throw new Error(data.error || 'Failed to analyze URL.');
      }

      upsertReport(data.report);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not analyze that URL. Please check the address and try again.',
      );
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setIsLoading(false);
      setPipelineStage(0);
    }
  };

  const handlePrimaryHeaderAction = () => {
    if (activeReport) {
      setActiveReport(null);
      setErrorMessage(null);
      setSection('analyzer');
    } else {
      void handleAnalyze('https://github.com/vercel/ai', { usePreset: true });
    }
  };

  return (
    <div id="top" className="min-h-screen flex flex-col">
      <TopNav
        activeSection={section}
        onNavigate={(next) => setSection(next)}
        hasActiveReport={Boolean(activeReport)}
        onPrimaryAction={handlePrimaryHeaderAction}
      />

      {/* Mobile Secondary Section Switcher */}
      <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: 'analyzer', label: 'Analyzer' },
            { id: 'compare', label: 'Compare' },
            { id: 'saved', label: 'Saved Maps' },
            { id: 'pipeline', label: 'Pipeline' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              section === item.id
                ? 'bg-slate-900 dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {section === 'analyzer' &&
          (activeReport ? (
            <IntelligenceWorkspace
              report={activeReport}
              history={history}
              activeView={activeView}
              onSelectView={setActiveView}
              onSelectReport={(rep) => {
                setActiveReport(rep);
                setActiveView('map');
              }}
              onOpenCompare={() => setSection('compare')}
              isDark={isDark}
              onToggleTheme={handleToggleTheme}
            />
          ) : (
            <UrlAnalyzerLanding
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              pipelineStage={pipelineStage}
              errorMessage={errorMessage}
            />
          ))}

        {section === 'compare' && (
          <CompareView history={history} activeReport={activeReport} />
        )}

        {section === 'saved' && (
          <SavedMapsView
            history={history}
            onOpenReport={(rep) => {
              setActiveReport(rep);
              setActiveView('map');
              setSection('analyzer');
            }}
            onDeleteReport={(id) => {
              const updated = history.filter((item) => item.id !== id);
              persistHistory(updated);
              if (activeReport?.id === id) {
                setActiveReport(null);
              }
            }}
            onStartNew={() => {
              setActiveReport(null);
              setSection('analyzer');
            }}
          />
        )}

        {section === 'pipeline' && (
          <PipelineView onGoToAnalyzer={() => setSection('analyzer')} />
        )}
      </div>
    </div>
  );
}
