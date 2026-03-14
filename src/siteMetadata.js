import { buildExperienceUrl, buildHomeUrl } from './share';
import { DEFAULT_SITE_DESCRIPTION, DEFAULT_SITE_TITLE, SITE_AUTHOR, SITE_AUTHOR_URL, SITE_NAME } from './siteConfig';

export const SEO_DEFAULTS = {
  description: DEFAULT_SITE_DESCRIPTION,
  title: DEFAULT_SITE_TITLE,
};

export function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function trimToLength(value, maxLength = 160) {
  if (value.length <= maxLength) {
    return value;
  }

  const slice = value.slice(0, maxLength - 3);
  const trimmed = slice.replace(/[,:; ]+\S*$/, '').trimEnd();
  return `${trimmed || slice}...`;
}

export function buildExperienceDescription(experience) {
  const summary = cleanText(experience?.description);

  if (!summary) {
    return SEO_DEFAULTS.description;
  }

  const punctuation = /[.!?]$/.test(summary) ? '' : '.';
  return trimToLength(`${summary}${punctuation} Part of ${SITE_NAME}, an open-source project by ${SITE_AUTHOR}.`);
}

function buildCollectionStructuredData(locationLike) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    creator: {
      '@type': 'Organization',
      name: SITE_AUTHOR,
      url: SITE_AUTHOR_URL,
    },
    description: 'Play 15 open-source cat-themed browser toys and interactive mini experiences built for the web.',
    isAccessibleForFree: true,
    name: SITE_NAME,
    url: buildHomeUrl(locationLike),
  };
}

function buildExperienceStructuredData(experience, locationLike) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    about: 'browser toy',
    creator: {
      '@type': 'Organization',
      name: SITE_AUTHOR,
      url: SITE_AUTHOR_URL,
    },
    description: buildExperienceDescription(experience),
    isAccessibleForFree: true,
    isPartOf: {
      '@type': 'CollectionPage',
      name: SITE_NAME,
      url: buildHomeUrl(locationLike),
    },
    keywords: Array.isArray(experience?.tags) ? experience.tags.join(', ') : undefined,
    name: cleanText(experience.title) || SITE_NAME,
    url: buildExperienceUrl(experience.id, locationLike),
  };
}

export function buildStructuredData(experience, locationLike) {
  return experience ? buildExperienceStructuredData(experience, locationLike) : buildCollectionStructuredData(locationLike);
}

export function buildSeoMetadata(experience, locationLike) {
  if (!experience) {
    return {
      description: SEO_DEFAULTS.description,
      structuredData: buildStructuredData(null, locationLike),
      title: SEO_DEFAULTS.title,
      url: buildHomeUrl(locationLike),
    };
  }

  return {
    description: buildExperienceDescription(experience),
    structuredData: buildStructuredData(experience, locationLike),
    title: `${cleanText(experience.title) || SITE_NAME} | ${SITE_NAME}`,
    url: buildExperienceUrl(experience.id, locationLike),
  };
}
