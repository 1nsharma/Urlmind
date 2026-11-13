# URLMIND — Universal URL Intelligence

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Turn any public URL—website, web app, GitHub repository, OpenAPI specification, documentation portal, YouTube video, or social post—into an interactive visual architecture map, live Mermaid v11 SVG diagram, sitemap, tech stack audit, 60-second narrated explainer, and grounded Q&A report.

## Key Capabilities

- **URL Prefix Routing**: Visit `https://your-domain.com/github.com/vercel/ai` or `https://your-domain.com/https://stripe.com` to redirect directly into `/?url=...` and auto-analyze any public URL.
- **Universal URL Classification & Extraction**:
  - **Websites & Web Apps**: HTML DOM route crawling, header inspection, technology fingerprinting, sitemap generation, and automatic **Jina Reader (`r.jina.ai`)** markdown fallback for client-rendered SPAs and bot-protected pages.
  - **GitHub Repositories**: Live repository tree and package manifest analysis via the GitHub REST API.
  - **API Specs**: OpenAPI / Swagger JSON endpoint and schema extraction.
  - **YouTube & Social URLs**: Public oEmbed metadata (`youtube.com/oembed`, `publish.twitter.com/oembed`), optional `META_OEMBED_TOKEN` Instagram support, and transparent `accessRestricted` notices when platforms gate scraping.
- **Dual Diagram Engine**: Toggle between an interactive **React Flow** node-inspector canvas and a **Mermaid v11 SVG** flowchart with zoom controls, clickable source anchors, `.mmd` copy, `.svg` / `.png` download, and a structured summary of entry points, components, and connections.
- **Detected vs. Inferred Integrity**: Every architectural node and technology carries explicit evidence labeling (`Detected` vs. `Inferred`).
- **Shared Server-Side Caching**: Normalized Memory + Disk LRU cache under `.cache/urlmind/` (strips tracking parameters like `utm_*`, `igsh`, `si`, `s`, `t`) with a `Refresh Live` / `Bypass server cache` option.

## Self-Hosting with Docker

```bash
docker build -t urlmind .
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your_gemini_api_key \
  -e CACHE_TTL_HOURS=24 \
  urlmind
```

## Local Development

```bash
npm install
cp .env.example .env.local
# Set GEMINI_API_KEY in .env.local
npm run dev
```

## Environment Variables (Server-Only)

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Google Gemini API key used strictly by server-side `/api/*` routes. |
| `META_OEMBED_TOKEN` | No | Optional Meta App token (`AppID\|AppSecret`) for Instagram Graph oEmbed. |
| `JINA_API_KEY` | No | Optional Jina Reader Bearer token for higher-rate `r.jina.ai` markdown fallback. |
| `CACHE_TTL_HOURS` | No | Persistent server cache TTL in hours (default `24`). |
| `URLMIND_CAMPAIGN_*` | No | Custom redirect destinations for `/out/[campaign]` support & ecosystem links. |

## License

MIT © 2026 [1nsharma](./LICENSE)
