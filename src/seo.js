export { SEO_DEFAULTS, buildSeoMetadata } from './siteMetadata';
import { buildStructuredData } from './siteMetadata';

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

function setStructuredData(structuredData) {
  const element = ensureHeadElement('script#miaow-structured-data', () => {
    const script = document.createElement('script');
    script.setAttribute('id', 'miaow-structured-data');
    script.setAttribute('type', 'application/ld+json');
    return script;
  });

  element.textContent = JSON.stringify(structuredData ?? buildStructuredData(null, window.location));
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
  setStructuredData(metadata.structuredData);
}
