import { beforeEach, describe, expect, it } from "vitest";

import {
  applyThemeToDocument,
  applyAccentColor,
  cacheAccentColor,
  cacheThemePreference,
  normalizeThemePreference,
  readCachedThemePreference,
  readCachedAccentColor,
  resolveThemeName,
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
      expect(theme.overrides.Button?.heightSmall).toBe("28px");
      expect(theme.overrides.Tag?.heightSmall).toBe("28px");
    }
  });
});
