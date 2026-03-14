import { EXPERIENCE_QUERY_PARAM, resolveUrl } from './siteConfig';

export function buildHomeUrl(locationLike) {
  const url = resolveUrl(locationLike);
  url.searchParams.delete(EXPERIENCE_QUERY_PARAM);
  url.hash = '';
  return url.toString();
}

export function buildExperienceUrl(experienceId, locationLike) {
  const url = new URL(buildHomeUrl(locationLike));

  if (experienceId) {
    url.searchParams.set(EXPERIENCE_QUERY_PARAM, experienceId);
  }

  return url.toString();
}

export function buildHistoryPath(urlLike) {
  const url = resolveUrl(urlLike);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getExperienceIndexFromLocation(experienceList, locationLike) {
  const url = resolveUrl(locationLike);
  const experienceId = url.searchParams.get(EXPERIENCE_QUERY_PARAM);

  if (!experienceId) {
    return -1;
  }

  return experienceList.findIndex((experience) => experience.id === experienceId);
}

export function buildSharePayload(experience, locationLike) {
  if (!experience) {
    return {
      text: 'Play strange little browser toys at miaow.lol.',
      title: 'miaow.lol',
      url: buildHomeUrl(locationLike),
    };
  }

  return {
    text: experience.description,
    title: `${experience.title} | miaow.lol`,
    url: buildExperienceUrl(experience.id, locationLike),
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
