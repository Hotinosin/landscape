import {
  getDnsUpstreams,
  getDnsUpstream,
  addDnsUpstream,
  delDnsUpstream,
  addManyDnsUpstreams,
} from "@landscape-router/types/api/dns-upstreams/dns-upstreams";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import customInstance from "@landscape-router/types/mutator";

export type DnsUpstreamQuicTestResult = {
  protocol: "h3" | "doq";
  query_domain: string;
  attempts: Array<{
    latency_ms: number;
    answers: string[];
    connection_reused?: boolean | null;
    error_kind?: "timeout" | "network" | "tls" | "resolve" | null;
    error?: string | null;
  }>;
  connection_count: number;
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

export function test_dns_upstream_quic(
  rule: DnsUpstreamConfig,
): Promise<DnsUpstreamQuicTestResult> {
  return customInstance<{ data?: DnsUpstreamQuicTestResult }>({
    url: "/api/v1/dns/upstreams/test-quic",
    method: "POST",
    data: rule,
  });
}
