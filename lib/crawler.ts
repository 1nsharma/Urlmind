import * as cheerio from 'cheerio';
import { extractSocialEvidence } from './adapters/social';
import { classifyUrl, detectHtmlTechnologies } from './classifier';
import type { CrawlMetrics, SocialMetadata, TechItem, UrlCategory } from './types';

export interface CrawledUrlContext {
  url: string;
  domain: string;
  category: UrlCategory;
  crawlSuccess: boolean;
  crawlError?: string;
  pageTitle: string;
  metaDescription: string;
  headings: string[];
  internalLinks: Array<{ text: string; href: string }>;
  externalLinks: Array<{ text: string; href: string }>;
  scripts: string[];
  detectedTech: TechItem[];
  textExcerpt: string;
  githubDetails?: {
    fullName: string;
    description: string;
    language: string;
    stars: number;
    topics: string[];
    rootFiles: string[];
    packageJsonSummary?: string;
    readmeExcerpt?: string;
  };
  openApiDetails?: {
    specTitle: string;
    version: string;
    endpoints: string[];
    schemas: string[];
    securitySchemes: string[];
  };
  socialDetails?: SocialMetadata;
  metrics: CrawlMetrics;
}

async function fetchWithTimeout(
  targetUrl: string,
  headers: Record<string, string> = {},
  timeoutMs = 9000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; URLMIND-Crawler/1.0; +https://urlmind.app)',
        Accept: 'text/html,application/json,text/plain;q=0.9,*/*;q=0.8',
        ...headers,
      },
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

export interface ParsedJinaMarkdown {
  title: string;
  headings: string[];
  internalLinks: Array<{ text: string; href: string }>;
  externalLinks: Array<{ text: string; href: string }>;
  textExcerpt: string;
}

