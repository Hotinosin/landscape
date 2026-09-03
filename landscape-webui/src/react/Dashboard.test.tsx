import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import axios from "axios";
import { setAxiosInstance } from "@landscape-router/types/mutator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANDSCAPE_TOKEN_KEY } from "@/lib/session";

const { systemMock, statusMock, dnsMock, ifacesMock, ifaceStatsMock } =
  vi.hoisted(() => ({
    systemMock: vi.fn(),
    statusMock: vi.fn(),
    dnsMock: vi.fn(),
    ifacesMock: vi.fn(),
    ifaceStatsMock: vi.fn(),
  }));
vi.mock("@/api/sys", () => ({
  get_sysinfo: systemMock,
  interval_fetch_info: statusMock,
}));
vi.mock("@/api/metric/dns", () => ({ get_dns_lightweight_summary: dnsMock }));
vi.mock("@/api/network", () => ({ ifaces: ifacesMock }));
vi.mock("@/api/metric", () => ({ get_iface_stats: ifaceStatsMock }));

import App from "./App";

let root: Root | undefined;

const system = {
  cpu_arch: "aarch64",
  host_name: "landscape-router",
  kernel_version: "6.12.0",
  landscape_version: "0.24.2",
  os_version: "OpenWrt",
  start_at: Math.floor(Date.now() / 1000) - 3660,
  system_name: "Linux",
};

const status = {
  global_cpu_info: 25,
  global_cpu_temp: 48,
  cpus: [
    {
      brand: "Test CPU",
      frequency: 1800,
      name: "CPU 0",
      usage: 25,
      vendor_id: "test",
    },
  ],
  mem: {
    total_mem: 8 * 1024 ** 3,
    used_mem: 2 * 1024 ** 3,
    total_swap: 1024 ** 3,
    used_swap: 256 * 1024 ** 2,
  },
  uptime: 3660,
  load_avg: { one: 0.1, five: 0.2, fifteen: 0.3 },
};

async function renderDashboard() {
  localStorage.setItem(LANDSCAPE_TOKEN_KEY, "test-token");
  history.replaceState(null, "", "/");
  const container = document.createElement("div");
  container.id = "root";
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<App />);
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  document.body.replaceChildren();
  systemMock.mockReset();
  statusMock.mockReset();
  dnsMock.mockReset().mockResolvedValue({ total_queries: 0 });
  ifacesMock.mockReset().mockResolvedValue([]);
  ifaceStatsMock.mockReset().mockResolvedValue([]);
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  setAxiosInstance(
    axios.create({
      adapter: async (config) => ({
        config,
        data: { language: "en" },
        headers: {},
        status: 200,
        statusText: "OK",
      }),
    }),
  );
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  vi.useRealTimers();
});

describe("React system overview", () => {
  it("renders system, CPU, memory, navigation, and translated content", async () => {
    systemMock.mockResolvedValue(system);
    statusMock.mockResolvedValue(status);
    await renderDashboard();
    expect(document.body.textContent).toContain("landscape-router");
    expect(document.body.textContent).toContain("Test CPU");
    expect(document.body.textContent).toContain("Memory Usage");
    expect(document.body.textContent).toContain("DNS");
    expect(document.body.textContent).toContain("Network topology");
    expect(document.body.textContent).not.toContain(
      "waiting for its React page migration",
    );
    expect(
      document.querySelector('a[href="/"]')?.getAttribute("aria-current"),
    ).toBe("page");
  });

  it("renders DNS metrics and network interface data from read-only APIs", async () => {
    systemMock.mockResolvedValue(system);
    statusMock.mockResolvedValue(status);
    dnsMock.mockResolvedValue({
      total_queries: 20,
      total_effective_queries: 10,
      cache_hit_count: 5,
      block_count: 2,
      avg_duration_ms: 4,
      p50_duration_ms: 3,
      p95_duration_ms: 8,
      p99_duration_ms: 12,
      max_duration_ms: 15,
    });
    ifacesMock.mockResolvedValue([
      {
        name: "wan0",
        index: 2,
        dev_type: "Ethernet",
        dev_kind: "ether",
        dev_status: { t: "up" },
        carrier: true,
        zone_type: "wan",
        enable_in_boot: true,
      },
    ]);
    ifaceStatsMock.mockResolvedValue([
      {
        ifindex: 2,
        stats: { ingress_bps: 1024, egress_bps: 2048, active_conns: 3 },
      },
    ]);
    await renderDashboard();
    expect(document.body.textContent).toContain("50%");
    expect(document.body.textContent).toContain("wan0");
    expect(document.body.textContent).toContain("1.0 KB/s");
  });

  it("keeps successful sections visible when optional read-only APIs fail", async () => {
    systemMock.mockResolvedValue(system);
    statusMock.mockResolvedValue(status);
    dnsMock.mockRejectedValue(new Error("dns offline"));
    ifacesMock.mockRejectedValue(new Error("interfaces offline"));
    ifaceStatsMock.mockRejectedValue(new Error("metrics offline"));
    await renderDashboard();
    expect(document.body.textContent).toContain("landscape-router");
    expect(document.body.textContent).toContain("Failed to load");
  });

  it("renders loading state", async () => {
    systemMock.mockReturnValue(new Promise(() => undefined));
    statusMock.mockReturnValue(new Promise(() => undefined));
    await renderDashboard();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(document.querySelectorAll(".overview-skeleton")).toHaveLength(4);
  });

  it("renders an error and retries", async () => {
    systemMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(system);
    statusMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(status);
    await renderDashboard();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Failed to load",
    );
    await act(async () => {
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent === "Retry")
        ?.click();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.body.textContent).toContain("landscape-router");
  });
});
