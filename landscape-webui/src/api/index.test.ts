import { afterEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, type AxiosResponse } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";
import {
  clearLandscapeSession,
  LANDSCAPE_TOKEN_KEY,
  LANDSCAPE_SESSION_CLEARED,
} from "@/lib/common";
import { applyInterceptors, isCurrentSessionRequest } from "./index";
import router from "@/router";

describe("isCurrentSessionRequest", () => {
  it("ignores a late unauthorized response from before login", () => {
    expect(isCurrentSessionRequest("Bearer old-token", null)).toBe(false);
    expect(isCurrentSessionRequest(undefined, "new-token")).toBe(false);
    expect(isCurrentSessionRequest("Bearer old-token", "new-token")).toBe(
      false,
    );
    expect(isCurrentSessionRequest("Bearer new-token", "new-token")).toBe(true);
  });
});

afterEach(() => localStorage.clear());

describe("session response lifecycle", () => {
  it.each([null, "another-session", "old-token"])(
    "does not refresh an ended session (current: %s)",
    async (currentToken) => {
      localStorage.setItem(LANDSCAPE_TOKEN_KEY, "old-token");
      let finish!: () => void;
      const client = applyInterceptors(
        axios.create({
          adapter: (config) =>
            new Promise<AxiosResponse>((resolve) => {
              finish = () =>
                resolve({
                  config,
                  status: 200,
                  statusText: "OK",
                  data: {},
                  headers: { "x-refresh-token": "late-token" },
                });
            }),
        }),
      );
      const pending = client.get("/status");
      await flushPromises();
      clearLandscapeSession();
      if (currentToken) localStorage.setItem(LANDSCAPE_TOKEN_KEY, currentToken);
      finish();
      await pending;
      expect(localStorage.getItem(LANDSCAPE_TOKEN_KEY)).toBe(currentToken);
    },
  );

  it("still refreshes the active session", async () => {
    localStorage.setItem(LANDSCAPE_TOKEN_KEY, "current-token");
    const client = applyInterceptors(
      axios.create({
        adapter: async (config) => ({
          config,
          status: 200,
          statusText: "OK",
          data: {},
          headers: { "x-refresh-token": "refreshed-token" },
        }),
      }),
    );
    await client.get("/status");
    expect(localStorage.getItem(LANDSCAPE_TOKEN_KEY)).toBe("refreshed-token");
  });

  it("uses the same cleanup event for unauthorized sessions", async () => {
    setActivePinia(createPinia());
    localStorage.setItem(LANDSCAPE_TOKEN_KEY, "current-token");
    const cleanup = vi.fn();
    window.addEventListener(LANDSCAPE_SESSION_CLEARED, cleanup);
    try {
      const client = applyInterceptors(
        axios.create({
          adapter: async (config) => {
            throw new AxiosError(
              "Unauthorized",
              "ERR_BAD_REQUEST",
              config,
              null,
              {
                config,
                status: 401,
                statusText: "Unauthorized",
                headers: {},
                data: {},
              },
            );
          },
        }),
      );
      await expect(client.get("/status")).rejects.toEqual({});
      expect(cleanup).toHaveBeenCalledOnce();
      expect(localStorage.getItem(LANDSCAPE_TOKEN_KEY)).toBeNull();
    } finally {
      window.removeEventListener(LANDSCAPE_SESSION_CLEARED, cleanup);
    }
  });

  it("redirects an expired deep link to login", async () => {
    setActivePinia(createPinia());
    localStorage.setItem(LANDSCAPE_TOKEN_KEY, "expired-token");
    window.history.replaceState({}, "", "/domains/certs");
    await router.push("/domains/certs");
    const client = applyInterceptors(
      axios.create({
        adapter: async (config) => {
          throw new AxiosError(
            "Unauthorized",
            "ERR_BAD_REQUEST",
            config,
            null,
            {
              config,
              status: 401,
              statusText: "Unauthorized",
              headers: {},
              data: {},
            },
          );
        },
      }),
    );

    await expect(client.get("/certs")).rejects.toEqual({});
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/login");
    expect(history.state.redirect).toBe("/domains/certs");
  });
});
