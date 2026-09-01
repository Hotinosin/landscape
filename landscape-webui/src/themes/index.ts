import {
  darkTheme,
  type GlobalTheme,
  type GlobalThemeOverrides,
} from "naive-ui";

export const THEME_STORAGE_KEY = "landscape-theme";
export const ACCENT_STORAGE_KEY = "landscape-accent";
const THEME_CACHE_VERSION = 2;

export type ThemePreference = "system" | ThemeName;
export type ThemeName = "light" | "dark";
export type AccentColor = "blue" | "green" | "red" | "purple";

interface ThemeCache {
  version: typeof THEME_CACHE_VERSION;
  preference: ThemePreference;
}

export interface ThemeTokens {
  colorScheme: "light" | "dark";
  canvasColor: string;
  surfaceColor: string;
  surfaceOverlayColor: string;
  surfaceInteractiveColor: string;
  surfaceAlternateColor: string;
  surfaceMutedColor: string;
  surfaceSubtleColor: string;
  interactiveHoverColor: string;
  borderDefaultColor: string;
  borderSubtleColor: string;
  borderMutedColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  textMutedColor: string;
  textSubtleColor: string;
  textInverseColor: string;
  brandColor: string;
  brandHoverColor: string;
  brandActiveColor: string;
  samplingColor: string;
  samplingGlowColor: string;
  shadowColor: string;
  shadowStrongColor: string;
  statusWarningColor: string;
  statusDangerColor: string;
  statusSuccessColor: string;
  statusInfoColor: string;
  statusSuccessSurfaceColor: string;
  statusSuccessBorderColor: string;
  accentPurpleColor: string;
  tagEntryColor: string;
  tagEntrySurfaceColor: string;
  tagMatchColor: string;
  tagMatchSurfaceColor: string;
  tagUpstreamColor: string;
  tagUpstreamSurfaceColor: string;
  backdropSurfaceColor: string;
  terminalBackgroundColor: string;
  terminalHeaderColor: string;
  terminalBorderColor: string;
  terminalHandleColor: string;
  radiusControl: string;
  radiusHairline: string;
  radiusIndicator: string;
  radiusSurface: string;
  radiusPanel: string;
  radiusLarge: string;
  radiusPill: string;
  fontSizeBody: string;
  fontSizeCaption: string;
  fontSizeMicro: string;
  fontSizeDetail: string;
  fontSizeLabel: string;
  fontSizeSubtitle: string;
  fontSizeTitle: string;
  fontSizeHeading: string;
  fontSizeDisplay: string;
  fontSizeDisplayLarge: string;
  fontSizeHero: string;
  iconSizeLarge: string;
  controlHeight: string;
  space2xs: string;
  spaceXs: string;
  spaceSm: string;
  spaceMd: string;
  spacePage: string;
  spaceSection: string;
  spaceLg: string;
  spaceXl: string;
  stateEmptyMinHeight: string;
  motionFast: string;
  motionNormal: string;
}

export interface LandscapeTheme {
  name: ThemeName;
  naiveTheme: GlobalTheme | null;
  tokens: ThemeTokens;
  overrides: GlobalThemeOverrides;
}

