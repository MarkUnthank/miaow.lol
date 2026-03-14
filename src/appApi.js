export const APP_API_NAME = 'miaowApp';

export function getAppApi(targetWindow) {
  return targetWindow?.[APP_API_NAME] ?? null;
}

export function getFullscreenApi(targetWindow) {
  return getAppApi(targetWindow)?.fullscreen ?? null;
}
