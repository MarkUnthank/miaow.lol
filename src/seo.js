import { buildExperienceUrl, buildHomeUrl } from './share';

export const SEO_DEFAULTS = {
  description:
    'Play 15 open-source cat-themed browser toys and interactive mini experiences built for the web. miaow.lol is a Really Nice project.',
  title: 'miaow.lol | Open-source cat browser toys by Really Nice',
};

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimToLength(value, maxLength = 160) {
  if (value.length <= maxLength) {
    return value;
  }

  const slice = value.slice(0, maxLength - 3);
  const trimmed = slice.replace(/[,:; ]+\S*$/, '').trimEnd();
  return `${trimmed || slice}...`;
}

function buildExperienceDescription(experience) {
  const summary = cleanText(experience?.description);

  if (!summary) {
    return SEO_DEFAULTS.description;
  }

  const punctuation = /[.!?]$/.test(summary) ? '' : '.';
  return trimToLength(`${summary}${punctuation} Part of miaow.lol, an open-source project by Really Nice.`);
}

function ensureHeadElement(selector, createElement) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = createElement();
    document.head.append(element);
  }

  return element;
}

function setMetaByName(name, content) {
  const element = ensureHeadElement(`meta[name="${name}"]`, () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', name);
    return meta;
  });

  element.setAttribute('content', content);
}

function setMetaByProperty(property, content) {
  const element = ensureHeadElement(`meta[property="${property}"]`, () => {
    const meta = document.createElement('meta');
    meta.setAttribute('property', property);
    return meta;
  });

  element.setAttribute('content', content);
}

function setCanonicalUrl(url) {
  const element = ensureHeadElement('link[rel="canonical"]', () => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    return link;
  });

  element.setAttribute('href', url);
}

export function buildSeoMetadata(experience, locationLike) {
  if (!experience) {
    return {
      description: SEO_DEFAULTS.description,
      title: SEO_DEFAULTS.title,
      url: buildHomeUrl(locationLike),
    };
  }

  return {
    description: buildExperienceDescription(experience),
    title: `${cleanText(experience.title) || 'miaow.lol'} | miaow.lol`,
    url: buildExperienceUrl(experience.id, locationLike),
  };
}

export function applySeoMetadata(metadata) {
  if (typeof document === 'undefined') {
    return;
  }

  document.title = metadata.title;
  setCanonicalUrl(metadata.url);
  setMetaByName('description', metadata.description);
  setMetaByName('twitter:card', 'summary');
  setMetaByName('twitter:title', metadata.title);
  setMetaByName('twitter:description', metadata.description);
  setMetaByProperty('og:type', 'website');
  setMetaByProperty('og:site_name', 'miaow.lol');
  setMetaByProperty('og:title', metadata.title);
  setMetaByProperty('og:description', metadata.description);
  setMetaByProperty('og:url', metadata.url);
}
