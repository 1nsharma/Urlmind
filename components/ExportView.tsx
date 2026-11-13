'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FileText,
  Printer,
} from 'lucide-react';
import {
  generateMarkdownReport,
  generateMermaidDiagram,
} from '@/lib/graphLayout';
import type { UrlIntelligenceReport } from '@/lib/types';

interface ExportViewProps {
  report: UrlIntelligenceReport;
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportView({ report }: ExportViewProps) {
  const [copiedTarget, setCopiedTarget] = useState<'mermaid' | 'markdown' | null>(
    null,
  );

  const mermaidCode = useMemo(() => generateMermaidDiagram(report), [report]);
  const markdownDoc = useMemo(
    () => generateMarkdownReport(report),
    [report],
  );

  const slug = report.domain.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  const handleCopy = async (text: string, target: 'mermaid' | 'markdown') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      setTimeout(() => setCopiedTarget(null), 2000);
    } catch {
      // Clipboard API fallback ignored if restricted
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() =>
            triggerDownload(
              `${slug}-intelligence-report.md`,
              markdownDoc,
              'text/markdown;charset=utf-8',
            )
          }
          className="text-left p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <Download className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </div>
          <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Markdown Report (.md)
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Executive summary, node evidence, tech audit & 60s script.
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            triggerDownload(
              `${slug}-architecture.mmd`,
              mermaidCode,
              'text/plain;charset=utf-8',
            )
          }
          className="text-left p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <FileCode2 className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <Download className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </div>
          <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Mermaid Diagram (.mmd)
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Flowchart syntax compatible with GitHub, Notion & Obsidian.
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            triggerDownload(
              `${slug}-urlmind.json`,
              JSON.stringify(report, null, 2),
              'application/json;charset=utf-8',
            )
          }
          className="text-left p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <FileCode2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <Download className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </div>
          <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            JSON Intelligence (.json)
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Full structured graph, sitemap, workflows & evidence schema.
          </p>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="text-left p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <Printer className="w-4 h-4 text-slate-700 dark:text-slate-300" aria-hidden="true" />
          </div>
          <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Print / Save as PDF
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Print-formatted report via browser PDF export.
          </p>
        </button>
      </div>

      {/* Mermaid Source Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Mermaid Diagram Source
          </h3>
          <button
            type="button"
            onClick={() => void handleCopy(mermaidCode, 'mermaid')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {copiedTarget === 'mermaid' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy Mermaid</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-5 text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 overflow-x-auto leading-relaxed">
          <code>{mermaidCode}</code>
        </pre>
      </div>

      {/* Markdown Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Markdown Report Preview
          </h3>
          <button
            type="button"
            onClick={() => void handleCopy(markdownDoc, 'markdown')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {copiedTarget === 'markdown' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-5 text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 overflow-x-auto max-h-80 leading-relaxed">
          <code>{markdownDoc}</code>
        </pre>
      </div>
    </div>
  );
}
