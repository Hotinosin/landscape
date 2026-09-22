import { describe, expect, it } from "vitest";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import {
  DEFAULT_DOH_ENDPOINT,
  DnsUpstreamModeTsEnum,
  fill_default_dns_http_endpoint,
} from "./dns";

describe("fill_default_dns_http_endpoint", () => {
  it("fills an empty DoH endpoint without replacing a custom endpoint", () => {
    const config: DnsUpstreamConfig = {
      name: null,
      remark: "",
      mode: {
        t: DnsUpstreamModeTsEnum.Https,
        domain: "dns.example.com",
        http_endpoint: null,
        http3: false,
      },
      ips: [],
      port: 443,
      enable_ip_validation: false,
    };

    fill_default_dns_http_endpoint(config);
    if (config.mode.t !== DnsUpstreamModeTsEnum.Https) throw new Error();
    expect(config.mode.http_endpoint).toBe(DEFAULT_DOH_ENDPOINT);

    config.mode.http_endpoint = "/custom";
    fill_default_dns_http_endpoint(config);
    expect(config.mode.http_endpoint).toBe("/custom");
  });
});
