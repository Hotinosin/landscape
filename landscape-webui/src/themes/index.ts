import {
  darkTheme,
  type GlobalTheme,
  type GlobalThemeOverrides,
} from "naive-ui";

export const THEME_STORAGE_KEY = "landscape-theme";
export const ACCENT_STORAGE_KEY = "landscape-accent";
export const THEME_STYLE_STORAGE_KEY = "landscape-theme-style";
const THEME_CACHE_VERSION = 2;

export type ThemePreference = "system" | ThemeName;
export type ThemeName = "light" | "dark";
export type AccentColor = "blue" | "green" | "red" | "purple";
export type ThemePreset =
  | "default"
  | "sky"
  | "lavender"
  | "mint"
  | "netflix"
  | "uber"
  | "spotify"
  | "coinbase"
  | "airbnb"
  | "discord"
  | "rabbit"
  | "custom";
export type ThemeRadius = "none" | "small" | "medium" | "large";

export interface ThemeStyle {
  preset: ThemePreset;
  base: number;
  chroma: number;
  hue: number;
  lightness: number;
  radius: ThemeRadius;
}

export const themePresets: Record<
  Exclude<ThemePreset, "custom">,
  Omit<ThemeStyle, "preset" | "radius">
> = {
  default: { base: 0.005, chroma: 0.18, hue: 255, lightness: 0.61 },
  sky: { base: 0.005, chroma: 0.16, hue: 210, lightness: 0.68 },
  lavender: { base: 0.005, chroma: 0.2091, hue: 273.85, lightness: 0.5774 },
  mint: { base: 0.005, chroma: 0.15, hue: 165, lightness: 0.66 },
  netflix: { base: 0.005, chroma: 0.22, hue: 25, lightness: 0.58 },
  uber: { base: 0, chroma: 0, hue: 0, lightness: 0.34 },
  spotify: { base: 0.005, chroma: 0.18, hue: 155, lightness: 0.62 },
  coinbase: { base: 0.005, chroma: 0.2, hue: 260, lightness: 0.57 },
  airbnb: { base: 0.005, chroma: 0.18, hue: 18, lightness: 0.65 },
  discord: { base: 0.005, chroma: 0.22, hue: 285, lightness: 0.5 },
  rabbit: { base: 0.005, chroma: 0.2, hue: 55, lightness: 0.65 },
};

