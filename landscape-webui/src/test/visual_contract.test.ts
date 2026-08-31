import { describe, expect, it } from "vitest";

import { themeRegistry } from "@/themes";

const visualSources = import.meta.glob(
  ["../**/*.vue", "../**/*.css", "../**/*.ts"],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

function sourceWithoutTests() {
  return Object.entries(visualSources).filter(
    ([path]) => !path.endsWith(".test.ts") && path !== "../themes/index.ts",
  );
}

describe("visual design contracts", () => {
  it("keeps layout foundation tokens identical across themes", () => {
    const tokenNames = [
      "radiusControl",
      "radiusSurface",
      "radiusPanel",
      "radiusLarge",
      "controlHeight",
      "spacePage",
      "spaceSection",
      "stateEmptyMinHeight",
    ] as const;

    for (const token of tokenNames) {
      expect(themeRegistry.light.tokens[token], token).toBe(
        themeRegistry.dark.tokens[token],
      );
    }
  });

  it("does not reintroduce legacy tables or direct visual constants", () => {
    const violations: string[] = [];
    const patterns = [
      ["legacy n-table", /<n-table\b/],
      ["direct color", /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/],
      ["literal font size", /font-size:\s*\d+px/],
      ["literal radius", /border-radius:\s*\d+px/],
    ] as const;

    for (const [path, source] of sourceWithoutTests()) {
      for (const [label, pattern] of patterns) {
        if (pattern.test(source)) {
          violations.push(`${path.replace(/^\.\.\//, "")}: ${label}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("uses the shared edit button", () => {
    const directEditButtons = sourceWithoutTests()
      .filter(([path]) => !path.endsWith("/common/EditButton.vue"))
      .filter(([, source]) => /common\.edit/.test(source))
      .map(([path]) => path.replace(/^\.\.\//, ""));

    expect(directEditButtons).toEqual([]);
  });
});
