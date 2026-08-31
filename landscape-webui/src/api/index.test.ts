import { describe, expect, it } from "vitest";
import { isCurrentSessionUnauthorized } from "./index";

describe("isCurrentSessionUnauthorized", () => {
  it("ignores a late unauthorized response from before login", () => {
    expect(isCurrentSessionUnauthorized(undefined, "new-token")).toBe(false);
    expect(isCurrentSessionUnauthorized("Bearer old-token", "new-token")).toBe(
      false,
    );
    expect(isCurrentSessionUnauthorized("Bearer new-token", "new-token")).toBe(
      true,
    );
  });
});
