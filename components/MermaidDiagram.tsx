'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  ExternalLink,
  ImageDown,
  RefreshCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { generateMermaidDiagram } from '@/lib/graphLayout';
import type { UrlIntelligenceReport } from '@/lib/types';

interface MermaidDiagramProps {
  report: UrlIntelligenceReport;
  isDark?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

function resolveAnchorHref(
  urlOrPath: string | undefined,
  baseUrl: string,
): string | null {
  if (!urlOrPath) return null;
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  try {
    return new URL(urlOrPath, baseUrl).toString();
  } catch {
    return null;
  }
}

export default function MermaidDiagram({
  report,
  isDark = false,
  onRegenerate,
  isRegenerating = false,
}: MermaidDiagramProps) {
  const reactId = useId().replace(/:/g, '-');
  const svgWrapperRef = useRef<HTMLDivElement | null>(null);
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

  const handleDownloadPng = () => {
    const svgEl = svgWrapperRef.current?.querySelector('svg');
    if (!svgEl) return;

    const cloned = svgEl.cloneNode(true) as SVGSVGElement;
    const box = svgEl.getBoundingClientRect();
    const width = Math.max(800, Math.round(box.width || 1000));
    const height = Math.max(500, Math.round(box.height || 650));
    cloned.setAttribute('width', String(width));
    cloned.setAttribute('height', String(height));

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(cloned);
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    const img = new window.Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = isDark ? '#020617' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${slug}-architecture.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };
    img.src = svgDataUrl;
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

  const entryNodes = useMemo(
    () => report.nodes.filter((n) => n.layer === 'entry'),
    [report.nodes],
  );
  const nodeLabelById = useMemo(
    () => new Map(report.nodes.map((n) => [n.id, n.label])),
    [report.nodes],
  );

  return (
    <div className="space-y-4">
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
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              <ImageDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>PNG</span>
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

            {onRegenerate && (
              <button
                type="button"
                disabled={isRegenerating}
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        </div>

        {/* Rendered SVG Canvas */}
        <div className="min-h-[460px] max-h-[620px] overflow-auto p-6 flex items-start justify-center bg-slate-50/40 dark:bg-slate-950/30">
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
              ref={svgWrapperRef}
              className="transition-transform origin-top"
              style={{ transform: `scale(${zoom})` }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}
        </div>
      </div>

      {/* GitDiagram-style Architecture Breakdown */}
      <section
        aria-label="Architecture breakdown"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5"
      >
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            How {report.domain} works
          </h3>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {report.executiveOverview || report.summary}
          </p>
        </div>

        {entryNodes.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Main entry points
            </h4>
            <ul className="space-y-1.5 text-xs">
              {entryNodes.map((node) => {
                const href = resolveAnchorHref(node.urlOrPath, report.normalizedUrl);
                return (
                  <li key={node.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {node.label}
                    </span>
                    {node.urlOrPath && (
                      href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <span>{node.urlOrPath}</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      ) : (
                        <code className="font-mono text-slate-500 dark:text-slate-400">
                          {node.urlOrPath}
                        </code>
                      )
                    )}
                    <span className="text-slate-500 dark:text-slate-400">
                      — {node.description}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
              Components ({report.nodes.length})
            </h4>
            <ul className="space-y-2 text-xs">
              {report.nodes.map((node) => {
                const href = resolveAnchorHref(node.urlOrPath, report.normalizedUrl);
                return (
                  <li
                    key={node.id}
                    className="flex items-start justify-between gap-3 py-1 border-b border-slate-100 dark:border-slate-800/70 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {node.label}
                      </span>
                      <span className="ml-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {node.category} ·{' '}
                        <span
                          className={
                            node.confidence === 'detected'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }
                        >
                          {node.confidence === 'detected' ? 'Detected' : 'Inferred'}
                        </span>
                      </span>
                    </div>
                    {node.urlOrPath && (
                      href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0 max-w-[190px] truncate"
                        >
                          <span className="truncate">{node.urlOrPath}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                        </a>
                      ) : (
                        <code className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0 max-w-[190px] truncate">
                          {node.urlOrPath}
                        </code>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
              Connections ({report.edges.length})
            </h4>
            <ul className="space-y-2 text-xs">
              {report.edges.map((edge) => {
                const srcLabel = nodeLabelById.get(edge.source) || edge.source;
                const tgtLabel = nodeLabelById.get(edge.target) || edge.target;
                return (
                  <li
                    key={edge.id}
                    className="py-1 border-b border-slate-100 dark:border-slate-800/70 last:border-b-0 text-slate-700 dark:text-slate-300"
                  >
                    <span className="font-medium text-slate-900 dark:text-white">
                      {srcLabel}
                    </span>{' '}
                    <span className="text-slate-400">→</span>{' '}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {tgtLabel}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      : {edge.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
