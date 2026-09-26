import { describe, expect, it } from "vitest";
import { resolvePageState } from "./page_state";

describe("resolvePageState", () => {
  it("keeps initial and refresh loading distinct", () => {
    expect(resolvePageState({ initialized: false })).toBe("initial");
    expect(resolvePageState({ initialized: true, loading: true })).toBe(
      "loading",
    );
  });

  it("resolves content, empty, and error states deterministically", () => {
    expect(resolvePageState({ initialized: true, itemCount: 1 })).toBe("ready");
    expect(resolvePageState({ initialized: true, itemCount: 0 })).toBe("empty");
    expect(
      resolvePageState({ initialized: true, itemCount: 1, error: new Error() }),
    ).toBe("error");
  });
});
