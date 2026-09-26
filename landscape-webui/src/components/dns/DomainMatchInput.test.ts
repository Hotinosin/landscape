import { shallowMount } from "@vue/test-utils";
import type { RuleSource } from "@landscape-router/types/api/schemas";
import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import DomainMatchInput from "./DomainMatchInput.vue";

describe("DomainMatchInput", () => {
  it("changes between GeoSite and text match sources", async () => {
    const source: RuleSource[] = [
      {
        t: "geo_key",
        key: "CN",
        name: "geosite",
        inverse: false,
        attribute_key: null,
      },
    ];
    const wrapper = shallowMount(DomainMatchInput, {
      props: { source },
      global: { plugins: [i18n] },
    });

    (wrapper.vm as any).changeCurrentRuleType(source[0]!, 0, "plain");
    expect(source[0]).toEqual({
      t: "config",
      match_type: "plain",
      value: "CN",
    });

    (wrapper.vm as any).changeCurrentRuleType(source[0]!, 0, "geo_key");
    expect(source[0]).toMatchObject({
      t: "geo_key",
      key: "CN",
    });
  });
});
