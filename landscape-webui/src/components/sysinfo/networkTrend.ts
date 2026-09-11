export type NetworkTrendPoint = [timestamp: number, value: number | null];

export interface NetworkTrendState {
  upload: NetworkTrendPoint[];
  download: NetworkTrendPoint[];
  wanSignature?: string;
  lastReportKey?: string;
  lastReportTime?: number;
  lastSampleAt?: number;
}

export interface NetworkTrendSample {
  timestamp: number;
  reportKey: string;
  reportTime: number;
  wanSignature: string;
  upload: number;
  download: number;
}

export const NETWORK_TREND_WINDOW_MS = 60 * 1000;
const MAX_VALID_POINTS = 600;
const MAX_TOTAL_POINTS = 1200;

export function resetNetworkTrend(state: NetworkTrendState) {
  state.upload = [];
  state.download = [];
  state.lastReportKey = undefined;
  state.lastReportTime = undefined;
  state.lastSampleAt = undefined;
}

export function addNetworkTrendSample(
  state: NetworkTrendState,
  sample: NetworkTrendSample,
  refreshIntervalMs: number,
) {
  if (state.wanSignature !== sample.wanSignature) {
    resetNetworkTrend(state);
    state.wanSignature = sample.wanSignature;
  }
  if (
    sample.reportKey === state.lastReportKey ||
    (state.lastReportTime !== undefined &&
      sample.reportTime < state.lastReportTime)
  ) {
    return false;
  }

  if (
    state.lastSampleAt !== undefined &&
    sample.timestamp - state.lastSampleAt > refreshIntervalMs * 2.5
  ) {
    const gapAt = state.lastSampleAt + refreshIntervalMs;
    state.upload.push([gapAt, null]);
    state.download.push([gapAt, null]);
  }

  state.upload.push([sample.timestamp, sample.upload]);
  state.download.push([sample.timestamp, sample.download]);
  state.lastReportKey = sample.reportKey;
  state.lastReportTime = sample.reportTime;
  state.lastSampleAt = sample.timestamp;

  const cutoff = sample.timestamp - NETWORK_TREND_WINDOW_MS;
  state.upload = trimPoints(state.upload, cutoff);
  state.download = trimPoints(state.download, cutoff);
  return true;
}

function trimPoints(points: NetworkTrendPoint[], cutoff: number) {
  const recent = points.filter(([timestamp]) => timestamp >= cutoff);
  let valid = recent.reduce(
    (count, [, value]) => count + Number(value !== null),
    0,
  );
  let start = Math.max(0, recent.length - MAX_TOTAL_POINTS);
  while (valid > MAX_VALID_POINTS && start < recent.length) {
    if (recent[start][1] !== null) valid--;
    start++;
  }
  return recent.slice(start);
}
