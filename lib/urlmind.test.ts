import test from 'node:test';
import assert from 'node:assert/strict';
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

test('classifyUrl categorizes websites, GitHub repos, APIs, docs, and articles accurately', () => {
  assert.equal(classifyUrl('https://github.com/vercel/ai'), 'github');
  assert.equal(classifyUrl('https://petstore3.swagger.io'), 'api');
  assert.equal(classifyUrl('https://api.example.com/v1/openapi.json'), 'api');
  assert.equal(classifyUrl('https://nextjs.org/docs'), 'docs');
  assert.equal(classifyUrl('https://docs.stripe.com/payments'), 'docs');
  assert.equal(classifyUrl('https://arxiv.org/abs/2401.00001'), 'article');
  assert.equal(classifyUrl('https://app.linear.app/team'), 'webapp');
  assert.equal(classifyUrl('https://stripe.com'), 'website');
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

  // Ensure no two nodes share exact same coordinates
  const coords = new Set(positioned.map((p) => `${p.x}:${p.y}`));
  assert.equal(coords.size, positioned.length);
});

test('generateMermaidDiagram and generateMarkdownReport produce valid non-empty exports', () => {
  const report = findShowcasePreset('https://petstore3.swagger.io/');
  assert.ok(report);

  const mermaid = generateMermaidDiagram(report);
  assert.ok(mermaid.startsWith('flowchart LR'));
  assert.ok(mermaid.includes('Swagger UI Explorer'));

  const markdown = generateMarkdownReport(report);
  assert.ok(markdown.includes('# URLMIND Intelligence Report'));
  assert.ok(markdown.includes('## Architecture Nodes'));
  assert.ok(markdown.includes('```mermaid'));
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