function createTheme(
  name: ThemeName,
  naiveTheme: GlobalTheme | null,
  tokens: ThemeTokens,
): LandscapeTheme {
  return {
    name,
    naiveTheme,
    tokens,
    overrides: {
      common: {
        fontWeightStrong: "600",
        borderRadius: tokens.radiusControl,
        borderRadiusSmall: tokens.radiusControl,
        bodyColor: tokens.canvasColor,
        cardColor: tokens.surfaceColor,
        modalColor: tokens.surfaceOverlayColor,
        popoverColor: tokens.surfaceOverlayColor,
        tableColor: tokens.surfaceColor,
        actionColor: tokens.surfaceInteractiveColor,
        hoverColor: tokens.interactiveHoverColor,
        borderColor: tokens.borderDefaultColor,
        dividerColor: tokens.borderSubtleColor,
        textColorBase: tokens.textPrimaryColor,
        textColor1: tokens.textPrimaryColor,
        textColor2: tokens.textSecondaryColor,
        textColor3: tokens.textMutedColor,
        primaryColor: tokens.brandColor,
        primaryColorHover: tokens.brandHoverColor,
        primaryColorPressed: tokens.brandActiveColor,
        primaryColorSuppl: tokens.brandColor,
        warningColor: tokens.statusWarningColor,
        errorColor: tokens.statusDangerColor,
        successColor: tokens.statusSuccessColor,
        infoColor: tokens.statusInfoColor,
      },
      Empty: {
        textColor: tokens.textMutedColor,
        iconColor: tokens.textSubtleColor,
      },
      Button: {
        heightSmall: "28px",
        colorOpacitySecondary: "0.22",
        colorOpacitySecondaryHover: "0.28",
        colorOpacitySecondaryPressed: "0.34",
        colorPrimary: tokens.brandActiveColor,
        colorHoverPrimary: tokens.brandColor,
        colorPressedPrimary: tokens.brandActiveColor,
        colorFocusPrimary: tokens.brandColor,
        textColorTextPrimary: tokens.brandActiveColor,
        textColorTextHoverPrimary: tokens.brandColor,
        textColorTextPressedPrimary: tokens.brandActiveColor,
        textColorTextFocusPrimary: tokens.brandColor,
        textColorGhostPrimary: tokens.brandActiveColor,
        textColorGhostHoverPrimary: tokens.brandColor,
        textColorGhostPressedPrimary: tokens.brandActiveColor,
        textColorGhostFocusPrimary: tokens.brandColor,
        borderRadiusTiny: tokens.radiusControl,
        borderRadiusSmall: tokens.radiusControl,
        borderRadiusMedium: tokens.radiusControl,
        borderRadiusLarge: tokens.radiusControl,
      },
      Card: {
        borderRadius: tokens.radiusSurface,
      },
      Tag: {
        heightSmall: "28px",
        borderRadius: tokens.radiusControl,
      },
      Popover: {
        color: tokens.surfaceOverlayColor,
        textColor: tokens.textPrimaryColor,
      },
      Tooltip: {
        color: tokens.surfaceOverlayColor,
        textColor: tokens.textPrimaryColor,
      },
      Tabs: {
        tabBorderRadius: tokens.radiusControl,
      },
      DataTable: {
        borderColor: tokens.borderSubtleColor,
        borderColorModal: tokens.borderSubtleColor,
        borderColorPopover: tokens.borderSubtleColor,
        borderRadius: tokens.radiusSurface,
        thColor: tokens.surfaceInteractiveColor,
        thColorHover: tokens.surfaceInteractiveColor,
        thColorSorting: tokens.surfaceInteractiveColor,
        thColorModal: tokens.surfaceInteractiveColor,
        thColorHoverModal: tokens.surfaceInteractiveColor,
        thColorSortingModal: tokens.surfaceInteractiveColor,
        thColorPopover: tokens.surfaceInteractiveColor,
        thColorHoverPopover: tokens.surfaceInteractiveColor,
        thColorSortingPopover: tokens.surfaceInteractiveColor,
        tdColor: tokens.surfaceColor,
        tdColorHover: tokens.interactiveHoverColor,
        tdColorSorting: tokens.surfaceColor,
        tdColorStriped: tokens.surfaceAlternateColor,
        tdColorModal: tokens.surfaceOverlayColor,
        tdColorHoverModal: tokens.interactiveHoverColor,
        tdColorSortingModal: tokens.surfaceOverlayColor,
        tdColorStripedModal: tokens.surfaceAlternateColor,
        tdColorPopover: tokens.surfaceOverlayColor,
        tdColorHoverPopover: tokens.interactiveHoverColor,
        tdColorSortingPopover: tokens.surfaceOverlayColor,
        tdColorStripedPopover: tokens.surfaceAlternateColor,
        tdTextColor: tokens.textPrimaryColor,
        thTextColor: tokens.textPrimaryColor,
      },
    },
  };
}

