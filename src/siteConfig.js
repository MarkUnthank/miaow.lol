export const SITE_NAME = 'miaow.lol';
export const SITE_ORIGIN = 'https://miaow.lol';
export const SITE_AUTHOR = 'Really Nice';
export const SITE_AUTHOR_URL = 'https://reallynice.company';
export const EXPERIENCE_QUERY_PARAM = 'experience';
export const DEFAULT_SITE_DESCRIPTION =
  '15 chaotic little browser toys for cats, children, and adults who were supposed to be doing something else.';
export const DEFAULT_SITE_TITLE = 'omg... these cat toys on miaow.lol just ate my afternoon';

function cleanShareLabel(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildExperienceShareTitle(experience) {
  const title = cleanShareLabel(experience?.title);

  if (!title) {
    return DEFAULT_SITE_TITLE;
  }

  return `BREAKING: I literally cannot stop using ${title} on ${SITE_NAME}`;
}

export function buildExperienceShareDescription(experience) {
  const title = cleanShareLabel(experience?.title);

  if (!title) {
    return DEFAULT_SITE_DESCRIPTION;
  }

  return `${title} is a chaotic little cat toy that starts as "just one click" and ends with you sending the link to everyone you know.`;
}

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
