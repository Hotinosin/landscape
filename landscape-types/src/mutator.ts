import type { AxiosInstance, AxiosRequestConfig } from "axios";

export type LandscapeApiOptions = {
  /** When true, suppress error toast messages for this request. */
  silent?: boolean;
  /** AbortSignal to cancel the request. */
  signal?: AbortSignal;
};

let _axiosInstance: AxiosInstance;

/**
 * Set the axios instance used by all generated API functions.
 * Must be called before any API call.
 *
 * @example
 * ```ts
 * import axios from "axios";
 * import { setAxiosInstance } from "landscape-types/mutator";
 *
 * const instance = axios.create({ timeout: 30000 });
 * setAxiosInstance(instance);
 * ```
 */
export function setAxiosInstance(instance: AxiosInstance) {
  _axiosInstance = instance;
}

/**
 * Extract the inner `data` field from an API response wrapper type.
 *
 * Orval generates response types like:
 *   `{ data?: T, error_id?: string, message?: string, args?: object }`
 *
 * This utility type extracts `T` so the caller gets the unwrapped data directly.
 */
type ExtractData<T> = T extends { data?: infer D } ? NonNullable<D> : T;

/**
 * Custom axios mutator for orval-generated API functions.
 *
 * - On success: auto-unwraps `.data` from the `LandscapeApiResp` wrapper,
 *   so callers receive the inner data directly (e.g. `DNSRuleConfig[]`).
 * - On error: the axios interceptor handles toast messages and rejects with
 *   `{ error_id, message, args }`, accessible via `.catch(err => err.error_id)`.
 */
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: LandscapeApiOptions,
): Promise<ExtractData<T>> => {
  if (!_axiosInstance) {
    throw new Error(
      "Axios instance not configured. Call setAxiosInstance() before making API calls.",
    );
  }
  // The axios response interceptor already returns response.data (the API body).
  // If the body is wrapped in LandscapeApiResp ({ data: T, ... }), extract .data.
  // If it's already the unwrapped payload (e.g. raw Array [], string, etc.), return res directly.
  return _axiosInstance({ ...config, ...options }).then((res: any) => {
    if (res && typeof res === "object" && !Array.isArray(res) && "data" in res) {
      return res.data as ExtractData<T>;
    }
    return res as ExtractData<T>;
  });
};

export default customInstance;
