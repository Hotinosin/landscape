import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import StatusTitle from "./StatusTitle.vue";

vi.mock("vue-i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-i18n")>()),
  useI18n: () => ({ t: (key: string) => key }),
}));

describe("StatusTitle", () => {
  it("renders only remark when only remark is provided (historical data)", () => {
    const wrapper = mount(StatusTitle, {
      props: {
        enable: true,
        remark: "办公室局域网",
      },
    });

    expect(wrapper.find(".status-title-name").exists()).toBe(false);
    expect(wrapper.find(".status-title-remark").exists()).toBe(true);
    expect(wrapper.find(".status-title-remark").text()).toBe("办公室局域网");
    expect(wrapper.find(".status-title-remark").classes()).not.toContain(
      "is-secondary",
    );
  });

  it("renders only name when only name is provided", () => {
    const wrapper = mount(StatusTitle, {
      props: {
        enable: true,
        name: "Web Server",
      },
    });

    expect(wrapper.find(".status-title-name").exists()).toBe(true);
    expect(wrapper.find(".status-title-name").text()).toBe("Web Server");
    expect(wrapper.find(".status-title-remark").exists()).toBe(false);
  });

  it("renders both name and remark in distinct layers when both are provided", () => {
    const wrapper = mount(StatusTitle, {
      props: {
        enable: true,
        name: "Web Server",
        remark: "80/443端口映射",
      },
    });

    expect(wrapper.find(".status-title-name").exists()).toBe(true);
    expect(wrapper.find(".status-title-name").text()).toBe("Web Server");
    expect(wrapper.find(".status-title-remark").exists()).toBe(true);
    expect(wrapper.find(".status-title-remark").text()).toBe("80/443端口映射");
    expect(wrapper.find(".status-title-remark").classes()).toContain(
      "is-secondary",
    );
  });

  it("supports prefix formatting without conflating name and remark", () => {
    const withRemarkOnly = mount(StatusTitle, {
      props: {
        enable: true,
        prefix: 10,
        remark: "国内直连",
      },
    });
    expect(withRemarkOnly.find(".status-title-remark").text()).toBe(
      "10: 国内直连",
    );

    const withBoth = mount(StatusTitle, {
      props: {
        enable: true,
        prefix: 10,
        name: "直连策略",
        remark: "国内流量直连",
      },
    });
    expect(withBoth.find(".status-title-name").text()).toBe("10: 直连策略");
    expect(withBoth.find(".status-title-remark").text()).toBe("国内流量直连");
  });

  it("renders placeholder when neither name nor remark is provided", () => {
    const wrapper = mount(StatusTitle, {
      props: {
        enable: true,
      },
    });

    expect(wrapper.find(".status-title-name").exists()).toBe(false);
    expect(wrapper.find(".status-title-remark").exists()).toBe(false);
    expect(wrapper.text()).toContain("common.no_remark");
  });
});
