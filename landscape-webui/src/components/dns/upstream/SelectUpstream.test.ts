import { flushPromises, shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SelectUpstream from "./SelectUpstream.vue";

const { getDnsUpstreams } = vi.hoisted(() => ({
  getDnsUpstreams: vi.fn(),
}));

vi.mock("@/api/dns_rule/upstream", () => ({
  get_dns_upstreams: getDnsUpstreams,
  get_dns_upstream: vi.fn(),
  push_dns_upstream: vi.fn(),
}));

vi.mock("vue-i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-i18n")>()),
  useI18n: () => ({ t: (key: string) => key }),
}));

describe("SelectUpstream", () => {
  beforeEach(() => getDnsUpstreams.mockResolvedValue([]));

  it("keeps the current selection while creating and selects the saved upstream", async () => {
    const wrapper = shallowMount(SelectUpstream, {
      props: { upstream_id: "existing" },
    });
    await flushPromises();

    (wrapper.vm as any).selectUpstream("__create_dns_upstream__");
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("update:upstream_id")).toBeUndefined();

    await (wrapper.vm as any).upstreamSaved({
      id: "new-upstream",
    });
    await flushPromises();

    const updates = wrapper.emitted("update:upstream_id") ?? [];
    expect(updates[updates.length - 1]).toEqual(["new-upstream"]);
  });
});
