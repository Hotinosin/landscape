import type { AxiosInstance } from "axios";
import {
  clearLandscapeSession,
  LANDSCAPE_TOKEN_KEY,
  syncPluginSessionCookie,
} from "@/lib/session";

export type ApiError = {
  status?: number;
  error_id?: string;
  message: string;
  args?: Record<string, unknown>;
};

export const API_ERROR_EVENT = "landscape:api-error";
export const UNAUTHORIZED_EVENT = "landscape:unauthorized";

export function isCurrentSessionUnauthorized(
  requestAuthorization: unknown,
  currentToken: string | null,
): boolean {
  return (
    Boolean(currentToken) && requestAuthorization === `Bearer ${currentToken}`
  );
}

function normalizeApiError(error: any): ApiError {
  const data = error.response?.data;
  return {
    status: error.response?.status,
    error_id: data?.error_id,
    message: data?.message || error.message || "Request failed",
    args: data?.args,
  };
}

export function applyInterceptors(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(LANDSCAPE_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const newToken = response.headers["x-refresh-token"];
      if (newToken) {
        localStorage.setItem(LANDSCAPE_TOKEN_KEY, newToken);
        syncPluginSessionCookie();
      }
      return response.data;
    },
    (error) => {
      const apiError = normalizeApiError(error);
      const requestAuthorization = error.config?.headers?.Authorization;
      const currentSessionUnauthorized =
        apiError.status === 401 &&
        isCurrentSessionUnauthorized(
          requestAuthorization,
          localStorage.getItem(LANDSCAPE_TOKEN_KEY),
        );

      if (currentSessionUnauthorized) {
        clearLandscapeSession();
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
      if (
        !error.config?.silent &&
        (apiError.status !== 401 ||
          !requestAuthorization ||
          currentSessionUnauthorized)
      ) {
        window.dispatchEvent(
          new CustomEvent<ApiError>(API_ERROR_EVENT, { detail: apiError }),
        );
      }
      return Promise.reject(apiError);
    },
  );

  return instance;
}
