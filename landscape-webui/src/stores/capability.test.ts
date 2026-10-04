import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
const api = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/api/sys", () => ({ get_capabilities: api.load }));
import { useCapabilityStore } from "./capability";

describe("one WebUI across backend capabilities", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.load.mockReset();
  });

  it("keeps extension controls closed for an upstream backend", async () => {
    api.load.mockResolvedValue(["gateway", "metric_persistent", "mem_track"]);
    const store = useCapabilityStore();
    expect(store.HAS("plugins")).toBe(false);
    await store.LOAD();
    expect(store.HAS("gateway")).toBe(true);
    expect(store.HAS("plugins")).toBe(false);
    await expect(store.REQUIRE("dns_quic_diagnostics")).rejects.toThrow();
  });

  it("enables advertised custom capabilities without rebuilding", async () => {
    api.load.mockResolvedValue(["plugins", "dns_quic_diagnostics"]);
    const store = useCapabilityStore();
    await store.REQUIRE("plugins");
    expect(store.HAS("dns_quic_diagnostics")).toBe(true);
    expect(store.HAS("gateway")).toBe(false);
  });

  it("fails closed and retries a failed or missing endpoint", async () => {
    api.load
      .mockRejectedValueOnce(new Error("404"))
      .mockResolvedValueOnce(["gateway"]);
    const store = useCapabilityStore();
    await store.LOAD();
    expect(store.HAS("gateway")).toBe(false);
    expect(store.failed).toBe(true);
    await store.LOAD();
    expect(store.HAS("gateway")).toBe(true);
  });

  it("deduplicates loading and ignores a response from a logged-out session", async () => {
    let resolve!: (value: string[]) => void;
    api.load.mockImplementation(
      () =>
        new Promise<string[]>((r) => {
          resolve = r;
        }),
    );
    const store = useCapabilityStore();
    const first = store.LOAD();
    void store.LOAD();
    expect(api.load).toHaveBeenCalledTimes(1);
    store.RESET();
    resolve(["plugins"]);
    await first;
    expect(store.loaded).toBe(false);
    expect(store.HAS("plugins")).toBe(false);
  });
});
