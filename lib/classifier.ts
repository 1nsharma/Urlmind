import type { TechItem, UrlCategory } from './types';

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  domain?: string;
  error?: string;
}

const DISALLOWED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
]);

export function normalizeAndValidateUrl(rawInput: string): UrlValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Enter a public URL to analyze (e.g., https://stripe.com or github.com/vercel/ai).',
    };
  }

  if (/^(javascript|data|file|vbscript):/i.test(trimmed)) {
    return {
      valid: false,
      error: 'Unsupported URL scheme. Only public http:// and https:// URLs are supported.',
    };
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return {
      valid: false,
      error: 'That does not look like a valid URL. Check the domain and try again.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Only http:// and https:// URLs are supported.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    !hostname.includes('.') ||
    DISALLOWED_HOSTNAMES.has(hostname) ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.')
  ) {
    return {
      valid: false,
      error: 'Enter a valid public internet domain (e.g., nextjs.org or github.com/vercel/ai).',
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    domain: hostname.replace(/^www\./, ''),
  };
}

export function classifyUrl(urlInput: string): UrlCategory {
  const lower = urlInput.toLowerCase();
  let parsed: URL | null = null;
  try {
    parsed = new URL(/^https?:\/\//i.test(urlInput) ? urlInput : `https://${urlInput}`);
  } catch {
    return 'website';
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  // 1. Video & Media platforms
  if (
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtu.be'
  ) {
    return 'media';
  }

  // 2. Social media platforms
  if (
    host === 'x.com' ||
    host === 'www.x.com' ||
    host === 'twitter.com' ||
    host === 'www.twitter.com' ||
    host === 'instagram.com' ||
    host === 'www.instagram.com' ||
    host === 'instagr.am' ||
    host === 'linkedin.com' ||
    host === 'www.linkedin.com'
  ) {
    return 'social';
  }

  // 3. GitHub / GitLab code repositories
  if (
    host === 'github.com' ||
    host === 'www.github.com' ||
    host === 'gitlab.com' ||
    host === 'www.gitlab.com'
  ) {
    return 'github';
  }

  // 4. API specifications & developer portals
  if (
    lower.includes('swagger') ||
    lower.includes('openapi') ||
    lower.includes('graphql') ||
    lower.includes('postman') ||
    lower.includes('redoc') ||
    path.includes('/api-docs') ||
    path.includes('/api-reference') ||
    host.startsWith('api.')
  ) {
    return 'api';
  }

  // 5. Documentation & knowledge portals
  if (
    host.startsWith('docs.') ||
    host.startsWith('developer.') ||
    host.startsWith('developers.') ||
    host.includes('readthedocs') ||
    host.includes('gitbook') ||
    path.startsWith('/docs') ||
    path.includes('/documentation') ||
    path.startsWith('/guide') ||
    path.startsWith('/reference')
  ) {
    return 'docs';
  }

  // 6. Articles, research papers, essays
  if (
    host.includes('arxiv.org') ||
    host.includes('medium.com') ||
    host.includes('substack.com') ||
    host.includes('wikipedia.org') ||
    host.includes('dev.to') ||
    path.includes('/blog/') ||
    path.includes('/article/') ||
    path.includes('/posts/') ||
    path.includes('/research/')
  ) {
    return 'article';
  }

  // 7. Interactive web apps / SaaS consoles
  if (
    host.startsWith('app.') ||
    host.startsWith('studio.') ||
    host.startsWith('console.') ||
    host.startsWith('dashboard.') ||
    host.includes('figma.com') ||
    host.includes('linear.app') ||
    host.includes('notion.so')
  ) {
    return 'webapp';
  }

  return 'website';
}

export function getCategoryLabel(category: UrlCategory): string {
  switch (category) {
    case 'website':
      return 'Website Architecture';
    case 'webapp':
      return 'Web Application Map';
    case 'api':
      return 'API Architecture';
    case 'docs':
      return 'Documentation Graph';
    case 'github':
      return 'Codebase Architecture';
    case 'article':
      return 'Knowledge Graph';
    case 'social':
      return 'Social & Thread Map';
    case 'media':
      return 'Video & Media Graph';
  }
}

export function detectHtmlTechnologies(
  html: string,
  headers: Record<string, string>,
): TechItem[] {
  const found = new Map<string, TechItem>();
  const lowerHtml = html.toLowerCase();

  const add = (item: TechItem) => {
    if (!found.has(item.name)) {
      found.set(item.name, item);
    }
  };

  // HTTP Headers
  const server = (headers['server'] || '').toLowerCase();
  const poweredBy = (headers['x-powered-by'] || '').toLowerCase();
  const cfRay = headers['cf-ray'];
  const vercelId = headers['x-vercel-id'];

  if (cfRay || server.includes('cloudflare')) {
    add({
      name: 'Cloudflare',
      category: 'Infrastructure',
      confidence: 'detected',
      evidence: cfRay ? 'Response header: cf-ray present' : 'Response header: server=cloudflare',
    });
  }
  if (vercelId || server.includes('vercel')) {
    add({
      name: 'Vercel Edge Network',
      category: 'Infrastructure',
      confidence: 'detected',
      evidence: vercelId ? 'Response header: x-vercel-id present' : 'Response header: server=Vercel',
    });
  }
  if (poweredBy.includes('next.js') || lowerHtml.includes('/_next/static') || lowerHtml.includes('__next_data__')) {
    add({
      name: 'Next.js',
      category: 'Framework',
      confidence: 'detected',
      evidence: lowerHtml.includes('/_next/static')
        ? 'HTML asset path: /_next/static bundle references'
        : 'Response header: x-powered-by Next.js',
    });
  }
  if (lowerHtml.includes('data-reactroot') || lowerHtml.includes('__react') || lowerHtml.includes('react-dom')) {
    add({
      name: 'React',
      category: 'Framework',
      confidence: 'detected',
      evidence: 'DOM / script signature for React runtime',
    });
  }
  if (lowerHtml.includes('/_nuxt/') || lowerHtml.includes('__nuxt')) {
    add({
      name: 'Nuxt / Vue',
      category: 'Framework',
      confidence: 'detected',
      evidence: 'HTML reference to /_nuxt/ or __NUXT__ payload',
    });
  }
  if (lowerHtml.includes('ng-version')) {
    add({
      name: 'Angular',
      category: 'Framework',
      confidence: 'detected',
      evidence: 'DOM attribute: ng-version detected',
    });
  }
  if (lowerHtml.includes('astro-island') || lowerHtml.includes('/_astro/')) {
    add({
      name: 'Astro',
      category: 'Framework',
      confidence: 'detected',
      evidence: 'HTML markup: astro-island or /_astro/ chunks',
    });
  }
  if (lowerHtml.includes('svelte')) {
    add({
      name: 'Svelte',
      category: 'Framework',
      confidence: 'detected',
      evidence: 'Script or class signature referencing Svelte',
    });
  }
  if (lowerHtml.includes('tailwindcss') || /class="[^"]*\b(flex|grid|px-\d|py-\d|bg-slate-)/.test(lowerHtml)) {
    add({
      name: 'Tailwind CSS',
      category: 'Styling',
      confidence: 'detected',
      evidence: 'Utility class patterns or Tailwind stylesheet reference in HTML',
    });
  }
  if (lowerHtml.includes('googletagmanager.com') || lowerHtml.includes('gtag(')) {
    add({
      name: 'Google Tag Manager / Analytics',
      category: 'Analytics',
      confidence: 'detected',
      evidence: 'Script reference to googletagmanager.com / gtag',
    });
  }
  if (lowerHtml.includes('segment.com') || lowerHtml.includes('analytics.js')) {
    add({
      name: 'Segment',
      category: 'Analytics',
      confidence: 'detected',
      evidence: 'Analytics script reference detected in page source',
    });
  }
  if (lowerHtml.includes('js.stripe.com')) {
    add({
      name: 'Stripe.js',
      category: 'API / Protocol',
      confidence: 'detected',
      evidence: 'Script reference to js.stripe.com',
    });
  }
  if (lowerHtml.includes('wp-content') || lowerHtml.includes('wordpress')) {
    add({
      name: 'WordPress',
      category: 'Framework',
      confidence: 'detected',
      evidence: 'Asset paths referencing /wp-content/',
    });
  }
  if (lowerHtml.includes('application/ld+json')) {
    add({
      name: 'Schema.org JSON-LD',
      category: 'API / Protocol',
      confidence: 'detected',
      evidence: 'Embedded <script type="application/ld+json"> structured metadata',
    });
  }
  if (lowerHtml.includes('swagger-ui') || lowerHtml.includes('openapi')) {
    add({
      name: 'OpenAPI / Swagger',
      category: 'API / Protocol',
      confidence: 'detected',
      evidence: 'OpenAPI / Swagger UI assets detected in HTML',
    });
  }

  // UI & Icons
  if (lowerHtml.includes('data-radix-') || lowerHtml.includes('radix-ui')) {
    add({
      name: 'Radix UI',
      category: 'UI & Icons',
      confidence: 'detected',
      evidence: 'DOM attributes matching Radix UI primitives (data-radix-*)',
    });
  }
  if (lowerHtml.includes('class="lucide') || lowerHtml.includes('lucide-react')) {
    add({
      name: 'Lucide Icons',
      category: 'UI & Icons',
      confidence: 'detected',
      evidence: 'Lucide SVG icon class signatures detected in DOM',
    });
  }
  if (lowerHtml.includes('data-slot=') && (lowerHtml.includes('data-radix-') || found.has('Tailwind CSS'))) {
    add({
      name: 'shadcn/ui',
      category: 'UI & Icons',
      confidence: 'detected',
      evidence: 'Component slot attributes (data-slot) paired with Tailwind/Radix patterns',
    });
  }

  // Graphics & Visualization
  if (lowerHtml.includes('mermaid') || lowerHtml.includes('data-processed="true"')) {
    add({
      name: 'Mermaid.js',
      category: 'Graphics / Visualization',
      confidence: 'detected',
      evidence: 'Mermaid diagram container or script bundle detected in HTML',
    });
  }

  // Bundlers & Additional Frameworks
  if (lowerHtml.includes('__turbopack_') || lowerHtml.includes('turbopack')) {
    add({
      name: 'Turbopack',
      category: 'Bundler & Build',
      confidence: 'detected',
      evidence: 'Turbopack runtime chunk signature detected in page scripts',
    });
  }
  if (lowerHtml.includes('/@vite/client') || lowerHtml.includes('vite/preload-helper')) {
    add({
      name: 'Vite',
      category: 'Bundler & Build',
      confidence: 'detected',
      evidence: 'Vite client/preload module signature detected in HTML',
    });
  }
  if (lowerHtml.includes('__remixcontext') || lowerHtml.includes('__remixmanifest')) {
    add({
      name: 'Remix',
      category: 'Framework',
      confidence: 'detected',
      evidence: 'Remix runtime context payload (__remixContext) detected',
    });
  }
  if (lowerHtml.includes('__sveltekit_')) {
    add({
      name: 'SvelteKit',
      category: 'Framework',
      confidence: 'detected',
      evidence: 'SvelteKit hydration runtime (__sveltekit_) detected',
    });
  }

  // Analytics
  if (
    lowerHtml.includes('posthog.init') ||
    lowerHtml.includes('us.i.posthog.com') ||
    lowerHtml.includes('app.posthog.com') ||
    lowerHtml.includes('://posthog.com') ||
    lowerHtml.includes('posthog-js')
  ) {
    add({
      name: 'PostHog',
      category: 'Analytics',
      confidence: 'detected',
      evidence: 'PostHog analytics script or ingestion endpoint detected',
    });
  }
  if (lowerHtml.includes('plausible.io/js')) {
    add({
      name: 'Plausible Analytics',
      category: 'Analytics',
      confidence: 'detected',
      evidence: 'Script reference to plausible.io/js',
    });
  }
  if (lowerHtml.includes('mixpanel') || lowerHtml.includes('cdn.mxpnl.com')) {
    add({
      name: 'Mixpanel',
      category: 'Analytics',
      confidence: 'detected',
      evidence: 'Mixpanel SDK or tracking endpoint signature detected',
    });
  }
  if (lowerHtml.includes('static.hotjar.com') || lowerHtml.includes('hotjar.com/c/hotjar-')) {
    add({
      name: 'Hotjar',
      category: 'Analytics',
      confidence: 'detected',
      evidence: 'Hotjar tracking snippet detected in page source',
    });
  }
  if (lowerHtml.includes('_vercel/insights') || lowerHtml.includes('va.vercel-scripts.com')) {
    add({
      name: 'Vercel Analytics',
      category: 'Analytics',
      confidence: 'detected',
      evidence: 'Vercel Web Analytics script path detected',
    });
  }

  // SEO / Metadata & Performance
  if (
    lowerHtml.includes('property="og:title"') ||
    lowerHtml.includes("property='og:title'") ||
    lowerHtml.includes('property="og:image"')
  ) {
    add({
      name: 'Open Graph Protocol',
      category: 'SEO / Metadata',
      confidence: 'detected',
      evidence: 'Open Graph <meta property="og:*"> tags present in <head>',
    });
  }
  if (lowerHtml.includes('name="twitter:card"') || lowerHtml.includes("name='twitter:card'")) {
    add({
      name: 'Twitter Cards',
      category: 'SEO / Metadata',
      confidence: 'detected',
      evidence: 'Twitter Card <meta name="twitter:card"> metadata detected',
    });
  }
  if (lowerHtml.includes('rel="canonical"') || lowerHtml.includes("rel='canonical'")) {
    add({
      name: 'Canonical URL Tag',
      category: 'SEO / Metadata',
      confidence: 'detected',
      evidence: '<link rel="canonical"> SEO tag present in document head',
    });
  }
  if (lowerHtml.includes('fetchpriority=')) {
    add({
      name: 'Priority Hints',
      category: 'Performance',
      confidence: 'detected',
      evidence: 'Resource fetchpriority attribute detected on media or script tags',
    });
  }

  return Array.from(found.values());
}

const STATIC_PREFIX_EXCLUSIONS = new Set([
  'api',
  'out',
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
  'apple-touch-icon.png',
]);

export function reconstructTargetUrlFromSegments(
  segments: string[],
  query: Record<string, string | string[] | undefined> = {},
): string | null {
  if (!segments || segments.length === 0) return null;

  const first = decodeURIComponent(segments[0]).trim().toLowerCase();
  if (!first || STATIC_PREFIX_EXCLUSIONS.has(first)) {
    return null;
  }

  // Avoid catching direct static asset files like /logo.png when not a domain/URL
  if (
    segments.length === 1 &&
    /\.(ico|png|jpg|jpeg|svg|webp|css|js|map|woff2?|ttf|txt)$/i.test(first)
  ) {
    return null;
  }

  let targetUrl = segments
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join('/');

  // Fix browser collapsing "https://" into "https:/"
  targetUrl = targetUrl.replace(/^(https?):\/([^/])/i, '$1://$2');

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  const queryEntries = Object.entries(query);
  if (queryEntries.length > 0) {
    const search = new URLSearchParams();
    for (const [key, val] of queryEntries) {
      if (typeof val === 'string') search.append(key, val);
      else if (Array.isArray(val)) val.forEach((v) => search.append(key, v));
    }
    const qs = search.toString();
    if (qs) {
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + qs;
    }
  }

  return targetUrl;
}
