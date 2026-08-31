import { describe, expect, it } from "vitest";
import { queryNumber, queryString, summarizeConnections } from ".";
import type { ConnectRealtimeStatus } from "@landscape-router/types/api/schemas";

describe("metric helpers", () => {
  it("summarizes connection rates", () => {
    const item = {
      ingress_bps: 10,
      egress_bps: 20,
      ingress_pps: 1,
      egress_pps: 2,
    } as ConnectRealtimeStatus;
    expect(summarizeConnections([item, item])).toEqual({
      ingressBps: 20,
      egressBps: 40,
      ingressPps: 2,
      egressPps: 4,
      count: 2,
    });
  });

  it("parses route query values", () => {
    expect(queryString(["192.0.2.1"])).toBe("192.0.2.1");
    expect(queryNumber("10")).toBe(10);
    expect(queryNumber("invalid")).toBeNull();
  });
});
