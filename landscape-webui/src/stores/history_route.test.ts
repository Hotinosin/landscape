import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import type { RouteLocationNormalized } from "vue-router";

import { useHistoryRouteStore } from "./history_route";

function route(path: string): RouteLocationNormalized {
  return { path, name: path, meta: {} } as RouteLocationNormalized;
}

describe("history route layout state", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("keeps multiple unique tabs and ignores login", () => {
    const store = useHistoryRouteStore();
    store.addRoute(route("/flow"));
    store.addRoute(route("/device"));
    store.addRoute(route("/flow"));
    store.addRoute(route("/login"));

    expect(store.visitedRoutes.map((item) => item.path)).toEqual([
      "/flow",
      "/device",
    ]);
  });

  it("keeps pinned tabs on clear and removes all tabs on reset", () => {
    const store = useHistoryRouteStore();
    store.addRoute(route("/flow"));
    store.addRoute(route("/device"));
    store.togglePin("/flow");

    store.clearRoutes();
    expect(store.visitedRoutes.map((item) => item.path)).toEqual(["/flow"]);

    store.resetRoutes();
    expect(store.visitedRoutes).toEqual([]);
  });
});
