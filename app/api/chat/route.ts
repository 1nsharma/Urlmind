import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import type { ChatMessage, UrlIntelligenceReport } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      report?: UrlIntelligenceReport;
      messages?: ChatMessage[];
      question?: string;
    };

    if (!body?.report || !body?.question?.trim()) {
      return NextResponse.json(
        { error: 'Both an active intelligence report and a question are required.' },
        { status: 400 },
      );
    }

    const { report, messages = [], question } = body;
    const ai = getGeminiClient();

    const compactReportContext = {
      url: report.normalizedUrl,
      title: report.title,
      category: report.category,
      summary: report.summary,
      executiveOverview: report.executiveOverview,
      crawlMetrics: report.crawlMetrics,
      nodes: report.nodes,
      edges: report.edges,
      techStack: report.techStack,
      workflows: report.workflows,
      limitationsNote: report.limitationsNote,
    };

    const historyLines = messages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'User' : 'URLMIND'}: ${m.content}`)
      .join('\n\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `EXTRACTED INTELLIGENCE CONTEXT:\n${JSON.stringify(compactReportContext, null, 2)}\n\nRECENT CONVERSATION:\n${historyLines || '(none)'}\n\nUSER QUESTION:\n${question.trim()}`,
      config: {
        systemInstruction: `You are URLMIND's conversational analyst ("Ask This URL"). Answer the user's question strictly using the extracted intelligence report for ${report.normalizedUrl}.
Rules:
- Explicitly state when a fact is **detected** (with its evidence) versus **inferred**.
- Reference specific node labels, routes, or technologies from the report.
- If the report lacks information to answer conclusively (e.g. private database internals), clearly explain that limitation instead of guessing.
- Keep answers concise, structured with clean Markdown bullets when helpful.`,
      },
    });

    return NextResponse.json({
      answer:
        response.text ||
        'I could not generate an answer from the extracted report. Please rephrase your question.',
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to answer question.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
