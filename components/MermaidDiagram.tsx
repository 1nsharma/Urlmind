'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import mermaid from 'mermaid';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { generateMermaidDiagram } from '@/lib/graphLayout';
import type { UrlIntelligenceReport } from '@/lib/types';

interface MermaidDiagramProps {
  report: UrlIntelligenceReport;
  isDark?: boolean;
}

export default function MermaidDiagram({
  report,
  isDark = false,
}: MermaidDiagramProps) {
  const reactId = useId().replace(/:/g, '-');
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  const chartCode = useMemo(() => generateMermaidDiagram(report), [report]);
  const slug = report.domain.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  useEffect(() => {
    let active = true;

    async function renderSvg() {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          flowchart: {
            curve: 'basis',
            htmlLabels: true,
            padding: 16,
          },
        });
        const uniqueId = `urlmind-mermaid-${reactId}-${isDark ? 'd' : 'l'}`;
        const { svg } = await mermaid.render(uniqueId, chartCode);
        if (active) {
          setError(null);
          setSvgContent(svg);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to render Mermaid flowchart.',
          );
        }
      }
    }

    void renderSvg();
    return () => {
      active = false;
    };
  }, [chartCode, reactId, isDark]);

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-mermaid.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(chartCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <div
      data-testid="mermaid-diagram-panel"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Diagram Controls Bar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-white">
            Mermaid Flowchart (v11 SVG)
          </span>
          <span aria-hidden="true">·</span>
          <span>Click highlighted nodes to open source paths</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="Zoom out Mermaid diagram"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in Mermaid diagram"
            onClick={() => setZoom((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Reset Mermaid zoom"
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => void handleCopySource()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy .mmd</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={!svgContent}
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download SVG</span>
          </button>
        </div>
      </div>

      {/* Rendered SVG Canvas */}
      <div className="min-h-[480px] max-h-[640px] overflow-auto p-6 flex items-start justify-center bg-slate-50/40 dark:bg-slate-950/30">
        {error ? (
          <div
            role="alert"
            className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-4 py-3 rounded-lg"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Mermaid render error: {error}</span>
          </div>
        ) : !svgContent ? (
          <div className="py-16 text-xs text-slate-500 dark:text-slate-400">
            Rendering Mermaid architecture diagram...
          </div>
        ) : (
          <div
            className="transition-transform origin-top"
            style={{ transform: `scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  );
}
