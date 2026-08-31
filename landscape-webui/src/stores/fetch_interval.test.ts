import { describe, expect, it, vi } from "vitest";
import { runRefreshTasks } from "./fetch_interval";

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
});
