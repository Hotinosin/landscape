import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import axios from "axios";
import { setAxiosInstance } from "@landscape-router/types/mutator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_ERROR_EVENT, applyInterceptors, type ApiError } from "@/api";
import { LANDSCAPE_TOKEN_KEY } from "@/lib/session";
import App from "./App";

let root: Root | undefined;

async function renderAt(path: string) {
  history.replaceState(null, "", path);
  const container = document.createElement("div");
  container.id = "root";
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<App />));
}

beforeEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  setAxiosInstance(
    axios.create({
      adapter: async (config) => ({
        config,
        data: { data: {} },
        headers: {},
        status: 200,
        statusText: "OK",
      }),
    }),
  );
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
});

describe("React infrastructure", () => {
  it("preserves the target when a protected route redirects to login", async () => {
    await renderAt("/dns/upstream?source=test#details");
    expect(location.pathname).toBe("/login");
    expect(history.state).toMatchObject({
      usr: { redirect: "/dns/upstream?source=test#details" },
    });
    expect(document.querySelector('input[name="username"]')).toBeTruthy();
  });

  it("renders the React 404 for an authenticated unknown route", async () => {
    localStorage.setItem(LANDSCAPE_TOKEN_KEY, "test-token");
    await renderAt("/unknown-route");
    expect(document.body.textContent).toContain("404");
  });

  it("renders a HeroUI toast for a structured API error", async () => {
    await renderAt("/login");
    await act(async () => {
      dispatchEvent(
        new CustomEvent<ApiError>(API_ERROR_EVENT, {
          detail: { status: 500, message: "Read request failed" },
        }),
      );
    });
    expect(document.body.textContent).toContain("Read request failed");
  });

  it("executes a read-only request through the shared interceptors", async () => {
    localStorage.setItem(LANDSCAPE_TOKEN_KEY, "test-token");
    const cookieSetter = vi.spyOn(document, "cookie", "set");
    const client = applyInterceptors(axios.create());
    const result = await client.get("/api/read-only", {
      adapter: async (config) => {
        expect(config.method).toBe("get");
        expect(config.headers.Authorization).toBe("Bearer test-token");
        return {
          config,
          data: { data: { language: "en" } },
          headers: { "x-refresh-token": "refreshed-token" },
          status: 200,
          statusText: "OK",
        };
      },
    });
    expect(result).toEqual({ data: { language: "en" } });
    expect(localStorage.getItem(LANDSCAPE_TOKEN_KEY)).toBe("refreshed-token");
    expect(cookieSetter).toHaveBeenCalledWith(
      expect.stringContaining("LANDSCAPE_PLUGIN_TOKEN=refreshed-token"),
    );
  });
});
