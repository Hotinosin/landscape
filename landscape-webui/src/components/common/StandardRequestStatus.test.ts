import { createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import StandardRequestStatus from "./StandardRequestStatus.vue";

const mountStatus = (
  props: InstanceType<typeof StandardRequestStatus>["$props"],
) =>
  mount(StandardRequestStatus, {
    props,
    slots: { default: '<div data-test="content">old content</div>' },
    global: { plugins: [createPinia(), i18n] },
  });

describe("StandardRequestStatus", () => {
  it("shows first failure with retry and without content or empty state", async () => {
    const wrapper = mountStatus({
      hasSucceeded: false,
      error: new Error("offline"),
    });

    expect(wrapper.text()).toContain("common.load_failed");
    expect(wrapper.text()).not.toContain("old content");
    expect(wrapper.find(".n-empty").exists()).toBe(false);
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("keeps old content, warning, and retry on refresh failure", async () => {
    const wrapper = mountStatus({
      hasSucceeded: true,
      error: new Error("offline"),
      lastSuccessAt: Date.now(),
    });

    expect(wrapper.text()).toContain("common.refresh_failed_previous_result");
    expect(wrapper.text()).not.toContain("common.last_success_at");
    expect(wrapper.text()).toContain("old content");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("labels retained content as a previous query after filters change", () => {
    const wrapper = mountStatus({
      hasSucceeded: true,
      stale: true,
      lastSuccessAt: Date.now(),
    });

    expect(wrapper.text()).toContain("common.showing_previous_query");
    expect(wrapper.text()).toContain("old content");
  });

  it("does not stretch compact summary blocks", () => {
    const wrapper = mountStatus({ hasSucceeded: true, compact: true });

    expect(wrapper.get(".request-status").classes()).not.toContain(
      "request-status--fill",
    );
  });
});
