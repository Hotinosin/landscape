import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useFrontEndStore } from "./front_end_config";

describe("front-end layout preferences", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("defaults to the standard list presentation", () => {
    expect(useFrontEndStore().display_style).toBe("list");
  });

  it("switches between list/card and expanded/collapsed layout", () => {
    const store = useFrontEndStore();

    store.display_style = "card";
    store.sidebar_collapsed = false;
    expect(store.display_style).toBe("card");
    expect(store.sidebar_collapsed).toBe(false);

    store.display_style = "list";
    store.sidebar_collapsed = true;
    expect(store.display_style).toBe("list");
    expect(store.sidebar_collapsed).toBe(true);
  });
});
