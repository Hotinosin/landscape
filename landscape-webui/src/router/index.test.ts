import { beforeEach, expect, test } from "vitest";
import router from "./index";

beforeEach(async () => {
  localStorage.clear();
  await router.push("/login");
});

test("does not mount protected routes without a token", async () => {
  await router.push("/flow");

  expect(router.currentRoute.value.path).toBe("/login");
});
