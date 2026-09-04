import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "landscape-theme";
export const ACCENT_STORAGE_KEY = "landscape-accent";
export const BASE_STORAGE_KEY = "landscape-base";
export const FONT_STORAGE_KEY = "landscape-font";
export const RADIUS_STORAGE_KEY = "landscape-radius";
export const FORM_RADIUS_STORAGE_KEY = "landscape-form-radius";

export type ThemePreference = "system" | "light" | "dark";
export type RadiusMode =
  "none" | "extra-small" | "small" | "medium" | "large" | "full";
export type FontMode = "inter" | "system" | "serif" | "mono";

const themes: ThemePreference[] = ["system", "light", "dark"];
export const radii: RadiusMode[] = [
  "none",
  "extra-small",
  "small",
  "medium",
  "large",
  "full",
];
export const fonts: FontMode[] = ["inter", "system", "serif", "mono"];
const radiusValues: Record<RadiusMode, string> = {
  none: "0px",
  "extra-small": "0.25rem",
  small: "0.375rem",
  medium: "0.5rem",
  large: "0.75rem",
  full: "9999px",
};
const fontValues: Record<FontMode, string> = {
  inter:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  system:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

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

function readChoice<T extends string>(key: string, choices: T[], fallback: T) {
  const value = localStorage.getItem(key) as T | null;
  return value && choices.includes(value) ? value : fallback;
}

function readRadius(key: string) {
  const legacy: Record<string, RadiusMode> = {
    sharp: "extra-small",
    default: "medium",
    rounded: "large",
  };
  const value = localStorage.getItem(key);
  return legacy[value ?? ""] ?? readChoice(key, radii, "extra-small");
}

function readBase() {
  const value = Number(localStorage.getItem(BASE_STORAGE_KEY));
  return Number.isFinite(value) && value >= 0 && value <= 0.05 ? value : 0.01;
}

function readAccent() {
  const value = Number(localStorage.getItem(ACCENT_STORAGE_KEY));
  return Number.isFinite(value) && value >= 0 && value <= 360 ? value : 273.85;
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
  const [accent, setAccent] = useState(readAccent);
  const [base, setBase] = useState(readBase);
  const [font, setFont] = useState(() =>
    readChoice(FONT_STORAGE_KEY, fonts, "inter"),
  );
  const [radius, setRadius] = useState(() => readRadius(RADIUS_STORAGE_KEY));
  const [formRadius, setFormRadius] = useState(() =>
    readRadius(FORM_RADIUS_STORAGE_KEY),
  );

  useEffect(() => {
    const syncStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) setTheme(readTheme());
      if (event.key === ACCENT_STORAGE_KEY) setAccent(readAccent());
      if (event.key === BASE_STORAGE_KEY) setBase(readBase());
      if (event.key === FONT_STORAGE_KEY)
        setFont(readChoice(FONT_STORAGE_KEY, fonts, "inter"));
      if (event.key === RADIUS_STORAGE_KEY)
        setRadius(readRadius(RADIUS_STORAGE_KEY));
      if (event.key === FORM_RADIUS_STORAGE_KEY)
        setFormRadius(readRadius(FORM_RADIUS_STORAGE_KEY));
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
    localStorage.setItem(ACCENT_STORAGE_KEY, String(accent));
    const root = document.documentElement;
    const color = `oklch(57.74% 0.2091 ${accent})`;
    root.style.setProperty("--accent", color);
    root.style.setProperty("--accent-foreground", "#ffffff");
    root.style.setProperty("--focus", color);
    root.style.setProperty("--link", color);
  }, [accent]);

  useEffect(() => {
    localStorage.setItem(BASE_STORAGE_KEY, String(base));
    document.documentElement.style.setProperty(
      "--theme-base-chroma",
      String(base),
    );
  }, [base]);

  useEffect(() => {
    localStorage.setItem(FONT_STORAGE_KEY, font);
    document.documentElement.style.setProperty("--font-sans", fontValues[font]);
  }, [font]);

  useEffect(() => {
    localStorage.setItem(RADIUS_STORAGE_KEY, radius);
    document.documentElement.dataset.radius = radius;
    document.documentElement.style.setProperty(
      "--radius",
      radiusValues[radius],
    );
  }, [radius]);

  useEffect(() => {
    localStorage.setItem(FORM_RADIUS_STORAGE_KEY, formRadius);
    document.documentElement.dataset.formRadius = formRadius;
    document.documentElement.style.setProperty(
      "--field-radius",
      radiusValues[formRadius],
    );
  }, [formRadius]);

  return {
    accent,
    setAccent,
    base,
    setBase,
    font,
    setFont,
    radius,
    setRadius,
    formRadius,
    setFormRadius,
    theme,
    setTheme,
  };
}
