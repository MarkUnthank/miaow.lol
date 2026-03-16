import { resolveUrl, EXPERIENCE_QUERY_PARAM } from './siteConfig';
import { buildShareCopy } from './shareCopy';

function trimSlashes(value) {
  return String(value ?? '').replace(/^\/+|\/+$/g, '');
}

export function buildExperiencePath(experienceId) {
  const slug = trimSlashes(experienceId);

  if (!slug) {
    return '/';
  }

  return `/${encodeURIComponent(slug)}/`;
}

export function getExperienceIdFromPathname(pathname) {
  const slug = trimSlashes(pathname);

  if (!slug || slug === 'index.html' || slug.includes('/')) {
    return null;
  }

  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function getExperienceIdFromLocation(locationLike) {
  const url = resolveUrl(locationLike);
  const pathExperienceId = getExperienceIdFromPathname(url.pathname);

  if (pathExperienceId) {
    return pathExperienceId;
  }

  return url.searchParams.get(EXPERIENCE_QUERY_PARAM);
}

export function buildHomeUrl(locationLike) {
  const url = resolveUrl(locationLike);
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function buildExperienceUrl(experienceId, locationLike) {
  const url = new URL(buildHomeUrl(locationLike));

  if (experienceId) {
    url.pathname = buildExperiencePath(experienceId);
  }

  return url.toString();
}

export function buildHistoryPath(urlLike) {
  const url = resolveUrl(urlLike);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getExperienceIndexFromLocation(experienceList, locationLike) {
  const experienceId = getExperienceIdFromLocation(locationLike);

  if (!experienceId) {
    return -1;
  }

  return experienceList.findIndex((experience) => experience.id === experienceId);
}

export function buildSharePayload(experience, locationLike, random = Math.random) {
  const shareCopy = buildShareCopy(experience, random);
  return {
    text: shareCopy.text,
    title: shareCopy.title,
    url: experience ? buildExperienceUrl(experience.id, locationLike) : buildHomeUrl(locationLike),
  };
}

export function buildShareLinks(payload) {
  const bodyCopy = `${payload.title}\n\n${payload.text}\n\n${payload.url}`;
  const shortCopy = `${payload.title}\n${payload.url}`;

  return {
    email: `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(bodyCopy)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(payload.url)}&title=${encodeURIComponent(payload.title)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.title)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shortCopy)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(payload.title)}&url=${encodeURIComponent(payload.url)}`,
  };
}

export function shouldUseNativeShare() {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }

  const hasTouchPoints = Number(navigator.maxTouchPoints) > 0;
  const hasCoarsePointer =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

  return hasTouchPoints || hasCoarsePointer;
}
