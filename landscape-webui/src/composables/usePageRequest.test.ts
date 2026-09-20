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
    expect(request.hasSucceeded.value).toBe(true);
    expect(request.lastSuccessAt.value).not.toBeNull();
  });

  it("keeps the last successful result and timestamp after refresh failure", async () => {
    vi.useFakeTimers();
    const loader = vi
      .fn<() => Promise<number[]>>()
      .mockResolvedValueOnce([1])
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    const request = usePageRequest(loader, { initialData: [] as number[] });
    vi.setSystemTime(1000);
    await request.execute();
    request.markStale();
    vi.setSystemTime(2000);
    await request.execute();
    expect(request.data.value).toEqual([1]);
    expect(request.error.value).toBeInstanceOf(Error);
    expect(request.lastSuccessAt.value).toBe(1000);
    expect(request.stale.value).toBe(true);
    vi.setSystemTime(3000);
    await request.execute();
    expect(request.data.value).toEqual([]);
    expect(request.error.value).toBeUndefined();
    expect(request.lastSuccessAt.value).toBe(3000);
    expect(request.stale.value).toBe(false);
    vi.useRealTimers();
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

describe("request ordering", () => {
  it.each([false, true])(
    "ignores late old results/errors (reject: %s)",
    async (rejectOld) => {
      let finishOld!: (value: number[]) => void;
      let failOld!: (error: Error) => void;
      const loader = vi
        .fn<() => Promise<number[]>>()
        .mockImplementationOnce(
          () =>
            new Promise((resolve, reject) => {
              finishOld = resolve;
              failOld = reject;
            }),
        )
        .mockResolvedValueOnce([2]);
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const request = usePageRequest(loader, {
        initialData: [] as number[],
        onSuccess,
        onError,
      });
      const old = request.execute();
      await request.execute();
      if (rejectOld) failOld(new Error("old error"));
      else finishOld([1]);
      await old;
      expect(request.data.value).toEqual([2]);
      expect(request.error.value).toBeUndefined();
      expect(request.lastSuccessAt.value).not.toBeNull();
      expect(request.loading.value).toBe(false);
      expect(onSuccess).toHaveBeenCalledExactlyOnceWith([2]);
      expect(onError).not.toHaveBeenCalled();
    },
  );

  it("does not advance the success time for a late old response", async () => {
    vi.useFakeTimers();
    let finishOld!: (value: number[]) => void;
    const loader = vi
      .fn<() => Promise<number[]>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockResolvedValueOnce([2]);
    const request = usePageRequest(loader, { initialData: [] as number[] });
    vi.setSystemTime(1000);
    const old = request.execute();
    vi.setSystemTime(2000);
    await request.execute();
    finishOld([1]);
    await old;
    expect(request.lastSuccessAt.value).toBe(2000);
    vi.useRealTimers();
  });

  it("supports SWR memory cache across instances", async () => {
    const loader = vi.fn().mockResolvedValue(["cached_result"]);
    const req1 = usePageRequest(loader, {
      initialData: [] as string[],
      cacheKey: "test-swr-key",
    });
    expect(req1.hasSucceeded.value).toBe(false);
    expect(req1.data.value).toEqual([]);
    await req1.execute();
    expect(req1.data.value).toEqual(["cached_result"]);

    // Second instance with the same cacheKey immediately has data and hasSucceeded=true
    const loader2 = vi.fn().mockResolvedValue(["fresh_result"]);
    const req2 = usePageRequest(loader2, {
      initialData: [] as string[],
      cacheKey: "test-swr-key",
    });
    expect(req2.hasSucceeded.value).toBe(true);
    expect(req2.initialLoading.value).toBe(false);
    expect(req2.data.value).toEqual(["cached_result"]);

    await req2.execute();
    expect(req2.data.value).toEqual(["fresh_result"]);
  });
});
