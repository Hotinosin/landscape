import { describe, expect, it } from "vitest";

import {
  addNetworkTrendSample,
  type NetworkTrendSample,
  type NetworkTrendState,
} from "./networkTrend";

const sample = (
  timestamp: number,
  reportTime = timestamp,
  overrides: Partial<NetworkTrendSample> = {},
): NetworkTrendSample => ({
  timestamp,
  reportTime,
  reportKey: `1:${reportTime}`,
  wanSignature: "1",
  upload: 10,
  download: 20,
  ...overrides,
});

const state = (): NetworkTrendState => ({ upload: [], download: [] });

describe("realtime network trend", () => {
  it("keeps valid zero samples and ignores duplicate or stale reports", () => {
    const trend = state();

    expect(
      addNetworkTrendSample(
        trend,
        sample(1_000, 100, { upload: 0, download: 0 }),
        1_000,
      ),
    ).toBe(true);
    expect(addNetworkTrendSample(trend, sample(2_000, 100), 1_000)).toBe(false);
    expect(addNetworkTrendSample(trend, sample(3_000, 99), 1_000)).toBe(false);
    expect(trend.upload).toEqual([[1_000, 0]]);
  });

  it("breaks the line after a refresh-sized gap", () => {
    const trend = state();
    addNetworkTrendSample(trend, sample(1_000), 1_000);
    addNetworkTrendSample(trend, sample(4_000), 1_000);

    expect(trend.upload).toEqual([
      [1_000, 10],
      [2_000, null],
      [4_000, 10],
    ]);
  });

  it("resets samples when WAN membership changes", () => {
    const trend = state();
    addNetworkTrendSample(trend, sample(1_000), 1_000);
    addNetworkTrendSample(
      trend,
      sample(2_000, 2_000, {
        reportKey: "2:2000",
        wanSignature: "2",
      }),
      1_000,
    );

    expect(trend.upload).toEqual([[2_000, 10]]);
  });

  it("keeps only the one-minute window", () => {
    const trend = state();
    for (let index = 0; index < 610; index++) {
      addNetworkTrendSample(trend, sample(index * 500 + 1), 500);
    }

    expect(trend.upload).toHaveLength(121);
    expect(trend.download).toHaveLength(121);
    expect(trend.upload[0][0]).toBeGreaterThanOrEqual(
      trend.upload[trend.upload.length - 1][0] - 60 * 1000,
    );
  });
});
