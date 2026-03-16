import { describe, expect, it, vi } from 'vitest';
import { experienceCatalog } from '../src/data/experienceCatalog';
import { buildSeoMetadata } from '../src/siteMetadata';
import worker, { buildSitemapXml, isPreviewRequest } from './index';

const baseDocument = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="home description" />
    <meta property="og:title" content="home title" />
    <meta property="og:description" content="home description" />
    <meta property="og:url" content="https://example.com/" />
    <meta name="twitter:title" content="home title" />
    <meta name="twitter:description" content="home description" />
    <link rel="canonical" href="https://example.com/" />
    <title>home title</title>
    <script id="miaow-structured-data" type="application/ld+json">{"name":"home"}</script>
  </head>
  <body></body>
</html>`;

function createAssetResponse(body, contentType = 'text/html; charset=utf-8') {
  return new Response(body, {
    headers: {
      'content-type': contentType,
    },
  });
}

describe('cloudflare worker integration', () => {
  it('redirects http requests to https before serving assets', async () => {
    const env = {
      ASSETS: {
        fetch: vi.fn(),
      },
      PUBLIC_SITE_ORIGIN: 'https://miaow.lol',
    };

    const response = await worker.fetch(
      new Request('http://miaow.lol/?experience=nap-nebula', {
        headers: {
          'x-forwarded-proto': 'http',
        },
      }),
      env,
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://miaow.lol/?experience=nap-nebula');
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it('rewrites home document metadata for a shared experience url', async () => {
    const env = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(createAssetResponse(baseDocument)),
      },
      PUBLIC_SITE_ORIGIN: 'https://miaow.lol',
    };
    const locationLike = new URL('/?experience=nap-nebula', env.PUBLIC_SITE_ORIGIN);
    const experience = experienceCatalog.find((entry) => entry.id === 'nap-nebula');
    const metadata = buildSeoMetadata(experience, locationLike);

    const response = await worker.fetch(new Request('https://preview.workers.dev/?experience=nap-nebula'), env);
    const html = await response.text();

    expect(env.ASSETS.fetch).toHaveBeenCalledTimes(1);
    expect(html).toContain(`<title>${metadata.title}</title>`);
    expect(html).toContain(metadata.description.replace(/"/g, '&quot;'));
    expect(html).toContain(`href="${metadata.url}"`);
    expect(html).toContain('"name":"Nap Nebula"');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('serves a sitemap with every toy url', () => {
    const sitemap = buildSitemapXml('https://miaow.lol');

    expect(sitemap).toContain('<loc>https://miaow.lol/</loc>');
    expect(sitemap).toContain('<loc>https://miaow.lol/?experience=cat-mash-chaos</loc>');
    expect(sitemap).toContain('<loc>https://miaow.lol/?experience=feline-flipper</loc>');
  });

  it('marks workers.dev preview requests as non-indexable', () => {
    expect(isPreviewRequest(new URL('https://miaow-lol-preview.workers.dev/'), {})).toBe(true);
    expect(isPreviewRequest(new URL('https://miaow.lol/'), { PUBLIC_SITE_ORIGIN: 'https://miaow.lol' })).toBe(false);
  });
});
