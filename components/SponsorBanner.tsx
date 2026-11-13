'use client';

import { useState } from 'react';
import {
  BookOpen,
  Bot,
  Check,
  Coffee,
  Copy,
  ExternalLink,
  Megaphone,
  Sparkles,
  X,
} from 'lucide-react';

interface EcosystemItem {
  id: string;
  title: string;
  description: string;
  href: string;
  tag: string;
  icon: 'agents' | 'superintelligence' | 'study';
}

const ECOSYSTEM_LINKS: EcosystemItem[] = [
  {
    id: 'agents-world',
    title: 'AI Agents World',
    description:
      'Explore autonomous workflows, multi-agent templates & open-source agent tools.',
    href: '/out/agents-world',
    tag: 'AI Ecosystem',
    icon: 'agents',
  },
  {
    id: 'superintelligence-house',
    title: 'Superintelligence House',
    description:
      'Deep research, frontier AI architectures & next-gen intelligence systems.',
    href: '/out/superintelligence-house',
    tag: 'Research & Lab',
    icon: 'superintelligence',
  },
  {
    id: 'study-material',
    title: 'Curated Study Material & Content',
    description:
      'Visual notes, system design blueprints, and structured developer roadmaps.',
    href: '/out/study-material',
    tag: 'Learning',
    icon: 'study',
  },
];

const SPONSOR_ENV_SNIPPET = `URLMIND_CAMPAIGN_COFFEE="https://buymeacoffee.com/yourhandle"
URLMIND_CAMPAIGN_AGENTS="https://your-agents-world-url.com"
URLMIND_CAMPAIGN_SUPERINTELLIGENCE="https://your-superintelligence-url.com"
URLMIND_CAMPAIGN_STUDY="https://your-study-material-url.com"`;

export default function SponsorBanner() {
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const renderIcon = (type: EcosystemItem['icon']) => {
    switch (type) {
      case 'agents':
        return <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />;
      case 'superintelligence':
        return <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
      case 'study':
        return <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
    }
  };

  const handleCopyEnv = async () => {
    try {
      await navigator.clipboard.writeText(SPONSOR_ENV_SNIPPET);
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <section
      aria-label="Sponsorship and ecosystem links"
      className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800"
    >
      {/* Top Bar: Sponsor Slot + Support Actions */}
      <div className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Sponsored
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              ·
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Tracked via /out/superintelligence-house
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Superintelligence House — Build &amp; Deploy Autonomous AI Agents
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Free study guides, agent blueprints, and open-source AI resources for builders.
          </p>
        </div>

        <div className="flex flex-wrap shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSponsorModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Advertise</span>
          </button>

          <a
            href="/out/coffee"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
          >
            <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Buy me a coffee</span>
          </a>
        </div>
      </div>

      {/* Ecosystem Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {ECOSYSTEM_LINKS.map((item) => (
          <a
            key={item.id}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderIcon(item.icon)}
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {item.tag}
                  </span>
                </div>
                <ExternalLink
                  className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-blue-600"
                  aria-hidden="true"
                />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {item.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Sponsorship Inquiry / Configuration Modal */}
      {showSponsorModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sponsor-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id="sponsor-modal-title"
                  className="font-display text-base font-bold text-slate-900 dark:text-white"
                >
                  Sponsor URLMIND or Configure Ecosystem Links
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  All placement clicks route through <code className="font-mono">/out/[campaign]</code>{' '}
                  for clean server-side click tracking.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close sponsorship dialog"
                onClick={() => setShowSponsorModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Self-hosted campaign destinations (.env)
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyEnv()}
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {copiedEnv ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      <span>Copy snippet</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-950 text-slate-100 text-[11px] font-mono overflow-x-auto leading-relaxed">
                <code>{SPONSOR_ENV_SNIPPET}</code>
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <a
                href="/out/sponsor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                <span>Open Project Repository</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => setShowSponsorModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