export const themeRegistry: Record<ThemeName, LandscapeTheme> = {
  light: createTheme("light", null, {
    colorScheme: "light",
    canvasColor: "#f4f6f8",
    surfaceColor: "#ffffff",
    surfaceOverlayColor: "#ffffff",
    surfaceInteractiveColor: "#f7f8fa",
    surfaceAlternateColor: "#f4f6f8",
    surfaceMutedColor: "rgba(128, 128, 128, 0.10)",
    surfaceSubtleColor: "rgba(128, 128, 128, 0.06)",
    interactiveHoverColor: "rgba(0, 0, 0, 0.045)",
    borderDefaultColor: "#e2e6ea",
    borderSubtleColor: "#e6e9ed",
    borderMutedColor: "rgba(128, 128, 128, 0.18)",
    textPrimaryColor: "rgba(31, 34, 37, 1)",
    textSecondaryColor: "rgba(51, 54, 57, 1)",
    textMutedColor: "rgba(51, 54, 57, 0.62)",
    textSubtleColor: "rgba(51, 54, 57, 0.40)",
    textInverseColor: "#ffffff",
    brandColor: "#3b8ff5",
    brandHoverColor: "#62a6f8",
    brandActiveColor: "#2376d8",
    samplingColor: "#00aee8",
    samplingGlowColor: "rgba(0, 174, 232, 0.7)",
    shadowColor: "rgba(0, 0, 0, 0.15)",
    shadowStrongColor: "rgba(0, 0, 0, 0.30)",
    statusWarningColor: "#f0a020",
    statusDangerColor: "#d03050",
    statusSuccessColor: "#18a058",
    statusInfoColor: "#3b8ff5",
    statusSuccessSurfaceColor: "rgba(24, 160, 88, 0.08)",
    statusSuccessBorderColor: "rgba(24, 160, 88, 0.25)",
    accentPurpleColor: "#665cf6",
    tagEntryColor: "#087f8c",
    tagEntrySurfaceColor: "rgba(8, 127, 140, 0.14)",
    tagMatchColor: "#d97706",
    tagMatchSurfaceColor: "rgba(217, 119, 6, 0.16)",
    tagUpstreamColor: "#be185d",
    tagUpstreamSurfaceColor: "rgba(190, 24, 93, 0.14)",
    backdropSurfaceColor: "rgba(255, 255, 255, 0.72)",
    terminalBackgroundColor: "#000000",
    terminalHeaderColor: "rgb(72, 72, 78)",
    terminalBorderColor: "rgb(60, 60, 66)",
    terminalHandleColor: "rgb(120, 120, 126)",
    radiusControl: "8px",
    radiusHairline: "2px",
    radiusIndicator: "4px",
    radiusSurface: "8px",
    radiusPanel: "8px",
    radiusLarge: "8px",
    radiusPill: "999px",
    fontSizeBody: "14px",
    fontSizeCaption: "12px",
    fontSizeMicro: "10px",
    fontSizeDetail: "11px",
    fontSizeLabel: "13px",
    fontSizeSubtitle: "15px",
    fontSizeTitle: "16px",
    fontSizeHeading: "18px",
    fontSizeDisplay: "20px",
    fontSizeDisplayLarge: "26px",
    fontSizeHero: "30px",
    iconSizeLarge: "24px",
    controlHeight: "34px",
    space2xs: "4px",
    spaceXs: "6px",
    spaceSm: "8px",
    spaceMd: "10px",
    spacePage: "15px",
    spaceSection: "12px",
    spaceLg: "16px",
    spaceXl: "20px",
    stateEmptyMinHeight: "88px",
    motionFast: "120ms",
    motionNormal: "180ms",
  }),
  dark: createTheme("dark", darkTheme, {
    colorScheme: "dark",
    canvasColor: "#101014",
    surfaceColor: "#18181c",
    surfaceOverlayColor: "#2c2c32",
    surfaceInteractiveColor: "#2a2a2e",
    surfaceAlternateColor: "#202024",
    surfaceMutedColor: "rgba(255, 255, 255, 0.08)",
    surfaceSubtleColor: "rgba(255, 255, 255, 0.04)",
    interactiveHoverColor: "rgba(255, 255, 255, 0.09)",
    borderDefaultColor: "rgba(255, 255, 255, 0.14)",
    borderSubtleColor: "rgba(255, 255, 255, 0.09)",
    borderMutedColor: "rgba(255, 255, 255, 0.10)",
    textPrimaryColor: "rgba(255, 255, 255, 0.90)",
    textSecondaryColor: "rgba(255, 255, 255, 0.82)",
    textMutedColor: "rgba(255, 255, 255, 0.52)",
    textSubtleColor: "rgba(255, 255, 255, 0.38)",
    textInverseColor: "#ffffff",
    brandColor: "#78c7ee",
    brandHoverColor: "#94d4f2",
    brandActiveColor: "#5aadd8",
    samplingColor: "#00d2ff",
    samplingGlowColor: "rgba(0, 210, 255, 0.7)",
    shadowColor: "rgba(0, 0, 0, 0.30)",
    shadowStrongColor: "rgba(0, 0, 0, 0.50)",
    statusWarningColor: "#f2c97d",
    statusDangerColor: "#e88080",
    statusSuccessColor: "#63e2b7",
    statusInfoColor: "#78c7ee",
    statusSuccessSurfaceColor: "rgba(99, 226, 183, 0.08)",
    statusSuccessBorderColor: "rgba(99, 226, 183, 0.25)",
    accentPurpleColor: "#958cff",
    tagEntryColor: "#5eead4",
    tagEntrySurfaceColor: "rgba(94, 234, 212, 0.16)",
    tagMatchColor: "#fbbf24",
    tagMatchSurfaceColor: "rgba(251, 191, 36, 0.16)",
    tagUpstreamColor: "#f9a8d4",
    tagUpstreamSurfaceColor: "rgba(249, 168, 212, 0.18)",
    backdropSurfaceColor: "rgba(24, 24, 28, 0.72)",
    terminalBackgroundColor: "#000000",
    terminalHeaderColor: "rgb(72, 72, 78)",
    terminalBorderColor: "rgb(60, 60, 66)",
    terminalHandleColor: "rgb(120, 120, 126)",
    radiusControl: "8px",
    radiusHairline: "2px",
    radiusIndicator: "4px",
    radiusSurface: "8px",
    radiusPanel: "8px",
    radiusLarge: "8px",
    radiusPill: "999px",
    fontSizeBody: "14px",
    fontSizeCaption: "12px",
    fontSizeMicro: "10px",
    fontSizeDetail: "11px",
    fontSizeLabel: "13px",
    fontSizeSubtitle: "15px",
    fontSizeTitle: "16px",
    fontSizeHeading: "18px",
    fontSizeDisplay: "20px",
    fontSizeDisplayLarge: "26px",
    fontSizeHero: "30px",
    iconSizeLarge: "24px",
    controlHeight: "34px",
    space2xs: "4px",
    spaceXs: "6px",
    spaceSm: "8px",
    spaceMd: "10px",
    spacePage: "15px",
    spaceSection: "12px",
    spaceLg: "16px",
    spaceXl: "20px",
    stateEmptyMinHeight: "88px",
    motionFast: "120ms",
    motionNormal: "180ms",
  }),
};

