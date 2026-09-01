import {
  getDnsUpstreams,
  getDnsUpstream,
  addDnsUpstream,
  delDnsUpstream,
  addManyDnsUpstreams,
} from "@landscape-router/types/api/dns-upstreams/dns-upstreams";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import customInstance from "@landscape-router/types/mutator";

export type DnsUpstreamH3TestResult = {
  query_domain: string;
  attempts: Array<{
    latency_ms: number;
    answers: string[];
    error?: string | null;
  }>;
  reuse_average_ms?: number | null;
};

export async function get_dns_upstreams(): Promise<DnsUpstreamConfig[]> {
  return getDnsUpstreams();
}

export async function get_dns_upstream(id: string): Promise<DnsUpstreamConfig> {
  return getDnsUpstream(id);
}

export async function push_dns_upstream(
  rule: DnsUpstreamConfig,
): Promise<DnsUpstreamConfig> {
  return addDnsUpstream(rule);
}

export async function delete_dns_upstream(id: string): Promise<void> {
  await delDnsUpstream(id);
}

export async function push_many_dns_upstream(
  rule: DnsUpstreamConfig[],
): Promise<void> {
  await addManyDnsUpstreams(rule);
}

export function test_dns_upstream_h3(
  rule: DnsUpstreamConfig,
): Promise<DnsUpstreamH3TestResult> {
  return customInstance<{ data?: DnsUpstreamH3TestResult }>({
    url: "/api/v1/dns/upstreams/test-h3",
    method: "POST",
    data: rule,
  });
}
