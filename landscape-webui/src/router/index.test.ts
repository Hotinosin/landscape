import { beforeEach, expect, test } from "vitest";
import { LANDSCAPE_TOKEN_KEY } from "@/lib/common";
import router, { isExpiredToken } from "./index";

function tokenWithExpiry(exp: number) {
  return `header.${btoa(JSON.stringify({ exp })).replace(/=/g, "")}.signature`;
}

beforeEach(async () => {
  localStorage.clear();
  await router.push("/login");
});

test("does not mount protected routes without a token", async () => {
  await router.push("/flow");

  expect(router.currentRoute.value.path).toBe("/login");
});

test("redirects an expired deep link before mounting it", async () => {
  localStorage.setItem(LANDSCAPE_TOKEN_KEY, tokenWithExpiry(4_102_444_800));
  await router.push("/");
  localStorage.setItem(LANDSCAPE_TOKEN_KEY, tokenWithExpiry(1));

  await router.push("/domains/certs");

  expect(router.currentRoute.value.path).toBe("/login");
  expect(history.state.redirect).toBe("/domains/certs");
  expect(localStorage.getItem(LANDSCAPE_TOKEN_KEY)).toBeNull();
});

test("recognizes an unexpired token", () => {
  expect(isExpiredToken(tokenWithExpiry(2), 1000)).toBe(false);
});
