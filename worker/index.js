import { experienceCatalog } from '../src/data/experienceCatalog';
import { EXPERIENCE_QUERY_PARAM, SITE_ORIGIN } from '../src/siteConfig';
import { buildSeoMetadata } from '../src/siteMetadata';

const HOME_PATHS = new Set(['/', '/index.html']);
const SECURITY_HEADERS = {
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, '&apos;');
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function replaceTagContents(html, selectorPattern, value) {
  return html.replace(new RegExp(`(<${selectorPattern}[^>]*>)([\\s\\S]*?)(</[^>]+>)`, 'i'), `$1${value}$3`);
}

function replaceMetaContent(html, attributeName, attributeValue, content) {
  return html.replace(
    new RegExp(
      `(<meta\\b[^>]*\\b${attributeName}=["']${escapeForRegExp(attributeValue)}["'][^>]*\\bcontent=["'])([^"']*)(["'][^>]*>)`,
      'i',
    ),
    `$1${escapeHtml(content)}$3`,
  );
}

function replaceCanonicalHref(html, href) {
  return html.replace(/(<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["'])([^"']*)(["'][^>]*>)/i, `$1${escapeHtml(href)}$3`);
}

function replaceStructuredData(html, structuredData) {
  return html.replace(
    /(<script\b[^>]*id=["']miaow-structured-data["'][^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/i,
    `$1${escapeJsonForHtml(structuredData)}$3`,
  );
}

export function rewriteDocumentMetadata(html, metadata) {
  let nextHtml = replaceTagContents(html, 'title', escapeHtml(metadata.title));
  nextHtml = replaceMetaContent(nextHtml, 'name', 'description', metadata.description);
  nextHtml = replaceMetaContent(nextHtml, 'name', 'twitter:title', metadata.title);
  nextHtml = replaceMetaContent(nextHtml, 'name', 'twitter:description', metadata.description);
  nextHtml = replaceMetaContent(nextHtml, 'property', 'og:title', metadata.title);
  nextHtml = replaceMetaContent(nextHtml, 'property', 'og:description', metadata.description);
  nextHtml = replaceMetaContent(nextHtml, 'property', 'og:url', metadata.url);
  nextHtml = replaceCanonicalHref(nextHtml, metadata.url);
  nextHtml = replaceStructuredData(nextHtml, metadata.structuredData);
  return nextHtml;
}

function getConfiguredOrigin(env) {
  const configuredOrigin = typeof env.PUBLIC_SITE_ORIGIN === 'string' ? env.PUBLIC_SITE_ORIGIN.trim() : '';

  if (!configuredOrigin) {
    return null;
  }

  try {
    return new URL(configuredOrigin).origin;
  } catch {
    return null;
  }
}

function isPreviewHostname(hostname) {
  return hostname.endsWith('.pages.dev') || hostname.endsWith('.workers.dev');
}

export function isPreviewRequest(requestUrl, env) {
  const configuredOrigin = getConfiguredOrigin(env);

  if (isPreviewHostname(requestUrl.hostname)) {
    return true;
  }

  return configuredOrigin !== null && configuredOrigin !== requestUrl.origin;
}

export function getSiteOrigin(requestUrl, env) {
  return getConfiguredOrigin(env) ?? requestUrl.origin ?? SITE_ORIGIN;
}

function createLocationLike(requestUrl, siteOrigin) {
  return new URL(`${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`, siteOrigin);
}

function findExperienceFromRequest(requestUrl) {
  const experienceId = requestUrl.searchParams.get(EXPERIENCE_QUERY_PARAM);

  if (!experienceId) {
    return null;
  }

  return experienceCatalog.find((experience) => experience.id === experienceId) ?? null;
}

function applyHeaders(response, extraHeaders = {}) {
  const headers = new Headers(response.headers);

  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    headers.set(name, value);
  });
  Object.entries(extraHeaders).forEach(([name, value]) => {
    if (value) {
      headers.set(name, value);
    }
  });

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function buildRobotsText(siteOrigin, preview) {
  if (preview) {
    return 'User-agent: *\nDisallow: /\n';
  }

  return `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`;
}

export function buildSitemapXml(siteOrigin) {
  const urls = [
    `${siteOrigin}/`,
    ...experienceCatalog.map((experience) => `${siteOrigin}/?${EXPERIENCE_QUERY_PARAM}=${encodeURIComponent(experience.id)}`),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
    '</urlset>',
  ].join('\n');
}

async function handleHtmlRequest(request, env) {
  const assetResponse = await env.ASSETS.fetch(request);
  const contentType = assetResponse.headers.get('content-type') ?? '';

  if (!contentType.includes('text/html')) {
    return applyHeaders(assetResponse);
  }

  const requestUrl = new URL(request.url);
  const siteOrigin = getSiteOrigin(requestUrl, env);
  const locationLike = createLocationLike(requestUrl, siteOrigin);
  const experience = findExperienceFromRequest(requestUrl);
  const metadata = buildSeoMetadata(experience, locationLike);
  const rewrittenHtml = rewriteDocumentMetadata(await assetResponse.text(), metadata);
  const previewHeaders = isPreviewRequest(requestUrl, env) ? { 'X-Robots-Tag': 'noindex, nofollow' } : {};

  return applyHeaders(
    new Response(rewrittenHtml, {
      headers: assetResponse.headers,
      status: assetResponse.status,
      statusText: assetResponse.statusText,
    }),
    previewHeaders,
  );
}

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    const siteOrigin = getSiteOrigin(requestUrl, env);
    const preview = isPreviewRequest(requestUrl, env);

    if (requestUrl.pathname === '/robots.txt') {
      return applyHeaders(
        new Response(buildRobotsText(siteOrigin, preview), {
          headers: {
            'Cache-Control': 'public, max-age=3600',
            'Content-Type': 'text/plain; charset=utf-8',
          },
        }),
        preview ? { 'X-Robots-Tag': 'noindex, nofollow' } : {},
      );
    }

    if (requestUrl.pathname === '/sitemap.xml') {
      return applyHeaders(
        new Response(buildSitemapXml(siteOrigin), {
          headers: {
            'Cache-Control': 'public, max-age=3600',
            'Content-Type': 'application/xml; charset=utf-8',
          },
        }),
        preview ? { 'X-Robots-Tag': 'noindex, nofollow' } : {},
      );
    }

    if (HOME_PATHS.has(requestUrl.pathname)) {
      return handleHtmlRequest(request, env);
    }

    return applyHeaders(await env.ASSETS.fetch(request));
  },
};
