import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useFrontEndStore } from "./front_end_config";

describe("front-end layout preferences", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("stores the collapsed sidebar preference", () => {
    const store = useFrontEndStore();

    store.sidebar_collapsed = false;
    expect(store.sidebar_collapsed).toBe(false);

    store.sidebar_collapsed = true;
    expect(store.sidebar_collapsed).toBe(true);
  });
});
