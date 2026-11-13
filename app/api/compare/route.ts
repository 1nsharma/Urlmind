import { NextRequest, NextResponse } from 'next/server';
import { analyzeUrlPipeline } from '@/lib/analyzer';
import { getGeminiClient } from '@/lib/gemini';
import { computeComparisonDiff } from '@/lib/graphLayout';
import type { ComparisonResult, UrlIntelligenceReport } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      urlA?: string;
      urlB?: string;
      usePreset?: boolean;
      reportA?: UrlIntelligenceReport;
      reportB?: UrlIntelligenceReport;
    };

    if ((!body.reportA && !body.urlA?.trim()) || (!body.reportB && !body.urlB?.trim())) {
      return NextResponse.json(
        { error: 'Provide two valid URLs to compare.' },
        { status: 400 },
      );
    }

    const [reportA, reportB] = await Promise.all([
      body.reportA
        ? Promise.resolve(body.reportA)
        : analyzeUrlPipeline(body.urlA!, { usePreset: Boolean(body.usePreset) }),
      body.reportB
        ? Promise.resolve(body.reportB)
        : analyzeUrlPipeline(body.urlB!, { usePreset: Boolean(body.usePreset) }),
    ]);

    const diff = computeComparisonDiff(reportA, reportB);

    let aiSynthesis = `Comparison between ${reportA.domain} (${reportA.category}) and ${reportB.domain} (${reportB.category}): ${reportA.domain} maps ${diff.nodeCountA} nodes (${diff.detectedRatioA}% detected) while ${reportB.domain} maps ${diff.nodeCountB} nodes (${diff.detectedRatioB}% detected).`;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Compare these two URL intelligence reports concisely in 3 short paragraphs (Architectural Focus, Technology & Evidence Trade-offs, Key Distinctions):\n\nURL A: ${JSON.stringify({
          domain: reportA.domain,
          category: reportA.category,
          summary: reportA.summary,
          tech: reportA.techStack.map((t) => `${t.name} (${t.confidence})`),
          nodes: reportA.nodes.map((n) => `${n.label} [${n.layer}]`),
        })}\n\nURL B: ${JSON.stringify({
          domain: reportB.domain,
          category: reportB.category,
          summary: reportB.summary,
          tech: reportB.techStack.map((t) => `${t.name} (${t.confidence})`),
          nodes: reportB.nodes.map((n) => `${n.label} [${n.layer}]`),
        })}`,
      });
      if (response.text) {
        aiSynthesis = response.text;
      }
    } catch {
      // Deterministic structural diff remains intact even if synthesis call fails
    }

    const result: ComparisonResult = {
      reportA,
      reportB,
      diff,
      aiSynthesis,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ comparison: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to compare URLs.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
