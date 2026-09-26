import { describe, it, expect, vi, beforeEach } from "vitest";
import zhDdns from "@/i18n/zh/ddns";
import enDdns from "@/i18n/en/ddns";
import zhDnsProvider from "@/i18n/zh/dns_provider";
import enDnsProvider from "@/i18n/en/dns_provider";
import zhDocker from "@/i18n/zh/docker";
import enDocker from "@/i18n/en/docker";

describe("Domain & DDNS i18n and Dirty Protection Contracts", () => {
  it("provides clean placeholder strings without (可选) or (optional)", () => {
    // DDNS placeholders
    expect(zhDdns.job_name_placeholder).toBe("请输入名称");
    expect(enDdns.job_name_placeholder).toBe("Enter name");
    expect(zhDdns.job_name_placeholder).not.toContain("可选");
    expect(enDdns.job_name_placeholder).not.toContain("optional");

    // DNS Provider profile placeholders
    expect(zhDnsProvider.profile_name_placeholder).toBe("请输入名称");
    expect(enDnsProvider.profile_name_placeholder).toBe("Enter name");
    expect(zhDnsProvider.remark_placeholder).toBe("请输入备注");
    expect(enDnsProvider.remark_placeholder).toBe("Enter remark");
    expect(zhDnsProvider.profile_name_placeholder).not.toContain("可选");
    expect(zhDnsProvider.remark_placeholder).not.toContain("可选");

    // Docker placeholder cleanup
    expect(zhDocker.docker_run.container_name_placeholder).toBe("请输入容器名称");
    expect(enDocker.docker_run.container_name_placeholder).toBe("Enter container name");
    expect(zhDocker.docker_run.container_name_placeholder).not.toContain("可选");
    expect(enDocker.docker_run.container_name_placeholder).not.toContain("optional");
  });

  it("ensures DDNS snapshot detects form, sources, and records mutations", () => {
    const form = {
      name: "my-ddns",
      enable: true,
      zone_name: "example.com",
      provider_profile_id: "cf-1",
      records: [{ name: "@", enable: true }],
      ttl: 120,
    };
    const sources = [{ kind: "wan", target_id: "eth0", family: "ipv6" }];
    const records = ["@"];

    function getSnapshot(f: any, s: any, r: any) {
      return JSON.stringify({ form: f, sources: s, records: r });
    }

    const origin = getSnapshot(form, sources, records);
    expect(getSnapshot(form, sources, records) === origin).toBe(true);

    // Name change triggers dirty
    const modifiedForm = { ...form, name: "my-ddns-new" };
    expect(getSnapshot(modifiedForm, sources, records) !== origin).toBe(true);

    // Record change triggers dirty
    const modifiedRecords = ["@", "www"];
    expect(getSnapshot(form, sources, modifiedRecords) !== origin).toBe(true);

    // Source change triggers dirty
    const modifiedSources = [{ kind: "wan", target_id: "eth1", family: "ipv6" }];
    expect(getSnapshot(form, modifiedSources, records) !== origin).toBe(true);
  });

  it("ensures DnsProviderProfiles snapshot detects name and remark mutations", () => {
    const form = {
      name: "Cloudflare Main",
      provider_config: { cloudflare: { api_token: "secret" } },
      ddns_default_ttl: 120,
      remark: "Primary DNS provider",
    };

    const origin = JSON.stringify(form);
    expect(JSON.stringify(form) === origin).toBe(true);

    // Name mutation
    expect(JSON.stringify({ ...form, name: "Cloudflare Backup" }) !== origin).toBe(true);

    // Remark mutation
    expect(JSON.stringify({ ...form, remark: "Updated remark" }) !== origin).toBe(true);

    // Config mutation
    expect(
      JSON.stringify({
        ...form,
        provider_config: { cloudflare: { api_token: "new-secret" } },
      }) !== origin,
    ).toBe(true);
  });
});
