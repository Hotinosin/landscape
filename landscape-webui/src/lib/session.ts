export const LANDSCAPE_TOKEN_KEY = "LANDSCAPE_TOKEN";
const FRONT_END_STORAGE_KEY = "front_end";

function updateFrontendPreference(patch: Record<string, unknown>) {
  try {
    const current = JSON.parse(
      localStorage.getItem(FRONT_END_STORAGE_KEY) || "{}",
    );
    localStorage.setItem(
      FRONT_END_STORAGE_KEY,
      JSON.stringify({
        ...(current && typeof current === "object" ? current : {}),
        ...patch,
      }),
    );
  } catch {
    localStorage.setItem(FRONT_END_STORAGE_KEY, JSON.stringify(patch));
  }
}

export function saveLandscapeSession(token: string, username?: string) {
  localStorage.setItem(LANDSCAPE_TOKEN_KEY, token);
  if (username) updateFrontendPreference({ username });
  syncPluginSessionCookie();
}

export function clearLandscapeSession() {
  localStorage.removeItem(LANDSCAPE_TOKEN_KEY);
  updateFrontendPreference({ username: "" });
  document.cookie =
    "LANDSCAPE_PLUGIN_TOKEN=; Path=/api/plugins; Max-Age=0; SameSite=Strict";
}

export function readLandscapeUsername() {
  try {
    const preference = JSON.parse(
      localStorage.getItem(FRONT_END_STORAGE_KEY) || "{}",
    );
    return typeof preference?.username === "string" ? preference.username : "";
  } catch {
    return "";
  }
}

export function readSidebarCollapsed() {
  try {
    const preference = JSON.parse(
      localStorage.getItem(FRONT_END_STORAGE_KEY) || "{}",
    );
    return typeof preference?.sidebar_collapsed === "boolean"
      ? preference.sidebar_collapsed
      : true;
  } catch {
    return true;
  }
}

export function saveSidebarCollapsed(collapsed: boolean) {
  updateFrontendPreference({ sidebar_collapsed: collapsed });
}

export function syncPluginSessionCookie() {
  const token = localStorage.getItem(LANDSCAPE_TOKEN_KEY);
  if (token) {
    document.cookie = `LANDSCAPE_PLUGIN_TOKEN=${token}; Path=/api/plugins; SameSite=Strict`;
  }
}
