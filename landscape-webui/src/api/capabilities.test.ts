import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { setAxiosInstance } from "@landscape-router/types/mutator";
import { listPlugins, startPlugin } from "./plugins";
import { test_dns_upstream_quic } from "./dns_rule/upstream";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";

const transport = vi.fn();

describe("the same API client with upstream and custom backends", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    transport.mockReset();
    setAxiosInstance(transport as any);
  });

  it("fetches upstream capabilities once and never calls extension endpoints", async () => {
    transport.mockResolvedValue({ data: ["gateway", "metric_persistent"] });
    await expect(listPlugins()).resolves.toEqual([]);
    await expect(startPlugin("mihomo")).rejects.toThrow("plugins");
    await expect(
      test_dns_upstream_quic({} as DnsUpstreamConfig),
    ).rejects.toThrow("dns_quic_diagnostics");
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/v1/system/info/capabilities",
        method: "GET",
      }),
    );
  });

  it("calls advertised custom endpoints using the same generated client", async () => {
    transport
      .mockResolvedValueOnce({ data: ["plugins", "dns_quic_diagnostics"] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: {} });
    await listPlugins();
    await test_dns_upstream_quic({} as DnsUpstreamConfig);
    expect(transport.mock.calls.map(([request]) => request.url)).toEqual([
      "/api/v1/system/info/capabilities",
      "/api/v1/plugins/",
      "/api/v1/dns/upstreams/test-quic",
    ]);
  });
});
