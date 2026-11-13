import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectSocialPlatform } from './adapters/social';
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
} from './classifier';
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

test('detectHtmlTechnologies extracts detected signatures with evidence', () => {
  const sampleHtml = `
    <html>
      <head>
        <script src="/_next/static/chunks/main.js"></script>
        <script src="https://js.stripe.com/v3/"></script>
        <script type="application/ld+json">{}</script>
      </head>
      <body class="flex bg-slate-50 px-4"></body>
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
  assert.ok(techs.every((t) => t.confidence === 'detected'));
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
