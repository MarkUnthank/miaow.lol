# miaow.lol

miaow.lol is a pile of cat browser toys for the web. Some are noisy, some are soft, some are just weird little interaction experiments.

Play it at [miaow.lol](https://miaow.lol).

![Screenshot of the miaow.lol lobby](docs/readme-lobby.png)

This project was inspired by [tinyfingers.net](https://tinyfingers.net/).

## Running locally

```bash
npm install
npm run dev
```

Vite will print the local URL.

## Tests

```bash
npm test
```

## Analytics

Basic GA4 instrumentation is wired in, but it stays off until you provide a public measurement ID at build time.

```bash
echo 'VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX' >> .env.local
```

What gets tracked:

- `page_view` for SPA navigation.
- `view_experience` with `experience_id` so you can see which toy gets visited most.
- `share_experience` with `experience_id` and `share_method` so you can count shares and see which toy gets shared most.

In GA4 Admin, register these event-scoped custom dimensions before building reports:

- `experience_id`
- `share_method`

Security note: the GA4 measurement ID is public client-side configuration, not a secret. Do not commit analytics admin credentials, service account keys, BigQuery credentials, or any other private Google credentials to this repository.

## Cloudflare Workers

This repo deploys as a Worker with static assets behind the `ASSETS` binding. The Worker layer keeps home and shared toy URLs crawlable by injecting the right SEO and social metadata at the edge, redirects legacy `?experience=` links to canonical `/<toy-slug>/` URLs, and serves `robots.txt` plus `sitemap.xml`.

```bash
npm run cf:check
npm run cf:deploy
```

For local Worker runs, copy `.dev.vars.example` to `.dev.vars` if you want to pin canonical URLs:

```bash
cp .dev.vars.example .dev.vars
npm run build
npx wrangler dev
```

Keep Cloudflare-specific identifiers and credentials out of the repository. Do not commit account IDs, zone IDs, route patterns, API tokens, or private bindings; set those in the Cloudflare dashboard or CI instead.

GitHub Actions now handles CI and production deploys:

- Pull requests run tests, a production build, and `wrangler deploy --dry-run`.
- Pushes to `main` run the same validation, then deploy with the official Wrangler action.

Set these GitHub repository secrets before relying on automated deploys:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Set this GitHub repository variable if you want GA4 enabled in CI-built deploys:

- `VITE_GA_MEASUREMENT_ID`

## Project layout

- `src/App.jsx` holds the app shell, history handling, and the switch between the lobby and the active toy.
- `src/data/experiences.js` is the catalog of toys, including titles, descriptions, themes, and lazy imports.
- `src/data/experienceCatalog.js` is the Worker-safe toy catalog used for edge SEO and sitemap generation.
- `src/toys/` contains the toy implementations.
- `src/components/` contains the lobby, player, share UI, and supporting pieces.
- `src/share.js` builds canonical toy URLs, legacy URL parsing, and share payloads for each toy.
- `src/seo.js` updates the page title, meta description, and canonical URL.
- `worker/index.js` injects SEO/share metadata for canonical toy paths, redirects legacy `?experience=...` requests, and serves crawler-friendly text endpoints.
- `src/html/` contains preview HTML used by individual toys.
- `audio/` contains the sound assets.

## Adding a toy

1. Add the toy component in `src/toys/`.
2. Add its metadata and loader in `src/data/experiences.js`.
3. Add preview HTML in `src/html/` if the toy needs it.
4. Run `npm test`.
