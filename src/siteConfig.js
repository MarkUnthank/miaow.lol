export const SITE_NAME = 'miaow.lol';
export const SITE_ORIGIN = 'https://miaow.lol';
export const SITE_AUTHOR = 'Really Nice';
export const SITE_AUTHOR_URL = 'https://reallynice.company';
export const EXPERIENCE_QUERY_PARAM = 'experience';
export const DEFAULT_SITE_DESCRIPTION =
  '15 chaotic little browser toys for cats, children, and adults who were supposed to be doing something else.';
export const DEFAULT_SITE_TITLE = 'omg... these cat toys on miaow.lol just ate my afternoon';

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
