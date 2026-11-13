import * as cheerio from 'cheerio';
import type { SocialMetadata, SocialPlatform } from '../types';

export function detectSocialPlatform(url: string): SocialPlatform | null {
  try {
    const host = new URL(url).hostname
      .replace(/^www\./, '')
      .replace(/^m\./, '')
      .toLowerCase();

    if (host === 'youtube.com' || host === 'youtu.be') {
      return 'youtube';
    }
    if (host === 'twitter.com' || host === 'x.com') {
      return 'twitter';
    }
    if (host === 'instagram.com' || host === 'instagr.am') {
      return 'instagram';
    }
    if (host === 'linkedin.com') {
      return 'linkedin';
    }
    return null;
  } catch {
    return null;
  }
}

async function scrapeOpenGraphTags(url: string): Promise<{
  title?: string;
  description?: string;
  image?: string;
}> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; URLMIND-Bot/2.0; +https://github.com)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(6500),
      redirect: 'follow',
    });
    if (!res.ok) return {};
    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('meta[name="twitter:title"]').attr('content')?.trim() ||
      $('title').first().text().trim() ||
      undefined;
    const description =
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[name="twitter:description"]').attr('content')?.trim() ||
      undefined;
    const image =
      $('meta[property="og:image"]').attr('content')?.trim() ||
      $('meta[name="twitter:image"]').attr('content')?.trim() ||
      undefined;

    return { title, description, image };
  } catch {
    return {};
  }
}

export async function extractSocialEvidence(
  url: string,
): Promise<SocialMetadata | null> {
  const platform = detectSocialPlatform(url);
  if (!platform) return null;

  // 1. YouTube Free Public oEmbed
  if (platform === 'youtube') {
    try {
      const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        url,
      )}&format=json`;
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = (await res.json()) as {
          title?: string;
          author_name?: string;
          author_url?: string;
          thumbnail_url?: string;
          html?: string;
        };
        const og = await scrapeOpenGraphTags(url);
        return {
          platform: 'youtube',
          title: data.title || og.title || 'YouTube Video',
          authorName: data.author_name,
          authorUrl: data.author_url,
          thumbnailUrl: data.thumbnail_url || og.image,
          embedHtml: data.html,
          description: og.description,
          accessRestricted: false,
        };
      }
    } catch {
      // Fallback to OpenGraph below
    }
  }

  // 2. X / Twitter Free Public oEmbed
  if (platform === 'twitter') {
    try {
      const endpoint = `https://publish.twitter.com/oembed?url=${encodeURIComponent(
        url,
      )}&omit_script=true`;
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = (await res.json()) as {
          author_name?: string;
          author_url?: string;
          html?: string;
        };
        let extractedText: string | undefined;
        if (data.html) {
          const $ = cheerio.load(data.html);
          extractedText = $('blockquote p').text().trim() || undefined;
        }
        return {
          platform: 'twitter',
          title: `Post by ${data.author_name || 'X User'}`,
          authorName: data.author_name,
          authorUrl: data.author_url,
          embedHtml: data.html,
          description: extractedText,
          accessRestricted: false,
        };
      }
    } catch {
      // Fallback to OpenGraph below
    }
  }

  // 3. Instagram (Optional Meta Graph oEmbed Token + OpenGraph Inspection)
  if (platform === 'instagram') {
    const metaToken = process.env.META_OEMBED_TOKEN?.trim();
    if (metaToken) {
      try {
        const endpoint = `https://graph.facebook.com/v20.0/instagram_oembed?url=${encodeURIComponent(
          url,
        )}&access_token=${encodeURIComponent(metaToken)}`;
        const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const data = (await res.json()) as {
            title?: string;
            author_name?: string;
            thumbnail_url?: string;
            html?: string;
          };
          return {
            platform: 'instagram',
            title:
              data.title ||
              `Instagram Post by ${data.author_name || 'Creator'}`,
            authorName: data.author_name,
            thumbnailUrl: data.thumbnail_url,
            embedHtml: data.html,
            accessRestricted: false,
          };
        }
      } catch {
        // Proceed to OpenGraph fallback
      }
    }
  }

  // 4. OpenGraph Fallback & Explicit Restriction Transparency
  const og = await scrapeOpenGraphTags(url);
  const isBlocked = !og.title && !og.description;

  return {
    platform,
    title: og.title || `${platform.toUpperCase()} Resource`,
    description: og.description,
    thumbnailUrl: og.image,
    accessRestricted:
      isBlocked || platform === 'instagram' || platform === 'linkedin',
    accessNote:
      platform === 'instagram' && !process.env.META_OEMBED_TOKEN
        ? 'Instagram restricts unauthenticated scraping. Public OpenGraph tags and URL topology were inspected; configure META_OEMBED_TOKEN on the server for full oEmbed metadata.'
        : platform === 'linkedin'
          ? 'LinkedIn restricts unauthenticated post scraping. Public OpenGraph preview tags and URL structure were inspected where available.'
          : isBlocked
            ? 'Platform blocked direct automated inspection. Graph structure is inferred from URL topology and public context.'
            : undefined,
  };
}
