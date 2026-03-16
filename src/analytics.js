const GA_SCRIPT_SELECTOR = 'script[data-miaow-analytics="ga4"]';

let initializedMeasurementId = null;

function getMeasurementId() {
  const measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID;

  return typeof measurementId === 'string' ? measurementId.trim() : '';
}

function isBrowserEnvironment() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function ensureDataLayer() {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };
}

function ensureAnalyticsScript(measurementId) {
  if (document.querySelector(GA_SCRIPT_SELECTOR)) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.dataset.miaowAnalytics = 'ga4';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);
}

function trackEvent(name, params = {}) {
  if (!initializedMeasurementId || typeof window.gtag !== 'function') {
    return false;
  }

  window.gtag('event', name, params);
  return true;
}

export function initializeAnalytics() {
  const measurementId = getMeasurementId();

  if (!measurementId || !isBrowserEnvironment()) {
    return false;
  }

  if (initializedMeasurementId === measurementId) {
    return true;
  }

  ensureDataLayer();
  ensureAnalyticsScript(measurementId);

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
  });

  initializedMeasurementId = measurementId;
  return true;
}

export function trackPageView({ experienceId = undefined, pageLocation, pagePath, pageTitle } = {}) {
  return trackEvent('page_view', {
    page_location: pageLocation ?? window.location.href,
    page_path: pagePath ?? `${window.location.pathname}${window.location.search}${window.location.hash}`,
    page_title: pageTitle ?? document.title,
    ...(experienceId ? { experience_id: experienceId } : {}),
  });
}

export function trackExperienceView(experienceId) {
  if (!experienceId) {
    return false;
  }

  return trackEvent('view_experience', {
    experience_id: experienceId,
  });
}

export function trackShareExperience({ experienceId, shareMethod }) {
  if (!experienceId || !shareMethod) {
    return false;
  }

  return trackEvent('share_experience', {
    experience_id: experienceId,
    share_method: shareMethod,
  });
}