export function parseJinaMarkdown(
  markdown: string,
  normalizedUrl: string,
  domain: string,
): ParsedJinaMarkdown {
  const titleMatch = markdown.match(/^Title:\s*(.+)$/im);
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  const title =
    (titleMatch?.[1] || h1Match?.[1] || domain)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`]/g, '')
      .trim() || domain;

  const headings: string[] = [];
  const headingRegex = /^#{1,3}\s+(.+)$/gm;
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingRegex.exec(markdown)) !== null) {
    const cleanHeading = headingMatch[1]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanHeading && headings.length < 30 && !headings.includes(cleanHeading)) {
      headings.push(cleanHeading);
    }
  }

  const internalLinks: Array<{ text: string; href: string }> = [];
  const externalLinks: Array<{ text: string; href: string }> = [];
  const seenHrefs = new Set<string>();
  let originHost = domain.replace(/^www\./, '');
  try {
    originHost = new URL(normalizedUrl).hostname.replace(/^www\./, '');
  } catch {
    // Keep normalized domain fallback
  }

  const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(markdown)) !== null) {
    const linkText = linkMatch[1].replace(/\s+/g, ' ').trim().slice(0, 60);
    const rawHref = linkMatch[2].trim();
    if (
      !rawHref ||
      rawHref.startsWith('#') ||
      rawHref.startsWith('javascript:') ||
      rawHref.startsWith('mailto:')
    ) {
      continue;
    }

    try {
      const resolved = new URL(rawHref, normalizedUrl);
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
        continue;
      }
      const key = resolved.pathname + resolved.search;
      const linkHost = resolved.hostname.replace(/^www\./, '');
      if (linkHost === originHost) {
        if (!seenHrefs.has(key) && internalLinks.length < 50) {
          seenHrefs.add(key);
          internalLinks.push({
            text: linkText || resolved.pathname,
            href: resolved.pathname,
          });
        }
      } else if (!seenHrefs.has(resolved.origin) && externalLinks.length < 25) {
        seenHrefs.add(resolved.origin);
        externalLinks.push({
          text: linkText || linkHost,
          href: resolved.origin,
        });
      }
    } catch {
      // Ignore malformed hrefs
    }
  }

  const contentMarker = markdown.match(/Markdown Content:\s*\n([\s\S]*)$/i);
  const bodyContent = (contentMarker ? contentMarker[1] : markdown)
    .replace(/^(Title|URL Source|Published Time):.*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 10000);

  return {
    title,
    headings,
    internalLinks,
    externalLinks,
    textExcerpt: bodyContent,
  };
}

async function fetchViaJinaReader(targetUrl: string): Promise<string | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    const headers: Record<string, string> = {
      Accept: 'text/plain',
      'X-Return-Format': 'markdown',
      'User-Agent': 'URLMIND-Crawler/1.0 (+https://urlmind.app)',
    };
    const apiKey = process.env.JINA_API_KEY?.trim();
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const res = await fetch(jinaUrl, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const md = await res.text();
    return md.trim().length > 100 ? md.slice(0, 15000) : null;
  } catch {
    return null;
  }
}

async function crawlGitHubRepo(
  url: string,
  domain: string,
): Promise<CrawledUrlContext | null> {
  const parsed = new URL(url);
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, '');
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const repoRes = await fetchWithTimeout(apiBase, {
      Accept: 'application/vnd.github+json',
    });
    if (!repoRes.ok) return null;

    const repoData = (await repoRes.json()) as {
      full_name?: string;
      description?: string;
      language?: string;
      stargazers_count?: number;
      topics?: string[];
      default_branch?: string;
    };

    const contentsRes = await fetchWithTimeout(`${apiBase}/contents`, {
      Accept: 'application/vnd.github+json',
    });
    const rootItems = contentsRes.ok
      ? ((await contentsRes.json()) as Array<{ name: string; type: string }>)
      : [];

    const rootFiles = rootItems
      .slice(0, 45)
      .map((item) => `${item.type === 'dir' ? '[dir]' : '[file]'} ${item.name}`);

    let packageJsonSummary = '';
    if (rootItems.some((i) => i.name === 'package.json')) {
      const pkgRes = await fetchWithTimeout(
        `https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch || 'main'}/package.json`,
      );
      if (pkgRes.ok) {
        const pkgText = await pkgRes.text();
        packageJsonSummary = pkgText.slice(0, 3500);
      }
    }

    let readmeExcerpt = '';
    const readmeRes = await fetchWithTimeout(`${apiBase}/readme`, {
      Accept: 'application/vnd.github.raw+json',
    });
    if (readmeRes.ok) {
      readmeExcerpt = (await readmeRes.text()).slice(0, 6000);
    }

    const detectedTech: TechItem[] = [];
    if (repoData.language) {
      detectedTech.push({
        name: repoData.language,
        category: 'Language / Runtime',
        confidence: 'detected',
        evidence: `GitHub repository primary language: ${repoData.language}`,
      });
    }
    if (packageJsonSummary) {
      detectedTech.push({
        name: 'Node.js / npm Package Manifest',
        category: 'Language / Runtime',
        confidence: 'detected',
        evidence: 'package.json present in repository root',
      });
    }
    if (rootItems.some((i) => i.name === 'Dockerfile')) {
      detectedTech.push({
        name: 'Docker',
        category: 'Infrastructure',
        confidence: 'detected',
        evidence: 'Dockerfile present in repository root',
      });
    }
    if (rootItems.some((i) => i.name === 'tsconfig.json')) {
      detectedTech.push({
        name: 'TypeScript',
        category: 'Language / Runtime',
        confidence: 'detected',
        evidence: 'tsconfig.json present in repository root',
      });
    }

    return {
      url,
      domain,
      category: 'github',
      crawlSuccess: true,
      pageTitle: repoData.full_name || `${owner}/${repo}`,
      metaDescription: repoData.description || '',
      headings: rootFiles.slice(0, 20),
      internalLinks: rootItems.slice(0, 20).map((i) => ({
        text: i.name,
        href: `/${owner}/${repo}/tree/${repoData.default_branch || 'main'}/${i.name}`,
      })),
      externalLinks: [],
      scripts: [],
      detectedTech,
      textExcerpt: `${repoData.description || ''}\n\n${readmeExcerpt}`,
      githubDetails: {
        fullName: repoData.full_name || `${owner}/${repo}`,
        description: repoData.description || '',
        language: repoData.language || 'Unknown',
        stars: repoData.stargazers_count || 0,
        topics: repoData.topics || [],
        rootFiles,
        packageJsonSummary,
        readmeExcerpt,
      },
      metrics: {
        httpStatus: 200,
        internalLinksCount: rootItems.length,
        externalLinksCount: 0,
        headingsCount: rootItems.filter((i) => i.type === 'dir').length,
        scriptsCount: 0,
        inspectedLabel: `GitHub API repo metadata, ${rootItems.length} root entries & README`,
      },
    };
  } catch {
    return null;
  }
}

export async function crawlPublicUrl(
  normalizedUrl: string,
  domain: string,
): Promise<CrawledUrlContext> {
  const category = classifyUrl(normalizedUrl);

  if (category === 'social' || category === 'media') {
    const social = await extractSocialEvidence(normalizedUrl);
    if (social) {
      const detectedTech: TechItem[] = [
        {
          name:
            social.platform === 'youtube'
              ? 'YouTube oEmbed API'
              : social.platform === 'twitter'
                ? 'X / Twitter oEmbed API'
                : social.platform === 'instagram'
                  ? 'OpenGraph / Meta oEmbed'
                  : 'OpenGraph Metadata',
          category: 'API / Protocol',
          confidence: social.accessRestricted ? 'inferred' : 'detected',
          evidence: social.accessNote || `Extracted ${social.platform} oEmbed & metadata`,
        },
      ];

      return {
        url: normalizedUrl,
        domain,
        category,
        crawlSuccess: true,
        pageTitle: social.title,
        metaDescription: social.description || '',
        headings: [social.title, social.authorName || domain].filter(Boolean),
        internalLinks: social.authorUrl
          ? [{ text: social.authorName || 'Author', href: social.authorUrl }]
          : [],
        externalLinks: [],
        scripts: [],
        detectedTech,
        textExcerpt: `${social.title}\n${social.authorName ? `Creator: ${social.authorName}\n` : ''}${social.description || ''}\n${social.accessNote || ''}`,
        socialDetails: social,
        metrics: {
          httpStatus: 200,
          internalLinksCount: social.authorUrl ? 1 : 0,
          externalLinksCount: 0,
          headingsCount: 2,
          scriptsCount: 0,
          inspectedLabel: social.accessRestricted
            ? `${social.platform} public preview (restricted scraping)`
            : `${social.platform} oEmbed & OpenGraph metadata`,
        },
      };
    }
  }

  if (category === 'github' && domain.includes('github.com')) {
    const gh = await crawlGitHubRepo(normalizedUrl, domain);
    if (gh) return gh;
  }

  try {
    const res = await fetchWithTimeout(normalizedUrl);
    const contentType = res.headers.get('content-type') || '';
    const headersObj: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headersObj[key.toLowerCase()] = value;
    });

    if (!res.ok) {
      const headerTech = detectHtmlTechnologies('', headersObj);
      const jinaMd = await fetchViaJinaReader(normalizedUrl);
      if (jinaMd) {
        const parsedMd = parseJinaMarkdown(jinaMd, normalizedUrl, domain);
        return {
          url: normalizedUrl,
          domain,
          category,
          crawlSuccess: true,
          pageTitle: parsedMd.title,
          metaDescription: '',
          headings: parsedMd.headings,
          internalLinks: parsedMd.internalLinks,
          externalLinks: parsedMd.externalLinks,
          scripts: [],
          detectedTech: headerTech,
          textExcerpt: parsedMd.textExcerpt,
          metrics: {
            httpStatus: res.status,
            internalLinksCount: parsedMd.internalLinks.length,
            externalLinksCount: parsedMd.externalLinks.length,
            headingsCount: parsedMd.headings.length,
            scriptsCount: 0,
            inspectedLabel: `Jina Reader markdown fallback after HTTP ${res.status} (${parsedMd.internalLinks.length} internal routes, ${parsedMd.headings.length} headings)`,
          },
        };
      }

      return {
        url: normalizedUrl,
        domain,
        category,
        crawlSuccess: false,
        crawlError: `HTTP ${res.status} (${res.statusText || 'Access restricted'})`,
        pageTitle: domain,
        metaDescription: '',
        headings: [],
        internalLinks: [],
        externalLinks: [],
        scripts: [],
        detectedTech: headerTech,
        textExcerpt: '',
        metrics: {
          httpStatus: res.status,
          internalLinksCount: 0,
          externalLinksCount: 0,
          headingsCount: 0,
          scriptsCount: 0,
          inspectedLabel: `HTTP ${res.status} response headers`,
        },
      };
    }

    const rawBody = await res.text();

    // Handle raw JSON OpenAPI / JSON endpoints directly
    if (contentType.includes('application/json') || normalizedUrl.endsWith('.json')) {
      try {
        const parsedJson = JSON.parse(rawBody) as {
          openapi?: string;
          swagger?: string;
          info?: { title?: string; version?: string; description?: string };
          paths?: Record<string, Record<string, unknown>>;
          components?: {
            schemas?: Record<string, unknown>;
            securitySchemes?: Record<string, unknown>;
          };
        };

        if (parsedJson.openapi || parsedJson.swagger || parsedJson.paths) {
          const endpoints = Object.entries(parsedJson.paths || {})
            .slice(0, 35)
            .flatMap(([path, methods]) =>
              Object.keys(methods || {}).map((m) => `${m.toUpperCase()} ${path}`),
            );
          const schemas = Object.keys(parsedJson.components?.schemas || {}).slice(0, 30);
          const securitySchemes = Object.keys(
            parsedJson.components?.securitySchemes || {},
          );

          return {
            url: normalizedUrl,
            domain,
            category: 'api',
            crawlSuccess: true,
            pageTitle: parsedJson.info?.title || `${domain} OpenAPI Spec`,
            metaDescription: parsedJson.info?.description || '',
            headings: endpoints.slice(0, 20),
            internalLinks: endpoints.slice(0, 20).map((ep) => ({
              text: ep,
              href: ep.split(' ')[1] || '/',
            })),
            externalLinks: [],
            scripts: [],
            detectedTech: [
              {
                name: `OpenAPI ${parsedJson.openapi || parsedJson.swagger || '3.0'}`,
                category: 'API / Protocol',
                confidence: 'detected',
                evidence: 'Machine-readable OpenAPI JSON specification',
              },
            ],
            textExcerpt: rawBody.slice(0, 8000),
            openApiDetails: {
              specTitle: parsedJson.info?.title || domain,
              version: parsedJson.info?.version || '1.0',
              endpoints,
              schemas,
              securitySchemes,
            },
            metrics: {
              httpStatus: res.status,
              internalLinksCount: endpoints.length,
              externalLinksCount: 0,
              headingsCount: schemas.length,
              scriptsCount: 0,
              inspectedLabel: `OpenAPI JSON (${endpoints.length} endpoints, ${schemas.length} schemas)`,
            },
          };
        }
      } catch {
        // Not valid OpenAPI JSON, continue as plain text/HTML
      }
    }

    const $ = cheerio.load(rawBody);
    const pageTitle =
      $('title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      domain;
    const metaDescription =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      '';

    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const txt = $(el).text().replace(/\s+/g, ' ').trim();
      if (txt && headings.length < 30 && !headings.includes(txt)) {
        headings.push(txt);
      }
    });

    const internalLinks: Array<{ text: string; href: string }> = [];
    const externalLinks: Array<{ text: string; href: string }> = [];
    const seenHrefs = new Set<string>();
    const originHost = new URL(normalizedUrl).hostname.replace(/^www\./, '');

    $('a[href]').each((_, el) => {
      const rawHref = ($(el).attr('href') || '').trim();
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) {
        return;
      }
      const linkText = $(el).text().replace(/\s+/g, ' ').trim().slice(0, 60);
      try {
        const resolved = new URL(rawHref, normalizedUrl);
        const key = resolved.pathname + resolved.search;
        const linkHost = resolved.hostname.replace(/^www\./, '');
        if (linkHost === originHost) {
          if (!seenHrefs.has(key) && internalLinks.length < 50) {
            seenHrefs.add(key);
            internalLinks.push({
              text: linkText || resolved.pathname,
              href: resolved.pathname,
            });
          }
        } else if (!seenHrefs.has(resolved.origin) && externalLinks.length < 25) {
          seenHrefs.add(resolved.origin);
          externalLinks.push({
            text: linkText || linkHost,
            href: resolved.origin,
          });
        }
      } catch {
        // Ignore malformed relative href
      }
    });

    const scripts: string[] = [];
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && scripts.length < 25) {
        scripts.push(src);
      }
    });

    const detectedTech = detectHtmlTechnologies(rawBody, headersObj);

    $('script, style, noscript, svg').remove();
    const cleanText = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000);

    // Fallback to Jina Reader for client-rendered SPAs with thin initial HTML
    if (cleanText.length < 180) {
      const jinaMd = await fetchViaJinaReader(normalizedUrl);
      if (jinaMd) {
        const parsedMd = parseJinaMarkdown(jinaMd, normalizedUrl, domain);
        const mergedHeadings = [...headings];
        for (const h of parsedMd.headings) {
          if (mergedHeadings.length >= 30) break;
          if (!mergedHeadings.includes(h)) mergedHeadings.push(h);
        }

        const mergedInternal = [...internalLinks];
        const seenInternal = new Set(internalLinks.map((l) => l.href));
        for (const link of parsedMd.internalLinks) {
          if (mergedInternal.length >= 50) break;
          if (!seenInternal.has(link.href)) {
            seenInternal.add(link.href);
            mergedInternal.push(link);
          }
        }

        const mergedExternal = [...externalLinks];
        const seenExternal = new Set(externalLinks.map((l) => l.href));
        for (const link of parsedMd.externalLinks) {
          if (mergedExternal.length >= 25) break;
          if (!seenExternal.has(link.href)) {
            seenExternal.add(link.href);
            mergedExternal.push(link);
          }
        }

        return {
          url: normalizedUrl,
          domain,
          category,
          crawlSuccess: true,
          pageTitle: pageTitle !== domain ? pageTitle : parsedMd.title,
          metaDescription,
          headings: mergedHeadings,
          internalLinks: mergedInternal,
          externalLinks: mergedExternal,
          scripts,
          detectedTech,
          textExcerpt:
            parsedMd.textExcerpt.length > cleanText.length
              ? parsedMd.textExcerpt
              : cleanText,
          metrics: {
            httpStatus: res.status,
            internalLinksCount: mergedInternal.length,
            externalLinksCount: mergedExternal.length,
            headingsCount: mergedHeadings.length,
            scriptsCount: scripts.length,
            inspectedLabel: `HTML DOM + Jina Reader SPA fallback (${mergedInternal.length} internal routes, ${scripts.length} scripts)`,
          },
        };
      }
    }

    return {
      url: normalizedUrl,
      domain,
      category,
      crawlSuccess: true,
      pageTitle,
      metaDescription,
      headings,
      internalLinks,
      externalLinks,
      scripts,
      detectedTech,
      textExcerpt: cleanText,
      metrics: {
        httpStatus: res.status,
        internalLinksCount: internalLinks.length,
        externalLinksCount: externalLinks.length,
        headingsCount: headings.length,
        scriptsCount: scripts.length,
        inspectedLabel: `HTML DOM (${internalLinks.length} internal routes, ${scripts.length} scripts)`,
      },
    };
  } catch (err) {
    const jinaMd = await fetchViaJinaReader(normalizedUrl);
    if (jinaMd) {
      const parsedMd = parseJinaMarkdown(jinaMd, normalizedUrl, domain);
      return {
        url: normalizedUrl,
        domain,
        category,
        crawlSuccess: true,
        pageTitle: parsedMd.title,
        metaDescription: '',
        headings: parsedMd.headings,
        internalLinks: parsedMd.internalLinks,
        externalLinks: parsedMd.externalLinks,
        scripts: [],
        detectedTech: [],
        textExcerpt: parsedMd.textExcerpt,
        metrics: {
          internalLinksCount: parsedMd.internalLinks.length,
          externalLinksCount: parsedMd.externalLinks.length,
          headingsCount: parsedMd.headings.length,
          scriptsCount: 0,
          inspectedLabel: `Jina Reader markdown fallback (${parsedMd.internalLinks.length} internal routes, ${parsedMd.headings.length} headings)`,
        },
      };
    }

    return {
      url: normalizedUrl,
      domain,
      category,
      crawlSuccess: false,
      crawlError:
        err instanceof Error ? err.message : 'Network error fetching target URL',
      pageTitle: domain,
      metaDescription: '',
      headings: [],
      internalLinks: [],
      externalLinks: [],
      scripts: [],
      detectedTech: [],
      textExcerpt: '',
      metrics: {
        internalLinksCount: 0,
        externalLinksCount: 0,
        headingsCount: 0,
        scriptsCount: 0,
        inspectedLabel: 'Direct HTTP crawl blocked or timed out; URL Context fallback',
      },
    };
  }
}
