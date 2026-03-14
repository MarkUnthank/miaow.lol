export const SITE_NAME = 'miaow.lol';
export const SITE_ORIGIN = 'https://miaow.lol';
export const SITE_AUTHOR = 'Really Nice';
export const SITE_AUTHOR_URL = 'https://reallynice.company';
export const EXPERIENCE_QUERY_PARAM = 'experience';
export const DEFAULT_SITE_DESCRIPTION =
  'Play 15 open-source cat-themed browser toys and interactive mini experiences built for the web. miaow.lol is a Really Nice project.';
export const DEFAULT_SITE_TITLE = `${SITE_NAME} | Open-source cat browser toys by ${SITE_AUTHOR}`;

export function resolveUrl(locationLike, fallbackOrigin = SITE_ORIGIN) {
  if (locationLike instanceof URL) {
    return new URL(locationLike.toString());
  }

  if (typeof locationLike === 'string') {
    return new URL(locationLike, fallbackOrigin);
  }

  if (locationLike?.href) {
    return new URL(locationLike.href, fallbackOrigin);
  }

  return new URL(fallbackOrigin);
}
