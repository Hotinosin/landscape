import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "./i18n";
import { DnsRedirectPage, DnsUpstreamPage } from "./DnsPages";

const api = vi.hoisted(() => ({
  upstreams: vi.fn(),
  upstream: vi.fn(),
  saveUpstream: vi.fn(),
  deleteUpstream: vi.fn(),
  h3: vi.fn(),
  redirects: vi.fn(),
  redirect: vi.fn(),
  saveRedirect: vi.fn(),
  deleteRedirect: vi.fn(),
  flows: vi.fn(),
}));

vi.mock("@/api/dns_rule/upstream", () => ({
  get_dns_upstreams: api.upstreams,
  get_dns_upstream: api.upstream,
  push_dns_upstream: api.saveUpstream,
  delete_dns_upstream: api.deleteUpstream,
  test_dns_upstream_h3: api.h3,
}));
vi.mock("@/api/dns_rule/redirect", () => ({
  get_dns_redirects: api.redirects,
  get_dns_redirect: api.redirect,
  push_dns_redirect: api.saveRedirect,
  delete_dns_redirect: api.deleteRedirect,
}));
vi.mock("@landscape-router/types/api/flow-rules/flow-rules", () => ({
  getFlowRules: api.flows,
}));

let root: Root | undefined;
async function render(page: React.ReactNode, path = "/") {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
      </I18nProvider>,
    );
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
  api.upstreams.mockReset();
  api.upstream.mockReset();
  api.saveUpstream.mockReset();
  api.deleteUpstream.mockReset();
  api.h3.mockReset();
  api.redirects.mockReset();
  api.redirect.mockReset();
  api.saveRedirect.mockReset();
  api.deleteRedirect.mockReset();
  api.flows.mockReset().mockResolvedValue([]);
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
});

describe("DNS React pages", () => {
  it("renders upstream success and empty states", async () => {
    api.upstreams.mockResolvedValueOnce([
      {
        id: "one",
        remark: "Primary",
        mode: { t: "https", domain: "dns.example.com", http_endpoint: null },
        ips: ["1.1.1.1"],
        port: 443,
        enable_ip_validation: false,
      },
    ]);
    await render(<DnsUpstreamPage />);
    expect(document.body.textContent).toContain("dns.example.com/dns-query");
    expect(document.body.textContent).toContain("Primary");
    await act(async () => {
      root?.unmount();
      root = undefined;
    });
    api.upstreams.mockResolvedValueOnce([]);
    await render(<DnsUpstreamPage />);
    expect(document.body.textContent).toContain("No data");
  });

  it("renders an upstream load error and retries", async () => {
    api.upstreams
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    await render(<DnsUpstreamPage />);
    expect(document.body.textContent).toContain("Failed to load");
    await act(async () => {
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent === "Retry")
        ?.click();
      await Promise.resolve();
    });
    expect(api.upstreams).toHaveBeenCalledTimes(2);
  });

  it("opens the upstream editor from the edit query", async () => {
    api.upstreams.mockResolvedValue([]);
    api.upstream.mockResolvedValue({
      id: "one",
      remark: "Edit me",
      mode: { t: "plaintext" },
      ips: ["8.8.8.8"],
      port: 53,
      enable_ip_validation: false,
    });
    await render(<DnsUpstreamPage />, "/dns/upstream?edit=one");
    expect(api.upstream).toHaveBeenCalledWith("one");
    expect(document.body.textContent).toContain("DNS Upstream Config");
  });

  it("renders redirect rules without a migration placeholder", async () => {
    api.redirects.mockResolvedValue([
      {
        id: "redirect",
        enable: true,
        remark: "LAN names",
        apply_flows: [0],
        match_rules: [{ t: "config", match_type: "domain", value: "lan" }],
        answer_mode: "static_ips",
        result_info: ["192.0.2.1"],
        block_metadata_queries: true,
      },
    ]);
    await render(<DnsRedirectPage />);
    expect(document.body.textContent).toContain("LAN names");
    expect(document.body.textContent).toContain("domain: lan");
    expect(document.body.textContent).not.toContain(
      "waiting for its React page migration",
    );
  });
});
