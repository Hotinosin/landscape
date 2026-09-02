export const LANDSCAPE_TOKEN_KEY = "LANDSCAPE_TOKEN";

export function clearLandscapeSession() {
  localStorage.removeItem(LANDSCAPE_TOKEN_KEY);
  document.cookie =
    "LANDSCAPE_PLUGIN_TOKEN=; Path=/api/plugins; Max-Age=0; SameSite=Strict";
}

export function syncPluginSessionCookie() {
  const token = localStorage.getItem(LANDSCAPE_TOKEN_KEY);
  if (token) {
    document.cookie = `LANDSCAPE_PLUGIN_TOKEN=${token}; Path=/api/plugins; SameSite=Strict`;
  }
}
