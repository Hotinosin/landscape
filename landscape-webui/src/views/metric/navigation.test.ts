import { shallowMount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import dnsSource from "./DNSMetric.vue?raw";
import switcherSource from "@/components/metric/connect/ConnectViewSwitcher.vue?raw";
import metricRoutes from "@/router/metric";
import Sidebar from "@/views/LandscapeSiderBar.vue";
import Switcher from "@/components/metric/connect/ConnectViewSwitcher.vue";
import i18n from "@/i18n";
import zh from "@/i18n/zh/routes";
import en from "@/i18n/en/routes";
import dnsZh from "@/i18n/zh/metrics/dns";
import dnsEn from "@/i18n/en/metrics/dns";

const paths = [
  "live",
  "iface",
  "src",
  "dst",
  "history",
  "history-src",
  "history-dst",
];
const labels = [
  "实时",
  "接口实时统计",
  "源 IP 实时统计",
  "目的 IP 实时统计",
  "历史",
  "源 IP 历史统计",
  "目的 IP 历史统计",
];
const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: metricRoutes.map((r) => ({
      path: r.path,
      name: r.name,
      component: { template: "<div />" },
    })),
  });

describe("monitor navigation", () => {
  it("keeps three sidebar entries and maps detail routes to their section", async () => {
    const r = router();
    await r.push("/metrics/conn/live");
    const wrapper = shallowMount(Sidebar, {
      global: { plugins: [r, createPinia(), i18n] },
    });
    const vm = wrapper.vm as any;
    const group = vm.menuOptions.find((o: any) => o.key === "metric-group");
    expect(group.children.map((o: any) => o.key)).toEqual([
      "metrics/conn/live",
      "metrics/conn/history",
      "metrics/dns",
    ]);
    for (const [index, path] of paths.entries()) {
      await r.push(`/metrics/conn/${path}`);
      expect(vm.menu_active_key).toBe(
        `metrics/conn/${path.startsWith("history") ? "history" : "live"}`,
      );
      expect(r.currentRoute.value.name).toBe(`routes.connect-${path}`);
      expect(zh[`connect-${path}` as keyof typeof zh]).toBe(labels[index]);
      expect(en[`connect-${path}` as keyof typeof en]).toBeTruthy();
    }
    await r.push("/metrics/dns");
    expect(vm.menu_active_key).toBe("metrics/dns");
    expect(r.currentRoute.value.name).toBe("routes.dns-metric");
    expect(zh["dns-metric"]).toBe("DNS 分析");
    expect(en["dns-metric"]).toBe("DNS Analysis");
    wrapper.unmount();
  });

  it("preserves query filters across every connection tab", async () => {
    const r = router();
    const query = { flow_id: "0", src_ip: "192.0.2.1", tag: ["a", "b"] };
    await r.push({ path: "/metrics/conn/live", query });
    const wrapper = shallowMount(Switcher, { global: { plugins: [r] } });
    for (const path of paths) {
      (wrapper.vm as any).viewMode = path;
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(r.currentRoute.value.path).toBe(`/metrics/conn/${path}`);
      expect(r.currentRoute.value.query).toEqual(query);
    }
    wrapper.unmount();
  });

  it("keeps DNS content tabs in the shared segment style", () => {
    const dns = dnsSource;
    expect(dns).toContain('<n-tab name="dashboard">');
    expect(dns).toContain('<n-tab name="history">');
    expect(dns).toContain('type="segment"');
    expect(dns).not.toContain('t("routes.dns-metric")');
    expect([dnsZh.dashboard, dnsZh.query_log]).toEqual(["概览", "查询日志"]);
    expect([dnsEn.dashboard, dnsEn.query_log]).toEqual([
      "Overview",
      "Query Log",
    ]);
    const switcher = switcherSource;
    expect(switcher).not.toContain("n-scrollbar");
    expect(switcher).toContain(
      `:style="{ width: isHistory ? '480px' : '640px' }"`,
    );
    expect(switcher).toContain("pulse-dot");
    expect(switcher).toContain('v-if="isHistory"');
    expect(switcher.match(/<n-tab name=/g)).toHaveLength(7);
  });
});
