import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectSocialPlatform } from './adapters/social';
import { resolveCampaignDestination } from './campaigns';
import {
  clearCachedReport,
  getCachedReport,
  normalizeCacheUrl,
  setCachedReport,
} from './cache';
import {
  classifyUrl,
  detectHtmlTechnologies,
  normalizeAndValidateUrl,
  reconstructTargetUrlFromSegments,
} from './classifier';
import {
  buildReportFromTechCsv,
  parseTechCsv,
  SAMPLE_WAPPALYZER_CSV,
} from './csvImporter';
import { parseJinaMarkdown } from './crawler';
import {
  computeComparisonDiff,
  computeLayeredGraphPositions,
  generateMarkdownReport,
  generateMermaidDiagram,
} from './graphLayout';
import { findShowcasePreset, SHOWCASE_PRESETS } from './showcasePresets';

test('normalizeAndValidateUrl rejects empty, invalid, and local URLs', () => {
  assert.equal(normalizeAndValidateUrl('').valid, false);
  assert.equal(normalizeAndValidateUrl('   ').valid, false);
  assert.equal(normalizeAndValidateUrl('javascript:alert(1)').valid, false);
  assert.equal(normalizeAndValidateUrl('http://localhost:3000').valid, false);
  assert.equal(normalizeAndValidateUrl('not-a-domain').valid, false);

  const validBare = normalizeAndValidateUrl('stripe.com');
  assert.equal(validBare.valid, true);
  assert.equal(validBare.normalizedUrl, 'https://stripe.com/');
  assert.equal(validBare.domain, 'stripe.com');
});

test('reconstructTargetUrlFromSegments restores collapsed schemes, preserves queries, and skips static files', () => {
  assert.equal(
    reconstructTargetUrlFromSegments(['https:', 'github.com', 'vercel', 'ai']),
    'https://github.com/vercel/ai',
  );
  assert.equal(
    reconstructTargetUrlFromSegments(['youtube.com', 'watch'], { v: 'M7lc1UVf-VE' }),
    'https://youtube.com/watch?v=M7lc1UVf-VE',
  );
  assert.equal(reconstructTargetUrlFromSegments(['favicon.ico']), null);
  assert.equal(reconstructTargetUrlFromSegments(['api', 'analyze']), null);
  assert.equal(reconstructTargetUrlFromSegments(['out', 'coffee']), null);
});

test('classifyUrl categorizes websites, GitHub repos, APIs, docs, articles, media, and social URLs', () => {
  assert.equal(classifyUrl('https://github.com/vercel/ai'), 'github');
  assert.equal(classifyUrl('https://petstore3.swagger.io'), 'api');
  assert.equal(classifyUrl('https://api.example.com/v1/openapi.json'), 'api');
  assert.equal(classifyUrl('https://nextjs.org/docs'), 'docs');
  assert.equal(classifyUrl('https://docs.stripe.com/payments'), 'docs');
  assert.equal(classifyUrl('https://arxiv.org/abs/2401.00001'), 'article');
  assert.equal(classifyUrl('https://app.linear.app/team'), 'webapp');
  assert.equal(classifyUrl('https://stripe.com'), 'website');
  assert.equal(classifyUrl('https://www.youtube.com/watch?v=M7lc1UVf-VE'), 'media');
  assert.equal(classifyUrl('https://youtu.be/M7lc1UVf-VE'), 'media');
  assert.equal(classifyUrl('https://x.com/vercel/status/123456'), 'social');
  assert.equal(classifyUrl('https://www.instagram.com/p/abc123/'), 'social');
});

test('detectSocialPlatform accurately identifies YouTube, Twitter/X, Instagram, and LinkedIn', () => {
  assert.equal(detectSocialPlatform('https://youtu.be/abc'), 'youtube');
  assert.equal(detectSocialPlatform('https://m.youtube.com/watch?v=abc'), 'youtube');
  assert.equal(detectSocialPlatform('https://x.com/user/status/1'), 'twitter');
  assert.equal(detectSocialPlatform('https://twitter.com/user/status/1'), 'twitter');
  assert.equal(detectSocialPlatform('https://www.instagram.com/p/xyz/'), 'instagram');
  assert.equal(detectSocialPlatform('https://www.linkedin.com/posts/xyz'), 'linkedin');
  assert.equal(detectSocialPlatform('https://stripe.com'), null);
});

