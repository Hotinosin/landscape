import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "landscape-theme";
export const RADIUS_STORAGE_KEY = "landscape-radius";

export type ThemePreference = "system" | "light" | "dark";
export type RadiusMode = "sharp" | "default" | "rounded";

const themes: ThemePreference[] = ["system", "light", "dark"];
const radii: RadiusMode[] = ["sharp", "default", "rounded"];

function readTheme(): ThemePreference {
  const cached = localStorage.getItem(THEME_STORAGE_KEY);
  if (!cached) return "system";
  try {
    const parsed = JSON.parse(cached) as {
      version?: number;
      preference?: string;
    };
    return parsed.version === 2 &&
      themes.includes(parsed.preference as ThemePreference)
      ? (parsed.preference as ThemePreference)
      : "system";
  } catch {
    return themes.includes(cached as ThemePreference)
      ? (cached as ThemePreference)
      : "system";
  }
}

function readChoice<T extends string>(
  key: string,
  choices: T[],
  fallback: T,
): T {
  const value = localStorage.getItem(key) as T | null;
  return value && choices.includes(value) ? value : fallback;
}

function applyTheme(preference: ThemePreference) {
  const resolved =
    preference === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.classList.toggle("light", resolved === "light");
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function useThemePreferences() {
  const [theme, setTheme] = useState(readTheme);
  const [radius, setRadius] = useState(() =>
    readChoice(RADIUS_STORAGE_KEY, radii, "default"),
  );

  useEffect(() => {
    const syncStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) setTheme(readTheme());
      if (event.key === RADIUS_STORAGE_KEY) {
        setRadius(readChoice(RADIUS_STORAGE_KEY, radii, "default"));
      }
    };
    addEventListener("storage", syncStorage);
    return () => removeEventListener("storage", syncStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ version: 2, preference: theme }),
    );
    applyTheme(theme);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => theme === "system" && applyTheme(theme);
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(RADIUS_STORAGE_KEY, radius);
    document.documentElement.dataset.radius = radius;
  }, [radius]);

  return { theme, setTheme, radius, setRadius };
}