const accentPalettes: Record<
  ThemeName,
  Record<
    AccentColor,
    Pick<
      ThemeTokens,
      | "brandColor"
      | "brandHoverColor"
      | "brandActiveColor"
      | "samplingColor"
      | "samplingGlowColor"
      | "statusInfoColor"
    >
  >
> = {
  light: {
    blue: {
      brandColor: "#3b8ff5",
      brandHoverColor: "#62a6f8",
      brandActiveColor: "#2376d8",
      samplingColor: "#00aee8",
      samplingGlowColor: "rgba(0, 174, 232, 0.7)",
      statusInfoColor: "#3b8ff5",
    },
    green: {
      brandColor: "#18a058",
      brandHoverColor: "#36ad6a",
      brandActiveColor: "#0c7a43",
      samplingColor: "#18a058",
      samplingGlowColor: "rgba(24, 160, 88, 0.7)",
      statusInfoColor: "#18a058",
    },
    red: {
      brandColor: "#d03050",
      brandHoverColor: "#de576d",
      brandActiveColor: "#ab1f3f",
      samplingColor: "#d03050",
      samplingGlowColor: "rgba(208, 48, 80, 0.7)",
      statusInfoColor: "#d03050",
    },
    purple: {
      brandColor: "#665cf6",
      brandHoverColor: "#8178fa",
      brandActiveColor: "#5147d9",
      samplingColor: "#665cf6",
      samplingGlowColor: "rgba(102, 92, 246, 0.7)",
      statusInfoColor: "#665cf6",
    },
  },
  dark: {
    blue: {
      brandColor: "#78c7ee",
      brandHoverColor: "#94d4f2",
      brandActiveColor: "#5aadd8",
      samplingColor: "#00d2ff",
      samplingGlowColor: "rgba(0, 210, 255, 0.7)",
      statusInfoColor: "#78c7ee",
    },
    green: {
      brandColor: "#63e2b7",
      brandHoverColor: "#7fe7c4",
      brandActiveColor: "#42c99a",
      samplingColor: "#63e2b7",
      samplingGlowColor: "rgba(99, 226, 183, 0.7)",
      statusInfoColor: "#63e2b7",
    },
    red: {
      brandColor: "#e88080",
      brandHoverColor: "#ef9a9a",
      brandActiveColor: "#d45d5d",
      samplingColor: "#e88080",
      samplingGlowColor: "rgba(232, 128, 128, 0.7)",
      statusInfoColor: "#e88080",
    },
    purple: {
      brandColor: "#958cff",
      brandHoverColor: "#afa8ff",
      brandActiveColor: "#786ef0",
      samplingColor: "#958cff",
      samplingGlowColor: "rgba(149, 140, 255, 0.7)",
      statusInfoColor: "#958cff",
    },
  },
};

