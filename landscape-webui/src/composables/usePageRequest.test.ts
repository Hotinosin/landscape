import { describe, expect, it, vi } from "vitest";
import { usePageRequest } from "./usePageRequest";

describe("usePageRequest", () => {
  it("moves from initial to ready", async () => {
    const request = usePageRequest(async () => [1], {
      initialData: [] as number[],
    });
    expect(request.state.value).toBe("initial");
    await request.execute();
    expect(request.data.value).toEqual([1]);
    expect(request.state.value).toBe("ready");
  });

  it("exposes empty, error, and retry states", async () => {
    const loader = vi
      .fn<() => Promise<number[]>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    const request = usePageRequest(loader, { initialData: [] as number[] });
    await request.execute();
    expect(request.state.value).toBe("error");
    await request.retry();
    expect(request.state.value).toBe("empty");
  });
});