test('detectHtmlTechnologies extracts detected signatures including Wappalyzer-grade UI, analytics, and metadata signals', () => {
  const sampleHtml = `
    <html>
      <head>
        <meta property="og:title" content="GitDiagram" />
        <link rel="canonical" href="https://gitdiagram.com/" />
        <script src="/_next/static/chunks/main.js" fetchpriority="high"></script>
        <script src="https://js.stripe.com/v3/"></script>
        <script src="https://us.i.posthog.com/static/array.js"></script>
        <script type="application/ld+json">{}</script>
      </head>
      <body class="flex bg-slate-50 px-4" data-radix-portal="">
        <svg class="lucide lucide-network"></svg>
        <div class="mermaid" data-processed="true"></div>
      </body>
    </html>
  `;
  const techs = detectHtmlTechnologies(sampleHtml, {
    'x-vercel-id': 'sin1::abc123',
    server: 'Vercel',
  });

  const names = techs.map((t) => t.name);
  assert.ok(names.includes('Next.js'));
  assert.ok(names.includes('Vercel Edge Network'));
  assert.ok(names.includes('Stripe.js'));
  assert.ok(names.includes('Tailwind CSS'));
  assert.ok(names.includes('Schema.org JSON-LD'));
  assert.ok(names.includes('Radix UI'));
  assert.ok(names.includes('Lucide Icons'));
  assert.ok(names.includes('Mermaid.js'));
  assert.ok(names.includes('PostHog'));
  assert.ok(names.includes('Open Graph Protocol'));
  assert.ok(names.includes('Canonical URL Tag'));
  assert.ok(names.includes('Priority Hints'));
  assert.ok(techs.every((t) => t.confidence === 'detected'));
});

test('parseTechCsv and buildReportFromTechCsv synthesize layered architecture reports from Wappalyzer CSVs', () => {
  const parsed = parseTechCsv(SAMPLE_WAPPALYZER_CSV);
  assert.equal(parsed.detectedUrl, 'https://gitdiagram.com');
  assert.equal(parsed.rows.length, 11);

  const report = buildReportFromTechCsv(SAMPLE_WAPPALYZER_CSV);
  assert.equal(report.domain, 'gitdiagram.com');
  assert.equal(report.sourceMethod, 'csv-import');
  assert.equal(report.techStack.length, 11);
  assert.ok(report.nodes.some((n) => n.layer === 'entry'));
  assert.ok(report.nodes.some((n) => n.layer === 'frontend'));
  assert.ok(report.nodes.some((n) => n.layer === 'external'));
  assert.ok(report.nodes.some((n) => n.confidence === 'inferred'));
});

test('computeLayeredGraphPositions places nodes across distinct non-overlapping columns', () => {
  const report = SHOWCASE_PRESETS['https://github.com/vercel/ai'];
  const positioned = computeLayeredGraphPositions(report.nodes, report.edges);
  assert.equal(positioned.length, report.nodes.length);

  const coords = new Set(positioned.map((p) => `${p.x}:${p.y}`));
  assert.equal(coords.size, positioned.length);
});

test('generateMermaidDiagram emits styled flowchart TD with click directives and generateMarkdownReport exports cleanly', () => {
  const report = findShowcasePreset('https://github.com/vercel/ai');
  assert.ok(report);

  const mermaid = generateMermaidDiagram(report);
  assert.ok(mermaid.startsWith('flowchart TD'));
  assert.ok(mermaid.includes('classDef toneLogic'));
  assert.ok(mermaid.includes('click pkg_core "https://github.com/vercel/ai/tree/main/packages/ai" _blank'));

  const markdown = generateMarkdownReport(report);
  assert.ok(markdown.includes('# URLMIND Intelligence Report'));
  assert.ok(markdown.includes('## Architecture Nodes'));
  assert.ok(markdown.includes('```mermaid'));
});

