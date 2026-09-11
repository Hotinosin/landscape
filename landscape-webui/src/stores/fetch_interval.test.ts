import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const update = vi.fn().mockResolvedValue(undefined);
  return {
    update,
    connect: vi.fn(),
    store: () => ({ UPDATE_INFO: update }),
  };
});
vi.mock("./systeminfo", () => ({ useSysInfo: mocks.store }));
vi.mock("./iface_node", () => ({ useIfaceNodeStore: mocks.store }));
vi.mock("./status_ipconfig", () => ({ useIpConfigStore: mocks.store }));
vi.mock("./status_nats", () => ({ useNATConfigStore: mocks.store }));
vi.mock("./status_docker", () => ({ useDockerStore: mocks.store }));
vi.mock("./status_dns", () => ({ useDnsStore: mocks.store }));
vi.mock("./status_ipv6pd", () => ({ useIPv6PDStore: mocks.store }));
vi.mock("./status_lan_ipv6", () => ({ useLanIPv6Store: mocks.store }));
vi.mock("./status_firewall", () => ({ useFirewallConfigStore: mocks.store }));
vi.mock("./status_wifi", () => ({ useWifiConfigStore: mocks.store }));
vi.mock("./status_dhcp_v4", () => ({ useDHCPv4ConfigStore: mocks.store }));
vi.mock("./status_metric", () => ({ useMetricStore: mocks.store }));
vi.mock("./status_mss_clamp", () => ({ useMSSClampConfigStore: mocks.store }));
vi.mock("./status_route_lan", () => ({ useRouteLanConfigStore: mocks.store }));
vi.mock("./status_route_wan", () => ({ useRouteWanConfigStore: mocks.store }));
vi.mock("@/stores/docker_img_task", () => ({
  default: () => ({ CONNECT: mocks.connect }),
}));
import { runRefreshTasks } from "./fetch_interval";
import { useFetchIntervalStore } from "./fetch_interval";

describe("runRefreshTasks", () => {
  it("starts requests together and isolates failures", async () => {
    let finishFirst!: () => void;
    const first = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishFirst = resolve;
        }),
    );
    const second = vi.fn().mockRejectedValue(new Error("metrics offline"));

    const refresh = runRefreshTasks([first, second]);
    await Promise.resolve();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();

    finishFirst();
    await expect(refresh).resolves.toBe("metrics offline");
  });

  it("reports success when every request completes", async () => {
    await expect(
      runRefreshTasks([vi.fn().mockResolvedValue(undefined)]),
    ).resolves.toBeUndefined();
  });

  it("formats structured failures without object coercion", async () => {
    await expect(
      runRefreshTasks([vi.fn().mockRejectedValue({ message: "offline" })]),
    ).resolves.toBe('{"message":"offline"}');
  });
});

describe("refresh lifecycle", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.clearAllMocks();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });

  it("pauses in the background, resumes current polling, and cleans up", async () => {
    const refresh = useFetchIntervalStore();
    refresh.IMMEDIATELY_EXECUTE();
    await Promise.resolve();
    await Promise.resolve();
    const initial = mocks.update.mock.calls.length;
    expect(initial).toBeGreaterThan(0);

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(6000);
    expect(mocks.update).toHaveBeenCalledTimes(initial);

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    expect(mocks.update.mock.calls.length).toBeGreaterThan(initial);

    refresh.enable_interval = false;
    const paused = mocks.update.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6000);
    expect(mocks.update).toHaveBeenCalledTimes(paused);

    refresh.destroy();
    const destroyed = mocks.update.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6000);
    expect(mocks.update).toHaveBeenCalledTimes(destroyed);
    vi.useRealTimers();
  });

  it("does not start automatic requests while hidden", async () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    useFetchIntervalStore().IMMEDIATELY_EXECUTE();
    await vi.advanceTimersByTimeAsync(6000);
    expect(mocks.update).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
