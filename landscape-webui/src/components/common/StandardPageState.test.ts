import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import StandardPageState from "./StandardPageState.vue";

describe("StandardPageState", () => {
  it.each(["initial", "loading"] as const)(
    "shows a spinner for %s state",
    (state) => {
      const wrapper = mount(StandardPageState, { props: { state } });

      expect(wrapper.find(".n-spin").exists()).toBe(true);
      expect(wrapper.find(".n-empty").exists()).toBe(false);
    },
  );

  it("shows a compact empty state without rendering ready content", () => {
    const wrapper = mount(StandardPageState, {
      props: { state: "empty", compact: true, emptyText: "Nothing here" },
      slots: { default: "ready content" },
    });

    expect(wrapper.classes()).toContain("standard-page-state--compact");
    expect(wrapper.text()).toContain("Nothing here");
    expect(wrapper.text()).not.toContain("ready content");
  });

  it("emits retry from the error state", async () => {
    const wrapper = mount(StandardPageState, {
      props: { state: "error", errorText: "Load failed" },
    });

    expect(wrapper.text()).toContain("Load failed");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("renders page content only when ready", () => {
    const wrapper = mount(StandardPageState, {
      props: { state: "ready" },
      slots: { default: '<div data-test="ready">ready content</div>' },
    });

    expect(wrapper.get('[data-test="ready"]').text()).toBe("ready content");
    expect(wrapper.find(".standard-page-state").exists()).toBe(false);
  });
});
