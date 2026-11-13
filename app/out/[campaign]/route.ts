import { NextRequest, NextResponse } from 'next/server';
import { resolveCampaignDestination } from '@/lib/campaigns';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaign: string }> },
) {
  const { campaign } = await params;
  const { key, destination } = resolveCampaignDestination(campaign);

  // Fallback to homepage if link is not configured yet
  if (!destination) {
    return NextResponse.redirect(new URL('/', req.url), { status: 302 });
  }

  // Log click event for analytics
  console.info(
    JSON.stringify({
      event: 'urlmind.campaign.click',
      campaign: key,
      destination,
      timestamp: new Date().toISOString(),
    }),
  );

  return NextResponse.redirect(destination, { status: 302 });
}