test('server cache strips tracking params and persists/retrieves reports', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'urlmind-cache-'));
  try {
    const cleanA = normalizeCacheUrl('https://stripe.com/payments/?utm_source=x&si=123');
    const cleanB = normalizeCacheUrl('https://stripe.com/payments');
    assert.equal(cleanA, cleanB);

    const sample = SHOWCASE_PRESETS['https://stripe.com'];
    await setCachedReport(
      'https://stripe.com/?utm_source=twitter',
      sample,
      24,
      tmpDir,
    );

    const hit = await getCachedReport<typeof sample>('https://stripe.com/', tmpDir);
    assert.ok(hit);
    assert.equal(hit.data.domain, 'stripe.com');

    await clearCachedReport('https://stripe.com/', tmpDir);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('computeComparisonDiff calculates shared and unique technologies cleanly', () => {
  const reportA = SHOWCASE_PRESETS['https://stripe.com'];
  const reportB = SHOWCASE_PRESETS['https://nextjs.org/docs'];
  const diff = computeComparisonDiff(reportA, reportB);

  assert.equal(diff.nodeCountA, reportA.nodes.length);
  assert.equal(diff.nodeCountB, reportB.nodes.length);
  assert.ok(diff.uniqueToA.includes('Stripe.js v3'));
  assert.ok(diff.uniqueToB.includes('Next.js (Dogfooded)'));
});

test('resolveCampaignDestination resolves env URLs across short and full slugs and falls back to null when unconfigured', () => {
  const mockEnv = {
    URLMIND_CAMPAIGN_COFFEE: 'https://buymeacoffee.com/1nsharma',
    URLMIND_CAMPAIGN_AGENTS: 'https://agents.example.com',
    URLMIND_CAMPAIGN_SUPERINTELLIGENCE: 'https://super.example.com',
    URLMIND_CAMPAIGN_STUDY: 'javascript:alert(1)',
    URLMIND_CAMPAIGN_SPONSOR: '',
  };

  assert.equal(
    resolveCampaignDestination('coffee', mockEnv).destination,
    'https://buymeacoffee.com/1nsharma',
  );
  assert.equal(
    resolveCampaignDestination('agents', mockEnv).destination,
    'https://agents.example.com',
  );
  assert.equal(
    resolveCampaignDestination('agents-world', mockEnv).destination,
    'https://agents.example.com',
  );
  assert.equal(
    resolveCampaignDestination('superintelligence', mockEnv).destination,
    'https://super.example.com',
  );
  assert.equal(
    resolveCampaignDestination('superintelligence-house', mockEnv).destination,
    'https://super.example.com',
  );
  assert.equal(resolveCampaignDestination('study', mockEnv).destination, null);
  assert.equal(resolveCampaignDestination('sponsor', mockEnv).destination, null);
  assert.equal(resolveCampaignDestination('unknown', mockEnv).destination, null);
});

test('parseJinaMarkdown extracts title, headings, internal/external links, and clean excerpt', () => {
  const sampleMarkdown = `Title: Acme Docs Portal
URL Source: https://acme.dev/docs

Markdown Content:
# Welcome to Acme Docs
Explore our [API Reference](/docs/api) or read [Pricing](https://acme.dev/pricing).
Check our [GitHub Repo](https://github.com/acme/sdk) and ![Architecture](https://acme.dev/img.png).
## Quickstart Guide
Run \`npm install @acme/sdk\` to get started.
### Authentication
Use [OAuth Setup](/docs/oauth#tokens) or [Email Support](mailto:help@acme.dev).`;

  const parsed = parseJinaMarkdown(sampleMarkdown, 'https://acme.dev/docs', 'acme.dev');
  assert.equal(parsed.title, 'Acme Docs Portal');
  assert.deepEqual(parsed.headings, [
    'Welcome to Acme Docs',
    'Quickstart Guide',
    'Authentication',
  ]);
  assert.deepEqual(parsed.internalLinks, [
    { text: 'API Reference', href: '/docs/api' },
    { text: 'Pricing', href: '/pricing' },
    { text: 'OAuth Setup', href: '/docs/oauth' },
  ]);
  assert.deepEqual(parsed.externalLinks, [
    { text: 'GitHub Repo', href: 'https://github.com' },
  ]);
  assert.ok(parsed.textExcerpt.includes('Quickstart Guide'));
  assert.ok(!parsed.textExcerpt.includes('URL Source:'));
});
