'use client';

import { ArrowRight, CheckCircle2, GitBranch, HelpCircle } from 'lucide-react';
import type { UrlIntelligenceReport } from '@/lib/types';

interface WorkflowViewProps {
  report: UrlIntelligenceReport;
}

export default function WorkflowView({ report }: WorkflowViewProps) {
  const nodeMap = new Map(report.nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-6">
      {report.workflows.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No sequential user or execution workflows were identified for this URL.
        </div>
      ) : (
        report.workflows.map((wf) => (
          <section
            key={wf.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GitBranch
                  className="w-4 h-4 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  {wf.title}
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {wf.summary}
              </p>
            </div>

            <ol className="divide-y divide-slate-100 dark:divide-slate-800">
              {wf.steps.map((step) => {
                const targetNode = nodeMap.get(step.targetNodeId);
                const isDetected = step.confidence === 'detected';
                return (
                  <li
                    key={step.id}
                    className="p-4 sm:px-5 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="lg:col-span-3 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold flex items-center justify-center tabular-nums shrink-0">
                        0{step.stepNumber}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Actor
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {step.actor}
                        </p>
                      </div>
                    </div>

                    <div className="lg:col-span-4">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Action & Target
                      </p>
                      <p className="text-sm text-slate-800 dark:text-slate-200">
                        {step.action}
                      </p>
                      {targetNode && (
                        <p className="mt-0.5 text-xs font-mono text-blue-600 dark:text-blue-400">
                          → {targetNode.label}
                        </p>
                      )}
                    </div>

                    <div className="lg:col-span-4 flex items-start gap-2">
                      <ArrowRight
                        className="w-4 h-4 text-slate-400 mt-0.5 shrink-0 hidden sm:block"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Outcome
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {step.outcome}
                        </p>
                      </div>
                    </div>

                    <div className="lg:col-span-1 flex lg:justify-end">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
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
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
