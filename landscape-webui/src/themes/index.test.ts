import { beforeEach, describe, expect, it } from "vitest";

import {
  applyThemeToDocument,
  applyAccentColor,
  applyThemeStyle,
  cacheAccentColor,
  cacheThemePreference,
  normalizeThemePreference,
  readCachedThemePreference,
  readCachedAccentColor,
  resolveThemeName,
  selectThemePreset,
  themeStyleColor,
  themeStyleFromRgb,
  defaultThemeStyle,
  themeRegistry,
} from ".";

describe("theme behavior", () => {
  beforeEach(() => window.localStorage.clear());

  it("normalizes invalid preferences and resolves system mode", () => {
    expect(normalizeThemePreference("invalid")).toBe("system");
    expect(resolveThemeName("system", true)).toBe("dark");
    expect(resolveThemeName("system", false)).toBe("light");
  });

  it("persists and restores the startup theme cache", () => {
    cacheThemePreference("light");
    expect(readCachedThemePreference()).toBe("light");
  });

  it("persists accent color and adapts it to light and dark themes", () => {
    cacheAccentColor("purple");
    expect(readCachedAccentColor()).toBe("purple");

    const light = applyAccentColor(themeRegistry.light, "purple");
    const dark = applyAccentColor(themeRegistry.dark, "purple");
    expect(light.tokens.brandColor).toBe("#665cf6");
    expect(dark.tokens.brandColor).toBe("#958cff");
    expect(light.tokens.statusSuccessColor).toBe(
      themeRegistry.light.tokens.statusSuccessColor,
    );
  });

  it("keeps the cached theme when legacy server config has no theme", () => {
    expect(normalizeThemePreference(undefined, "dark")).toBe("dark");
  });

  it("applies the complete theme token set to the document", () => {
    applyThemeToDocument(themeRegistry.light);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(
      document.documentElement.style.getPropertyValue("--app-brand-color"),
    ).toBe(themeRegistry.light.tokens.brandColor);
    expect(
      document.documentElement.style.getPropertyValue("--app-space-page"),
    ).toBe(themeRegistry.light.tokens.spacePage);
  });

  it("maps data table surfaces and borders to semantic theme tokens", () => {
    for (const theme of Object.values(themeRegistry)) {
      expect(theme.overrides.DataTable?.borderColor).toBe(
        theme.tokens.borderSubtleColor,
      );
      expect(theme.overrides.DataTable?.thColor).toBe(
        theme.tokens.surfaceInteractiveColor,
      );
      expect(theme.overrides.DataTable?.tdColor).toBe(
        theme.tokens.surfaceColor,
      );
    }
  });

  it("uses one standard radius and height for common controls", () => {
    for (const theme of Object.values(themeRegistry)) {
      expect(theme.tokens.radiusControl).toBe(theme.tokens.radiusPanel);
      expect(theme.tokens.radiusSurface).toBe(theme.tokens.radiusPanel);
      expect(theme.tokens.radiusLarge).toBe(theme.tokens.radiusPanel);
      expect(theme.overrides.common?.heightMedium).toBe("34px");
      expect(theme.overrides.Button?.heightSmall).toBe("28px");
      expect(theme.overrides.Tabs?.tabPaddingSmallSegment).toBe("3.5px 0");
      expect(theme.overrides.Tag?.heightSmall).toBe("28px");
      expect(theme.overrides.Tag?.fontSizeSmall).toBe("10px");
      expect(theme.overrides.Card?.paddingSmall).toBe("12px 16px 16px");
      expect(theme.overrides.DataTable?.thPaddingMedium).toBe(
        "var(--app-data-table-padding-medium)",
      );
    }
  });

  it("applies preset colors and separate surface and form radii", () => {
    const style = selectThemePreset(defaultThemeStyle, "mint");
    const theme = applyThemeStyle(themeRegistry.light, {
      ...style,
      radius: "large",
    });

    expect(theme.tokens.brandColor).toBe("rgb(0, 149, 99)");
    expect(theme.tokens.radiusSurface).toBe("12px");
    expect(theme.tokens.radiusControl).toBe("12px");
    expect(theme.overrides.Card?.borderRadius).toBe("12px");
    expect(theme.overrides.Button?.borderRadiusMedium).toBe("12px");
  });

  it("round-trips the RGB picker color through the theme model", () => {
    const style = themeStyleFromRgb(defaultThemeStyle, "rgb(102, 92, 246)");
    expect(themeStyleColor(style)).toBe("rgb(102, 92, 246)");
    expect(style.preset).toBe("custom");
  });

  it("raises low-lightness accents in dark mode", () => {
    const uber = selectThemePreset(defaultThemeStyle, "uber");
    const light = applyThemeStyle(themeRegistry.light, uber);
    const dark = applyThemeStyle(themeRegistry.dark, uber);

    expect(light.tokens.brandColor).toBe("rgb(58, 58, 58)");
    expect(dark.tokens.brandColor).toBe("rgb(164, 164, 164)");
  });
});