export const defaultThemeStyle: ThemeStyle = {
  preset: "lavender",
  ...themePresets.lavender,
  radius: "small",
};

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
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        fontFamilyMono:
          'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
        fontWeightStrong: "600",
        heightMedium: tokens.controlHeight,
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
        paddingSmall: "12px 16px 16px",
        paddingMedium: "14px 20px 16px",
      },
      Tag: {
        heightSmall: "28px",
        fontSizeSmall: "10px",
        borderRadius: tokens.radiusControl,
      },
      Switch: {
        railColorActive: tokens.statusSuccessColor,
      },
      Radio: {
        buttonColorActive: tokens.brandColor,
        buttonBorderColorActive: tokens.brandColor,
        buttonTextColorActive: tokens.textInverseColor,
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
        tabPaddingSmallSegment: "3.5px 0",
        colorSegment: tokens.surfaceMutedColor,
        tabColorSegment: tokens.surfaceOverlayColor,
      },
      DataTable: {
        thPaddingSmall: "var(--app-data-table-padding-small)",
        tdPaddingSmall: "var(--app-data-table-padding-small)",
        thPaddingMedium: "var(--app-data-table-padding-medium)",
        tdPaddingMedium: "var(--app-data-table-padding-medium)",
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
    terminalHeaderColor: "#f4f6f8",
    terminalBorderColor: "#d8dde3",
    terminalHandleColor: "#68717a",
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
    terminalHeaderColor: "#202024",
    terminalBorderColor: "rgba(255, 255, 255, 0.16)",
    terminalHandleColor: "rgba(255, 255, 255, 0.62)",
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

const radiusValues: Record<ThemeRadius, string> = {
  none: "0px",
  small: "6px",
  medium: "8px",
  large: "12px",
};

function normalizeRadius(value: unknown, fallback: ThemeRadius): ThemeRadius {
  return typeof value === "string" && value in radiusValues
    ? (value as ThemeRadius)
    : fallback;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function oklchRgb(lightness: number, chroma: number, hue: number) {
  const angle = (clamp(hue, 0, 360) * Math.PI) / 180;
  const a = clamp(chroma, 0, 0.4) * Math.cos(angle);
  const b = clamp(chroma, 0, 0.4) * Math.sin(angle);
  const l = clamp(lightness, 0, 1) + 0.3963377774 * a + 0.2158037573 * b;
  const m = clamp(lightness, 0, 1) - 0.1055613458 * a - 0.0638541728 * b;
  const s = clamp(lightness, 0, 1) - 0.0894841775 * a - 1.291485548 * b;
  const linear = [
    4.0767416621 * l ** 3 - 3.3077115913 * m ** 3 + 0.2309699292 * s ** 3,
    -1.2684380046 * l ** 3 + 2.6097574011 * m ** 3 - 0.3413193965 * s ** 3,
    -0.0041960863 * l ** 3 - 0.7034186147 * m ** 3 + 1.707614701 * s ** 3,
  ];
  return linear.map((channel) =>
    Math.round(
      255 *
        clamp(
          channel <= 0.0031308
            ? 12.92 * channel
            : 1.055 * channel ** (1 / 2.4) - 0.055,
          0,
          1,
        ),
    ),
  );
}

function oklch(lightness: number, chroma: number, hue: number) {
  return `rgb(${oklchRgb(lightness, chroma, hue).join(", ")})`;
}

export function themeStyleColor(style: ThemeStyle) {
  return oklch(style.lightness, style.chroma, style.hue);
}

export function themeStyleFromRgb(
  style: ThemeStyle,
  value: string,
): ThemeStyle {
  const channels = value
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);
  if (!channels || channels.length !== 3) return style;
  const [r, g, b] = channels.map((channel) => {
    const srgb = clamp(channel, 0, 255) / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const yellowBlue = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = (Math.atan2(yellowBlue, a) * 180) / Math.PI;

  return normalizeThemeStyle({
    ...style,
    preset: "custom",
    lightness,
    chroma: Math.hypot(a, yellowBlue),
    hue: hue < 0 ? hue + 360 : hue,
  });
}

export function normalizeThemeStyle(value?: Partial<ThemeStyle>): ThemeStyle {
  const preset =
    value?.preset && (value.preset === "custom" || value.preset in themePresets)
      ? value.preset
      : defaultThemeStyle.preset;
  const source = preset === "custom" ? defaultThemeStyle : themePresets[preset];
  const colors = value;
  const radius = normalizeRadius(value?.radius, defaultThemeStyle.radius);

  return {
    preset,
    base: clamp(Number(colors?.base ?? source.base), 0, 0.08),
    chroma: clamp(Number(colors?.chroma ?? source.chroma), 0, 0.4),
    hue: clamp(Number(colors?.hue ?? source.hue), 0, 360),
    lightness: clamp(Number(colors?.lightness ?? source.lightness), 0.35, 0.8),
    radius,
  };
}

export function selectThemePreset(
  style: ThemeStyle,
  preset: ThemePreset,
): ThemeStyle {
  if (preset === "custom") return { ...style, preset };
  return { ...style, preset, ...themePresets[preset] };
}

export function applyThemeStyle(
  theme: LandscapeTheme,
  value: Partial<ThemeStyle>,
): LandscapeTheme {
  const style = normalizeThemeStyle(value);
  const dark = theme.name === "dark";
  const brandLightness = dark
    ? Math.max(style.lightness, 0.72)
    : Math.min(style.lightness, 0.58);
  const brandColor = oklch(brandLightness, style.chroma, style.hue);
  const neutral = (lightness: number) =>
    oklch(lightness, style.base, style.hue);
  const surfaceRadius = radiusValues[style.radius];

  return createTheme(theme.name, theme.naiveTheme, {
    ...theme.tokens,
    canvasColor: neutral(dark ? 0.13 : 0.97),
    surfaceColor: neutral(dark ? 0.17 : 0.995),
    surfaceOverlayColor: neutral(dark ? 0.22 : 1),
    surfaceInteractiveColor: neutral(dark ? 0.21 : 0.975),
    surfaceAlternateColor: neutral(dark ? 0.19 : 0.965),
    brandColor,
    brandHoverColor: oklch(brandLightness + 0.06, style.chroma, style.hue),
    brandActiveColor: oklch(
      brandLightness - (dark ? 0.08 : 0.07),
      style.chroma,
      style.hue,
    ),
    samplingColor: brandColor,
    samplingGlowColor: `rgba(${oklchRgb(brandLightness, style.chroma, style.hue).join(", ")}, 0.7)`,
    terminalHeaderColor: neutral(dark ? 0.2 : 0.96),
    terminalBorderColor: neutral(dark ? 0.32 : 0.86),
    terminalHandleColor: neutral(dark ? 0.68 : 0.42),
    statusInfoColor: brandColor,
    radiusControl: surfaceRadius,
    radiusIndicator: radiusValues[style.radius],
    radiusSurface: surfaceRadius,
    radiusPanel: surfaceRadius,
    radiusLarge: surfaceRadius,
  });
}

export function readCachedThemeStyle(): ThemeStyle {
  if (typeof window === "undefined") return defaultThemeStyle;
  try {
    return normalizeThemeStyle(
      JSON.parse(window.localStorage.getItem(THEME_STYLE_STORAGE_KEY) || "{}"),
    );
  } catch {
    return defaultThemeStyle;
  }
}

export function cacheThemeStyle(value: Partial<ThemeStyle>): ThemeStyle {
  const style = normalizeThemeStyle(value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STYLE_STORAGE_KEY, JSON.stringify(style));
  }
  return style;
}

export function readThemeStyleFromStorageEvent(
  event: StorageEvent,
): ThemeStyle | undefined {
  if (event.key !== THEME_STYLE_STORAGE_KEY || !event.newValue)
    return undefined;
  try {
    return normalizeThemeStyle(JSON.parse(event.newValue));
  } catch {
    return undefined;
  }
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
  const modeChanged = Boolean(
    root.dataset.theme && root.dataset.theme !== theme.name,
  );
  if (modeChanged) root.classList.add("theme-switching");
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

  if (modeChanged) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.classList.remove("theme-switching")),
    );
  }
}