export function normalizeAccentColor(value?: string | null): AccentColor {
  return value === "green" || value === "red" || value === "purple"
    ? value
    : "blue";
}

export function applyAccentColor(
  theme: LandscapeTheme,
  accent: AccentColor,
): LandscapeTheme {
  return createTheme(theme.name, theme.naiveTheme, {
    ...theme.tokens,
    ...accentPalettes[theme.name][accent],
  });
}

export function readCachedAccentColor(): AccentColor {
  if (typeof window === "undefined") return "blue";
  return normalizeAccentColor(window.localStorage.getItem(ACCENT_STORAGE_KEY));
}

export function cacheAccentColor(value?: string): AccentColor {
  const accent = normalizeAccentColor(value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  }
  return accent;
}

export function readAccentColorFromStorageEvent(
  event: StorageEvent,
): AccentColor | undefined {
  return event.key === ACCENT_STORAGE_KEY
    ? normalizeAccentColor(event.newValue)
    : undefined;
}

export function normalizeThemePreference(
  value?: string | null,
  fallback: ThemePreference = "system",
): ThemePreference {
  if (value === "system" || value === "light" || value === "dark") {
    return value;
  }
  return fallback;
}

export function readCachedThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const cached = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (!cached) return "system";

  try {
    const parsed = JSON.parse(cached) as Partial<ThemeCache>;
    if (parsed.version === THEME_CACHE_VERSION) {
      return normalizeThemePreference(parsed.preference);
    }
  } catch {
    // Migrate the legacy bare-string cache on the next write.
    return normalizeThemePreference(cached);
  }

  return "system";
}

export function cacheThemePreference(value?: string): ThemePreference {
  const preference = normalizeThemePreference(value);
  if (typeof window !== "undefined") {
    const cache: ThemeCache = { version: THEME_CACHE_VERSION, preference };
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(cache));
  }
  return preference;
}

export function readThemePreferenceFromStorageEvent(
  event: StorageEvent,
): ThemePreference | undefined {
  if (event.key !== THEME_STORAGE_KEY || !event.newValue) return undefined;
  try {
    const parsed = JSON.parse(event.newValue) as Partial<ThemeCache>;
    return parsed.version === THEME_CACHE_VERSION
      ? normalizeThemePreference(parsed.preference)
      : undefined;
  } catch {
    return normalizeThemePreference(event.newValue);
  }
}

export function resolveThemeName(
  preference: string | undefined,
  systemPrefersDark: boolean,
): ThemeName {
  const normalized = normalizeThemePreference(preference);
  if (normalized === "system") return systemPrefersDark ? "dark" : "light";
  return normalized;
}

export function applyThemeToDocument(
  theme: LandscapeTheme,
  accent?: AccentColor,
) {
  const root = document.documentElement;
  root.dataset.theme = theme.name;
  if (accent) root.dataset.accent = accent;
  root.style.colorScheme = theme.tokens.colorScheme;

  for (const [name, value] of Object.entries(theme.tokens)) {
    if (name === "colorScheme") continue;
    const cssName = name.replace(
      /[A-Z]/g,
      (letter) => `-${letter.toLowerCase()}`,
    );
    root.style.setProperty(`--app-${cssName}`, value);
  }

  for (const [name, palette] of Object.entries(accentPalettes[theme.name])) {
    root.style.setProperty(`--app-accent-${name}-color`, palette.brandColor);
  }
}
