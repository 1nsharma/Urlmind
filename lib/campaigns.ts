export function resolveCampaignDestination(
  campaign: string,
  env: Record<string, string | undefined> = process.env,
): { key: string; destination: string | null } {
  const key = campaign.toLowerCase().trim();

  const campaignTargets: Record<string, string | undefined> = {
    coffee: env.URLMIND_CAMPAIGN_COFFEE,
    agents: env.URLMIND_CAMPAIGN_AGENTS,
    'agents-world': env.URLMIND_CAMPAIGN_AGENTS,
    superintelligence: env.URLMIND_CAMPAIGN_SUPERINTELLIGENCE,
    'superintelligence-house': env.URLMIND_CAMPAIGN_SUPERINTELLIGENCE,
    study: env.URLMIND_CAMPAIGN_STUDY,
    'study-material': env.URLMIND_CAMPAIGN_STUDY,
    sponsor: env.URLMIND_CAMPAIGN_SPONSOR,
  };

  const destination = campaignTargets[key]?.trim();
  if (!destination || !/^https?:\/\//i.test(destination)) {
    return { key, destination: null };
  }

  return { key, destination };
}
