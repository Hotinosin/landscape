import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import axios from "axios";
import { setAxiosInstance } from "@landscape-router/types/mutator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANDSCAPE_TOKEN_KEY } from "@/lib/session";
import App from "./App";

let root: Root | undefined;

function response(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => data } as Response;
}

function githubFetch(contributors: unknown[]) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    return response(url.includes("/orgs/") ? [] : contributors);
  });
}

async function renderAbout(language = "en") {
  localStorage.setItem(LANDSCAPE_TOKEN_KEY, "test-token");
  history.replaceState(null, "", "/about");
  const container = document.createElement("div");
  container.id = "root";
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<App />);
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  if (language === "zh") {
    const select = document.querySelector<HTMLSelectElement>(
      'select[aria-label="Language"]',
    )!;
    await act(async () => {
      select.value = "zh";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
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
        data: { language: "en" },
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
  vi.unstubAllGlobals();
});

describe("React About", () => {
  it("renders the version, translated content, safe external links, and route state", async () => {
    vi.stubGlobal(
      "fetch",
      githubFetch([
        {
          id: 1,
          login: "contributor",
          avatar_url: "https://example.test/avatar.png",
          html_url: "https://github.com/contributor",
          contributions: 4,
        },
      ]),
    );
    await renderAbout();
    expect(document.body.textContent).toContain("About Landscape");
    expect(document.body.textContent).toContain("Version 0.24.2");
    expect(document.body.textContent).toContain("contributor");
    expect(document.body.textContent).not.toContain(
      "waiting for its React page migration",
    );
    expect(
      document.querySelector('a[href="/about"]')?.getAttribute("aria-current"),
    ).toBe("page");
    const externalLinks = [
      ...document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]'),
    ];
    expect(externalLinks.length).toBeGreaterThan(4);
    expect(
      externalLinks.every((link) => link.rel === "noopener noreferrer"),
    ).toBe(true);
  });

  it("shows a loading state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    await renderAbout();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(document.querySelectorAll(".contributor-card")).toHaveLength(6);
  });

  it("shows empty and Chinese states", async () => {
    vi.stubGlobal("fetch", githubFetch([]));
    await renderAbout("zh");
    expect(document.body.textContent).toContain("关于 Landscape");
    expect(document.body.textContent).toContain("暂无数据");
  });

  it("shows an accessible error and retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response([], false))
      .mockImplementation(async (input: string | URL | Request) =>
        response(String(input).includes("/orgs/") ? [] : []),
      );
    vi.stubGlobal("fetch", fetchMock);
    await renderAbout();
    expect(document.querySelector(".about-error")?.textContent).toContain(
      "Unable to load contributors",
    );
    await act(async () => {
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent === "Reload")
        ?.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });
});
