import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import StandardDataTable from "./StandardDataTable.vue";

const columns = [{ title: "Name", key: "name" }];

describe("StandardDataTable", () => {
  it("renders data with the shared table class", async () => {
    const wrapper = mount(StandardDataTable, {
      props: { columns, data: [{ name: "router" }] },
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.find(".standard-data-table").exists()).toBe(true);
    expect(wrapper.text()).toContain("router");
  });

  it("uses the standard empty presentation", async () => {
    const wrapper = mount(StandardDataTable, {
      props: { columns, data: [], emptyText: "No rows" },
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("No rows");
  });

  it("replaces the table with an error state and forwards retry", async () => {
    const wrapper = mount(StandardDataTable, {
      props: { columns, data: [], error: new Error("offline") },
    });

    expect(wrapper.find(".standard-data-table").exists()).toBe(false);
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });
});
