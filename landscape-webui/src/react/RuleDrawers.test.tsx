import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "./i18n";
import { RuleDrawers } from "./RuleDrawers";

const api = vi.hoisted(() => ({
  dns: vi.fn(),
  dnsOne: vi.fn(),
  dnsSave: vi.fn(),
  dnsDelete: vi.fn(),
  dnsMany: vi.fn(),
  ip: vi.fn(),
  ipOne: vi.fn(),
  ipSave: vi.fn(),
  ipUpdate: vi.fn(),
  ipDelete: vi.fn(),
  ipMany: vi.fn(),
  upstreams: vi.fn(),
  flows: vi.fn(),
}));
vi.mock("@/api/dns_rule", () => ({
  get_flow_dns_rules: api.dns,
  get_dns_rule: api.dnsOne,
  push_dns_rule: api.dnsSave,
  delete_dns_rule: api.dnsDelete,
  push_many_dns_rule: api.dnsMany,
}));
vi.mock("@/api/dst_ip_rule", () => ({
  get_flow_dst_ip_rules: api.ip,
  get_dst_ip_rules_rule: api.ipOne,
  push_dst_ip_rules_rule: api.ipSave,
  update_dst_ip_rules_rule: api.ipUpdate,
  delete_dst_ip_rules_rule: api.ipDelete,
  push_many_dst_ip_rule: api.ipMany,
}));
vi.mock("@/api/dns_rule/upstream", () => ({
  get_dns_upstreams: api.upstreams,
}));
vi.mock("@landscape-router/types/api/flow-rules/flow-rules", () => ({
  getFlowRules: api.flows,
}));

let root: Root | undefined;
async function render(kind: "dns" | "ip") {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <I18nProvider>
        <RuleDrawers kind={kind} onClose={() => undefined} />
      </I18nProvider>,
    );
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  Object.values(api).forEach((mock) => mock.mockReset());
  api.flows.mockResolvedValue([]);
  api.upstreams.mockResolvedValue([]);
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
});

describe("overview rule drawers", () => {
  it("shows complete DNS rule data and opens the editor", async () => {
    api.dns.mockResolvedValue([
      {
        id: "dns-1",
        index: 10,
        name: "Primary",
        enable: true,
        flow_id: 0,
        filter: "unfilter",
        upstream_id: "up-1",
        mark: { action: { t: "direct" }, flow_id: 0, allow_reuse_port: false },
        source: [{ t: "config", match_type: "domain", value: "example.com" }],
      },
    ]);
    api.dnsOne.mockResolvedValue({
      id: "dns-1",
      index: 10,
      name: "Primary",
      enable: true,
      flow_id: 0,
      filter: "unfilter",
      upstream_id: "up-1",
      mark: { action: { t: "direct" }, flow_id: 0, allow_reuse_port: false },
      source: [],
    });
    await render("dns");
    expect(document.querySelector("table")).not.toBeNull();
    expect(
      document.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
    ).toBe("DNS Rules");
    expect(document.body.textContent).toContain("Primary");
    expect(document.body.textContent).toContain("domain: example.com");
    await act(async () => {
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent === "Edit")
        ?.click();
      await Promise.resolve();
    });
    expect(api.dnsOne).toHaveBeenCalledWith("dns-1");
    expect(document.body.textContent).toContain("Rule Editor");
  });
  it("shows destination IP CIDR rules", async () => {
    api.ip.mockResolvedValue([
      {
        id: "ip-1",
        index: 20,
        remark: "Private",
        enable: true,
        flow_id: 0,
        override_dns: false,
        mark: { action: { t: "drop" }, flow_id: 0, allow_reuse_port: false },
        source: [{ t: "config", ip: "192.0.2.0", prefix: 24 }],
      },
    ]);
    await render("ip");
    expect(document.querySelector("table")).not.toBeNull();
    expect(
      document.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
    ).toBe("Target IP Rules");
    expect(document.body.textContent).toContain("Private");
    expect(document.body.textContent).toContain("192.0.2.0/24");
    expect(document.body.textContent).toContain("Drop");
  });
});
