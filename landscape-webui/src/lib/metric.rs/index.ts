import type { ConnectRealtimeStatus } from "@landscape-router/types/api/schemas";

export function summarizeConnections(items: ConnectRealtimeStatus[]) {
  return items.reduce(
    (summary, item) => {
      summary.ingressBps += item.ingress_bps;
      summary.egressBps += item.egress_bps;
      summary.ingressPps += item.ingress_pps;
      summary.egressPps += item.egress_pps;
      summary.count++;
      return summary;
    },
    { ingressBps: 0, egressBps: 0, ingressPps: 0, egressPps: 0, count: 0 },
  );
}

export function queryString(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

export function queryNumber(value: unknown) {
  const raw = queryString(value);
  if (raw === undefined) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export class ConnectFilter {
  src_ip: string | null;
  dst_ip: string | null;
  port_start: number | null;
  port_end: number | null;
  l3_proto: number | null;
  l4_proto: number | null;
  flow_id: number | null;
  gress: number | null;
  ifindex: number | null;

  constructor(obj: Partial<ConnectFilter> = {}) {
    this.src_ip = obj.src_ip ?? null;
    this.dst_ip = obj.dst_ip ?? null;
    this.port_start = obj.port_start ?? null;
    this.port_end = obj.port_end ?? null;
    this.l3_proto = obj.l3_proto ?? null;
    this.l4_proto = obj.l4_proto ?? null;
    this.flow_id = obj.flow_id ?? null;
    this.gress = obj.gress ?? null;
    this.ifindex = obj.ifindex ?? null;
  }
}
