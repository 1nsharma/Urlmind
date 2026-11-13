import { NextRequest, NextResponse } from 'next/server';
import { analyzeUrlPipeline } from '@/lib/analyzer';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      url?: string;
      usePreset?: boolean;
      forceRefresh?: boolean;
    };
    if (!body?.url || typeof body.url !== 'string') {
      return NextResponse.json(
        { error: 'Please provide a URL string to analyze.' },
        { status: 400 },
      );
    }

    const report = await analyzeUrlPipeline(body.url, {
      usePreset: Boolean(body.usePreset),
      forceRefresh: Boolean(body.forceRefresh),
    });

    return NextResponse.json({ report });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unexpected error analyzing the target URL.';
    const status = message.toLowerCase().includes('valid') || message.toLowerCase().includes('enter a')
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
